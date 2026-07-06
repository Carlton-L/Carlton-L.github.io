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

  /* ---------- viewer: fast — the subject page: graph layer + identity card + index cards ----------
     Miniature of the real subject-page hero. NODE_TYPE_COLORS are the product's
     exact hexes; the network sits behind a glass identity card and three index
     cards, and a traversable Subject node periodically pulses and hands off. */
  var FAST_TYPES = {
    Subject: '#4252BD', Organization: '#E07B91', Press: '#E69500',
    Patent: '#C3DE6D', Paper: '#20C6DB', Book: '#46ACC8',
  };
  /* content: Carlton's real "Interstellar Propulsion Lab" — real index values
     where the lab has them; N/A = the product's not-yet-computed state.
     THREE scenes with distinct topologies so the traversal reads: subject page
     → patent SOURCE SNAPSHOT (the page changes: no index cards, View Source)
     → a sparser subject → loop. Subject scenes carry Carlton's tuned shape:
     nucleus of papers+patents, ring of orgs+press, outer cloud of subjects. */
  var FAST_SCENES = [
    { kind: 'subject', name: 'DIGITAL TWIN', hr: '6.0', ws: '4.0', tt: '7.0', seed: 4242, nuc: 8, ring: 5, cloud: 4, goType: 'Patent', goText: 'Go to patent' },
    { kind: 'patent', name: 'CN-115955011-A', seed: 777, goType: 'Subject', goText: 'Go to solar sail' },
    { kind: 'subject', name: 'SOLAR SAIL', hr: 'N/A', ws: 'N/A', tt: 'N/A', seed: 91, nuc: 4, ring: 3, cloud: 5, goType: 'Subject', goText: 'Go to digital twin' },
  ];
  var FAST_IDX = [
    { abbr: 'HR', label: 'HORIZON RANK', key: 'hr', c: '#D4AF37' },
    { abbr: 'WS', label: 'WHITE SPACE', key: 'ws', c: '#20B2AA' },
    { abbr: 'TT', label: 'TECH TRANSFER', key: 'tt', c: '#FF6B47' },
  ];
  function fastSubjScene(sc, cx, cy) {
    var r = srnd(sc.seed);
    var NUC_T = ['Paper', 'Patent'], RING_T = ['Organization', 'Press'];
    var nodes = [{ bx: cx, by: cy, r: 6, type: 'Subject', hub: true, ph: 0 }];
    var edges = [];
    var i, a, d;
    for (i = 0; i < sc.nuc; i++) {
      a = (i / sc.nuc) * 6.283 + r() * 0.5;
      d = 34 + r() * 16;
      nodes.push({ bx: cx + Math.cos(a) * d * 1.5, by: cy + Math.sin(a) * d, r: 2.2 + r() * 1.6, type: NUC_T[i % 2], ph: r() * 6.28 });
      edges.push([0, nodes.length - 1]);
    }
    for (i = 1; i + 1 <= sc.nuc; i += 3) edges.push([i, i + 1]);
    for (i = 0; i < sc.ring; i++) {
      a = (i / sc.ring) * 6.283 + 0.7 + r() * 0.4;
      d = 66 + r() * 14;
      nodes.push({ bx: cx + Math.cos(a) * d * 1.5, by: cy + Math.sin(a) * d, r: 2.2 + r() * 1.2, type: RING_T[i % 2], ph: r() * 6.28 });
      edges.push([0, nodes.length - 1]);
    }
    for (i = 0; i < sc.cloud; i++) {
      a = (i / sc.cloud) * 6.283 + 1.3 + r() * 0.5;
      d = 94 + r() * 14;
      nodes.push({ bx: cx + Math.cos(a) * d * 1.45, by: cy + Math.sin(a) * d, r: 2.8 + r() * 1.4, type: 'Subject', ph: r() * 6.28 });
      edges.push([0, nodes.length - 1]);
    }
    for (i = 1; i < nodes.length; i++) { if (nodes[i].type === sc.goType) { nodes[i].go = true; break; } }
    return { nodes: nodes, edges: edges };
  }
  function fastPatentScene(sc, cx, cy) {
    var r = srnd(sc.seed);
    var nodes = [{ bx: cx, by: cy, r: 5.5, type: 'Patent', hub: true, ph: 0 }];
    var edges = [];
    var spec = [
      [-120, -42, 'Subject', 3.6, true],
      [112, -55, 'Subject', 3.2, false],
      [72, 56, 'Patent', 2.8, false],
      [148, 22, 'Patent', 2.4, false],
      [-82, 62, 'Paper', 2.6, false],
      [-155, 14, 'Paper', 2.3, false],
    ];
    for (var i = 0; i < spec.length; i++) {
      var s = spec[i];
      nodes.push({ bx: cx + s[0] + r() * 8, by: cy + s[1] + r() * 6, r: s[3], type: s[2], ph: r() * 6.28, go: s[4] });
      edges.push([0, nodes.length - 1]);
    }
    edges.push([3, 4]);
    edges.push([5, 6]);
    return { nodes: nodes, edges: edges };
  }
  function fastInit() {
    var cx = W / 2, cy = H / 2 + 6;
    var scenes = [];
    for (var i = 0; i < FAST_SCENES.length; i++) {
      var sc = FAST_SCENES[i];
      scenes.push(sc.kind === 'subject' ? fastSubjScene(sc, cx, cy) : fastPatentScene(sc, cx, cy));
    }
    return { scenes: scenes, cx: cx, cy: cy };
  }
  function fastDraw(st, ft, inv) {
    var period = 5.2;
    var idx = REDUCED ? 0 : Math.floor(ft / period) % FAST_SCENES.length;
    var sc = FAST_SCENES[idx];
    var scene = st.scenes[idx];
    var localT = REDUCED ? 1 : ft % period;
    var ain = REDUCED ? 1 : Math.min(1, localT / 0.45);
    var selOn = !REDUCED && localT > 3.2 && localT < 4.9;
    var edge = inv ? 'rgba(21,20,15,0.5)' : 'rgba(200,200,200,0.28)';
    var o = '<g opacity="' + ain.toFixed(2) + '">';
    var i, n, goNode = null;
    for (i = 0; i < scene.nodes.length; i++) {
      n = scene.nodes[i];
      var k = n.hub ? 0.3 : 1;
      n.x = n.bx + (REDUCED ? 0 : Math.sin(ft * 1.1 + n.ph) * 1.4 * k);
      n.y = n.by + (REDUCED ? 0 : Math.cos(ft * 0.9 + n.ph) * 1.4 * k);
      if (n.go) goNode = n;
    }
    for (i = 0; i < scene.edges.length; i++) {
      var e = scene.edges[i];
      var A = scene.nodes[e[0]], B = scene.nodes[e[1]];
      var lit = selOn && (A.go || B.go);
      o += '<line x1="' + A.x.toFixed(1) + '" y1="' + A.y.toFixed(1) + '" x2="' + B.x.toFixed(1) + '" y2="' + B.y.toFixed(1) + '" stroke="' + (lit ? 'rgba(61,255,136,0.55)' : edge) + '" stroke-width="' + (lit ? 1.4 : 1) + '"/>';
    }
    for (i = 0; i < scene.nodes.length; i++) {
      n = scene.nodes[i];
      var col = FAST_TYPES[n.type] || '#999';
      var lit2 = selOn && n.go;
      var pr = lit2 ? n.r * (1 + Math.sin(ft * 5) * 0.2) : n.r;
      o += '<circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + pr.toFixed(1) + '" fill="' + col + '" fill-opacity="' + (n.hub ? 1 : 0.92) + '"/>';
      if (lit2) o += '<circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + (pr + 1.6).toFixed(1) + '" fill="none" stroke="#fff" stroke-width="1.1"/>';
    }
    if (sc.kind === 'subject') {
      o += fastCard(sc, inv);
      o += fastIndexCards(sc, inv);
    } else {
      o += fastSnapshotCard(sc, inv);
    }
    if (selOn && goNode) {
      var txt = sc.goText;
      var pillW = 34 + txt.length * 4.8;
      var pillX = st.cx - pillW / 2, pillY = H - 30;
      o += '<g opacity="0.96"><rect x="' + pillX.toFixed(1) + '" y="' + pillY + '" width="' + pillW.toFixed(1) + '" height="17" rx="8.5" fill="#4252BD"/>';
      o += '<text x="' + st.cx + '" y="' + (pillY + 11.5) + '" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#fff">' + esc(txt) + ' &#9656;</text></g>';
    }
    return o + '</g>';
  }
  function fastCard(subj, inv) {
    var x = 14, y = 16, w = 150, h = 70;
    var o = '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="rgba(16,16,22,0.78)" stroke="rgba(255,255,255,0.14)"/>';
    o += '<text x="' + (x + 11) + '" y="' + (y + 15) + '" font-family="monospace" font-size="5.5" letter-spacing="1.4" fill="rgba(255,255,255,0.42)">SUBJECT</text>';
    o += '<text x="' + (x + 11) + '" y="' + (y + 30) + '" font-family="sans-serif" font-size="11" font-weight="900" fill="#fff">' + esc(subj.name) + '</text>';
    o += '<rect x="' + (x + 11) + '" y="' + (y + 40) + '" width="' + (w - 22) + '" height="3.2" rx="1.6" fill="rgba(255,255,255,0.14)"/>';
    o += '<rect x="' + (x + 11) + '" y="' + (y + 47) + '" width="' + (w - 46) + '" height="3.2" rx="1.6" fill="rgba(255,255,255,0.1)"/>';
    var cx0 = x + 11;
    for (var i = 0; i < FAST_IDX.length; i++) {
      var m = FAST_IDX[i];
      o += '<circle cx="' + (cx0 + 4) + '" cy="' + (y + 60) + '" r="3" fill="' + m.c + '"/>';
      o += '<text x="' + (cx0 + 10) + '" y="' + (y + 62.5) + '" font-family="monospace" font-size="6.5" fill="rgba(255,255,255,0.82)">' + m.abbr + ' ' + subj[m.key] + '</text>';
      cx0 += 44;
    }
    return o + '</g>';
  }
  function fastIndexCards(subj, inv) {
    var o = '<g>';
    var x = W - 78, y = 16;
    for (var i = 0; i < FAST_IDX.length; i++) {
      var m = FAST_IDX[i];
      var cy = y + i * 34;
      o += '<rect x="' + x + '" y="' + cy + '" width="64" height="28" rx="6" fill="rgba(16,16,22,0.78)" stroke="rgba(255,255,255,0.1)"/>';
      o += '<rect x="' + x + '" y="' + cy + '" width="64" height="2" rx="1" fill="' + m.c + '"/>';
      o += '<text x="' + (x + 58) + '" y="' + (cy + 17) + '" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="900" fill="' + m.c + '">' + subj[m.key] + '</text>';
      o += '<text x="' + (x + 58) + '" y="' + (cy + 25) + '" text-anchor="end" font-family="monospace" font-size="4.6" letter-spacing="0.6" fill="rgba(255,255,255,0.45)">' + m.label + '</text>';
    }
    return o + '</g>';
  }
  function fastSnapshotCard(sc, inv) {
    var x = 14, y = 16, w = 158, h = 66;
    var o = '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="rgba(16,16,22,0.78)" stroke="rgba(255,255,255,0.14)"/>';
    o += '<text x="' + (x + 11) + '" y="' + (y + 15) + '" font-family="monospace" font-size="5.5" letter-spacing="1.4" fill="rgba(255,255,255,0.42)">PATENT SNAPSHOT</text>';
    o += '<text x="' + (x + 11) + '" y="' + (y + 30) + '" font-family="sans-serif" font-size="10.5" font-weight="900" fill="#fff">' + esc(sc.name) + '</text>';
    o += '<rect x="' + (x + 11) + '" y="' + (y + 38) + '" width="' + (w - 22) + '" height="3.2" rx="1.6" fill="rgba(255,255,255,0.14)"/>';
    o += '<rect x="' + (x + 11) + '" y="' + (y + 45) + '" width="' + (w - 52) + '" height="3.2" rx="1.6" fill="rgba(255,255,255,0.1)"/>';
    o += '<rect x="' + (x + 11) + '" y="' + (y + 52) + '" width="62" height="11" rx="3" fill="#fff"/>';
    o += '<text x="' + (x + 42) + '" y="' + (y + 60) + '" text-anchor="middle" font-family="sans-serif" font-size="6.5" font-weight="700" fill="#111">View Source &#8599;</text>';
    return o + '</g>';
  }

  /* ---------- viewer: campus_ai — FUNNEL.scn, the research pipeline cooking
       42 screened → 8 seats → 1,117 coded moments → 7 themes → 4 recs.
       Real study numbers; 9s loop; REDUCED renders the finished state. ---------- */
  var FWONG = ['#CC79A7', '#F0E442', '#56B4E9', '#E69F00', '#009E73', '#0072B2', '#D55E00'];
  var FBARS = [11, 44, 77, 17, 41, 72, 41];
  var FRECS = ['HUMAN FACE', 'PROXY FEEDBK', 'GPS ROUTE', 'JOB MARKET'];
  var FSTAGES = [['SCREENED', 46], ['SEATS', 132], ['HIGHLIGHTS', 214], ['THEMES', 300], ['RECS', 376]];
  function funInit() {
    var dots = [];
    for (var d = 0; d < 42; d++) dots.push([24 + (d % 6) * 9, 104 + Math.floor(d / 6) * 9]);
    var seats = [];
    for (var s2 = 0; s2 < 8; s2++) seats.push([118 + (s2 % 2) * 26, 90 + Math.floor(s2 / 2) * 22]);
    return { dots: dots, seats: seats };
  }
  function funDraw(st, ft, inv) {
    var t = REDUCED ? 99 : ft % 9;
    var fg = inv ? '#2a2a26' : '#e6e6e2';
    var dim = inv ? 'rgba(0,0,0,0.45)' : '#6b6b66';
    var seat0 = inv ? 'rgba(0,0,0,0.15)' : 'rgba(61,255,136,0.15)';
    var o = '';
    var i;
    for (i = 0; i < FSTAGES.length; i++) {
      o += '<text x="' + FSTAGES[i][1] + '" y="26" text-anchor="middle" font-family="monospace" font-size="7" letter-spacing="1" fill="' + dim + '">' + FSTAGES[i][0] + '</text>';
    }
    var AX = [88, 172, 256, 338];
    for (i = 0; i < 4; i++) {
      o += '<text x="' + AX[i] + '" y="128" text-anchor="middle" font-family="monospace" font-size="9" fill="#3dff88">&#9472;&#9656;</text>';
    }
    for (i = 0; i < st.dots.length; i++) {
      var dOp = t > 0.4 + i * 0.028 ? 0.18 : 0.85;
      o += '<circle cx="' + st.dots[i][0] + '" cy="' + st.dots[i][1] + '" r="2.6" fill="' + (inv ? '#4a4a45' : '#9f9f98') + '" opacity="' + dOp + '"/>';
    }
    for (i = 0; i < st.seats.length; i++) {
      var lit = t > 1.7 + i * 0.14;
      o += '<circle cx="' + st.seats[i][0] + '" cy="' + st.seats[i][1] + '" r="7" fill="none" stroke="' + (lit ? '#3dff88' : seat0) + '"/>';
    }
    var n = Math.max(0, Math.min(1, (t - 3.1) / 2.4));
    var cn = Math.floor(n * 1117);
    var cs = cn >= 1000 ? '1,' + ('00' + (cn - 1000)).slice(-3) : String(cn);
    o += '<text x="214" y="124" text-anchor="middle" font-family="monospace" font-size="20" font-weight="700" fill="' + fg + '">' + cs + '</text>';
    o += '<text x="214" y="140" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1" fill="' + dim + '">CODED MOMENTS</text>';
    for (i = 0; i < 7; i++) {
      var by = 66 + i * 15;
      var bp = Math.max(0, Math.min(1, (t - 5.6 - i * 0.14) / 0.5));
      o += '<rect x="282" y="' + by + '" width="40" height="8" rx="2" fill="' + (inv ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)') + '"/>';
      if (bp > 0) o += '<rect x="282" y="' + by + '" width="' + (bp * (FBARS[i] / 77) * 40).toFixed(1) + '" height="8" rx="2" fill="' + FWONG[i] + '"/>';
    }
    for (i = 0; i < 4; i++) {
      var rOp = t > 7.1 + i * 0.3 ? 1 : 0.12;
      var ry = 62 + i * 26;
      o += '<g opacity="' + rOp + '"><rect x="346" y="' + ry + '" width="62" height="16" rx="3" fill="none" stroke="#3dff88"/>';
      o += '<text x="377" y="' + (ry + 10.5) + '" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="0.5" fill="#3dff88">' + FRECS[i] + '</text></g>';
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

  /* ---- lab_equipment_portal: real-time equipment board + QR check-out log ---- */
  var LEP_ST = ['#3dff88', '#DC2626'];
  var LEP_LBL = ['FREE', 'IN-USE'];
  function lepInit() {
    var r = srnd(3141);
    var cards = [];
    for (var row = 0; row < 3; row++) for (var col = 0; col < 4; col++) {
      var sched = [(r() * 2) | 0, (r() * 2) | 0, (r() * 2) | 0, (r() * 2) | 0];
      cards.push({ x: 16 + col * 100, y: 16 + row * 52, w: 88, h: 42, sched: sched, off: r() * 4, bw: 24 + r() * 46 });
    }
    var blocks = [];
    for (var b = 0; b < 9; b++) blocks.push({ x: 16 + r() * 340, w: 18 + r() * 42, lane: (r() * 2) | 0, s: (r() * 2) | 0, b: 0.4 + b * 0.5 });
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
    o += '<text x="16" y="' + (ty - 4) + '" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">CHECK-OUT LOG · TODAY</text>';
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

  /* ---- grid_lamp: 4x4 kinetic bed, wave pattern, ember-to-cool coupling.
     LIVE (not a recreation): same behavioral rules as the full sim on the
     case-study page — level drives radius, brightness and warmth together.
     Since 2026-07-06 this svg mini is the FALLBACK only: the reg entry is
     gl:true, so the engine overlays the case study's real three.js studio
     view (public/js/previs-gl.js, lazy). The mini still covers reduced
     motion, WebGL/CDN failure, and the load gap before the canvas is live. ---- */
  function glampInit() {
    var r = srnd(1616);
    var jit = [];
    for (var i = 0; i < 16; i++) jit.push(r() * 0.6);
    return { jit: jit };
  }
  function glampDraw(st, ft, inv) {
    var panel = inv ? '#ece9e2' : '#141317';
    var strk = inv ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.14)';
    var label = inv ? '#4a4a45' : '#9f9f98';
    var o = '<rect x="52" y="14" width="236" height="200" rx="14" fill="' + panel + '" stroke="' + strk + '"/>';
    var sum = 0;
    for (var row = 0; row < 4; row++) for (var col = 0; col < 4; col++) {
      var i = row * 4 + col;
      var ph = REDUCED ? 1.1 : ft * 1.5;
      var lv = 0.5 + 0.5 * Math.sin(ph - (col + row) * 0.85 + st.jit[i]);
      sum += lv;
      var cx = 88 + col * 55, cy = 50 + row * 44;
      var wr = Math.round(255 - lv * 32), wg = Math.round(157 + lv * 74), wb = Math.round(84 + lv * 167);
      var rad = 8 + lv * 11;
      o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad.toFixed(1) + '" fill="rgb(' + wr + ',' + wg + ',' + wb + ')" fill-opacity="' + (0.25 + lv * 0.7).toFixed(2) + '" stroke="' + strk + '"/>';
      o += '<circle cx="' + cx + '" cy="' + cy + '" r="19" fill="none" stroke="' + strk + '"/>';
    }
    var avg = sum / 16;
    o += '<text x="300" y="30" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">WAVE</text>';
    o += '<rect x="300" y="38" width="90" height="6" rx="3" fill="' + (inv ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)') + '"/>';
    o += '<rect x="300" y="38" width="' + (90 * avg).toFixed(0) + '" height="6" rx="3" fill="#E69F00"/>';
    o += '<text x="300" y="58" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">AVG ' + Math.round(avg * 100) + '%</text>';
    o += '<text x="52" y="' + (H - 8) + '" font-family="monospace" font-size="6" letter-spacing="1.2" fill="' + label + '">HEIGHT = BRIGHTNESS = WARMTH · ONE NUMBER PER CYLINDER</text>';
    return o;
  }

  /* ---------- registry: live previews + recreated minis ---------- */
  var V = {
    'grid-lamp': { name: 'grid_lamp_view · KINETIC_4x4', foot: 'LIVE SIM · 3D STUDIO · WAVE · AUTO-ORBIT', aria: 'GRID kinetic lamp, the case study 3D studio view with the wave pattern running and a slow orbit, live preview', paper: false, gl: true, init: glampInit, draw: glampDraw },
    'futurescaper': { name: 'futurescaper_view · live_map', foot: 'SELF-GENERATING · STEEPLE · METRO EDGES', aria: 'Futurescaper self-generating consequence map, live synthetic demo', paper: true, init: scapeInit, draw: scapeDraw },
    'futurity-engine': { name: 'futurity_engine_view · BATTERIES.scn', foot: 'SSE REPLAY · LIVE GRAPH · 5 PHASES', aria: 'Futurity Engine growing knowledge graph, live synthetic demo', paper: false, init: engInit, draw: engDraw },
    'fast': { name: 'fast_view · INTERSTELLAR.scn', foot: 'SUBJECT PAGE → PATENT SNAPSHOT · TRAVERSAL', aria: 'FAST subject page traversing to a patent source snapshot and back, live synthetic demo', paper: false, init: fastInit, draw: fastDraw },
    'campus-ai': { name: 'campus_ai_view · FUNNEL.scn', foot: '42 → 8 → 1,117 → 7 → 4 · THE PIPELINE COOKS', aria: 'Campus AI research pipeline: 42 screened become 8 interviews, 1,117 coded moments, 7 themes and 4 recommendations, animated with the real study numbers', paper: false, init: funInit, draw: funDraw },
    'carlton-dev': { name: 'carlton_dev_view · THE_PATCH', foot: 'SELF-PORTRAIT · OPERATORS · LIVE CABLES', aria: 'carlton.dev patch network drawing itself, live preview', paper: false, init: cdInit, draw: cdDraw },
    'lab-equipment-portal': { name: 'lab_portal_view · EQUIP_BOARD', foot: 'RECREATION · REAL-TIME STATUS · QR CHECK-OUT', aria: 'Lab equipment portal status board, recreated mini preview', paper: false, init: lepInit, draw: lepDraw },
    'futures-garden': { name: 'futures_garden_view · ORB', foot: 'RECREATION · DIGITAL SOULS · NFC ORB', aria: 'Futures Garden orb conversation, recreated mini preview', paper: false, init: fgInit, draw: fgDraw },
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

    /* ---------- 3D overlay (reg entries with gl:true — grid_lamp) ----------
       A WebGL canvas slotted between the svg and the dither canvas runs the
       case study's real three.js studio scene (window.PrevisGL, defined in
       public/js/previs-gl.js — that file also pulls THREE + POSTPROCESSING
       from CDN). Everything loads lazily on first selection, so pages that
       never select grid_lamp ship nothing. The svg mini keeps cooking
       underneath until the canvas is live, and stays the whole story under
       prefers-reduced-motion or any load failure. The dither dissolve sits
       above the canvas, so scene transitions keep working. INVERT rides a
       css filter (invert + hue-rotate keeps the ember family warm). */
    var glc = null, glh = null, glWant = false, glFail = false;
    function glCanvas() {
      if (glc) return glc;
      glc = document.createElement('canvas');
      glc.className = 'viewer-gl';
      glc.setAttribute('aria-hidden', 'true');
      glc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none;';
      svg.parentNode.insertBefore(glc, svg.nextSibling);
      return glc;
    }
    function glOn() { return !!(glh && glc && glc.style.display !== 'none'); }
    function glRunner(cb) {
      if (window.PrevisGL) { cb(); return; }
      var ex = document.querySelector('script[data-previs-gl]');
      if (ex) { ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
      var s = document.createElement('script');
      s.setAttribute('data-previs-gl', '1');
      s.src = '/js/previs-gl.js';
      s.onload = cb;
      s.onerror = function () { glFail = true; };
      document.head.appendChild(s);
    }
    function glShow() {
      glRunner(function () {
        if (!window.PrevisGL) { glFail = true; return; }
        window.PrevisGL.ready(function (ok) {
          if (!ok) { glFail = true; return; }
          if (!glWant || !glc || !glc.isConnected) return;
          if (!glh) glh = window.PrevisGL.attach(glc);
          if (!glh) { glFail = true; return; }
          glc.style.display = 'block';
          glh.start();
          draw();
        });
      });
    }
    function glSync() {
      glWant = !!(reg[cur].gl && !REDUCED && !glFail);
      if (glWant) { glCanvas(); glShow(); }
      else if (glc) {
        glc.style.display = 'none';
        if (glh) glh.stop();
      }
      if (glc) glc.style.filter = inv ? 'invert(1) hue-rotate(180deg)' : '';
    }

    function draw() {
      if (glOn()) { if (svg.firstChild) svg.innerHTML = ''; return; }
      svg.innerHTML = reg[cur].draw(state, ft, inv);
    }

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
      glSync();
      if (REDUCED) draw();
      return changed;
    }

    function boot(slug0) {
      cur = reg[slug0] ? slug0 : Object.keys(reg)[0];
      state = reg[cur].init();
      svg.setAttribute('aria-label', reg[cur].aria);
      bg();
      glSync();
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
