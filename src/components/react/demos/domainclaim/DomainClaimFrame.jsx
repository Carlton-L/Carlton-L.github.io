/**
 * DomainClaimFrame — the product, running in its own document, scaled to fit a VIEW operator.
 *
 * The document is /demos/domainclaim/ (src/pages/demos/domainclaim.astro): the product's own
 * screens and route handlers, with its stylesheet and nothing of the site's. A frame gives it a
 * window of its own, so its media queries and its page scroll behave as they do in production.
 *
 * Wide containers draw the product at `width` (a laptop) and scale it down, the way the product's
 * own home page shows its demo. Below `phoneBelow` it draws at the container's real width, so the
 * product's phone rules apply instead of a shrunken laptop. `fixedDesktop` keeps the laptop view
 * at every size (the sign-in demo, which is a picture of the app on a laptop).
 *
 * Mounts only when the operator comes near the viewport.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SRC = '/demos/domainclaim/';

const DomainClaimFrame = forwardRef(function DomainClaimFrame(
  { view = 'app', width = 960, height = 640, phoneBelow = 720, phoneHeight = 560, fixedDesktop = false, interactive = true, title, onEvent },
  ref,
) {
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const [box, setBox] = useState(0);
  const [near, setNear] = useState(false);

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

  useEffect(() => {
    if (!onEvent) return undefined;
    const listen = (message) => {
      if (message.origin !== window.location.origin || message.source !== frameRef.current?.contentWindow) return;
      if (message.data && typeof message.data.dc === 'string') onEvent(message.data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [onEvent]);

  const phone = !fixedDesktop && box > 0 && box < phoneBelow;
  const native = phone ? box : width;
  const scale = box > 0 ? box / native : 0;
  const nativeHeight = phone ? phoneHeight : height;

  return (
    <div
      ref={boxRef}
      className="dcf"
      style={{ height: scale === 0 ? undefined : Math.round(nativeHeight * scale) }}
      aria-hidden={interactive ? undefined : 'true'}
    >
      {near && scale > 0 && (
        <iframe
          ref={frameRef}
          src={`${SRC}${view === 'signin' ? '?view=signin' : ''}`}
          title={title}
          width={native}
          height={nativeHeight}
          tabIndex={interactive ? undefined : -1}
          className="dcf-frame"
          style={{ transform: `scale(${scale})`, pointerEvents: interactive ? 'auto' : 'none' }}
        />
      )}
    </div>
  );
});

export default DomainClaimFrame;
