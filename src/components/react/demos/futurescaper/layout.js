/**
 * layout.js — Futurescaper's REAL layout functions.
 *
 * Ported 1:1 from the Futurescaper product (`frontend/src/layout.ts`,
 * 2026-07-03). Futurescaper is ruled PUBLIC by Futurity — extraction is
 * allowed. TypeScript annotations became JSDoc; logic is untouched.
 *
 * The algorithm is NOT force-directed: orders are hard radial constraints
 * (1°–5° = concentric bands), ring radius grows with node count, children
 * stay inside their parent's outward cone, and incremental adds fill the
 * largest angular gap — so existing nodes never move when new ones arrive.
 * That stability-first behavior is the product's core layout argument.
 *
 * `naiveForceLayout` at the bottom is PORTFOLIO-OWNED (not product code):
 * a deliberately generic force simulation used by the demo's comparison
 * toggle to show what foresight data looks like without the real layout.
 */

/** Node size multiplier by importance (from the product's types.ts). */
export const IMPORTANCE_SIZES = { critical: 1.4, high: 1.2, medium: 1.0, low: 0.8 };

// Radial band ranges: [minRadius, baseRadius] per order.
const ORDER_BANDS = {
  1: { min: 580, base: 720 },
  2: { min: 1120, base: 1340 },
  3: { min: 1720, base: 2020 },
  4: { min: 2380, base: 2720 },
  5: { min: 3080, base: 3420 },
};

const NODE_WIDTH = 280; // actual card width
const MIN_ARC_SPACING = 120; // gap between neighbouring cards on a ring

const SPACING_MULTIPLIERS = { concise: 0.9, detailed: 1.4 };

/**
 * Computes radial positions for consequence nodes.
 * @param {Array} consequences - all consequences to lay out
 * @param {Map<string,{x:number,y:number}>} [existingPositions] - already-placed nodes (incremental adds)
 * @param {boolean} [forceRelayout] - ignore existingPositions and recompute everything
 * @param {'concise'|'detailed'} [verbosity]
 * @returns {Map<string,{x:number,y:number}>} node ID → position (includes 'seed' at origin)
 */
