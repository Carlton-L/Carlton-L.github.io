// The analytics loader (src/lib/analytics-loader.js), run in Node with a fake window, and the
// PostHog options in src/lib/analytics.js, checked against the RFC (docs/rfc/analytics.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAnalyticsLoader } from '../../src/lib/analytics-loader.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** A window on some host, with a search string and what localStorage already holds. */
function rig({ host = 'carlton.dev', search = '', stored = {}, blocked = false } = {}) {
  const store = { ...stored };
  const added = [];
  const attrs = {};
  const listeners = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const win = { location: { hostname: host, search } };
  Object.defineProperty(win, 'localStorage', { get: () => { if (blocked) throw new Error('blocked'); return localStorage; } });
  const doc = {
    createElement: (tag) => ({ tag }),
    head: { appendChild: (el) => added.push(el) },
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; } },
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  };
  const load = () => installAnalyticsLoader({ win, doc, src: '/js/rec.js?v=test' });
  /** What the ClientRouter does to <html> on a page change: new attributes, then astro:after-swap. */
  const swap = () => { for (const k in attrs) delete attrs[k]; for (const fn of listeners['astro:after-swap'] || []) fn(); };
  return { win, store, added, attrs, load, swap };
}

test('PostHog starts on carlton.dev only, and the file loads on every host', () => {
  for (const host of ['localhost', '127.0.0.1', 'carlton-l.github.io', 'www.carlton.dev', 'carlton.dev.example.com']) {
    const r = rig({ host });
    assert.equal(r.load(), false, host);
    assert.equal(r.win.__posthog_initialized, false, host);
    assert.equal(r.added.length, 1, host); // the recording question works everywhere
  }
  const r = rig();
  assert.equal(r.load(), true);
  assert.equal(r.added.length, 1);
  assert.equal(r.added[0].tag, 'script');
  assert.equal(r.added[0].src, '/js/rec.js?v=test');
  assert.equal(r.added[0].async, true);
  assert.equal(r.win.__posthog_initialized, true);
});

test('it runs once per visit', () => {
  const r = rig();
  r.load();
  assert.equal(r.load(), false);
  assert.equal(r.added.length, 1);
  assert.equal(r.win.__posthog_initialized, true);
});

test('?notrack=1 sets the flag, on any host, and keeps PostHog out', () => {
  const local = rig({ host: 'localhost', search: '?notrack=1' });
  local.load();
  assert.equal(local.store.notrack, '1');

  const r = rig({ search: '?utm_source=cv&notrack=1' });
  assert.equal(r.load(), false);
  assert.equal(r.store.notrack, '1');
  assert.equal(r.win.__posthog_initialized, false);
});

test('the flag holds on a later visit without the parameter', () => {
  const r = rig({ stored: { notrack: '1' } });
  assert.equal(r.load(), false);
  assert.equal(r.win.__posthog_initialized, false);
});

test('?notrack=0 clears the flag, and PostHog starts again', () => {
  const r = rig({ search: '?notrack=0', stored: { notrack: '1' } });
  assert.equal(r.load(), true);
  assert.equal('notrack' in r.store, false);
});

test('only an exact notrack value counts', () => {
  for (const search of ['?notrack=10', '?notrack=', '?xnotrack=1']) {
    const r = rig({ search });
    assert.equal(r.load(), true, search);
    assert.equal('notrack' in r.store, false, search);
  }
});

test('with storage blocked the visit still counts, and the question is asked', () => {
  const r = rig({ blocked: true, search: '?notrack=1' });
  assert.equal(r.load(), true);
  assert.equal(r.attrs['data-rec'], 'ask');
});

test('the answer is on <html> before the first paint, and again after a page change', () => {
  for (const [stored, want] of [[undefined, 'ask'], ['yes', 'yes'], ['no', 'no'], ['maybe', 'ask']]) {
    const r = rig({ host: 'localhost', stored: stored ? { 'rec-consent': stored } : {} });
    r.load();
    assert.equal(r.attrs['data-rec'], want, String(stored));
    r.win.__rec = 'no'; // answered on this page (analytics.js)
    r.swap();
    assert.equal(r.attrs['data-rec'], 'no', String(stored));
  }
});

