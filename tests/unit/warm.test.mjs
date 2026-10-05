// Early fetching of the next page and its stylesheets (src/lib/warm.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installWarm, stylesheetsIn, pageFor, FRESH_MS, HOVER_MS } from '../../src/lib/warm.js';

const ORIGIN = 'https://carlton.dev';
const link = (href, extra = {}) => ({
  href: new URL(href, ORIGIN + '/').href, target: '', attrs: {}, ...extra,
  hasAttribute(k) { return k in this.attrs; },
  closest() { return this; },
  contains(x) { return x === this; },
});
const loc = (path = '/') => new URL(path, ORIGIN);

const PAGE = `<!doctype html><html><head><link rel="stylesheet" href="/_astro/base.css">
<link href='/_astro/about.css' rel=stylesheet><link rel="preload" href="/js/patch.js" as="script">
<link rel="stylesheet" href="/_astro/base.css"></head><body><link rel="stylesheet" href="/_astro/body.css"></body></html>`;

/** A document and a network that record what was asked of them. */
function rig({ path = '/', connection, onLine = true, loaded = [], marked = [] } = {}) {
  let t = 0, ids = 0, timers = [];
  const asked = [];
  const doc = new EventTarget();
  doc.querySelectorAll = (sel) => (sel === 'a[data-warm]' ? marked : loaded.map((href) => ({ href: ORIGIN + href })));
  const win = { location: loc(path), navigator: { onLine, connection } };
  const pages = { default: PAGE };
  const api = installWarm({
    win, doc,
    now: () => t,
    fetch: (url, init) => {
      asked.push(url.replace(ORIGIN, ''));
      if (pages.fail) return Promise.reject(new Error('offline'));
      const css = url.endsWith('.css');
      return Promise.resolve({ ok: true, headers: { get: () => (css ? 'text/css' : 'text/html; charset=utf-8') }, text: async () => (css ? '' : pages.default) });
    },
    setTimeout: (fn, ms) => { const id = ++ids; timers.push({ id, fn, at: t + ms }); return id; },
    clearTimeout: (id) => { timers = timers.filter((x) => x.id !== id); },
    idle: (fn) => fn(),
  });
  return {
    asked, pages, win, api,
    fire: (type, a, extra = {}) => {
      const e = new Event(type);
      Object.defineProperty(e, 'target', { value: a || { closest: () => null } });
      Object.assign(e, extra);
      doc.dispatchEvent(e);
    },
    wait: (ms) => { t += ms; const due = timers.filter((x) => x.at <= t); timers = timers.filter((x) => x.at > t); due.forEach((x) => x.fn()); },
    settle: () => new Promise((r) => setImmediate(r)),
  };
}

test('stylesheetsIn finds the stylesheets in the head, once each, in order', () => {
  assert.deepEqual(stylesheetsIn(PAGE), ['/_astro/base.css', '/_astro/about.css', '/_astro/body.css']);
  assert.deepEqual(stylesheetsIn('<script>t.indexOf("</head>")</script><link rel="stylesheet" href="/a.css">'), ['/a.css'], 'a page whose scripts mention the head');
  assert.deepEqual(stylesheetsIn('<p>no head</p>'), []);
  assert.deepEqual(stylesheetsIn('<head><link rel="stylesheet" href="/a.css?x=1&amp;y=2"></head>'), ['/a.css?x=1&y=2']);
  assert.deepEqual(stylesheetsIn('<head><link rel="alternate stylesheet-ish" href="/no.css"><link rel="icon" href="/f.ico"></head>'), []);
});

test('pageFor accepts the site\'s other pages only', () => {
  assert.equal(pageFor(link('/about/'), loc('/')), ORIGIN + '/about/');
  assert.equal(pageFor(link('/projects/fast/#top'), loc('/')), ORIGIN + '/projects/fast/');
  assert.equal(pageFor(link('/projects/?tag=ai'), loc('/projects/')), ORIGIN + '/projects/?tag=ai');
  assert.equal(pageFor(link('/about/'), loc('/about/')), null, 'the page we are on');
  assert.equal(pageFor(link('/about/#bio'), loc('/about/')), null, 'a place on the page we are on');
  assert.equal(pageFor(link('https://github.com/Carlton-L'), loc('/')), null, 'another site');
  assert.equal(pageFor(link('mailto:hi@carlton.dev'), loc('/')), null);
  assert.equal(pageFor(link('/cv/Carlton_Lindsay_Design_Engineer_CV.pdf'), loc('/')), null, 'a file');
  assert.equal(pageFor(link('/projects/domainclaim/proto/01-rail-drawer.html', { target: '_blank' }), loc('/')), null);
  assert.equal(pageFor(link('/about/', { attrs: { download: '' } }), loc('/')), null);
  assert.equal(pageFor(null, loc('/')), null);
});

