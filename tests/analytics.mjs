// Analytics on the real host. Not part of `npm test`: it needs PostHog's library from its CDN, and
// openssl for a throwaway certificate.
//
//   npm run build && node tests/analytics.mjs
//
// The built site is served as https://carlton.dev/ in Chromium (tests/lib/carlton-host.mjs), so the
// loader starts PostHog as it does on the live site. Every request to PostHog's EU hosts is
// answered locally and its events are decoded and kept, so nothing reaches the project. The
// checks read those events. The plan's criteria are named in brackets.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carltonHost, chromeContext } from './lib/carlton-host.mjs';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('No dist/ found. Run `npm run build` first.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
};
const site = (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(DIST, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { location: url + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'max-age=600' });
  res.end(fs.readFileSync(file));
};

const host = await carltonHost(site);
const browser = await chromium.launch({ args: host.args });
const results = [];
const check = (test, pass, info = '') => results.push({ test, pass, info });

const LIB = 'GET eu-assets.i.posthog.com/static/array.js';
const SETTLE = 2600;

/** A fresh visitor: own cookies and storage, the boot skipped, errors kept. */
async function visitor(options = {}) {
  const context = await chromeContext(browser, { viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('pf-boot', '1'); } catch (e) {}
    document.addEventListener('pf:done', () => { if (window.__firstDone == null) window.__firstDone = performance.now(); });
  });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  // fonts and other third parties are not under test
  await page.route(/typekit|googleapis|gstatic|cdnjs|unpkg|jsdelivr|vercel\.app/, (r) => r.abort());
  return page;
}

/** Waits until the PostHog library has loaded in the page, or gives up after 15s. */
const ready = (page) => page.waitForFunction(() => !!(window.posthog && window.posthog.__loaded), null, { timeout: 15000 }).then(() => true, () => false);

/** Waits until `fn()` holds for what has been captured (events are sent in batches). */
async function until(fn, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return fn();
}

const since = (n) => host.captured.slice(n);
const pageviews = (list) => list.filter((e) => e.event === '$pageview');
const nav = async (page, href) => {
  await page.click(`header a.navlink[href="${href}"]`);
  await page.waitForTimeout(SETTLE);
};

/** What PostHog has stored in the browser: cookies, localStorage and sessionStorage keys. */
const stored = async (page) => {
  const cookies = (await page.context().cookies()).map((c) => c.name).filter((n) => /ph_|posthog/i.test(n));
  const keys = await page.evaluate(() => {
    const out = [];
    for (const [name, s] of [['local', localStorage], ['session', sessionStorage]]) {
      for (let i = 0; i < s.length; i++) if (/ph_|posthog/i.test(s.key(i))) out.push(`${name}:${s.key(i)}`);
    }
    return out;
  });
  return [...cookies.map((c) => 'cookie:' + c), ...keys];
};

// 1. A visitor who hasn't answered: the library loads once, after the page has settled, and the
//    visit is counted without anything stored. Each page change is one pageview. [L2 L3 L5 L7]
{
  const page = await visitor();
  const mark = host.captured.length, asked = host.asked.length;
  await page.goto(host.origin + '/');
  const loaded = await ready(page);
  const timing = await page.evaluate(() => {
    const lib = performance.getEntriesByType('resource').find((r) => r.name.includes('/static/array.js'));
    return { done: window.__firstDone, lib: lib ? lib.startTime : null };
  });
  check('loads on carlton.dev [L2]', loaded, page.errors[0] || '');
  check('harness: PostHog does not take the run for a bot', loaded && !(await page.evaluate(() => window.posthog._is_bot())));
  check('the library is asked for after the page change has finished [L2]', timing.lib != null && timing.done != null && timing.lib > timing.done,
    `pf:done at ${Math.round(timing.done)}ms, array.js at ${Math.round(timing.lib)}ms`);

  await until(() => pageviews(since(mark)).length >= 1);
  const first = pageviews(since(mark))[0];
  const keys = await stored(page);
  // The gate (L5). PostHog's guide says on_reject captures nothing until an answer; the RFC needs a
  // cookieless pageview before one.
  check('GATE: before an answer, a pageview is sent [L5]', !!first,
    first ? `distinct_id=${first.properties?.distinct_id} $cookieless_mode=${first.properties?.$cookieless_mode}` : `nothing captured: ${since(mark).map((e) => e.event).join(', ') || 'no events'}`);
  check('GATE: before an answer, PostHog stores nothing [L5]', keys.length === 0, keys.join(', '));
  check('events carry mode PATCH at 1440 [L3]', first?.properties?.mode === 'PATCH', String(first?.properties?.mode));

  for (const href of ['/about/', '/projects/', '/lab/']) await nav(page, href);
  await until(() => pageviews(since(mark)).length >= 4);
  const views = pageviews(since(mark)).map((e) => new URL(e.properties.$current_url).pathname);
  check('one pageview per page change [L7]', JSON.stringify(views) === JSON.stringify(['/', '/about/', '/projects/', '/lab/']), views.join(' '));
  const libs = host.asked.slice(asked).filter((a) => a === LIB).length;
  check('the library loads once over three page changes [L2]', libs === 1, `${libs} loads`);
  const keysAfter = await stored(page);
  check('still nothing stored after three page changes [L5]', keysAfter.length === 0, keysAfter.join(', '));

  // READ, from the toggle: the next events say so
  await page.keyboard.press('p');
  await page.waitForTimeout(300);
  await nav(page, '/contact/');
  await until(() => pageviews(since(mark)).length >= 5);
  const read = pageviews(since(mark))[4];
  check('after switching to READ, events carry mode READ [L3]', read?.properties?.mode === 'READ', String(read?.properties?.mode));
  check('no page errors', !page.errors.length, page.errors[0] || '');
  await page.context().close();
}

