// Checks on the source: numbers and lists that have to agree across files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MS } from '../../src/lib/page-clock.js';
import { projects, homeOrder, caseOrder } from '../../src/data/content.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

test('the page-change length is the same in all three places', () => {
  const front = read('src/lib/patch-field.js').match(/const FRONT_MS = (\d+);/);
  assert.ok(front, 'FRONT_MS not found in patch-field.js');
  assert.equal(Number(front[1]), MS, 'FRONT_MS in patch-field.js');
  const css = [...read('src/styles/global.css').matchAll(/animation:\s*pf-(wipe|dim|ring)\s+(\d+)ms/g)];
  assert.ok(css.some((m) => m[1] === 'wipe') && css.some((m) => m[1] === 'dim'), 'pf-wipe and pf-dim not found in global.css');
  for (const m of css) assert.equal(Number(m[2]), MS, `pf-${m[1]} in global.css`);
});

test('the page images stay paused, so only the clock moves them', () => {
  assert.match(read('src/styles/global.css'), /::view-transition-old\(root\),\s*::view-transition-new\(root\)\s*\{\s*animation-play-state:\s*paused;/);
});

test('no demo hydrates during a page change', () => {
  const bad = [];
  for (const f of walk('src').filter((f) => f.endsWith('.astro'))) {
    read(f).split('\n').forEach((line, i) => {
      if (/<[A-Z][\w.]*[^>]*\sclient:(load|visible|idle|media)\b/.test(line)) bad.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, [], 'use client:settled');
});

test('client:only is used on the standalone demo page and nowhere else', () => {
  const used = walk('src').filter((f) => f.endsWith('.astro'))
    .filter((f) => /<[A-Z][\w.]*[^>]*\sclient:only\b/.test(read(f)));
  assert.deepEqual(used, ['src/pages/demos/domainclaim.astro']);
});

test('the shared scripts are loaded as files and run again on every page', () => {
  assert.match(read('src/components/PatchField.astro'), /<script is:inline data-astro-rerun src=\{patchSrc\}><\/script>/);
  assert.match(read('src/components/PrevisEngine.astro'), /<script is:inline data-astro-rerun src=\{previsSrc\}>/);
  assert.match(read('src/layouts/Base.astro'), /<script is:inline set:html=\{clockJs\}><\/script>/);
});

test('patch-field.js reports ready as its last step', () => {
  const src = read('src/lib/patch-field.js').trimEnd();
  assert.match(src, /document\.dispatchEvent\(new Event\('pf:ready'\)\);\s*\}\)\(\);$/);
});

test('patch-runtime.js keeps comment markers out of strings, so its dev blocks can be cut', () => {
  const src = read('src/lib/patch-runtime.js');
  const open = (src.match(/\/\/<dev/g) || []).length, close = (src.match(/\/\/>dev/g) || []).length;
  assert.ok(open > 0);
  assert.equal(open, close);
  assert.match(src, /var DEV = false; \/\/ @dev/, 'bundles.js switches this line in dev');
  const cut = src.replace(/\/\/<dev[\s\S]*?\/\/>dev/g, '');
  assert.equal(/console\.warn/.test(cut), false);
});

test('every slug in the home order is a project with a page', () => {
  const slugs = new Set(projects.map((p) => p.slug));
  for (const slug of caseOrder) assert.ok(slugs.has(slug), `${slug} is not in projects`);
  for (const slug of homeOrder) {
    assert.ok(existsSync(join(ROOT, 'src/pages/projects', slug + '.astro')), `${slug} has no page of its own`);
  }
  assert.equal(new Set(homeOrder).size, homeOrder.length, 'a slug appears twice');
  assert.equal(new Set(caseOrder).size, caseOrder.length);
});

test('the home order is the agreed one', () => {
  assert.deepEqual(homeOrder, ['futurescaper', 'domainclaim', 'grid-lamp', 'carlton-dev', 'fast', 'futurity-engine', 'campus-ai']);
});

/** Every PatchField page: the areas its operators ask for and the tiers its layout draws. */
function layouts() {
  const out = [];
  for (const f of walk('src/pages').filter((f) => f.endsWith('.astro'))) {
    const src = read(f);
    const tiers = [...src.matchAll(/min:\s*(\d+),\s*cols:\s*(\d+),\s*areas:\s*`([^`]*)`/g)].map((m) => ({
      min: Number(m[1]), cols: Number(m[2]),
      rows: m[3].trim().split('\n').map((r) => r.trim().split(/\s+/)),
    }));
    if (!tiers.length) continue;
    const areas = [...src.matchAll(/<Operator\b[^>]*?\sarea="([\w-]+)"/g)].map((m) => m[1]);
    out.push({ f, tiers, areas });
  }
  return out;
}

test('the home layout places every operator in every tier, and nothing else', () => {
  const home = layouts().find((p) => p.f === 'src/pages/index.astro');
  assert.ok(home, 'the home layout was not found');
  assert.ok(home.areas.length >= 10, 'operators not found');
  for (const t of home.tiers) {
    const named = new Set(t.rows.flat().filter((c) => c !== '.'));
    for (const a of home.areas) assert.ok(named.has(a), `tier ${t.min}: "${a}" is not placed`);
    for (const n of named) assert.ok(home.areas.includes(n), `tier ${t.min}: "${n}" has no operator`);
  }
});

test('on every page, all tiers of a layout place the same areas', () => {
  for (const { f, tiers } of layouts()) {
    const names = (t) => [...new Set(t.rows.flat().filter((c) => c !== '.'))].sort();
    for (const t of tiers.slice(1)) assert.deepEqual(names(t), names(tiers[0]), `${f} tier ${t.min}`);
  }
});

test('every layout row has as many cells as the tier has columns', () => {
  for (const { f, tiers } of layouts()) {
    for (const t of tiers) t.rows.forEach((r, i) => assert.equal(r.length, t.cols, `${f} tier ${t.min} row ${i + 1}`));
  }
});

test('every area in a layout is one solid rectangle', () => {
  for (const { f, tiers } of layouts()) {
    for (const t of tiers) {
      const box = {};
      t.rows.forEach((r, y) => r.forEach((c, x) => {
        if (c === '.') return;
        const b = box[c] || (box[c] = { x0: x, x1: x, y0: y, y1: y, n: 0 });
        b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); b.n++;
      }));
      for (const [name, b] of Object.entries(box)) {
        assert.equal(b.n, (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1), `${f} tier ${t.min}: "${name}" is not a rectangle`);
      }
    }
  }
});

test('layout tiers start at 0 and go up', () => {
  for (const { f, tiers } of layouts()) {
    assert.equal(tiers[0].min, 0, f);
    for (let i = 1; i < tiers.length; i++) assert.ok(tiers[i].min > tiers[i - 1].min, f);
  }
});

test('every home link names two operators that exist', () => {
  const src = read('src/pages/index.astro');
  const ids = new Set([...src.matchAll(/<Operator\b[^>]*?\sid="(\w+)"/g)].map((m) => m[1]));
  const block = src.match(/const links[^=]*=\s*\[([\s\S]*?)\n\];/);
  assert.ok(block, 'links not found');
  const ends = [...block[1].matchAll(/'(\w+)(?::\w+)?'/g)].map((m) => m[1]);
  assert.ok(ends.length >= 2 && ends.length % 2 === 0);
  for (const id of ends) assert.ok(ids.has(id), `${id} is linked but is not an operator`);
});

test('links built in page scripts and data end in a slash', () => {
  // The built pages are checked in tests/built. This catches links a script writes after load.
  const bad = [];
  for (const f of walk('src').filter((f) => /\.(astro|js|jsx|ts|tsx)$/.test(f))) {
    read(f).split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*|<!--)/.test(line)) return;
      // href: '/about'  href="/about"  href={`/projects/${slug}`}  .href = '/projects/' + slug;
      for (const m of line.matchAll(/\bhref\s*[:=]\s*\{?\s*([`'"])(\/[^`'"]*)\1\s*(\+[^;]*)?/g)) {
        const path = m[2], tail = (m[3] || '').trim();
        if (path === '/' && !tail) continue;
        if (/\.[a-z0-9]+$/i.test(path) && !tail) continue; // a file
        if (path.includes('/proto/')) continue; // the DomainClaim prototypes are .html files
        const ok = tail ? /\+\s*['"`]\/['"`]$/.test(tail) : path.split(/[?#]/)[0].endsWith('/');
        if (!ok) bad.push(`${f}:${i + 1}  ${m[0].trim()}`);
      }
    });
  }
  assert.deepEqual(bad, []);
});

test('the site does not use Astro\'s prefetch, which fetches the page without its stylesheets', () => {
  assert.match(read('astro.config.mjs'), /prefetch:\s*false/);
  assert.match(read('astro.config.mjs'), /trailingSlash:\s*'always'/);
  assert.match(read('src/layouts/Base.astro'), /import '\.\.\/lib\/warm\.js';/);
  for (const f of walk('src').filter((f) => f.endsWith('.astro'))) {
    assert.equal(/data-astro-prefetch/.test(read(f)), false, `${f}: use data-warm`);
  }
});
