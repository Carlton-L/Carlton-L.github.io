// Page-transition tests. Run with `npm test` (builds first), or `node tests/transitions.mjs`
// against an existing dist/.
//
// They drive a real browser over the built site and check the things that broke while the
// transitions were being made: a transition that never finishes, operators left hidden, cables
// that never draw, a blank background, a page that ends up a different height.
//
//   BROWSERS=chromium,firefox,webkit npm test     (default: chromium)
//   One-time setup: npm install, then npx playwright install
//
// The motion itself is not tested. Look at that by eye, Firefox first.

import { chromium, firefox, webkit } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('No dist/ found. Run `npm run build` first.');
  process.exit(1);
}

// How long to wait for a page change to settle: the front (580ms), then the cables (up to ~860ms).
const SETTLE = 2600;

const PAGES = [
  '/', '/projects', '/about', '/lab', '/contact',
  '/projects/futurescaper', '/projects/fast', '/projects/domainclaim', '/projects/campus-ai',
  '/projects/futurity-engine', '/projects/carlton-dev', '/projects/grid-lamp',
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};
const server = http.createServer((req, res) => {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}).listen(0);
const ORIGIN = `http://localhost:${server.address().port}`;

const ENGINES = { chromium, firefox, webkit };
const results = [];

// What the page looks like once it has settled.
const readState = (page) => page.evaluate(() => {
  const html = document.documentElement;
  let active = false;
  try { active = html.matches(':active-view-transition'); } catch (e) {}
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  const canvas = document.querySelector('canvas.bgdither');
  let lit = -1;
  if (canvas) {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    lit = 0;
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) lit++;
  }
  return {
    path: location.pathname.replace(/\/$/, '') || '/',
    pausedAnimations: document.getAnimations().filter((a) => /^pf-/.test(a.animationName || '')).length,
    active,
    hiddenOps: [...document.querySelectorAll('.op')].filter((o) => {
      const cs = getComputedStyle(o);
      return onScreen(o) && (cs.opacity !== '1' || cs.visibility === 'hidden');
    }).length,
    cables: document.querySelectorAll('svg.wires path[stroke-opacity=".28"]').length,
    links: JSON.parse(document.querySelector('.patchfield').dataset.links || '[]').length,
    cook: (document.querySelector('header .cook')?.textContent || '').trim(),
    chip: document.querySelector('header .pathchip')?.textContent || '',
    height: html.scrollHeight,
    hscroll: html.scrollWidth > innerWidth + 1,
    lit,
    stats: window.Patch ? window.Patch.stats() : null,
  };
});

