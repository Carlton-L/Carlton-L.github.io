/**
 * Analytics: PostHog, EU region, and the recording question. The loader in the head
 * (analytics-loader.js) brings this file in on every host, once per visit. The design and its
 * reasons are in docs/rfc/analytics.md; the operator and chip follow docs/prototypes/consent-operator.html.
 *
 * - The recording question (the operator and the REC chip in Navigation.astro) works on every host.
 *   The answer is kept in localStorage as rec-consent and shown on <html> as data-rec.
 * - PostHog starts only where the loader allows it (window.__posthog_initialized: carlton.dev,
 *   without ?notrack). The library comes from PostHog's CDN once the page change has finished and
 *   the browser is idle, so it never costs a page change frames.
 * - Until a visitor answers, PostHog counts the visit without cookies or storage
 *   (cookieless_mode 'on_reject' with opt_out_capturing_by_default). Yes opts in and records.
 *   No opts out, which still counts the visit without cookies.
 * - track(name, props) is the only way to send a custom event. It does nothing when PostHog isn't
 *   there, so a page never breaks for it. Calls made before the library arrives wait for it.
 * - Every event carries the mode, PATCH or READ, as a registered property.
 */
(function () {
  if (window.track) return;

  const TOKEN = 'phc_uSej8gSS7uLzRmbrvf2nWtRSgAKX879Yfsd7MyN3vsWL'; // public by design (RFC)
  const LIB = 'https://eu-assets.i.posthog.com/static/array.js';
  const ON = !!window.__posthog_initialized;

  const mode = () => (document.body.classList.contains('perform') ? 'READ' : 'PATCH');
  const loaded = () => window.posthog && window.posthog.__loaded;

  const waiting = [];
  window.track = (name, props) => {
    if (!ON) return;
    if (loaded()) window.posthog.capture(name, props);
    else if (waiting.length < 50) waiting.push([name, props]);
  };

  // The answer, passed to PostHog. Called on an answer and again when the library has loaded.
  function consent(ph) {
    if (!ph) return;
    const status = ph.get_explicit_consent_status();
    if (window.__rec === 'yes') {
      if (status !== 'granted') ph.opt_in_capturing();
      if (!ph.sessionRecordingStarted()) ph.startSessionRecording();
    } else if (window.__rec === 'no') {
      if (status !== 'denied') ph.opt_out_capturing();
      ph.stopSessionRecording();
    }
  }

  /* ---------- the recording question ---------- */

  const LABEL = {
    ask: 'Recording: not answered yet',
    yes: 'Recording. Click to change',
    no: 'Not recording. Click to change',
  };
  const PHONE = window.matchMedia('(max-width: 639px)'); // Navigation.astro's phone layout
  const op = () => document.getElementById('recOp');
  const chip = () => document.getElementById('recChip');

  function show(answer) {
    window.__rec = answer;
    document.documentElement.setAttribute('data-rec', answer);
    const c = chip();
    if (c) c.setAttribute('aria-label', LABEL[answer]);
  }

  // Runs a CSS animation class once. animationend, with a timeout in case it never comes.
  function play(el, cls, ms, done) {
    let over = false;
    const end = () => {
      if (over) return;
      over = true;
      el.classList.remove(cls);
      if (done) done();
    };
    el.classList.add(cls);
    el.addEventListener('animationend', end, { once: true });
    setTimeout(end, ms);
  }

  // Drop and fade. The operator is display:none afterwards (Navigation.astro).
  function leave(el) {
    el.classList.remove('open');
    play(el, 'leave', 300, () => el.classList.remove('anchored'));
    const c = chip();
    if (c) c.focus();
  }

  // Under the chip, right edges lined up: always in PATCH, and when reopened in READ. One measurement.
  function place() {
    const el = op(), c = chip();
    if (!el || !c || PHONE.matches) return;
    el.style.setProperty('--ar', document.documentElement.clientWidth - c.getBoundingClientRect().right + 'px');
  }

  function answer(a) {
    show(a);
    try { localStorage.setItem('rec-consent', a); } catch (e) {}
    if (loaded()) consent(window.posthog);
    window.track('consent_answered', { answer: a });
    const el = op();
    if (el) leave(el);
  }

  function onChip() {
    const el = op();
    if (!el || el.classList.contains('leave')) return;
    if (window.__rec === 'ask') { // no answer yet: point at the operator
      el.classList.add('nudge');
      setTimeout(() => el.classList.remove('nudge'), 600);
      return;
    }
    if (el.classList.contains('open')) { leave(el); return; }
    el.classList.add('open', 'anchored');
    place();
    play(el, 'arrive', 280);
    const cur = el.querySelector('[data-rec-a="' + window.__rec + '"]');
    if (cur) cur.focus();
  }

  // Delegated: both live in the persisted header and operator, but a page can bring a new copy
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#recChip, [data-rec-a]');
    if (!t) return;
    if (t.id === 'recChip') onChip();
    else answer(t.dataset.recA);
  });
  document.addEventListener('keydown', (e) => {
    const el = op();
    if (e.key === 'Escape' && el && el.classList.contains('open')) leave(el);
  });
  window.addEventListener('resize', place);
  document.addEventListener('patchmode', place); // the chip moves when PATCH / READ changes
  const ready = () => {
    show(window.__rec || 'ask');
    place();
    const el = op();
    if (window.__rec === 'ask' && el && !el.classList.contains('in')) { // the first page of the visit
      setTimeout(() => { // half a second after the page, so it doesn't arrive with it
        el.classList.add('in');
        play(el, 'enter', 300);
      }, 500);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();

  if (!ON) return;

  /* ---------- PostHog ---------- */

  // Navigation.astro dispatches 'patchmode' whenever it applies a mode, a page change included
  document.addEventListener('patchmode', () => { if (loaded()) window.posthog.register({ mode: mode() }); });

  const OPTIONS = {
    api_host: 'https://eu.i.posthog.com',
    // Pinned. From '2026-06-25' the defaults stream network bodies into replays, and the contact
    // form's request must never reach one: set session_recording.streamNetworkBody to false first.
    defaults: '2026-05-30',
    capture_pageview: 'history_change',
    cookieless_mode: 'on_reject',
    opt_out_capturing_by_default: true,
    autocapture: true,
    capture_exceptions: true,
    capture_dead_clicks: true,
    capture_performance: true,
    capture_heatmaps: false,
    session_recording: { maskAllInputs: true, captureCanvas: { recordCanvas: false } },
    loaded: (ph) => {
      ph.register({ mode: mode() });
      consent(ph);
      for (const [name, props] of waiting.splice(0)) ph.capture(name, props);
    },
  };

  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));

  // After the page change (page-clock.js), then an idle moment: the same wait as client:settled.
  const whenSettled = (fn) => {
    const nav = window.__pfNav;
    if (nav && nav.done) return idle(fn);
    let called = false;
    const go = () => {
      if (called) return;
      called = true;
      document.removeEventListener('pf:done', go);
      idle(fn);
    };
    document.addEventListener('pf:done', go);
    setTimeout(go, 3000); // never wait for ever
  };

  whenSettled(() => {
    const s = document.createElement('script');
    s.src = LIB;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => { if (window.posthog && !loaded()) window.posthog.init(TOKEN, OPTIONS); };
    document.head.appendChild(s);
  });
})();
