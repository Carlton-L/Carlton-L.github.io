// Puts the page where it belongs after a navigation, and keeps it there until the visitor scrolls.
//
// - A link click lands at the top. The router scrolls there, but Firefox then scrolls some pages
//   back down on its own about two seconds later, with no script asking it to (seen going
//   domainclaim → futurity-engine and futurity-engine → carlton-dev). Chrome and Safari don't.
// - Back and forward land where you were. The router restores that position the moment it swaps
//   the page in, but the patch layout is built by page scripts after the swap, so the page is still
//   short and the position gets cut off (domainclaim came back at the top). Once the page is built,
//   the saved position is applied again.
//
// For a few seconds after either, any scroll the visitor didn't make is undone. Any wheel, touch,
// key or pointer input ends the hold, so their own scrolling is never fought. Hash links are left
// alone: they scroll to their target on purpose.
//
// The page never scrolls smoothly as a whole (no `scroll-behavior: smooth` on html): the router's
// jumps and the back button's return happen at once. A link that should glide does it itself (the
// /lab index).

const HOLD_MS = 4000;
let target = null; // where the page should be, while held
let until = 0;

const release = () => {
  target = null;
};

['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) =>
  addEventListener(type, release, { capture: true, passive: true }),
);

const put = () => {
  if (target !== null && Math.abs(scrollY - target) > 1) scrollTo({ left: 0, top: target, behavior: 'instant' });
};

document.addEventListener('astro:before-preparation', (e) => {
  target = e.to.hash ? null : e.navigationType === 'traverse' ? 'saved' : 0;
  until = Infinity;
});

document.addEventListener('astro:page-load', () => {
  if (target === null) return;
  // The router has written this entry's saved position into history.state by now.
  if (target === 'saved') target = history.state?.scrollY ?? 0;
  until = performance.now() + HOLD_MS;
  put();
});

addEventListener(
  'scroll',
  () => {
    if (target === null || typeof target !== 'number') return;
    if (performance.now() > until) {
      target = null;
      return;
    }
    put();
  },
  { passive: true },
);
