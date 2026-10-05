// The message bus behind the cables (src/lib/patch-runtime.js), run in Node with a few fakes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../../src/lib/patch-runtime.js', import.meta.url), 'utf8');

/** A fresh runtime in its own context. Returns window.Patch and the fakes around it. */
function boot(search = '') {
  const observers = [];
  class IO {
    constructor(fn, opts) { this.fn = fn; this.opts = opts; this.live = true; this.targets = []; observers.push(this); }
    observe(el) { this.targets.push(el); }
    disconnect() { this.live = false; }
  }
  const document = new EventTarget();
  document.getElementById = () => null;
  document.visibilityState = 'visible';
  const store = {};
  const start = performance.now();
  // starts at one second, as on a page that has been open a moment
  const clock = { now: () => 1000 + performance.now() - start };
  const ctx = vm.createContext({
    document, Event, CustomEvent, console, performance: clock,
    setTimeout, clearTimeout, setInterval, clearInterval,
    IntersectionObserver: IO,
    location: { search },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  });
  ctx.window = ctx;
  vm.runInContext(SRC, ctx);
  return { Patch: ctx.Patch, document, observers, store, swap: () => document.dispatchEvent(new Event('astro:before-swap')) };
}

test('a message goes only to the operators it is linked to', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const got = { b: [], c: [], d: [] };
  net.links([['a:tick', 'b'], ['a:other', 'c']]);
  const a = net.node('a', { outs: { tick: 'number', other: 'number' } });
  net.node('b', { ins: { tick: (m) => got.b.push(m) } });
  net.node('c', { ins: { other: (m) => got.c.push(m), tick: (m) => got.c.push(m) } });
  net.node('d', { ins: { tick: (m) => got.d.push(m) } });
  a.emit('tick', 1);
  assert.deepEqual(got, { b: [1], c: [], d: [] });
});

test('the handler is told where the message came from', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  let meta;
  net.links([['a:tick', 'b']]);
  const a = net.node('a');
  net.node('b', { ins: { tick: (m, x) => { meta = x; } } });
  a.emit('tick', 1);
  assert.deepEqual({ ...meta }, { from: 'a', channel: 'tick' });
});

test('a link with a port on its far end renames the channel', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const got = [];
  net.links([['a:selection', 'b:pick']]);
  const a = net.node('a');
  net.node('b', { ins: { pick: (m) => got.push(m), selection: () => got.push('wrong') } });
  a.emit('selection', 'x');
  assert.deepEqual(got, ['x']);
});

test('a link with no port carries whatever channel is sent', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const got = [];
  net.links([['a', 'b']]);
  const a = net.node('a');
  net.node('b', { ins: { one: (m) => got.push(['one', m]), two: (m) => got.push(['two', m]) } });
  a.emit('one', 1);
  a.emit('two', 2);
  assert.deepEqual(got, [['one', 1], ['two', 2]]);
});

test('a filter changes the message for everything after it', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const got = { fx: [], view: [] };
  net.links([['index:selection', 'fx'], ['fx', 'view']]);
  const index = net.node('index');
  net.node('fx', { filter: { selection: (m) => ({ ...m, invert: true }) }, ins: { selection: (m) => got.fx.push(m) } });
  net.node('view', { ins: { selection: (m) => got.view.push(m) } });
  index.emit('selection', { slug: 'fast' });
  assert.deepEqual(got.fx.map((m) => ({ ...m })), [{ slug: 'fast', invert: true }]);
  assert.deepEqual(got.view.map((m) => ({ ...m })), [{ slug: 'fast', invert: true }]);
});

test('an operator with no filter is the end of the line', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const got = [];
  net.links([['a:tick', 'b'], ['b', 'c']]);
  const a = net.node('a');
  net.node('b', { ins: { tick: () => {} } });
  net.node('c', { ins: { tick: (m) => got.push(m) } });
  a.emit('tick', 1);
  assert.deepEqual(got, []);
});

test('a filter that returns undefined blocks the message, and the cable does not pulse', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const got = { fx: [], view: [] };
  net.links([['index:selection', 'fx'], ['fx', 'view']]);
  const index = net.node('index');
  net.node('fx', { filter: { selection: () => undefined }, ins: { selection: (m) => got.fx.push(m) } });
  net.node('view', { ins: { selection: (m) => got.view.push(m) } });
  index.emit('selection', { slug: 'fast' });
  assert.deepEqual(got, { fx: [], view: [] });
  assert.equal(net.pulses.length, 0);
});

