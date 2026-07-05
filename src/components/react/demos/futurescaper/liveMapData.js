/**
 * liveMapData — scripted scenarios + deterministic layout/timeline for the
 * self-generating consequence-map hero animation.
 *
 * Ported verbatim (TS → JS) from the Futurescaper product's landing hero
 * (frontend/src/pages/landing/liveMapData.ts). Futurescaper is public per the
 * Futurity ruling — extraction is allowed. Pure data + math, no React.
 *
 * Each scenario is a seed + a small set of hand-written consequences (depth 1
 * and 2) in the STEEPLE palette. placeScenario() arranges them octilinearly
 * (seed left, cascading right) and assigns edge-draw + node-pop delays so the
 * map appears to "generate" itself the way the real product does.
 */

export const LIVE_SCENARIOS = [
  {
    id: 'deepfakes',
    seedTitle: 'Deepfakes become indistinguishable from reality',
    nodes: [
      { id: 'd1', label: 'Video evidence challenged in court', cat: 'legal', sentiment: 'negative' },
      { id: 'd2', label: 'Provenance journalism rises', cat: 'social', sentiment: 'positive' },
      { id: 'd3', label: 'Authentication market booms', cat: 'economic', sentiment: 'positive' },
      { id: 'd4', label: 'Election ad rules tighten', cat: 'political', sentiment: 'neutral' },
      { id: 'd5', label: 'Institutional trust erodes', cat: 'ethical', sentiment: 'negative' },
      { id: 'd6', label: 'Watermarking standards emerge', cat: 'technological', sentiment: 'positive' },
      { id: 'd1a', label: 'Notarized capture hardware', cat: 'technological', sentiment: 'positive', parent: 'd1' },
      { id: 'd3a', label: 'Liability insurance reprices', cat: 'economic', sentiment: 'neutral', parent: 'd3' },
      { id: 'd5a', label: 'In-person verification returns', cat: 'social', sentiment: 'neutral', parent: 'd5' },
      { id: 'd6a', label: 'Detector arms race', cat: 'technological', sentiment: 'negative', parent: 'd6' },
    ],
  },
  {
    id: 'ubi',
    seedTitle: 'Universal basic income implemented nationwide',
    nodes: [
      { id: 'u1', label: 'Entrepreneurship surges', cat: 'economic', sentiment: 'positive' },
      { id: 'u2', label: 'Care work gains status', cat: 'social', sentiment: 'positive' },
      { id: 'u3', label: 'Inflation debate intensifies', cat: 'political', sentiment: 'negative' },
      { id: 'u4', label: 'Automation accelerates', cat: 'technological', sentiment: 'neutral' },
      { id: 'u5', label: 'Means-testing laws repealed', cat: 'legal', sentiment: 'positive' },
      { id: 'u6', label: 'Work ethic redefined', cat: 'ethical', sentiment: 'neutral' },
      { id: 'u7', label: 'Commuting emissions fall', cat: 'environmental', sentiment: 'positive' },
      { id: 'u1a', label: 'Main streets revive', cat: 'social', sentiment: 'positive', parent: 'u1' },
      { id: 'u4a', label: 'Robot tax proposals', cat: 'political', sentiment: 'neutral', parent: 'u4' },
      { id: 'u7a', label: 'Transit demand shifts', cat: 'economic', sentiment: 'neutral', parent: 'u7' },
      { id: 'u2a', label: 'Eldercare quality improves', cat: 'social', sentiment: 'positive', parent: 'u2' },
    ],
  },
  {
    id: 'lab-meat',
    seedTitle: 'Lab-grown meat outprices farming',
    nodes: [
      { id: 'm1', label: 'Methane emissions plummet', cat: 'environmental', sentiment: 'positive' },
      { id: 'm2', label: 'Rural economies restructure', cat: 'economic', sentiment: 'negative' },
      { id: 'm3', label: 'Food labeling wars', cat: 'legal', sentiment: 'negative' },
      { id: 'm4', label: 'Bioreactor capacity races', cat: 'technological', sentiment: 'neutral' },
      { id: 'm5', label: 'Farming identity crisis', cat: 'social', sentiment: 'negative' },
      { id: 'm6', label: 'Agricultural subsidies contested', cat: 'political', sentiment: 'neutral' },
      { id: 'm7', label: 'Animal welfare norms shift', cat: 'ethical', sentiment: 'positive' },
      { id: 'm1a', label: 'Carbon markets reprice', cat: 'economic', sentiment: 'neutral', parent: 'm1' },
      { id: 'm3a', label: 'Trade disputes erupt', cat: 'political', sentiment: 'negative', parent: 'm3' },
      { id: 'm5a', label: 'Land rewilding programs', cat: 'environmental', sentiment: 'positive', parent: 'm5' },
      { id: 'm7a', label: 'Welfare certification booms', cat: 'economic', sentiment: 'positive', parent: 'm7' },
    ],
  },
];

