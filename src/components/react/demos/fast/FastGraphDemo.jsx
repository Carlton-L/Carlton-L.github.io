/**
 * FastGraphDemo — the FAST subject page (top half), live.
 *
 * Recreated from the product (Futurity Analysis & Synthesis Tools — FAST is
 * recreated-only per Futurity, so this is portfolio-owned code with the real
 * component as spec). It now mirrors the whole top of the subject page, not
 * just the canvas: the identity bar (title + summary), the three strategic
 * index cards with the product's descriptor sub-labels and proportional bars,
 * and the knowledge graph beneath. Trends/ridgeline and below are left out.
 *
 * Carried over verbatim from the real NetworkGraph:
 *  - NODE_TYPE_COLORS (Subject #4252BD, Organization #E07B91, Press #E69500,
 *    Patent #C3DE6D, Paper #20C6DB, Book #46ACC8)
 *  - label pills = .cosmograph-label-unified (12px sans 500, dark
 *    rgba(0,0,0,0.85) rounded pill, screen-space constant size)
 *  - click a node → camera glides to it + selected-node info card; nodes with
 *    their own snapshot page are ringed and surface the "Go to {label}" pill
 *  - legend with per-type filters (present types only) + labels toggle,
 *    fullscreen
 *
 * THE SHAPE (Carlton's tuning of the real sim, recreated with per-type radial
 * bands): a NUCLEUS of papers and patents packed around the focus subject
 * (they cite each other, so they knit), a RING of organizations and press
 * (they mostly link only to subjects), and an outer CLOUD of related subjects.
 *
 * Data: src/data/demos/fast-network.js (product /graphs/simple shape);
 * real sanitized downloads drop in unchanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import { NETWORKS, START, NODE_TYPE_COLORS, INDEX_META } from '../../../../data/demos/fast-network.js';
import './fast.css';

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TYPES = ['Subject', 'Organization', 'Press', 'Patent', 'Paper', 'Book'];

/* product label typography — .cosmograph-label-unified, canvas-side */
const LABEL_FONT = '500 11px "TT Norms Pro Normal", Inter, system-ui, sans-serif';

/* THE SHAPE — per-type radial bands (fraction of the shorter half-axis).
   nucleus: papers/patents/books · ring: orgs/press · cloud: related subjects */
const BAND = {
  Paper: 0.34,
  Patent: 0.34,
  Book: 0.4,
  Organization: 0.66,
  Press: 0.66,
  Subject: 0.92,
};
const LINK_LEN_BY_TYPE = {
  Paper: 52,
  Patent: 52,
  Book: 60,
  Organization: 104,
  Press: 104,
  Subject: 150,
};

/* deterministic PRNG so first layout is identical every mount */
function makeRng(s) {
  let seed = s >>> 0 || 1;
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/* ── one force-simulation instance over a { nodes, links } dataset ── */
function buildSim(data, w, h) {
  const rng = makeRng(1337);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.5;
  const focusId = data.nodes[0].id;
  const nodes = data.nodes.map((n, i) => {
    const a = rng() * Math.PI * 2;
    /* seed each node near its band so the shape reads from frame one */
    const band = i === 0 ? 0 : (BAND[n.type] || 0.6) * R;
    const r = band * (0.75 + rng() * 0.4);
    return {
      ...n,
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      vx: 0,
      vy: 0,
      rad: 5 + (n.size || 1) * 2.2,
      focus: i === 0,
    };
  });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const links = data.links
    .map((l) => ({ s: byId[l.source], t: byId[l.target], value: l.value || 1 }))
    .filter((l) => l.s && l.t);
  return { nodes, links, byId, cx, cy, R, focusId };
}

/* verlet-ish step: repulsion + per-type link springs + per-type radial bands.
   The bands are what recreate Carlton's tuned nucleus / ring / cloud. */
function stepSim(sim, w, h) {
  const { nodes, links } = sim;
  const REPULSION = 2200;
  const SPRING = 0.02;
  const GRAVITY = 0.01;
  const BAND_K = 0.028;
  const FRICTION = 0.9;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy || 0.01;
      const f = REPULSION / d2;
      const d = Math.sqrt(d2);
      const ux = dx / d;
      const uy = dy / d;
      a.vx += ux * f;
      a.vy += uy * f;
      b.vx -= ux * f;
      b.vy -= uy * f;
    }
  }
  for (const l of links) {
    let dx = l.t.x - l.s.x;
    let dy = l.t.y - l.s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    /* rest length keyed by the non-focus endpoint's type */
    const other = l.s.focus ? l.t : l.s;
    const len = LINK_LEN_BY_TYPE[other.type] || 90;
    const f = (d - len) * SPRING;
    const ux = dx / d;
    const uy = dy / d;
    l.s.vx += ux * f;
    l.s.vy += uy * f;
    l.t.vx -= ux * f;
    l.t.vy -= uy * f;
  }
  for (const n of nodes) {
    if (n.focus) {
      /* the focus entity holds the center */
      n.vx += (sim.cx - n.x) * 0.08;
      n.vy += (sim.cy - n.y) * 0.08;
    } else {
      /* radial band force toward the type's shell */
      const dx = n.x - sim.cx;
      const dy = n.y - sim.cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = (BAND[n.type] || 0.6) * sim.R;
      const f = (target - d) * BAND_K;
      n.vx += (dx / d) * f;
      n.vy += (dy / d) * f;
      n.vx += (sim.cx - n.x) * GRAVITY;
      n.vy += (sim.cy - n.y) * GRAVITY;
    }
    n.vx *= FRICTION;
    n.vy *= FRICTION;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(n.rad + 4, Math.min(w - n.rad - 4, n.x));
    n.y = Math.max(n.rad + 4, Math.min(h - n.rad - 4, n.y));
  }
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

