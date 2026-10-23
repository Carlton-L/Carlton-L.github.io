/**
 * Analytics loader. Base.astro inlines it in the head of every page (built in bundles.js).
 *
 * It puts the visitor's answer to the recording question on <html> as data-rec (ask | yes | no)
 * before the first paint, so the operator and the REC chip (Navigation.astro) never flash. Then it
 * loads /js/rec.js, which runs them and, where PostHog may start, waits for the page to settle
 * and starts it. The design and its reasons are in docs/rfc/analytics.md.
 *
 *   ?notrack=1   keeps this browser out of the numbers (Carlton's own visits). Works on every host.
 *   ?notrack=0   lets it back in.
 *
 * PostHog starts on carlton.dev only, so dev, the built site on localhost and previews send nothing.
 * The question is asked on every host. The ClientRouter runs a head script once per visit;
 * window.__rec makes sure of it. window.__posthog_initialized says whether PostHog starts.
 */
var SRC = '/js/rec.js'; // @src

export function installAnalyticsLoader({ win = window, doc = document, src = SRC } = {}) {
  var off = false, rec = null;
  try {
    var m = /[?&]notrack=([01])(?:&|#|$)/.exec(win.location.search);
    if (m && m[1] === '1') win.localStorage.setItem('notrack', '1');
    if (m && m[1] === '0') win.localStorage.removeItem('notrack');
    off = win.localStorage.getItem('notrack') === '1';
    rec = win.localStorage.getItem('rec-consent');
  } catch (e) {} // storage blocked: the flag can't be read, so the visit counts, and the question is asked
  if (win.__rec) return false;
  win.__rec = rec === 'yes' || rec === 'no' ? rec : 'ask';
  // The ClientRouter replaces <html>'s attributes on a page change, so the answer goes back after it
  var mark = function () { doc.documentElement.setAttribute('data-rec', win.__rec); };
  mark();
  doc.addEventListener('astro:after-swap', mark);
  win.__posthog_initialized = !off && win.location.hostname === 'carlton.dev';
  var s = doc.createElement('script');
  s.src = src;
  s.async = true;
  doc.head.appendChild(s);
  return win.__posthog_initialized;
}

if (typeof document !== 'undefined') installAnalyticsLoader();