test('every delivery pulses the cable that carried it', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  net.links([['a:tick', 'b'], ['b', 'c']]);
  const a = net.node('a');
  net.node('b', { filter: { tick: (m) => m } });
  net.node('c');
  a.emit('tick', 1);
  assert.deepEqual(Array.from(net.pulses, (p) => p.f + '>' + p.t), ['a>b', 'b>c']);
});

test('no more than 32 pulses wait at once', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  net.links([['a:tick', 'b']]);
  const a = net.node('a');
  net.node('b');
  for (let i = 0; i < 100; i++) a.emit('tick', i);
  assert.equal(net.pulses.length, 32);
});

test('a long chain stops after 17 operators (the 16-hop cap)', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  const reached = [];
  const links = [];
  for (let i = 0; i < 30; i++) links.push([i === 0 ? 'n0:tick' : 'n' + i, 'n' + (i + 1)]);
  net.links(links);
  const first = net.node('n0');
  for (let i = 1; i <= 30; i++) net.node('n' + i, { filter: { tick: (m) => m }, ins: { tick: () => reached.push(i) } });
  first.emit('tick', 1);
  assert.equal(reached.length, 17);
  assert.equal(reached.at(-1), 17);
});

test('a loop of filters ends instead of running forever', () => {
  const { Patch } = boot();
  const net = Patch.field('net');
  let count = 0;
  net.links([['a', 'b'], ['b', 'a']]);
  const a = net.node('a', { filter: { tick: (m) => m }, ins: { tick: () => count++ } });
  net.node('b', { filter: { tick: (m) => m }, ins: { tick: () => count++ } });
  a.emit('tick', 1);
  assert.equal(count, 17);
});

test('Patch.field returns the same field for the same id', () => {
  const { Patch } = boot();
  assert.equal(Patch.field('net'), Patch.field('net'));
  assert.notEqual(Patch.field('net'), Patch.field('other'));
  assert.equal(Patch.stats().fields, 2);
});

test('a channel tells its subscribers and can save its value', () => {
  const { Patch, store } = boot();
  const net = Patch.field('net');
  const got = [];
  const ch = net.channel('param:density', { persist: 'patch-bg.density' });
  assert.equal(net.channel('param:density'), ch);
  ch.on((v) => got.push(v));
  ch.emit(0.4);
  assert.deepEqual(got, [0.4]);
  assert.deepEqual(JSON.parse(store['patch-bg']), { density: 0.4 });
});

test('saving a value keeps the other values in the same store', () => {
  const { Patch, store } = boot();
  store['patch-bg'] = JSON.stringify({ pal: 2 });
  Patch.field('net').channel('d', { persist: 'patch-bg.density' }).emit(0.7);
  assert.deepEqual(JSON.parse(store['patch-bg']), { pal: 2, density: 0.7 });
});

test('timers, listeners and observers are counted while they live', () => {
  const { Patch, document, observers, swap } = boot();
  const net = Patch.field('net');
  const n = net.node('a');
  n.every(10_000, () => {});
  n.timeout(10_000, () => {});
  n.listen(document, 'x', () => {});
  n.observe({}, {}, () => {});
  Patch.on('mode', () => {});
  Patch.onScreen({}, () => {});
  assert.deepEqual({ ...Patch.stats() }, { fields: 1, nodes: 1, timers: 2, listeners: 2, observers: 2 });
  assert.equal(observers.filter((o) => o.live).length, 2);
  swap();
});

test('a page change leaves nothing behind', () => {
  const { Patch, document, observers, swap } = boot();
  const net = Patch.field('net');
  const n = net.node('a');
  let fired = 0, cleaned = 0;
  n.every(1, () => fired++);
  n.timeout(1, () => fired++);
  n.listen(document, 'x', () => fired++);
  n.observe({}, {}, () => {});
  n.cleanup(() => cleaned++);
  Patch.on('mode', () => fired++);
  Patch.onScreen({}, () => {});
  swap();
  assert.deepEqual({ ...Patch.stats() }, { fields: 0, nodes: 0, timers: 0, listeners: 0, observers: 0 });
  assert.equal(cleaned, 1);
  assert.equal(observers.filter((o) => o.live).length, 0);
  document.dispatchEvent(new Event('x'));
  document.dispatchEvent(new Event('patchmode'));
  return new Promise((done) => setTimeout(() => { assert.equal(fired, 0); done(); }, 20));
});

