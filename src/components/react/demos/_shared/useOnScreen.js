// Whether an element is on screen (within `margin` of the viewport, tab visible). The React side of
// ViewSlot.onScreen: animations run only while this is true. See src/lib/view-slot.js.
import { useEffect, useState } from 'react';
import { onScreen } from '../../../../lib/view-slot.js';

export default function useOnScreen(ref, margin = '200px') {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    return onScreen(el, setVisible, margin);
  }, [ref, margin]);
  return visible;
}