/* one screen-space label pill, product .cosmograph-label-unified parity */
function drawLabelPill(ctx, text, sx, sy) {
  ctx.font = LABEL_FONT;
  const t = truncate(text, 32);
  const tw = ctx.measureText(t).width;
  const padX = 8;
  const ph = 19;
  const pw = tw + padX * 2;
  const x = sx - pw / 2;
  const y = sy - ph;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, 6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, sx, y + ph / 2 + 0.5);
  ctx.textBaseline = 'alphabetic';
}

function GraphCanvas({ focus, setFocus, wrapRef: outerRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const camRef = useRef({ x: 0, y: 0, scale: 1, tx: 0, ty: 0, tScale: 1 });
  const sizeRef = useRef({ w: 900, h: 420 });
  const rafRef = useRef(0);

  const [selected, setSelected] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [labels, setLabels] = useState(true);
  const [legendMin, setLegendMin] = useState(false);
  const [fs, setFs] = useState(false);
  const [fade, setFade] = useState(1);

  const data = NETWORKS[focus];
  const presentTypes = TYPES.filter((t) => data.nodes.some((n) => n.type === t));
  const hiddenRef = useRef(hidden);
  const labelsRef = useRef(labels);
  const selRef = useRef(selected);
  hiddenRef.current = hidden;
  labelsRef.current = labels;
  selRef.current = selected;

  /* (re)build the simulation whenever the active dataset changes */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.clientWidth || 900;
    const h = wrap.clientHeight || 420;
    sizeRef.current = { w, h };
    simRef.current = buildSim(data, w, h);
    camRef.current = { x: 0, y: 0, scale: 1, tx: 0, ty: 0, tScale: 1 };
    setSelected(null);
    setFade(0);
    /* settle the layout a bit before first paint so it opens composed */
    for (let i = 0; i < (REDUCED ? 260 : 110); i++) stepSim(simRef.current, w, h);
  }, [focus]);

  /* resize handling */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      sizeRef.current = { w, h };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sim = simRef.current;
      if (sim) {
        sim.cx = w / 2;
        sim.cy = h / 2;
        sim.R = Math.min(w, h) * 0.5;
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  /* render + physics loop (single rAF, self-terminating on unmount) */
  useEffect(() => {
    let alive = true;
    let settleFrames = 0;
    const loop = () => {
      if (!alive) return;
      const canvas = canvasRef.current;
      const sim = simRef.current;
      const { w, h } = sizeRef.current;
      if (canvas && sim) {
        const ctx = canvas.getContext('2d');
        if (!REDUCED && settleFrames < 900) {
          stepSim(sim, w, h);
          settleFrames++;
        }
        setFade((f) => (f < 1 ? Math.min(1, f + 0.06) : 1));

        /* ease camera toward target */
        const cam = camRef.current;
        cam.scale += (cam.tScale - cam.scale) * 0.12;
        cam.x += (cam.tx - cam.x) * 0.12;
        cam.y += (cam.ty - cam.y) * 0.12;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(cam.scale, cam.scale);
        ctx.translate(-w / 2 - cam.x, -h / 2 - cam.y);

        const hid = hiddenRef.current;
        const sel = selRef.current;
        /* edges */
        for (const l of sim.links) {
          if (hid.has(l.s.type) || hid.has(l.t.type)) continue;
          const on = sel && (sel.id === l.s.id || sel.id === l.t.id);
          ctx.strokeStyle = on ? 'rgba(61,255,136,0.55)' : 'rgba(150,150,150,0.22)';
          ctx.lineWidth = on ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(l.s.x, l.s.y);
          ctx.lineTo(l.t.x, l.t.y);
          ctx.stroke();
        }
        /* nodes */
        for (const n of sim.nodes) {
          if (hid.has(n.type)) continue;
          const isSel = sel && sel.id === n.id;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.rad, 0, Math.PI * 2);
          ctx.fillStyle = NODE_TYPE_COLORS[n.type] || NODE_TYPE_COLORS.default;
          ctx.fill();
          if (isSel) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          } else if (n.to) {
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.stroke();
          }
        }
        ctx.restore();

        /* labels — screen-space pills (product parity: constant size) */
        const toScreen = (n) => ({
          x: (n.x - w / 2 - cam.x) * cam.scale + w / 2,
          y: (n.y - h / 2 - cam.y) * cam.scale + h / 2,
        });
        let budget = 12;
        for (const n of sim.nodes) {
          if (hid.has(n.type)) continue;
          const isSel = sel && sel.id === n.id;
          const wants = isSel || n.focus || (labelsRef.current && (n.to || (n.size || 1) >= 2));
          if (!wants || budget <= 0) continue;
          budget--;
          const p = toScreen(n);
          if (p.x < -60 || p.x > w + 60 || p.y < 0 || p.y > h + 20) continue;
          drawLabelPill(ctx, n.label, p.x, p.y - n.rad * cam.scale - 4);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* screen → world hit test */
  const pick = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return null;
    const rect = canvas.getBoundingClientRect();
    const { w, h } = sizeRef.current;
    const cam = camRef.current;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const wx = (sx - w / 2) / cam.scale + w / 2 + cam.x;
    const wy = (sy - h / 2) / cam.scale + h / 2 + cam.y;
    let best = null;
    let bestD = Infinity;
    for (const n of sim.nodes) {
      if (hiddenRef.current.has(n.type)) continue;
      const dx = n.x - wx;
      const dy = n.y - wy;
      const d = dx * dx + dy * dy;
      const hitR = (n.rad + 8) * (n.rad + 8);
      if (d < hitR && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }, []);

  const zoomTo = useCallback((n) => {
    const { w, h } = sizeRef.current;
    const cam = camRef.current;
    cam.tScale = 1.9;
    cam.tx = n.x - w / 2;
    cam.ty = n.y - h / 2;
  }, []);

  const resetCam = useCallback(() => {
    const cam = camRef.current;
    cam.tScale = 1;
    cam.tx = 0;
    cam.ty = 0;
  }, []);

  const onClick = useCallback(
    (e) => {
      const n = pick(e.clientX, e.clientY);
      if (n) {
        setSelected(n);
        zoomTo(n);
      } else {
        setSelected(null);
        resetCam();
      }
    },
    [pick, zoomTo, resetCam]
  );

  const onMove = useCallback(
    (e) => {
      const n = pick(e.clientX, e.clientY);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = n ? 'pointer' : 'default';
    },
    [pick]
  );

  const traverse = useCallback(() => {
    if (selected && selected.to) {
      setFocus(selected.to);
    }
  }, [selected, setFocus]);

  const toggleType = useCallback((t) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const toggleFs = useCallback(() => {
    const outer = outerRef.current;
    if (!document.fullscreenElement && outer) {
      outer.requestFullscreen?.();
      setFs(true);
    } else {
      document.exitFullscreen?.();
      setFs(false);
    }
  }, [outerRef]);

  useEffect(() => {
    const onFsChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const canTraverse = selected && selected.to;

  return (
    <div ref={wrapRef} className="fgd-wrap" style={{ opacity: fade }}>
      <canvas ref={canvasRef} className="fgd-canvas" onClick={onClick} onMouseMove={onMove} />

      {/* fullscreen */}
      <button className="fgd-fs" type="button" onClick={toggleFs} aria-label="Toggle fullscreen">
        {fs ? '⤢' : '⤢'}
      </button>

      {/* legend / filters — present types only, product parity */}
      <div className="fgd-legend" data-min={legendMin ? 'true' : 'false'}>
        {legendMin ? (
          <button type="button" className="fgd-legend-show" onClick={() => setLegendMin(false)}>
            ▲ NODE TYPES
          </button>
        ) : (
          <>
            <div className="fgd-legend-head">
              <span>NODE TYPES</span>
              <button type="button" onClick={() => setLegendMin(true)} aria-label="Hide legend">
                –
              </button>
            </div>
            {presentTypes.map((t) => (
              <button
                key={t}
                type="button"
                className="fgd-legend-row"
                data-off={hidden.has(t) ? 'true' : 'false'}
                onClick={() => toggleType(t)}
              >
                <span className="fgd-swatch" style={{ background: NODE_TYPE_COLORS[t] }} />
                <span className="fgd-legend-label">{t}</span>
              </button>
            ))}
            <div className="fgd-labels-row">
              <span>LABELS</span>
              <button
                type="button"
                className="fgd-toggle"
                data-on={labels ? 'true' : 'false'}
                onClick={() => setLabels((v) => !v)}
              >
                {labels ? 'ON' : 'OFF'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* selected node info card (bottom-left, product parity) */}
      {selected && (
        <div className="fgd-info">
          <div className="fgd-info-top">
            <span className="fgd-info-dot" style={{ background: NODE_TYPE_COLORS[selected.type] || NODE_TYPE_COLORS.default }} />
            <span className="fgd-info-type">{selected.type}</span>
          </div>
          <div className="fgd-info-label">{selected.label}</div>
          {selected.date && <div className="fgd-info-date">{selected.date}</div>}
          {selected.ent_url && selected.type !== 'Subject' && !selected.to && (
            <a className="fgd-info-link" href={selected.ent_url} target="_blank" rel="noopener noreferrer">
              ↗ Open link
            </a>
          )}
          {selected.to && (
            <div className="fgd-info-hint">has its own snapshot page</div>
          )}
          {selected.id === data.nodes[0].id && (
            <div className="fgd-info-hint">this page · you are here</div>
          )}
          <div className="fgd-info-hint">Click empty space to deselect</div>
        </div>
      )}

      {/* traverse pill (bottom-center) — the move that makes it a portal */}
      {canTraverse && (
        <button type="button" className="fgd-go" onClick={traverse}>
          Go to {selected.label} ▸
        </button>
      )}
    </div>
  );
}

/* ── the subject-page top: identity bar + index cards (DetailIdentityBar parity) ── */
function IdentityBar({ data }) {
  const meta = data.meta;
  const isSubject = meta.type === 'Subject';
  const idx = meta.indices;
  const focusNode = data.nodes[0];
  return (
    <div className="fsp-head">
      <div className="fsp-id">
        <div className="fsp-eyebrow">
          <span
            className="fgd-focus-dot"
            style={{ background: NODE_TYPE_COLORS[meta.type] || NODE_TYPE_COLORS.default }}
          />
          {isSubject ? 'SUBJECT' : meta.type.toUpperCase() + ' SNAPSHOT'}
        </div>
        <div className="fsp-title">{meta.label}</div>
        <div className="fsp-summary">{meta.summary}</div>
      </div>
      {isSubject ? (
        <div className="fsp-indexes">
          {INDEX_META.map((m) => {
            const val = idx ? idx[m.key] : null;
            const desc = idx && idx.labels ? idx.labels[m.key] : null;
            return (
              <div className="fsp-index" key={m.key} style={{ borderColor: val != null ? m.color : 'rgba(255,255,255,0.14)' }}>
                <div className="fsp-index-label">{m.label}</div>
                <div className="fsp-index-desc">{val != null ? desc || ' ' : 'Not yet computed'}</div>
                <div className="fsp-index-val" style={{ color: val != null ? m.color : 'rgba(255,255,255,0.4)' }}>
                  {val != null ? val.toFixed(1) : 'N/A'}
                </div>
                <div className="fsp-index-track">
                  <div
                    className="fsp-index-fill"
                    style={{ width: val != null ? val * 10 + '%' : '0%', background: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        focusNode.ent_url && (
          <a className="fsp-source" href={focusNode.ent_url} target="_blank" rel="noopener noreferrer">
            View Source ↗
          </a>
        )
      )}
    </div>
  );
}

export default function FastGraphDemo() {
  const [focus, setFocus] = useState(START);
  const wrapRef = useRef(null);
  const data = NETWORKS[focus];
  const meta = data.meta;
  const kind = meta.type === 'Subject' ? 'subject page' : 'source snapshot';
  return (
    <DemoFrame
      title={meta.label.replace(/\s+/g, '_').toUpperCase().slice(0, 34) + ' — ' + kind}
      label="recreation"
      height="640px"
      fill
    >
      <div ref={wrapRef} className="fsp-wrap">
        <IdentityBar data={data} key={focus} />
        <div className="fsp-graph">
          <GraphCanvas focus={focus} setFocus={setFocus} wrapRef={wrapRef} />
        </div>
      </div>
    </DemoFrame>
  );
}
