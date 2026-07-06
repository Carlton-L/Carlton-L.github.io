/**
 * FastHero — the FAST subject page, composed and self-playing.
 *
 * The opener for the case study (the equivalent of Futurescaper's HeroMap):
 * a miniature of the real subject-page hero composition — the knowledge graph
 * as the ground layer, a floating glass identity card, and the three strategic
 * index cards (Horizon Rank / White Space / Tech Transfer) — that traverses
 * itself on a loop. It reuses the same synthetic network the interactive demo
 * uses (src/data/demos/fast-network.js), so the hero and the live demo tell one
 * continuous story. Portfolio-owned; FAST is recreated-only.
 */
import { useEffect, useRef, useState } from 'react';
import { NETWORKS, START, NODE_TYPE_COLORS, INDEX_META } from '../../../../data/demos/fast-network.js';
import './fast.css';

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeRng(s) {
  let seed = s >>> 0 || 1;
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export default function FastHero() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({ nodes: [], links: [], cx: 0, cy: 0 });
  const [focus, setFocus] = useState(START);
  const [phase, setPhase] = useState('idle'); // idle → selecting → traversing
  const [selId, setSelId] = useState(null);
  const [fade, setFade] = useState(0);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  const data = NETWORKS[focus];
  /* null indices = the product's N/A state (not yet computed) */
  const hero = data.meta.indices;

  /* build + settle a compact layout for the current subject */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.clientWidth || 900;
    const h = wrap.clientHeight || 460;
    const rng = makeRng(4242);
    const cx = w / 2;
    const cy = h / 2;
    const nodes = data.nodes.map((n, i) => {
      const a = rng() * Math.PI * 2;
      /* seed near the type's band — nucleus (papers/patents) / ring (orgs/press) / cloud (subjects) */
      const band = i === 0 ? 0 : (BAND[n.type] || 0.6) * Math.min(w, h) * 0.5;
      const r = band * (0.75 + rng() * 0.4);
      return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0, rad: 4 + (n.size || 1) * 2, focus: i === 0 };
    });
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links = data.links.map((l) => ({ s: byId[l.source], t: byId[l.target] })).filter((l) => l.s && l.t);
    const st = { nodes, links, cx, cy };
    for (let i = 0; i < 220; i++) step(st, w, h);
    stateRef.current = st;
    setFade(0);
  }, [focus]);

  /* scripted auto-traversal: pick a traversable neighbor, pulse, then move */
  useEffect(() => {
    if (REDUCED) return;
    let cancelled = false;
    const run = async () => {
      await wait(1600);
      if (cancelled) return;
      const cur = NETWORKS[focusRef.current];
      const target = cur.nodes.find(
        (n) => n.type === 'Subject' && n.to && NETWORKS[n.to] && NETWORKS[n.to].meta.type === 'Subject'
      );
      if (!target) return;
      setSelId(target.id);
      setPhase('selecting');
      await wait(1700);
      if (cancelled) return;
      setPhase('traversing');
      await wait(700);
      if (cancelled) return;
      setSelId(null);
      setPhase('idle');
      setFocus(target.to);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  /* render loop */
  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const st = stateRef.current;
      if (canvas && wrap && st.nodes.length) {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          canvas.style.width = w + 'px';
          canvas.style.height = h + 'px';
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!REDUCED) step(st, w, h);
        setFade((f) => (f < 1 ? Math.min(1, f + 0.05) : 1));
        ctx.clearRect(0, 0, w, h);
        const t = performance.now() / 1000;
        for (const l of st.links) {
          const on = selId && (l.s.id === selId || l.t.id === selId);
          ctx.strokeStyle = on ? 'rgba(61,255,136,0.5)' : 'rgba(150,150,150,0.18)';
          ctx.lineWidth = on ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(l.s.x, l.s.y);
          ctx.lineTo(l.t.x, l.t.y);
          ctx.stroke();
        }
        for (const n of st.nodes) {
          const isSel = n.id === selId;
          const pulse = isSel ? 1 + Math.sin(t * 4) * 0.18 : 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.rad * pulse, 0, Math.PI * 2);
          ctx.fillStyle = NODE_TYPE_COLORS[n.type] || NODE_TYPE_COLORS.default;
          ctx.fill();
          if (isSel) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [selId]);

  const selNode = data.nodes.find((n) => n.id === selId);

  return (
    <div ref={wrapRef} className="fgd-wrap fh-wrap">
      <canvas ref={canvasRef} className="fgd-canvas" style={{ opacity: 0.55 + fade * 0.45 }} />

      {/* glass identity card — the real subject-page hero card, miniaturized */}
      <div className="fh-card" key={focus}>
        <div className="fh-eyebrow">SUBJECT</div>
        <div className="fh-name">{data.meta.label}</div>
        <div className="fh-summary">{data.meta.summary}</div>
        <div className="fh-chips">
          {INDEX_META.map((m) => (
            <span key={m.key} className="fh-chip">
              <span className="fh-chip-dot" style={{ background: hero ? m.color : 'rgba(255,255,255,0.25)' }} />
              {m.abbr} {hero ? hero[m.key].toFixed(1) : 'N/A'}
            </span>
          ))}
        </div>
      </div>

      {/* three index cards, product parity */}
      <div className="fh-indexes">
        {INDEX_META.map((m) => (
          <div className="fh-index" key={m.key} style={{ borderTopColor: hero ? m.color : 'rgba(255,255,255,0.25)' }}>
            <div className="fh-index-val" style={{ color: hero ? m.color : 'rgba(255,255,255,0.45)', fontSize: hero ? undefined : '14px' }}>
              {hero ? hero[m.key].toFixed(1) : 'N/A'}
            </div>
            <div className="fh-index-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* the traverse pill, appearing on cue like the real interaction */}
      {phase !== 'idle' && selNode && (
        <div className="fgd-go fh-go" data-going={phase === 'traversing' ? 'true' : 'false'}>
          Go to {selNode.label} ▸
        </div>
      )}

      <div className="fh-hint">SELF-PLAYING · TRAVERSE THE NETWORK BELOW</div>
    </div>
  );
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* THE SHAPE — Carlton's tuned nucleus / ring / cloud (see FastGraphDemo.jsx) */
const BAND = {
  Paper: 0.34,
  Patent: 0.34,
  Book: 0.4,
  Organization: 0.66,
  Press: 0.66,
  Subject: 0.92,
};
const LEN_BY_TYPE = {
  Paper: 46,
  Patent: 46,
  Book: 54,
  Organization: 92,
  Press: 92,
  Subject: 130,
};

function step(st, w, h) {
  const REP = 2000;
  const SPRING = 0.02;
  const GRAV = 0.012;
  const BAND_K = 0.026;
  const FR = 0.9;
  const R = Math.min(w, h) * 0.5;
  const { nodes, links } = st;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy || 0.01;
      const f = REP / d2;
      const d = Math.sqrt(d2);
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
  }
  for (const l of links) {
    let dx = l.t.x - l.s.x;
    let dy = l.t.y - l.s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const other = l.s.focus ? l.t : l.s;
    const len = LEN_BY_TYPE[other.type] || 80;
    const f = (d - len) * SPRING;
    l.s.vx += (dx / d) * f;
    l.s.vy += (dy / d) * f;
    l.t.vx -= (dx / d) * f;
    l.t.vy -= (dy / d) * f;
  }
  for (const n of nodes) {
    if (n.focus) {
      n.vx += (st.cx - n.x) * 0.08;
      n.vy += (st.cy - n.y) * 0.08;
    } else {
      const dx = n.x - st.cx;
      const dy = n.y - st.cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = (BAND[n.type] || 0.6) * R;
      const f = (target - d) * BAND_K;
      n.vx += (dx / d) * f;
      n.vy += (dy / d) * f;
      n.vx += (st.cx - n.x) * GRAV;
      n.vy += (st.cy - n.y) * GRAV;
    }
    n.vx *= FR;
    n.vy *= FR;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(n.rad + 4, Math.min(w - n.rad - 4, n.x));
    n.y = Math.max(n.rad + 4, Math.min(h - n.rad - 4, n.y));
  }
}
