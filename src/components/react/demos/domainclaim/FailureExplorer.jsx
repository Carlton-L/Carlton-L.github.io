/**
 * FailureExplorer — pick a demo name, and the product runs it.
 *
 * Three panes from one run:
 *  1. what the person sees: the product's claim screen, in its own document (DomainClaimFrame);
 *  2. what the code decided: the typed result and claim state the product's check returned,
 *     tapped from its own route (shims/check-tap.ts), never written by hand;
 *  3. where it came from: portfolio copy (explorer-data.js).
 *
 * Plays through the scenes on its own after a quiet spell. A pick, a hover or focus inside pauses
 * it; it picks up again after a longer quiet spell. Reduced motion: no loop.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import DomainClaimFrame from './DomainClaimFrame.jsx';
import { GROUPS, SCENES } from './explorer-data.js';
import './domainclaim.css';

const DWELL_MS = 8000;
const AFTER_PICK_MS = 20000;
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
        [{v.map((x, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <Value v={x} depth={depth + 1} />
          </span>
        ))}]
      </>
    );
  }
  const keys = Object.keys(v);
  const pad = '  '.repeat(depth + 1);
  return (
    <>
      {'{'}
      {keys.map((k) => (
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

function Decided({ run, scene }) {
  if (!run) {
    return <div className="dcx-wait">Waiting for the first check on {scene.name}</div>;
  }
  const done = run.events.find((e) => e.type === 'done');
  const steps = done?.view?.steps ?? run.events.filter((e) => e.type === 'step').map((e) => e.step);
  const d = run.decided;
  return (
    <>
      <pre className="dcx-code">
        <span className="dcx-c">{`// check ${run.n} · checkClaim() → evaluateClaim()`}</span>
        {'\n'}
        <span className="dcx-p">result</span>: {d ? <Value v={d.result} /> : <span className="dcx-k">unavailable</span>}
      </pre>
      {d && (
        <div className="dcx-line">
          <span className="dcx-lab">CLAIM</span>
          <span className={`dcx-status s-${d.status}`}>{d.status}</span>
          {d.actionNeeded && <span className="dcx-flag">actionNeeded</span>}
          {d.provedButHeld && <span className="dcx-flag">provedButHeld</span>}
          {d.recovered && <span className="dcx-flag">recovered</span>}
        </div>
      )}
      <div className="dcx-line">
        <span className="dcx-lab">STEPS</span>
        {steps.map((s) => (
          <span key={s.key} className={`dcx-step t-${s.state}`}>
            {STEP_NUM[s.key]} {s.state}
          </span>
        ))}
      </div>
    </>
  );
}

export default function FailureExplorer() {
  const frame = useRef(null);
  const root = useRef(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [claimId, setClaimId] = useState(null);
  const [run, setRun] = useState(null);
  const [auto, setAuto] = useState(true);
  const clock = useRef({ openedAt: 0, touchedAt: 0, picked: false, inside: false, visible: false });
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const scene = SCENES[index];

  const open = useCallback((i, picked) => {
    const s = SCENES[i];
    indexRef.current = i;
    setIndex(i);
    setRun(null);
    setClaimId(null);
    clock.current.openedAt = Date.now();
    clock.current.picked = picked;
    if (picked) clock.current.touchedAt = Date.now();
    frame.current?.send({ dc: 'open', name: s.name, heldElsewhere: s.heldElsewhere === true });
  }, []);

  const onEvent = useCallback(
    (e) => {
      if (e.dc === 'ready') {
        setReady(true);
        open(0, false);
      } else if (e.dc === 'opened') {
        setClaimId(e.id);
      } else if (e.dc === 'check') {
        setRun((prev) => (e.claimId === (prev?.claimId ?? e.claimId) ? { ...e, n: (prev?.n ?? 0) + 1 } : prev));
      }
    },
    [open],
  );

  // A check for a claim the explorer has moved past is ignored.
  const shown = run && claimId && run.claimId === claimId ? run : null;

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      clock.current.visible = entry.isIntersecting;
    });
    io.observe(el);
    const touch = () => {
      clock.current.touchedAt = Date.now();
    };
    const enter = () => {
      clock.current.inside = true;
      touch();
    };
    const leave = () => {
      clock.current.inside = false;
      touch();
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
    const tick = setInterval(() => {
      const c = clock.current;
      const now = Date.now();
      const paused = reduced || c.inside || !c.visible || document.hidden;
      setAuto(!paused);
      if (!ready || paused) return;
      const dwell = c.picked ? AFTER_PICK_MS : DWELL_MS;
      if (now - c.openedAt > dwell && now - c.touchedAt > DWELL_MS) {
        open((indexRef.current + 1) % SCENES.length, false);
      }
    }, 500);
    return () => {
      io.disconnect();
      clearInterval(tick);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('focusin', enter);
      el.removeEventListener('focusout', leave);
    };
  }, [open, ready, reduced]);

  return (
    <DemoFrame title="DEMO_NAMES.scn · pick a failure" label="live" fill={false}>
      <div className="dcx" ref={root}>
        <div className="dcx-picker" role="group" aria-label="Demo names">
          {GROUPS.map((g) => (
            <div key={g.move} className={`dcx-group m-${g.move}`}>
              <span className="dcx-glab">{g.label}</span>
              <div className="dcx-chips">
                {SCENES.map((s, i) =>
                  s.move === g.move ? (
                    <button
                      key={s.id}
                      type="button"
                      className="dcx-chip"
                      aria-pressed={i === index}
                      disabled={!ready}
                      onClick={() => open(i, true)}
                    >
                      {s.label ? `${s.name} · ${s.label}` : s.name}
                    </button>
                  ) : null,
                )}
              </div>
            </div>
          ))}
          <span className="dcx-auto" aria-live="off">
            {reduced ? 'PICK A NAME' : auto ? 'PLAYING THROUGH ▸' : 'PAUSED'}
          </span>
        </div>

        <DomainClaimFrame ref={frame} view="app" width={960} height={600} title="DomainClaim, running the demo name you pick" onEvent={onEvent} />

        <div className="dcx-panes">
          <section className="dcx-pane">
            <h3 className="dcx-h">WHAT THE CODE DECIDED</h3>
            <Decided run={shown} scene={scene} />
          </section>
          <section className="dcx-pane">
            <h3 className="dcx-h">WHERE IT CAME FROM</h3>
            <div className="dcx-name">{scene.name}{scene.label ? ` · ${scene.label}` : ''}</div>
            <div className="dcx-from">{scene.from}</div>
            {scene.source && <div className="dcx-src">{scene.source}</div>}
            <div className="dcx-tests">
              <span className="dcx-lab">TESTS</span> {scene.tests}
            </div>
          </section>
        </div>
      </div>
    </DemoFrame>
  );
}
