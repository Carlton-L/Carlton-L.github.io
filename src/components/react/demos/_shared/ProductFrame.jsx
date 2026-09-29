/**
 * ProductFrame — a product running in a document of its own, scaled to fit a VIEW.
 *
 * For ports that run the product's real code (docs/DEMO_PORTING.md): the product reads the window
 * (media queries, page scroll, sticky headers), so it gets a window of its own at the width it is
 * drawn at. Wide containers draw it at `width` (a laptop) and scale it down. Below `phoneBelow` it
 * draws at the container's real width, so the product's phone rules apply (the CSS side of that
 * switch is fixed at 720px in demos.css, so keep `phoneBelow` at 720 or add a matching rule). `fixedDesktop` keeps the
 * laptop view at every size (a demo that is a picture of the app on a laptop).
 *
 * Loading follows the ViewSlot contract (src/components/ViewSlot.astro). The box has its final size
 * from the first paint (aspect ratio, and a container query for the phone height). Put it in a
 * `<ViewSlot wait="event">`: once the product has drawn, the frame dispatches `view:ready` and the
 * slot fades it in. "Drawn" is the product's `revealOn` message, or `drawn(doc)` returning true on
 * the frame's own document (same origin), whichever comes first.
 *
 * Talks to the product with postMessage, same origin only: `ref.current.send(command)` in, and
 * `onEvent(data)` for every message out. The frame mounts when it comes within 400px of the screen,
 * and never moves in the DOM afterwards (moving an iframe reloads it).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const ProductFrame = forwardRef(function ProductFrame(
  {
    src,
    width = 960,
    height = 640,
    phoneBelow = 720,
    phoneHeight = 560,
    fixedDesktop = false,
    interactive = true,
    title,
    revealOn = 'ready',
    messageKey = 'dc',
    drawn,
    onEvent,
  },
  ref,
) {
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const [box, setBox] = useState(0);
  const [near, setNear] = useState(false);
  const [shown, setShown] = useState(false);

  useImperativeHandle(ref, () => ({
    send: (command) => frameRef.current?.contentWindow?.postMessage(command, window.location.origin),
  }));

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setBox(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Tell the ViewSlot around us, once.
  useEffect(() => {
    if (shown) boxRef.current?.dispatchEvent(new CustomEvent('view:ready', { bubbles: true }));
  }, [shown]);

  useEffect(() => {
    const listen = (message) => {
      if (message.origin !== window.location.origin || message.source !== frameRef.current?.contentWindow) return;
      const data = message.data;
      if (!data || typeof data[messageKey] !== 'string') return;
      if (data[messageKey] === revealOn) setShown(true);
      onEvent?.(data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [onEvent, revealOn, messageKey]);

  // The same answer read straight from the frame's document, whatever happened to the message.
  useEffect(() => {
    if (!near || shown || !drawn) return undefined;
    const poll = setInterval(() => {
      const doc = frameRef.current?.contentDocument;
      if (doc && drawn(doc)) setShown(true);
    }, 100);
    return () => clearInterval(poll);
  }, [near, shown, drawn]);

  const phone = !fixedDesktop && box > 0 && box < phoneBelow;
  const native = phone ? box : width;
  const scale = box > 0 ? box / native : 0;
  const nativeHeight = phone ? phoneHeight : height;

  return (
    <div className="pframe-wrap">
      <div
        ref={boxRef}
        className={`pframe${fixedDesktop ? '' : ' pframe-phoneable'}`}
        style={{ aspectRatio: `${width} / ${height}`, '--pframe-phone-h': `${phoneHeight}px` }}
        aria-hidden={interactive ? undefined : 'true'}
      >
        {near && scale > 0 && (
          <iframe
            ref={frameRef}
            src={src}
            title={title}
            width={native}
            height={nativeHeight}
            tabIndex={interactive ? undefined : -1}
            className="pframe-frame"
            style={{ transform: `scale(${scale})`, pointerEvents: interactive ? 'auto' : 'none' }}
          />
        )}
      </div>
    </div>
  );
});

export default ProductFrame;
