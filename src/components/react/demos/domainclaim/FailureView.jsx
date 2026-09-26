/**
 * FailureView — the product running whichever state the StateCard shows.
 *
 *  - the product's claim screen, in its own document (DomainClaimFrame);
 *  - what the code decided: the typed result and claim state the product's check returned,
 *    tapped from its own route (shims/check-tap.ts), never written by hand.
 *
 * Every box here has a fixed height, so a new state never changes the page's height.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import DomainClaimFrame from './DomainClaimFrame.jsx';
import { SCENES } from './explorer-data.js';
import { useExplorer } from './explorer-store.js';
import useIsland from './useIsland.js';
import './domainclaim.css';

const STEP_NUM = { zone: '01', nameservers: '02', record: '03', token: '04', claim: '05' };
const clip = (s, n = 44) => (s.length > n ? `${s.slice(0, n - 15)}…${s.slice(-12)}` : s);

/** A value as the code holds it, printed the way a debugger would, long strings clipped. */
function Value({ v, depth = 0 }) {
  if (v === null || v === undefined) return <span className="dcx-k">{String(v)}</span>;
  if (v instanceof Date) return <span className="dcx-s">{`Date(${v.toISOString().slice(0, 16)}Z)`}</span>;
  if (typeof v === 'string') return <span className="dcx-s">'{clip(v)}'</span>;
  if (typeof v === 'number' || typeof v === 'boolean') return <span className="dcx-k">{String(v)}</span>;
  if (Array.isArray(v)) {
    return (
      <>
        [
        {v.map((x, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <Value v={x} depth={depth + 1} />
          </span>
        ))}
        ]
      </>
    );
  }
  const pad = '  '.repeat(depth + 1);
  return (
    <>
      {'{'}
      {Object.keys(v).map((k) => (
        <span key={k}>
          {'\n'}
          {pad}
          <span className="dcx-p">{k}</span>: <Value v={v[k]} depth={depth + 1} />
        </span>
      ))}
      {'\n'}
      {'  '.repeat(depth)}
      {'}'}
    </>
  );
}

function Decided({ run }) {
  const done = run?.events.find((e) => e.type === 'done');
  const steps = done?.view?.steps ?? run?.events.filter((e) => e.type === 'step').map((e) => e.step) ?? [];
  const d = run?.decided;
  return (
    <div className="dcx-decided">
      <pre className="dcx-code">
        {run ? (
          <>
            <span className="dcx-c">{`// check ${run.n} · checkClaim() → evaluateClaim()`}</span>
            {'\n'}
            <span className="dcx-p">result</span>: {d ? <Value v={d.result} /> : <span className="dcx-k">unavailable</span>}
          </>
        ) : (
          <span className="dcx-c">{'// waiting for the first check'}</span>
        )}
      </pre>
      <div className="dcx-line">
        <span className="dcx-lab">CLAIM</span>
        {d ? (
          <>
            <span className={`dcx-status s-${d.status}`}>{d.status}</span>
            {d.actionNeeded && <span className="dcx-flag">actionNeeded</span>}
            {d.provedButHeld && <span className="dcx-flag">provedButHeld</span>}
            {d.recovered && <span className="dcx-flag">recovered</span>}
          </>
        ) : (
          <span className="dcx-step t-idle">…</span>
        )}
      </div>
      <div className="dcx-line">
        <span className="dcx-lab">STEPS</span>
        {(steps.length ? steps : Object.keys(STEP_NUM).map((key) => ({ key, state: 'idle' }))).map((s) => (
          <span key={s.key} className={`dcx-step t-${s.state}`}>
            {STEP_NUM[s.key]} {s.state}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FailureView() {
  const frame = useRef(null);
  const root = useRef(null);
  const { index } = useExplorer();
  const [ready, setReady] = useState(false);
  const [claimId, setClaimId] = useState(null);
  const [run, setRun] = useState(null);
  useIsland(root);

  const onEvent = useCallback((e) => {
    if (e.dc === 'ready') setReady(true);
    else if (e.dc === 'opened') setClaimId(e.id);
    else if (e.dc === 'check') setRun((prev) => ({ ...e, n: prev && prev.claimId === e.claimId ? prev.n + 1 : 1 }));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const s = SCENES[index];
    setRun(null);
    setClaimId(null);
    frame.current?.send({ dc: 'open', name: s.name, heldElsewhere: s.heldElsewhere === true });
  }, [ready, index]);

  // A check for a claim the view has moved past is ignored.
  const shown = run && claimId && run.claimId === claimId ? run : null;

  return (
    <div ref={root}>
      <DemoFrame title={`DEMO_NAMES.scn · ${SCENES[index].name}`} label="live" fill={false}>
        <DomainClaimFrame ref={frame} view="app" width={960} height={600} title="DomainClaim, running the state on the card" onEvent={onEvent} />
        <section className="dcx-pane">
          <h3 className="dcx-h">WHAT THE CODE DECIDED</h3>
          <Decided run={shown} />
        </section>
      </DemoFrame>
    </div>
  );
}
