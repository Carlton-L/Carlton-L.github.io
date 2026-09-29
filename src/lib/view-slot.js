// ViewSlot runtime: when a slot's content is ready, and whether an element is on screen.
// Used by ViewSlot.astro (loading) and by every demo that animates (pausing). See ViewSlot.astro.

const FALLBACK_MS = 4000;

const markReady = (slot) => {
  if (!slot || slot.dataset.ready === 'true') return;
  // Two frames, so what the content drew has painted before the poster fades.
  requestAnimationFrame(() => requestAnimationFrame(() => (slot.dataset.ready = 'true')));
};

/** Tells the slot around `el` that its content is ready. `el` can be anything inside the slot. */
export const ready = (el) => markReady(el?.closest?.('[data-vslot]'));

const watch = (slot) => {
  if (slot.dataset.watched) return;
  slot.dataset.watched = 'true';
  slot.addEventListener('view:ready', () => markReady(slot));
  // The fallback clock starts when the slot comes near the screen, since that's when lazy content
  // starts loading. Before then there's nothing to fall back from.
  let fallback = null;
  const near = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    near.disconnect();
    fallback = setTimeout(() => markReady(slot), FALLBACK_MS);
  }, { rootMargin: '600px 0px' });
  near.observe(slot);
  if (slot.dataset.wait === 'event') return;
  // Islands: ready once every island inside has hydrated (Astro removes `ssr` when it has).
  const islands = () => [...slot.querySelectorAll('astro-island')];
  const done = () => islands().length > 0 && islands().every((i) => !i.hasAttribute('ssr'));
  if (done()) {
    clearTimeout(fallback);
    markReady(slot);
    return;
  }
  const mo = new MutationObserver(() => {
    if (done()) {
      mo.disconnect();
      clearTimeout(fallback);
      markReady(slot);
    }
  });
  mo.observe(slot, { attributes: true, attributeFilter: ['ssr'], subtree: true, childList: true });
  // A slot with no island at all and no event to wait for is ready as it is.
  if (islands().length === 0) markReady(slot);
};

export const scanViewSlots = () => {
  document.querySelectorAll('[data-vslot]').forEach(watch);
};

/**
 * Calls `fn(true)` while `el` is within `margin` of the viewport and the tab is visible, `fn(false)`
 * otherwise. The rule itself lives in the patch runtime (`Patch.onScreen`), so vanilla page scripts
 * and React demos pause the same way. Returns a function that stops watching.
 */
export const onScreen = (el, fn, margin = '200px') => {
  if (typeof window !== 'undefined' && window.Patch?.onScreen) return window.Patch.onScreen(el, fn, margin);
  fn(true);
  return () => {};
};

if (typeof window !== 'undefined') {
  window.ViewSlot = { ready, onScreen, scan: scanViewSlots };
}
