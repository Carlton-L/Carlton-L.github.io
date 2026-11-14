/**
 * ReplayPlayer — the portfolio's player above a recorded demo: play / pause / replay, a scrubber
 * with the run's marked moments, End, and a status slot (a countdown, a note) that takes the
 * scrubber's place on phones. Portfolio chrome, not product UI: it knows nothing about the demo.
 *
 *   <ReplayPlayer ready t={12} end={300} playing marks={[{ t: 181, tone: 'bad', label: 'Crash' }]}
 *     onToggle={…} onSeek={(t) => …} onEnd={…} status={held ? 'Plays in 8 s' : null} />
 *
 * With useReplay (a recording that plays in the page): <ReplayPlayer {...fromReplay(useReplay(records))} />.
 * The Engine demo drives one by postMessage instead (EngineWorkflowView.jsx).
 * `held`: the run is waiting (on a choice, a countdown), so the button offers PLAY, not PAUSE.
 * Mark tones: bad (red), info (blue), good (signal). Every box has a fixed height.
 */
import './replay-player.css';

const STEPS = 1000;
export const fmtClock = (t) => `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s`;

export default function ReplayPlayer({
  ready = false, t = 0, end = 1, playing = false, held = false, atEnd = false, marks = [],
  status = null, fmt = fmtClock, onToggle, onSeek, onEnd, scrubLabel = 'Replay position',
}) {
  const pct = ready ? Math.min(100, (t / end) * 100) : 0;
  const label = !ready || held || !playing ? (atEnd ? 'REPLAY' : 'PLAY') : 'PAUSE';
  return (
    <div className="rplayer">
      <button type="button" className="chip chipbtn rp-play" disabled={!ready} onClick={onToggle} aria-label={label === 'PAUSE' ? 'Pause the replay' : label === 'REPLAY' ? 'Replay the run' : 'Play the run'}>
        {label === 'PAUSE' ? (
          <svg viewBox="0 0 9 10" aria-hidden="true"><rect x="1" y="1" width="2.5" height="8" /><rect x="5.5" y="1" width="2.5" height="8" /></svg>
        ) : (
          <svg viewBox="0 0 9 10" aria-hidden="true"><path d="M1 1l7 4-7 4z" /></svg>
        )}
        {label}
      </button>
      <div className="rp-scrub">
        {ready ? marks.map((m) => (
          <i key={m.tone + m.t} className={'rp-mk ' + m.tone} style={{ left: `${(m.t / end) * 100}%` }} title={`${m.label} at ${fmt(m.t)}`} />
        )) : null}
        <input
          type="range" className="prange" min="0" max={STEPS} step="1" disabled={!ready}
          value={Math.round((pct / 100) * STEPS)} style={{ '--p': `${pct}%` }}
          aria-label={scrubLabel} aria-valuetext={ready ? `${fmt(t)} of ${fmt(end)}` : 'Loading'}
          onChange={(e) => onSeek && onSeek((+e.target.value / STEPS) * end)}
        />
      </div>
      {ready && status != null ? (<span className="rp-status" role="status">{status}</span>) : null}
      <button type="button" className="chip chipbtn rp-end" disabled={!ready || atEnd} onClick={onEnd}>END</button>
    </div>
  );
}

/** useReplay's result (positions in ms) as ReplayPlayer props (seconds on the clock). */
export function fromReplay(r) {
  return {
    ready: true, t: r.position / 1000, end: Math.max(1, r.duration) / 1000, playing: r.playing, atEnd: r.done,
    onToggle: r.toggle, onSeek: (s) => r.seek(s * 1000), onEnd: () => r.seek(r.duration),
  };
}
