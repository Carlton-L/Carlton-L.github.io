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
 * The box has its final size from the first paint (CSS aspect ratio, and a container query for the
 * phone layout), so nothing below it moves when the product arrives. Until then it shows a poster in
 * the FAST pages' COOKING VIEWER style; the product fades in once its first screen has rendered.
 * The frame mounts when the operator comes near the viewport.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SRC = '/demos/domainclaim/';

const DomainClaimFrame = forwardRef(function DomainClaimFrame(
  { view = 'app', width = 960, height = 640, phoneBelow = 720, phoneHeight = 560, fixedDesktop = false, interactive = true, title, poster, onEvent },
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

  // The sign-in demo is ready when its document says so; the app when its first claim has opened.
  const revealOn = view === 'signin' ? 'ready' : 'opened';
  useEffect(() => {
    const listen = (message) => {
      if (message.origin !== window.location.origin || message.source !== frameRef.current?.contentWindow) return;
      if (!message.data || typeof message.data.dc !== 'string') return;
      if (message.data.dc === revealOn) {
        // Two frames, so the screen the message describes has painted before it fades in.
        requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      }
      onEvent?.(message.data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, [onEvent, revealOn]);

  // The frame is same-origin, so its document can also be read directly: once the product has
  // put anything on screen, the sign-in demo is ready, whatever happened to the message. And if
  // nothing arrives at all, show whatever loaded rather than a poster forever.
  useEffect(() => {
    if (!near || shown) return undefined;
    // The sign-in demo has drawn once its island has content; the app once a claim's title is up.
    const drawn = () => {
      const doc = frameRef.current?.contentDocument;
      if (!doc) return false;
      if (view === 'signin') return (doc.querySelector('astro-island')?.childElementCount ?? 0) > 0;
      return (doc.querySelector('h1')?.textContent ?? '').trim().length > 0;
    };
    const poll = setInterval(() => {
      if (drawn()) requestAnimationFrame(() => setShown(true));
    }, 100);
    const late = setTimeout(() => setShown(true), 4000);
    return () => {
      clearInterval(poll);
      clearTimeout(late);
    };
  }, [near, shown, view]);

  const phone = !fixedDesktop && box > 0 && box < phoneBelow;
  const native = phone ? box : width;
  const scale = box > 0 ? box / native : 0;
  const nativeHeight = phone ? phoneHeight : height;

  return (
    <div className="dcf-wrap">
      <div
        ref={boxRef}
        className={`dcf${fixedDesktop ? '' : ' dcf-phoneable'}`}
        data-shown={shown ? 'true' : 'false'}
        style={{ aspectRatio: `${width} / ${height}`, '--dcf-phone-h': `${phoneHeight}px` }}
        aria-hidden={interactive ? undefined : 'true'}
      >
        <div className="dcf-poster" aria-hidden="true">
          <span className="dcf-dot" />
          {poster ?? 'COOKING VIEWER · LOADING THE PRODUCT…'}
        </div>
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
    </div>
  );
});

export default DomainClaimFrame;
