/**
 * patch-runtime — the message bus behind the cables (P1).
 *
 * One declaration (PatchField's `links` array) renders a cable AND creates a
 * subscription; every routed delivery pulses the wire that carries it
 * (visual = truth). Vanilla IIFE, inlined by PatchField (comments/indentation
 * are stripped there in prod — keep this file free of `//` and `/*` inside
 * string/regex literals). One singleton per document that survives
 * ClientRouter swaps — but every REGISTRATION (fields, nodes, timers,
 * listeners, observers) is torn down on `astro:before-swap`, so page scripts
 * re-register per page and nothing leaks across navigations.
 *
 *   const net  = Patch.field('net');            // scope = PatchField id
 *   const node = net.node('opIndex', {
 *     outs:   { selection: 'object' },          // typed out-ports (DEV-checked)
 *     ins:    { tick: (msg, meta) => … },       // in-port handlers
 *     filter: { selection: (msg) => … },        // transform pass-through;
 *   });                                         //   `undefined` blocks (MUTE)
 *   node.emit('selection', { slug });           // routed along links → pulses
 *   node.every / node.timeout / node.observe / node.listen / node.cleanup
 *   net.channel('param:density', { persist: 'patch-bg.density' })
 *   Patch.on('mode' | 'duo', fn)                // wraps patchmode / patch:duo
 *   Patch.stats()                               // live counts (leak assert)
 *
 * Routing: links may carry ports — ['opIndex:selection', 'opFx']. A portless
 * FROM end carries any emitted channel; a portless TO end delivers on the
 * same channel name (old two-string links stay valid and purely visual).
 * A node declaring filter[channel] transforms the message and passes the
 * result downstream (the fx-chain); nodes without a filter are terminal.
 * Delivery is synchronous, depth-first, hop-capped at 16. Cycles are refused
 * at registration in DEV (warn + drop the closing link).
 *
 * Kill switch: ?nopatch=1 → Patch.field() returns inert stubs; cables stay
 * visual-only and registration code runs without effect.
 */
