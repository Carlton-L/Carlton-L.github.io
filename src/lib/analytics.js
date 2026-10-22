/**
 * Analytics: PostHog, EU region. The loader in the head (analytics-loader.js) brings this file in
 * on carlton.dev only, once per visit. The design and its reasons are in docs/rfc/analytics.md.
 *
 * - The library comes from PostHog's CDN once the page change has finished and the browser is
 *   idle, so it never costs a page change frames.
 * - Until a visitor answers, PostHog counts the visit without cookies or storage
 *   (cookieless_mode 'on_reject' with opt_out_capturing_by_default).
 * - track(name, props) is the only way to send a custom event. It does nothing when PostHog isn't
 *   there, so a page never breaks for it. Calls made before the library arrives wait for it.
 * - Every event carries the mode, PATCH or READ, as a registered property.
 */
(function () {
  if (window.track) return;

  const TOKEN = '__POSTHOG_TOKEN__'; // public by design (RFC)
  const LIB = 'https://eu-assets.i.posthog.com/static/array.js';

  const mode = () => (document.body.classList.contains('perform') ? 'READ' : 'PATCH');
  const loaded = () => window.posthog && window.posthog.__loaded;

  const waiting = [];
  window.track = (name, props) => {
    if (loaded()) window.posthog.capture(name, props);
    else if (waiting.length < 50) waiting.push([name, props]);
  };

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
