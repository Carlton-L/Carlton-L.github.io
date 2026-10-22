/**
 * Analytics loader. Base.astro inlines it in the head of every page (built in bundles.js).
 *
 * It decides whether PostHog may start. If it may, it loads /js/analytics.js, which waits for the
 * page to settle and does the rest. The design and its reasons are in docs/rfc/analytics.md.
 *
 *   ?notrack=1   keeps this browser out of the numbers (Carlton's own visits). Works on every host.
 *   ?notrack=0   lets it back in.
 *
 * PostHog starts on carlton.dev only, so dev, the built site on localhost and previews send nothing.
 * The ClientRouter runs a head script once per visit; window.__posthog_initialized makes sure of it.
 */
var SRC = '/js/analytics.js'; // @src

export function installAnalyticsLoader({ win = window, doc = document, src = SRC } = {}) {
  var off = false;
  try {
    var m = /[?&]notrack=([01])(?:&|#|$)/.exec(win.location.search);
    if (m && m[1] === '1') win.localStorage.setItem('notrack', '1');
    if (m && m[1] === '0') win.localStorage.removeItem('notrack');
    off = win.localStorage.getItem('notrack') === '1';
  } catch (e) {} // storage blocked: the flag can't be read, so the visit counts
  if (off || win.location.hostname !== 'carlton.dev' || win.__posthog_initialized) return false;
  win.__posthog_initialized = true;
  var s = doc.createElement('script');
  s.src = src;
  s.async = true;
  doc.head.appendChild(s);
  return true;
}

if (typeof document !== 'undefined') installAnalyticsLoader();
