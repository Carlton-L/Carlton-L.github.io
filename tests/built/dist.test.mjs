// Checks on the built site in dist/. Run after `astro build`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
assert.ok(existsSync(DIST), 'dist/ not found. Run `npm run build` first.');
const read = (p) => readFileSync(join(DIST, p), 'utf8');
const walk = (dir) => readdirSync(join(DIST, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const pages = walk('').filter((f) => f.endsWith('.html'));
const tag = (code) => createHash('sha1').update(code).digest('hex').slice(0, 8);

test('the build has pages', () => {
  assert.ok(pages.length >= 10, `only ${pages.length} pages`);
  assert.ok(pages.includes('index.html'));
});

for (const name of ['patch', 'previs']) {
  test(`/js/${name}.js parses`, () => {
    assert.doesNotThrow(() => new vm.Script(read(`js/${name}.js`)));
  });

  test(`every page that loads /js/${name}.js asks for the version that was built`, () => {
    const want = tag(read(`js/${name}.js`));
    let users = 0;
    for (const p of pages) {
      const tags = [...read(p).matchAll(new RegExp(`/js/${name}\\.js\\?v=([0-9a-f]+)`, 'g'))].map((m) => m[1]);
      if (tags.length) users++;
      for (const t of tags) assert.equal(t, want, p);
    }
    assert.ok(users > 0, 'no page loads it');
  });
}

test('/js/patch.js carries no dev-only code', () => {
  const js = read('js/patch.js');
  assert.equal(/\[patch\] (hop cap|cycle)|undeclared port/.test(js), false);
  assert.equal(js.includes('//<dev'), false);
});

test('/js/patch.js holds the runtime and the network, minified', () => {
  const js = read('js/patch.js');
  assert.ok(js.includes('window.Patch'));
  assert.ok(js.includes('pf:ready'));
  assert.ok(js.split('\n').length < 20, 'not minified');
});

test('a page with a network preloads the script and loads it once', () => {
  for (const p of pages) {
    const html = read(p);
    const loads = (html.match(/<script[^>]*src="\/js\/patch\.js\?v=/g) || []).length;
    const preloads = (html.match(/<link rel="preload" href="\/js\/patch\.js\?v=[0-9a-f]+" as="script"/g) || []).length;
    assert.ok(loads <= 1, `${p} loads it ${loads} times`);
    if (loads) assert.match(html, /<script[^>]*data-astro-rerun[^>]*src="\/js\/patch\.js|<script[^>]*src="\/js\/patch\.js[^>]*data-astro-rerun/, p);
    if (preloads) assert.equal(loads, 1, `${p} preloads a script it does not run`);
  }
});

test('no page carries the network script inline', () => {
  for (const p of pages) {
    const html = read(p);
    assert.equal(html.includes('window.Patch='), false, p);
    assert.equal(html.includes("'pf:ready'") && html.includes('new Event("pf:ready")'), false, p);
  }
});

test('every page on the site layout has the page-change clock in its head, and the same one', () => {
  const seen = new Set();
  // the standalone demo frame and the static prototypes have no layout and no page changes
  const laid = pages.filter((p) => read(p).includes('astro-view-transitions-enabled'));
  assert.ok(laid.length >= 10, `only ${laid.length} pages use the layout`);
  for (const p of laid) {
    const html = read(p);
    const head = html.slice(0, html.indexOf('</head>'));
    const m = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).filter((s) => s.includes('pf:done'));
    assert.equal(m.length, 1, p);
    assert.doesNotThrow(() => new vm.Script(m[0]), p);
    assert.equal(/\bexport\b/.test(m[0]), false, p);
    seen.add(m[0]);
  }
  assert.equal(seen.size, 1);
});

test('the home page stays light', () => {
  const kb = Buffer.byteLength(read('index.html')) / 1024;
  assert.ok(kb < 120, `index.html is ${kb.toFixed(0)}KB`);
  assert.equal(/<astro-island/.test(read('index.html')), false, 'the home page has no framework islands');
});

test('the nav links are marked to be fetched early', () => {
  const html = read('index.html');
  const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'));
  assert.ok((nav.match(/<a [^>]*data-warm/g) || []).length >= 4);
});

/** Every link, form target and data-href on the built pages that points inside the site. */
function internalLinks() {
  const out = [];
  for (const p of pages) {
    for (const m of read(p).matchAll(/\s(?:href|data-href|action)="(\/[^"]*)"/g)) {
      if (m[1].startsWith('//')) continue;
      out.push({ page: p, href: m[1], path: m[1].split(/[?#]/)[0] });
    }
  }
  return out;
}

test('every internal link to a page ends in a slash', () => {
  // GitHub Pages answers /about with a redirect to /about/. A link without the slash costs a round trip.
  const links = internalLinks();
  assert.ok(links.length > 100, `only ${links.length} internal links found`);
  const bad = links.filter((l) => !l.path.endsWith('/') && !/\.[a-z0-9]+$/i.test(l.path));
  assert.deepEqual([...new Set(bad.map((l) => `${l.href}  (in ${l.page})`))], []);
});

test('every internal link leads to something that was built', () => {
  const missing = internalLinks().filter((l) => !existsSync(join(DIST, decodeURIComponent(l.path), l.path.endsWith('/') ? 'index.html' : '')));
  assert.deepEqual([...new Set(missing.map((l) => `${l.href}  (in ${l.page})`))], []);
});

test('canonical URLs and the sitemap use the slash too', () => {
  for (const p of pages) {
    const m = read(p).match(/<link rel="canonical" href="([^"]+)"/);
    if (m && !/\.html$/.test(m[1])) assert.ok(m[1].endsWith('/'), `${p}: ${m[1]}`);
  }
  const map = walk('').filter((f) => /^sitemap.*\.xml$/.test(f)).map(read).join('');
  const locs = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !u.endsWith('.xml'));
  assert.ok(locs.length >= 10);
  for (const u of locs) assert.ok(u.endsWith('/'), u);
});
