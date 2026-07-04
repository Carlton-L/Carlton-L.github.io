/**
 * DemoFrame — the shared wrapper every demo island sits in.
 *
 * Renders the INNER demo chrome (title strip + honest label + reset/fullscreen
 * controls) designed to sit flush inside a VIEW Operator's body — pair it with
 * the `.fs-viewerwrap`-style negative margin so it meets the operator edges.
 * The Astro <Operator> provides the outer patch chrome; DemoFrame never
 * duplicates it.
 *
 * Props:
 *  - title:   mono strip title, e.g. "OCEAN.scn — radial consequence map"
 *  - label:   'live' → "LIVE — real product code, synthetic data"
 *             'recreation' → "RECREATION — real behavior, portfolio-owned code"
 *             or any custom string. Every demo is honestly labeled (master plan rule).
 *  - height:  CSS height for the demo body (default '540px')
 *  - onReset: optional extra reset side-effect; children always remount via key
 *  - children
 */
import { useCallback, useRef, useState, Suspense } from 'react';
import './demos.css';

const LABELS = {
  live: (
    <span>
      <b>LIVE</b> — REAL PRODUCT CODE, SYNTHETIC DATA
    </span>
  ),
  recreation: (
    <span>
      <b>RECREATION</b> — REAL BEHAVIOR, PORTFOLIO-OWNED CODE
    </span>
  ),
};

export default function DemoFrame({ title, label = 'live', height = '540px', onReset, children }) {
  const [epoch, setEpoch] = useState(0);
  const frameRef = useRef(null);

  const reset = useCallback(() => {
    setEpoch((e) => e + 1);
    onReset?.();
  }, [onReset]);

  const fullscreen = useCallback(() => {
    const el = frameRef.current;
    if (!el || !document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  }, []);

  return (
    <div className="demoframe" ref={frameRef}>
      <div className="demoframe-head">
        <span className="demoframe-title">{title}</span>
        <span className="demoframe-label">{LABELS[label] ?? <span>{label}</span>}</span>
        <span className="demoframe-controls">
          <button type="button" onClick={reset} title="Reset demo">
            RESET
          </button>
          <button type="button" onClick={fullscreen} title="Toggle fullscreen">
            FULL
          </button>
        </span>
      </div>
      <div className="demoframe-body" style={{ height }}>
        <Suspense fallback={<div className="demoframe-skeleton">COOKING…</div>}>
          <div key={epoch} style={{ position: 'absolute', inset: 0 }}>
            {children}
          </div>
        </Suspense>
      </div>
    </div>
  );
}
