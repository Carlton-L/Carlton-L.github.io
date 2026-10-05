/**
 * page-clock: one clock for the whole page change.
 *
 * It remembers where the last click was. A navigation that follows a click starts its front
 * there: the wipe opens as a ring from that point (global.css) and the dither front and operator
 * handoff follow it (patch-field.js reads window.__pfNav). Keyboard, back and forward have no
 * click, so they keep the top-to-bottom band. Root attributes and inline styles are replaced on
 * swap, so they are set again after it.
 *
 * The wipe and the dim are CSS animations that stay paused (global.css). This loop moves them by
 * hand, and patch-field.js reads the same progress (__pfNav.f) for the dither front. A late frame
 * only advances the clock by two frames' worth, so a busy browser plays the start slowly instead
 * of skipping it, and the three parts can never drift apart. The clock starts as soon as the new
 * page's network is up ('pf:ready' from patch-field.js), before the page's other scripts and its
 * demos. Pages with no network start it on astro:page-load. 'pf:done' marks the end; demos wait
 * for it before they hydrate (client-settled.js).
 *
 * Base.astro inlines this file in the head (bundles.js wraps it for that). It is written as a
 * module with its browser pieces passed in, so tests/unit/page-clock.test.mjs can run it in Node.
 */

/** The length of a page change. The same number as FRONT_MS in patch-field.js and the pf-*
    durations in global.css. tests/unit/source.test.mjs fails if they differ. */
export const MS = 580;
/** The most one frame may advance the clock. */
export const FRAME_CAP = 34;
/** How long after a pointer release a click still counts as a pointer click. */
export const POINTER_WINDOW = 400;
/** How long a click stays the origin of the next navigation. */
export const CLICK_TTL = 1000;

/** A click counts as a pointer click only if a pointer was released just before it.
    detail === 0 marks a keyboard click in Chrome and Safari but not in Firefox. */
export const isPointerClick = (detail, now, lastUp) => detail !== 0 && now - lastUp <= POINTER_WINDOW;

/** The ring's final radius: past the farthest corner of the window, with room for its soft edge. */
export const ringMax = (x, y, w, h) =>
  Math.round(Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y)) + 160);

export function installPageClock(env) {
  env = env || {};
  var win = env.win || window, doc = env.doc || document;
  var now = env.now || function () { return performance.now(); };
  var rAF = env.raf || function (fn) { return requestAnimationFrame(fn); };
  var cAF = env.caf || function (id) { cancelAnimationFrame(id); };
  var later = env.setTimeout || function (fn, ms) { return setTimeout(fn, ms); };
  var cancel = env.clearTimeout || function (id) { clearTimeout(id); };

  var click = null, up = -1e4, goT = 0, raf = 0;

  doc.addEventListener('pointerup', function () { up = now(); }, true);
  doc.addEventListener('click', function (e) {
    var t = now();
    click = isPointerClick(e.detail, t, up) ? { x: e.clientX, y: e.clientY, t: t } : null;
  }, true);

  function apply() {
    var d = doc.documentElement, n = win.__pfNav;
    if (n && n.ring) {
      d.setAttribute('data-pf', 'ring');
      d.style.setProperty('--pf-cx', n.ring.x + 'px');
      d.style.setProperty('--pf-cy', n.ring.y + 'px');
      d.style.setProperty('--pf-max', n.ring.max + 'px');
    } else d.removeAttribute('data-pf');
  }

  doc.addEventListener('astro:before-preparation', function (e) {
    var c = click;
    click = null;
    cAF(raf);
    win.__pfNav = { ring: null, f: 0, started: false, nav: true };
    if (c && e.navigationType !== 'traverse' && now() - c.t < CLICK_TTL) {
      win.__pfNav.ring = { x: c.x, y: c.y, max: ringMax(c.x, c.y, win.innerWidth, win.innerHeight) };
    }
    apply();
  });

  function go() {
    var nav = win.__pfNav || (win.__pfNav = { ring: null });
    if (nav.started) return; // already running: a second signal must not stop it
    cancel(goT); cAF(raf);
    nav.started = true; nav.f = 0;
    // looked up every frame: the page images may not exist yet on the first one
    var find = function () {
      return (doc.getAnimations ? doc.getAnimations() : []).filter(function (a) {
        return /^pf-(ring|wipe|dim)$/.test(a.animationName || '');
      });
    };
    var finish = function () { find().forEach(function (a) { try { a.finish(); } catch (e) {} }); };
    var last = now(), el = 0;
    doc.dispatchEvent(new Event('pf:go'));
    (function tick() {
      var t = now();
      el += Math.min(FRAME_CAP, t - last); last = t;
      nav.f = Math.min(1, el / MS);
      if (nav.f < 1) {
        find().forEach(function (a) { try { a.currentTime = nav.f * MS; } catch (e) {} });
        raf = rAF(tick);
      } else {
        finish();
        later(finish, 250); // and again, in case a page image turned up late
        nav.done = true;
        doc.dispatchEvent(new Event('pf:done'));
      }
    })();
  }

  doc.addEventListener('astro:after-swap', function () {
    apply();
    cancel(goT);
    goT = later(go, 700); // never leave the page waiting
  });
  doc.addEventListener('pf:ready', function () {
    var n = win.__pfNav;
    if (n && n.nav && !n.started) go();
  });
  doc.addEventListener('astro:page-load', function () { rAF(go); });
}

if (typeof document !== 'undefined') installPageClock();