export function computeRadialLayout(consequences, existingPositions, forceRelayout, verbosity) {
  const spacingMul = SPACING_MULTIPLIERS[verbosity || 'concise'];
  const positions = new Map();
  positions.set('seed', { x: 0, y: 0 });

  if (existingPositions && !forceRelayout) {
    existingPositions.forEach((pos, id) => {
      positions.set(id, pos);
    });
  }

  // Unattached nodes (parentIds: []) go in the first ring, clustered together.
  const unattachedNodes = [];
  const connectedConsequences = [];
  for (const c of consequences) {
    if (c.parentIds.length === 0) unattachedNodes.push(c);
    else connectedConsequences.push(c);
  }

  const byOrder = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const c of connectedConsequences) {
    if (byOrder[c.order]) byOrder[c.order].push(c);
  }

  // Dynamic radii based on node count per ring, scaled by verbosity
  const calculateRadius = (nodeCount, band) => {
    if (nodeCount === 0) return band.base * spacingMul;
    const circumferenceNeeded = nodeCount * (NODE_WIDTH + MIN_ARC_SPACING) * spacingMul;
    const radiusFromCircumference = circumferenceNeeded / (2 * Math.PI);
    return Math.max(band.base * spacingMul, radiusFromCircumference);
  };

  const orderRadii = {};
  for (let order = 1; order <= 5; order++) {
    const ringCount = order === 1 ? byOrder[1].length + unattachedNodes.length : byOrder[order].length;
    orderRadii[order] = calculateRadius(ringCount, ORDER_BANDS[order]);
  }

  // ── Order 1: ring around seed ──
  const order1Connected = byOrder[1];
  const order1ConnectedNeedingLayout = order1Connected.filter((c) => !positions.has(c.id));
  const order1ConnectedExisting = order1Connected.filter((c) => positions.has(c.id));
  const unattachedNeedingLayout = unattachedNodes.filter((c) => !positions.has(c.id));

  const totalRingCount = order1Connected.length + unattachedNodes.length;

  if (order1ConnectedNeedingLayout.length > 0 || unattachedNeedingLayout.length > 0) {
    const occupiedAngles = order1ConnectedExisting.map((c) => {
      const pos = positions.get(c.id);
      return Math.atan2(pos.y, pos.x);
    });
    const unattachedExisting = unattachedNodes.filter((c) => positions.has(c.id));
    const unattachedExistingAngles = unattachedExisting.map((c) => {
      const pos = positions.get(c.id);
      return Math.atan2(pos.y, pos.x);
    });

    if (order1ConnectedExisting.length === 0 && unattachedExisting.length === 0) {
      // Fresh layout: connected first, unattached clustered at the end
      const connectedCount = order1ConnectedNeedingLayout.length;
      const radius = orderRadii[1];

      order1ConnectedNeedingLayout.forEach((c, idx) => {
        const angle = (idx / totalRingCount) * 2 * Math.PI - Math.PI / 2;
        positions.set(c.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      });

      unattachedNeedingLayout.forEach((c, idx) => {
        const angle = ((connectedCount + idx) / totalRingCount) * 2 * Math.PI - Math.PI / 2;
        positions.set(c.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      });
    } else {
      // Incremental: use the SAME radius as existing nodes so new nodes
      // appear on the same ring, not closer/further.
      const allExisting = [...order1ConnectedExisting, ...unattachedExisting];
      const existingRadii = allExisting.map((c) => {
        const pos = positions.get(c.id);
        return Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      });
      const existingRadius =
        existingRadii.length > 0 ? existingRadii.reduce((a, b) => a + b, 0) / existingRadii.length : orderRadii[1];
      const radius = existingRadius > 0 ? existingRadius : orderRadii[1];

      const allExistingAngles = [...occupiedAngles, ...unattachedExistingAngles];

      // Place new nodes in the largest angular gaps
      const usedAngles = [...allExistingAngles];
      let newIdx = 0;
      const allNewNodes = [...order1ConnectedNeedingLayout, ...unattachedNeedingLayout];
      allNewNodes.forEach((c) => {
        usedAngles.sort((a, b) => a - b);
        let bestAngle = (newIdx / allNewNodes.length) * 2 * Math.PI - Math.PI / 2; // fallback
        let bestGapSize = 0;

        for (let i = 0; i < usedAngles.length; i++) {
          const current = usedAngles[i];
          const next = i + 1 < usedAngles.length ? usedAngles[i + 1] : usedAngles[0] + 2 * Math.PI;
          const gapSize = next - current;
          if (gapSize > bestGapSize) {
            bestGapSize = gapSize;
            bestAngle = current + gapSize / 2;
          }
        }

        usedAngles.push(bestAngle);
        positions.set(c.id, { x: Math.cos(bestAngle) * radius, y: Math.sin(bestAngle) * radius });
        newIdx++;
      });
    }
  }

  // ── Orders 2-5: positioned relative to parent ──
  for (let order = 2; order <= 5; order++) {
    const orderConsequences = byOrder[order];
    if (orderConsequences.length === 0) continue;

    const needingLayout = orderConsequences.filter((c) => !positions.has(c.id));
    if (needingLayout.length === 0) continue;

    // Group by primary parent (first in parentIds array)
    const byParent = {};
    needingLayout.forEach((c) => {
      const primaryParent = c.parentIds[0] || 'seed';
      if (!byParent[primaryParent]) byParent[primaryParent] = [];
      byParent[primaryParent].push(c);
    });

    // Existing siblings per parent so new children don't land on them
    const existingSiblingsByParent = {};
    orderConsequences
      .filter((c) => positions.has(c.id))
      .forEach((c) => {
        const pid = c.parentIds[0] || 'seed';
        if (!existingSiblingsByParent[pid]) existingSiblingsByParent[pid] = [];
        existingSiblingsByParent[pid].push(c);
      });

    Object.entries(byParent).forEach(([parentId, newChildren]) => {
      const parentPos = positions.get(parentId) || { x: 0, y: 0 };
      const parentAngleFromCenter = Math.atan2(parentPos.y, parentPos.x);

      const existingSiblings = existingSiblingsByParent[parentId] || [];
      const occupiedAngles = existingSiblings.map((sib) => {
        const sibPos = positions.get(sib.id);
        return Math.atan2(sibPos.y - parentPos.y, sibPos.x - parentPos.x);
      });

      const totalChildren = existingSiblings.length + newChildren.length;
      const maxSpread = Math.PI / 2; // 90 degrees max
      const spreadPerChild = Math.min(Math.PI / 6, maxSpread / Math.max(totalChildren, 1));

      if (occupiedAngles.length === 0) {
        // No existing siblings — distribute new children around parent angle
        newChildren.forEach((c, idx) => {
          const centerIdx = (newChildren.length - 1) / 2;
          const offsetFromCenter = idx - centerIdx;
          const angle = parentAngleFromCenter + offsetFromCenter * spreadPerChild;

          const baseDistance = (500 + (order - 2) * 150) * spacingMul;
          const jitter = Math.sin(idx * 7.3) * 30;
          const distance = baseDistance + jitter;

          positions.set(c.id, {
            x: parentPos.x + Math.cos(angle) * distance,
            y: parentPos.y + Math.sin(angle) * distance,
          });
        });
      } else {
        // Place new children adjacent to existing ones, inside the parent's
        // outward cone (±maxSpread) so they never wrap toward the center.
        const allSiblingAngles = [...occupiedAngles].sort((a, b) => a - b);

        const halfSpread = maxSpread;
        const minAllowed = parentAngleFromCenter - halfSpread;
        const maxAllowed = parentAngleFromCenter + halfSpread;

        const usedAngles = [...allSiblingAngles];
        newChildren.forEach((c, idx) => {
          usedAngles.sort((a, b) => a - b);

          let bestAngle;
          const existingInCone = usedAngles.filter((a) => a >= minAllowed && a <= maxAllowed);

          if (existingInCone.length === 0) {
            bestAngle = parentAngleFromCenter + (idx + 1) * spreadPerChild;
          } else {
            const coneAngles = [...existingInCone].sort((a, b) => a - b);
            const withBounds = [minAllowed, ...coneAngles, maxAllowed];
            let bestGapSize = 0;
            bestAngle = parentAngleFromCenter + (idx + 1) * spreadPerChild; // fallback

            for (let i = 0; i < withBounds.length - 1; i++) {
              const gapSize = withBounds[i + 1] - withBounds[i];
              if (gapSize > bestGapSize) {
                bestGapSize = gapSize;
                bestAngle = withBounds[i] + gapSize / 2;
              }
            }
          }

          bestAngle = Math.max(minAllowed, Math.min(maxAllowed, bestAngle));
          usedAngles.push(bestAngle);

          const baseDistance = (500 + (order - 2) * 150) * spacingMul;
          const jitter = Math.sin(idx * 7.3) * 30;
          const distance = baseDistance + jitter;

          positions.set(c.id, {
            x: parentPos.x + Math.cos(bestAngle) * distance,
            y: parentPos.y + Math.sin(bestAngle) * distance,
          });
        });
      }
    });
  }

  return positions;
}

/**
 * Iteratively pushes overlapping nodes apart (in place).
 * @param {Map<string,{x:number,y:number}>} positions - mutated in place
 * @param {Array} consequences - for looking up node sizes
 * @param {number} [iterations=10]
 * @returns {Map<string,{x:number,y:number}>}
 */
export function resolveCollisions(positions, consequences, iterations = 10) {
  const nodeSizes = new Map();
  nodeSizes.set('seed', { w: 300, h: 150 }); // seed node is larger

  for (const c of consequences) {
    nodeSizes.set(c.id, { w: 280, h: 200 }); // cards run up to ~200px tall
  }

  const ids = Array.from(positions.keys());
  const padding = 72; // minimum gap between nodes

  for (let iter = 0; iter < iterations; iter++) {
    let hadOverlap = false;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        const posA = positions.get(idA);
        const posB = positions.get(idB);
        const sizeA = nodeSizes.get(idA) || { w: 220, h: 80 };
        const sizeB = nodeSizes.get(idB) || { w: 220, h: 80 };

        const halfWA = (sizeA.w + padding) / 2;
        const halfHA = (sizeA.h + padding) / 2;
        const halfWB = (sizeB.w + padding) / 2;
        const halfHB = (sizeB.h + padding) / 2;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const overlapX = halfWA + halfWB - Math.abs(dx);
        const overlapY = halfHA + halfHB - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          hadOverlap = true;

          let pushX = 0;
          let pushY = 0;

          if (overlapX < overlapY) {
            pushX = (overlapX / 2) * (dx >= 0 ? 1 : -1);
          } else {
            pushY = (overlapY / 2) * (dy >= 0 ? 1 : -1);
          }

          // Don't move the seed node
          if (idA === 'seed') {
            positions.set(idB, { x: posB.x + pushX * 2, y: posB.y + pushY * 2 });
          } else if (idB === 'seed') {
            positions.set(idA, { x: posA.x - pushX * 2, y: posA.y - pushY * 2 });
          } else {
            positions.set(idA, { x: posA.x - pushX, y: posA.y - pushY });
            positions.set(idB, { x: posB.x + pushX, y: posB.y + pushY });
          }
        }
      }
    }

    if (!hadOverlap) break;
  }

  return positions;
}

