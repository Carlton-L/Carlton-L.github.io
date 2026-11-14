/**
 * EngineWorkflowView — the case study's workflow demo: the ported Engine Blocks prototype in its own
 * document (/demos/engine/, ProductFrame), drawn at 1100 × 780 and scaled to the VIEW (wider made the
 * board's text too small once scaled). On phones it draws at the real width, 960 tall.
 *
 * Above the frame sits the portfolio's replay player: play / pause / replay, a scrubber with the run's
 * marked moments, End. It is portfolio chrome, not Engine UI (decided 2026-11-14): the Engine never
 * replays a run, so the controls live outside its frame. It drives the demo by postMessage and reads
 * the replay back (FrameEntry.jsx). During the hold at the crash it shows the recorded retry's
 * countdown in place of nothing.
 *
 * Every box here has a fixed height, so nothing the visitor does changes the page's height. A
 * RECREATION on a made-up run (the Engine is recreation-only).
 */
import { useCallback, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import ProductFrame from '../_shared/ProductFrame.jsx';
import './player.css';

const fmt = (t) => `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s`;
const STEPS = 1000;

function Player({ run, send }) {
  const ready = !!run;
  const pct = ready ? Math.min(100, (run.t / run.end) * 100) : 0;
  const label = !ready || run.hold != null || !run.playing ? (run && run.atEnd ? 'REPLAY' : 'PLAY') : 'PAUSE';
  return (
    <div className="eng-player">
      <button type="button" className="chip chipbtn eng-play" disabled={!ready} onClick={() => send({ eng: 'cmd', op: 'toggle' })} aria-label={label === 'PAUSE' ? 'Pause the replay' : label === 'REPLAY' ? 'Replay the run' : 'Play the run'}>
        {label === 'PAUSE' ? (
          <svg viewBox="0 0 9 10" aria-hidden="true"><rect x="1" y="1" width="2.5" height="8" /><rect x="5.5" y="1" width="2.5" height="8" /></svg>
        ) : (
          <svg viewBox="0 0 9 10" aria-hidden="true"><path d="M1 1l7 4-7 4z" /></svg>
        )}
        {label}
      </button>
      <div className="eng-scrub">
        {ready ? run.marks.filter((m) => ['fail', 'retry', 'filedq'].includes(m[1])).map(([t, k, n]) => (
          <i key={k + t} className={'eng-mk ' + k} style={{ left: `${(t / run.end) * 100}%` }} title={`${n} at ${fmt(t)}`} />
        )) : null}
        <input
          type="range" className="prange" min="0" max={STEPS} step="1" disabled={!ready}
          value={Math.round((pct / 100) * STEPS)} style={{ '--p': `${pct}%` }}
          aria-label="Replay position" aria-valuetext={ready ? `${fmt(run.t)} of ${fmt(run.end)}` : 'Loading'}
          onChange={(e) => send({ eng: 'cmd', op: 'seek', t: (+e.target.value / STEPS) * run.end })}
        />
      </div>
      {ready && run.hold != null ? (
        <span className="eng-hold" role="status">Recorded run: Retry at {fmt(run.recordedRetry)} · plays in {Math.ceil(run.hold / 1000)} s</span>
      ) : null}
      <button type="button" className="chip chipbtn eng-end" disabled={!ready || run.atEnd} onClick={() => send({ eng: 'cmd', op: 'end' })}>END</button>
    </div>
  );
}

export default function EngineWorkflowView() {
  const frame = useRef(null);
  const [run, setRun] = useState(null);
  const onEvent = useCallback((e) => { if (e.eng === 'run') setRun(e.run); }, []);
  const send = useCallback((cmd) => frame.current?.send(cmd), []);
  return (
    <DemoFrame title="SMR_DATA_CENTRE_OUTLOOK.run · made-up run" label="recreation" fill={false} onReset={() => setRun(null)}>
      <Player run={run} send={send} />
      <ProductFrame
        ref={frame}
        src="/demos/engine/"
        width={1100}
        height={780}
        phoneHeight={960}
        title="The Futurity Engine workflow view, recreated on a made-up run"
        revealOn="ready"
        messageKey="eng"
        onEvent={onEvent}
        drawn={(doc) => !!doc.querySelector('.react-flow__node')}
      />
    </DemoFrame>
  );
}