// 2. Link tags reach the first pageview: for a visitor who hasn't answered, and for one who said no
//    on an earlier visit. [L9]
{
  const page = await visitor();
  let mark = host.captured.length;
  await page.goto(host.origin + '/?utm_source=cv&utm_campaign=261020-1620');
  await ready(page);
  await until(() => pageviews(since(mark)).length >= 1);
  let p = pageviews(since(mark))[0]?.properties || {};
  check('link tags on the first pageview, no answer [L9]', p.utm_source === 'cv' && p.utm_campaign === '261020-1620', `${p.utm_source} ${p.utm_campaign}`);

  await page.click('[data-rec-a="no"]');
  await page.waitForTimeout(500);
  mark = host.captured.length;
  await page.goto(host.origin + '/projects/?utm_source=cv&utm_campaign=261020-1620');
  await ready(page);
  const answer = await page.evaluate(() => window.posthog.get_explicit_consent_status());
  await until(() => pageviews(since(mark)).length >= 1);
  p = pageviews(since(mark))[0]?.properties || {};
  check('link tags on the first pageview, said no [L9]', answer === 'denied' && p.utm_source === 'cv' && p.utm_campaign === '261020-1620' && p.distinct_id === '$posthog_cookieless',
    `answer=${answer} ${p.utm_source} ${p.utm_campaign} ${p.distinct_id}`);
  await page.context().close();
}

// 3. ?notrack=1 on the real host: PostHog never loads, also after a reload without it. ?notrack=0
//    lets it back. [L4]
{
  const page = await visitor();
  const asked = host.asked.length;
  await page.goto(host.origin + '/?notrack=1');
  await page.waitForTimeout(SETTLE + 2000);
  await page.goto(host.origin + '/about/');
  await page.waitForTimeout(SETTLE + 2000);
  const state = await page.evaluate(() => ({ ph: 'posthog' in window, guard: !!window.__posthog_initialized }));
  const touched = host.asked.slice(asked);
  check('notrack: PostHog is never loaded or asked [L4]', !state.ph && !state.guard && !touched.length, `${JSON.stringify(state)} ${touched.slice(0, 3).join(', ')}`);
  await page.goto(host.origin + '/?notrack=0');
  check('notrack=0: PostHog loads again [L4]', await ready(page));
  await page.context().close();
}

