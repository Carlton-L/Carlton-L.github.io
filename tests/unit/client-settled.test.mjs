// The client:settled directive (src/lib/client-settled.js): when a demo is allowed to hydrate.
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import settled from '../../src/lib/client-settled.js';

let observers, idle;
const tick = () => new Promise((r) => setImmediate(r));

/** A demo waiting to hydrate. `count` is how many times it has. */
function island() {
  const s = { count: 0, el: { children: [{}, {}] } };
  s.load = async () => async () => { s.count++; };
  return s;
}

beforeEach(() => {
  observers = []; idle = [];
  mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.window = globalThis;
  globalThis.document = new EventTarget();
  globalThis.__pfNav = undefined;
  globalThis.requestIdleCallback = (fn, opts) => { idle.push(opts); fn(); };
  globalThis.IntersectionObserver = class {
    constructor(fn, opts) { this.fn = fn; this.opts = opts; this.targets = []; this.live = true; observers.push(this); }
    observe(el) { this.targets.push(el); }
    disconnect() { this.live = false; }
  };
});
afterEach(() => {
  mock.timers.reset();
  for (const k of ['window', 'document', '__pfNav', 'requestIdleCallback', 'IntersectionObserver']) delete globalThis[k];
});

test('on a direct load it hydrates at once', async () => {
  const d = island();
  settled(d.load, {}, d.el);
  await tick();
  assert.equal(d.count, 1);
});

test('after a link it waits for the page change to finish', async () => {
  globalThis.__pfNav = { nav: true, started: true, f: 0.4 };
  const d = island();
  settled(d.load, {}, d.el);
  await tick();
  assert.equal(d.count, 0);
  document.dispatchEvent(new Event('pf:done'));
  await tick();
  assert.equal(d.count, 1);
  assert.deepEqual(idle, [{ timeout: 400 }], 'and then for an idle moment, 400ms at most');
});

test('if the page change is already over it hydrates at once', async () => {
  globalThis.__pfNav = { nav: true, started: true, f: 1, done: true };
  const d = island();
  settled(d.load, {}, d.el);
  await tick();
  assert.equal(d.count, 1);
});

test('the first-load clock (not a navigation) does not hold it', async () => {
  globalThis.__pfNav = { ring: null, started: true, f: 0.2 };
  const d = island();
  settled(d.load, {}, d.el);
  await tick();
  assert.equal(d.count, 1);
});

test('it hydrates after 2.5s even if the page change never reports done', async () => {
  globalThis.__pfNav = { nav: true };
  const d = island();
  settled(d.load, {}, d.el);
  mock.timers.tick(2499);
  await tick();
  assert.equal(d.count, 0);
  mock.timers.tick(1);
  await tick();
  assert.equal(d.count, 1);
});

test('it hydrates once, whatever arrives afterwards', async () => {
  globalThis.__pfNav = { nav: true };
  const d = island();
  settled(d.load, {}, d.el);
  document.dispatchEvent(new Event('pf:done'));
  document.dispatchEvent(new Event('pf:done'));
  mock.timers.tick(5000);
  await tick();
  assert.equal(d.count, 1);
});

test('without requestIdleCallback (Safari) it waits 60ms instead', async () => {
  delete globalThis.requestIdleCallback;
  globalThis.__pfNav = { nav: true };
  const d = island();
  settled(d.load, {}, d.el);
  document.dispatchEvent(new Event('pf:done'));
  mock.timers.tick(59);
  await tick();
  assert.equal(d.count, 0);
  mock.timers.tick(1);
  await tick();
  assert.equal(d.count, 1);
});

test('with a margin it waits until the demo is near the screen', async () => {
  const d = island();
  settled(d.load, { value: { rootMargin: '600px' } }, d.el);
  await tick();
  assert.equal(d.count, 0);
  assert.equal(observers.length, 1);
  assert.equal(observers[0].opts.rootMargin, '600px');
  assert.deepEqual(observers[0].targets, d.el.children, 'it watches what is inside the island');
  observers[0].fn([{ isIntersecting: false }]);
  await tick();
  assert.equal(d.count, 0);
  observers[0].fn([{ isIntersecting: false }, { isIntersecting: true }]);
  await tick();
  assert.equal(d.count, 1);
  assert.equal(observers[0].live, false, 'and stops watching');
});

test('with a margin, after a link, it waits for both', async () => {
  globalThis.__pfNav = { nav: true };
  const d = island();
  settled(d.load, { value: { rootMargin: '600px' } }, d.el);
  await tick();
  assert.equal(observers.length, 0, 'it does not start watching during the page change');
  document.dispatchEvent(new Event('pf:done'));
  await tick();
  assert.equal(d.count, 0);
  observers[0].fn([{ isIntersecting: true }]);
  await tick();
  assert.equal(d.count, 1);
});

test('client:settled with no value, or a browser with no IntersectionObserver, skips the margin', async () => {
  const a = island();
  settled(a.load, { value: true }, a.el);
  delete globalThis.IntersectionObserver;
  const b = island();
  settled(b.load, { value: { rootMargin: '600px' } }, b.el);
  await tick();
  assert.equal(a.count, 1);
  assert.equal(b.count, 1);
  assert.equal(observers.length, 0);
});
