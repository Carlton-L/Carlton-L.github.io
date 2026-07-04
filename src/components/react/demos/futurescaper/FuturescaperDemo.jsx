/**
 * FuturescaperDemo — the real product's scenario map, live.
 *
 * Layout code is the REAL algorithm extracted from the product (layout.js —
 * Futurescaper is public per Futurity ruling). Rendering is portfolio-owned
 * React + @xyflow/react (the same public library the product uses).
 * Data is a hand-authored synthetic futurescape (ocean plastics, 2040).
 *
 * The comparison toggle is the craft argument: the same data through a naive
 * force-directed layout collapses into a hairball; the real order-constrained
 * radial layout keeps five orders of consequence legible.
 *
 * Embed with client:only="react" (React Flow is DOM-only).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Handle,
  Position,
  ViewportPortal,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './futurescaper.css';

import DemoFrame from '../_shared/DemoFrame.jsx';
import { computeRadialLayout, resolveCollisions, computeFocusPositions, getOptimalHandles, naiveForceLayout } from './layout.js';
import scenario from '../../../../data/demos/futurescaper-ocean-plastics.json';

/* Wong STEEPLE palette — exact data encodings (CLAUDE-DESIGN-SYSTEM.md §3.1).
   Ethical gets its manual light-mode text override. */
const CAT = {
  social: { c: '#CC79A7', label: 'SOCIAL' },
  technological: { c: '#56B4E9', label: 'TECH' },
  economic: { c: '#E69F00', label: 'ECON' },
  environmental: { c: '#009E73', label: 'ENV' },
  political: { c: '#D55E00', label: 'POLITICAL' },
  legal: { c: '#007CBF', label: 'LEGAL' },
  ethical: { c: '#F0E442', label: 'ETHICAL', text: '#8a7d00' },
};
const ORDER_NAMES = { 1: 'DIRECT', 2: 'RIPPLE', 3: 'CASCADE', 4: 'SYSTEMIC', 5: 'EMERGENT' };
const consequences = scenario.consequences;

/* ── Node components ── */

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

function SeedNode() {
  return (
    <div className="fsd-seed">
      <div className="fsd-seed-eyebrow">SEED · 2040</div>
      <div className="fsd-seed-title">{scenario.input.title}</div>
      <FourHandles />
    </div>
  );
}

function ConsequenceNode({ data }) {
  const { c, dim, selected, chain } = data;
  const cat = CAT[c.category];
  const cls = [
    'fsd-card',
    `imp-${c.importance || 'medium'}`,
    dim && 'is-dim',
    selected && 'is-selected',
    !selected && chain && 'is-chain',
    c.importance === 'critical' && 'is-critical',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={{ '--fsd-cat': cat.c, '--fsd-cat-text': cat.text || cat.c }}>
      <div className="fsd-cathead">
        <span>{cat.label}</span>
        <span className="fsd-order">
          {c.order}° {ORDER_NAMES[c.order]}
        </span>
      </div>
      <div className="fsd-text">{c.text}</div>
      <div className="fsd-foot">
        <span className={`fsd-badge sent-${c.sentiment}`}>{c.sentiment}</span>
        {c.probability && <span className={`fsd-badge prob-${c.probability}`}>{c.probability}</span>}
        {c.timeFrame && <span className="fsd-badge meta">{c.timeFrame}</span>}
        {c.importance === 'critical' && <span className="fsd-badge imp-critical">⚑ critical</span>}
      </div>
      <FourHandles />
    </div>
  );
}

function ActionNode({ data }) {
  const { c, dim, selected } = data;
  const cls = ['fsd-action', dim && 'is-dim', selected && 'is-selected'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="fsd-capsule">◆ action</span>
      <div className="fsd-action-title">{c.title}</div>
      <div className="fsd-action-text">{c.text}</div>
      <div className="fsd-foot">
        <span className="fsd-badge">{c.stance}</span>
        <span className="fsd-badge">effort: {c.effort}</span>
      </div>
      <FourHandles />
    </div>
  );
}

const nodeTypes = { seed: SeedNode, consequence: ConsequenceNode, action: ActionNode };

/* ── Order rings underlay (radial mode only) ── */

