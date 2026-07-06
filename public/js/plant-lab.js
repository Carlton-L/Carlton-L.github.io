/**
 * PLANT — lab experiment runtime (BEAM phototropism sim).
 *
 * Drawn as the system it actually is — an animated engineering
 * schematic, no pictorial plant: SUN (draggable) → [SOLAR CELL] →
 * [C] storage cap → [TRIG] 1381 → [M] motor → BEND gauge, with the
 * photosensor wires visibly CROSS-WIRED into the motor's direction
 * input (the crossing IS the phototropism; no microcontroller, no
 * code in the real build). RHYTHM rule: needle and motor are
 * dead-still while the cap charges and only move during the ~0.4 s
 * fire — the stillness is the honesty.
 *
 * init() is re-runnable (view-transition safe): bails on missing
 * DOM, guards double-binding, cancels the previous rAF loop; idles
 * while offscreen; reduced-motion = static scene + single re-renders.
 */
window.PlantLab = (function () {
  let raf = 0;

  function init() {
    const cv = document.getElementById('spCv');
    const sunEl = document.getElementById('spSun');
    const capS = document.getElementById('spCapS');
    const capL = document.getElementById('spCapL');
    if (!cv || !sunEl || !capS || !capL) return;
    if (cv.dataset.init) return;          // this DOM is already live
    cv.dataset.init = '1';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }   // stop a loop bound to a previous page's DOM

    const ctx = cv.getContext('2d');
    const telCharge = document.getElementById('spTelCharge');
    const telFires = document.getElementById('spTelFires');
    const telRhythm = document.getElementById('spTelRhythm');
    const telBend = document.getElementById('spTelBend');
    const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const GREEN = '#3dff88', AMBER = '#E69F00';
    const DIM = 'rgba(230,230,226,0.32)';        // passive line-work
    const DIM2 = 'rgba(230,230,226,0.13)';       // texture / hairlines
    const INK = '#9f9f98';                       // label gray
    const BG = '#141317';
    const BURST_S = 0.4;                  // fire duration — the only window anything moves
    const MAX_BEND = 40;                  // mechanical stop, degrees

    /* seeded PRNG (mulberry32) — schematic paper specks identical every load */
    function srnd(s) {
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const rnd = srnd(808);
    const specks = [];
    for (let i = 0; i < 26; i++) specks.push({ nx: rnd(), ny: rnd() * 0.5, a: 0.05 + rnd() * 0.08 });

    /* ---- state ---- */
    let W = 0, H = 0;                     // canvas CSS size
    const sun = { nx: 0.66, ny: 0.15 };   // normalized so resize doesn't teleport it
    let intensity = 0.7;                  // from #spSun
    let capSize = 1;                      // SMALL=1, LARGE=2.6 charge units
    let stored = REDUCED ? 0.62 : 0.1;    // charge units in the cap
    let bend = REDUCED ? 12 : 0;          // accumulated bend, degrees — frozen between bursts
    let burst = null;                     // { t, from, to } while firing, else null
    let glow = 0;                         // fire flash, 0..1
    let fires = 0, fireTimes = [];        // for the rhythm telemetry
    let simT = 0;
    let flowPhase = 0;                    // cell→cap dash offset; advances with charge rate
    let rotor = REDUCED ? 0.6 : 0, rotorBase = REDUCED ? 0.6 : 0;  // motor shaft angle, frozen between fires

    /* charge trace: rolling sawtooth strip, sampled at 20 Hz */
    const TN = 120;
    const trace = [];
    for (let i = 0; i < TN; i++) trace.push(REDUCED ? (i % 30) / 30 : 0);
    let sampleAcc = 0;

    /* ---- schematic geometry: one rail, left→right, gauge at the end ---- */
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function geo() {
      const ry = H * 0.62;
      return {
        ry,
        cell: { x: W * 0.115, y: ry, w: Math.max(44, W * 0.09), h: Math.max(26, H * 0.07) },
        cap: { x: W * 0.33, y: ry, hp: 20, gap: 14 },
        trig: { x: W * 0.50, y: ry, w: 46, h: 32 },
        mot: { x: W * 0.675, y: ry, r: 15 },
        gauge: { x: W * 0.885, y: ry + 4, r: Math.max(28, Math.min(40, W * 0.058)) },
        ldrL: { x: W * 0.30, y: H * 0.385 },
        ldrR: { x: W * 0.55, y: H * 0.385 },
      };
    }
    /* inverse-square-ish falloff, radius scaled to the canvas */
    function lightAt(x, y) {
      const sx = sun.nx * W, sy = sun.ny * H;
      const R = Math.max(170, W * 0.34), d2 = (x - sx) * (x - sx) + (y - sy) * (y - sy);
      return intensity * (R * R) / (R * R + d2);
    }
    /* the differential: normalized so DIRECTION survives a dim sun, with the
       gain a real comparator pair would need to be decisive */
    function sensorDiff(g) {
      const a = lightAt(g.ldrL.x, g.ldrL.y), b = lightAt(g.ldrR.x, g.ldrR.y);
      return clamp((b - a) / (a + b + 0.0001) * 9, -1, 1);
    }
    /* segment intersection — for placing the CROSS-WIRED label on the crossing */
    function xsect(a, b, c, d) {
      const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - c.x, vy = d.y - c.y;
      const den = ux * vy - uy * vx;
      if (!den) return { x: (a.x + d.x) / 2, y: (a.y + d.y) / 2 };
      const t = ((c.x - a.x) * vy - (c.y - a.y) * vx) / den;
      return { x: a.x + ux * t, y: a.y + uy * t };
    }

    /* ---- controls ---- */
    function readSun() {
      let v = parseFloat(sunEl.value);
      if (isNaN(v)) v = 70;
      intensity = v / 100;
      sunEl.style.setProperty('--p', intensity);
    }
    sunEl.addEventListener('input', () => { readSun(); if (REDUCED) render(1.5); });
    readSun();

    function setCap(large) {
      const frac = stored / capSize;      // swapping caps keeps the charge FRACTION
      capSize = large ? 2.6 : 1;
      stored = frac * capSize;
      capS.classList.toggle('on', !large);
      capL.classList.toggle('on', large);
      if (REDUCED) render(1.5);
    }
    capS.addEventListener('click', () => setCap(false));
    capL.addEventListener('click', () => setCap(true));
    setCap(false);                        // default SMALL

    /* ---- sun drag (pointer events; touch OK) ---- */
    let dragging = false;
    cv.style.touchAction = 'none';
    function evPt(e) {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function moveSun(p) {
      sun.nx = clamp(p.x / W, 0.06, 0.94);
      sun.ny = clamp(p.y / H, 0.06, 0.32);   // upper region only, above the sensors
      if (REDUCED) render(1.5);
    }
    cv.addEventListener('pointerdown', e => {
      const p = evPt(e), sx = sun.nx * W, sy = sun.ny * H;
      if (Math.hypot(p.x - sx, p.y - sy) < 32) {
        e.preventDefault(); cv.setPointerCapture(e.pointerId); dragging = true; moveSun(p);
      }
    });
    cv.addEventListener('pointermove', e => { if (dragging) moveSun(evPt(e)); });
    cv.addEventListener('pointerup', () => { dragging = false; });
    cv.addEventListener('pointercancel', () => { dragging = false; });

    /* ---- resize (DPR backing store; everything is fractional so nothing jumps) ---- */
    function resize() {
      const w = cv.clientWidth || 600, h = cv.clientHeight || 450;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (REDUCED) render(1.5);
    }
    new ResizeObserver(resize).observe(cv);
    resize();

    /* ---- idle while offscreen ---- */
    let onscreen = true;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { es.forEach(e => { onscreen = e.isIntersecting; }); }, { rootMargin: '160px' });
      io.observe(cv);
    }

    /* ---- physics: charge → threshold → burst → freeze ---- */
    function step(dt) {
      simT += dt;
      const g = geo();
      const rate = 1.05 * lightAt(g.cell.x, g.cell.y - g.cell.h / 2);  // units/s — sun far or dim = visible stall
      stored += rate * dt;
      flowPhase += rate * 90 * dt;               // dash flow speed ∝ charge rate

      if (!burst && stored >= capSize) {
        stored = 0; fires++;                     // sharp sawtooth drop
        fireTimes.push(simT);
        if (fireTimes.length > 7) fireTimes.shift();
        /* the burst is aimed by the differential AT THE MOMENT OF FIRING —
           between fires the sensors are just passive resistors */
        const d = sensorDiff(g);
        const mag = capSize > 1 ? 18 : 7;        // bigger cap = bigger kick
        burst = { t: 0, from: bend, to: clamp(bend + d * mag, -MAX_BEND, MAX_BEND) };
      }
      if (burst) {
        burst.t += dt;
        const k = Math.min(1, burst.t / BURST_S), e = k * k * (3 - 2 * k);
        bend = burst.from + (burst.to - burst.from) * e;
        rotor = rotorBase + e * Math.PI * 2;     // ~one revolution per fire
        glow = Math.sin(k * Math.PI);
        if (burst.t >= BURST_S) { bend = burst.to; rotorBase = rotor % (Math.PI * 2); rotor = rotorBase; burst = null; glow = 0; }
      }

      sampleAcc += dt;                           // 20 Hz trace sampling
      while (sampleAcc >= 0.05) {
        sampleAcc -= 0.05;
        trace.push(clamp(stored / capSize, 0, 1)); trace.shift();
      }
    }

    /* ---- telemetry ---- */
    function updateTel() {
      if (telCharge) telCharge.textContent = Math.round(clamp(stored / capSize, 0, 1) * 100) + '%';
      if (telFires) telFires.textContent = fires;
      if (telRhythm) {
        let txt = '—';
        if (fireTimes.length >= 2) {
          let sum = 0; for (let i = 1; i < fireTimes.length; i++) sum += fireTimes[i] - fireTimes[i - 1];
          txt = (sum / (fireTimes.length - 1)).toFixed(1) + 's';
        }
        telRhythm.textContent = txt;
      }
      if (telBend) telBend.textContent = (bend > 0 ? '+' : '') + Math.round(bend) + '°';
    }

    /* ---- draw helpers ---- */
    function label(txt, x, y, color, alpha, align) {
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = align || 'left'; ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.fillStyle = color; ctx.fillText(txt, x, y);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    function seg(x1, y1, x2, y2, color, alpha) {
      ctx.strokeStyle = color; ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    function ahead(x, y, ang, s, color, alpha) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = color; ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s, -s * 0.45); ctx.lineTo(-s, s * 0.45); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function dot(x, y, r, color, alpha) {
      ctx.fillStyle = color; ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }

    /* ---- render: the schematic ---- */
    function render(ft) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.setLineDash([]);
      const g = geo();
      const sx = sun.nx * W, sy = sun.ny * H;
      const lp = lightAt(g.cell.x, g.cell.y - g.cell.h / 2);   // light reaching the cell
      const frac = clamp(stored / capSize, 0, 1);

      /* paper specks (seeded) */
      for (let i = 0; i < specks.length; i++) dot(specks[i].nx * W, specks[i].ny * H, 1, DIM, specks[i].a);

      /* sun: draggable disc, sized/haloed by intensity */
      const sr = 10 + intensity * 8;
      const grad = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 4);
      grad.addColorStop(0, 'rgba(230,159,0,' + (0.26 * intensity).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(230,159,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sx, sy, sr * 4, 0, Math.PI * 2); ctx.fill();
      dot(sx, sy, sr, AMBER, 0.35 + intensity * 0.6);
      ctx.strokeStyle = AMBER; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, sr + 5, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      label('SUN · DRAG', sx, sy + sr + 16, INK, 0.8, 'center');

      /* incident rays: three parallel arrows from the sun onto the cell face */
      const c = g.cell, ctop = { x: c.x, y: c.y - c.h / 2 };
      let ux = ctop.x - sx, uy = ctop.y - sy;
      const um = Math.hypot(ux, uy) || 1; ux /= um; uy /= um;
      const px = -uy, py = ux, rayA = 0.12 + lp * 0.72;
      for (let i = -1; i <= 1; i++) {
        const ex = ctop.x + px * i * 10 - ux * 8, eyy = ctop.y + py * i * 10 - uy * 8;
        seg(ex - ux * 22, eyy - uy * 22, ex, eyy, AMBER, rayA); ahead(ex, eyy, Math.atan2(uy, ux), 5, AMBER, rayA);
      }

      /* the rail: cell → cap → trig → motor (passive base wires + junction dots) */
      const capL_ = g.cap.x - g.cap.gap / 2, capR_ = g.cap.x + g.cap.gap / 2;
      const trigL_ = g.trig.x - g.trig.w / 2, trigR_ = g.trig.x + g.trig.w / 2;
      const motL_ = g.mot.x - g.mot.r;
      seg(c.x + c.w / 2, g.ry, capL_, g.ry, DIM);
      seg(capR_, g.ry, trigL_, g.ry, DIM);
      seg(trigR_, g.ry, motL_, g.ry, DIM);
      dot(capL_, g.ry, 1.6, DIM); dot(trigL_, g.ry, 1.6, DIM); dot(motL_, g.ry, 1.6, DIM);

      /* charge flow: moving dashes cell→cap, speed ∝ charge rate (stalls when dim) */
      ctx.save();
      ctx.setLineDash([4, 7]); ctx.lineDashOffset = -flowPhase;
      seg(c.x + c.w / 2, g.ry, capL_, g.ry, GREEN, 0.2 + lp * 0.7);
      ctx.restore();

      /* [SOLAR CELL] rectangle with diagonal hatch, brightness ∝ incident light */
      const cellA = 0.3 + lp * 0.65;
      ctx.strokeStyle = GREEN; ctx.globalAlpha = cellA;
      ctx.strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h); ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h); ctx.clip();
      for (let hx = -c.h; hx < c.w; hx += 8)
        seg(c.x - c.w / 2 + hx, c.y + c.h / 2, c.x - c.w / 2 + hx + c.h, c.y - c.h / 2, GREEN, cellA);
      ctx.restore();
      label('SOLAR CELL', c.x, c.y + c.h / 2 + 14, INK, 1, 'center');

      /* [C] storage cap: two plates, FILL BAR between them = charge level */
      const cp = g.cap;
      seg(capL_, cp.y - cp.hp, capL_, cp.y + cp.hp, DIM);
      seg(capR_, cp.y - cp.hp, capR_, cp.y + cp.hp, DIM);
      const fh = cp.hp * 2 * frac;
      ctx.fillStyle = glow > 0 ? AMBER : GREEN; ctx.globalAlpha = 0.85;
      ctx.fillRect(capL_ + 3, cp.y + cp.hp - fh, cp.gap - 6, fh);
      ctx.globalAlpha = 1;
      label('C', cp.x, cp.y - cp.hp - 8, INK, 1, 'center');
      label(capSize > 1 ? '4700µF' : '1000µF', cp.x, cp.y + cp.hp + 14, INK, 1, 'center');

      /* [TRIG] 1381 voltage trigger: box, level bar, threshold tick at the top */
      const tg = g.trig, tx = tg.x - tg.w / 2, ty = tg.y - tg.h / 2;
      ctx.strokeStyle = glow > 0 ? AMBER : DIM;
      ctx.strokeRect(tx, ty, tg.w, tg.h);
      const lvx = tg.x - 8;
      seg(lvx, ty + 5, lvx, ty + tg.h - 5, DIM2);                        // level track
      seg(lvx, ty + tg.h - 5 - (tg.h - 10) * frac, lvx, ty + tg.h - 5, GREEN, 0.85);
      seg(lvx - 4, ty + 5, lvx + 4, ty + 5, glow > 0 ? AMBER : INK);     // threshold tick
      ctx.beginPath(); ctx.moveTo(tg.x, ty + 8); ctx.lineTo(tg.x + 14, tg.y);   // comparator glyph
      ctx.lineTo(tg.x, ty + tg.h - 8); ctx.closePath(); ctx.strokeStyle = DIM; ctx.stroke();
      label('TRIG', tg.x, ty - 6, INK, 1, 'center');
      label('1381', tg.x, tg.y + tg.h / 2 + 14, INK, 1, 'center');

      /* photosensors + cross-wiring into the motor's direction input.
         Left sensor feeds the RIGHT terminal and vice versa — the crossing
         is the whole trick. The winning sensor's wire pulses during a burst. */
      const m = g.mot;
      const tA = { x: m.x - 6, y: m.y - m.r - 2 }, tB = { x: m.x + 6, y: m.y - m.r - 2 };
      const dir = burst ? (burst.to >= burst.from ? 1 : -1) : 0;
      const aL = 0.22 + (dir < 0 ? glow * 0.65 : 0), aR = 0.22 + (dir > 0 ? glow * 0.65 : 0);
      seg(g.ldrL.x, g.ldrL.y + 7, tB.x, tB.y, dir < 0 ? AMBER : GREEN, aL);
      seg(g.ldrR.x, g.ldrR.y + 7, tA.x, tA.y, dir > 0 ? AMBER : GREEN, aR);
      const xp = xsect({ x: g.ldrL.x, y: g.ldrL.y + 7 }, tB, { x: g.ldrR.x, y: g.ldrR.y + 7 }, tA);
      dot(xp.x, xp.y, 2.2, GREEN, 0.6 + glow * 0.4);
      label('CROSS-WIRED', xp.x, xp.y - 8, INK, 0.9, 'center');
      [{ s: g.ldrL, t: 'LDR L' }, { s: g.ldrR, t: 'LDR R' }].forEach(o => {
        const li = lightAt(o.s.x, o.s.y), a = 0.3 + li * 0.7;
        ctx.fillStyle = BG; ctx.strokeStyle = GREEN; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(o.s.x, o.s.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
        seg(o.s.x - 13, o.s.y - 13, o.s.x - 7, o.s.y - 7, AMBER, a * 0.9);   // incoming-light arrow (LDR glyph)
        ahead(o.s.x - 7, o.s.y - 7, Math.PI / 4, 4, AMBER, a * 0.9); label(o.t, o.s.x, o.s.y + 20, INK, 1, 'center');
      });

      /* [M] motor: circle + shaft line — spins ~one rev during the burst, else frozen */
      ctx.strokeStyle = burst ? AMBER : DIM;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
      const rx = Math.cos(rotor), ry2 = Math.sin(rotor), rl = m.r - 4;
      seg(m.x - rx * rl, m.y - ry2 * rl, m.x + rx * rl, m.y + ry2 * rl, burst ? AMBER : GREEN, burst ? 0.95 : 0.55);
      dot(m.x + rx * rl, m.y + ry2 * rl, 2, burst ? AMBER : GREEN, burst ? 1 : 0.55);
      label('M', m.x, m.y - m.r - 8, INK, 1, 'center'); label('MOTOR', m.x, m.y + m.r + 14, INK, 1, 'center');

      /* mechanical link → BEND gauge */
      const ga = g.gauge, lx0 = m.x + m.r + 3, lx1 = ga.x - ga.r - 8;
      seg(lx0, g.ry - 1.5, lx1, g.ry - 1.5, DIM); seg(lx0, g.ry + 1.5, lx1, g.ry + 1.5, DIM);
      ahead(lx1 + 5, g.ry, 0, 6, burst ? AMBER : DIM, burst ? 1 : 0.9); label('MECH', (lx0 + lx1) / 2, g.ry - 8, INK, 0.75, 'center');

      /* BEND gauge: arc dial ±40°, needle stepped only during bursts */
      const SW = 0.92;                             // sweep each side, rad
      ctx.strokeStyle = DIM;
      ctx.beginPath(); ctx.arc(ga.x, ga.y, ga.r, -Math.PI / 2 - SW, -Math.PI / 2 + SW); ctx.stroke();
      [-40, 0, 40].forEach(t => {
        const a = -Math.PI / 2 + (t / MAX_BEND) * SW;
        seg(ga.x + Math.cos(a) * ga.r, ga.y + Math.sin(a) * ga.r, ga.x + Math.cos(a) * (ga.r + 5), ga.y + Math.sin(a) * (ga.r + 5), DIM);
      });
      label('-40', ga.x - ga.r - 4, ga.y - ga.r * 0.35, INK, 0.7, 'right'); label('+40', ga.x + ga.r + 4, ga.y - ga.r * 0.35, INK, 0.7);
      const na = -Math.PI / 2 + (bend / MAX_BEND) * SW;
      ctx.lineWidth = 1.5;
      seg(ga.x, ga.y, ga.x + Math.cos(na) * (ga.r - 6), ga.y + Math.sin(na) * (ga.r - 6), burst ? AMBER : GREEN, 0.95);
      ctx.lineWidth = 1; dot(ga.x, ga.y, 2.5, DIM);
      label((bend > 0 ? '+' : '') + Math.round(bend) + '°', ga.x, ga.y + 16, GREEN, 0.9, 'center'); label('BEND', ga.x, ga.y + 28, INK, 1, 'center');

      /* FIRE: amber pulse travels cap → trig → motor during the burst */
      if (burst) {
        const k = Math.min(1, burst.t / BURST_S);
        const pxl = capR_ + (motL_ - capR_) * k;
        seg(Math.max(capR_, pxl - 22), g.ry, pxl, g.ry, AMBER, 0.6); dot(pxl, g.ry, 3.5, AMBER);
      }

      /* engine strip: rolling sawtooth trace — the oscilloscope of the rhythm */
      const eyy2 = H - 34;
      label('SOLAR ENGINE · CHARGE', 14, eyy2 - 10, INK);
      label('FIRE', 14, eyy2 + 6, AMBER, 0.12 + glow * 0.88);
      const tx0 = Math.max(200, W * 0.28), tx1 = W - 14;
      ctx.setLineDash([2, 4]); seg(tx0, eyy2 - 18, tx1, eyy2 - 18, DIM2); ctx.setLineDash([]);   // threshold line

      ctx.strokeStyle = GREEN; ctx.globalAlpha = 0.65;
      ctx.beginPath();
      for (let i = 0; i < TN; i++) {
        const x = tx0 + (tx1 - tx0) * i / (TN - 1), y = eyy2 + 10 - trace[i] * 28;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;

      updateTel();
    }

    /* ---- main loop (skipped entirely under reduced motion) ---- */
    if (REDUCED) {
      render(1.5);                        // static mid-charge scene; interactions re-render above
      return;
    }
    let lastT = performance.now();
    function loop(now) {
      if (!onscreen) { lastT = now; raf = requestAnimationFrame(loop); return; }
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      step(dt);
      render(now / 1000);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  return { init };
})();
