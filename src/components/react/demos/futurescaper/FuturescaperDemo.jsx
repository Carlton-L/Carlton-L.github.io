/**
 * FuturescaperDemo — the real product's scenario map, live.
 *
 * The visual language is lifted from the product's own interactive map
 * (futurescaper/demos/interactive-map/preview.html → frontend/src/index.css):
 * "metro cards" (colored frame + white inner, sentiment tint, impact signal,
 * critical pulse), the dark radial seed, amber idea/action tags, octilinear
 * "metro" edges, and the STEEPLE coverage radar rail.
 *
 * The LAYOUT is the REAL algorithm extracted from the product (layout.js —
 * Futurescaper is public per Futurity ruling). Rendering is portfolio-owned
 * React + @xyflow/react (the same public library the product uses). Data is a
 * hand-authored synthetic futurescape (AI agents in knowledge work).
 *
 * Interactivity carried over from the product: click a card → its causal chain
 * straightens into a focus beam; the STEEPLE coverage rows filter the map; the
 * layout toggle is the craft argument — the same data through a naive
 * force-directed layout collapses into a hairball.
 *
 * Embed with client:only="react" (React Flow is DOM-only).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Handle,
  Position,
  ViewportPortal,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './futurescaper.css';

import DemoFrame from '../_shared/DemoFrame.jsx';
import { computeRadialLayout, resolveCollisions, computeFocusPositions, getOptimalHandles } from './layout.js';
import scenario from '../../../../data/demos/futurescaper-ai-agents.json';

const consequences = scenario.consequences;

/* ── STEEPLE (Wong colorblind-safe) palette + product head-text colors ── */
const CAT = {
  social: { c: '#CC79A7', label: 'Social', head: '#854f6d', abbr: 'Soc' },
  technological: { c: '#56B4E9', label: 'Technological', head: '#387597', abbr: 'Tec' },
  economic: { c: '#E69F00', label: 'Economic', head: '#966700', abbr: 'Eco' },
  environmental: { c: '#009E73', label: 'Environmental', head: '#00674b', abbr: 'Env' },
  political: { c: '#D55E00', label: 'Political', head: '#8a3d00', abbr: 'Pol' },
  legal: { c: '#007CBF', label: 'Legal', head: '#00517c', abbr: 'Leg' },
  ethical: { c: '#F0E442', label: 'Ethical', head: '#8a7d00', abbr: 'Eth' },
};
const STEEPLE_ORDER = ['social', 'technological', 'economic', 'environmental', 'political', 'legal', 'ethical'];
const ORDER_NAMES = { 1: 'DIRECT', 2: 'RIPPLE', 3: 'CASCADE', 4: 'SYSTEMIC', 5: 'EMERGENT' };

const SENT_COLOR = { positive: '#16A34A', negative: '#DC2626', neutral: '#64748B' };
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const impLabel = (i) => (i === 'critical' ? 'CRITICAL' : cap(i));
const catColor = (id) => {
  if (id === 'seed') return '#15140f';
  const c = consequences.find((x) => x.id === id);
  if (!c) return '#8a8576';
  return c.nodeType === 'action' ? '#e8a317' : CAT[c.category].c;
};