function OrderRings({ radii }) {
  const maxR = radii[5] + 260;
  return (
    <ViewportPortal>
      <div className="fsd-rings" style={{ position: 'absolute', left: -maxR, top: -maxR, width: maxR * 2, height: maxR * 2 }}>
        <svg width={maxR * 2} height={maxR * 2} viewBox={`${-maxR} ${-maxR} ${maxR * 2} ${maxR * 2}`}>
          {[1, 2, 3, 4, 5].map((o) => (
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

/* Ring radii for display — same math the layout uses (count-aware). */
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

/* ── The map ── */

function ScenarioMap() {
  const [layoutMode, setLayoutMode] = useState('radial');
  const [selected, setSelected] = useState(null);
  const [activeCats, setActiveCats] = useState(() => new Set(Object.keys(CAT)));

  const radii = useMemo(displayRadii, []);

  const basePositions = useMemo(() => {
    if (layoutMode === 'force') return naiveForceLayout(consequences);
    const pos = computeRadialLayout(consequences, undefined, true);
    return resolveCollisions(pos, consequences);
  }, [layoutMode]);

  // Ancestor chain of the selection (primary parents), for beam + highlight
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
    if (selected && layoutMode === 'radial') {
      return computeFocusPositions(selected, chainIds, consequences, basePositions);
    }
    return basePositions;
  }, [selected, layoutMode, chainIds, basePositions]);

  const buildNodes = useCallback(
    () => [
      {
        id: 'seed',
        type: 'seed',
        position: positions.get('seed'),
        draggable: false,
        data: {},
      },
      ...consequences.map((c) => ({
        id: c.id,
        type: c.nodeType === 'action' ? 'action' : 'consequence',
        position: positions.get(c.id),
        data: {
          c,
          dim: !activeCats.has(c.category),
          selected: selected === c.id,
          chain: chainIds.has(c.id),
        },
      })),
    ],
    [positions, activeCats, selected, chainIds],
  );

  const buildEdges = useCallback(() => {
    const edges = [];
    for (const c of consequences) {
      for (const parent of c.parentIds) {
        if (!positions.has(parent)) continue;
        const { sourceHandle, targetHandle } = getOptimalHandles(positions.get(parent), positions.get(c.id));
        const inChain = chainIds.has(c.id) && chainIds.has(parent) && c.parentIds[0] === parent;
        edges.push({
          id: `${parent}→${c.id}`,
          source: parent,
          target: c.id,
          sourceHandle,
          targetHandle,
          style: {
            stroke: inChain ? '#E8A317' : CAT[c.category].c,
            strokeWidth: inChain ? 2.5 : 1.4,
            opacity: !activeCats.has(c.category) ? 0.04 : inChain ? 0.95 : 0.32,
          },
        });
      }
    }
    return edges;
  }, [positions, chainIds, activeCats]);

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.04}
        maxZoom={1.4}
        nodesConnectable={false}
        proOptions={{ hideAttribution: false }}
      >
        {layoutMode === 'radial' && <OrderRings radii={radii} />}
        <Controls showInteractive={false} position="bottom-left" style={{ bottom: 34 }} />
      </ReactFlow>

      {/* STEEPLE filter chips — data encodings, not decoration */}
      <div className="fsd-chips" role="group" aria-label="STEEPLE category filters">
        {Object.entries(CAT).map(([key, cat]) => (
          <button
            key={key}
            type="button"
            className="fsd-chip"
            style={{ '--fsd-chip': cat.c, '--fsd-chip-text': cat.text || '#15140f' }}
            aria-pressed={activeCats.has(key)}
            onClick={() => toggleCat(key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* The craft argument: real layout vs naive force */}
      <div className="fsd-layoutswitch">
        <div className="fsd-seg" role="group" aria-label="Layout comparison">
          <button type="button" aria-pressed={layoutMode === 'radial'} onClick={() => setLayoutMode('radial')}>
            FUTURESCAPER
          </button>
          <button type="button" aria-pressed={layoutMode === 'force'} onClick={() => setLayoutMode('force')}>
            NAIVE FORCE
          </button>
        </div>
        <span className="fsd-layouthint">
          {layoutMode === 'radial' ? 'orders are hard constraints — the map stays a map' : 'same data, generic layout — the hairball'}
        </span>
      </div>

      {!selected && <div className="fsd-hint">CLICK A CARD — ITS CAUSAL CHAIN STRAIGHTENS INTO A BEAM</div>}

      {selectedC && (
        <div className="fsd-detail" role="dialog" aria-label="Node detail">
          <button type="button" className="fsd-detail-close" onClick={() => setSelected(null)} aria-label="Close detail">
            ✕
          </button>
          <div className="fsd-cathead" style={{ color: CAT[selectedC.category].text || CAT[selectedC.category].c }}>
            <span>{CAT[selectedC.category].label}</span>
            <span className="fsd-order">
              {selectedC.order}° {ORDER_NAMES[selectedC.order]}
            </span>
          </div>
          <div className="fsd-text">{selectedC.text}</div>
          <div className="fsd-foot">
            <span className={`fsd-badge sent-${selectedC.sentiment}`}>{selectedC.sentiment}</span>
            {selectedC.probability && <span className={`fsd-badge prob-${selectedC.probability}`}>{selectedC.probability}</span>}
            {selectedC.timeFrame && <span className="fsd-badge meta">{selectedC.timeFrame}</span>}
          </div>
          {layoutMode === 'radial' && (
            <div className="fsd-detail-focusnote">
              FOCUS PATH: ancestors straighten toward the seed; everything else only moves if the beam needs the room.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FuturescaperDemo() {
  return (
    <DemoFrame title="OCEAN.scn — seed → 5 orders of consequence" label="live" height="560px">
      <ReactFlowProvider>
        <ScenarioMap />
      </ReactFlowProvider>
    </DemoFrame>
  );
}
