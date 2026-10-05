// The page-change clock (src/lib/page-clock.js), run in Node with a hand-driven clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installPageClock, isPointerClick, ringMax, MS, FRAME_CAP } from '../../src/lib/page-clock.js';

/** A document, a window and a clock that only moves when the test says so. */
function rig({ w = 1000, h = 600 } = {}) {
  let t = 5000, ids = 0;
  let frames = [], timers = [];
  const attrs = {}, style = {};
  const anims = ['pf-wipe', 'pf-dim', 'something-else'].map((animationName) => ({
    animationName, currentTime: 0, finished: 0, finish() { this.finished++; },
  }));
  const doc = new EventTarget();
  doc.documentElement = {
    setAttribute: (k, v) => { attrs[k] = v; },
    removeAttribute: (k) => { delete attrs[k]; },
    style: { setProperty: (k, v) => { style[k] = v; } },
  };
  doc.getAnimations = () => anims;
  const win = { innerWidth: w, innerHeight: h };
  const fired = { 'pf:go': 0, 'pf:done': 0 };
  for (const name of Object.keys(fired)) doc.addEventListener(name, () => fired[name]++);

  installPageClock({
    win, doc,
    now: () => t,
    raf: (fn) => { const id = ++ids; frames.push({ id, fn }); return id; },
    caf: (id) => { frames = frames.filter((f) => f.id !== id); },
    setTimeout: (fn, ms) => { const id = ++ids; timers.push({ id, fn, at: t + ms }); return id; },
    clearTimeout: (id) => { timers = timers.filter((x) => x.id !== id); },
  });

  const send = (type, props) => doc.dispatchEvent(Object.assign(new Event(type), props));
  /** Move time on, run the timers that came due, then run one frame. */
  const frame = (ms = 16) => {
    t += ms;
    const due = timers.filter((x) => x.at <= t);
    timers = timers.filter((x) => x.at > t);
    due.forEach((x) => x.fn());
    const run = frames; frames = [];
    run.forEach((f) => f.fn());
  };
  return {
    win, doc, attrs, style, anims, fired, send, frame,
    wait: (ms) => { t += ms; },
    pending: () => frames.length,
    click: (x, y, props) => { send('pointerup'); send('click', { detail: 1, clientX: x, clientY: y, ...props }); },
    navigate: (props) => send('astro:before-preparation', { navigationType: 'push', ...props }),
    /** before-preparation, swap, then the new page's network reports ready */
    arrive: () => { send('astro:before-preparation', { navigationType: 'push' }); send('astro:after-swap'); send('pf:ready'); },
  };
}

test('the duration and the frame cap are the documented numbers', () => {
  assert.equal(MS, 580);
  assert.equal(FRAME_CAP, 34);
});

test('a click counts as a pointer click only just after a pointer is released', () => {
  assert.equal(isPointerClick(1, 1000, 990), true);
  assert.equal(isPointerClick(1, 1000, 600), true);
  assert.equal(isPointerClick(1, 1000, 599), false);
  assert.equal(isPointerClick(0, 1000, 990), false, 'detail 0 is a keyboard click');
  assert.equal(isPointerClick(1, 1000, -1e4), false, 'Firefox: Enter on a link has detail 1 and no pointer');
});

test('the ring reaches past the farthest corner', () => {
  assert.equal(ringMax(0, 0, 1000, 600), Math.round(Math.hypot(1000, 600) + 160));
  assert.equal(ringMax(1000, 600, 1000, 600), Math.round(Math.hypot(1000, 600) + 160));
  assert.equal(ringMax(500, 300, 1000, 600), Math.round(Math.hypot(500, 300) + 160));
  assert.equal(ringMax(900, 100, 1000, 600), Math.round(Math.hypot(900, 500) + 160));
  for (const [x, y] of [[0, 0], [10, 590], [777, 123], [1000, 0]]) {
    for (const [cx, cy] of [[0, 0], [1000, 0], [0, 600], [1000, 600]]) {
      assert.ok(ringMax(x, y, 1000, 600) > Math.hypot(cx - x, cy - y));
    }
  }
});

