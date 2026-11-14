/**
 * EngineWorkflowView — the case study's workflow demo: the ported Engine Blocks prototype in its own
 * document (/demos/engine/, ProductFrame), drawn at 1100 × 780 and scaled to the VIEW (wider made the
 * board's text too small once scaled). On phones it draws at the real width, 960 tall.
 *
 * Above the frame sits the portfolio's replay player (ReplayPlayer.jsx, demos/_shared): play / pause /
 * replay, a scrubber with the run's marked moments, End. It is portfolio chrome, not Engine UI
 * (decided 2026-11-14): the Engine never replays a run, so the controls live outside its frame. It drives the demo by postMessage and reads
 * the replay back (FrameEntry.jsx). During the hold at the crash it shows the recorded retry's
 * countdown in place of nothing.
 *
 * Every box here has a fixed height, so nothing the visitor does changes the page's height. A
 * RECREATION on a made-up run (the Engine is recreation-only).
 */
import { useCallback, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import ProductFrame from '../_shared/ProductFrame.jsx';
import ReplayPlayer, { fmtClock } from '../_shared/ReplayPlayer.jsx';

// The run's marked moments, as the player's tones.
const TONE = { fail: 'bad', retry: 'info', filedq: 'good' };

/** The Engine's run snapshot (FrameEntry.jsx) as ReplayPlayer props. */
function playerProps(run, send) {
  const cmd = (op, extra) => send({ eng: 'cmd', op, ...extra });
  if (!run) return { ready: false };
  return {
    ready: true, t: run.t, end: run.end, playing: run.playing, held: run.hold != null, atEnd: run.atEnd,
    marks: run.marks.filter((m) => TONE[m[1]]).map(([t, k, n]) => ({ t, tone: TONE[k], label: n })),
    status: run.hold != null ? `Recorded run: Retry at ${fmtClock(run.recordedRetry)} · plays in ${Math.ceil(run.hold / 1000)} s` : null,
    onToggle: () => cmd('toggle'), onSeek: (t) => cmd('seek', { t }), onEnd: () => cmd('end'),
  };
}

export default function EngineWorkflowView() {
  const frame = useRef(null);
  const [run, setRun] = useState(null);
  const onEvent = useCallback((e) => { if (e.eng === 'run') setRun(e.run); }, []);
  const send = useCallback((cmd) => frame.current?.send(cmd), []);
  return (
    <DemoFrame title="SMR_DATA_CENTRE_OUTLOOK.run · made-up run" label="recreation" fill={false} onReset={() => setRun(null)}>
      <ReplayPlayer {...playerProps(run, send)} />
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