/**
 * "Focus path" positions when a node is selected: the ancestor chain
 * straightens into a radial beam; non-chain nodes only get nudged if they
 * overlap the beam. Order-1 nodes never move (disorienting).
 * @param {string} selectedId
 * @param {Set<string>} _ancestorChain - (kept for parity with product signature)
 * @param {Array} consequences
 * @param {Map<string,{x:number,y:number}>} currentPositions
 * @returns {Map<string,{x:number,y:number}>} ALL node IDs → focus positions
 */
export function computeFocusPositions(selectedId, _ancestorChain, consequences, currentPositions) {
  const focusPositions = new Map();

  currentPositions.forEach((pos, id) => focusPositions.set(id, { ...pos }));
  focusPositions.set('seed', { x: 0, y: 0 });

  const selectedPos = currentPositions.get(selectedId);
  if (!selectedPos || selectedId === 'seed') {
    return focusPositions;
  }

  // ── Beam direction: from center toward selected node ──
  const beamAngle = Math.atan2(selectedPos.y, selectedPos.x);
  const beamDirX = Math.cos(beamAngle);
  const beamDirY = Math.sin(beamAngle);

  // ── Ordered ancestor chain (seed → ... → selected) ──
  const chainOrdered = [];
  const consLookup = new Map(consequences.map((c) => [c.id, c]));
  {
    let currentId = selectedId;
    while (currentId && currentId !== 'seed') {
      chainOrdered.unshift(currentId);
      const c = consLookup.get(currentId);
      currentId = c?.parentIds.length ? c.parentIds[0] : undefined;
    }
    chainOrdered.unshift('seed');
  }

  // ── Place chain nodes along the beam ──
  const MIN_CHAIN_SPACING = 200;
  const chainDists = [0]; // seed at distance 0

  for (let i = 1; i < chainOrdered.length; i++) {
    const id = chainOrdered[i];
    const currentPos = currentPositions.get(id);
    if (!currentPos) {
      chainDists.push(chainDists[i - 1] + MIN_CHAIN_SPACING);
      continue;
    }

    const currentDist = Math.sqrt(currentPos.x * currentPos.x + currentPos.y * currentPos.y);
    const prevDist = chainDists[i - 1];
    const enforcedDist = Math.max(currentDist, prevDist + MIN_CHAIN_SPACING);
    chainDists.push(enforcedDist);
  }

  for (let i = 1; i < chainOrdered.length; i++) {
    const id = chainOrdered[i];
    const c = consLookup.get(id);
    const order = c?.order || 1;
    const currentPos = currentPositions.get(id);
    if (!currentPos) continue;

    // Order 1: don't move at all
    if (order === 1) {
      focusPositions.set(id, { ...currentPos });
      continue;
    }

    focusPositions.set(id, {
      x: beamDirX * chainDists[i],
      y: beamDirY * chainDists[i],
    });
  }

  // ── Node sizes for overlap detection ──
  const nodeSizes = new Map();
  nodeSizes.set('seed', { w: 280, h: 120 });
  for (const c of consequences) {
    const importance = c.importance || 'medium';
    const scale = IMPORTANCE_SIZES[importance];
    nodeSizes.set(c.id, { w: 220 * scale + 24, h: 80 * scale + 16 });
  }

  // ── Nudge non-chain nodes that overlap chain nodes (proportional push) ──
  const PADDING = 40;
  const chainIds = new Set(chainOrdered);

  for (const c of consequences) {
    if (chainIds.has(c.id)) continue;

    const nodePos = focusPositions.get(c.id);
    if (!nodePos) continue;
    const nodeSize = nodeSizes.get(c.id) || { w: 220, h: 80 };

    let totalPushX = 0;
    let totalPushY = 0;

    for (const chainId of chainOrdered) {
      const chainPos = focusPositions.get(chainId);
      const chainSize = nodeSizes.get(chainId) || { w: 220, h: 80 };

      const dx = nodePos.x - chainPos.x;
      const dy = nodePos.y - chainPos.y;

      const halfW = (nodeSize.w + chainSize.w + PADDING) / 2;
      const halfH = (nodeSize.h + chainSize.h + PADDING) / 2;

      const overlapX = halfW - Math.abs(dx);
      const overlapY = halfH - Math.abs(dy);

      if (overlapX > 0 && overlapY > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;

        const overlapMag = Math.min(overlapX, overlapY);
        totalPushX += dirX * (overlapMag + PADDING);
        totalPushY += dirY * (overlapMag + PADDING);
      }
    }

    if (totalPushX !== 0 || totalPushY !== 0) {
      focusPositions.set(c.id, {
        x: nodePos.x + totalPushX,
        y: nodePos.y + totalPushY,
      });
    }
  }

  return focusPositions;
}

