/**
 * PRESENCE — lab runtime v2: sub-room, per-fixture proximity lighting.
 * One-bedroom flat, nine fixtures, a person who A*-pathfinds over an occupancy
 * grid — click anywhere and they walk to THAT SPOT, around furniture, THROUGH
 * DOORWAYS. Two detectors run every frame: PRESENCE (CV) makes each fixture a
 * smooth function of the person's distance (stillness irrelevant); MOTION
 * (PIR) is one sensor per room — movement lights the room, ~6s of stillness
 * goes dark even on an occupied room. Chips pick which drives the light;
 * READING seats the person so the PIR failure plays out; LINGER + CUT/FADE
 * shape decay. init() is re-runnable (dataset.init guard, stale-rAF cancel),
 * idles offscreen, reduced-motion = static frames per interaction, DPR-aware.
 */
window.PresenceLab = (function () {
  var raf = 0;

  function init() {
    var cv = document.getElementById('plCv');
    var btnRead = document.getElementById('plReading');
    var chipMotion = document.getElementById('plPolicyMotion');
    var chipPresence = document.getElementById('plPolicyPresence');
    var chipCut = document.getElementById('plCut');
    var chipFade = document.getElementById('plFade');
    var lingerEl = document.getElementById('plLinger');
    if (!cv || !btnRead || !chipMotion || !chipPresence || !chipCut || !chipFade || !lingerEl) return;
    if (cv.dataset.init) return;          // this DOM is already live
    cv.dataset.init = '1';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }   // stop a loop bound to a previous page's DOM

    var telRoom = document.getElementById('plTelRoom'), telStill = document.getElementById('plTelStill');
    var telMotion = document.getElementById('plTelMotion'), telPresence = document.getElementById('plTelPresence');

    var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = cv.getContext('2d');

    var seed = 20260706;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function dst(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

    /* ================= FLOORPLAN (420x230 board, aspect 42/23) ============= */
    var BW = 420, BH = 230;
    var ROOMS = [
      { x: 16, y: 14, w: 134, h: 104, name: 'BEDROOM' },
      { x: 16, y: 118, w: 134, h: 98, name: 'BATHROOM' },
      { x: 150, y: 14, w: 58, h: 202, name: 'HALL' },
      { x: 208, y: 14, w: 196, h: 86, name: 'KITCHEN' },
      { x: 208, y: 100, w: 196, h: 116, name: 'LIVING' },
    ];
    function roomAt(x, y) {
      for (var i = 0; i < 5; i++) {
        var r = ROOMS[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
      }
      return -1;
    }
    /* wall segments — every gap is a doorway (bed + bath off the hall's west
       spine, kitchen + living off the east, open pass-through, entrance) */
    var WALLS = [
      [16, 14, 404, 14], [16, 216, 156, 216], [184, 216, 404, 216],
      [16, 14, 16, 216], [404, 14, 404, 216],
      [150, 14, 150, 56], [150, 80, 150, 152], [150, 176, 150, 216],
      [208, 14, 208, 44], [208, 68, 208, 146], [208, 170, 208, 216],
      [208, 100, 300, 100], [332, 100, 404, 100], [16, 118, 150, 118],
    ];
    var ARCS = [ // door swings: [hingeX, hingeY, arcA0, arcA1, leafAngle]
      [150, 56, 1.5708, 3.1416, 3.1416], [150, 152, 1.5708, 3.1416, 3.1416],
      [208, 44, 0, 1.5708, 0], [208, 146, 0, 1.5708, 0], [156, 216, -1.5708, 0, -1.5708],
    ];
    var DOORS = [ // walkable gap centers + which two rooms they join
      { x: 150, y: 68, a: 0, b: 2 }, { x: 150, y: 164, a: 1, b: 2 },
      { x: 208, y: 56, a: 2, b: 3 }, { x: 208, y: 158, a: 2, b: 4 }, { x: 316, y: 100, a: 3, b: 4 },
    ];
    var FURN = [ // rects: bed+pillows, bedside, wardrobe, tub, basin, cistern, counters, sink, tv, sofa, coffee, dining, chairs
      [22, 20, 52, 72], [26, 24, 20, 11], [50, 24, 20, 11], [78, 20, 16, 14], [94, 102, 52, 14],
      [22, 146, 26, 64], [26, 150, 18, 56], [120, 124, 24, 14], [124, 186, 18, 9],
      [208, 14, 196, 20], [384, 34, 20, 62], [240, 18, 22, 12], [222, 102, 42, 6],
      [238, 184, 92, 28], [260, 156, 48, 18], [346, 120, 46, 34],
      [352, 109, 12, 9], [374, 109, 12, 9], [352, 156, 12, 9], [374, 156, 12, 9],
    ];

    /* fixtures (r room, k glyph, pr pool radius): bedside lamp, bedroom ceil,
       mirror bar, hall sconce, kitchen ceil, counter strip, living ceil,
       floor lamp by the sofa, dining pendant */
    var FIX = [
      { x: 86, y: 27, r: 0, k: 'lamp', pr: 30 }, { x: 112, y: 64, r: 0, k: 'ceil', pr: 54 },
      { x: 132, y: 122, r: 1, k: 'bar', pr: 32 }, { x: 154, y: 116, r: 2, k: 'lamp', pr: 40 },
      { x: 300, y: 64, r: 3, k: 'ceil', pr: 52 }, { x: 300, y: 38, r: 3, k: 'strip', pr: 28 },
      { x: 280, y: 148, r: 4, k: 'ceil', pr: 56 }, { x: 338, y: 190, r: 4, k: 'lamp', pr: 34 },
      { x: 369, y: 136, r: 4, k: 'pend', pr: 36 },
    ];
    var NF = FIX.length;
    var ref = [], holdT = [], lv = [];   // per-fixture peak, linger deadline, rendered level
    for (var fi = 0; fi < NF; fi++) { ref[fi] = 0; holdT[fi] = -1e9; lv[fi] = 0; }

    /* ============== PATHFINDING (occupancy grid + A*) ====================== */
    /* CELL-u cells; blocked = outside the flat, wall segments (doorway gaps in
       WALLS stay open) and furniture, inflated by PAD (~half cell + half the
       dot radius) so the person never clips corners */
    var CELL = 5, GW = BW / CELL, GH = BH / CELL, PAD = 4.4, GRID = new Uint8Array(GW * GH);
    function segDist(px, py, x1, y1, x2, y2) {
      var dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
      var t = L ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)) : 0;
      return Math.hypot(px - x1 - dx * t, py - y1 - dy * t);
    }
    (function () {
      for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) {
        var cx = gx * CELL + 2.5, cy = gy * CELL + 2.5, b = roomAt(cx, cy) < 0 ? 1 : 0, i;
        for (i = 0; i < WALLS.length && !b; i++) if (segDist(cx, cy, WALLS[i][0], WALLS[i][1], WALLS[i][2], WALLS[i][3]) < PAD) b = 1;
        for (i = 0; i < FURN.length && !b; i++) { var q = FURN[i]; if (cx > q[0] - PAD && cx < q[0] + q[2] + PAD && cy > q[1] - PAD && cy < q[1] + q[3] + PAD) b = 1; }
        GRID[gy * GW + gx] = b;
      }
    })();
    function free(gx, gy) { return gx >= 0 && gy >= 0 && gx < GW && gy < GH && !GRID[gy * GW + gx]; }
    function cellOf(x, y) { return [Math.max(0, Math.min(GW - 1, (x / CELL) | 0)), Math.max(0, Math.min(GH - 1, (y / CELL) | 0))]; }
    function nearestFree(gx, gy) {   // ring search out from a blocked cell
      if (free(gx, gy)) return [gx, gy];
      for (var r = 1; r < 30; r++) {
        var bx = -1, by = 0, bd = 1e9;
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          if (free(gx + dx, gy + dy) && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; bx = gx + dx; by = gy + dy; }
        }
        if (bx >= 0) return [bx, by];
      }
      return null;
    }
    function astar(s, t) {   // 8-dir over GRID; diagonals never cut corners
      var N = GW * GH, gc = new Float32Array(N).fill(1e9), par = new Int32Array(N).fill(-1);
      var done = new Uint8Array(N), si = s[0] + s[1] * GW, ti = t[0] + t[1] * GW, open = [si];
      gc[si] = 0;
      function h(i) { var dx = Math.abs(i % GW - t[0]), dy = Math.abs(((i / GW) | 0) - t[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); }
      while (open.length) {
        var bi = 0, k;
        for (k = 1; k < open.length; k++) if (gc[open[k]] + h(open[k]) < gc[open[bi]] + h(open[bi])) bi = k;
        var u = open.splice(bi, 1)[0];
        if (u === ti) break;
        if (done[u]) continue;
        done[u] = 1;
        var ux = u % GW, uy = (u / GW) | 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || !free(ux + dx, uy + dy)) continue;
          if (dx && dy && (!free(ux + dx, uy) || !free(ux, uy + dy))) continue;
          var v = ux + dx + (uy + dy) * GW, c = gc[u] + (dx && dy ? 1.414 : 1);
          if (c < gc[v]) { gc[v] = c; par[v] = u; if (!done[v]) open.push(v); }
        }
      }
      if (ti !== si && par[ti] < 0) return null;
      var out = [], c2 = ti;
      while (c2 >= 0) { out.unshift([(c2 % GW) * CELL + 2.5, ((c2 / GW) | 0) * CELL + 2.5]); c2 = par[c2]; }
      return out;
    }
    function los(ax, ay, bx, by) {   // grid raycast, sampled every ~2u
      var n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
      for (var i = 1; i < n; i++) {
        var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
        if (!free((x / CELL) | 0, (y / CELL) | 0)) return false;
      }
      return true;
    }
    function pull(pts) {   // string-pulling: keep only the corners the grid forces
      var out = [pts[0]], a = 0;
      while (a < pts.length - 1) {
        var j = pts.length - 1;
        while (j > a + 1 && !los(pts[a][0], pts[a][1], pts[j][0], pts[j][1])) j--;
        out.push(pts[j]); a = j;
      }
      return out;
    }
    /* wander destinations [x, y, sit]; sit=1 marks seats (bed, sofa, dining chair) */
    var SPOTS = [
      [70, 84, 1], [112, 60, 0], [84, 168, 0], [250, 66, 0], [340, 64, 0],
      [232, 148, 0], [326, 148, 0], [272, 194, 1], [380, 160, 1],
    ];
    function nearestSeat(x, y) {
      var best = 0, bd = 1e9;
      for (var i = 0; i < SPOTS.length; i++) {
        if (!SPOTS[i][2]) continue;
        var d = dst(x, y, SPOTS[i][0], SPOTS[i][1]);
        if (d < bd) { bd = d; best = i; }
      }
      return SPOTS[best];
    }

    /* ================= SIM ================================================= */
    var MOTION_HOLD = 6;   // s of stillness before a PIR abandons the room
    var COUNT = 3;         // final seconds get an on-canvas countdown
    var EPS = 6;           // u/s — logical displacement below this is "still"
    var SP = 55;           // walking speed, u/s

    var simT = 0, policy = 'presence', decay = 'fade', lingerS = 2;
    var reading = false, seated = false;
    var person = { x: 232, y: 148, room: 4 };
    var vx = 0, vy = 0, walk = null, lastSpot = 5;   // walk = { pts: [[x,y]...], pi }
    var dwellUntil = 1.2, lastMove = 0;
    var lastMotion = [-99, -99, -99, -99, 0];   // PIR memory; LIVING saw them arrive
    var trail = [];

    function motionOn(i) { return simT - lastMotion[i] < MOTION_HOLD; }
    /* distance -> brightness: full inside 60u, feathered to zero by 180u */
    function fall(d) { if (d <= 60) return 1; if (d >= 180) return 0; var u = (d - 60) / 120; return 1 - u * u * (3 - 2 * u); }
    function presRaw(f) {   // adjacent rooms are measured through the doorway, so light spills ahead of the person
      var pr = person.room, d;
      if (f.r === pr) d = dst(person.x, person.y, f.x, f.y);
      else {
        d = 1e9;
        for (var k = 0; k < DOORS.length; k++) {
          var dr = DOORS[k];
          if ((dr.a === pr && dr.b === f.r) || (dr.b === pr && dr.a === f.r)) {
            var t = dst(person.x, person.y, dr.x, dr.y) + dst(dr.x, dr.y, f.x, f.y);
            if (t < d) d = t;
          }
        }
      }
      return fall(d);
    }
    function fixtureRaw(i, pol) { return pol === 'presence' ? presRaw(FIX[i]) : (motionOn(FIX[i].r) ? 1 : 0); }

    function goPoint(x, y, exact) {   // exact: seats — finish on the true point even on furniture
      var c = cellOf(x, y), blocked = !free(c[0], c[1]);
      var t = blocked ? nearestFree(c[0], c[1]) : c;
      var s = cellOf(person.x, person.y);
      if (!free(s[0], s[1])) s = nearestFree(s[0], s[1]);   // seated on furniture: step off first
      if (!t || !s) return;
      var pts = astar(s, t);
      if (!pts) return;
      if (!blocked) pts[pts.length - 1] = [x, y];   // walkable target: land on the exact spot
      else if (exact) pts.push([x, y]);
      pts = pull(pts);
      if (REDUCED) {   // movement is off: place them at the destination outright
        seated = !!reading; teleport(pts[pts.length - 1][0], pts[pts.length - 1][1]); return;
      }
      walk = { pts: pts, pi: 0 }; seated = false;
    }
    function step(dt) {
      simT += dt;
      var px = person.x, py = person.y;
      if (!reading && !walk && simT >= dwellUntil) {   // wander scheduler
        var t = (rnd() * SPOTS.length) | 0;
        if (t === lastSpot) t = (rnd() * SPOTS.length) | 0;
        if (t !== lastSpot) { lastSpot = t; goPoint(SPOTS[t][0], SPOTS[t][1], !!SPOTS[t][2]); }
        else dwellUntil = simT + 1;
      }
      if (walk) {
        var n = walk.pts[walk.pi], last = walk.pi === walk.pts.length - 1;
        var dx = n[0] - person.x, dy = n[1] - person.y, d = Math.hypot(dx, dy);
        if (d < (last ? 1.5 : 3.5)) {
          walk.pi++;
          if (last) {
            person.x = n[0]; person.y = n[1];   // settle on the exact spot
            walk = null; vx = 0; vy = 0;
            if (reading) seated = true;
            else dwellUntil = simT + 2 + rnd() * 3.5;   // natural dwell 2-5.5s
          }
        } else {
          var sp = (last && d < 28) ? Math.max(16, d * 2.2) : SP;   // ease into the endpoint
          var k2 = Math.min(1, dt * 8);   // velocity-steered: corners round naturally
          vx += (dx / d * sp - vx) * k2; vy += (dy / d * sp - vy) * k2;
          person.x += vx * dt; person.y += vy * dt;
        }
      }
      var r = roomAt(person.x, person.y);
      if (r >= 0) person.room = r;

      // PIR judges logical displacement only — seated breathing is draw-time
      var speed = Math.hypot(person.x - px, person.y - py) / dt;
      if (speed > EPS) {
        lastMove = simT; lastMotion[person.room] = simT;
        if (!trail.length || simT - trail[trail.length - 1].t > 0.07) trail.push({ x: person.x, y: person.y, t: simT });
      }
      while (trail.length && simT - trail[0].t > 1.1) trail.shift();

      // per-fixture light: ACTIVE policy's raw verdict; linger holds the peak,
      // then CUT snaps / FADE eases out ~2s. Turn-on is always quick.
      for (var i = 0; i < NF; i++) {
        var raw = fixtureRaw(i, policy), tgt;
        if (raw >= ref[i] - 0.001) { ref[i] = raw; holdT[i] = simT + lingerS; tgt = raw; }
        else if (simT < holdT[i]) tgt = ref[i];
        else { tgt = raw; ref[i] = raw; }
        if (tgt > lv[i]) lv[i] += (tgt - lv[i]) * Math.min(1, dt * 9);
        else if (decay === 'cut') lv[i] = tgt;
        else lv[i] += (tgt - lv[i]) * Math.min(1, dt * 1.7);
      }
    }

    /* ================= CANVAS ============================================== */
    var scl = 1, ox = 0, oy = 0, dpr = 1;
    function fit() {
      var cw = cv.clientWidth || 420, ch = cv.clientHeight || 230;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      scl = Math.min(cw / BW, ch / BH);
      ox = (cw - BW * scl) / 2; oy = (ch - BH * scl) / 2;
    }
    var WARM = '255,217,160';   // #ffd9a0
    var LINE = '228,226,220';
    var MONO = "7px ui-monospace, Menlo, 'Courier Prime', monospace";

    function pool(x, y, rad, a, room) {   // warm floor pool, clipped to its room
      var r = ROOMS[room];
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      var g = ctx.createRadialGradient(x, y, 1, x, y, rad);
      g.addColorStop(0, 'rgba(' + WARM + ',' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + WARM + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      ctx.restore();
    }

    function render(nowMs) {
      var i, f, r;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#141317';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * scl, 0, 0, dpr * scl, ox * dpr, oy * dpr);

      ctx.fillStyle = 'rgba(255,255,255,0.02)';   // faint floor wash
      for (i = 0; i < 5; i++) { r = ROOMS[i]; ctx.fillRect(r.x, r.y, r.w, r.h); }

      ctx.globalCompositeOperation = 'lighter';   // additive light pools
      for (i = 0; i < NF; i++) {
        f = FIX[i];
        if (lv[i] < 0.02) continue;
        var rad = f.pr * (0.72 + 0.28 * lv[i]);
        if (f.k === 'strip') {   // counter strip: three overlapping pools
          pool(f.x - 40, f.y, rad, lv[i] * 0.3, f.r); pool(f.x, f.y, rad, lv[i] * 0.3, f.r); pool(f.x + 40, f.y, rad, lv[i] * 0.3, f.r);
        } else pool(f.x, f.y, rad, lv[i] * 0.42, f.r);
      }
      ctx.globalCompositeOperation = 'source-over';

      ctx.strokeStyle = 'rgba(' + LINE + ',0.22)';   // furniture line-work
      ctx.lineWidth = 1;
      for (i = 0; i < FURN.length; i++) { var q = FURN[i]; ctx.strokeRect(q[0], q[1], q[2], q[3]); }
      ctx.beginPath();   // details: wardrobe split, sofa back
      ctx.moveTo(120, 102); ctx.lineTo(120, 116); ctx.moveTo(238, 192); ctx.lineTo(330, 192);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(133, 200, 6, 0, 6.2832); ctx.stroke();   // toilet bowl
      for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(312 + (i % 2) * 12, 21 + ((i / 2) | 0) * 7, 2.2, 0, 6.2832); ctx.stroke(); }   // hob
      for (i = 0; i < ARCS.length; i++) {   // door leaves + swing arcs
        var A = ARCS[i];
        ctx.strokeStyle = 'rgba(' + LINE + ',0.16)';
        ctx.beginPath(); ctx.arc(A[0], A[1], 24, A[2], A[3]); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + LINE + ',0.32)';
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(A[0] + Math.cos(A[4]) * 24, A[1] + Math.sin(A[4]) * 24); ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(' + LINE + ',0.55)';   // walls last, over the pools
      ctx.lineWidth = 2; ctx.lineCap = 'square';
      ctx.beginPath();
      for (i = 0; i < WALLS.length; i++) { var s = WALLS[i]; ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
      ctx.stroke();
      ctx.lineWidth = 1;

      for (i = 0; i < NF; i++) {   // fixture markers: warm when lit, hollow gray when dark
        f = FIX[i];
        var lit = lv[i] > 0.03;
        var warmA = 'rgba(' + WARM + ',' + (0.35 + lv[i] * 0.65).toFixed(2) + ')';
        if (f.k === 'strip' || f.k === 'bar') {
          var hw = f.k === 'strip' ? 20 : 7;
          ctx.strokeStyle = lit ? warmA : 'rgba(' + LINE + ',0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(f.x - hw, f.y); ctx.lineTo(f.x + hw, f.y); ctx.stroke();
          ctx.lineWidth = 1;
        } else {
          if (f.k === 'pend') { ctx.strokeStyle = 'rgba(' + LINE + ',0.3)'; ctx.beginPath(); ctx.moveTo(f.x, f.y - 7); ctx.lineTo(f.x, f.y - 3); ctx.stroke(); }
          if (lit) { ctx.fillStyle = warmA; ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, 6.2832); ctx.fill(); }
          else { ctx.strokeStyle = 'rgba(' + LINE + ',0.35)'; ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, 6.2832); ctx.stroke(); }
        }
      }

      ctx.font = MONO; ctx.textAlign = 'left';   // room labels
      ctx.fillStyle = 'rgba(150,150,144,0.75)';
      for (i = 0; i < 5; i++) { r = ROOMS[i]; ctx.fillText(r.name, r.x + 5, r.y + 11); }

      for (i = 0; i < trail.length; i++) {   // walking trail, dies in ~1.1s
        var tp = trail[i], age = simT - tp.t;
        ctx.fillStyle = 'rgba(61,255,136,' + Math.max(0, 0.28 - age * 0.25).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(tp.x, tp.y, Math.max(0.6, 2.2 - age * 1.8), 0, 6.2832); ctx.fill();
      }

      // the person — seated breathing is draw-time only, never a PIR event
      var jy = (seated && !REDUCED) ? Math.sin(nowMs * 0.0021) * 0.4 : 0;
      ctx.fillStyle = 'rgba(61,255,136,0.16)'; ctx.beginPath(); ctx.arc(person.x, person.y + jy, 8, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#3dff88'; ctx.beginPath(); ctx.arc(person.x, person.y + jy, 4, 0, 6.2832); ctx.fill();

      if (seated) {   // tiny open book: two page quads + a spine
        var bx = person.x + 8, by = person.y + jy - 6;
        ctx.fillStyle = 'rgba(' + WARM + ',0.85)';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 6, by - 3); ctx.lineTo(bx - 6, by + 2); ctx.lineTo(bx, by + 5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 6, by - 3); ctx.lineTo(bx + 6, by + 2); ctx.lineTo(bx, by + 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(20,19,23,0.9)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 5); ctx.stroke();
      }

      if (policy === 'motion') {   // the thesis moment, narrated on-canvas
        var rem = MOTION_HOLD - (simT - lastMotion[person.room]);
        ctx.font = MONO; ctx.textAlign = 'center';
        if (rem > 0 && rem <= COUNT) { ctx.fillStyle = '#E69F00'; ctx.fillText('DARK IN ' + Math.ceil(rem) + 's', person.x, person.y - 13); }
        else if (rem <= 0) { ctx.fillStyle = 'rgba(150,150,144,0.85)'; ctx.fillText('PIR SEES NOTHING', person.x, person.y - 13); }
        ctx.textAlign = 'left';
      }
    }

    /* ---- telemetry (write only on change — these live in the operator DOM) ---- */
    var telCache = {};
    function setTel(el, key, txt) {
      if (el && telCache[key] !== txt) { telCache[key] = txt; el.textContent = txt; }
    }
    function telemetry() {
      var i = person.room, rn = ROOMS[i].name;
      var still = simT - lastMove;
      setTel(telRoom, 'r', rn);
      setTel(telStill, 's', REDUCED ? '—' : (still < 0.25 ? 'moving' : still.toFixed(1) + 's'));
      // both detectors report every frame regardless of which drives the lights
      setTel(telMotion, 'm', motionOn(i) ? rn + ': ON' : rn + ': DARK (still ' + Math.floor(still) + 's)');
      var c = 0;
      for (var k = 0; k < NF; k++) if (presRaw(FIX[k]) > 0.12) c++;
      setTel(telPresence, 'p', c === 1 ? '1 FIXTURE LIT' : c + ' FIXTURES LIT');
    }

    /* reduced motion: settle levels instantly, paint one frame per interaction */
    function renderOnce() {
      for (var i = 0; i < NF; i++) lv[i] = fixtureRaw(i, policy);
      render(0);
      telemetry();
    }

    /* ================= CONTROLS ============================================ */
    function setPolicy(p) {
      policy = p;
      chipMotion.classList.toggle('on', p === 'motion'); chipPresence.classList.toggle('on', p === 'presence');
      if (REDUCED) renderOnce();
    }
    function setDecay(d) {
      decay = d;
      chipCut.classList.toggle('on', d === 'cut'); chipFade.classList.toggle('on', d === 'fade');
      if (REDUCED) renderOnce();
    }
    chipMotion.addEventListener('click', function () { setPolicy('motion'); });
    chipPresence.addEventListener('click', function () { setPolicy('presence'); });
    chipCut.addEventListener('click', function () { setDecay('cut'); });
    chipFade.addEventListener('click', function () { setDecay('fade'); });

    function applyLinger() {
      var v = Math.max(0, Math.min(100, parseFloat(lingerEl.value) || 0));
      lingerS = 0.5 + (v / 100) * 5.5;                          // 0.5-6s
      lingerEl.style.setProperty('--p', (v / 100).toFixed(3));  // site slider fill
      if (REDUCED) renderOnce();
    }
    lingerEl.addEventListener('input', applyLinger);

    function teleport(x, y) {   // reduced-motion placement: no walk animation
      person.x = x; person.y = y;
      var tr = roomAt(x, y);
      if (tr >= 0) person.room = tr;
      lastMotion[person.room] = simT; lastMove = simT;
      renderOnce();
    }
    btnRead.addEventListener('click', function () {
      reading = !reading;
      btnRead.classList.toggle('on', reading);
      if (reading) {   // walk to the nearest seat and sit (goPoint teleports under REDUCED)
        var s2 = nearestSeat(person.x, person.y);
        goPoint(s2[0], s2[1], true);
      } else {
        seated = false;
        dwellUntil = simT + 0.6;   // stretch, then resume the wander
        if (REDUCED) renderOnce();
      }
    });

    /* click/tap → A* to THAT SPOT (blocked target → nearest walkable cell); while reading, nearest seat */
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var rc = cv.getBoundingClientRect();
      var x = (e.clientX - rc.left - ox) / scl, y = (e.clientY - rc.top - oy) / scl;
      if (reading) { var s2 = nearestSeat(x, y); goPoint(s2[0], s2[1], true); return; }
      goPoint(x, y, false);
    });

    /* ---- defaults, sizing, idling ---- */
    setPolicy('presence'); setDecay('fade'); applyLinger(); fit();
    new ResizeObserver(function () { fit(); if (REDUCED) renderOnce(); }).observe(cv);

    var onscreen = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) onscreen = es[i].isIntersecting;
      }, { rootMargin: '160px' }).observe(cv);
    }

    if (REDUCED) { renderOnce(); return; }   // static scene; interactions re-render directly

    var lastT = performance.now();
    function loop(now) {
      if (!onscreen) { lastT = now; raf = requestAnimationFrame(loop); return; }
      /* fixed 50ms sub-steps: throttled rAF (occluded/background window, battery
         saver) delivers sparse frames — catch up on the missed wall time (≤1.5s)
         instead of freezing sim time at 0.05s per delivered frame */
      var lag = Math.min(1.5, (now - lastT) / 1000); lastT = now;
      while (lag > 0) { var dt = Math.min(0.05, lag); lag -= dt; step(dt); }
      render(now); telemetry();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  return { init: init };
})();
