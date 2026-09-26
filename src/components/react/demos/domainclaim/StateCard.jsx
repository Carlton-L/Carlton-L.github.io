/**
 * StateCard — every state the check can land in, one panel each, under the view it drives. Browse
 * with the two buttons in the header, the strip of markers, a swipe, or the arrow keys; the view
 * above runs whichever state is showing. No timer.
 *
 * The panels sit stacked in one grid cell, so the card is exactly as tall as its longest state at
 * the current width: no empty space kept for a state that doesn't need it, and changing state never
 * moves the page.
 */
import { useRef } from 'react';
import { MOVES, SCENES } from './explorer-data.js';
import { pick, useExplorer } from './explorer-store.js';
import './domainclaim.css';

const pad = (n) => String(n).padStart(2, '0');

export default function StateCard() {
  const { index } = useExplorer();
  const scene = SCENES[index];
  const swipe = useRef(null);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.5) pick(index + (dx < 0 ? 1 : -1));
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') pick(index + 1);
    else if (e.key === 'ArrowLeft') pick(index - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="dcs">
      <div className="dcs-head">
        <span className="dcs-where">
          <span className={`dcs-move m-${scene.move}`}>{MOVES[scene.move]}</span>
          <span className="dcs-count">
            {pad(index + 1)} / {pad(SCENES.length)}
          </span>
        </span>
        <span className="dcs-nav">
          <button type="button" className="dcs-btn" onClick={() => pick(index - 1)} aria-label="Previous state">
            <span aria-hidden="true">◂</span> PREV
          </button>
          <button type="button" className="dcs-btn" onClick={() => pick(index + 1)} aria-label="Next state">
            NEXT <span aria-hidden="true">▸</span>
          </button>
        </span>
      </div>

      <div
        className="dcs-stack"
        tabIndex={0}
        aria-label="States. Use the arrow keys to browse"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {SCENES.map((s, i) => (
          <section
            key={s.id}
            className="dcs-panel"
            data-on={i === index ? 'true' : 'false'}
            aria-hidden={i !== index}
            aria-roledescription="state"
          >
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
