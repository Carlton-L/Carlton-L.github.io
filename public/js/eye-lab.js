/**
 * EYE — lab experiment runtime (animatronic eye, CAD design-intent sim).
 *
 * The mechanism this animates was designed in SolidWorks and never fully
 * built — only the eyeball made it off the printer (3-part: shell, iris
 * with 8 triangular cutouts, clear pupil over a 5050 RGB LED). So the sim
 * is honest about what it is: an animation of the DESIGN INTENT, not a
 * recording of hardware. Four servos in the CAD: two point the ball via
 * ball linkages (gaze X/Y); one slides a carriage along two rods, moving
 * both lids toward/away from the eye (toward = closed); one tilts a
 * straight horn with a lid coupled to each end, so the lids FOLLOW
 * vertical gaze the way human lids do. The right panel is that lid drive
 * in side elevation, moving in lockstep with the front view — the front
 * view is what you'd see, the schematic is what the servos do.
 *
 * Gaze moves in SACCADES (quick eased jumps, then dwell) because eyes
 * never drift. Pointer over the canvas takes manual control — still
 * stepped saccadically, never glued to the cursor — and ~3 s of silence
 * hands it back to autonomy. Click/tap = blink: the carriage drives to
 * closed and back while the horn HOLDS, which is exactly how the two lid
 * servos split the work in the CAD.
 *
 * window.EyeLab.init() is re-runnable (view-transition safe): it bails
 * on missing DOM, guards against double-binding, and cancels the
 * previous rAF loop. The loop idles while the canvas is offscreen;
 * reduced-motion gets a static pose where pointer moves and clicks
 * trigger single re-renders (no tremor, no LED cycling).
 */
