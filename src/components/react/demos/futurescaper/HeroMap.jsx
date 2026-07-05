/**
 * HeroMap — the product's landing-page hero, ported nearly verbatim.
 *
 * A self-generating consequence map that plays on loop: a seed scenario
 * appears, octilinear "metro" edges draw themselves outward, and STEEPLE-
 * coloured consequence pills cascade in (first order, then second) while a
 * status line and domain legend light up underneath. After a hold it fades
 * and the next scripted scenario begins. Respects prefers-reduced-motion
 * (renders the first scenario fully drawn, no cycling).
 *
 * Ported from futurescaper/frontend/src/pages/landing/{LiveMapHero,MiniMap}.tsx
 * (Futurescaper is public per the Futurity ruling). The SVG primitives are
 * unchanged; Chakra layout wrappers became plain divs and framer-motion is
 * used directly (already a portfolio dependency).
 *
 * Embed with client:only="react".
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import DemoFrame from '../_shared/DemoFrame.jsx';
import { PLACED_SCENARIOS, MAP_W, MAP_H, octiPath, EDGE_DRAW_DUR, SEED } from './liveMapData.js';

const HOLD_MS = 3400;
const FADE_MS = 480;

/* Wong STEEPLE palette + sentiment encodings (identical to the product). */
const STEEP = {
  social: '#CC79A7',
  technological: '#56B4E9',
  economic: '#E69F00',
  environmental: '#009E73',
  political: '#D55E00',
  legal: '#007CBF',
  ethical: '#F0E442',
};
const SENT = {
  positive: { bg: '#16A34A', label: 'Positive' },
  negative: { bg: '#DC2626', label: 'Negative' },
  neutral: { bg: '#64748B', label: 'Neutral' },
};
const GLYPH = {
  positive: ['M7 7h10v10', 'M7 17 17 7'],
  negative: ['m7 7 10 10', 'M17 7v10H7'],
  neutral: ['M4 9.5q2.5-3 5 0t5 0 5 0', 'M4 15.5q2.5-3 5 0t5 0 5 0'],
};
const ALL_CATS = ['social', 'technological', 'economic', 'environmental', 'political', 'legal', 'ethical'];
const PAPER = '#FBFAF7';
const INK = '#2A2A2E';
const catColor = (cat) => STEEP[cat];

