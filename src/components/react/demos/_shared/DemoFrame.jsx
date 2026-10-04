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
import { useCallback, useState } from 'react';
import './demos.css';

const LABELS = {
  live: (
    <span>
      <b>LIVE</b>
      <span className="demoframe-long"> — REAL PRODUCT CODE, SYNTHETIC DATA</span>
    </span>
  ),
  recreation: (
    <span>
      <b>RECREATION</b>
      <span className="demoframe-long"> — REAL BEHAVIOR, PORTFOLIO-OWNED CODE</span>
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
          <button type="button" onClick={reset}>
            RESET
          </button>
        </span>
      </div>
      <div className="demoframe-body" data-fill={fill ? 'true' : 'false'} style={fill ? { height } : undefined}>
        {/* No Suspense here. Nothing in a demo suspends, and React 19 streams a large Suspense
            boundary separately with inline scripts even when nothing does. The router skips a
            script it has already run, so coming back to the page left the demo half built
            (React error #419). Loading is ViewSlot's job. */}
        <div key={epoch} className="demoframe-mount" style={fill ? { position: 'absolute', inset: 0 } : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
