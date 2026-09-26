/**
 * StateCard — every state the check can land in, one panel each. Browse by scrolling the panels
 * sideways, with the arrows, or with the strip of markers; the view beside it runs whichever state
 * is showing. Fixed height at each width, so changing state never moves the page. No timer.
 * On the case study it pops out into the corner dock while the view is on screen and it isn't.
 */
import { useEffect, useRef } from 'react';
import { MOVES, SCENES } from './explorer-data.js';
import { pick, useExplorer } from './explorer-store.js';
import './domainclaim.css';

const pad = (n) => String(n).padStart(2, '0');

export default function StateCard() {
  const { index } = useExplorer();
  const track = useRef(null);
  const steering = useRef(false);
  const first = useRef(true);

  // Follow the store: bring the current panel into view.
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const left = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - left) < 2) {
      first.current = false;
      return undefined;
    }
    steering.current = true;
    // The first placement is instant, so the card opens on its starting state without a slide.
    const smooth = !first.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    first.current = false;
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    const done = setTimeout(() => {
      steering.current = false;
    }, 700);
    return () => clearTimeout(done);
  }, [index]);

  // The page can move the card into a corner dock and back (PatchField's DUO dock). A moved
  // element loses its scroll position, so put the current panel back without a slide.
  useEffect(() => {
    const onDuo = () => {
      const el = track.current;
      if (!el) return;
      steering.current = true;
      requestAnimationFrame(() => {
        el.scrollTo({ left: index * el.clientWidth, behavior: 'auto' });
        setTimeout(() => {
          steering.current = false;
        }, 200);
      });
    };
    document.addEventListener('patch:duo', onDuo);
    return () => document.removeEventListener('patch:duo', onDuo);
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
        if (i !== index) pick(i);
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
    <div className="dcs">
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
        <span className="dcs-auto">PICK ONE · {SCENES.length} STATES</span>
      </div>
    </div>
  );
}
