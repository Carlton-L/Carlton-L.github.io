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

await browser.close();
await host.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.test}${r.info ? '  (' + r.info + ')' : ''}`);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