(() => {
  if (window.Patch) return; /* singleton — survives ClientRouter swaps */
  var DEV = false; // @dev — PatchField flips this to true in dev builds

  const S = { fields: 0, nodes: 0, timers: 0, listeners: 0, observers: 0 };
  let FIELDS = {}, GLOBALS = [];
  const NOOP = () => {};
  const SNODE = { el: null, emit: NOOP, every: NOOP, timeout: NOOP, observe: NOOP, listen: NOOP, cleanup: NOOP };
  const SFIELD = { stub: 1, pulses: [], links: NOOP, pulse: NOOP, node: () => SNODE, channel: () => ({ emit: NOOP, on: NOOP }) };

  const pe = (s) => { const i = s.indexOf(':'); return i < 0 ? [s, null] : [s.slice(0, i), s.slice(i + 1)]; };
  /* persist path 'store.key' → merge { key: v } into localStorage JSON at store */
  const persistTo = (path, v) => {
    const i = path.indexOf('.');
    try {
      const k = path.slice(0, i), o = JSON.parse(localStorage.getItem(k) || '{}') || {};
      o[path.slice(i + 1)] = v;
      localStorage.setItem(k, JSON.stringify(o));
    } catch (e) {}
  };

  const makeField = (id) => {
    let nodes = {}, chans = {}, L = [];
    /* synchronous depth-first delivery; filters pass results downstream */
    const route = (fi, chan, msg, hops) => {
      if (hops > 16) {
        //<dev
        if (DEV) console.warn('[patch] hop cap', fi, chan);
        //>dev
        return;
      }
      for (const l of L) {
        if (l.f !== fi || (l.fp && l.fp !== chan)) continue;
        const ch = l.tp || chan, n = nodes[l.t], flt = n && n.spec.filter && n.spec.filter[ch];
        let m = msg;
        if (flt) { m = flt(msg); if (m === undefined) continue; } /* MUTE */
        F.pulse(l.f, l.t);
        const ins = n && n.spec.ins && n.spec.ins[ch];
        if (ins) ins(m, { from: fi, channel: ch });
        if (flt) route(l.t, ch, m, hops + 1);
      }
    };
    const F = {
      id,
      pulses: [], /* consumed by PatchField's cookWires (one-shot dots) */
      links: (arr) => {
        L = arr.map((lk) => { const a = pe('' + lk[0]), b = pe('' + lk[1]); return { f: a[0], fp: a[1], t: b[0], tp: b[1] }; });
        //<dev
        if (DEV) { /* refuse cycles: warn + drop the closing link */
          const walk = (v, st) => {
            for (let i = L.length - 1; i >= 0; i--) {
              const l = L[i];
              if (l.f !== v) continue;
              if (st.includes(l.t)) { console.warn('[patch] cycle — dropping', l.f, '→', l.t); L.splice(i, 1); }
              else walk(l.t, st.concat(l.t));
            }
          };
          L.map((l) => l.f).forEach((r) => walk(r, [r]));
        }
        //>dev
      },
      node: (nid, spec = {}) => {
        const cl = [];
        S.nodes++; cl.push(() => S.nodes--);
        const reg = (k, undo) => { S[k]++; cl.push(() => { S[k]--; undo(); }); };
        const el = document.getElementById(nid);
        const h = {
          el,
          emit: (port, msg) => {
            //<dev
            if (DEV && spec.outs && !(port in spec.outs)) console.warn('[patch]', nid, 'undeclared port', port);
            //>dev
            route(nid, port, msg, 0);
          },
          every: (ms, fn) => { const t = setInterval(fn, ms); reg('timers', () => clearInterval(t)); return t; },
          timeout: (ms, fn) => {
            let d = 0;
            const t = setTimeout(() => { d = 1; S.timers--; fn(); }, ms);
            S.timers++;
            cl.push(() => { if (!d) { d = 1; clearTimeout(t); S.timers--; } });
            return t;
          },
          observe: (tel, opts, fn) => { const o = new IntersectionObserver(fn, opts); o.observe(tel); reg('observers', () => o.disconnect()); return o; },
          listen: (tel, ev, fn, opts) => { tel.addEventListener(ev, fn, opts); reg('listeners', () => tel.removeEventListener(ev, fn, opts)); },
          cleanup: (fn) => cl.push(fn),
        };
        nodes[nid] = { spec, cl, h };
        if (el) { /* islands attach via el.__patchNode + 'patch:attach' (P2) */
          el.__patchNode = h;
          el.dispatchEvent(new CustomEvent('patch:attach', { detail: h }));
        }
        return h;
      },
      channel: (name, opts) =>
        chans[name] ||
        (chans[name] = ((subs) => ({
          on: (fn) => subs.push(fn),
          emit: (v) => { subs.forEach((f) => f(v)); if (opts && opts.persist) persistTo(opts.persist, v); },
        }))([])),
      pulse: (f, t) => {
        const now = performance.now(), q = F.pulses;
        for (let i = q.length - 1; i >= 0; i--) if (now - q[i].t0 > 400) q.splice(i, 1);
        if (q.length < 32) q.push({ f, t, t0: now });
      },
      _destroy: () => {
        Object.values(nodes).forEach((n) => {
          n.cl.forEach((fn) => { try { fn(); } catch (e) {} });
          if (n.h.el) n.h.el.__patchNode = null;
        });
        nodes = {}; chans = {}; L = []; F.pulses.length = 0;
      },
    };
    return F;
  };

  window.Patch = {
    field: (id) =>
      /[?&]nopatch=1/.test(location.search) ? SFIELD : FIELDS[id] || (S.fields++, (FIELDS[id] = makeField(id))),
    on: (name, fn) => {
      const ev = name === 'mode' ? 'patchmode' : name === 'duo' ? 'patch:duo' : name;
      document.addEventListener(ev, fn);
      S.listeners++;
      GLOBALS.push(() => { document.removeEventListener(ev, fn); S.listeners--; });
    },
    stats: () => ({ fields: S.fields, nodes: S.nodes, timers: S.timers, listeners: S.listeners, observers: S.observers }),
  };

  /* registered ONCE for the document's life; page registrations die here */
  document.addEventListener('astro:before-swap', () => {
    Object.values(FIELDS).forEach((f) => f._destroy());
    FIELDS = {}; S.fields = 0;
    GLOBALS.forEach((fn) => { try { fn(); } catch (e) {} });
    GLOBALS = [];
  });
})();