window.EyeLab = (function () {
  let raf = 0;

  function init() {
    const cv = document.getElementById('eyCv');
    const autoBtn = document.getElementById('eyAuto');
    if (!cv || !autoBtn) return;
    if (cv.dataset.init) return;          // this DOM is already live
    cv.dataset.init = '1';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }   // stop a loop bound to a previous page's DOM

    const ctx = cv.getContext('2d');
    const telGaze = document.getElementById('eyTelGaze');
    const telCar = document.getElementById('eyTelCarriage');
    const telHorn = document.getElementById('eyTelHorn');
    const telLids = document.getElementById('eyTelLids');
    const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const GREEN = '#3dff88', AMBER = '#E69F00', BG = '#141317', DIM = '#9f9f98';
    const GX_DEG = 30, GY_DEG = 24;       // servo travel mapped to display degrees
    const HORN_GAIN = 14;                 // deg of horn per full vertical gaze
    const CAR_BASE = 0.12;                // resting carriage (lids slightly in, never bug-eyed)
    const CLOSE_S = 0.18, OPEN_S = 0.12;  // blink profile

    /* seeded PRNG (mulberry32) — saccade/blink rhythm is identical every load */
    function srnd(s) {
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const rnd = srnd(1123);

    /* ---- state ---- */
    let W = 0, H = 0;
    let simT = 0;
    const gaze = { x: REDUCED ? 0.28 : 0, y: REDUCED ? -0.12 : 0 };  // unit, +y = eye looks down
    let sac = null;                       // { t, dur, fx, fy, tx, ty } while jumping
    let blink = null;                     // { t } while blinking (t < 0 = gap before a double)
    let dblQ = 0;                         // queued second blink
    let autoOn = true;                    // the chip
    let manual = false;                   // pointer has control right now
    let lastInputT = -1e9, lastSacT = -1e9;
    let nextSacAt = 0.6, nextBlinkAt = 2.8;
    const ptr = { x: 0, y: 0 };           // manual gaze target, unit
    let poseClosed = false;               // reduced-motion click toggle

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    /* ---- geometry (recomputed per frame so resize never stales) ---- */
    function geo() {
      const cx = W * 0.32, cy = H * 0.52;
      const R = Math.min(W * 0.26, H * 0.34);
      return { cx, cy, R, div: W * 0.62, sx0: W * 0.665, sx1: W - 18 };
    }

    /* ---- mechanism coupling ----
       aperture comes from the carriage; vertical bias from the horn.
       A blink drives the CARRIAGE to closed and back; the horn holds. */
    function blinkAmt() {
      if (!blink || blink.t < 0) return 0;
      if (blink.t < CLOSE_S) { const k = blink.t / CLOSE_S; return k * k; }        // ease-in close
      const k = clamp((blink.t - CLOSE_S) / OPEN_S, 0, 1);
      return 1 - k * (2 - k);                                                      // ease-out open
    }
    function carriage() { return Math.max(REDUCED && poseClosed ? 1 : CAR_BASE, blinkAmt()); }
    function hornDeg() { return gaze.y * HORN_GAIN; }

    /* ---- behavior ---- */
    function startSac(tx, ty, dur) {
      sac = { t: 0, dur, fx: gaze.x, fy: gaze.y, tx: clamp(tx, -1, 1), ty: clamp(ty, -1, 1) };
      lastSacT = simT;
    }
    function startBlink() { if (!blink) blink = { t: 0 }; }

    function step(dt) {
      simT += dt;

      if (blink) {
        blink.t += dt;
        if (blink.t >= CLOSE_S + OPEN_S) {
          if (dblQ > 0) { dblQ--; blink = { t: -0.1 }; }   // short gap, then the double
          else blink = null;
        }
      }

      /* manual → auto handback after ~3 s of pointer silence */
      if (manual && autoOn && simT - lastInputT > 3) {
        manual = false;
        autoBtn.classList.add('on');
        nextSacAt = simT + 0.3 + rnd() * 0.8;
      }

      if (sac) {
        sac.t += dt;
        const k = Math.min(1, sac.t / sac.dur), e = k * k * (3 - 2 * k);
        gaze.x = sac.fx + (sac.tx - sac.fx) * e;
        gaze.y = sac.fy + (sac.ty - sac.fy) * e;
        if (k >= 1) sac = null;
      } else if (manual) {
        /* saccadic pursuit: re-target in ~120 ms hops, never glue to the cursor */
        if (Math.hypot(ptr.x - gaze.x, ptr.y - gaze.y) > 0.045 && simT - lastSacT > 0.12) {
          startSac(ptr.x, ptr.y, 0.12);
        }
      } else if (autoOn && simT >= nextSacAt) {
        startSac((rnd() * 2 - 1) * 0.85, (rnd() * 2 - 1) * 0.7, 0.08 + rnd() * 0.07);
        nextSacAt = simT + 0.7 + rnd() * 1.8;              // dwell 0.6–2.5 s incl. the jump
      }

      if (!manual && autoOn && simT >= nextBlinkAt) {
        startBlink();
        if (rnd() < 0.22) dblQ = 1;                        // occasional double-blink
        nextBlinkAt = simT + 3 + rnd() * 4;
      }
    }

    /* ---- controls ---- */
    autoBtn.classList.add('on');          // default: autonomous
    autoBtn.addEventListener('click', () => {
      if (REDUCED) return;                // no loop to hand control to
      autoOn = !autoOn;
      manual = !autoOn;                   // OFF = pointer-only; ON = resume now
      autoBtn.classList.toggle('on', autoOn);
      if (autoOn) nextSacAt = simT + 0.2;
    });

    cv.style.touchAction = 'none';
    function unitFromEvent(e) {
      const r = cv.getBoundingClientRect(), g = geo();
      return {
        x: clamp((e.clientX - r.left - g.cx) / (g.R * 1.6), -1, 1),
        y: clamp((e.clientY - r.top - g.cy) / (g.R * 1.6), -1, 1),
      };
    }
    cv.addEventListener('pointermove', e => {
      const u = unitFromEvent(e);
      ptr.x = u.x; ptr.y = u.y;
      lastInputT = simT;
      if (REDUCED) { gaze.x = u.x; gaze.y = u.y; render(0); return; }
      if (!manual) { manual = true; autoBtn.classList.remove('on'); }
    });
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      lastInputT = simT;
      if (REDUCED) { poseClosed = !poseClosed; render(0); return; }
      startBlink();
    });

    /* ---- resize (DPR backing store) ---- */
    function resize() {
      const w = cv.clientWidth || 640, h = cv.clientHeight || 480;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (REDUCED) render(0);
    }
    new ResizeObserver(resize).observe(cv);
    resize();

    /* ---- idle while offscreen ---- */
    let onscreen = true;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { es.forEach(e => { onscreen = e.isIntersecting; }); }, { rootMargin: '160px' });
      io.observe(cv);
    }

    /* ---- telemetry ---- */
    function fmtDeg(v, dec) {
      const s = Math.abs(v).toFixed(dec || 0);
      if (parseFloat(s) === 0) return '0°';
      return (v < 0 ? '−' : '+') + s + '°';
    }
    function updateTel(car) {
      if (telGaze) telGaze.textContent = 'X ' + fmtDeg(gaze.x * GX_DEG) + ' · Y ' + fmtDeg(-gaze.y * GY_DEG);
      if (telCar) telCar.textContent = Math.round(car * 100) + '%';
      if (telHorn) telHorn.textContent = fmtDeg(hornDeg(), 1);
      if (telLids) telLids.textContent = Math.round((1 - car) * 100) + '%';
    }

    /* ---- render helpers ---- */
    function label(txt, x, y, color, alpha) {
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.fillStyle = color;
      ctx.fillText(txt, x, y);
      ctx.globalAlpha = 1;
    }
    function hsla(h, s, l, a) { return 'hsla(' + h.toFixed(0) + ',' + s + '%,' + l + '%,' + a + ')'; }

    function render(ft) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      const g = geo();
      const car = carriage();
      const hue = REDUCED ? 205 : (simT * 14) % 360;       // RGB LED, cycling slowly
      const rot = REDUCED ? 0.35 : simT * 0.06;            // iris cutout wheel, barely turning

      /* dwell tremor: sub-pixel texture, not motion of record */
      const trem = (!sac && !REDUCED) ? 1 : 0;
      const jx = trem * (Math.sin(ft * 11.7) * 0.35 + Math.sin(ft * 23.1) * 0.2);
      const jy = trem * (Math.cos(ft * 13.3) * 0.3 + Math.sin(ft * 19.7) * 0.2);
      const ix = g.cx + gaze.x * g.R * 0.33 + jx;          // iris center — clamped anatomical
      const iy = g.cy + gaze.y * g.R * 0.30 + jy;

      /* panel divider */
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = 'rgba(230,230,226,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.div + 0.5, 18); ctx.lineTo(g.div + 0.5, H - 30); ctx.stroke();
      ctx.setLineDash([]);

      label('FRONT VIEW', 14, 22, DIM);
      label('LID DRIVE · SIDE ELEVATION', g.sx0, 22, DIM);

      /* ============ FRONT VIEW ============ */
      ctx.save();
      ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.clip();

      /* sclera: printed shell, faintly spherical */
      const sg = ctx.createRadialGradient(g.cx - g.R * 0.25, g.cy - g.R * 0.3, g.R * 0.2, g.cx, g.cy, g.R * 1.05);
      sg.addColorStop(0, '#2b2930');
      sg.addColorStop(1, '#1c1a20');
      ctx.fillStyle = sg; ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);

      /* LED behind the pupil: soft glow + the 5050 package square */
      const lg = ctx.createRadialGradient(ix, iy, g.R * 0.04, ix, iy, g.R * 0.55);
      lg.addColorStop(0, hsla(hue, 90, 62, 0.5));
      lg.addColorStop(1, hsla(hue, 90, 62, 0));
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(ix, iy, g.R * 0.55, 0, Math.PI * 2); ctx.fill();
      const sq = g.R * 0.14;
      ctx.fillStyle = hsla(hue, 85, 58, 0.85);
      ctx.fillRect(ix - sq, iy - sq, sq * 2, sq * 2);

      /* iris: annulus with 8 triangular cutouts, sun/turbine pattern —
         the LED leaks through the cutouts, which is the printed part's trick */
      const irisR = g.R * 0.44, pupR = g.R * 0.16;
      ctx.fillStyle = '#38323a';
      ctx.beginPath();
      ctx.arc(ix, iy, irisR, 0, Math.PI * 2);
      ctx.arc(ix, iy, pupR * 1.04, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.strokeStyle = AMBER; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ix, iy, irisR, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      const r1 = g.R * 0.20, r2 = g.R * 0.40, hw = 0.16;
      ctx.fillStyle = hsla(hue, 88, 60, 0.55);
      for (let k = 0; k < 8; k++) {
        const a = rot + k * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1);
        ctx.lineTo(ix + Math.cos(a - hw) * r2, iy + Math.sin(a - hw) * r2);
        ctx.lineTo(ix + Math.cos(a + hw) * r2, iy + Math.sin(a + hw) * r2);
        ctx.closePath(); ctx.fill();
      }

      /* pupil: transparent print, so it IS the LED */
      ctx.fillStyle = hsla(hue, 95, 70, 0.92);
      ctx.beginPath(); ctx.arc(ix, iy, pupR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(ix, iy, pupR * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(ix, iy, pupR, 0, Math.PI * 2); ctx.stroke();

      /* eyelids: aperture from the carriage, vertical bias from the horn —
         gaze down drops the top lid; the bottom lid follows at ~45% */
      const ap = 1 - car;
      const half = g.R * 0.96 * ap;
      const bias = gaze.y * g.R * 0.20;
      const topE = g.cy - half + bias;
      const botE = g.cy + half + bias * 0.45;
      const sag = g.R * 0.12 * ap;                          // lid edge curves over the ball
      ctx.fillStyle = '#1d1c21';
      ctx.beginPath();
      ctx.moveTo(g.cx - g.R - 2, g.cy - g.R - 2);
      ctx.lineTo(g.cx - g.R - 2, topE - sag);
      ctx.quadraticCurveTo(g.cx, topE + sag, g.cx + g.R + 2, topE - sag);
      ctx.lineTo(g.cx + g.R + 2, g.cy - g.R - 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(230,230,226,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(g.cx - g.R - 2, topE - sag);
      ctx.quadraticCurveTo(g.cx, topE + sag, g.cx + g.R + 2, topE - sag);
      ctx.stroke();
      ctx.fillStyle = '#1d1c21';
      ctx.beginPath();
      ctx.moveTo(g.cx - g.R - 2, g.cy + g.R + 2);
      ctx.lineTo(g.cx - g.R - 2, botE + sag);
      ctx.quadraticCurveTo(g.cx, botE - sag, g.cx + g.R + 2, botE + sag);
      ctx.lineTo(g.cx + g.R + 2, g.cy + g.R + 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(g.cx - g.R - 2, botE + sag);
      ctx.quadraticCurveTo(g.cx, botE - sag, g.cx + g.R + 2, botE + sag);
      ctx.stroke();
      ctx.restore();

      /* shell rim */
      ctx.strokeStyle = 'rgba(230,230,226,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;

      /* ============ MECHANISM SCHEMATIC ============ */
      const rx0 = g.sx0, rx1 = g.sx1;
      const ry = H * 0.34, rodGap = 15, bw = 26, bh = rodGap + 12;

      /* two rods */
      ctx.strokeStyle = 'rgba(230,230,226,0.35)';
      ctx.beginPath(); ctx.moveTo(rx0, ry + 0.5); ctx.lineTo(rx1, ry + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx0, ry + rodGap + 0.5); ctx.lineTo(rx1, ry + rodGap + 0.5); ctx.stroke();
      /* rod end stops */
      [rx0, rx1].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x + 0.5, ry - 5); ctx.lineTo(x + 0.5, ry + rodGap + 5); ctx.stroke();
      });

      /* carriage: slides toward the eye (left) to close */
      const trkL = rx0 + 8, trkR = rx1 - 8 - bw;
      const bx = trkR - (trkR - trkL) * car;
      ctx.strokeStyle = GREEN;
      ctx.strokeRect(bx + 0.5, ry - (bh - rodGap) / 2 + 0.5, bw, bh);
      ctx.fillStyle = GREEN; ctx.globalAlpha = 0.12;
      ctx.fillRect(bx, ry - (bh - rodGap) / 2, bw, bh);
      ctx.globalAlpha = 1;
      label('CARRIAGE', rx0, ry - 14, DIM);
      label(Math.round(car * 100) + '%', rx0 + 62, ry - 14, GREEN);
      label('CLOSED', rx0, ry + rodGap + 18, DIM, 0.7);
      label('OPEN', rx1 - 26, ry + rodGap + 18, DIM, 0.7);
      label('◀ TO EYE', rx0, ry + rodGap + 30, AMBER, 0.6);

      /* tilt horn: straight lever, one lid link on each end; angle = gaze coupling */
      const hx = (rx0 + rx1) / 2, hy = H * 0.68;
      const hl = (rx1 - rx0) * 0.42;
      const th = hornDeg() * Math.PI / 180;
      const dx = Math.cos(th) * hl / 2, dy = Math.sin(th) * hl / 2;
      ctx.strokeStyle = 'rgba(230,230,226,0.2)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(hx - hl / 2 - 6, hy + 0.5); ctx.lineTo(hx + hl / 2 + 6, hy + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx - dx, hy - dy); ctx.lineTo(hx + dx, hy + dy); ctx.stroke();
      ctx.lineWidth = 1;
      /* pivot (the servo shaft) */
      ctx.fillStyle = BG; ctx.strokeStyle = 'rgba(230,230,226,0.6)';
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      /* lid links: a lid hangs off each end */
      [[-dx, -dy, 'TOP'], [dx, dy, 'BOT']].forEach(e => {
        const ex = hx + e[0], ey = hy + e[1];
        ctx.strokeStyle = GREEN;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey - 12); ctx.stroke();
        ctx.fillStyle = BG;
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        label(e[2], ex - 9, ey + 16, DIM, 0.7);
      });
      label('TILT HORN', rx0, hy - 26, DIM);
      label(fmtDeg(hornDeg(), 1), rx0 + 64, hy - 26, GREEN);

      /* honesty line — this is the CAD, not the machine */
      label('SIMULATED FROM CAD · ONLY THE EYEBALL WAS PRINTED', 14, H - 12, DIM, 0.75);

      updateTel(car);
    }

    /* ---- main loop (skipped entirely under reduced motion) ---- */
    if (REDUCED) {
      render(0);                          // static pose; interactions re-render above
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
