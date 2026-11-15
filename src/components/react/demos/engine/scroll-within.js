/**
 * Scroll an element into view inside its own scrolling box only (the report's .rdoc, a panel).
 *
 * Element.scrollIntoView() scrolls every scrollable ancestor, and when the element is in an
 * iframe that includes the page around the frame: the Engine hero's tour moved the whole case
 * study each time it opened a report section. This sets the nearest scrolling box's scrollTop
 * and nothing else. (scrollIntoView's `container: 'nearest'` does the same, but Firefox lacks it.)
 *
 *   scrollWithin(section, { block: 'center' })
 *   scrollWithin(heading, { block: 'start', behavior: 'smooth' })
 *
 * Works on an element in another same-origin document (the hero reaches into the demo's frame).
 */
export default function scrollWithin(el, { block = 'start', behavior = 'auto' } = {}) {
  if (!el) return;
  const win = el.ownerDocument.defaultView;
  let box = el.parentElement;
  while (box && box !== el.ownerDocument.documentElement) {
    const oy = win.getComputedStyle(box).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  const offsetFor = (h) => (block === 'center' ? (h - el.offsetHeight) / 2 : 0);
  if (!box || box === el.ownerDocument.documentElement) {
    // No inner box (the demo's phone layout scrolls its whole document): scroll the element's own
    // window. In a frame that is the frame's document; the page around it never moves.
    const top = el.getBoundingClientRect().top + win.scrollY;
    win.scrollTo({ top: Math.max(0, Math.round(top - offsetFor(win.innerHeight))), behavior });
    return;
  }
  const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  box.scrollTo({ top: Math.max(0, Math.round(top - offsetFor(box.clientHeight))), behavior });
}