test('after a page change the old links are gone and a new page starts clean', () => {
  const { Patch, swap } = boot();
  const old = Patch.field('net');
  const got = [];
  old.links([['a:tick', 'b']]);
  const a = old.node('a');
  old.node('b', { ins: { tick: (m) => got.push(m) } });
  swap();
  a.emit('tick', 1);
  assert.deepEqual(got, []);
  assert.notEqual(Patch.field('net'), old);
});

test('a timeout that has fired is not counted twice at teardown', async () => {
  const { Patch, swap } = boot();
  const n = Patch.field('net').node('a');
  let fired = 0;
  n.timeout(1, () => fired++);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(fired, 1);
  assert.equal(Patch.stats().timers, 0);
  swap();
  assert.equal(Patch.stats().timers, 0);
});

test('one failing cleanup does not stop the others', () => {
  const { Patch, swap } = boot();
  const n = Patch.field('net').node('a');
  let cleaned = 0;
  n.cleanup(() => { throw new Error('boom'); });
  n.cleanup(() => cleaned++);
  swap();
  assert.equal(cleaned, 1);
});

test('onScreen reports changes once, and follows the tab being hidden', () => {
  const { Patch, document, observers, swap } = boot();
  const seen = [];
  const stop = Patch.onScreen({}, (v) => seen.push(v), '100px');
  const io = observers[0];
  assert.equal(io.opts.rootMargin, '100px');
  io.fn([{ isIntersecting: true }]);
  io.fn([{ isIntersecting: true }]);
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  io.fn([{ isIntersecting: false }]);
  assert.deepEqual(seen, [true, false, true, false]);
  stop(); stop();
  assert.equal(Patch.stats().observers, 0);
  swap();
  assert.equal(Patch.stats().observers, 0);
});

test('Patch.link shares state at once and sends it down the cable', () => {
  const { Patch, swap } = boot();
  const net = Patch.field('net');
  const cable = [];
  net.links([['ctl:state', 'view']]);
  net.node('view', { ins: { state: (m) => cable.push({ ...m }) } });
  const link = Patch.link('net', 'ctl', { initial: { year: 2020 } });
  const seen = [];
  const off = link.on((s) => seen.push(s.year));
  link.set({ year: 2021 });
  assert.deepEqual(seen, [2020, 2021]);
  assert.deepEqual(cable, [{ year: 2021 }]);
  link.set((s) => ({ year: s.year + 1 }));
  link.set({ year: 2030 });
  assert.deepEqual(seen, [2020, 2021, 2022, 2030]);
  assert.equal(cable.length, 1, 'the cable carries at most one message per 120ms');
  off();
  link.set({ year: 2040 });
  assert.equal(seen.length, 4);
  swap();
});

test('Patch.link sends the last value once the 120ms has passed', async () => {
  const { Patch, swap } = boot();
  const net = Patch.field('net');
  const cable = [];
  net.links([['ctl:state', 'view']]);
  net.node('view', { ins: { state: (m) => cable.push(m.v) } });
  const link = Patch.link('net', 'ctl', { initial: { v: 0 } });
  link.set({ v: 1 }); link.set({ v: 2 }); link.set({ v: 3 });
  await new Promise((r) => setTimeout(r, 180));
  assert.deepEqual(cable, [1, 3]);
  swap();
});

test('?nopatch=1 turns the bus off without breaking the code that uses it', () => {
  const { Patch } = boot('?nopatch=1');
  const net = Patch.field('net');
  let got = 0;
  net.links([['a:tick', 'b']]);
  const a = net.node('a');
  net.node('b', { ins: { tick: () => got++ } });
  a.emit('tick', 1);
  a.every(1, () => got++);
  net.channel('x').emit(1);
  assert.equal(got, 0);
  assert.equal(net.stub, 1);
  assert.deepEqual({ ...Patch.stats() }, { fields: 0, nodes: 0, timers: 0, listeners: 0, observers: 0 });
});

test('loading the script twice keeps the first runtime', () => {
  const observers = [];
  const document = new EventTarget();
  document.getElementById = () => null;
  const ctx = vm.createContext({ document, Event, CustomEvent, performance, setTimeout, clearTimeout, setInterval, clearInterval, location: { search: '' } });
  ctx.window = ctx;
  vm.runInContext(SRC, ctx);
  const first = ctx.Patch;
  first.field('net');
  vm.runInContext(SRC, ctx);
  assert.equal(ctx.Patch, first);
  assert.equal(ctx.Patch.stats().fields, 1);
  assert.equal(observers.length, 0);
});