// ── Layout ───────────────────────────────────────────────────────────

export const MAP_W = 940;
export const MAP_H = 600;

/** Seed card geometry (left side, vertically centered). */
export const SEED = { x: 36, y: MAP_H / 2 - 42, w: 188, h: 84 };

const NODE_H = 34;
const D1_X = 372;
const D1_SPACING = 76;
const D1_JITTER = [0, 16, -12, 20, -16, 10, -8];
const EDGE_DUR = 0.55;

export const EDGE_DRAW_DUR = EDGE_DUR;

function cardWidth(label) {
  return Math.min(240, Math.max(132, Math.round(label.length * 6.35) + 58));
}

export function placeScenario(s) {
  const d1 = s.nodes.filter((n) => !n.parent);
  const d2 = s.nodes.filter((n) => n.parent);
  const placed = [];
  const byId = new Map();
  const catTimes = {};

  const seedCY = SEED.y + SEED.h / 2;
  const seedRight = { x: SEED.x + SEED.w, y: seedCY };

  d1.forEach((n, i) => {
    const w = cardWidth(n.label);
    const x = D1_X + (D1_JITTER[i % D1_JITTER.length] ?? 0);
    const cy = seedCY + (i - (d1.length - 1) / 2) * D1_SPACING;
    const edgeDelay = 1.05 + i * 0.26;
    const nodeDelay = edgeDelay + 0.42;
    const p = {
      id: n.id, label: n.label, cat: n.cat, sentiment: n.sentiment, depth: 1,
      x, y: cy - NODE_H / 2, w, h: NODE_H,
      sx: seedRight.x, sy: seedRight.y,
      tx: x, ty: cy,
      edgeDelay, nodeDelay,
    };
    placed.push(p);
    byId.set(n.id, p);
    if (catTimes[n.cat] === undefined || nodeDelay < catTimes[n.cat]) catTimes[n.cat] = nodeDelay;
  });

  const d2Base = 1.05 + d1.length * 0.26 + 0.3;
  d2.forEach((n, j) => {
    const parent = byId.get(n.parent);
    if (!parent) return;
    const w = cardWidth(n.label);
    const parentCY = parent.y + parent.h / 2;
    const dir = parentCY <= seedCY ? -1 : 1;
    const cy = parentCY + dir * 46;
    const x = parent.x + parent.w + 76 + ((j % 3) - 1) * 14;
    const edgeDelay = d2Base + j * 0.24;
    const nodeDelay = edgeDelay + 0.42;
    const p = {
      id: n.id, label: n.label, cat: n.cat, sentiment: n.sentiment, depth: 2,
      x, y: cy - NODE_H / 2, w, h: NODE_H,
      sx: parent.x + parent.w, sy: parentCY,
      tx: x, ty: cy,
      edgeDelay, nodeDelay,
    };
    placed.push(p);
    if (catTimes[n.cat] === undefined || nodeDelay < catTimes[n.cat]) catTimes[n.cat] = nodeDelay;
  });

  const total = Math.max(...placed.map((p) => p.nodeDelay)) + 0.6;
  return { id: s.id, seedTitle: s.seedTitle, nodes: placed, total, catTimes };
}

export const PLACED_SCENARIOS = LIVE_SCENARIOS.map(placeScenario);

// ── Octilinear edge path (right-exit → left-entry) ──
export function octiPath(sx, sy, tx, ty, stub = 22) {
  const ax = sx + stub;
  const bx = tx - stub;
  const dx = bx - ax;
  const dy = ty - sy;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const gx = Math.sign(dx) || 1;
  const gy = Math.sign(dy) || 1;

  const pts = [[sx, sy], [ax, sy]];
  if (adx >= ady) {
    pts.push([bx - gx * ady, sy]);
  } else {
    pts.push([ax + gx * adx, sy + gy * adx]);
  }
  pts.push([bx, ty], [tx, ty]);
  return 'M ' + pts.map(([x, y]) => `${x} ${y}`).join(' L ');
}