// 4. Yes: PostHog opts in and a recording starts, also when the answer comes before the library
//    has loaded. No: no recording, pageviews keep coming without cookies, and the question doesn't
//    come back. Both are sent as consent_answered. [L6]
const snapshots = (list) => list.filter((e) => e.event === '$snapshot' || e.endpoint.startsWith('/s'));
const answered = (list, a) => list.some((e) => e.event === 'consent_answered' && e.properties?.answer === a);
{
  const page = await visitor();
  const mark = host.captured.length;
  await page.goto(host.origin + '/');
  // Before the library loads. The operator only shows 500 ms after the page, by when the library has
  // usually loaded here; on a slow connection it hasn't, so the click is sent straight away.
  await page.evaluate(() => document.querySelector('[data-rec-a="yes"]').click());
  const early = await page.evaluate(() => !!(window.posthog && window.posthog.__loaded));
  await ready(page);
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => ({ consent: window.posthog.get_explicit_consent_status(), recording: window.posthog.sessionRecordingStarted(), id: window.posthog.get_distinct_id() }));
  await nav(page, '/about/');
  const got = await until(() => snapshots(since(mark)).length > 0 && answered(since(mark), 'yes'));
  const views = pageviews(since(mark));
  check('yes, answered before the library loaded: opted in, recording [L6]', !early && st.consent === 'granted' && st.recording && got,
    `early=${early} ${JSON.stringify(st)} snapshots=${snapshots(since(mark)).length} answered=${answered(since(mark), 'yes')}`);
  check('yes: later events are no longer cookieless [L6]', views.length >= 2 && views.at(-1).properties.distinct_id !== '$posthog_cookieless', views.map((e) => e.properties.distinct_id).join(' '));
  check('yes: no page errors', !page.errors.length, page.errors[0] || '');
  await page.context().close();
}
{
  const page = await visitor();
  let mark = host.captured.length;
  await page.goto(host.origin + '/');
  await ready(page);
  await page.click('[data-rec-a="no"]');
  await nav(page, '/about/');
  await nav(page, '/lab/');
  await until(() => pageviews(since(mark)).length >= 3 && answered(since(mark), 'no'));
  await page.waitForTimeout(3000); // a recording would have flushed by now
  const st = await page.evaluate(() => ({ consent: window.posthog.get_explicit_consent_status(), recording: window.posthog.sessionRecordingStarted() }));
  const views = pageviews(since(mark));
  check('no: opted out, no recording [L6]', st.consent === 'denied' && !st.recording && !snapshots(since(mark)).length && answered(since(mark), 'no'),
    `${JSON.stringify(st)} snapshots=${snapshots(since(mark)).length}`);
  check('no: pageviews keep coming, without cookies [L6]', views.length >= 3 && views.slice(1).every((e) => e.properties.distinct_id === '$posthog_cookieless'), views.map((e) => e.properties.distinct_id).join(' '));
  mark = host.captured.length;
  await page.reload();
  await ready(page);
  await page.waitForTimeout(1000);
  const back = await page.evaluate(() => ({ rec: document.documentElement.dataset.rec, up: getComputedStyle(document.getElementById('recOp')).display !== 'none' }));
  await until(() => pageviews(since(mark)).length >= 1);
  check('no: the question does not come back on reload, and the visit is still counted [L6]', back.rec === 'no' && !back.up && pageviews(since(mark)).length >= 1, JSON.stringify(back));
  check('no: no page errors', !page.errors.length, page.errors[0] || '');
  await page.context().close();
}