test('the PostHog options are the ones in the RFC', () => {
  const src = read('src/lib/analytics.js');
  const want = [
    "api_host: 'https://eu.i.posthog.com'",
    "defaults: '2026-05-30'",
    "capture_pageview: 'history_change'",
    "cookieless_mode: 'on_reject'",
    'opt_out_capturing_by_default: true',
    'autocapture: true',
    'capture_exceptions: true',
    'capture_dead_clicks: true',
    'capture_performance: true',
    'capture_heatmaps: false',
    'session_recording: { maskAllInputs: true, captureCanvas: { recordCanvas: false } }',
  ];
  for (const w of want) assert.ok(src.includes(w), w);
  assert.match(src, /'https:\/\/eu-assets\.i\.posthog\.com\/static\/array\.js'/, 'the library comes from the EU host');
  assert.match(src, /ph\.register\(\{ mode: mode\(\) \}\)/, 'mode is registered on load');
  assert.match(src, /addEventListener\('patchmode'/, 'and again on every mode change');
});

test('the project token is in the source', () => {
  // Public by design (RFC). The placeholder must never ship.
  assert.match(read('src/lib/analytics.js'), /const TOKEN = 'phc_[A-Za-z0-9]+';/);
});

test('the loader is inlined in the head and points at the built file', () => {
  assert.match(read('src/layouts/Base.astro'), /<script is:inline set:html=\{loaderJs\}><\/script>/);
  const line = "var SRC = '/js/rec.js'; // @src";
  assert.ok(read('src/lib/analytics-loader.js').includes(line), 'bundles.js replaces this line');
  assert.ok(read('src/lib/bundles.js').includes(`loader.replace("${line}"`));
});

test('the recording question uses the prototype\'s words', () => {
  // docs/prototypes/consent-operator.html is the spec (C5)
  const proto = read('docs/prototypes/consent-operator.html');
  const copy = /var COPY = \{ text: '([^']+)', yes: '([^']+)', no: '([^']+)' \}/.exec(proto);
  assert.ok(copy, 'COPY in the prototype');
  const nav = read('src/components/Navigation.astro');
  for (const w of copy.slice(1)) assert.ok(nav.includes(`>${w}</`), w);
  for (const w of ['sys · recorder', 'waiting', '● rec', '○ off', 'privacy →', '<span class="rcw">REC </span>?', 'REC<span class="rcoff"> OFF</span>']) assert.ok(nav.includes(w), w);
  const src = read('src/lib/analytics.js');
  for (const w of ['Recording: not answered yet', 'Recording. Click to change', 'Not recording. Click to change']) {
    assert.ok(proto.includes(`title="${w}"`), w);
    assert.ok(src.includes(`'${w}'`), w);
  }
  assert.ok(nav.includes('aria-label="Recording: not answered yet"'));
});

test('a yes opts in and records, a no opts out', () => {
  const src = read('src/lib/analytics.js');
  assert.match(src, /'yes'\) \{\s*if \(status !== 'granted'\) ph\.opt_in_capturing\(\);\s*if \(!ph\.sessionRecordingStarted\(\)\) ph\.startSessionRecording\(\);/);
  assert.match(src, /'no'\) \{\s*if \(status !== 'denied'\) ph\.opt_out_capturing\(\);/);
  assert.match(src, /localStorage\.setItem\('rec-consent', a\)/);
  assert.match(src, /window\.track\('consent_answered', \{ answer: a \}\)/);
});

test('the contact form sends nothing typed: fields stay masked, message_sent carries nothing', () => {
  // E2. PostHog masks every input; nothing on the page may undo that
  const page = read('src/pages/contact.astro');
  for (const w of ['ph-unmask', 'data-ph-capture', 'ph-capture', 'maskAllInputs', 'posthog.']) assert.ok(!page.includes(w), w);
  const sends = page.match(/window\.track\([^)]*\)/g) || [];
  assert.deepEqual(sends, ["window.track('message_sent')"]);
  // what's shown back to the visitor (their address) stays out of recordings
  assert.match(page, /class="ct-done-p ph-no-capture" id="ctDoneP"/);
  assert.match(page, /class="ct-log ph-no-capture" id="ctLog"/);
  assert.match(read('src/lib/analytics.js'), /maskAllInputs: true/);
});

test('every demo with a RESET is marked as a demo', () => {
  // demo_reset needs a name: each island in a DemoFrame sits in an Operator with demo set to its id
  const framed = readdirSync(join(ROOT, 'src/components/react/demos'), { recursive: true })
    .filter((f) => /\.jsx$/.test(f) && !f.includes('_shared') && read(`src/components/react/demos/${f}`).includes('<DemoFrame'))
    .map((f) => f.split('/').pop().replace('.jsx', ''));
  assert.ok(framed.length >= 6, framed.join(' '));
  let seen = 0;
  for (const f of readdirSync(join(ROOT, 'src/pages/projects'))) {
    for (const op of read(`src/pages/projects/${f}`).split('<Operator ').slice(1)) {
      const body = op.slice(0, op.indexOf('</Operator>'));
      if (!framed.some((name) => body.includes(`<${name} `))) continue;
      seen++;
      assert.match(op, /^id="([^"]+)" demo="\1"/, op.slice(0, 60));
    }
  }
  assert.equal(seen, framed.length);
  assert.match(read('src/components/react/demos/_shared/DemoFrame.jsx'), /onClick=\{reset\} data-demo-reset/);
  assert.match(read('src/pages/projects/campus-ai.astro'), /<Operator id="caViewer" demo="caViewer"[\s\S]*id="caReset" data-demo-reset/);
  assert.match(read('src/components/Operator.astro'), /data-demo=\{demo\}/);
  assert.match(read('src/components/react/demos/_shared/ProductFrame.jsx'), /new CustomEvent\('demo:touch', \{ bubbles: true \}\)/);
});