async function run(name) {
  const browser = await ENGINES[name].launch();
  const check = (test, pass, info = '') => results.push({ browser: name, test, pass, info });

  const open = async ({ boot = false, ...options } = {}) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
    const page = await context.newPage();
    // The boot runs once per session and takes over a second. Mark it as done, except in its own test.
    if (!boot) await page.addInitScript(() => { try { sessionStorage.setItem('pf-boot', '1'); } catch (e) {} });
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|ERR_|NS_ERROR|NS_BINDING/.test(m.text())) page.errors.push(m.text());
    });
    // Fonts and third-party scripts are not under test, and the run should work offline.
    await page.route(/typekit|googleapis|gstatic|cdnjs|unpkg|jsdelivr|vercel\.app/, (r) => r.abort());
    return page;
  };
  const clickLink = async (page, href) => {
    const link = await page.$(`header a.navlink[href="${href}"]`);
    const box = await link.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  const settled = (s) => s.pausedAnimations === 0 && !s.active && s.hiddenOps === 0;
  const brief = (s, page) => `paused=${s.pausedAnimations} hiddenOps=${s.hiddenOps} cables=${s.cables}/${s.links} ${page.errors[0] || ''}`;

  // 1. Every page loads clean, with every cable drawn.
  const freshHeight = {};
  {
    const page = await open();
    for (const url of PAGES) {
      page.errors.length = 0;
      await page.goto(ORIGIN + url);
      await page.waitForTimeout(900);
      const s = await readState(page);
      freshHeight[url] = s.height;
      check(`loads ${url}`, !page.errors.length && settled(s) && s.cables === s.links, brief(s, page));
    }
    await page.context().close();
  }

  // 2. Click through the nav. Each change must finish, keep the canvas, and leave the page as a
  //    fresh load would.
  {
    const page = await open();
    await page.goto(ORIGIN + '/');
    await page.waitForTimeout(1200);
    await page.evaluate(() => { document.querySelector('canvas.bgdither').__kept = true; });
    for (const url of ['/projects', '/about', '/lab', '/contact', '/projects', '/about']) {
      await clickLink(page, url);
      await page.waitForTimeout(120);
      const ring = await page.evaluate(() => document.documentElement.getAttribute('data-pf'));
      await page.waitForTimeout(SETTLE);
      const s = await readState(page);
      const kept = await page.evaluate(() => !!document.querySelector('canvas.bgdither').__kept);
      check(`click to ${url}: finishes`, s.path === url && !page.errors.length && settled(s), brief(s, page));
      check(`click to ${url}: front starts at the click`, ring === 'ring', `data-pf=${ring}`);
      check(`click to ${url}: cables all in`, s.cables === s.links, `${s.cables}/${s.links}`);
      check(`click to ${url}: canvas kept, background not blank`, kept && s.lit > 50, `kept=${kept} lit=${s.lit}`);
      check(`click to ${url}: nav reports it`, s.cook === 'COOKED' && s.chip === '/network' + url, `cook=${s.cook} chip=${s.chip}`);
      check(`click to ${url}: same height as a fresh load`, Math.abs(s.height - freshHeight[url]) <= 2, `${s.height} vs ${freshHeight[url]}`);
    }

    // The runtime tears everything down on each swap, so these counts should not climb.
    const before = (await readState(page)).stats;
    await clickLink(page, '/lab'); await page.waitForTimeout(SETTLE);
    await clickLink(page, '/about'); await page.waitForTimeout(SETTLE);
    const after = (await readState(page)).stats;
    check('no leaked listeners or timers', JSON.stringify(before) === JSON.stringify(after), `${JSON.stringify(before)} then ${JSON.stringify(after)}`);

    // 3. No click position means no ring: keyboard, then browser back.
    await page.focus('header a.navlink[href="/lab"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    let pf = await page.evaluate(() => document.documentElement.getAttribute('data-pf'));
    await page.waitForTimeout(SETTLE);
    let s = await readState(page);
    check('keyboard: top-to-bottom band, no ring', pf === null && s.path === '/lab' && settled(s), `data-pf=${pf} ${brief(s, page)}`);

    await page.goBack();
    await page.waitForTimeout(150);
    pf = await page.evaluate(() => document.documentElement.getAttribute('data-pf'));
    await page.waitForTimeout(SETTLE);
    s = await readState(page);
    check('back: band, no ring', pf === null && s.path === '/about' && settled(s) && !page.errors.length, `data-pf=${pf} ${brief(s, page)}`);

    // 4. A second click while a change is running. The browser may ignore it; either way the
    //    page must end up settled on one of the two.
    await clickLink(page, '/projects');
    await page.waitForTimeout(300);
    await clickLink(page, '/contact');
    await page.waitForTimeout(SETTLE + 600);
    s = await readState(page);
    check('second click mid-change: ends settled', ['/projects', '/contact'].includes(s.path) && settled(s) && s.cables === s.links && s.cook === 'COOKED' && !page.errors.length, `path=${s.path} ${brief(s, page)}`);

    // 5. Resize: the background keeps what was on screen, and the glide gives operators their own
    //    transitions back.
    await page.setViewportSize({ width: 1300, height: 820 });
    await page.waitForTimeout(60);
    s = await readState(page);
    check('resize: background not blank', s.lit > 50, `lit=${s.lit}`);
    await page.waitForTimeout(700);
    const stuck = await page.evaluate(() => [...document.querySelectorAll('.op')].filter((o) => o.style.transition).length);
    check('resize: glide cleans up', stuck === 0, `operators with an inline transition: ${stuck}`);
    await page.context().close();
  }

  // 6. Reduced motion: the page just swaps. No operator animates.
  {
    const page = await open({ reducedMotion: 'reduce' });
    await page.goto(ORIGIN + '/');
    await page.waitForTimeout(900);
    await clickLink(page, '/about');
    await page.waitForTimeout(1500);
    const s = await readState(page);
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.classList?.contains('op')).length);
    check('reduced motion: plain swap', s.path === '/about' && settled(s) && moving === 0 && !page.errors.length, `opAnimations=${moving} ${brief(s, page)}`);
    await page.context().close();
  }

  // 7. READ mode, tablet and phone widths.
  for (const width of [768, 375]) {
    const page = await open({ viewport: { width, height: 800 } });
    await page.goto(ORIGIN + '/');
    await page.waitForTimeout(900);
    await clickLink(page, '/about');
    await page.waitForTimeout(SETTLE);
    const s = await readState(page);
    check(`READ at ${width}: finishes, no sideways scroll`, s.path === '/about' && settled(s) && !s.hscroll && !page.errors.length, `hscroll=${s.hscroll} ${brief(s, page)}`);
    await page.context().close();
  }

  // 8. A visitor's saved background settings at their extremes.
  {
    const page = await open();
    await page.goto(ORIGIN + '/');
    await page.evaluate(() => localStorage.setItem('patch-bg', JSON.stringify({ density: 0.05, speed: 3, scale: 2, feedback: 0.95, pal: 2, noiseT: 2, ditherT: 3, wander: 1 })));
    await page.reload();
    await page.waitForTimeout(900);
    await clickLink(page, '/lab');
    await page.waitForTimeout(SETTLE);
    const s = await readState(page);
    check('extreme saved background settings', settled(s) && s.cables === s.links && !page.errors.length, brief(s, page));
    await page.context().close();
  }

  // 9. The boot: first page of a session. Operators are never hidden, the nav counts, the cables
  //    wire in, and it does not run a second time.
  {
    const page = await open({ boot: true });
    await page.goto(ORIGIN + '/');
    let hidden = 0, counted = false, wiring = false;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(100);
      const s = await readState(page);
      hidden = Math.max(hidden, s.hiddenOps);
      if (/^COOK \d+%$/.test(s.cook)) counted = true;
      if (s.cables < s.links) wiring = true;
    }
    await page.waitForTimeout(SETTLE);
    let s = await readState(page);
    check('boot: operators never hidden', hidden === 0, `hiddenOps=${hidden}`);
    check('boot: nav counts, then COOKED', counted && s.cook === 'COOKED', `counted=${counted} cook=${s.cook}`);
    check('boot: cables wire in and finish', wiring && s.cables === s.links && !page.errors.length, `wiring=${wiring} ${s.cables}/${s.links} ${page.errors[0] || ''}`);
    await page.reload();
    await page.waitForTimeout(500);
    s = await readState(page);
    check('boot: once per session', s.cook === 'COOKED' && s.cables === s.links, `cook=${s.cook} ${s.cables}/${s.links}`);
    await page.context().close();
  }

  // 10. Hover: the verb chip names the action, and clears over the nav and in READ mode.
  {
    const page = await open();
    await page.goto(ORIGIN + '/');
    await page.waitForTimeout(SETTLE);
    const hover = async (sel) => {
      const r = await page.locator(sel).first().boundingBox();
      await page.mouse.move(r.x + 37, r.y + 5);
      await page.mouse.move(r.x + 40, r.y + 8);
    };
    const verb = () => page.evaluate(() => document.querySelector('.pfverb.on')?.textContent || '');
    await hover('#opIndex .ohead');
    await page.waitForTimeout(500);
    let v = await verb();
    check('hover: verb chip says DRAG on a header', v === 'DRAG', v);
    await page.mouse.move(700, 5);
    await page.waitForTimeout(200);
    v = await verb();
    check('hover: chip clears over the nav', !v && !page.errors.length, v + (page.errors[0] || ''));
    await page.keyboard.press('p');
    await page.waitForTimeout(600);
    await hover('.ohead');
    await page.waitForTimeout(300);
    v = await verb();
    check('hover: no chip in READ mode', !v, v);
    await page.context().close();
  }

  // 11. Hover: each kind of control gets its verb, a port gets none, and the chip stays on screen.
  {
    const page = await open();
    await page.goto(ORIGIN + '/');
    await page.waitForTimeout(SETTLE);
    const verbAt = async (sel) => {
      const r = await page.locator(sel).first().boundingBox();
      await page.mouse.move(r.x + r.width / 2 - 2, r.y + r.height / 2 - 2);
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.waitForTimeout(350);
      return page.evaluate(() => document.querySelector('.pfverb.on')?.textContent || '');
    };
    const want = { '.idxrow': 'OPEN', '#opNoise [data-cycle]': 'CYCLE', '#opFeedbk input[type=range]': 'SCRUB', '#invertBtn': 'TOGGLE', '#opHero .port': '', '#opHero h1': '' };
    const got = {};
    for (const sel of Object.keys(want)) got[sel] = await verbAt(sel);
    const wrong = Object.keys(want).filter((k) => got[k] !== want[k]).map((k) => `${k}: got "${got[k]}", want "${want[k]}"`);
    check('hover: each control gets its verb', !wrong.length, wrong.join('; '));
    await verbAt('#opRead a'); // an operator near the right edge
    const box = await page.evaluate(() => { const r = document.querySelector('.pfverb').getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
    check('hover: chip stays on screen', box.l >= 0 && box.r <= box.w && box.b <= box.h && !page.errors.length, JSON.stringify(box) + (page.errors[0] || ''));
    await page.context().close();
  }

  // 12. Home layout: no two operators overlap, and the background chain runs left to right.
  for (const [w, h] of [[1280, 720], [1280, 800], [1440, 900], [1680, 950], [1920, 1080]]) {
    const page = await open({ viewport: { width: w, height: h } });
    await page.goto(ORIGIN + '/');
    await page.waitForTimeout(SETTLE);
    const res = await page.evaluate(() => {
      const box = (e) => e.getBoundingClientRect();
      const ops = [...document.querySelectorAll('.op')].map((e) => [e.id, box(e)]);
      const overlaps = [];
      for (let i = 0; i < ops.length; i++) for (let j = i + 1; j < ops.length; j++) {
        const a = ops[i][1], c = ops[j][1];
        if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) overlaps.push(ops[i][0] + ' x ' + ops[j][0]);
      }
      const chain = ['opNoise', 'opFeedbk', 'opDither', 'opOut'].map((id) => box(document.getElementById(id)));
      const forward = chain.every((b, i) => !i || chain[i - 1].left < b.left);
      return { overlaps, forward };
    });
    check(`home layout at ${w}x${h}`, !res.overlaps.length && res.forward, JSON.stringify(res));
    await page.context().close();
  }

  // 13. No native tooltips on the site's own controls (demos and iframes aside).
  {
    const page = await open();
    const found = [];
    for (const path of ['/', '/projects', '/projects/carlton-dev', '/about', '/lab', '/contact']) {
      await page.goto(ORIGIN + path);
      await page.waitForTimeout(600);
      const n = await page.evaluate(() => [...document.querySelectorAll('[title]')].filter((e) => e.tagName !== 'IFRAME' && !e.closest('astro-island')).map((e) => e.getAttribute('title')));
      if (n.length) found.push(path + ': ' + n.join(' | '));
    }
    check('no title tooltips on site controls', !found.length, found.join('; '));
    await page.context().close();
  }

  await browser.close();
}

const wanted = (process.env.BROWSERS || 'chromium').split(',').map((b) => b.trim()).filter(Boolean);
for (const name of wanted) {
  if (!ENGINES[name]) { console.error(`Unknown browser "${name}". Use chromium, firefox or webkit.`); process.exit(1); }
  try {
    await run(name);
  } catch (e) {
    results.push({ browser: name, test: 'run', pass: false, info: e.message.split('\n')[0] });
  }
}
server.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'ok  ' : 'FAIL'} [${r.browser}] ${r.test}${r.pass ? '' : '  (' + r.info + ')'}`);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