test('resting on a link for 80ms fetches the page, then the stylesheets it needs', async () => {
  const r = rig({ loaded: ['/_astro/base.css'] });
  r.fire('mouseover', link('/about/'));
  r.wait(HOVER_MS - 1);
  assert.deepEqual(r.asked, []);
  r.wait(1);
  await r.settle();
  assert.deepEqual(r.asked, ['/about/', '/_astro/about.css', '/_astro/body.css'], 'base.css is already on this page');
});

test('passing over a link without resting fetches nothing', async () => {
  const r = rig();
  r.fire('mouseover', link('/about/'));
  r.wait(40);
  r.fire('mouseover', null);
  r.wait(200);
  await r.settle();
  assert.deepEqual(r.asked, []);
});

test('moving inside the same link does not restart the wait', async () => {
  const r = rig();
  const a = link('/about/');
  r.fire('mouseover', a);
  r.wait(60);
  r.fire('mouseover', a);
  r.wait(20);
  await r.settle();
  assert.equal(r.asked[0], '/about/');
});

test('keyboard focus counts as resting', async () => {
  const r = rig();
  r.fire('focusin', link('/lab/'));
  r.wait(HOVER_MS);
  await r.settle();
  assert.equal(r.asked[0], '/lab/');
});

test('focus leaving the link before 80ms cancels it', async () => {
  const r = rig();
  r.fire('focusin', link('/lab/'));
  r.wait(10);
  r.fire('focusout', null, { relatedTarget: null });
  r.wait(200);
  await r.settle();
  assert.deepEqual(r.asked, []);
});

test('a press or a touch fetches at once', async () => {
  for (const type of ['mousedown', 'touchstart']) {
    const r = rig();
    r.fire(type, link('/contact/'));
    await r.settle();
    assert.equal(r.asked[0], '/contact/', type);
  }
});

test('a page is fetched once while it is fresh', async () => {
  const r = rig();
  const a = link('/about/');
  r.fire('mousedown', a);
  r.wait(FRESH_MS - HOVER_MS - 1);
  r.fire('mousedown', a);
  r.fire('mouseover', a); r.wait(HOVER_MS);
  await r.settle();
  assert.equal(r.asked.filter((u) => u === '/about/').length, 1);
});

test('after 5 minutes a hover fetches it again', async () => {
  const r = rig();
  const a = link('/about/');
  r.fire('mousedown', a);
  r.wait(FRESH_MS);
  r.fire('mouseover', a); r.wait(HOVER_MS);
  await r.settle();
  assert.equal(r.asked.filter((u) => u === '/about/').length, 2);
});

test('links marked data-warm are fetched when the page loads, and not the current page', async () => {
  const marked = ['/projects/', '/about/', '/lab/', '/contact/'].map((h) => link(h));
  const r = rig({ path: '/about/', marked });
  r.fire('astro:page-load');
  await r.settle();
  assert.deepEqual(r.asked.filter((u) => !u.endsWith('.css')), ['/projects/', '/lab/', '/contact/']);
});

test('the next page load does not fetch them again while they are fresh', async () => {
  const marked = ['/projects/', '/about/'].map((h) => link(h));
  const r = rig({ marked });
  r.fire('astro:page-load');
  r.wait(1000);
  r.fire('astro:page-load');
  await r.settle();
  assert.equal(r.asked.filter((u) => u === '/about/').length, 1);
});

test('on data saver or 2G only a press fetches', async () => {
  for (const connection of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }]) {
    const r = rig({ connection, marked: [link('/about/')] });
    r.fire('astro:page-load');
    r.fire('mouseover', link('/lab/')); r.wait(HOVER_MS);
    await r.settle();
    assert.deepEqual(r.asked, []);
    r.fire('mousedown', link('/lab/'));
    await r.settle();
    assert.equal(r.asked[0], '/lab/');
  }
});

test('offline fetches nothing', async () => {
  const r = rig({ onLine: false });
  r.fire('mousedown', link('/lab/'));
  await r.settle();
  assert.deepEqual(r.asked, []);
});

test('a failed fetch is tried again on the next hover', async () => {
  const r = rig();
  r.pages.fail = true;
  r.fire('mousedown', link('/lab/'));
  await r.settle();
  r.pages.fail = false;
  r.fire('mousedown', link('/lab/'));
  await r.settle();
  assert.equal(r.asked.filter((u) => u === '/lab/').length, 2);
});

test('links to other sites and files are left alone', async () => {
  const r = rig();
  r.fire('mousedown', link('https://github.com/Carlton-L'));
  r.fire('mousedown', link('/cv/cv.pdf'));
  r.fire('mousedown', null);
  await r.settle();
  assert.deepEqual(r.asked, []);
});
