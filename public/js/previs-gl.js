/**
 * PrevisGL — the GRID case study's 3D studio view, repackaged as the
 * work-index preview for grid_lamp (window.PrevisGL).
 *
 * The scene is the same three.js r128 + postprocessing setup as
 * public/js/grid-lab.js — same geometry, materials, fresnel scatter
 * shader, quadrant lights and motor kinematics — minus every control
 * surface: no schematic, no sculpting, no sliders, no camera buttons,
 * no travel toggle. The lamp powers up into the Wave motion pattern
 * and the camera slow-orbits. Self-playing, non-interactive
 * (pointer-events are disabled by the host engine).
 *
 * Lazy-loaded by the shared preview engine (src/lib/previs.js) the
 * first time a work index selects grid_lamp; this file then pulls
 * THREE (required) and POSTPROCESSING (optional — sprite-halo
 * fallback, exactly like the case study) from CDN.
 *
 * API:
 *   PrevisGL.ready(cb)      — load CDN deps; cb(ok) when renderable
 *   PrevisGL.attach(canvas) — build the scene on that canvas → handle
 *   handle.start() / handle.stop() — run / pause the rAF loop
 */
window.PrevisGL = (function () {
  'use strict';

  /* ---------- CDN deps (same steps + versions as grid-lamp.astro) ---------- */
  const CDN = [
    ['THREE', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', true],
    ['POSTPROCESSING', 'https://cdn.jsdelivr.net/npm/postprocessing@6.22.2/build/postprocessing.min.js', false],
  ];
  let state = 0;                 // 0 idle · 1 loading · 2 ready · 3 failed
  const q = [];
  function ready(cb) {
    if (state === 2) { cb(true); return; }
    if (state === 3) { cb(false); return; }
    q.push(cb);
    if (state === 1) return;
    state = 1;
    const finish = ok => { state = ok ? 2 : 3; while (q.length) q.shift()(ok); };
    (function step(i) {
      if (i >= CDN.length) { finish(!!window.THREE); return; }
      if (window[CDN[i][0]]) { step(i + 1); return; }
      const s = document.createElement('script');
      s.src = CDN[i][1];
      s.onload = () => step(i + 1);
      s.onerror = () => { if (CDN[i][2]) finish(false); else step(i + 1); };
      document.head.appendChild(s);
    })(0);
  }

  /* ---------- the scene: a port of grid-lab.js with controls removed ---------- */
  function attach(canvas) {
    if (!window.THREE || !canvas) return null;
    if (canvas._pgl) return canvas._pgl;

    const THREE = window.THREE;
    const N = 4, CELLS = N * N;
    const PITCH = 6, CYL_R = 2.42, BASE_H = 8, REST = 2.5, CYL_LEN = 15, TRAVEL = 6;
    const VMAX_CM = 2.8, ACC_CM = 5.6;
    const SPEED = 0.35;          // page default is 0.2 — nudged so the preview reads at a glance

    let base = new Array(CELLS).fill(0);
    let display = base.slice();
    let actual = base.slice();   // starts parked at zero: columns rise into the wave on first view
    let vels = new Array(CELLS).fill(0);
    let tMotion = 0;

    /* white temperature: the preview runs at the product's default 3800 K
       ceiling; the floor is always the 1800 K ember (blackbody coupling) */
    const CAP_K = 3800, EMBER_K = 1800;
    const cellK = lv => EMBER_K + (CAP_K - EMBER_K) * Math.pow(Math.max(0, lv), 1.5);
    const TEMP_STOPS = [
      [1800, 255, 70, 18],       // ember
      [2700, 255, 236, 190],     // candle warm-white
      [4000, 255, 249, 238],     // neutral warm
      [6500, 216, 229, 255],     // cool daylight
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

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050606);
    scene.fog = new THREE.FogExp2(0x050606, 0.0075);

    const camera = new THREE.PerspectiveCamera(38, 420 / 240, 0.1, 600);
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

    /* ---- environment: the lamp is the only real light source ---- */
    scene.add(new THREE.HemisphereLight(0x15171a, 0x050505, 0.05));
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
      m.rotation.x = -Math.PI / 2; m.position.y = -3.5;
      m.receiveShadow = true;
      scene.add(m);
    })();

    /* the wall behind — the camera's orbit radius keeps it inside */
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), surfMat(0x171310, 0.92));
    wall.position.set(0, 58, -52); wall.receiveShadow = true; scene.add(wall);

    /* soft contact shadow under the base */
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

    /* ---- glow sprite texture (fake-bloom fallback) ---- */
    const glowTex = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.28)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();

    /* vertical glow gradient + bead-blast grain */
    const gradTex = (function () {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 256, 0, 0);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.55, '#efefef');
      gr.addColorStop(1, '#a8a8a8');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      for (let k = 0; k < 2600; k++) {
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
             totalEmissiveRadiance *= ( 0.42 + 0.58 * pow( facing, 1.2 ) );
           }`
        );
      };
    }

    /* one continuous profile: wall → fillet arc → flat top */
    const FILLET = 0.7, TOP = -0.3;
    const colGeo = (function () {
      const pts = [];
      const wallH = CYL_LEN - FILLET;
      pts.push(new THREE.Vector2(CYL_R, 0));
      for (let k = 1; k <= 24; k++) pts.push(new THREE.Vector2(CYL_R, wallH * k / 24));
      for (let k = 1; k <= 10; k++) {
        const a = (Math.PI / 2) * k / 10;
        pts.push(new THREE.Vector2(CYL_R - FILLET + FILLET * Math.cos(a), wallH + FILLET * Math.sin(a)));
      }
      for (let k = 1; k <= 4; k++)
        pts.push(new THREE.Vector2(Math.max(0.001, (CYL_R - FILLET) * (1 - k / 4)), CYL_LEN));
      return new THREE.LatheGeometry(pts, 64);
    })();
    const columns = [];
    for (let i = 0; i < CELLS; i++) {
      const x = (i % N - 1.5) * PITCH, z = ((i / N | 0) - 1.5) * PITCH;
      const matShell = new THREE.MeshStandardMaterial({
        color: 0x0f0d0b, roughness: 1.0, metalness: 0.0, dithering: true,
        emissive: new THREE.Color(0x000000), emissiveMap: gradTex, emissiveIntensity: 1.0
      });
      addScatterShader(matShell);
      const group = new THREE.Group();
      const body = new THREE.Mesh(colGeo, matShell);
      body.position.y = TOP - CYL_LEN;
      body.castShadow = true;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      glow.position.y = -3.2;
      group.add(body, glow);
      group.position.set(x, BASE_H + REST, z);
      scene.add(group);
      columns.push({ group, matShell, glow });
    }

    /* ---- quadrant point lights (the cozy pools) + shadow-casting spill ---- */
    const qLights = [];
    for (let q2 = 0; q2 < 4; q2++) {
      const lx = (q2 % 2 ? 5.5 : -5.5), lz = (q2 < 2 ? -5.5 : 5.5);
      const L = new THREE.PointLight(0xffaa55, 0, 85, 2);
      L.position.set(lx, BASE_H + 11, lz);
      scene.add(L); qLights.push(L);
    }
    const spill = new THREE.PointLight(0xff9944, 0, 120, 2);
    spill.position.set(0, BASE_H + 9, 0);
    spill.castShadow = true;
    spill.shadow.mapSize.set(1024, 1024);
    spill.shadow.bias = -0.006;
    spill.shadow.radius = 9;
    spill.shadow.camera.near = 2; spill.shadow.camera.far = 140;
    scene.add(spill);

    function deviceColor(level) {
      const bright = Math.pow(Math.max(0, level), 1.9);
      const [r, g, b] = kelvinToRGB(cellK(level));
      return { r, g, b, bright };
    }

    function update3D() {
      const qSum = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      let sumB = 0, sumR = 0, sumG = 0, sumBl = 0;
      for (let i = 0; i < CELLS; i++) {
        const lv = actual[i];
        const col = columns[i];
        col.group.position.y = BASE_H + REST + lv * TRAVEL;
        const { r, g, b, bright } = deviceColor(lv);
        col.matShell.emissive.setRGB(r, g, b);
        col.matShell.emissiveIntensity = bright * 2.3;
        col.glow.material.color.setRGB(r, g, b);
        const halo = Math.pow(Math.max(0, lv), 1.5);
        col.glow.material.opacity = halo * HALO_STRENGTH;
        const s = 5.5 + halo * 9;
        col.glow.scale.set(s, s, 1);
        const envB = Math.pow(Math.max(0, lv), 1.3);
        const q3 = (i % N >= 2 ? 1 : 0) + ((i / N | 0) >= 2 ? 2 : 0);
        qSum[q3][0] += r * envB; qSum[q3][1] += g * envB; qSum[q3][2] += b * envB; qSum[q3][3] += envB;
        sumB += envB; sumR += r * envB; sumG += g * envB; sumBl += b * envB;
      }
      for (let q3 = 0; q3 < 4; q3++) {
        const [r, g, b, bt] = qSum[q3]; const n = Math.max(bt, 0.0001);
        qLights[q3].color.setRGB(r / n, g / n, b / n);
        qLights[q3].intensity = (bt / 4) * 2.3;
      }
      const nAll = Math.max(sumB, 0.0001);
      spill.color.setRGB(sumR / nAll, sumG / nAll, sumBl / nAll);
      spill.intensity = (sumB / CELLS) * 1.9;
    }

    /* ---- real bloom + depth of field, graceful fallback ---- */
    const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let composer = null, BLOOM = false;
    try {
      if (window.POSTPROCESSING) {
        const P = window.POSTPROCESSING;
        const ms = (renderer.capabilities.isWebGL2 && renderer.capabilities.maxSamples) ? Math.min(4, renderer.capabilities.maxSamples) : 0;
        composer = new P.EffectComposer(renderer, { multisampling: ms });
        composer.addPass(new P.RenderPass(scene, camera));
        try {
          const dof = new P.DepthOfFieldEffect(camera, {
            focusDistance: 0.02, focalLength: 0.028, bokehScale: 1.6, height: 480
          });
          dof.target = orbit.target;
          composer.addPass(new P.EffectPass(camera, dof));
        } catch (e) { console.warn('DoF unavailable', e); }
        const bloom = new P.BloomEffect({
          blendFunction: P.BlendFunction.SCREEN,
          kernelSize: P.KernelSize.HUGE,
          luminanceThreshold: 0.18,
          luminanceSmoothing: 0.95,
          height: 400,
          intensity: 1.5
        });
        const fx = [bloom];
        if (!REDUCED) {
          const grain = new P.NoiseEffect({ blendFunction: P.BlendFunction.SCREEN, premultiply: true });
          grain.blendMode.opacity.value = 0.22;
          fx.push(grain);
        }
        composer.addPass(new P.EffectPass(camera, ...fx));
        BLOOM = true;
      }
    } catch (e) { composer = null; BLOOM = false; console.warn('bloom unavailable, falling back', e); }
    const HALO_STRENGTH = BLOOM ? 0.14 : 0.45;

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* idle while offscreen (loop keeps ticking, render is skipped) */
    let onscreen = true, io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => { es.forEach(e => { onscreen = e.isIntersecting; }); }, { rootMargin: '200px' });
      io.observe(canvas);
    }

    /* ---- main loop: Wave motion + motor sim + auto-orbit ---- */
    function computeMotion() {
      const t = tMotion;
      for (let i = 0; i < CELLS; i++) {
        const x = i % N, y = (i / N | 0);
        base[i] = Math.max(0, Math.min(1, 0.5 + 0.5 * Math.sin((x + y) * 1.05 - t * 2)));
      }
    }

    let raf = 0, running = false, lastT = 0;
    function dispose() {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      try { ro.disconnect(); if (io) io.disconnect(); } catch (e) {}
      try { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) {}
      canvas._pgl = null;
    }
    function loop(now) {
      raf = 0;
      if (!canvas.isConnected) { dispose(); return; }    // view transition swapped the DOM
      if (!running) return;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;

      tMotion += dt * (0.03 + Math.pow(SPEED, 1.8) * 1.0);
      computeMotion();
      for (let i = 0; i < CELLS; i++) display[i] = base[i];

      /* simulated motors: trapezoidal profile (AccelStepper-style) */
      const vmax = VMAX_CM / TRAVEL, acc = ACC_CM / TRAVEL;
      for (let i = 0; i < CELLS; i++) {
        const target = display[i];
        let pos = actual[i], vel = vels[i];
        const err = target - pos;
        if (Math.abs(err) < 0.003 && Math.abs(vel) < 0.02) { actual[i] = target; vels[i] = 0; continue; }
        const dir = err > 0 ? 1 : -1;
        let a;
        if (vel * dir < 0) { a = -Math.sign(vel) * acc; }
        else {
          const stopDist = (vel * vel) / (2 * acc);
          a = (Math.abs(err) <= stopDist) ? -dir * acc : dir * acc;
        }
        vel += a * dt;
        if (vel > vmax) vel = vmax; else if (vel < -vmax) vel = -vmax;
        pos += vel * dt;
        actual[i] = pos; vels[i] = vel;
      }

      if (onscreen) {
        update3D();
        orbit.theta += dt * 0.07;                        // the page's auto-orbit, always on
        applyCamera();
        if (composer) composer.render(); else renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(loop);
    }

    const handle = {
      start() {
        if (!canvas._pgl) return;                        // disposed
        running = true; lastT = performance.now();
        resize();
        if (!raf) raf = requestAnimationFrame(loop);
      },
      stop() {
        running = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      },
      dispose,
    };
    canvas._pgl = handle;
    return handle;
  }

  return { ready, attach };
})();
