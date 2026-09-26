/**
 * StateCard — every state the check can land in, one panel each. Browse by scrolling the panels
 * sideways, with the arrows, or with the strip of markers; the view beside it runs whichever state
 * is showing. Fixed height at each width, so changing state never moves the page.
 */
import { useEffect, useRef } from 'react';
import { MOVES, SCENES } from './explorer-data.js';
import { loopAvailable, pick, startLoop, useExplorer } from './explorer-store.js';
import useIsland from './useIsland.js';
import './domainclaim.css';

const pad = (n) => String(n).padStart(2, '0');

export default function StateCard() {
  const { index, auto } = useExplorer();
  const root = useRef(null);
  const track = useRef(null);
  const steering = useRef(false);
  useIsland(root);
  useEffect(() => startLoop(), []);

  // Follow the store: bring the current panel into view.
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const left = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - left) < 2) return undefined;
    steering.current = true;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    const done = setTimeout(() => {
      steering.current = false;
    }, 700);
    return () => clearTimeout(done);
  }, [index]);

  // A sideways scroll by the visitor picks the panel it settles on.
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    let settle = null;
    const onScroll = () => {
      if (steering.current) return;
      clearTimeout(settle);
      settle = setTimeout(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        if (i !== index) pick(i, true);
      }, 140);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(settle);
      el.removeEventListener('scroll', onScroll);
    };
  }, [index]);

  const scene = SCENES[index];

  return (
    <div className="dcs" ref={root}>
      <div className="dcs-head">
        <span className={`dcs-move m-${scene.move}`}>{MOVES[scene.move]}</span>
        <span className="dcs-count">
          {pad(index + 1)} / {pad(SCENES.length)}
        </span>
        <span className="dcs-nav">
          <button type="button" className="dcs-arrow" onClick={() => pick(index - 1)} aria-label="Previous state">
            ◂
          </button>
          <button type="button" className="dcs-arrow" onClick={() => pick(index + 1)} aria-label="Next state">
            ▸
          </button>
        </span>
      </div>

      <div className="dcs-track" ref={track} tabIndex={0} aria-label="States, scroll sideways to browse">
        {SCENES.map((s, i) => (
          <section key={s.id} className="dcs-panel" aria-hidden={i !== index} aria-roledescription="state">
            <h3 className="dcs-title">{s.title}</h3>
            <div className="dcs-name">{s.name}</div>
            <div className="dcs-text">{s.text}</div>
            {s.source && <div className="dcs-src">{s.source}</div>}
            <div className="dcs-tests">
              <span>TESTS</span> {s.tests}
            </div>
          </section>
        ))}
      </div>

      <div className="dcs-foot">
        <div className="dcs-strip" role="group" aria-label="All states">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`dcs-mark m-${s.move}`}
              aria-pressed={i === index}
              aria-label={`${MOVES[s.move].toLowerCase()}: ${s.title}`}
              title={s.title}
              onClick={() => pick(i)}
            />
          ))}
        </div>
        <span className="dcs-auto">{!loopAvailable ? 'PICK A STATE' : auto ? 'PLAYING THROUGH ▸' : 'PAUSED'}</span>
      </div>
    </div>
  );
}
