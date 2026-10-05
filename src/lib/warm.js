/**
 * warm: fetch the next page, and its stylesheets, before the click.
 *
 * A page change cannot start until the new page and its stylesheets are in hand. This puts both in
 * the browser's cache early, so the click finds them there. It replaces Astro's prefetch, which
 * fetches the page only and fetches each page once.
 *
 *   hover or focus a link    after 80ms
 *   press or touch a link    at once
 *   <a data-warm>            as soon as the page is idle (the nav routes)
 *
 * GitHub Pages lets the browser keep a page for 10 minutes. A page fetched more than 5 minutes ago
 * is fetched again on the next hover, so a tab left open does not pay for it at the click.
 * Nothing is fetched on a data-saver or 2G connection, except on a press or touch.
 *
 * Base.astro imports this file. Its browser pieces are passed in, so
 * tests/unit/warm.test.mjs can run it in Node.
 */

/** A page fetched longer ago than this is fetched again. Half of the 10 minutes GitHub Pages allows. */
export const FRESH_MS = 5 * 60 * 1000;
/** How long the pointer rests on a link before the fetch starts. */
export const HOVER_MS = 80;

/** The stylesheets a page links to, in order, without repeats. It reads the whole page: this file
    is inlined in every page, so the page's own text cannot be searched for where its head ends. */
export function stylesheetsIn(html) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (!/\brel\s*=\s*["']?stylesheet["'\s>]/i.test(tag)) continue;
    const href = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const url = href && (href[1] || href[2] || href[3] || '').replace(/&amp;/g, '&');
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}

/** The page a link leads to, as a URL to fetch, or null if it is not one of this site's other pages. */
export function pageFor(a, loc) {
  if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return null;
  let url;
  try { url = new URL(a.href, loc.href); } catch (e) { return null; }
  if (!/^https?:$/.test(url.protocol) || url.origin !== loc.origin) return null;
  if (url.pathname === loc.pathname && url.search === loc.search) return null;
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return null; // a file, not a page
  return url.origin + url.pathname + url.search;
}

export function installWarm(env) {
  env = env || {};
  const win = env.win || window, doc = env.doc || document;
  const now = env.now || (() => performance.now());
  const get = env.fetch || ((url, init) => fetch(url, init));
  const later = env.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const cancel = env.clearTimeout || ((id) => clearTimeout(id));
  const idle = env.idle || ((fn) => ('requestIdleCallback' in win ? win.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300)));

  const fetched = new Map(); // url -> when

  const slow = () => {
    const c = win.navigator.connection;
    return !!c && (c.saveData || /2g/.test(c.effectiveType || ''));
  };

  function warm(url, pressed) {
    if (!url || win.navigator.onLine === false || (slow() && !pressed)) return;
    const at = fetched.get(url);
    if (at != null && now() - at < FRESH_MS) return;
    fetched.set(url, now());
    Promise.resolve(get(url, { priority: 'low' }))
      .then((r) => (r.ok && /html/.test(r.headers.get('content-type') || '') ? r.text() : ''))
      .then((html) => {
        for (const href of stylesheetsIn(html)) {
          const css = new URL(href, url).href;
          const here = [...doc.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === css);
          if (!here) Promise.resolve(get(css, { priority: 'low' })).catch(() => {});
        }
      })
      .catch(() => { fetched.delete(url); });
  }

  const linkAt = (e) => (e.target && e.target.closest ? e.target.closest('a[href]') : null);

  let timer = 0, over = null;
  const rest = (e) => {
    const a = linkAt(e);
    if (a === over) return;
    cancel(timer);
    over = a;
    const url = pageFor(a, win.location);
    if (url) timer = later(() => warm(url), HOVER_MS);
  };
  const leave = (e) => {
    if (!over || (e.relatedTarget && over.contains(e.relatedTarget))) return;
    cancel(timer);
    over = null;
  };
  const press = (e) => warm(pageFor(linkAt(e), win.location), true);

  doc.addEventListener('mouseover', rest, { passive: true });
  doc.addEventListener('mouseout', leave, { passive: true });
  doc.addEventListener('focusin', rest, { passive: true });
  doc.addEventListener('focusout', leave, { passive: true });
  doc.addEventListener('mousedown', press, { passive: true, capture: true });
  doc.addEventListener('touchstart', press, { passive: true, capture: true });

  const marked = () => idle(() => {
    for (const a of doc.querySelectorAll('a[data-warm]')) warm(pageFor(a, win.location));
  });
  doc.addEventListener('astro:page-load', marked);

  return { warm };
}

if (typeof document !== 'undefined') installWarm();
