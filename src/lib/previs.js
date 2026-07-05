/**
 * previs.js — shared project-preview engine (window.Previs).
 *
 * The five featured live previews (futurescaper / futurity-engine / fast /
 * campus-ai / carlton-dev) extracted from the homepage, plus bespoke
 * recreated minis for the other six projects (physical/product behavior
 * miniaturized — honest RECREATION labels, no fake product UI).
 * Inlined verbatim on pages via PrevisEngine.astro (same strip pipeline as
 * patch-runtime.js). ⚠️ Keep this file free of `//` and `/*` inside
 * string/regex literals — the prod strip would corrupt them.
 *
 * API:
 *   const eng = window.Previs.engine({ svg, dither });
 *   eng.has(slug) / eng.meta(slug) → { name, foot, aria, … }
 *   eng.select(slug, invert) → true when the slug changed (page updates
 *             its operator chrome + pulses)
 *   eng.boot(slug0) — first cook + rAF loop (REDUCED-safe, 30fps,
 *             self-terminating when the svg leaves the DOM)
 */
(function () {
  if (window.Previs) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEEP = ['#CC79A7', '#56B4E9', '#E69F00', '#009E73', '#D55E00', '#007CBF', '#F0E442'];
  var W = 420, H = 240;
  var seed = 99;
  var srnd = function (s0) { seed = s0; return function () { return (seed = (seed * 16807) % 2147483647) / 2147483647; }; };

  /* ---------- shared helpers: dither transition + octilinear edge ---------- */
  var TRANS = 0.44;
  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  var PAL_HOT = ['#3dff88', '#e8a317', '#56b4e9', '#9f9f98'];
  var PAL_BASE = ['#233b2c', '#3a2c14', '#15303d', '#26262a'];
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function octi(sx, sy, tx, ty, stub) {
    stub = stub || 14;
    var ax = sx + stub, bx = tx - stub, dx = bx - ax, dy = ty - sy;
    var adx = Math.abs(dx), ady = Math.abs(dy), gx = Math.sign(dx) || 1, gy = Math.sign(dy) || 1;
    var pts = [[sx, sy], [ax, sy]];
    if (adx >= ady) pts.push([bx - gx * ady, sy]); else pts.push([ax + gx * adx, sy + gy * adx]);
    pts.push([bx, ty], [tx, ty]);
    return 'M ' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L ');
  }
  function bgSettings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem('patch-bg') || '{}') || {}; } catch (e) {}
    return {
      pal: (((s.pal | 0) % 4) + 4) % 4,
      ditherT: (((s.ditherT | 0) % 4) + 4) % 4,
      noiseT: (typeof s.noiseT === 'number' ? (((s.noiseT % 3) + 3) % 3) : 1),
      scale: (typeof s.scale === 'number' ? s.scale : 3),
    };
  }
  function hash01(x, y, s) { var h = ((x * 73856093) ^ (y * 19349663) ^ (((s * 1013) | 0) * 83492791)) >>> 0; return ((h >>> 8) & 1023) / 1024; }
  function thresh(dt, gx, gy) {
    if (dt === 1) { var B2 = [[0, 2], [3, 1]]; return (B2[gy & 1][gx & 1] + 0.5) / 4; }
    if (dt === 2) return ((gy & 3) + 0.5) / 4.4;
    if (dt === 3) { var h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0; return ((h >>> 8) & 1023) / 1024; }
    return (BAYER[gy & 3][gx & 3] + 0.5) / 16;
  }
  var _perm = (function () {
    var p = new Uint8Array(512), a = []; for (var i = 0; i < 256; i++) a[i] = i;
    var sd = 1337; var r = function () { return (sd = (sd * 16807) % 2147483647) / 2147483647; };
    for (var j = 255; j > 0; j--) { var k = (r() * (j + 1)) | 0, t = a[j]; a[j] = a[k]; a[k] = t; }
    for (var m = 0; m < 512; m++) p[m] = a[m & 255]; return p;
  })();
  var _fade = function (x) { return x * x * (3 - 2 * x); };
  function _vn(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    var a = _perm[_perm[X] + Y] / 255, b = _perm[_perm[X + 1] + Y] / 255, c = _perm[_perm[X] + Y + 1] / 255, d = _perm[_perm[X + 1] + Y + 1] / 255;
    var u = _fade(xf), v = _fade(yf), l1 = a + (b - a) * u, l2 = c + (d - c) * u; return l1 + (l2 - l1) * v;
  }
  function noiseShape(nt, gx, gy, tSeed) {
    var o = tSeed * 12;
    if (nt === 2) { var n = 0.5 + (Math.sin((gx + o) * 0.05) + Math.sin(gy * 0.06 - o) + Math.sin((gx + gy) * 0.03)) / 6; return Math.max(0, Math.min(1, (n - 0.2) * 1.5)); }
    var n1 = _vn(gx * 0.055 + o, gy * 0.055), n2 = _vn(gx * 0.12 - 7.7, gy * 0.12 + 3.1);
    if (nt === 1) { n1 = 1 - Math.abs(2 * n1 - 1); n2 = 1 - Math.abs(2 * n2 - 1); return Math.max(0, Math.min(1, (0.62 * n1 + 0.38 * n2 - 0.15) * 1.5)); }
    return Math.max(0, Math.min(1, (0.62 * n1 + 0.38 * n2) * 1.05));
  }

  /* ---------- viewer: futurescaper — self-generating consequence map ---------- */
  var SENT = { pos: '#16A34A', neg: '#DC2626', neu: '#64748B' };
  var SGL = {
    pos: ['M7 7h10v10', 'M7 17 17 7'],
    neg: ['m7 7 10 10', 'M17 7v10H7'],
    neu: ['M4 9.5q2.5-3 5 0t5 0 5 0', 'M4 15.5q2.5-3 5 0t5 0 5 0'],
  };
  var SCAPE = [
    { seed: 'Deepfakes indistinguishable from reality', nodes: [
      { id: 'd1', cat: 5, s: 'neg' }, { id: 'd2', cat: 0, s: 'pos' }, { id: 'd3', cat: 2, s: 'pos' },
      { id: 'd4', cat: 4, s: 'neu' }, { id: 'd5', cat: 6, s: 'neg' }, { id: 'd6', cat: 1, s: 'pos' },
      { id: 'd1a', cat: 1, s: 'pos', p: 'd1' }, { id: 'd3a', cat: 2, s: 'neu', p: 'd3' }, { id: 'd6a', cat: 1, s: 'neg', p: 'd6' },
    ] },
    { seed: 'Universal basic income nationwide', nodes: [
      { id: 'u1', cat: 2, s: 'pos' }, { id: 'u2', cat: 0, s: 'pos' }, { id: 'u3', cat: 4, s: 'neg' },
      { id: 'u4', cat: 1, s: 'neu' }, { id: 'u5', cat: 5, s: 'pos' }, { id: 'u7', cat: 3, s: 'pos' },
      { id: 'u1a', cat: 0, s: 'pos', p: 'u1' }, { id: 'u4a', cat: 4, s: 'neu', p: 'u4' }, { id: 'u7a', cat: 2, s: 'neu', p: 'u7' },
    ] },
    { seed: 'Lab-grown meat outprices farming', nodes: [
      { id: 'm1', cat: 3, s: 'pos' }, { id: 'm2', cat: 2, s: 'neg' }, { id: 'm3', cat: 5, s: 'neg' },
      { id: 'm4', cat: 1, s: 'neu' }, { id: 'm5', cat: 0, s: 'neg' }, { id: 'm7', cat: 6, s: 'pos' },
      { id: 'm1a', cat: 2, s: 'neu', p: 'm1' }, { id: 'm3a', cat: 4, s: 'neg', p: 'm3' }, { id: 'm5a', cat: 3, s: 'pos', p: 'm5' },
    ] },
  ];
  var SC_SEEDX = 14, SC_SEEDW = 94, SC_SEEDH = 40, SC_CY = H / 2;
  var SC_D1X = 176, SC_D2X = 300, SC_W1 = 66, SC_W2 = 54, SC_PH = 18;
  var SC_EDGE_DUR = 0.5, SC_HOLD = 2.6, SC_FADE = 0.55;
  function scapeInit() {
    var placed = SCAPE.map(function (sc) {
      var d1 = sc.nodes.filter(function (n) { return !n.p; }), d2 = sc.nodes.filter(function (n) { return n.p; });
      var byId = {}, nodes = [];
      var spacing = Math.min(34, (H - 26) / d1.length);
      d1.forEach(function (n, i) {
        var cy = SC_CY + (i - (d1.length - 1) / 2) * spacing;
        var ed = 0.9 + i * 0.22, nd = ed + 0.34;
        var pp = { s: n.s, cat: n.cat, x: SC_D1X, cy: cy, w: SC_W1, h: SC_PH, sx: SC_SEEDX + SC_SEEDW, sy: SC_CY, tx: SC_D1X, ty: cy, ed: ed, nd: nd };
        nodes.push(pp); byId[n.id] = pp;
      });
      var d2base = 0.9 + d1.length * 0.22 + 0.25;
      d2.forEach(function (n, j) {
        var par = byId[n.p]; if (!par) return;
        var cy = par.cy + (par.cy <= SC_CY ? -1 : 1) * 20;
        var ed = d2base + j * 0.2, nd = ed + 0.34;
        nodes.push({ s: n.s, cat: n.cat, x: SC_D2X, cy: cy, w: SC_W2, h: SC_PH, sx: par.x + par.w, sy: par.cy, tx: SC_D2X, ty: cy, ed: ed, nd: nd });
      });
      var total = Math.max.apply(null, nodes.map(function (n) { return n.nd; })) + 0.5;
      return { seed: sc.seed, nodes: nodes, total: total };
    });
    return { sc: placed };
  }
  function scapeWrap(str) {
    var max = 18; if (str.length <= max) return [str, ''];
    var cut = str.lastIndexOf(' ', max); if (cut < 0) cut = max;
    var l2 = str.slice(cut + 1); if (l2.length > max) l2 = l2.slice(0, max - 1) + '…';
    return [str.slice(0, cut), l2];
  }
  function scapeSeed(title, inv) {
    var x = SC_SEEDX, y = SC_CY - SC_SEEDH / 2, w = SC_SEEDW, h = SC_SEEDH;
    var ln = scapeWrap(title);
    return '<g>'
      + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="#1b1a20" stroke="' + (inv ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)') + '"/>'
      + '<text x="' + (x + 9) + '" y="' + (y + 11) + '" font-family="monospace" font-size="5" letter-spacing="1" fill="rgba(255,255,255,0.5)">SCENARIO</text>'
      + '<text x="' + (x + 9) + '" y="' + (y + 22) + '" font-family="Inter,sans-serif" font-size="7" font-weight="700" fill="#fff"><tspan x="' + (x + 9) + '">' + esc(ln[0]) + '</tspan><tspan x="' + (x + 9) + '" dy="8.5">' + esc(ln[1]) + '</tspan></text>'
      + '<circle cx="' + (x + 18) + '" cy="' + y + '" r="4" fill="#fff" stroke="#151419" stroke-width="2.5"/>'
      + '</g>';
  }
  function scapePill(n, np, inv) {
    var y = n.cy - n.h / 2, col = STEEP[n.cat], sc = SENT[n.s], base = inv ? '#201f24' : '#fff';
    var fill = n.s === 'neu' ? base : 'color-mix(in srgb, ' + sc + ' 16%, ' + base + ')';
    var g = SGL[n.s].map(function (d) { return '<path d="' + d + '"/>'; }).join('');
    var dy = (1 - np) * 5;
    return '<g opacity="' + np.toFixed(3) + '" transform="translate(0 ' + dy.toFixed(2) + ')">'
      + '<rect x="' + n.x + '" y="' + y + '" width="' + n.w + '" height="' + n.h + '" rx="' + (n.h / 2) + '" fill="' + fill + '" stroke="' + col + '" stroke-width="1.4"/>'
      + '<g transform="translate(' + (n.x + 5) + ' ' + (n.cy - 5) + ') scale(0.42)" fill="none" stroke="' + sc + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">' + g + '</g>'
      + '</g>';
  }
  function scapeDraw(st, ft, inv) {
    var scs = st.sc;
    var cyc = scs.map(function (s) { return s.total + SC_HOLD + SC_FADE; });
    var loop = cyc.reduce(function (a, b) { return a + b; }, 0);
    var t = REDUCED ? scs[0].total : (ft % loop), idx = 0;
    if (!REDUCED) { while (t > cyc[idx]) { t -= cyc[idx]; idx++; } }
    var s = scs[idx], lt = REDUCED ? s.total : t;
    var fadeStart = s.total + SC_HOLD;
    var gOp = (!REDUCED && lt > fadeStart) ? Math.max(0, 1 - (lt - fadeStart) / SC_FADE) : 1;
    var dot = inv ? 'rgba(230,230,226,0.06)' : 'rgba(42,42,46,0.08)';
    var o = '<defs><pattern id="scdots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="' + dot + '"/></pattern></defs>';
    o += '<rect width="' + W + '" height="' + H + '" fill="url(#scdots)"/>';
    o += '<g opacity="' + gOp.toFixed(3) + '">';
    for (var i = 0; i < s.nodes.length; i++) {
      var n = s.nodes[i];
      var ep = REDUCED ? 1 : Math.min(1, Math.max(0, (lt - n.ed) / SC_EDGE_DUR));
      if (ep <= 0) continue;
      o += '<path d="' + octi(n.sx, n.sy, n.tx, n.ty) + '" fill="none" stroke="' + STEEP[n.cat] + '" stroke-width="2.6" stroke-linejoin="round" opacity="0.7" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + (1 - ep).toFixed(3) + '"/>';
    }
    o += scapeSeed(s.seed, inv);
    for (var j = 0; j < s.nodes.length; j++) {
      var n2 = s.nodes[j];
      var np = REDUCED ? 1 : Math.min(1, Math.max(0, (lt - n2.nd) / 0.3));
      if (np <= 0) continue;
      o += '<circle cx="' + n2.tx + '" cy="' + n2.ty + '" r="4" fill="' + (inv ? '#15140F' : '#FBFAF7') + '" stroke="' + STEEP[n2.cat] + '" stroke-width="2"/>';
      o += scapePill(n2, np, inv);
    }
    return o + '</g>';
  }

  /* ---------- viewer: futurity_engine — a full run compressed to one cycle ---------- */
  var ENG_ENT = ['#20C6DB', '#20C6DB', '#20C6DB', '#C3DE6D', '#C3DE6D', '#E07B91', '#E69500', '#46ACC8'];
  var ENG_L = 7.15, ENG_PH = [['INTENT', 0], ['DB_PULL', 1.0], ['SIGNALS', 3.05], ['AGENTS', 3.8], ['SYNTH', 5.85]];
  function engInit() {
    var r = srnd(4242);
    var nodes = [];
    var SP = [[96, 66], [212, 48], [330, 72], [118, 172], [238, 190], [342, 162]];
    for (var i = 0; i < 6; i++) nodes.push({ x: SP[i][0], y: SP[i][1], t: 'sub', b: 0.1 + i * 0.13, r: 7.5, p: -1 });
    var bt = 1.0;
    for (var b2 = 0; b2 < 8; b2++) {
      var n = 4 + Math.floor(r() * 3);
      for (var j = 0; j < n; j++) {
        var pi = Math.floor(r() * 6), pn = nodes[pi];
        var a = r() * Math.PI * 2, d = 17 + r() * 30;
        nodes.push({
          x: Math.min(W - 10, Math.max(10, pn.x + Math.cos(a) * d * 1.5)),
          y: Math.min(H - 30, Math.max(14, pn.y + Math.sin(a) * d)),
          t: 'ent', c: ENG_ENT[Math.floor(r() * ENG_ENT.length)], b: bt + r() * 0.2, r: 2.1 + r() * 1.5, p: pi,
        });
      }
      bt += 0.24;
    }
    for (var s2 = 0; s2 < 4; s2++) {
      var pi2 = Math.floor(r() * 6), pn2 = nodes[pi2], a2 = r() * Math.PI * 2;
      nodes.push({ x: pn2.x + Math.cos(a2) * 26, y: Math.min(H - 30, Math.max(14, pn2.y + Math.sin(a2) * 24)), t: 'sig', b: 3.05 + s2 * 0.14, r: 3.6, p: pi2 });
    }
    var AP = [[34, 42], [388, 50], [34, 200], [388, 196]];
    var agi = [];
    for (var a3 = 0; a3 < 4; a3++) { nodes.push({ x: AP[a3][0], y: AP[a3][1], t: 'ag', b: 3.8 + a3 * 0.16, r: 4.6, p: Math.floor(r() * 6) }); agi.push(nodes.length - 1); }
    for (var w2 = 0; w2 < 10; w2++) {
      var pi3 = agi[Math.floor(r() * 4)], pn3 = nodes[pi3], a4 = r() * Math.PI * 2;
      nodes.push({ x: Math.min(W - 8, Math.max(8, pn3.x + Math.cos(a4) * 22)), y: Math.min(H - 30, Math.max(12, pn3.y + Math.sin(a4) * 20)), t: 'web', b: 4.2 + r() * 1.3, r: 1.7, p: pi3 });
    }
    nodes.push({ x: W / 2, y: H / 2 + 4, t: 'rep', b: 5.85, r: 6.5, p: -1 });
    var ri = nodes.length - 1;
    agi.forEach(function (i2) { nodes.push({ lk: 1, a: i2, b2: ri, b: 5.9 }); });
    return nodes;
  }
  function engHex(x, y, rr) {
    var pts = '';
    for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i - Math.PI / 6; pts += (x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1) + ' '; }
    return pts;
  }
  function engDraw(st, ft, inv) {
    var t = REDUCED ? 6.5 : ft % ENG_L;
    var fade = (!REDUCED && t > 6.75) ? Math.max(0, 1 - (t - 6.75) / 0.4) : 1;
    var ECOL = { sub: '#4252BD', sig: '#F0E442', ag: '#818cf8', web: '#64748b', rep: '#f97316' };
    var edge = inv ? 'rgba(21,20,15,.22)' : 'rgba(230,230,226,.15)';
    var tickDim = inv ? 'rgba(21,20,15,.42)' : 'rgba(230,230,226,.35)';
    var tickOff = inv ? 'rgba(21,20,15,.22)' : 'rgba(230,230,226,.16)';
    var o = '<g opacity="' + fade.toFixed(3) + '">';
    for (var i = 0; i < st.length; i++) {
      var n = st[i];
      if (n.lk) { if (t >= n.b) { var A = st[n.a], B2 = st[n.b2]; o += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B2.x + '" y2="' + B2.y + '" stroke="' + edge + '"/>'; } continue; }
      if (n.p >= 0 && t >= n.b) { var m = st[n.p]; o += '<line x1="' + m.x + '" y1="' + m.y + '" x2="' + n.x + '" y2="' + n.y + '" stroke="' + edge + '"/>'; }
    }
    var newest = null;
    for (var j = 0; j < st.length; j++) {
      var n2 = st[j];
      if (n2.lk || t < n2.b) continue;
      var g = REDUCED ? 1 : Math.min(1, (t - n2.b) / 0.25), rr = n2.r * (0.4 + 0.6 * g);
      if (!REDUCED && t - n2.b < 0.5 && (!newest || n2.b > newest.b)) newest = n2;
      if (n2.t === 'sub') o += '<polygon points="' + engHex(n2.x, n2.y, rr) + '" fill="' + ECOL.sub + '" stroke="rgba(130,140,220,.8)" stroke-width="1"/>';
      else if (n2.t === 'sig') o += '<rect x="' + (n2.x - rr * 0.8).toFixed(1) + '" y="' + (n2.y - rr * 0.8).toFixed(1) + '" width="' + (rr * 1.6).toFixed(1) + '" height="' + (rr * 1.6).toFixed(1) + '" fill="' + ECOL.sig + '" transform="rotate(45 ' + n2.x + ' ' + n2.y + ')"/>';
      else o += '<circle cx="' + n2.x + '" cy="' + n2.y + '" r="' + rr.toFixed(1) + '" fill="' + (n2.t === 'ent' ? n2.c : ECOL[n2.t]) + '" fill-opacity=".92"/>';
    }
    if (newest) {
      var ag2 = t - newest.b;
      o += '<circle cx="' + newest.x + '" cy="' + newest.y + '" r="' + (newest.r + 3 + ag2 * 10).toFixed(1) + '" fill="none" stroke="#3dff88" stroke-opacity="' + ((1 - ag2 / 0.5) * 0.7).toFixed(2) + '"/>';
    }
    for (var k = 0; k < st.length; k++) {
      var n3 = st[k];
      if (n3.t === 'rep' && t >= n3.b && t - n3.b < 0.9) {
        o += '<circle cx="' + n3.x + '" cy="' + n3.y + '" r="' + (9 + (t - n3.b) * 26).toFixed(1) + '" fill="none" stroke="#f97316" stroke-opacity="' + ((1 - (t - n3.b) / 0.9) * 0.5).toFixed(2) + '"/>';
      }
    }
    var cur = 0;
    for (var p1 = 0; p1 < ENG_PH.length; p1++) if (t >= ENG_PH[p1][1]) cur = p1;
    for (var p2 = 0; p2 < ENG_PH.length; p2++) {
      var x = 14 + p2 * 82;
      var col = p2 === cur ? '#3dff88' : (p2 < cur ? tickDim : tickOff);
      o += '<text x="' + x + '" y="' + (H - 7) + '" font-family="monospace" font-size="6.5" letter-spacing="1.2" fill="' + col + '">' + ENG_PH[p2][0] + '</text>';
      if (p2 === cur) o += '<rect x="' + x + '" y="' + (H - 4) + '" width="30" height="1.5" fill="#3dff88"/>';
    }
    return o + '</g>';
  }

  /* ---------- viewer: fast — clustered knowledge graph w/ filter sweep ---------- */
  var FCL = ['#56B4E9', '#3dff88', '#E69F00', '#CC79A7'];
  function fastInit() {
    var r = srnd(777);
    var centers = [[104, 78], [304, 66], [140, 178], [326, 170]];
    var dots = [];
    centers.forEach(function (c2, c) {
      var cx = c2[0], cy = c2[1];
      for (var i = 0; i < 22; i++) {
        var a = r() * Math.PI * 2, d = r() * r() * 52 + 8;
        dots.push({ x: cx + Math.cos(a) * d * 1.25, y: cy + Math.sin(a) * d, c: c, r: 1.6 + r() * 2, ph: r() * Math.PI * 2, cx: cx, cy: cy });
      }
    });
    return dots;
  }
  function fastDraw(st, ft, inv) {
    var cyc = REDUCED ? 5 : Math.floor(ft / 2.2) % 6;
    var edge = inv ? 'rgba(21,20,15,1)' : 'rgba(230,230,226,1)';
    var o = '';
    for (var i = 0; i < st.length; i++) {
      var d = st[i];
      var hot = cyc >= 4 || d.c === cyc;
      var jx = REDUCED ? 0 : Math.sin(ft * 1.3 + d.ph) * 1.6, jy = REDUCED ? 0 : Math.cos(ft * 1.1 + d.ph) * 1.6;
      o += '<line x1="' + d.cx + '" y1="' + d.cy + '" x2="' + (d.x + jx) + '" y2="' + (d.y + jy) + '" stroke="' + edge + '" stroke-opacity="' + (hot ? 0.08 : 0.02) + '"/>';
      o += '<circle cx="' + (d.x + jx) + '" cy="' + (d.y + jy) + '" r="' + d.r + '" fill="' + FCL[d.c] + '" fill-opacity="' + (hot ? 0.9 : 0.15) + '"/>';
    }
    return o;
  }

  /* ---------- viewer: campus_ai — thematic coding over transcripts ---------- */
  var THEME = ['#CC79A7', '#56B4E9', '#E69F00', '#009E73'];
  function campInit() {
    var r = srnd(2024);
    var segs = [];
    for (var row = 0; row < 9; row++) {
      var x = 22;
      while (x < 360) {
        var w = 14 + r() * 34;
        segs.push({ x: x, w: w, y: 26 + row * 22, hl: r() < 0.24 ? Math.floor(r() * 4) : -1 });
        x += w + 7;
      }
    }
    var k = 0;
    segs.forEach(function (s) { if (s.hl >= 0) s.k = k++; });
    segs.total = k;
    return segs;
  }
  function campDraw(st, ft, inv) {
    var kShow = REDUCED ? st.total : Math.floor((ft % ((st.total + 10) * 0.35)) / 0.35);
    var base = inv ? '#34322a' : '#DAD3C1';
    var o = '';
    for (var i = 0; i < st.length; i++) {
      var s = st[i];
      var lit = s.hl >= 0 && s.k < kShow;
      o += '<rect x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="9" rx="2" fill="' + (lit ? THEME[s.hl] : base) + '" fill-opacity="' + (lit ? 0.85 : 1) + '"/>';
    }
    return o;
  }

  /* ---------- viewer: carlton_dev — the patch drawing itself ---------- */
  var CDT = { view: '#3dff88', txt: '#e6e6e2', data: '#56b4e9', sys: '#9f9f98' };
  function cdInit() {
    var N = [
      { x: 22,  y: 26,  w: 96,  h: 46, t: 'txt',  n: 'hero_txt' },
      { x: 22,  y: 156, w: 112, h: 62, t: 'data', n: 'work_index' },
      { x: 168, y: 176, w: 68,  h: 34, t: 'sys',  n: 'post_fx' },
      { x: 258, y: 30,  w: 140, h: 96, t: 'view', n: 'fscape_view' },
      { x: 306, y: 172, w: 92,  h: 42, t: 'txt',  n: 'readme' },
      { x: 158, y: 66,  w: 74,  h: 34, t: 'sys',  n: 'bg_dither' },
    ];
    return { N: N, E: [[0, 1], [1, 2], [2, 3], [3, 4], [5, 3]] };
  }
  function cdDraw(st, ft, inv) {
    var dot = inv ? 'rgba(42,42,46,0.10)' : 'rgba(230,230,226,0.07)';
    var panel = inv ? '#ece9e2' : '#1b1a20';
    var strk = inv ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.14)';
    var label = inv ? '#4a4a45' : '#c9c9c4';
    var barBg = inv ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)';
    var o = '<defs><pattern id="cdd" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="' + dot + '"/></pattern></defs>'
          + '<rect width="' + W + '" height="' + H + '" fill="url(#cdd)"/>';
    var reveal = REDUCED ? 99 : ft * 1.5;
    for (var i = 0; i < st.E.length; i++) {
      var A = st.N[st.E[i][0]], B2 = st.N[st.E[i][1]];
      var ep = REDUCED ? 1 : Math.min(1, Math.max(0, reveal - Math.max(st.E[i][0], st.E[i][1]) * 0.7));
      if (ep <= 0) continue;
      var d = octi(A.x + A.w, A.y + A.h / 2, B2.x, B2.y + B2.h / 2, 10);
      o += '<path d="' + d + '" fill="none" stroke="#3dff88" stroke-opacity=".4" stroke-width="1.4" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + (1 - ep).toFixed(3) + '"/>';
      if (!REDUCED && ep >= 1) {
        var tt = (ft * 0.3 + i * 0.21) % 1;
        o += '<path d="' + d + '" fill="none" stroke="#3dff88" stroke-width="2.4" stroke-linecap="round" pathLength="1" stroke-dasharray="0.05 1" stroke-dashoffset="' + (-tt).toFixed(3) + '" opacity=".9"/>';
      }
    }
    for (var j = 0; j < st.N.length; j++) {
      var n = st.N[j];
      var np = REDUCED ? 1 : Math.min(1, Math.max(0, reveal - j * 0.7));
      if (np <= 0) continue;
      o += '<g opacity="' + np.toFixed(2) + '" transform="translate(0 ' + ((1 - np) * 6).toFixed(1) + ')">';
      o += '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="5" fill="' + panel + '" stroke="' + strk + '"/>';
      o += '<line x1="' + n.x + '" y1="' + (n.y + 12) + '" x2="' + (n.x + n.w) + '" y2="' + (n.y + 12) + '" stroke="' + strk + '"/>';
      o += '<circle cx="' + (n.x + 7) + '" cy="' + (n.y + 6) + '" r="2" fill="' + CDT[n.t] + '"/>';
      o += '<text x="' + (n.x + 13) + '" y="' + (n.y + 8.5) + '" font-family="monospace" font-size="5.5" letter-spacing="0.6" fill="' + label + '">' + n.n.toUpperCase() + '</text>';
      if (n.t === 'view') {
        var sx = n.x + 30, sy = n.y + 56;
        var px = [[58, 30], [76, 56], [100, 40], [114, 68], [86, 78]];
        var pc = ['#CC79A7', '#56B4E9', '#009E73', '#D55E00', '#F0E442'];
        for (var k = 0; k < px.length; k++) {
          o += '<line x1="' + sx + '" y1="' + sy + '" x2="' + (n.x + px[k][0]) + '" y2="' + (n.y + px[k][1]) + '" stroke="' + strk + '"/>';
          o += '<circle cx="' + (n.x + px[k][0]) + '" cy="' + (n.y + px[k][1]) + '" r="2.2" fill="' + pc[k] + '"/>';
        }
        o += '<circle cx="' + sx + '" cy="' + sy + '" r="3.2" fill="#E69F00"/>';
      } else if (n.t === 'data') {
        var hl = REDUCED ? 0 : Math.floor(ft * 0.7) % 3;
        for (var r2 = 0; r2 < 3; r2++) {
          o += '<rect x="' + (n.x + 8) + '" y="' + (n.y + 20 + r2 * 13) + '" width="' + (n.w - 16) + '" height="6" rx="2" fill="' + (r2 === hl ? 'rgba(61,255,136,0.4)' : barBg) + '"/>';
        }
      } else if (n.t === 'sys') {
        var p = REDUCED ? 0.6 : 0.5 + 0.45 * Math.sin(ft * 1.3 + n.x);
        o += '<rect x="' + (n.x + 8) + '" y="' + (n.y + 20) + '" width="' + (n.w - 16) + '" height="3.5" rx="1.75" fill="' + barBg + '"/>';
        o += '<rect x="' + (n.x + 8) + '" y="' + (n.y + 20) + '" width="' + ((n.w - 16) * p).toFixed(1) + '" height="3.5" rx="1.75" fill="#3dff88"/>';
      } else if (n.n === 'hero_txt') {
        o += '<text x="' + (n.x + 8) + '" y="' + (n.y + 27) + '" font-family="monospace" font-size="7.5" font-weight="700" fill="' + (inv ? '#26261f' : '#e6e6e2') + '">DESIGNER WHO</text>';
        o += '<text x="' + (n.x + 8) + '" y="' + (n.y + 38) + '" font-family="monospace" font-size="7.5" font-weight="700" fill="#3dff88">DEPLOYS_</text>';
      } else {
        o += '<rect x="' + (n.x + 8) + '" y="' + (n.y + 20) + '" width="' + (n.w - 16) + '" height="4" rx="2" fill="' + barBg + '"/>';
        o += '<rect x="' + (n.x + 8) + '" y="' + (n.y + 29) + '" width="' + (n.w - 30) + '" height="4" rx="2" fill="' + barBg + '"/>';
      }
      o += '</g>';
    }
    return o;
  }

  /* ---------- bespoke minis: recreated behavior for the non-featured six.
     Each miniaturizes what the real artifact DID (status flips, saccades,
     phototropism…) in the product's own visual key — no fake product UI,
     no fake data, honest RECREATION labels in the vfoot. ---- */

  /* ---- lab_equipment_portal: real-time equipment board + reservations ---- */
  var LEP_ST = ['#3dff88', '#E69F00', '#DC2626'];
  var LEP_LBL = ['FREE', 'RSVD', 'IN-USE'];
  function lepInit() {
    var r = srnd(3141);
    var cards = [];
    for (var row = 0; row < 3; row++) for (var col = 0; col < 4; col++) {
      var sched = [(r() * 3) | 0, (r() * 3) | 0, (r() * 3) | 0, (r() * 3) | 0];
      cards.push({ x: 16 + col * 100, y: 16 + row * 52, w: 88, h: 42, sched: sched, off: r() * 4, bw: 24 + r() * 46 });
    }
    var blocks = [];
    for (var b = 0; b < 9; b++) blocks.push({ x: 16 + r() * 340, w: 18 + r() * 42, lane: (r() * 2) | 0, s: (r() * 3) | 0, b: 0.4 + b * 0.5 });
    return { cards: cards, blocks: blocks };
  }
  function lepDraw(st, ft, inv) {
    var panel = inv ? '#ece9e2' : '#1b1a20';
    var strk = inv ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.14)';
    var barBg = inv ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var o = '';
    for (var i = 0; i < st.cards.length; i++) {
      var c = st.cards[i];
      var si = REDUCED ? c.sched[0] : c.sched[Math.floor((ft + c.off) / 4.5) % 4];
      var flip = REDUCED ? 1 : Math.min(1, (((ft + c.off) % 4.5)) / 0.3);
      o += '<rect x="' + c.x + '" y="' + c.y + '" width="' + c.w + '" height="' + c.h + '" rx="5" fill="' + panel + '" stroke="' + strk + '"/>';
      o += '<rect x="' + (c.x + 8) + '" y="' + (c.y + 8) + '" width="' + c.bw + '" height="4" rx="2" fill="' + barBg + '"/>';
      o += '<rect x="' + (c.x + 8) + '" y="' + (c.y + 16) + '" width="' + (c.bw * 0.6).toFixed(0) + '" height="3" rx="1.5" fill="' + barBg + '"/>';
      o += '<circle cx="' + (c.x + 12) + '" cy="' + (c.y + c.h - 11) + '" r="' + (3.2 * (0.6 + 0.4 * flip)).toFixed(1) + '" fill="' + LEP_ST[si] + '"/>';
      o += '<text x="' + (c.x + 20) + '" y="' + (c.y + c.h - 8.5) + '" font-family="monospace" font-size="6" letter-spacing="0.8" fill="' + label + '">' + LEP_LBL[si] + '</text>';
    }
    var ty = 178;
    o += '<text x="16" y="' + (ty - 4) + '" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">RESERVATIONS · TODAY</text>';
    for (var l = 0; l < 2; l++) o += '<rect x="16" y="' + (ty + l * 22) + '" width="388" height="16" rx="3" fill="' + barBg + '"/>';
    var reveal = REDUCED ? 99 : ft * 1.2;
    for (var b = 0; b < st.blocks.length; b++) {
      var bl = st.blocks[b];
      var bp = Math.min(1, Math.max(0, reveal - bl.b));
      if (bp <= 0) continue;
      o += '<rect x="' + bl.x.toFixed(0) + '" y="' + (ty + bl.lane * 22 + 2) + '" width="' + (bl.w * bp).toFixed(0) + '" height="12" rx="2" fill="' + LEP_ST[bl.s] + '" fill-opacity="0.55"/>';
    }
    var nowX = 16 + (REDUCED ? 200 : (ft * 14) % 388);
    o += '<line x1="' + nowX.toFixed(0) + '" y1="' + (ty - 10) + '" x2="' + nowX.toFixed(0) + '" y2="' + (ty + 40) + '" stroke="#3dff88" stroke-opacity="0.8"/>';
    return o;
  }

  /* ---- futures_garden: the Orb — NFC objects tap in, a digital soul replies ---- */
  var FG_SHAPES = 4, FG_CYC = 6.5;
  function fgInit() {
    var r = srnd(2040);
    var objs = [];
    for (var i = 0; i < FG_SHAPES; i++) objs.push({ a0: (i / FG_SHAPES) * Math.PI * 2, rx: 82 + r() * 22, ry: 52 + r() * 16, sp: 0.28 + r() * 0.1, kind: i });
    var bars = [];
    for (var b = 0; b < 5; b++) bars.push({ w: 60 + r() * 110, b: 1.6 + b * 0.42 });
    return { objs: objs, bars: bars, cx: 120, cy: 116 };
  }
  function fgShape(kind, x, y, s, col) {
    if (kind === 0) return '<rect x="' + (x - s).toFixed(1) + '" y="' + (y - s).toFixed(1) + '" width="' + (2 * s) + '" height="' + (2 * s) + '" rx="2" fill="' + col + '"/>';
    if (kind === 1) return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + s + '" fill="' + col + '"/>';
    if (kind === 2) return '<polygon points="' + x.toFixed(1) + ',' + (y - s).toFixed(1) + ' ' + (x + s).toFixed(1) + ',' + (y + s).toFixed(1) + ' ' + (x - s).toFixed(1) + ',' + (y + s).toFixed(1) + '" fill="' + col + '"/>';
    return '<polygon points="' + engHex(x, y, s + 1) + '" fill="' + col + '"/>';
  }
  function fgDraw(st, ft, inv) {
    var amber = '#e8a317';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var barBg = inv ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)';
    var objCol = inv ? '#3a3a35' : '#c9c9c4';
    var t = REDUCED ? 2.6 : ft % FG_CYC;
    var active = REDUCED ? 0 : Math.floor(ft / FG_CYC) % FG_SHAPES;
    var pulse = REDUCED ? 0 : Math.sin(ft * 2.2) * 0.5 + 0.5;
    var o = '<defs><radialGradient id="fgo" cx="0.4" cy="0.38" r="0.75">'
      + '<stop offset="0" stop-color="#fff4d8" stop-opacity="0.95"/>'
      + '<stop offset="0.45" stop-color="' + amber + '" stop-opacity="0.75"/>'
      + '<stop offset="1" stop-color="' + amber + '" stop-opacity="0.08"/></radialGradient></defs>';
    o += '<circle cx="' + st.cx + '" cy="' + st.cy + '" r="' + (46 + pulse * 3).toFixed(1) + '" fill="' + amber + '" fill-opacity="0.07"/>';
    o += '<circle cx="' + st.cx + '" cy="' + st.cy + '" r="34" fill="url(#fgo)"/>';
    o += '<circle cx="' + st.cx + '" cy="' + st.cy + '" r="34" fill="none" stroke="' + amber + '" stroke-opacity="0.5"/>';
    for (var i = 0; i < st.objs.length; i++) {
      var ob = st.objs[i];
      var x, y;
      if (i === active && !REDUCED) {
        // the active object eases in, taps the orb (0.8→1.3s), then returns
        var ph = Math.min(1, t / 0.8), ret = t > 4.9 ? Math.min(1, (t - 4.9) / 0.9) : 0;
        var k = ph - ret;
        var hx0 = st.cx + Math.cos(ob.a0 + ft * ob.sp * 0.2) * ob.rx;
        var hy0 = st.cy + Math.sin(ob.a0 + ft * ob.sp * 0.2) * ob.ry;
        var e2 = k * k * (3 - 2 * k);
        x = hx0 + (st.cx + 30 - hx0) * e2;
        y = hy0 + (st.cy - hy0) * e2;
      } else {
        x = st.cx + Math.cos(ob.a0 + ft * ob.sp) * ob.rx;
        y = st.cy + Math.sin(ob.a0 + ft * ob.sp) * ob.ry;
      }
      o += fgShape(ob.kind, x, y, 5, i === active ? amber : objCol);
    }
    if (!REDUCED && t > 0.8 && t < 2.2) {
      var rp = (t - 0.8) / 1.4;
      o += '<circle cx="' + st.cx + '" cy="' + st.cy + '" r="' + (36 + rp * 34).toFixed(1) + '" fill="none" stroke="' + amber + '" stroke-opacity="' + ((1 - rp) * 0.7).toFixed(2) + '" stroke-width="1.5"/>';
    }
    o += '<text x="216" y="52" font-family="monospace" font-size="6" letter-spacing="1.4" fill="' + label + '">DIGITAL SOUL · 2040</text>';
    for (var b = 0; b < st.bars.length; b++) {
      var br = st.bars[b];
      var bp = REDUCED ? 1 : Math.min(1, Math.max(0, (t - br.b) / 0.5));
      var fade = (!REDUCED && t > 5.6) ? Math.max(0, 1 - (t - 5.6) / 0.7) : 1;
      if (bp <= 0) continue;
      o += '<rect x="216" y="' + (64 + b * 16) + '" width="' + (br.w * bp).toFixed(0) + '" height="7" rx="3.5" fill="' + barBg + '" opacity="' + fade.toFixed(2) + '"/>';
      o += '<rect x="216" y="' + (64 + b * 16) + '" width="' + (br.w * bp * 0.22).toFixed(0) + '" height="7" rx="3.5" fill="' + amber + '" fill-opacity="0.4" opacity="' + fade.toFixed(2) + '"/>';
    }
    o += '<text x="216" y="158" font-family="monospace" font-size="6" letter-spacing="1" fill="' + label + '" opacity="0.7">TAP AN OBJECT TO SPEAK</text>';
    return o;
  }

  /* ---- biomimetic_eye: saccades, blinks, RGB ring, servo linkage ---- */
  function beInit() {
    var r = srnd(6070);
    var way = [];
    var t0 = 0.6;
    for (var i = 0; i < 10; i++) { way.push({ x: (r() - 0.5) * 34, y: (r() - 0.5) * 22, t: t0 }); t0 += 0.9 + r() * 1.6; }
    return { way: way, loop: t0, cx: 168, cy: 118 };
  }
  function beGaze(st, t) {
    var w = st.way, gx = 0, gy = 0;
    for (var i = 0; i < w.length; i++) {
      if (t >= w[i].t) {
        var k = Math.min(1, (t - w[i].t) / 0.14); // saccade: fast snap
        var px = i > 0 ? w[i - 1].x : 0, py = i > 0 ? w[i - 1].y : 0;
        var e2 = k * k * (3 - 2 * k);
        gx = px + (w[i].x - px) * e2; gy = py + (w[i].y - py) * e2;
      }
    }
    return [gx, gy];
  }
  function beDraw(st, ft, inv) {
    var t = REDUCED ? 3.0 : ft % st.loop;
    var g = REDUCED ? [6, -3] : beGaze(st, t);
    var gx = g[0], gy = g[1];
    var cx = st.cx, cy = st.cy;
    var housing = inv ? '#ece9e2' : '#1b1a20';
    var strk = inv ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.16)';
    var metal = inv ? '#b9b6ad' : '#4a4a50';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var hue = REDUCED ? 130 : (ft * 24) % 360;
    var ring = 'hsl(' + hue.toFixed(0) + ' 90% 60%)';
    var o = '';
    // servo linkage behind: two arms tracking the gaze from fixed pivots
    var ax = cx - 118, ay = cy - 52, bx = cx - 118, by = cy + 58;
    var ex = cx + gx * 0.8, ey = cy + gy * 0.8;
    o += '<rect x="' + (ax - 14) + '" y="' + (ay - 9) + '" width="24" height="18" rx="3" fill="' + metal + '"/>';
    o += '<rect x="' + (bx - 14) + '" y="' + (by - 9) + '" width="24" height="18" rx="3" fill="' + metal + '"/>';
    o += '<line x1="' + (ax + 10) + '" y1="' + ay + '" x2="' + (ex - 30).toFixed(1) + '" y2="' + (ey - 26).toFixed(1) + '" stroke="' + metal + '" stroke-width="3" stroke-linecap="round"/>';
    o += '<line x1="' + (bx + 10) + '" y1="' + by + '" x2="' + (ex - 30).toFixed(1) + '" y2="' + (ey + 26).toFixed(1) + '" stroke="' + metal + '" stroke-width="3" stroke-linecap="round"/>';
    o += '<circle cx="' + (ex - 30).toFixed(1) + '" cy="' + (ey - 26).toFixed(1) + '" r="3" fill="' + metal + '"/>';
    o += '<circle cx="' + (ex - 30).toFixed(1) + '" cy="' + (ey + 26).toFixed(1) + '" r="3" fill="' + metal + '"/>';
    // housing + RGB ring + sclera
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="64" fill="' + housing + '" stroke="' + strk + '"/>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="56" fill="none" stroke="' + ring + '" stroke-width="2.5" stroke-opacity="0.85" stroke-dasharray="6 4"/>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="46" fill="' + (inv ? '#fbfaf7' : '#e6e6e2') + '"/>';
    // iris + pupil follow the gaze
    var ix = cx + gx, iy = cy + gy;
    o += '<circle cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="20" fill="' + ring + '" fill-opacity="0.85"/>';
    o += '<circle cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="20" fill="none" stroke="' + (inv ? '#26261f' : '#15140F') + '" stroke-opacity="0.5"/>';
    var pup = REDUCED ? 9 : 9 + Math.sin(ft * 0.9) * 1.5;
    o += '<circle cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="' + pup.toFixed(1) + '" fill="' + (inv ? '#26261f' : '#0a0a0b') + '"/>';
    o += '<circle cx="' + (ix - 4).toFixed(1) + '" cy="' + (iy - 5).toFixed(1) + '" r="2.6" fill="#fff" fill-opacity="0.9"/>';
    // blink: lids sweep in every ~3.4s
    var bph = REDUCED ? 1 : (ft % 3.4) / 3.4;
    var blink = (!REDUCED && bph > 0.92) ? Math.sin(((bph - 0.92) / 0.08) * Math.PI) : 0;
    if (blink > 0.02) {
      var lid = 46 * blink;
      o += '<path d="M ' + (cx - 46) + ' ' + cy + ' A 46 46 0 0 1 ' + (cx + 46) + ' ' + cy + ' L ' + (cx + 46) + ' ' + (cy - 46 + lid).toFixed(1) + ' A 46 ' + (46 - lid).toFixed(1) + ' 0 0 0 ' + (cx - 46) + ' ' + (cy - 46 + lid).toFixed(1) + ' Z" transform="rotate(180 ' + cx + ' ' + cy + ')" fill="' + housing + '"/>';
      o += '<path d="M ' + (cx - 46) + ' ' + cy + ' A 46 46 0 0 1 ' + (cx + 46) + ' ' + cy + ' L ' + (cx + 46) + ' ' + (cy - 46 + lid).toFixed(1) + ' A 46 ' + (46 - lid).toFixed(1) + ' 0 0 0 ' + (cx - 46) + ' ' + (cy - 46 + lid).toFixed(1) + ' Z" fill="' + housing + '"/>';
    }
    // readout
    o += '<text x="300" y="86" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">GAZE</text>';
    o += '<text x="300" y="98" font-family="monospace" font-size="7" fill="' + ring + '">X ' + (gx >= 0 ? '+' : '') + gx.toFixed(1) + '</text>';
    o += '<text x="300" y="110" font-family="monospace" font-size="7" fill="' + ring + '">Y ' + (gy >= 0 ? '+' : '') + gy.toFixed(1) + '</text>';
    o += '<text x="300" y="132" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">RGB ' + hue.toFixed(0) + '°</text>';
    return o;
  }

  /* ---- home_lighting: floorplan, wandering presence, lights follow ---- */
  var HL_ROOMS = [
    { x: 24, y: 22, w: 130, h: 92 },
    { x: 154, y: 22, w: 108, h: 92 },
    { x: 262, y: 22, w: 134, h: 92 },
    { x: 24, y: 114, w: 180, h: 100 },
    { x: 204, y: 114, w: 192, h: 100 },
  ];
  function hlInit() {
    // waypoint tour through room centers (loops)
    var order = [0, 1, 2, 4, 3];
    var way = [], t0 = 0.5;
    for (var i = 0; i < order.length; i++) {
      var rm = HL_ROOMS[order[i]];
      way.push({ x: rm.x + rm.w / 2, y: rm.y + rm.h / 2, room: order[i], t: t0 });
      t0 += 2.6;
    }
    return { way: way, loop: t0 };
  }
  function hlPos(st, t) {
    var w = st.way, n = w.length;
    for (var i = 0; i < n; i++) {
      var a = w[i], b = w[(i + 1) % n];
      var t1 = a.t, t2 = i + 1 < n ? b.t : st.loop + w[0].t;
      if (t >= t1 && t < t2) {
        var k = Math.min(1, (t - t1) / 1.1); // walk 1.1s, dwell the rest
        var e2 = k * k * (3 - 2 * k);
        return { x: a.x + (b.x - a.x) * e2, y: a.y + (b.y - a.y) * e2, room: k < 0.5 ? a.room : b.room };
      }
    }
    return { x: w[0].x, y: w[0].y, room: w[0].room };
  }
  function hlDraw(st, ft, inv) {
    var t = REDUCED ? 1.5 : ft % st.loop;
    var p = REDUCED ? { x: st.way[0].x, y: st.way[0].y, room: st.way[0].room } : hlPos(st, t);
    var wall = inv ? 'rgba(0,0,0,0.35)' : 'rgba(230,230,226,0.28)';
    var floor = inv ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';
    var warm = '#ffb648';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var o = '';
    for (var i = 0; i < HL_ROOMS.length; i++) {
      var rm = HL_ROOMS[i];
      // light level: full when occupied, decays after the visitor leaves
      var lit = 0;
      if (i === p.room) lit = 1;
      else if (!REDUCED) {
        // find last dwell end for this room in the loop and decay from it
        for (var wj = 0; wj < st.way.length; wj++) {
          if (st.way[wj].room !== i) continue;
          var leave = st.way[wj].t + 2.6;
          var since = t - leave; if (since < 0) since += st.loop;
          lit = Math.max(lit, Math.max(0, 1 - since / 1.6));
        }
      }
      o += '<rect x="' + rm.x + '" y="' + rm.y + '" width="' + rm.w + '" height="' + rm.h + '" fill="' + floor + '" stroke="' + wall + '" stroke-width="2"/>';
      if (lit > 0.02) {
        o += '<circle cx="' + (rm.x + rm.w / 2) + '" cy="' + (rm.y + rm.h / 2) + '" r="' + (Math.min(rm.w, rm.h) * 0.42).toFixed(0) + '" fill="' + warm + '" fill-opacity="' + (lit * 0.22).toFixed(2) + '"/>';
        o += '<circle cx="' + (rm.x + rm.w / 2) + '" cy="' + (rm.y + rm.h / 2) + '" r="3.4" fill="' + warm + '" fill-opacity="' + (0.25 + lit * 0.75).toFixed(2) + '"/>';
      } else {
        o += '<circle cx="' + (rm.x + rm.w / 2) + '" cy="' + (rm.y + rm.h / 2) + '" r="3.4" fill="none" stroke="' + wall + '"/>';
      }
    }
    // CV camera: corner wedge sweeping; brightens when the visitor is near its aim
    var camA = REDUCED ? 0.8 : 0.7 + Math.sin(ft * 0.6) * 0.5;
    var camX = 396, camY = 22;
    var a1 = Math.PI - camA - 0.3, a2 = Math.PI - camA + 0.3;
    o += '<path d="M ' + camX + ' ' + camY + ' L ' + (camX + Math.cos(a1) * 70).toFixed(0) + ' ' + (camY + Math.sin(a1) * 70).toFixed(0) + ' A 70 70 0 0 1 ' + (camX + Math.cos(a2) * 70).toFixed(0) + ' ' + (camY + Math.sin(a2) * 70).toFixed(0) + ' Z" fill="#3dff88" fill-opacity="0.08"/>';
    o += '<rect x="' + (camX - 7) + '" y="' + (camY - 5) + '" width="10" height="10" rx="2" fill="#3dff88" fill-opacity="0.7"/>';
    // presence dot + trail
    if (!REDUCED) {
      for (var tr = 1; tr <= 4; tr++) {
        var pp = hlPos(st, (t - tr * 0.12 + st.loop) % st.loop);
        o += '<circle cx="' + pp.x.toFixed(1) + '" cy="' + pp.y.toFixed(1) + '" r="' + (3.5 - tr * 0.6).toFixed(1) + '" fill="#3dff88" fill-opacity="' + (0.4 - tr * 0.08).toFixed(2) + '"/>';
      }
    }
    o += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4.5" fill="#3dff88"/>';
    o += '<text x="24" y="' + (H - 8) + '" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">PRESENCE → LUMINAIRES · DECAY 1.6s</text>';
    return o;
  }

  /* ---- synthetic_plant: BEAM phototropism — solar engine fires, stem follows the light ---- */
  function spInit() {
    var r = srnd(808);
    var leaves = [];
    for (var i = 0; i < 5; i++) leaves.push({ h: 0.3 + i * 0.15, side: i % 2 ? 1 : -1, len: 16 + r() * 10, ph: r() * Math.PI * 2 });
    var trace = [];
    for (var s2 = 0; s2 < 64; s2++) trace.push(r());
    return { leaves: leaves, trace: trace, bx: 150, by: 196 };
  }
  function spDraw(st, ft, inv) {
    var stemC = inv ? '#2f6b43' : '#3dff88';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var wall = inv ? 'rgba(0,0,0,0.25)' : 'rgba(230,230,226,0.2)';
    var sun = '#F0E442';
    // light drifts across the top; capacitor charges ~2.4s then FIRES a twitch
    var lx = REDUCED ? 300 : W / 2 + Math.sin(ft * 0.23) * 150;
    var charge = REDUCED ? 0.7 : (ft % 2.4) / 2.4;
    var fire = (!REDUCED && charge > 0.93) ? Math.sin(((charge - 0.93) / 0.07) * Math.PI) : 0;
    // stem bends toward the light (slow) + twitch kick (fast, BEAM-style)
    var bend = (lx - st.bx) * 0.22 * (REDUCED ? 1 : 0.8 + 0.2 * Math.sin(ft * 0.4));
    bend += fire * 9 * (lx > st.bx ? 1 : -1);
    var tipX = st.bx + bend, tipY = st.by - 132;
    var o = '';
    o += '<line x1="16" y1="' + st.by + '" x2="' + (W - 16) + '" y2="' + st.by + '" stroke="' + wall + '" stroke-width="2"/>';
    o += '<circle cx="' + lx.toFixed(1) + '" cy="30" r="11" fill="' + sun + '" fill-opacity="0.9"/>';
    o += '<circle cx="' + lx.toFixed(1) + '" cy="30" r="' + (17 + (REDUCED ? 0 : Math.sin(ft * 3) * 2)).toFixed(1) + '" fill="none" stroke="' + sun + '" stroke-opacity="0.35"/>';
    var d = 'M ' + st.bx + ' ' + st.by + ' Q ' + (st.bx + bend * 0.25).toFixed(1) + ' ' + (st.by - 70) + ' ' + tipX.toFixed(1) + ' ' + tipY;
    o += '<path d="' + d + '" fill="none" stroke="' + stemC + '" stroke-width="3.5" stroke-linecap="round"/>';
    for (var i = 0; i < st.leaves.length; i++) {
      var lf = st.leaves[i];
      var qt = lf.h;
      var px = (1 - qt) * (1 - qt) * st.bx + 2 * (1 - qt) * qt * (st.bx + bend * 0.25) + qt * qt * tipX;
      var py = (1 - qt) * (1 - qt) * st.by + 2 * (1 - qt) * qt * (st.by - 70) + qt * qt * tipY;
      var sway = REDUCED ? 0 : Math.sin(ft * 1.4 + lf.ph) * 4 + fire * 6;
      var ang = lf.side * (34 + sway) + bend * 0.35;
      o += '<ellipse cx="' + (px + lf.side * lf.len * 0.6).toFixed(1) + '" cy="' + (py - 3).toFixed(1) + '" rx="' + lf.len + '" ry="5.5" transform="rotate(' + ang.toFixed(1) + ' ' + px.toFixed(1) + ' ' + py.toFixed(1) + ')" fill="' + stemC + '" fill-opacity="0.55"/>';
    }
    o += '<circle cx="' + tipX.toFixed(1) + '" cy="' + tipY + '" r="6" fill="' + sun + '" fill-opacity="' + (0.35 + charge * 0.5).toFixed(2) + '" stroke="' + stemC + '"/>';
    // solar-engine panel: charge bar + trace
    o += '<text x="300" y="150" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">SOLAR ENGINE</text>';
    o += '<rect x="300" y="156" width="90" height="6" rx="3" fill="' + (inv ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)') + '"/>';
    o += '<rect x="300" y="156" width="' + (90 * charge).toFixed(0) + '" height="6" rx="3" fill="' + (fire > 0 ? sun : stemC) + '"/>';
    var pts = '';
    for (var s2 = 0; s2 < 64; s2++) {
      var tx = 300 + s2 * 1.42;
      var base = Math.sin((s2 / 64) * Math.PI * 4 + (REDUCED ? 0 : ft * 2.6));
      var ty = 176 - base * 6 - st.trace[s2] * 2 - fire * 5;
      pts += tx.toFixed(1) + ',' + ty.toFixed(1) + ' ';
    }
    o += '<polyline points="' + pts + '" fill="none" stroke="' + stemC + '" stroke-opacity="0.7"/>';
    return o;
  }

  /* ---- immersive_experience_builder: room + sensor zones trigger media ---- */
  var IEB_ZONES = [
    { cx: 150, cy: 168, rx: 44, ry: 20, srf: 0 },
    { cx: 250, cy: 196, rx: 50, ry: 22, srf: 1 },
    { cx: 320, cy: 150, rx: 38, ry: 17, srf: 0 },
  ];
  function iebInit() {
    var r = srnd(360);
    var way = [], t0 = 0.5;
    var pen = [[120, 176], [250, 198], [318, 152], [210, 168], [150, 166]];
    for (var i = 0; i < pen.length; i++) { way.push({ x: pen[i][0] + (r() - 0.5) * 10, y: pen[i][1] + (r() - 0.5) * 6, t: t0 }); t0 += 2.2; }
    var bars = [];
    for (var b = 0; b < 6; b++) bars.push(r());
    return { way: way, loop: t0, bars: bars };
  }
  function iebPos(st, t) {
    var w = st.way, n = w.length;
    for (var i = 0; i < n; i++) {
      var a = w[i], b = w[(i + 1) % n];
      var t2 = i + 1 < n ? b.t : st.loop + w[0].t;
      if (t >= a.t && t < t2) {
        var k = Math.min(1, (t - a.t) / 1.0);
        var e2 = k * k * (3 - 2 * k);
        return { x: a.x + (b.x - a.x) * e2, y: a.y + (b.y - a.y) * e2 };
      }
    }
    return { x: w[0].x, y: w[0].y };
  }
  function iebDraw(st, ft, inv) {
    var cyan = '#56b4e9';
    var wall = inv ? 'rgba(0,0,0,0.28)' : 'rgba(230,230,226,0.22)';
    var floor = inv ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';
    var panel = inv ? '#ece9e2' : '#1b1a20';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var t = REDUCED ? 1.2 : ft % st.loop;
    var p = REDUCED ? { x: st.way[0].x, y: st.way[0].y } : iebPos(st, t);
    // room: floor parallelogram + back/left walls (2.5D)
    var o = '<polygon points="90,120 380,120 410,226 60,226" fill="' + floor + '" stroke="' + wall + '" stroke-width="2"/>';
    o += '<polygon points="90,120 380,120 380,34 90,34" fill="' + floor + '" stroke="' + wall + '" stroke-width="2"/>';
    // media surfaces on the back wall
    var srf = [{ x: 116, w: 100 }, { x: 250, w: 100 }];
    var act = [0, 0];
    for (var z = 0; z < IEB_ZONES.length; z++) {
      var zn = IEB_ZONES[z];
      var dx = (p.x - zn.cx) / zn.rx, dy = (p.y - zn.cy) / zn.ry;
      var inside = dx * dx + dy * dy < 1;
      var lv = inside ? 1 : 0;
      act[zn.srf] = Math.max(act[zn.srf], lv);
      o += '<ellipse cx="' + zn.cx + '" cy="' + zn.cy + '" rx="' + zn.rx + '" ry="' + zn.ry + '" fill="' + cyan + '" fill-opacity="' + (0.06 + lv * 0.2).toFixed(2) + '" stroke="' + cyan + '" stroke-opacity="' + (0.3 + lv * 0.6).toFixed(2) + '" stroke-dasharray="4 3"/>';
      if (inside && !REDUCED) {
        var rp2 = (ft * 1.4 + z) % 1;
        o += '<ellipse cx="' + zn.cx + '" cy="' + zn.cy + '" rx="' + (zn.rx * (0.4 + rp2 * 0.8)).toFixed(0) + '" ry="' + (zn.ry * (0.4 + rp2 * 0.8)).toFixed(0) + '" fill="none" stroke="' + cyan + '" stroke-opacity="' + ((1 - rp2) * 0.5).toFixed(2) + '"/>';
      }
    }
    for (var s3 = 0; s3 < srf.length; s3++) {
      var sf = srf[s3], on = act[s3];
      o += '<rect x="' + sf.x + '" y="46" width="' + sf.w + '" height="60" rx="3" fill="' + panel + '" stroke="' + wall + '"/>';
      if (on > 0.02) {
        for (var b3 = 0; b3 < 6; b3++) {
          var bh = REDUCED ? 24 : 10 + (0.5 + 0.5 * Math.sin(ft * 3.1 + b3 * 1.7 + s3 * 2)) * 34 * st.bars[b3];
          o += '<rect x="' + (sf.x + 10 + b3 * 14) + '" y="' + (98 - bh).toFixed(0) + '" width="9" height="' + bh.toFixed(0) + '" fill="' + cyan + '" fill-opacity="' + (0.35 + on * 0.5).toFixed(2) + '"/>';
        }
      } else {
        o += '<text x="' + (sf.x + sf.w / 2) + '" y="80" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1.4" fill="' + label + '">IDLE</text>';
      }
      // cable from each zone to its surface
    }
    for (var z2 = 0; z2 < IEB_ZONES.length; z2++) {
      var zz = IEB_ZONES[z2], tg = srf[zz.srf];
      o += '<path d="M ' + zz.cx + ' ' + (zz.cy - zz.ry) + ' L ' + (tg.x + tg.w / 2) + ' 106" fill="none" stroke="' + cyan + '" stroke-opacity="0.14" stroke-dasharray="2 4"/>';
    }
    // visitor
    o += '<circle cx="' + p.x.toFixed(1) + '" cy="' + (p.y - 8).toFixed(1) + '" r="4" fill="' + (inv ? '#26261f' : '#e6e6e2') + '"/>';
    o += '<line x1="' + p.x.toFixed(1) + '" y1="' + (p.y - 4).toFixed(1) + '" x2="' + p.x.toFixed(1) + '" y2="' + (p.y + 6).toFixed(1) + '" stroke="' + (inv ? '#26261f' : '#e6e6e2') + '" stroke-width="2.5" stroke-linecap="round"/>';
    o += '<text x="60" y="' + (H - 8) + '" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">SENSOR ZONES → MEDIA SURFACES</text>';
    return o;
  }

  /* ---------- registry: 5 featured live previews + 6 recreated minis ---------- */
  var V = {
    'futurescaper': { name: 'futurescaper_view · live_map', foot: 'SELF-GENERATING · STEEPLE · METRO EDGES', aria: 'Futurescaper self-generating consequence map, live synthetic demo', paper: true, init: scapeInit, draw: scapeDraw },
    'futurity-engine': { name: 'futurity_engine_view · BATTERIES.scn', foot: 'SSE REPLAY · LIVE GRAPH · 5 PHASES', aria: 'Futurity Engine growing knowledge graph, live synthetic demo', paper: false, init: engInit, draw: engDraw },
    'fast': { name: 'fast_view · SYNBIO.scn', foot: 'KNOWLEDGE GRAPH · SEMANTIC TYPES', aria: 'FAST clustered knowledge graph, live synthetic demo', paper: false, init: fastInit, draw: fastDraw },
    'campus-ai': { name: 'campus_ai_view · INTERVIEWS.scn', foot: 'THEMATIC CODING · 42 SURVEYS · 8 INTERVIEWS', aria: 'Campus AI research thematic coding, live synthetic demo', paper: true, init: campInit, draw: campDraw },
    'carlton-dev': { name: 'carlton_dev_view · THE_PATCH', foot: 'SELF-PORTRAIT · OPERATORS · LIVE CABLES', aria: 'carlton.dev patch network drawing itself, live preview', paper: false, init: cdInit, draw: cdDraw },
    'lab-equipment-portal': { name: 'lab_portal_view · EQUIP_BOARD', foot: 'RECREATION · REAL-TIME STATUS · RESERVATIONS', aria: 'Lab equipment portal status board, recreated mini preview', paper: false, init: lepInit, draw: lepDraw },
    'futures-garden': { name: 'futures_garden_view · ORB', foot: 'RECREATION · DIGITAL SOULS · NFC ORB', aria: 'Futures Garden orb conversation, recreated mini preview', paper: false, init: fgInit, draw: fgDraw },
    'biomimetic-eye': { name: 'biomimetic_eye_view · SERVO_RIG', foot: 'RECREATION · ANIMATRONIC GAZE · RGB', aria: 'Biomimetic animatronic eye saccading, recreated mini preview', paper: false, init: beInit, draw: beDraw },
    'home-lighting': { name: 'home_lighting_view · FLOORPLAN', foot: 'RECREATION · CV PRESENCE → LIGHTS', aria: 'Home lighting presence-driven floorplan, recreated mini preview', paper: false, init: hlInit, draw: hlDraw },
    'synthetic-plant': { name: 'synthetic_plant_view · BEAM', foot: 'RECREATION · ANALOG · PHOTOTROPISM', aria: 'Synthetic BEAM plant bending toward light, recreated mini preview', paper: false, init: spInit, draw: spDraw },
    'immersive-experience-builder': { name: 'ieb_view · ROOM_SENSORS', foot: 'RECREATION · SENSOR ZONES → MEDIA', aria: 'Immersive experience builder room with sensor zones, recreated mini preview', paper: false, init: iebInit, draw: iebDraw },
  };

  /* ---------- engine: owns one svg viewer (+ optional dither canvas) ----------
     The dithered dissolve reads the visitor's live bg_generator settings
     (patch-bg) so transitions match the page's field. Perf: cover/hot fields
     computed once per transition; each frame is one ImageData rebuild + one
     nearest-neighbor blit. */
  function engine(opts) {
    var svg = opts.svg;
    var dcv = opts.dither || null;
    var dctx = dcv ? dcv.getContext('2d') : null;
    var reg = {};
    Object.keys(V).forEach(function (k) { reg[k] = V[k]; });

    var cur = null, inv = false, ft = 0, state = null, transSeed = 0.137;
    var tOff = null, tOffCtx = null, tImg = null, tCols = 0, tRows = 0, tW = 0, tH = 0;
    var tCover = null, tHot = null, tBaseRGB = [0, 0, 0], tHotRGB = [0, 0, 0], tActive = false;
    var hx = function (h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };

    function beginTransition() {
      if (!dcv || !dctx || REDUCED) { tActive = false; return; }
      var w = dcv.clientWidth | 0, h = dcv.clientHeight | 0;
      if (w < 2 || h < 2) { tActive = false; return; }
      tW = dcv.width = w; tH = dcv.height = h;
      var b = bgSettings();
      var CELL = Math.max(3, Math.min(7, Math.round(b.scale)));
      tCols = Math.max(1, Math.ceil(w / CELL));
      tRows = Math.max(1, Math.ceil(h / CELL));
      tBaseRGB = hx(PAL_BASE[b.pal]);
      var H0 = hx(PAL_HOT[b.pal]);
      tHotRGB = [Math.round(H0[0] * 0.5 + tBaseRGB[0] * 0.5), Math.round(H0[1] * 0.5 + tBaseRGB[1] * 0.5), Math.round(H0[2] * 0.5 + tBaseRGB[2] * 0.5)];
      tCover = new Float32Array(tCols * tRows);
      tHot = new Uint8Array(tCols * tRows);
      for (var gy = 0; gy < tRows; gy++) {
        for (var gx = 0; gx < tCols; gx++) {
          var i = gy * tCols + gx;
          var n = noiseShape(b.noiseT, gx, gy, transSeed);
          tCover[i] = n * 0.82 + 0.18 + (hash01(gx, gy, transSeed) - 0.5) * 0.18;
          var dth = thresh(b.ditherT, gx, gy);
          tHot[i] = (n - dth * 0.5 + (hash01(gx + 5, gy + 9, transSeed) - 0.5) * 0.28) > 0.74 ? 1 : 0;
        }
      }
      if (!tOff) tOff = document.createElement('canvas');
      if (tOff.width !== tCols || tOff.height !== tRows) { tOff.width = tCols; tOff.height = tRows; }
      tOffCtx = tOff.getContext('2d');
      tImg = tOffCtx.createImageData(tCols, tRows);
      dctx.imageSmoothingEnabled = false;
      dcv.style.opacity = '0.88';
      tActive = true;
    }
    function cookTransition(p) {
      if (!tActive || !tCover) return;
      var d = tImg.data;
      for (var i = 0; i < tCover.length; i++) {
        var o = i * 4;
        if (tCover[i] >= p) { var c = tHot[i] ? tHotRGB : tBaseRGB; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
        else d[o + 3] = 0;
      }
      tOffCtx.putImageData(tImg, 0, 0);
      dctx.clearRect(0, 0, tW, tH);
      dctx.drawImage(tOff, 0, 0, tCols, tRows, 0, 0, tW, tH);
    }
    function endTransition() {
      tActive = false;
      if (dctx) dctx.clearRect(0, 0, tW, tH);
      if (dcv) dcv.style.opacity = '0';
      tCover = null; tHot = null;
    }

    function bg() {
      var paper = inv ? !reg[cur].paper : reg[cur].paper;
      svg.style.background = paper ? '#F4F1EA' : '#15140F';
    }
    function draw() { svg.innerHTML = reg[cur].draw(state, ft, inv); }

    function select(slug, invert) {
      if (!reg[slug]) slug = cur;
      var changed = slug !== cur;
      inv = !!invert;
      if (changed) {
        cur = slug; ft = 0; transSeed = Math.random(); state = reg[cur].init();
        svg.setAttribute('aria-label', reg[cur].aria);
        beginTransition();
      }
      bg();
      if (REDUCED) draw();
      return changed;
    }

    function boot(slug0) {
      cur = reg[slug0] ? slug0 : Object.keys(reg)[0];
      state = reg[cur].init();
      svg.setAttribute('aria-label', reg[cur].aria);
      bg();
      if (REDUCED) { draw(); return; }
      beginTransition();
      var vfc = 0;
      (function frame() {
        if (!svg.isConnected) return;
        ft += 1 / 60;
        if ((vfc++ & 1) === 0) draw();
        if (tActive) { if (ft < TRANS) cookTransition(ft / TRANS); else endTransition(); }
        requestAnimationFrame(frame);
      })();
    }

    return {
      has: function (s) { return !!reg[s]; },
      meta: function (s) { return reg[s]; },
      current: function () { return cur; },
      select: select,
      boot: boot,
    };
  }

  window.Previs = { engine: engine, reduced: REDUCED, W: W, H: H };
})();