/**
 * Best source/target handle pair based on relative node positions.
 * @param {{x:number,y:number}} sourcePos
 * @param {{x:number,y:number}} targetPos
 * @returns {{sourceHandle: string, targetHandle: string}}
 */
export function getOptimalHandles(sourcePos, targetPos) {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (angle >= -45 && angle < 45) {
    return { sourceHandle: 'right-source', targetHandle: 'left' };
  } else if (angle >= 45 && angle < 135) {
    return { sourceHandle: 'bottom-source', targetHandle: 'top' };
  } else if (angle >= -135 && angle < -45) {
    return { sourceHandle: 'top-source', targetHandle: 'bottom' };
  } else {
    return { sourceHandle: 'left-source', targetHandle: 'right' };
  }
}

/* ────────────────────────────────────────────────────────────────
 * PORTFOLIO-OWNED from here down — NOT product code.
 * ──────────────────────────────────────────────────────────────── */

/** Deterministic PRNG so the hairball is the same hairball every visit. */
function mulberry32(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deliberately GENERIC force-directed layout (repulsion + edge springs +
 * weak centering), for the demo's "what a naive layout does to this data"
 * comparison toggle. It ignores orders entirely — that's the point.
 * @param {Array} consequences
 * @param {{iterations?: number, seed?: number}} [opts]
 * @returns {Map<string,{x:number,y:number}>}
 */
export function naiveForceLayout(consequences, opts = {}) {
  const { iterations = 260, seed = 42 } = opts;
  const rand = mulberry32(seed);

  const ids = ['seed', ...consequences.map((c) => c.id)];
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;

  // Random init in a modest disc
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = 200 + rand() * 900;
    px[i] = Math.cos(a) * r;
    py[i] = Math.sin(a) * r;
  }

  // Springs along every parent link
  const springs = [];
  for (const c of consequences) {
    const ci = idx.get(c.id);
    const parents = c.parentIds.length ? c.parentIds : ['seed'];
    for (const p of parents) {
      const pi = idx.get(p);
      if (pi !== undefined) springs.push([pi, ci]);
    }
  }

  const REPULSE = 2.4e6;
  const SPRING_K = 0.02;
  const SPRING_REST = 420;
  const CENTER_K = 0.0004;

  const fx = new Float64Array(n);
  const fy = new Float64Array(n);

  for (let it = 0; it < iterations; it++) {
    fx.fill(0);
    fy.fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = px[j] - px[i];
        let dy = py[j] - py[i];
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = rand() - 0.5;
          dy = rand() - 0.5;
          d2 = 1;
        }
        const f = REPULSE / d2;
        const d = Math.sqrt(d2);
        const ux = dx / d;
        const uy = dy / d;
        fx[i] -= ux * f;
        fy[i] -= uy * f;
        fx[j] += ux * f;
        fy[j] += uy * f;
      }
    }

    for (const [a, b] of springs) {
      const dx = px[b] - px[a];
      const dy = py[b] - py[a];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = SPRING_K * (d - SPRING_REST);
      const ux = dx / d;
      const uy = dy / d;
      fx[a] += ux * f;
      fy[a] += uy * f;
      fx[b] -= ux * f;
      fy[b] -= uy * f;
    }

    const cool = 1 - it / iterations;
    const maxStep = 40 * cool + 2;
    for (let i = 1; i < n; i++) {
      // seed (i=0) stays pinned at origin
      fx[i] -= px[i] * CENTER_K * n;
      fy[i] -= py[i] * CENTER_K * n;
      const mag = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i]) || 1;
      const step = Math.min(mag, maxStep);
      px[i] += (fx[i] / mag) * step;
      py[i] += (fy[i] / mag) * step;
    }
  }

  const out = new Map();
  for (let i = 0; i < n; i++) out.set(ids[i], { x: px[i], y: py[i] });
  return out;
}
