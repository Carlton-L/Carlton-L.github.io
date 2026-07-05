/**
 * DemoFrame — the shared wrapper every demo island sits in.
 *
 * Renders the INNER demo chrome (title strip + honest label + reset control)
 * designed to sit flush inside a VIEW Operator's body — pair it with the
 * `.fs-viewerwrap`-style negative margin so it meets the operator edges.
 * The Astro <Operator> provides the outer patch chrome; DemoFrame never
 * duplicates it.
 *
 * Props:
 *  - title:   mono strip title, e.g. "AGENTS.scn — radial consequence map"
 *  - label:   'live' → "LIVE — real product code, synthetic data"
 *             'recreation' → "RECREATION — real behavior, portfolio-owned code"
 *             or any custom string. Every demo is honestly labeled (master plan rule).
 *  - height:  CSS height for the demo body when fill=true (default '540px')
 *  - fill:    true  → body is a fixed-height box the demo fills absolutely
 *                     (React-Flow-style demos that need a sized container);
 *             false → body sizes to its content (aspect-driven SVG demos).
 *  - onReset: optional extra reset side-effect; children always remount via key
 *  - children
 */
import { useCallback, useState, Suspense } from 'react';
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

export default function DemoFrame({ title, label = 'live', height = '540px', fill = true, onReset, children }) {
  const [epoch, setEpoch] = useState(0);

  const reset = useCallback(() => {
    setEpoch((e) => e + 1);
    onReset?.();
  }, [onReset]);

  return (
    <div className="demoframe">
      <div className="demoframe-head">
        <span className="demoframe-title">{title}</span>
        <span className="demoframe-label">{LABELS[label] ?? <span>{label}</span>}</span>
        <span className="demoframe-controls">
          <button type="button" onClick={reset} title="Reset demo">
            RESET
          </button>
        </span>
      </div>
      <div className="demoframe-body" data-fill={fill ? 'true' : 'false'} style={fill ? { height } : undefined}>
        <Suspense fallback={<div className="demoframe-skeleton">COOKING…</div>}>
          <div key={epoch} className="demoframe-mount" style={fill ? { position: 'absolute', inset: 0 } : undefined}>
            {children}
          </div>
        </Suspense>
      </div>
    </div>
  );
}
