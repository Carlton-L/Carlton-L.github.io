/**
 * useReplay — timed event-replay hook (master plan technique C).
 *
 * Takes an array of timestamped records and exposes transport controls.
 * Deterministic and scrubber-safe: `emitted` is always derived purely from
 * `position`, so seeking backwards is just recomputing the slice from t=0 —
 * consumers should rebuild state from `emitted`, never accumulate imperatively.
 *
 * @param {Array<{t: number}>} records - events with `t` in ms from recording start
 *   (extra fields ride along untouched). MUST be sorted ascending by t.
 * @param {Object}  [opts]
 * @param {number}  [opts.compressTo] - map the recording onto this many ms
 *   (e.g. a 10-min run onto 75_000). Omit for real-time.
 * @param {boolean} [opts.autoplay=false]
 * @param {number}  [opts.initialSpeed=1]
 *
 * @returns {{
 *   playing: boolean, play(): void, pause(): void, toggle(): void,
 *   seek(ms: number): void, position: number, duration: number,
 *   speed: number, setSpeed(s: number): void,
 *   emitted: Array, index: number, done: boolean
 * }}
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function useReplay(records, opts = {}) {
  const { compressTo, autoplay = false, initialSpeed = 1 } = opts;

  // Normalize timestamps once (compression is linear).
  const timeline = useMemo(() => {
    if (!records?.length) return { events: [], duration: 0 };
    const t0 = records[0].t;
    const raw = records[records.length - 1].t - t0 || 1;
    const scale = compressTo ? compressTo / raw : 1;
    return {
      events: records.map((r) => ({ ...r, t: (r.t - t0) * scale })),
      duration: raw * scale,
    };
  }, [records, compressTo]);

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(initialSpeed);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return undefined;
    last.current = performance.now();
    const frame = (now) => {
      const dt = now - last.current;
      last.current = now;
      setPosition((p) => {
        const next = p + dt * speed;
        if (next >= timeline.duration) {
          setPlaying(false);
          return timeline.duration;
        }
        return next;
      });
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, timeline.duration]);

  // Derived, never accumulated: the whole point.
  const index = useMemo(() => {
    const ev = timeline.events;
    let lo = 0;
    let hi = ev.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ev[mid].t <= position) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }, [timeline.events, position]);

  const emitted = useMemo(() => timeline.events.slice(0, index), [timeline.events, index]);

  const play = useCallback(() => {
    setPosition((p) => (p >= timeline.duration ? 0 : p)); // replay from end
    setPlaying(true);
  }, [timeline.duration]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((v) => (!v && position >= timeline.duration ? (setPosition(0), true) : !v)), [position, timeline.duration]);
  const seek = useCallback((ms) => setPosition(Math.max(0, Math.min(ms, timeline.duration))), [timeline.duration]);

  return {
    playing,
    play,
    pause,
    toggle,
    seek,
    position,
    duration: timeline.duration,
    speed,
    setSpeed,
    emitted,
    index,
    done: position >= timeline.duration,
  };
}