// 5. Navigation and reading events, on one scripted visit: each fires once under its condition,
//    with its properties. Links to other sites (GitHub, LinkedIn, a product site, email) are
//    link_out; carlton.dev pages and the CV never are. Clicks are kept from navigating away.
//    [E1 E3]
{
  const page = await visitor();
  await page.context().route(/github\.com|linkedin\.com/, (r) => r.abort());
  const mark = host.captured.length;
  const custom = () => since(mark).filter((e) => !e.event.startsWith('$'));
  // the event's own properties: without PostHog's ($…), the token, the id and the registered mode
  const own = (props) => Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith('$') && !['token', 'distinct_id', 'mode'].includes(k)));
  const named = (name) => custom().filter((e) => e.event === name).map((e) => own(e.properties));
  const stay = () => page.evaluate(() => window.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="mailto:"], a[href^="http"], a[href^="/cv/"]')) e.preventDefault();
  }));

  // Home: a row the mouse moves over, twice, is one preview; the auto-cycle adds none
  await page.goto(host.origin + '/');
  await ready(page);
  await stay();
  const rows = await page.$$('#workIndex [data-slug]');
  const slugs = await Promise.all(rows.map((r) => r.getAttribute('data-slug')));
  await rows[2].hover();
  await page.mouse.move(5, 5);
  await rows[2].hover();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(8000); // longer than one auto-cycle tick (7.2s)
  await until(() => named('preview_hovered').length >= 1);
  const previews = named('preview_hovered');
  check('preview_hovered: once per row per page, never from the auto-cycle', previews.length === 1 && previews[0].slug === slugs[2], JSON.stringify(previews));

  // PATCH to READ and back, with the key
  await page.keyboard.press('p');
  await page.keyboard.press('p');
  await until(() => named('mode_changed').length >= 2);
  check('mode_changed: one per switch, with where it went', JSON.stringify(named('mode_changed')) === '[{"to":"READ"},{"to":"PATCH"}]', JSON.stringify(named('mode_changed')));

  // Links in the footer: GitHub, LinkedIn, email, and the CV
  for (const href of ['https://github.com/Carlton-L', 'https://linkedin.com/in/carltonl', 'mailto:carlton@carlton.dev', '/cv/Carlton_Lindsay_Design_Engineer_CV.pdf']) {
    await page.click(`footer a[href="${href}"]`);
    await page.waitForTimeout(150);
  }
  for (const p of page.context().pages()) if (p !== page) await p.close();
  // a carlton.dev page: no link_out
  await nav(page, '/projects/');
  await stay();
  await page.goto(host.origin + '/projects/domainclaim/');
  await ready(page);
  await stay();
  await page.click('a[href="https://domainclaim-pi.vercel.app"]');
  await page.waitForTimeout(150);
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await until(() => named('link_out').length >= 4 && named('cv_downloaded').length >= 1);
  const outs = named('link_out');
  check('link_out: GitHub, LinkedIn, email and a product site, with href, label and page [E3]',
    JSON.stringify(outs.map((o) => [o.href, o.label, o.page])) === JSON.stringify([
      ['https://github.com/Carlton-L', 'GitHub', '/'],
      ['https://linkedin.com/in/carltonl', 'LinkedIn', '/'],
      ['mailto:carlton@carlton.dev', 'Email', '/'],
      ['https://domainclaim-pi.vercel.app/', outs[3]?.label, '/projects/domainclaim/'],
    ]) && !!outs[3]?.label, JSON.stringify(outs));
  check('cv_downloaded: the CV link, with the page; never link_out [E3]', JSON.stringify(named('cv_downloaded')) === '[{"page":"/"}]', JSON.stringify(named('cv_downloaded')));

  // The end of a case study: the card in view, then its link
  const before = named('case_finished').length;
  await page.waitForTimeout(1500);
  const early = named('case_finished').length - before;
  const card = await page.$('[data-next-case]');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  const to = await page.$eval('[data-next-case] a', (a) => a.getAttribute('href').split('/')[2]);
  await page.click('[data-next-case] a');
  await page.waitForTimeout(SETTLE);
  await until(() => named('case_finished').length >= 1 && named('next_case_clicked').length >= 1);
  check('case_finished: once, when the next-case card is in view', early === 0 && JSON.stringify(named('case_finished')) === '[{"slug":"domainclaim"}]', `before scrolling: ${early}, ${JSON.stringify(named('case_finished'))}`);
  check('next_case_clicked: from and to', JSON.stringify(named('next_case_clicked')) === JSON.stringify([{ from: 'domainclaim', to }]), JSON.stringify(named('next_case_clicked')));
  const all = custom().map((e) => e.event).filter((n) => n !== 'consent_answered');
  check('nothing else was sent', all.every((n) => ['preview_hovered', 'mode_changed', 'link_out', 'cv_downloaded', 'case_finished', 'next_case_clicked'].includes(n)), all.join(' '));
  check('events: no page errors', !page.errors.length, page.errors[0] || '');
  await page.context().close();
}

