/** Wires an island's root into the explorer store: hover and focus pause the loop, and the loop
 *  runs only while one of the islands is on screen. */
import { useEffect } from 'react';
import { seen, touch } from './explorer-store.js';

export default function useIsland(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let visible = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting !== visible) {
        visible = entry.isIntersecting;
        seen(visible);
      }
    });
    io.observe(el);
    const enter = () => touch(true);
    const leave = () => touch(false);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
    return () => {
      io.disconnect();
      if (visible) seen(false);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('focusin', enter);
      el.removeEventListener('focusout', leave);
    };
  }, [ref]);
}