/* ── SVG primitives (from MiniMap.tsx) ── */
function SentimentGlyph({ sentiment, size, strokeWidth }) {
  const paths = GLYPH[sentiment] ?? GLYPH.neutral;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
function DotGridDefs({ id = 'hm-dots' }) {
  return (
    <defs>
      <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(42,42,46,0.10)" />
      </pattern>
    </defs>
  );
}
function SeedCard({ title, eyebrow = 'Scenario' }) {
  return (
    <g>
      <foreignObject x={SEED.x} y={SEED.y} width={SEED.w} height={SEED.h} style={{ overflow: 'visible' }}>
        <div
          style={{
            width: SEED.w,
            height: SEED.h,
            boxSizing: 'border-box',
            background: 'radial-gradient(ellipse at center bottom, #3a3a42 0%, #222226 35%, #151419 65%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
            padding: '9px 12px 8px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{eyebrow}</div>
          <div style={{ color: '#fff', fontSize: 11.5, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</div>
        </div>
      </foreignObject>
      {/* Interchange dot as real SVG (Safari mis-positions foreignObject children). */}
      <circle cx={SEED.x + 22} cy={SEED.y} r={6} fill="#fff" stroke="#151419" strokeWidth={4} />
    </g>
  );
}
function MiniCard({ node }) {
  const c = catColor(node.cat);
  const sent = SENT[node.sentiment] ?? SENT.neutral;
  return (
    <foreignObject x={node.x} y={node.y} width={node.w} height={node.h} style={{ overflow: 'visible' }}>
      <div
        style={{
          width: node.w,
          height: node.h,
          boxSizing: 'border-box',
          background: `color-mix(in srgb, ${sent.bg} 15%, #ffffff)`,
          border: `1.5px solid ${c}`,
          borderRadius: node.h / 2,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px 0 11px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
        }}
      >
        <span style={{ color: sent.bg, display: 'inline-flex', flexShrink: 0 }} title={sent.label}>
          <SentimentGlyph sentiment={node.sentiment} size={12} strokeWidth={3.2} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>{node.label}</span>
      </div>
    </foreignObject>
  );
}
function StationRing({ node }) {
  return <circle cx={node.tx} cy={node.ty} r={5.5} fill={PAPER} stroke={catColor(node.cat)} strokeWidth={3} />;
}
function LegendDot({ cat, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(cat), flexShrink: 0 }} />
      {children}
    </span>
  );
}

/* ── One scenario's full generation animation ── */
function ScenarioPlay({ s, animate }) {
  return (
    <g>
      {/* Edges first (under the cards) */}
      {s.nodes.map((n) => (
        <motion.path
          key={`e-${n.id}`}
          d={octiPath(n.sx, n.sy, n.tx, n.ty)}
          fill="none"
          stroke={catColor(n.cat)}
          strokeWidth={5}
          strokeLinecap="butt"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={
            animate
              ? {
                  pathLength: { delay: n.edgeDelay, duration: EDGE_DRAW_DUR, ease: 'easeInOut' },
                  opacity: { delay: n.edgeDelay, duration: 0.12 },
                }
              : { duration: 0 }
          }
        />
      ))}

      {/* Seed card */}
      <motion.g
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={animate ? { delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      >
        <SeedCard title={s.seedTitle} />
      </motion.g>

      {/* Consequence pills + station rings */}
      {s.nodes.map((n) => (
        <motion.g
          key={`n-${n.id}`}
          initial={animate ? { opacity: 0, y: 7 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={animate ? { delay: n.nodeDelay, duration: 0.4, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        >
          <StationRing node={n} />
          <MiniCard node={n} />
        </motion.g>
      ))}
    </g>
  );
}

/* ── Status line: "Mapping…" → summary ── */
function StatusLine({ s, animate }) {
  const [done, setDone] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setDone(true), s.total * 1000);
    return () => clearTimeout(t);
  }, [s, animate]);

  const domains = new Set(s.nodes.map((n) => n.cat)).size;

  return (
    <div className="fsd-hero-status">
      {done ? (
        <span>
          {s.nodes.length} consequences · {domains} domains
        </span>
      ) : (
        <>
          <span className="fsd-hero-pulse" />
          <span>Mapping consequences…</span>
        </>
      )}
    </div>
  );
}

/* ── The looping generative map panel ── */
function GenerativeMapPanel() {
  const reduced = useReducedMotion() ?? false;
  const [idx, setIdx] = useState(0);
  const s = PLACED_SCENARIOS[idx % PLACED_SCENARIOS.length];

  useEffect(() => {
    if (reduced) return;
    const cycle = s.total * 1000 + HOLD_MS + FADE_MS;
    const t = setTimeout(() => setIdx((i) => (i + 1) % PLACED_SCENARIOS.length), cycle);
    return () => clearTimeout(t);
  }, [idx, s, reduced]);

  const animate = !reduced;

  return (
    <div className="fsd-hero-panel">
      <div className="fsd-hero-svgwrap">
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={false} exit={animate ? { opacity: 0, transition: { duration: FADE_MS / 1000 } } : undefined}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Animated example of a consequence map being generated">
              <DotGridDefs />
              <rect width={MAP_W} height={MAP_H} fill="url(#hm-dots)" />
              <ScenarioPlay s={s} animate={animate} />
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar: status + STEEPLE legend lighting up as domains appear */}
      <div className="fsd-hero-bar">
        <AnimatePresence mode="wait">
          <motion.div key={`st-${idx}`} initial={false} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
            <StatusLine s={s} animate={animate} />
          </motion.div>
        </AnimatePresence>
        <div className="fsd-hero-legend">
          {ALL_CATS.map((cat) => {
            const t = s.catTimes[cat];
            return (
              <motion.span
                key={`${idx}-${cat}`}
                className="lg"
                initial={animate ? { opacity: 0.3 } : false}
                animate={{ opacity: t !== undefined ? 1 : 0.3 }}
                transition={animate && t !== undefined ? { delay: t, duration: 0.3 } : { duration: 0 }}
              >
                <LegendDot cat={cat}>{cat.slice(0, 4)}</LegendDot>
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HeroMap() {
  return (
    <DemoFrame title="live_map — self-generating consequence map" label="live" fill={false}>
      <div className="fsd-hero">
        <GenerativeMapPanel />
      </div>
    </DemoFrame>
  );
}