/* ── Inline lucide-style icons (no runtime icon dep) ── */
const Svg = ({ s = 13, sw = 2, style, children }) => (
  <svg
    viewBox="0 0 24 24"
    width={s}
    height={s}
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);
const CAT_ICON = {
  social: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  technological: (
    <>
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </>
  ),
  economic: (
    <>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  environmental: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </>
  ),
  political: (
    <>
      <line x1="3" x2="21" y1="22" y2="22" />
      <line x1="6" x2="6" y1="18" y2="11" />
      <line x1="10" x2="10" y1="18" y2="11" />
      <line x1="14" x2="14" y1="18" y2="11" />
      <line x1="18" x2="18" y1="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </>
  ),
  legal: (
    <>
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </>
  ),
  ethical: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
};
const SIGNAL = {
  low: (
    <>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
    </>
  ),
  medium: (
    <>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
    </>
  ),
  high: (
    <>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
    </>
  ),
  critical: (
    <>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 4v16" />
    </>
  ),
};
const SENT_MARK = {
  positive: (
    <>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </>
  ),
  negative: (
    <>
      <path d="m7 7 10 10" />
      <path d="M17 7v10H7" />
    </>
  ),
  neutral: (
    <>
      <path d="M4 9.5q2.5-3 5 0t5 0 5 0" />
      <path d="M4 15.5q2.5-3 5 0t5 0 5 0" />
    </>
  ),
};
const SPROUT = (
  <>
    <path d="M7 20h10" />
    <path d="M10 20c5.5-2.5.8-6.4 3-10" />
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
    <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
  </>
);
const TRIANGLE = (
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);
const SHIELD = (
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>
);

/* ── Logical four-way handles (demo has no connect mode) ── */
function FourHandles() {
  return (
    <>
      {['left', 'right', 'top', 'bottom'].map((side) => {
        const pos = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom }[side];
        return (
          <span key={side}>
            <Handle id={side} type="target" position={pos} isConnectable={false} />
            <Handle id={`${side}-source`} type="source" position={pos} isConnectable={false} />
          </span>
        );
      })}
    </>
  );
}

/* ── Nodes ── */
function SeedNode({ data }) {
  return (
    <div className={`seed-node${data.selected ? ' card-selected' : ''}`}>
      <div className="seed-eyebrow">
        <span className="seed-eyebrow-ic">
          <Svg s={15}>{SPROUT}</Svg>
        </span>
        <span>ORIGIN · SEED</span>
      </div>
      <div className="seed-title">{scenario.input.title}</div>
      <div className="seed-desc">{scenario.input.description}</div>
      <FourHandles />
    </div>
  );
}

function ConsequenceNode({ data }) {
  const { c, dim, selected, chain } = data;
  const cat = CAT[c.category];
  const sc = SENT_COLOR[c.sentiment];
  const crit = c.importance === 'critical';
  const cls = ['metro-card', crit && 'lvl-critical', dim && 'is-dim', selected && 'card-selected', !selected && chain && 'is-chain']
    .filter(Boolean)
    .join(' ');
  const innerBg = c.sentiment === 'neutral' ? '#fff' : `color-mix(in srgb, ${sc} 15%, #fff)`;
  return (
    <div className={cls} style={{ background: cat.c }}>
      {crit && (
        <span className="metro-flag" title="Critical impact">
          <Svg s={13} sw={2.5}>
            {TRIANGLE}
          </Svg>
        </span>
      )}
      <div className="metro-inner" style={{ background: innerBg }}>
        <span className="simp-sent-mark" style={{ color: sc }}>
          <Svg s={60} sw={3}>
            {SENT_MARK[c.sentiment]}
          </Svg>
        </span>
        <div className="fa-head" style={{ color: cat.head }}>
          <Svg s={13}>{CAT_ICON[c.category]}</Svg>
          <span className="fa-head-label">{cat.label}</span>
        </div>
        <div className="metro-body">
          <span className="simp-sent-chip" style={{ color: sc, background: `color-mix(in srgb, ${sc} 15%, #fff)` }}>
            <Svg s={13} sw={3.6}>
              {SENT_MARK[c.sentiment]}
            </Svg>
          </span>
          <span>{c.text}</span>
        </div>
        <div className="fa-metrics">
          <span>{cap(c.probability)}</span>
          <span className="sep">·</span>
          <span>{c.timeFrame}</span>
          <span className="sep">·</span>
          <span className="fa-imp">
            <Svg s={13}>{SIGNAL[c.importance] || SIGNAL.medium}</Svg>
            {impLabel(c.importance)}
          </span>
        </div>
      </div>
      <FourHandles />
    </div>
  );
}