// 6. Demo, patch and contact events, on one scripted visit. A demo counts its first touch on a
//    page, DomainClaim's iframe included, and never the messages the product sends by itself.
//    message_sent carries nothing, and nothing typed in the form reaches PostHog. [E1 E2]
{
  const page = await visitor();
  const TYPED = { name: 'Harness Visitor', email: 'harness-visitor@example.org', message: 'A message only the harness writes.' };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
  let posted = 0;
  await page.context().route('https://api.carlton.dev/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    posted++;
    return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'harness-0001', ack: null }) });
  });
  const mark = host.captured.length;
  const custom = () => since(mark).filter((e) => !e.event.startsWith('$'));
  const own = (props) => Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith('$') && !['token', 'distinct_id', 'mode'].includes(k)));
  const named = (name) => custom().filter((e) => e.event === name).map((e) => own(e.properties));

  // carlton.dev's background chain, in PATCH: two of each, one event per kind
  await page.goto(host.origin + '/projects/carlton-dev/');
  await ready(page);
  await page.waitForTimeout(SETTLE);
  for (const v of ['40', '60']) await page.fill('#cdBgNoise [data-param="speed"]', v);
  for (let i = 0; i < 2; i++) await page.click('#cdBgNoise [data-cycle="noise"]');
  await page.click('[data-pick="palette"][data-v="2"]');
  await page.click('#cdBgOut [data-cycle="palette"]');
  await page.click('[data-pick="palette"][data-v="0"]');
  const head = await page.$('#cdGrammar .ohead');
  await head.scrollIntoViewIfNeeded();
  for (let i = 0; i < 2; i++) {
    const b = await head.boundingBox();
    await page.mouse.move(b.x + 40, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 80, b.y + b.height / 2 + 20, { steps: 4 });
    await page.mouse.up();
  }
  // a press on a header that doesn't move is no drag; checked on the next page, where nothing else drags
  await until(() => named('patch_used').length >= 4);
  const kinds = named('patch_used').map((p) => p.kind).sort();
  check('patch_used: once per kind per page, slider, chip, palette and drag', JSON.stringify(kinds) === '["chip","drag","palette","slider"]', JSON.stringify(named('patch_used')));

  // Futurescaper's live demo: two touches are one demo_touched, every RESET is a demo_reset
  await page.goto(host.origin + '/projects/futurescaper/');
  await ready(page);
  await page.click('#fsTitle .ohead'); // a press that doesn't move
  const reset = '#fsView [data-demo-reset]';
  await page.$eval('#fsView', (el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForSelector(reset, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.click('#fsView .demoframe-title');
  await page.click('#fsView .demoframe-title');
  await page.click(reset);
  await page.click(reset);
  await until(() => named('demo_reset').length >= 2);
  check('demo_touched: the first touch in a demo, with its name', JSON.stringify(named('demo_touched')) === '[{"demo":"fsView"}]', JSON.stringify(named('demo_touched')));
  check('demo_reset: every RESET, with the demo', JSON.stringify(named('demo_reset')) === '[{"demo":"fsView"},{"demo":"fsView"}]', JSON.stringify(named('demo_reset')));
  check('patch_used: a press on a header without a move is no drag', named('patch_used').length === 4, JSON.stringify(named('patch_used')));

  // DomainClaim's product runs in an iframe: its own messages don't count, a touch inside it does
  await page.goto(host.origin + '/projects/domainclaim/');
  await ready(page);
  await page.$eval('#dcFx', (el) => el.scrollIntoView({ block: 'center' }));
  const frame = page.frameLocator('#dcFx iframe');
  await frame.locator('h1').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const quiet = named('demo_touched').filter((d) => d.demo === 'dcFx').length;
  await frame.locator('h1').first().click();
  await until(() => named('demo_touched').some((d) => d.demo === 'dcFx'));
  check('demo_touched: a touch inside DomainClaim\'s iframe, never the product\'s own messages', quiet === 0 && named('demo_touched').filter((d) => d.demo === 'dcFx').length === 1, `before the touch: ${quiet}, ${JSON.stringify(named('demo_touched'))}`);

  // The contact form: message_sent with nothing in it, and nothing typed sent anywhere
  await page.goto(host.origin + '/contact/');
  await ready(page);
  await page.waitForTimeout(SETTLE);
  for (const [k, v] of Object.entries(TYPED)) await page.fill(`#ctForm [name="${k}"]`, v);
  await page.click('#ctForm .ct-send');
  await page.waitForSelector('#ctDone:not([hidden])', { timeout: 10000 });
  await until(() => named('message_sent').length >= 1);
  await page.waitForTimeout(1500);
  const raw = JSON.stringify(since(mark));
  check('message_sent: once, with no properties [E2]', posted === 1 && JSON.stringify(named('message_sent')) === '[{}]', `posted ${posted}, ${JSON.stringify(named('message_sent'))}`);
  check('nothing typed in the form reached PostHog [E2]', Object.values(TYPED).every((v) => !raw.includes(v) && !raw.includes(v.split('@')[0])));

  const all = custom().map((e) => e.event);
  check('nothing else was sent', all.every((n) => ['patch_used', 'demo_touched', 'demo_reset', 'message_sent'].includes(n)), all.join(' '));
  check('demos and contact: no page errors', !page.errors.length, page.errors[0] || '');
  await page.context().close();
}

await browser.close();
await host.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.test}${r.info ? '  (' + r.info + ')' : ''}`);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
