/**
 * FastGatherDemo — the FAST lab Gather board, live.
 *
 * Recreated from the product's Gather tool (Lab/tools/gather): a kanban board of
 * category columns holding subject cards, each carrying the three strategic
 * indices (HR / TT / WS) as animated bars. Portfolio-owned code and native HTML5
 * drag-and-drop stand in for the product's react-dnd — FAST is recreated-only.
 *
 * Product behaviors carried over:
 *  - drag a subject card between columns; the drop column highlights
 *  - live subject-count badge per column
 *  - metric bars animate from zero (0.8s cubic-bezier), HR/TT/WS in the
 *    product's exact colors (#D4AF37 / #20B2AA / #FF6B47)
 *  - optimistic removal with an 8-second UNDO toast (the product's signature
 *    "fast and forgiving" pattern)
 *  - the hexagon subject glyph and the "Uncategorized" default column
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import { INITIAL_BOARD, METRIC_COLORS, LAB_NAME } from '../../../../data/demos/fast-gather.js';
import './fast.css';

function clone(board) {
  return board.map((c) => ({ ...c, subjects: c.subjects.map((s) => ({ ...s })) }));
}

function Hexagon() {
  return (
    <svg className="fgb-hex" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" fill="#4252BD" stroke="#4252BD" strokeWidth="1" />
    </svg>
  );
}

function MetricBar({ label, value, animate }) {
  /* value null = the product's N/A state (indices not yet computed) */
  return (
    <div className="fgb-metric" title={value == null ? label + ': N/A' : label + ': ' + value.toFixed(1)}>
      <span className="fgb-metric-label" style={value == null ? { opacity: 0.4 } : undefined}>
        {label}
      </span>
      <span className="fgb-metric-track">
        <span
          className="fgb-metric-fill"
          style={{ width: (animate && value != null ? value * 10 : 0) + '%', background: METRIC_COLORS[label] }}
        />
      </span>
    </div>
  );
}

function Board() {
  const [board, setBoard] = useState(() => clone(INITIAL_BOARD));
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [toast, setToast] = useState(null); // { subject, fromColId }
  const toastTimer = useRef(0);

  /* kick metric-bar animation after mount (product parity: bars fill from 0) */
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 120);
    return () => clearTimeout(t);
  }, []);

  const findSubject = useCallback(
    (id) => {
      for (const col of board) {
        const s = col.subjects.find((x) => x.id === id);
        if (s) return { subject: s, colId: col.id };
      }
      return null;
    },
    [board]
  );

  const moveTo = useCallback(
    (subjectId, toColId) => {
      setBoard((prev) => {
        const next = clone(prev);
        let moved = null;
        for (const col of next) {
          const i = col.subjects.findIndex((s) => s.id === subjectId);
          if (i >= 0) {
            moved = col.subjects.splice(i, 1)[0];
            break;
          }
        }
        if (moved) {
          const dest = next.find((c) => c.id === toColId);
          if (dest) dest.subjects.push(moved);
        }
        return next;
      });
    },
    []
  );

  const onDrop = useCallback(
    (colId) => {
      if (dragId) moveTo(dragId, colId);
      setDragId(null);
      setOverCol(null);
    },
    [dragId, moveTo]
  );

  const remove = useCallback(
    (subjectId) => {
      const found = findSubject(subjectId);
      if (!found) return;
      setBoard((prev) => {
        const next = clone(prev);
        for (const col of next) {
          const i = col.subjects.findIndex((s) => s.id === subjectId);
          if (i >= 0) {
            col.subjects.splice(i, 1);
            break;
          }
        }
        return next;
      });
      setToast({ subject: found.subject, fromColId: found.colId });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 8000);
    },
    [findSubject]
  );

  const undo = useCallback(() => {
    if (!toast) return;
    setBoard((prev) => {
      const next = clone(prev);
      const dest = next.find((c) => c.id === toast.fromColId) || next[0];
      dest.subjects.push({ ...toast.subject });
      return next;
    });
    clearTimeout(toastTimer.current);
    setToast(null);
  }, [toast]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  return (
    <div className="fgb-wrap">
      <div className="fgb-toolbar">
        GATHER · <b>{LAB_NAME}</b> — drag subjects between categories · remove for an undo toast
      </div>

      <div className="fgb-board">
        {board.map((col) => (
          <div
            key={col.id}
            className="fgb-col"
            data-over={overCol === col.id ? 'true' : 'false'}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.id);
            }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => onDrop(col.id)}
          >
            <div className="fgb-col-head">
              <span>{col.name}</span>
              <span className="fgb-count">{col.subjects.length}</span>
            </div>

            {col.subjects.map((s) => (
              <div
                key={s.id}
                className="fgb-card"
                draggable
                data-dragging={dragId === s.id ? 'true' : 'false'}
                onDragStart={() => setDragId(s.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverCol(null);
                }}
                onDoubleClick={() => remove(s.id)}
                title="Drag to another column · double-click to remove"
              >
                <div className="fgb-card-head">
                  <Hexagon />
                  <span className="fgb-card-title">{s.name}</span>
                </div>
                <div className="fgb-metrics">
                  <MetricBar label="HR" value={s.hr} animate={animate} />
                  <MetricBar label="TT" value={s.tt} animate={animate} />
                  <MetricBar label="WS" value={s.ws} animate={animate} />
                </div>
                <div className="fgb-summary">{s.summary}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {toast && (
        <div className="fgb-toast">
          <span>Removed {toast.subject.name}</span>
          <button type="button" onClick={undo}>
            UNDO
          </button>
        </div>
      )}
    </div>
  );
}

export default function FastGatherDemo() {
  return (
    <DemoFrame title="GATHER — lab subject board" label="recreation" height="480px" fill>
      <Board />
    </DemoFrame>
  );
}