function ActionNode({ data }) {
  const { c, dim, selected } = data;
  const cls = ['idea-tag-wrap', dim && 'is-dim', selected && 'card-selected'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="idea-cap">
        <span className="idea-cap-lobe">
          <Svg s={14}>{SHIELD}</Svg>
        </span>
        <span className="idea-cap-lbl">{cap(c.stance) || 'Prepare'}</span>
      </div>
      <div className="idea-tag">
        <div className="i-inner">
          <div className="i-title">{c.title}</div>
          <div className="i-body">{c.text}</div>
        </div>
        <div className="i-stub">
          <span className="i-stub-lab">{cap(c.effort)} effort</span>
          <span className="i-dots">
            <Svg s={14}>{SIGNAL.high}</Svg>
            <span className="i-stub-lab" style={{ marginLeft: 4 }}>
              High impact
            </span>
          </span>
        </div>
      </div>
      <FourHandles />
    </div>
  );
}

const nodeTypes = { seed: SeedNode, consequence: ConsequenceNode, action: ActionNode };

/* ── Octilinear "metro" edge (ported from the product's MetroEdge) ── */
function handleDir(side) {
  return side === 'left' ? { x: -1, y: 0 } : side === 'right' ? { x: 1, y: 0 } : side === 'top' ? { x: 0, y: -1 } : { x: 0, y: 1 };
}
function octiPath(sx, sy, sSide, tx, ty, tSide, stub = 20) {
  const ds = handleDir(sSide),
    dt = handleDir(tSide);
  const ax = sx + ds.x * stub,
    ay = sy + ds.y * stub,
    bx = tx + dt.x * stub,
    by = ty + dt.y * stub;
  const dx = bx - ax,
    dy = by - ay,
    adx = Math.abs(dx),
    ady = Math.abs(dy),
    gx = Math.sign(dx),
    gy = Math.sign(dy);
  const pts = [
    [sx, sy],
    [ax, ay],
  ];
  const horizontalFirst = sSide === 'left' || sSide === 'right';
  if (horizontalFirst) {
    if (adx >= ady) pts.push([bx - gx * ady, ay]);
    else pts.push([ax + gx * adx, ay + gy * adx]);
  } else {
    if (ady >= adx) pts.push([ax, by - gy * adx]);
    else pts.push([ax + gx * ady, ay + gy * ady]);
  }
  pts.push([bx, by], [tx, ty]);
  return 'M ' + pts.map((p) => p.join(' ')).join(' L ');
}
function MetroEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style }) {
  const d = octiPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, 20);
  const toIdea = data?.toIdea;
  const inChain = data?.inChain;
  const stroke = inChain ? '#E8A317' : toIdea ? '#2e2d33' : data.color;
  const width = inChain ? 9 : toIdea ? 7.2 : 8;
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinejoin="round"
      strokeLinecap={toIdea ? 'round' : 'butt'}
      strokeDasharray={toIdea ? '1 13' : undefined}
      opacity={style?.opacity ?? 0.7}
    />
  );
}
const edgeTypes = { metro: MetroEdge };

