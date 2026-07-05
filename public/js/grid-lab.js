/**
 * GRID — lab experiment runtime (kinetic light sim).
 *
 * Ported verbatim from the grid-3d-studio prototype (three.js r128 +
 * postprocessing 6.22.2, both loaded from CDN by the lab page's
 * bootstrap script just before this file). One shared state drives two
 * views that live in two separate operators on /lab:
 *   #device   — the controller app schematic (grid_ctrl op)
 *   #viewcard — the live 3D studio preview   (grid_view op)
 *
 * window.GridLab.init() is re-runnable (view-transition safe): it
 * cancels the previous rAF loop and re-binds to the fresh DOM. The
 * loop idles while both views are offscreen.
 */
window.GridLab = (function () {
  let raf = 0;

  function init() {
    const device = document.getElementById('device');
    const canvas = document.getElementById('gl');
    const viewcard = document.getElementById('viewcard');
    if (!device || !canvas || !viewcard || !window.THREE) return;
    if (device.dataset.init) return;      // this DOM is already live
    device.dataset.init = '1';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }   // stop a loop bound to a previous page's DOM

    /* ==================================================================
       SHARED STATE — one grid, two views (schematic + 3D)
       ================================================================== */
    const N = 4, CELLS = N * N;
    const BG = [70, 67, 62], HI = [247, 244, 238];
    const MOTION = ['Wave', 'Ripple', 'Fireplace', 'Noise'];
    const SETPOINTS = { Full: () => Array(CELLS).fill(1), Night: () => Array(CELLS).fill(0.15), Off: () => Array(CELLS).fill(0) };

    /* default scene: everything parked at zero — the lamp is off until
       the visitor sculpts (matches how the hardware would power up) */
    let base = Array(CELLS).fill(0);
    let display = base.slice();          // after Range remap — what's sent to the lamp
    let actual = display.slice();        // simulated motor position (lags targets)
    let floorV = 0, ceilV = 1;
    let fam = 'static', mode = 'Wave', setpoint = 'Custom';
    let speed = 0.2, tMotion = 0;

    /* ---- white temperature (Hue-style tunable white, dual-channel LEDs) ----
       The slider sets the CEILING color temp (2700–6500 K). The floor is
       always the 1800 K ember — the blackbody coupling is the product's
       signature, so a cylinder's temp = lerp(1800 K, sliderK, level). */
    let tempT = (3800 - 2700) / 3800;             // default 3800 K · 0 = 2700 K … 1 = 6500 K
    const EMBER_K = 1800;
    function sliderK() { return 2700 + tempT * 3800; }
    /* warmth clings to the low end: level^1.5 means a half-raised cylinder is
       still well into ember territory, and only the top of the travel reaches
       the ceiling temp. Device rule: Night caps the ceiling at 2700 K — but
       the cap EASES there (capKCur, advanced in the main loop) so switching
       setpoints fades the color the way firmware would, instead of snapping. */
    let capKCur = 3800;
    function targetCapK() {
      return (fam === 'static' && setpoint === 'Night') ? Math.min(sliderK(), 2700) : sliderK();
    }
    function cellK(level) {
      const t = Math.pow(Math.max(0, level), 1.5);
      return EMBER_K + (capKCur - EMBER_K) * t;
    }

    /* Kelvin → RGB via a hand-tuned palette. The 1800→2700 K leg is the
       original amber→candle ramp (the look that matched the render); above
       that it continues to neutral and cool white. Pure blackbody math made
       2700 K read beige — tuned anchors keep the warm end creamy. */
    const TEMP_STOPS = [
      [1800, 255, 70, 18],     // ember
      [2700, 255, 236, 190],   // candle warm-white (the original ramp top)
      [4000, 255, 249, 238],   // neutral warm
      [6500, 216, 229, 255],   // cool daylight
    ];
    function kelvinToRGB(k) {
      k = Math.max(TEMP_STOPS[0][0], Math.min(TEMP_STOPS[TEMP_STOPS.length - 1][0], k));
      let a = TEMP_STOPS[0], b = TEMP_STOPS[TEMP_STOPS.length - 1];
      for (let s = 0; s < TEMP_STOPS.length - 1; s++) {
        if (k >= TEMP_STOPS[s][0] && k <= TEMP_STOPS[s + 1][0]) { a = TEMP_STOPS[s]; b = TEMP_STOPS[s + 1]; break; }
      }
      const t = (k - a[0]) / (b[0] - a[0] || 1);
      return [(a[1] + (b[1] - a[1]) * t) / 255, (a[2] + (b[2] - a[2]) * t) / 255, (a[3] + (b[3] - a[3]) * t) / 255];
    }

    /* ---- press & hold sculpting (touch-to-raise / quick re-hold reverses) ----
       A short press is a TAP: one discrete 10 mm step, so tapping a pad always
       visibly moves the cylinder (a sub-250ms hold used to move ~nothing —
       dead-feeling on touch). Consecutive taps keep stepping the SAME way;
       the quick-re-press reversal only applies after a hold. Steps bounce off
       the travel limits so a tap is never a no-op. */
    const HOLD_RATE = 0.55;          // level units per second while held
    const REHOLD_MS = 700;           // quick re-hold window → invert direction
    const TAP_MS = 250;              // press shorter than this = a tap (one step)
    const hold = { active: false, i: -1, dir: 1, t0: 0 };
    const lastRelease = Array(CELLS).fill(-1e9);
    const lastDir = Array(CELLS).fill(-1);   // so first-ever hold raises
    const lastWasTap = Array(CELLS).fill(false);

    function startHold(i) {
      if (fam !== 'static') return;
      const now = performance.now();
      hold.dir = (now - lastRelease[i] < REHOLD_MS)
        ? (lastWasTap[i] ? lastDir[i] : -lastDir[i])   // taps accumulate; holds reverse
        : 1;
      hold.active = true; hold.i = i; hold.t0 = now;
      markHoldVisual(i, hold.dir);
    }
    function endHold() {
      if (!hold.active) return;
      const now = performance.now();
      const span = (ceilV - floorV) || 1;
      const isTap = now - hold.t0 < TAP_MS;
      const cur = Math.max(0, Math.min(1, (actual[hold.i] - floorV) / span));
      if (isTap) {
        // one 10 mm step (level is 0..1 of TRAVEL cm); bounce at the ends
        const step = 1 / TRAVEL;
        let nxt = Math.max(0, Math.min(1, cur + hold.dir * step));
        if (Math.abs(nxt - cur) < step * 0.5) {
          hold.dir = -hold.dir;
          nxt = Math.max(0, Math.min(1, cur + hold.dir * step));
        }
        base[hold.i] = nxt;
      } else {
        /* jog semantics: release = STOP. While held, the target runs ahead so
           the motor cruises at full speed; on release the target is pulled
           back to wherever the motor actually is (inverse of the Range remap),
           so the cylinder brakes instead of chasing a stale command. */
        base[hold.i] = cur;
      }
      lastRelease[hold.i] = now;
      lastDir[hold.i] = hold.dir;
      lastWasTap[hold.i] = isTap;
      markHoldVisual(-1, 0);
      hold.active = false; hold.i = -1;
      detectSetpoint();
    }
    function markHoldVisual(i, dir) {
      circles.forEach((c, k) => {
        c.classList.toggle('holding', k === i && dir > 0);
        c.classList.toggle('lowering', k === i && dir < 0);
      });
    }

    /* ==================================================================
       SCHEMATIC (controller card)
       ================================================================== */
    const circles = [];
    for (let i = 0; i < CELLS; i++) {
      const cell = document.createElement('div'); cell.className = 'cell';
      const c = document.createElement('div'); c.className = 'circle';
      c.addEventListener('pointerdown', e => {
        if (fam !== 'static') return;
        e.preventDefault(); c.setPointerCapture(e.pointerId);
        startHold(i);
      });
      c.addEventListener('pointerup', endHold);
      c.addEventListener('pointercancel', endHold);
      cell.appendChild(c); device.appendChild(cell); circles.push(c);
    }

    function paintCircle(el, v) {
      // schematic stays fundamentally brightness; a subtle tint hints at temp
      const [tr, tg, tb] = kelvinToRGB(cellK(v));
      const gr = r => BG[r] + (HI[r] - BG[r]) * v;
      const m = 0.24;   // tint mix
      const r = Math.round(gr(0) * (1 - m) + tr * 255 * v * m + BG[0] * m * (1 - v));
      const g = Math.round(gr(1) * (1 - m) + tg * 255 * v * m + BG[1] * m * (1 - v));
      const b = Math.round(gr(2) * (1 - m) + tb * 255 * v * m + BG[2] * m * (1 - v));
      el.style.background = `rgb(${r},${g},${b})`;
    }

    /* The schematic is a READOUT of the lamp, not an echo of the command:
       circles paint from `actual` (the simulated motor positions), so the
       app agrees with the 3D view while cylinders travel. A cell whose
       target differs from its position gets .moving — a pulsing rim, the
       app's "in transit" feedback (the real product needs the same). */
    const telAvg = document.getElementById('telAvg');
    const telK = document.getElementById('telK');
    const telMove = document.getElementById('telMove');
    const telMode = document.getElementById('telMode');
    function updateTelMode() {
      if (telMode) telMode.textContent = fam === 'static'
        ? 'STATIC · ' + setpoint.toUpperCase()
        : 'MOTION · ' + (mode || '').toUpperCase();
    }
    function paintDOM() {
      let movingN = 0;
      for (let i = 0; i < CELLS; i++) {
        paintCircle(circles[i], actual[i]);
        const mv = Math.abs(display[i] - actual[i]) > 0.015;
        circles[i].classList.toggle('moving', mv);
        if (mv) movingN++;
      }
      const a = actual.reduce((s, v) => s + v, 0) / CELLS;
      document.getElementById('avg').textContent = 'avg ' + Math.round(a * 100) + '%';
      document.getElementById('ctemp').textContent = Math.round(cellK(a)) + 'k';
      if (telAvg) telAvg.textContent = Math.round(a * 100) + '%';
      if (telK) telK.textContent = Math.round(cellK(a)) + 'K';
      if (telMove) telMove.textContent = movingN + ' / ' + CELLS;
    }

    /* ---- set-points & saved presets ---- */
    const presetRow = document.getElementById('presets'), saveBtn = document.getElementById('saveBtn');
    function markSetpoint(name) {
      setpoint = name;
      document.querySelectorAll('#setpoints button, #presets button[data-set]')
        .forEach(b => b.classList.toggle('active', b.dataset.set === name));
      saveBtn.classList.toggle('dim', name !== 'Custom');
      updateTelMode();
    }
    function detectSetpoint() {
      const eps = 0.001; let match = 'Custom';
      for (const [name, fn] of Object.entries(SETPOINTS)) {
        const t = fn(); if (base.every((v, i) => Math.abs(v - t[i]) < eps)) { match = name; break; }
      }
      markSetpoint(match);
    }
    document.getElementById('setpoints').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const name = b.dataset.set; if (name === 'Custom') return;
      base = SETPOINTS[name]().slice(); markSetpoint(name);
    });
    /* save the current sculpt as P1–P3 (cycles); saved presets are selectable
       and auto-detected like the named set-points */
    let presetCycle = 0;
    saveBtn.addEventListener('click', () => {
      if (setpoint !== 'Custom') return;
      presetCycle = presetCycle % 3 + 1;
      const name = 'P' + presetCycle, snap = base.slice();
      SETPOINTS[name] = () => snap.slice();
      if (!presetRow.querySelector('[data-set="' + name + '"]')) {
        const b = document.createElement('button'); b.dataset.set = name; b.textContent = name;
        presetRow.appendChild(b);
      }
      markSetpoint(name);
    });
    presetRow.addEventListener('click', e => {
      const b = e.target.closest('button[data-set]'); if (!b) return;
      base = SETPOINTS[b.dataset.set]().slice(); markSetpoint(b.dataset.set);
    });

    /* ---- family / mode ---- */
    const modeSel = document.getElementById('mode');
    MOTION.forEach(p => { const o = document.createElement('option'); o.textContent = p; modeSel.appendChild(o); });
    function updateMotionControls() {
      const stat = fam === 'static';
      document.getElementById('speed').classList.toggle('show', !stat);
      document.getElementById('holdhint').textContent = stat
        ? 'Tap steps 10 mm · hold to jog · quick re-hold reverses'
        : 'Motion running · grid is read-only';
      document.getElementById('vhint').textContent = stat
        ? 'Drag to orbit · scroll to zoom · tap or hold a cylinder to raise it'
        : 'Drag to orbit · scroll to zoom';
      updateTelMode();
    }
    function loadFamily(f) {
      fam = f; endHold();
      const stat = f === 'static';
      document.getElementById('setpoints').style.display = stat ? 'flex' : 'none';
      document.getElementById('presets').style.display = stat ? 'flex' : 'none';
      document.getElementById('modewrap').style.display = stat ? 'none' : 'block';
      device.classList.toggle('readout', !stat);
      if (stat) detectSetpoint(); else mode = modeSel.value || MOTION[0];
      updateMotionControls();
    }
    document.getElementById('seg').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      [...e.currentTarget.children].forEach(x => x.classList.remove('active')); b.classList.add('active');
      loadFamily(b.dataset.fam);
    });
    modeSel.addEventListener('change', e => { mode = e.target.value; updateMotionControls(); });

    /* ---- temperature slider (with detents at common CCTs) ---- */
    (function () {
      const track = document.getElementById('tmpTrack'), k = document.getElementById('tmpKnob'), lab = document.getElementById('tempK');
      const DETENTS = [2700, 3000, 3800, 5000, 6500];
      DETENTS.forEach(d => {
        const s = document.createElement('span'); s.className = 'tdet';
        s.style.left = ((d - 2700) / 3800 * 100) + '%'; track.appendChild(s);
      });
      function set(v) {
        v = Math.max(0, Math.min(1, v));
        let K = 2700 + v * 3800;
        for (const d of DETENTS) { if (Math.abs(K - d) < 90) { K = d; v = (d - 2700) / 3800; break; } }
        tempT = v; k.style.left = (v * 100) + '%'; lab.textContent = Math.round(sliderK()) + 'k';
      }
      set((3800 - 2700) / 3800);
      const start = e => {
        e.preventDefault(); const move = ev => { const p = (ev.touches ? ev.touches[0].clientX : ev.clientX); const r = track.getBoundingClientRect(); set((p - r.left) / r.width); };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up); move(e);
      };
      track.addEventListener('mousedown', start); track.addEventListener('touchstart', start, { passive: false });
    })();

    /* ---- range ---- */
    const rtrack = document.getElementById('rtrack'), rspan = document.getElementById('rspan');
    const hFloor = document.getElementById('hfloor'), hCeil = document.getElementById('hceil');
    function paintLimit() {
      const fp = floorV * 100, cp = ceilV * 100;
      hFloor.style.left = fp + '%'; hCeil.style.left = cp + '%';
      rspan.style.left = fp + '%'; rspan.style.width = (cp - fp) + '%';
      document.getElementById('lfloor').textContent = Math.round(fp);
      document.getElementById('lceil').textContent = Math.round(cp);
    }
    function dragHandle(handle, isFloor) {
      const start = e => {
        e.preventDefault();
        const move = ev => {
          const p = (ev.touches ? ev.touches[0].clientX : ev.clientX); const r = rtrack.getBoundingClientRect();
          let val = Math.max(0, Math.min(1, (p - r.left) / r.width));
          if (isFloor) { floorV = Math.min(val, ceilV - 0.05); } else { ceilV = Math.max(val, floorV + 0.05); } paintLimit();
        };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up);
      };
      handle.addEventListener('mousedown', start); handle.addEventListener('touchstart', start, { passive: false });
    }
    dragHandle(hFloor, true); dragHandle(hCeil, false);

    /* ---- speed ---- */
    (function () {
      const track = document.getElementById('spdTrack'), f = document.getElementById('spdFill'), k = document.getElementById('spdKnob');
      function set(v) { v = Math.max(0, Math.min(1, v)); speed = v; f.style.width = (v * 100) + '%'; k.style.left = (v * 100) + '%'; }
      set(0.2);
      const start = e => {
        e.preventDefault(); const move = ev => { const p = (ev.touches ? ev.touches[0].clientX : ev.clientX); const r = track.getBoundingClientRect(); set((p - r.left) / r.width); };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up); move(e);
      };
      track.addEventListener('mousedown', start); track.addEventListener('touchstart', start, { passive: false });
    })();

    /* ==================================================================
       3D LIVE VIEW — dark, cozy, warm pools of light
       Units: 1 = 1 cm.  Base 27×27×8, pitch 6, cyl Ø5, rest +2.5, travel 11.
       ================================================================== */
    const PITCH = 6, CYL_R = 2.42, BASE_H = 8, REST = 2.5, CYL_LEN = 15;
    let TRAVEL = 11;                 // cm — toggleable: 6 (Stage 1 spec) vs 11 (Build Plan)
    /* motor kinematics: a 28BYJ-48 on a lead screw moves at constant speed
       with short accel ramps (AccelStepper's trapezoidal profile). These are
       the physical dials that map to screw pitch × step rate. */
    const VMAX_CM = 2.8;             // cruise speed, cm/s (2× the first sim — snappier sculpting)
    const ACC_CM = 5.6;              // acceleration, cm/s²
    let vels = new Array(CELLS).fill(0);   // per-column velocity, level-units/s
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;   // (radius-blur works with PCF, not PCFSoft)

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050606);
    scene.fog = new THREE.FogExp2(0x050606, 0.0075);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
    const orbit = { theta: 0.62, phi: 1.02, radius: 58, target: new THREE.Vector3(0, 9.5, 0) };
    function applyCamera() {
      const { theta, phi, radius, target } = orbit;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(target);
    }
    applyCamera();

    /* ---- environment ---- */
    /* almost nothing — the lamp is the only real light source in the room */
    const hemi = new THREE.HemisphereLight(0x15171a, 0x050505, 0.05);
    scene.add(hemi);

    /* the setting: a small table against a near wall — simple and close, so
       the lamp's own light grades softly up the wall and pools on the slab */
    const surfMat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.04, dithering: true });

    /* tabletop — smooth rounded slab, lamp centered on it */
    (function () {
      const W = 52, D = 38, R = 6;
      const s = new THREE.Shape();
      s.moveTo(-W + R, -D);
      s.lineTo(W - R, -D); s.quadraticCurveTo(W, -D, W, -D + R);
      s.lineTo(W, D - R); s.quadraticCurveTo(W, D, W - R, D);
      s.lineTo(-W + R, D); s.quadraticCurveTo(-W, D, -W, D - R);
      s.lineTo(-W, -D + R); s.quadraticCurveTo(-W, -D, -W + R, -D);
      const g = new THREE.ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 3 });
      const m = new THREE.Mesh(g, surfMat(0x1a1613, 0.6));
      m.rotation.x = -Math.PI / 2; m.position.y = -3.5;      // top surface lands at y≈0
      m.receiveShadow = true;
      scene.add(m);
    })();

    /* the wall behind — close enough for the quadrant lights to paint it */
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), surfMat(0x171310, 0.92));
    wall.position.set(0, 58, -52); wall.receiveShadow = true; scene.add(wall);

    /* soft contact shadow under the base — grounds the object */
    (function () {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
      gr.addColorStop(0, 'rgba(0,0,0,0.42)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.18)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.02; scene.add(m);
    })();

    /* ---- base ---- */
    (function () {
      // cylinders reach ±(1.5·pitch + r) = ±11.42; frame extends 5 mm beyond → ±11.92
      // (bevel adds 0.35, so the shape itself stops 0.35 short)
      const s = 1.5 * PITCH + CYL_R + 0.5 - 0.35, r = 2.2;
      const shape = new THREE.Shape();
      shape.moveTo(-s + r, -s);
      shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r);
      shape.lineTo(s, s - r); shape.quadraticCurveTo(s, s, s - r, s);
      shape.lineTo(-s + r, s); shape.quadraticCurveTo(-s, s, -s, s - r);
      shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: BASE_H - 0.6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 4 });
      const mat = new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.82, metalness: 0.1, dithering: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.35;
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
      /* front status dot — barely-there standby glow */
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16),
        new THREE.MeshBasicMaterial({ color: 0x2e3234 }));
      dot.position.set(0, BASE_H * 0.45, s + 0.42); scene.add(dot);
    })();

    /* socket rims */
    const rimGeo = new THREE.TorusGeometry(CYL_R + 0.22, 0.16, 10, 36);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x101213, roughness: 0.85, metalness: 0.08 });
    for (let i = 0; i < CELLS; i++) {
      const x = (i % N - 1.5) * PITCH, z = ((i / N | 0) - 1.5) * PITCH;
      const t = new THREE.Mesh(rimGeo, rimMat);
      t.rotation.x = Math.PI / 2; t.position.set(x, BASE_H + 0.03, z);
      scene.add(t);
    }

    /* ---- glow sprite texture (fake bloom) ---- */
    const glowTex = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.28)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c); return tex;
    })();

    /* ---- the sixteen columns ----
       "Lit from within" without a visible inner object: a fresnel term in the
       emissive shader makes the glow strongest facing the viewer, melting off
       toward the silhouette — frosted plastic scattering an internal source.
       The diffuse is pure black with roughness 1, so room lights contribute
       essentially nothing and the columns never read as reflections — while
       still living on the normal light layer so they can cast soft shadows. */
    const columns = []; const pickMeshes = [];
    const FILLET = 0.7, TOP = -0.3;              // generous fillet; top surface at y=TOP

    /* vertical glow gradient + bead-blast grain */
    const gradTex = (function () {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 256, 0, 0);      // bottom → top
      gr.addColorStop(0, '#ffffff');                        // brightest near the base (LEDs)
      gr.addColorStop(0.55, '#efefef');
      gr.addColorStop(1, '#a8a8a8');                        // gentle falloff at the top
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      for (let k = 0; k < 2600; k++) {                      // clouded, blasted surface
        g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.05) + ')';
        g.fillRect(Math.random() * 64, Math.random() * 256, 1.2, 1.2);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      return t;
    })();

    /* fake subsurface scattering: shape emission by the angle to the viewer */
    function addScatterShader(mat) {
      mat.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           {
             vec3 vdir = normalize( vViewPosition );
             float facing = clamp( abs( dot( normal, vdir ) ), 0.0, 1.0 );
             // soft, even scatter: gentle rim falloff, high floor
             totalEmissiveRadiance *= ( 0.42 + 0.58 * pow( facing, 1.2 ) );
           }`
        );
      };
    }

    /* one continuous profile: wall → fillet arc → flat top. A single surface
       means continuous normals and continuous UVs — no seam ring where the
       fillet meets the top. Profile points are spaced by arc length so the
       emissive gradient flows evenly over the whole shape. */
    const colGeo = (function () {
      const pts = [];
      const wallH = CYL_LEN - FILLET;
      pts.push(new THREE.Vector2(CYL_R, 0));
      for (let k = 1; k <= 24; k++) pts.push(new THREE.Vector2(CYL_R, wallH * k / 24));      // wall
      for (let k = 1; k <= 10; k++) {                                                        // fillet arc
        const a = (Math.PI / 2) * k / 10;
        pts.push(new THREE.Vector2(CYL_R - FILLET + FILLET * Math.cos(a), wallH + FILLET * Math.sin(a)));
      }
      for (let k = 1; k <= 4; k++)                                                           // flat top → center
        pts.push(new THREE.Vector2(Math.max(0.001, (CYL_R - FILLET) * (1 - k / 4)), CYL_LEN));
      return new THREE.LatheGeometry(pts, 64);
    })();
    for (let i = 0; i < CELLS; i++) {
      const x = (i % N - 1.5) * PITCH, z = ((i / N | 0) - 1.5) * PITCH;
      const matShell = new THREE.MeshStandardMaterial({
        color: 0x0f0d0b, roughness: 1.0, metalness: 0.0, dithering: true,   // faint diffuse: neighbors catch each other's glow
        emissive: new THREE.Color(0x000000), emissiveMap: gradTex, emissiveIntensity: 1.0
      });
      addScatterShader(matShell);
      const group = new THREE.Group();
      const body = new THREE.Mesh(colGeo, matShell);
      body.position.y = TOP - CYL_LEN;                   // profile top lands at y=TOP
      body.castShadow = true;
      body.userData.idx = i;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      glow.position.y = -3.2;
      group.add(body, glow);
      group.position.set(x, BASE_H + REST, z);
      scene.add(group);
      columns.push({ group, matShell, glow });
      pickMeshes.push(body);
    }

    /* ---- quadrant point lights (the cozy pools) ---- */
    const qLights = [];
    for (let q = 0; q < 4; q++) {
      const lx = (q % 2 ? 5.5 : -5.5), lz = (q < 2 ? -5.5 : 5.5);
      const L = new THREE.PointLight(0xffaa55, 0, 85, 2);
      L.position.set(lx, BASE_H + 11, lz);
      scene.add(L); qLights.push(L);
    }
    /* soft under-glow that spills onto the desk around the base — this one
       casts the scene's shadows, so raised columns occlude each other's
       light and the object sits believably in the room */
    const spill = new THREE.PointLight(0xff9944, 0, 120, 2);
    spill.position.set(0, BASE_H + 9, 0);
    spill.castShadow = true;
    spill.shadow.mapSize.set(1024, 1024);
    spill.shadow.bias = -0.006;
    spill.shadow.radius = 9;                        // wide, soft penumbra
    spill.shadow.camera.near = 2; spill.shadow.camera.far = 140;
    scene.add(spill);

    /* ---- device-side color: blackbody dimming, ceiling set by the slider ---- */
    function deviceColor(level) {
      // brightness gamma 1.9: slightly gentler than display gamma so the low
      // end still reads as a living ember
      const bright = Math.pow(Math.max(0, level), 1.9);
      const [r, g, b] = kelvinToRGB(cellK(level));
      return { r, g, b, bright };
    }

    /* ---- 3D update per frame ---- */
    function update3D() {
      const qSum = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; // r,g,b,envB per quadrant
      let sumB = 0, sumR = 0, sumG = 0, sumBl = 0;
      for (let i = 0; i < CELLS; i++) {
        const lv = actual[i];
        const col = columns[i];
        col.group.position.y = BASE_H + REST + lv * TRAVEL;
        const { r, g, b, bright } = deviceColor(lv);
        // all luminance lives in the shell's scatter-shaped emission
        // (intensity compensates for the fresnel falloff, ~0.7 average)
        col.matShell.emissive.setRGB(r, g, b);
        col.matShell.emissiveIntensity = bright * 2.3;
        // halo
        col.glow.material.color.setRGB(r, g, b);
        const halo = Math.pow(Math.max(0, lv), 1.5);
        col.glow.material.opacity = halo * HALO_STRENGTH;
        const s = 5.5 + halo * 9;
        col.glow.scale.set(s, s, 1);
        // room response uses a gentler curve than the eye-facing gamma, so
        // even dim embers pool warm light on the desk
        const envB = Math.pow(Math.max(0, lv), 1.3);
        const q = (i % N >= 2 ? 1 : 0) + ((i / N | 0) >= 2 ? 2 : 0);
        qSum[q][0] += r * envB; qSum[q][1] += g * envB; qSum[q][2] += b * envB; qSum[q][3] += envB;
        sumB += envB; sumR += r * envB; sumG += g * envB; sumBl += b * envB;
      }
      for (let q = 0; q < 4; q++) {
        const [r, g, b, bt] = qSum[q]; const n = Math.max(bt, 0.0001);
        qLights[q].color.setRGB(r / n, g / n, b / n);
        qLights[q].intensity = (bt / 4) * 2.3;
      }
      const nAll = Math.max(sumB, 0.0001);
      spill.color.setRGB(sumR / nAll, sumG / nAll, sumBl / nAll);
      spill.intensity = (sumB / CELLS) * 1.9;
    }

    /* ---- orbit + 3D touch-to-raise ---- */
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let dragging = false, holding3D = false, lastPX = 0, lastPY = 0;

    function pickCylinder(e) {
      const r = canvas.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(pickMeshes, false);
      return hits.length ? hits[0].object.userData.idx : -1;
    }
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      const idx = (fam === 'static') ? pickCylinder(e) : -1;
      if (idx >= 0) { holding3D = true; startHold(idx); }
      else {
        dragging = true; canvas.classList.add('grabbing');
        camAnim = null;
        if (autoOrbit) { autoOrbit = false; document.getElementById('orbitBtn').classList.remove('on'); }
      }
      lastPX = e.clientX; lastPY = e.clientY;
    });
    canvas.addEventListener('pointermove', e => {
      if (dragging) {
        orbit.theta -= (e.clientX - lastPX) * 0.005;
        orbit.phi = Math.max(0.32, Math.min(1.42, orbit.phi - (e.clientY - lastPY) * 0.004));
        applyCamera();
      }
      lastPX = e.clientX; lastPY = e.clientY;
    });
    function endPointer() {
      dragging = false; canvas.classList.remove('grabbing');
      if (holding3D) { holding3D = false; endHold(); }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      orbit.radius = Math.max(30, Math.min(130, orbit.radius * (1 + e.deltaY * 0.001)));
      applyCamera();
    }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    /* ---- camera presets, auto-orbit, travel toggle ---- */
    const VIEWS = {
      hero: { theta: 0.62, phi: 1.02, radius: 58 },
      top: { theta: 0.62, phi: 0.30, radius: 62 },
      low: { theta: 0.95, phi: 1.34, radius: 47 }
    };
    let camAnim = null, autoOrbit = false;
    function goView(name) {
      camAnim = { f: { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius }, to: VIEWS[name], t: 0 };
      viewcard.querySelectorAll('.vbtn[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
    }
    viewcard.querySelectorAll('.vbtn[data-view]').forEach(b => b.addEventListener('click', () => goView(b.dataset.view)));
    canvas.addEventListener('dblclick', () => goView('hero'));

    const orbitBtn = document.getElementById('orbitBtn');
    orbitBtn.addEventListener('click', () => {
      autoOrbit = !autoOrbit;
      orbitBtn.classList.toggle('on', autoOrbit);
    });

    function updateTravelNote() {
      const t = (TRAVEL / VMAX_CM + VMAX_CM / ACC_CM).toFixed(1);
      document.getElementById('travelNote').textContent = 'travel ' + (TRAVEL * 10) + ' mm · full stroke ≈' + t + ' s';
    }
    viewcard.querySelectorAll('.vbtn[data-travel]').forEach(b => b.addEventListener('click', () => {
      TRAVEL = parseFloat(b.dataset.travel);
      viewcard.querySelectorAll('.vbtn[data-travel]').forEach(x => x.classList.toggle('on', x === b));
      updateTravelNote();
    }));
    updateTravelNote();

    /* ---- real bloom + depth of field (postprocessing lib), graceful fallback ---- */
    const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let composer = null, BLOOM = false;
    try {
      if (window.POSTPROCESSING) {
        const P = window.POSTPROCESSING;
        const ms = (renderer.capabilities.isWebGL2 && renderer.capabilities.maxSamples) ? Math.min(4, renderer.capabilities.maxSamples) : 0;
        composer = new P.EffectComposer(renderer, { multisampling: ms });
        composer.addPass(new P.RenderPass(scene, camera));
        /* subtle depth of field — focus tracks the lamp, background melts */
        try {
          const dof = new P.DepthOfFieldEffect(camera, {
            focusDistance: 0.02, focalLength: 0.028, bokehScale: 1.6, height: 480
          });
          dof.target = orbit.target;               // stays focused on the lamp
          composer.addPass(new P.EffectPass(camera, dof));
        } catch (e) { console.warn('DoF unavailable', e); }
        const bloom = new P.BloomEffect({
          blendFunction: P.BlendFunction.SCREEN,
          kernelSize: P.KernelSize.HUGE,      // wide, dreamy halo
          luminanceThreshold: 0.18,           // more of the glow participates
          luminanceSmoothing: 0.95,           // very soft threshold knee
          height: 400,                        // lower res = softer spread
          intensity: 1.5
        });
        const fx = [bloom];
        if (!REDUCED) {
          /* fine film grain: breaks up gradient banding and takes the digital
             edge off — skipped when the OS asks for reduced motion */
          const grain = new P.NoiseEffect({ blendFunction: P.BlendFunction.SCREEN, premultiply: true });
          grain.blendMode.opacity.value = 0.22;
          fx.push(grain);
        }
        composer.addPass(new P.EffectPass(camera, ...fx));
        BLOOM = true;
      }
    } catch (e) { composer = null; BLOOM = false; console.warn('bloom unavailable, falling back', e); }
    // with real bloom, the fake sprite halos step way back
    const HALO_STRENGTH = BLOOM ? 0.14 : 0.45;

    function resize() {
      const w = viewcard.clientWidth, h = viewcard.clientHeight;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(viewcard);
    resize();

    /* ---- idle while both operators are offscreen ---- */
    let onscreen = true;
    if ('IntersectionObserver' in window) {
      const seen = new Map();
      const io = new IntersectionObserver((es) => {
        es.forEach(e => seen.set(e.target, e.isIntersecting));
        onscreen = [...seen.values()].some(Boolean);
      }, { rootMargin: '200px' });
      io.observe(viewcard); io.observe(device);
    }

    /* ==================================================================
       MAIN LOOP — motion patterns, holds, remap, DOM + 3D render
       ================================================================== */
    function noiseVal(i, t) { return 0.5 + 0.5 * Math.sin(i * 12.9898 + t * 1.3) * Math.cos(i * 7.233 - t * 0.7); }

    /* Fireplace — a bed of embers with licking flames.
       Three layered oscillators per cell (slow breathing with phase drift,
       mid flicker that travels spatially, fast shimmer), shaped with a power
       curve so cells spend most time as embers and only occasionally flare.
       Each cell's flicker is then mapped into a floor/ceiling band that
       rises toward the middle: the center four cylinders burn tall (the
       heart of the fire), edges lower, corners lowest — a fire-shaped mound
       even in mid-flicker. */
    function fireVal(i, x, y, t) {
      const p1 = (i * 2.399) % 6.283, p2 = (i * 4.412) % 6.283, p3 = (i * 7.151) % 6.283;
      let raw = 0.5
        + 0.27 * Math.sin(t * 1.0 + p1 + 0.9 * Math.sin(t * 0.31 + p2))   // slow breathing
        + 0.17 * Math.sin(t * 2.6 + p2 + x * 0.9 + y * 0.6)               // traveling flicker
        + 0.09 * Math.sin(t * 6.1 + p3);                                  // fast shimmer
      raw = Math.max(0, Math.min(1, raw));
      const shaped = Math.pow(raw, 1.6);
      const d = Math.hypot(x - 1.5, y - 1.5);                     // 0.71 center · 1.58 edge · 2.12 corner
      const heart = Math.max(0, Math.min(1, 1.25 - 0.55 * d));    // 0.86 / 0.38 / 0.08
      const lo = 0.06 + 0.30 * heart;                             // floor: 0.36 / 0.17 / 0.08
      const hi = 0.52 + 0.48 * heart;                             // ceiling: 0.93 / 0.70 / 0.56
      return lo + (hi - lo) * shaped;
    }

    function computeMotion() {
      const t = tMotion;
      for (let i = 0; i < CELLS; i++) {
        const x = i % N, y = (i / N | 0); let v;
        if (mode === 'Wave') { v = 0.5 + 0.5 * Math.sin((x + y) * 1.05 - t * 2); }
        else if (mode === 'Ripple') { const c = (N - 1) / 2; const d = Math.hypot(x - c, y - c); v = 0.5 + 0.5 * Math.cos(d * 1.55 - t * 2.2); }
        else if (mode === 'Fireplace') { v = fireVal(i, x, y, t * 3.2); }
        else { v = noiseVal(i, t * 0.6); }
        base[i] = Math.max(0, Math.min(1, v));
      }
    }

    let lastT = performance.now();
    function loop(now) {
      if (!onscreen) { lastT = now; raf = requestAnimationFrame(loop); return; }
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;

      if (fam === 'motion') { tMotion += dt * (0.03 + Math.pow(speed, 1.8) * 1.0); computeMotion(); }
      // ceiling temperature eases toward its target (slider or Night clamp)
      capKCur += (targetCapK() - capKCur) * Math.min(1, dt * 1.6);
      if (hold.active && fam === 'static') {
        base[hold.i] = Math.max(0, Math.min(1, base[hold.i] + hold.dir * HOLD_RATE * dt));
        detectSetpoint();
      }
      for (let i = 0; i < CELLS; i++) display[i] = floorV + base[i] * (ceilV - floorV);

      paintDOM();

      // simulated motors: trapezoidal profile (AccelStepper-style) — constant
      // cruise speed with accel/decel ramps, in real cm/s mapped to level units
      const vmax = VMAX_CM / TRAVEL, acc = ACC_CM / TRAVEL;
      for (let i = 0; i < CELLS; i++) {
        const target = display[i];
        let pos = actual[i], vel = vels[i];
        const err = target - pos;
        if (Math.abs(err) < 0.003 && Math.abs(vel) < 0.02) { actual[i] = target; vels[i] = 0; continue; }
        const dir = err > 0 ? 1 : -1;
        let a;
        if (vel * dir < 0) { a = -Math.sign(vel) * acc; }                  // moving away: brake
        else {
          const stopDist = (vel * vel) / (2 * acc);
          a = (Math.abs(err) <= stopDist) ? -dir * acc : dir * acc;        // brake to arrive, else accelerate
        }
        vel += a * dt;
        if (vel > vmax) vel = vmax; else if (vel < -vmax) vel = -vmax;
        pos += vel * dt;
        actual[i] = pos; vels[i] = vel;
      }

      update3D();

      // camera: preset tween or slow auto-orbit
      if (camAnim) {
        camAnim.t += dt / 0.7;
        const u = Math.min(1, camAnim.t), e = u * u * (3 - 2 * u);
        orbit.theta = camAnim.f.theta + (camAnim.to.theta - camAnim.f.theta) * e;
        orbit.phi = camAnim.f.phi + (camAnim.to.phi - camAnim.f.phi) * e;
        orbit.radius = camAnim.f.radius + (camAnim.to.radius - camAnim.f.radius) * e;
        applyCamera();
        if (u >= 1) camAnim = null;
      } else if (autoOrbit && !dragging) {
        orbit.theta += dt * 0.07;
        applyCamera();
      }

      if (composer) composer.render(); else renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    const poster = document.getElementById('glposter');
    if (poster) poster.remove();

    loadFamily('static');
    paintLimit();
    raf = requestAnimationFrame(loop);
  }

  return { init };
})();