test('a navigation that follows a click opens as a ring from the click', () => {
  const r = rig();
  r.click(200, 150);
  r.navigate();
  assert.deepEqual(r.win.__pfNav, { ring: { x: 200, y: 150, max: ringMax(200, 150, 1000, 600) }, f: 0, started: false, nav: true });
  assert.equal(r.attrs['data-pf'], 'ring');
  assert.deepEqual(r.style, { '--pf-cx': '200px', '--pf-cy': '150px', '--pf-max': ringMax(200, 150, 1000, 600) + 'px' });
});

test('the ring is set again after the swap replaces the root attributes', () => {
  const r = rig();
  r.click(200, 150);
  r.navigate();
  delete r.attrs['data-pf'];
  r.send('astro:after-swap');
  assert.equal(r.attrs['data-pf'], 'ring');
});

test('a keyboard navigation has no ring', () => {
  const r = rig();
  r.send('click', { detail: 0, clientX: 200, clientY: 150 });
  r.navigate();
  assert.equal(r.win.__pfNav.ring, null);
  assert.equal('data-pf' in r.attrs, false);
});

test('Enter on a link in Firefox (detail 1, no pointer) has no ring', () => {
  const r = rig();
  r.send('click', { detail: 1, clientX: 200, clientY: 150 });
  r.navigate();
  assert.equal(r.win.__pfNav.ring, null);
});

test('a click long after the pointer was released has no ring', () => {
  const r = rig();
  r.send('pointerup');
  r.wait(401);
  r.send('click', { detail: 1, clientX: 200, clientY: 150 });
  r.navigate();
  assert.equal(r.win.__pfNav.ring, null);
});

test('back and forward have no ring, even just after a click', () => {
  const r = rig();
  r.click(200, 150);
  r.navigate({ navigationType: 'traverse' });
  assert.equal(r.win.__pfNav.ring, null);
});

test('a click more than a second old is not the origin', () => {
  const r = rig();
  r.click(200, 150);
  r.wait(1000);
  r.navigate();
  assert.equal(r.win.__pfNav.ring, null);
});

test('a click is used for one navigation only', () => {
  const r = rig();
  r.click(200, 150);
  r.navigate();
  r.navigate();
  assert.equal(r.win.__pfNav.ring, null);
  assert.equal('data-pf' in r.attrs, false);
});

test('the clock starts when the network reports ready, without waiting for page-load', () => {
  const r = rig();
  r.send('astro:before-preparation', { navigationType: 'push' });
  r.send('astro:after-swap');
  assert.equal(r.win.__pfNav.started, false);
  r.send('pf:ready');
  assert.equal(r.win.__pfNav.started, true);
  assert.equal(r.fired['pf:go'], 1);
});

test('pf:ready on a first load does not start it; page-load does', () => {
  const r = rig();
  r.send('pf:ready');
  assert.equal(r.win.__pfNav, undefined);
  r.send('astro:page-load');
  r.frame();
  assert.equal(r.win.__pfNav.started, true);
  assert.equal(r.fired['pf:go'], 1);
});

test('a page with no network starts within 700ms of the swap', () => {
  const r = rig();
  r.send('astro:before-preparation', { navigationType: 'push' });
  r.send('astro:after-swap');
  r.frame(699);
  assert.equal(r.win.__pfNav.started, false);
  r.frame(1);
  assert.equal(r.win.__pfNav.started, true);
});

test('a second start signal does not stop or restart a running clock', () => {
  const r = rig();
  r.arrive();
  for (let i = 0; i < 5; i++) r.frame();
  const before = r.win.__pfNav.f;
  assert.ok(before > 0);
  r.send('astro:page-load'); // asks for another start on the next frame
  r.send('pf:ready');
  r.frame();
  const after = r.win.__pfNav.f;
  assert.ok(after > before, 'still advancing');
  r.frame();
  assert.ok(r.win.__pfNav.f > after, 'and on the frame after that');
  assert.equal(r.fired['pf:go'], 1);
  assert.equal(r.pending(), 1, 'one loop, not two');
});

