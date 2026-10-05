/**
 * How long a page change takes to start, per kind of link. Not part of `npm test`.
 *
 *   npm run build && node tests/measure.mjs
 *   BROWSER=firefox node tests/measure.mjs      chromium (default), firefox or webkit
 *   DELAY=150 node tests/measure.mjs            ms added to every request (default 80)
 *   CPU=4 node tests/measure.mjs                slow the CPU (chromium only)
 *
 * It serves dist/ the way GitHub Pages does: a URL with no trailing slash answers 301, and every
 * response is cached for max-age seconds. Each line is the median of a few runs, in ms after the
 * click: `fetch` is the new page in hand, `go` is the page change starting, `done` is it finished
 * (`done` runs long in a headless browser, which draws the background in software). After the bar
 * is what the server was asked for after the click. An empty list means everything was already
 * in the browser's cache.
 */
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';
import * as pw from 'playwright';
import { fileURLToPath } from 'node:url';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const NAME = process.env.BROWSER || 'chromium';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon' };
const cfg = { delay: Number(process.env.DELAY || 80), maxAge: 600, log: [] };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  setTimeout(() => {
    const cc = 'max-age=' + cfg.maxAge;
    let f = join(DIST, p);
    if (existsSync(f) && statSync(f).isDirectory()) {
      if (!p.endsWith('/')) { cfg.log.push('301 ' + p); res.writeHead(301, { location: p + '/', 'cache-control': cc }); return res.end(); }
      f = join(f, 'index.html');
    }
    if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    let body = readFileSync(f);
    const etag = '"' + createHash('sha1').update(body).digest('hex').slice(0, 12) + '"';
    if (req.headers['if-none-match'] === etag) { cfg.log.push('304 ' + p); res.writeHead(304, { etag, 'cache-control': cc }); return res.end(); }
    cfg.log.push('200 ' + p);
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', etag, 'cache-control': cc });
    res.end(body);
  }, cfg.delay);
});
await new Promise((r) => server.listen(0, r));
const base = 'http://localhost:' + server.address().port;
const browser = await pw[NAME].launch();
const init = () => {
  const L = (window.__t = { marks: {} });
  document.addEventListener('click', () => { L.click = performance.now(); L.marks = {}; }, true);
  for (const ev of ['astro:before-preparation', 'astro:after-preparation', 'astro:after-swap', 'pf:go', 'pf:done', 'astro:page-load'])
    document.addEventListener(ev, () => { if (L.click != null && !(ev in L.marks)) L.marks[ev] = Math.round(performance.now() - L.click); });
};
async function run({ target, hover = 120, wait = 1500, cpu = 1 }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (cpu > 1 && NAME === 'chromium') { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  await page.addInitScript(init);
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(wait);
  cfg.log = [];
  const sel = `a[href="${target}"]`;
  const box = await page.locator(sel + ":visible").first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForTimeout(hover);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForFunction(() => window.__t.marks['pf:done'] != null, null, { timeout: 8000 });
  const m = await page.evaluate(() => window.__t.marks);
  await ctx.close();
  return { fetch: m['astro:after-preparation'], go: m['pf:go'], done: m['pf:done'], net: cfg.log.filter((l) => !/fonts|\.svg|\.png|\.webp/.test(l)).map((l) => l.replace(/_astro\/(\w+)[^ ]*(\.\w+)$/, "$1$2")).join(', ') };
}
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
async function many(label, o, n = 5) {
  const rs = []; for (let i = 0; i < n; i++) rs.push(await run(o));
  console.log(label.padEnd(58), 'fetch', String(med(rs.map((r) => r.fetch))).padStart(4), ' go', String(med(rs.map((r) => r.go))).padStart(4), ' done', String(med(rs.map((r) => r.done))).padStart(5), ' |', rs[0].net);
}
const cpu = Number(process.env.CPU || 1);
console.log(`${NAME}, ${cfg.delay}ms added to every request\n`);
for (const t of ['/about/', '/projects/', '/lab/', '/contact/']) { cfg.maxAge = 600; await many('nav ' + t + ' (1.5s after load)', { target: t, cpu }); }
for (const t of ['/projects/futurescaper/', '/projects/fast/', '/projects/grid-lamp/']) { cfg.maxAge = 600; await many('row ' + t + ' (hover 120ms)', { target: t, cpu }); }
for (const t of ['/projects/futurescaper/', '/projects/fast/']) await many('row ' + t + ' (hover 600ms)', { target: t, hover: 600, cpu }, 3);
await many('nav /about/, clicked 100ms after load', { target: '/about/', wait: 100, hover: 30, cpu }, 3);
await browser.close(); server.close();