/* ── Order-ring underlay ── */
function OrderRings({ radii, maxOrder }) {
  const maxR = radii[maxOrder] + 260;
  return (
    <ViewportPortal>
      <div className="fsd-rings" style={{ position: 'absolute', left: -maxR, top: -maxR, width: maxR * 2, height: maxR * 2 }}>
        <svg width={maxR * 2} height={maxR * 2} viewBox={`${-maxR} ${-maxR} ${maxR * 2} ${maxR * 2}`}>
          {Array.from({ length: maxOrder }, (_, i) => i + 1).map((o) => (
            <g key={o}>
              <circle cx="0" cy="0" r={radii[o]} fill="none" stroke="#D2CABA" strokeWidth={3} strokeDasharray="10 14" opacity={1 - o * 0.12} />
              <text x="0" y={-radii[o] - 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="34" letterSpacing="6" fill="#8A8576">
                {o}° {ORDER_NAMES[o]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </ViewportPortal>
  );
}

/* Ring radii for display — same bands the layout uses (count-aware). */
function displayRadii() {
  const byOrder = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of consequences) byOrder[c.order]++;
  const bands = { 1: 720, 2: 1340, 3: 2020, 4: 2720, 5: 3420 };
  const radii = {};
  for (let o = 1; o <= 5; o++) {
    const needed = (byOrder[o] * (280 + 120) * 0.9) / (2 * Math.PI);
    radii[o] = Math.max(bands[o] * 0.9, needed);
  }
  return radii;
}

/* ── STEEPLE coverage radar ── */
function CoverageRadar({ counts }) {
  const cx = 110,
    cy = 90,
    R = 58;
  const maxC = Math.max(1, ...STEEPLE_ORDER.map((k) => counts[k] || 0));
  const ang = (i) => ((-90 + i * (360 / 7)) * Math.PI) / 180;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const rings = [0.25, 0.5, 0.75, 1].map((f) => STEEPLE_ORDER.map((_, i) => pt(i, R * f).join(',')).join(' '));
  const dataPts = STEEPLE_ORDER.map((k, i) => pt(i, R * ((counts[k] || 0) / maxC)));
  return (
    <svg className="fsd-radar" width="220" height="178" viewBox="0 0 220 178" aria-label="STEEPLE coverage radar">
      {rings.map((r, idx) => (
        <polygon key={idx} points={r} fill="none" stroke="#e8e3d7" strokeWidth="1" />
      ))}
      {STEEPLE_ORDER.map((k, i) => {
        const [x, y] = pt(i, R);
        const [lx, ly] = pt(i, R + 12);
        return (
          <g key={k}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#efebe0" strokeWidth="1" />
            <text x={lx} y={ly + 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em' }} fill={CAT[k].c}>
              {CAT[k].abbr}
            </text>
          </g>
        );
      })}
      <polygon points={dataPts.map((p) => p.join(',')).join(' ')} fill="rgba(21,20,15,0.10)" stroke="#15140f" strokeWidth="2" strokeLinejoin="round" />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={CAT[STEEPLE_ORDER[i]].c} stroke="#fff" strokeWidth="1.3" />
      ))}
    </svg>
  );
}

/* ── Left rail: summary + STEEPLE coverage (rows are the category filter) ── */
function Rail({ counts, total, active, toggle }) {
  const thin = STEEPLE_ORDER.filter((k) => (counts[k] || 0) <= 1).length;
  return (
    <nav className="fsd-rail" aria-label="Map summary">
      <div className="fsd-rail-eyebrow">◦ Foresight map</div>
      <div className="fsd-rail-title">{scenario.input.title}</div>

      <div className="fsd-rail-sec">
        <div className="fsd-rail-sechead">
          <span>Generation Progress</span>
          <span style={{ color: '#8a8576', fontWeight: 600 }}>4/4</span>
        </div>
        <div className="fsd-progress-track">
          <div className="fsd-progress-fill" style={{ width: '100%' }} />
        </div>
        <div className="fsd-progress-note">Analysis complete ({total} consequences)</div>
      </div>

      <div className="fsd-rail-sec">
        <div className="fsd-rail-sechead">
          <span>STEEPLE Coverage</span>
          {thin > 0 && <span className="fsd-thinchip">{thin} thin</span>}
        </div>
        <CoverageRadar counts={counts} />
        <div>
          {STEEPLE_ORDER.map((k) => (
            <button key={k} type="button" className="fsd-catrow" aria-pressed={active.has(k)} onClick={() => toggle(k)}>
              <span className="fsd-catdot" style={{ background: CAT[k].c }} />
              <span className="fsd-catname">{CAT[k].label}</span>
              {(counts[k] || 0) <= 1 && <span className="fsd-thinchip">THIN</span>}
              <span className="fsd-catn">{counts[k] || 0}</span>
            </button>
          ))}
        </div>
        <div className="fsd-railhint">Click a category to filter the map.</div>
      </div>
    </nav>
  );
}

/* ── The map ── */
function ScenarioMap() {
  const [selected, setSelected] = useState(null);
  const [activeCats, setActiveCats] = useState(() => new Set(STEEPLE_ORDER));
  const [rfi, setRfi] = useState(null);
  const canvasRef = useRef(null);

  // React Flow's fitView runs once at init; if the container hasn't been sized
  // yet (client:only mount, or an operator that lays out after hydration), the
  // fit is computed against a zero-size box and the map lands off-screen. Refit
  // whenever the canvas actually has/gets dimensions.
  useEffect(() => {
    if (!rfi || !canvasRef.current) return;
    const fit = () => {
      try {
        rfi.fitView({ padding: 0.12, duration: 0 });
      } catch {
        /* instance not ready */
      }
    };
    fit();
    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [rfi]);

  const radii = useMemo(displayRadii, []);
  const maxOrder = useMemo(() => Math.max(...consequences.map((c) => c.order)), []);
  const counts = useMemo(() => {
    const m = {};
    for (const k of STEEPLE_ORDER) m[k] = 0;
    for (const c of consequences) if (c.nodeType !== 'action') m[c.category] = (m[c.category] || 0) + 1;
    return m;
  }, []);
  const consequenceCount = useMemo(() => consequences.filter((c) => c.nodeType !== 'action').length, []);

  const basePositions = useMemo(() => {
    const pos = computeRadialLayout(consequences, undefined, true);
    return resolveCollisions(pos, consequences);
  }, []);

  const chainIds = useMemo(() => {
    if (!selected) return new Set();
    const lookup = new Map(consequences.map((c) => [c.id, c]));
    const chain = new Set(['seed']);
    let cur = selected;
    while (cur && cur !== 'seed') {
      chain.add(cur);
      cur = lookup.get(cur)?.parentIds[0];
    }
    return chain;
  }, [selected]);

  const positions = useMemo(() => {
    if (selected) return computeFocusPositions(selected, chainIds, consequences, basePositions);
    return basePositions;
  }, [selected, chainIds, basePositions]);

  const isDim = useCallback((c) => c.nodeType !== 'action' && !activeCats.has(c.category), [activeCats]);

  const buildNodes = useCallback(
    () => [
      { id: 'seed', type: 'seed', position: positions.get('seed'), draggable: false, data: { selected: selected === 'seed' } },
      ...consequences.map((c) => ({
        id: c.id,
        type: c.nodeType === 'action' ? 'action' : 'consequence',
        position: positions.get(c.id),
        data: { c, dim: isDim(c), selected: selected === c.id, chain: chainIds.has(c.id) },
      })),
    ],
    [positions, isDim, selected, chainIds],
  );

  const buildEdges = useCallback(() => {
    const edges = [];
    const lookup = new Map(consequences.map((c) => [c.id, c]));
    for (const c of consequences) {
      for (const parent of c.parentIds) {
        if (!positions.has(parent)) continue;
        const { sourceHandle, targetHandle } = getOptimalHandles(positions.get(parent), positions.get(c.id));
        const inChain = chainIds.has(c.id) && chainIds.has(parent) && c.parentIds[0] === parent;
        const toIdea = c.nodeType === 'action';
        const off = isDim(c) || (lookup.get(parent) && isDim(lookup.get(parent)));
        edges.push({
          id: `${parent}->${c.id}`,
          source: parent,
          target: c.id,
          sourceHandle,
          targetHandle,
          type: 'metro',
          zIndex: inChain ? 5 : 0,
          data: { color: CAT[c.category].c, toIdea, inChain },
          style: { opacity: off ? 0.05 : inChain ? 0.95 : 0.6 },
        });
      }
    }
    return edges;
  }, [positions, chainIds, isDim]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges] = useEdgesState(buildEdges());

  useEffect(() => {
    setNodes(buildNodes());
    setEdges(buildEdges());
  }, [buildNodes, buildEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_, node) => {
    setSelected((cur) => (node.id === 'seed' || cur === node.id ? null : node.id));
  }, []);

  const toggleCat = useCallback((key) => {
    setActiveCats((cur) => {
      const next = new Set(cur);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const selectedC = selected ? consequences.find((c) => c.id === selected) : null;

  return (
    <div className="fsdemo">
      <Rail counts={counts} total={consequenceCount} active={activeCats} toggle={toggleCat} />

      <div className="fsd-canvas" ref={canvasRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onInit={setRfi}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.04}
          maxZoom={1.4}
          nodesConnectable={false}
          proOptions={{ hideAttribution: false }}
        >
          <OrderRings radii={radii} maxOrder={maxOrder} />
          <Controls showInteractive={false} position="bottom-left" style={{ bottom: 14 }} />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeStrokeWidth={0}
            nodeColor={(n) => catColor(n.id)}
            maskColor="rgba(21,20,15,0.06)"
            style={{ width: 150, height: 108 }}
          />
        </ReactFlow>

        {!selected && <div className="fsd-hint">CLICK A CARD — ITS CAUSAL CHAIN STRAIGHTENS INTO A BEAM</div>}

        {selectedC && (
          <div className="fsd-detail" role="dialog" aria-label="Node detail">
            <button type="button" className="fsd-detail-close" onClick={() => setSelected(null)} aria-label="Close detail">
              ✕
            </button>
            {selectedC.nodeType === 'action' ? (
              <>
                <div className="fsd-detail-head" style={{ color: '#b8780c' }}>
                  <Svg s={13}>{SHIELD}</Svg>
                  <span>{cap(selectedC.stance) || 'Prepare'} · action</span>
                </div>
                <div className="fsd-detail-text" style={{ fontWeight: 800, marginBottom: 2 }}>
                  {selectedC.title}
                </div>
                <div className="fsd-detail-text" style={{ marginTop: 0 }}>
                  {selectedC.text}
                </div>
                <div className="fsd-detail-metrics">
                  <span>{cap(selectedC.effort)} effort</span>
                  <span>·</span>
                  <span className="fa-imp">
                    <Svg s={12}>{SIGNAL.high}</Svg>High impact
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="fsd-detail-head" style={{ color: CAT[selectedC.category].head }}>
                  <Svg s={13}>{CAT_ICON[selectedC.category]}</Svg>
                  <span>{CAT[selectedC.category].label}</span>
                  <span className="fsd-detail-order">
                    {selectedC.order}° {ORDER_NAMES[selectedC.order]}
                  </span>
                </div>
                <div className="fsd-detail-text">{selectedC.text}</div>
                <div className="fsd-detail-metrics">
                  <span>{cap(selectedC.probability)}</span>
                  <span>·</span>
                  <span>{selectedC.timeFrame}</span>
                  <span>·</span>
                  <span className="fa-imp">
                    <Svg s={12}>{SIGNAL[selectedC.importance] || SIGNAL.medium}</Svg>
                    {impLabel(selectedC.importance)}
                  </span>
                </div>
                <div className="fsd-detail-note">
                  FOCUS PATH — ancestors straighten toward the seed; everything else only moves if the beam needs the room.
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FuturescaperDemo() {
  return (
    <DemoFrame title="AGENTS.scn — seed → orders of consequence" label="live" height="clamp(540px, 70vh, 780px)">
      <ReactFlowProvider>
        <ScenarioMap />
      </ReactFlowProvider>
    </DemoFrame>
  );
}