test('the 700ms fallback does not restart a clock that already ran', () => {
  const r = rig();
  r.arrive();
  for (let i = 0; i < 60; i++) r.frame();
  assert.equal(r.win.__pfNav.done, true);
  r.frame(800);
  assert.equal(r.fired['pf:go'], 1);
  assert.equal(r.fired['pf:done'], 1);
});

test('a frame advances the clock by the time that passed', () => {
  const r = rig();
  r.arrive();
  r.frame(16);
  assert.ok(Math.abs(r.win.__pfNav.f - 16 / MS) < 1e-9);
  r.frame(10);
  assert.ok(Math.abs(r.win.__pfNav.f - 26 / MS) < 1e-9);
});

test('a late frame advances it by 34ms at most', () => {
  const r = rig();
  r.arrive();
  r.frame(900);
  assert.ok(Math.abs(r.win.__pfNav.f - FRAME_CAP / MS) < 1e-9);
  assert.equal(r.fired['pf:done'], 0);
});

test('the wipe and the dim are moved to the clock; other animations are left alone', () => {
  const r = rig();
  r.arrive();
  r.frame(16); r.frame(16);
  const [wipe, dim, other] = r.anims;
  assert.ok(Math.abs(wipe.currentTime - 32) < 1e-9);
  assert.ok(Math.abs(dim.currentTime - 32) < 1e-9);
  assert.equal(other.currentTime, 0);
});

test('it runs to 1, fires pf:done once, and finishes the page images', () => {
  const r = rig();
  r.arrive();
  let n = 0, prev = 0;
  while (!r.win.__pfNav.done && n < 200) {
    r.frame(16); n++;
    assert.ok(r.win.__pfNav.f >= prev, 'never goes back');
    prev = r.win.__pfNav.f;
  }
  assert.equal(n, Math.ceil(MS / 16));
  assert.equal(r.win.__pfNav.f, 1);
  assert.equal(r.fired['pf:done'], 1);
  assert.equal(r.pending(), 0, 'the loop has stopped');
  const [wipe, dim, other] = r.anims;
  assert.equal(wipe.finished, 1);
  assert.equal(dim.finished, 1);
  assert.equal(other.finished, 0);
  r.frame(250); // finished again, in case a page image turned up late
  assert.equal(wipe.finished, 2);
  for (let i = 0; i < 20; i++) r.frame();
  assert.equal(r.fired['pf:done'], 1);
});

test('at 4 frames a second it still plays every step, slowly', () => {
  const r = rig();
  r.arrive();
  let n = 0;
  while (!r.win.__pfNav.done && n < 200) { r.frame(250); n++; }
  assert.equal(n, Math.ceil(MS / FRAME_CAP));
});

test('a new navigation stops the running clock and starts a fresh one', () => {
  const r = rig();
  r.arrive();
  for (let i = 0; i < 5; i++) r.frame();
  const old = r.win.__pfNav;
  const at = old.f;
  r.arrive();
  assert.notEqual(r.win.__pfNav, old);
  assert.equal(r.win.__pfNav.f, 0);
  r.frame();
  assert.equal(old.f, at, 'the old clock no longer moves');
  assert.ok(r.win.__pfNav.f > 0);
  assert.equal(r.pending(), 1);
  assert.equal(r.fired['pf:go'], 2);
});

test('an animation that throws does not stop the clock', () => {
  const r = rig();
  r.anims.push({ animationName: 'pf-ring', set currentTime(v) { throw new Error('gone'); }, finish() { throw new Error('gone'); } });
  r.arrive();
  for (let i = 0; i < 60; i++) r.frame();
  assert.equal(r.win.__pfNav.done, true);
});
