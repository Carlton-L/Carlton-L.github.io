/**
 * EngineHeroTour — the Engine case study's hero: the real workflow demo (/demos/engine/, the same
 * document as the interactive demo further down) playing a scripted tour by itself.
 * Prototype and decisions: docs/prototypes/engine-hero-tour.html (accepted 2026-11-14).
 *
 * - Seven moments in one pass through the app, each with a caption tagged by its trust-triangle
 *   corner, over the UI; a new caption fades and slides in from the bottom.
 * - Time is driven through the demo's command channel (the same messages as the replay player in
 *   EngineWorkflowView.jsx); a quiet pointer presses only the Engine's own controls.
 * - The camera is the frame's transform: still for the opening and the crash (the board itself eases
 *   onto the question research), then one smooth move per shot. It fades out in place and loops.
 * - Visitors can't click into it (it is a tour); "Try it yourself" scrolls to the interactive demo.
 * - Pauses off screen (stops, and starts the loop again when it comes back). Under reduced motion it
 *   shows one still frame: the finished run on the board, no tour.
 * - Below 720px the demo draws at the container's own width (its phone layout) and the camera pans
 *   through it at full size, instead of shrinking a laptop-sized view.
 *
 * A RECREATION on a made-up run (the Engine is recreation-only).
 */
import { useEffect, useRef, useState } from 'react';
import './hero.css';

const NW = 1100, NH = 780, PHONE_BELOW = 720, PHONE_H = 960;
const CORNER = { o: 'OBSERVE', t: 'TRACE', s: 'STEER' };
const MOMENTS = [
  ['o', 'Every step says where it is'],
  ['s', 'Retry it, or go on without it'],
  ['o', 'Watch the report fill'],
  ['t', 'Numbers come from data'],
  ['t', 'One layer at a time'],
  ['s', 'Rerun one block'],
  ['t', 'Every prompt, part by part'],
];
const STOP = Symbol('stop');

function Tag({ k }) {
  return (
    <span className="eht-tag">
      <svg viewBox="0 0 13 12" aria-hidden="true">
        <path d="M6.5 1.5 L1.5 10.5 L11.5 10.5 Z" />
        <circle cx="6.5" cy="1.5" r="1.6" className={k === 'o' ? 'on' : undefined} />
        <circle cx="1.5" cy="10.5" r="1.6" className={k === 't' ? 'on' : undefined} />
        <circle cx="11.5" cy="10.5" r="1.6" className={k === 's' ? 'on' : undefined} />
      </svg>
      {CORNER[k]}
    </span>
  );
}

function Caption({ i }) {
  // the new caption slides in; the last one fades out over it
  const [shown, setShown] = useState({ cur: i, prev: null });
  useEffect(() => {
    if (i === shown.cur) return undefined;
    setShown({ cur: i, prev: shown.cur });
    const t = setTimeout(() => setShown((s) => ({ ...s, prev: null })), 260);
    return () => clearTimeout(t);
  }, [i]);
  const card = (n, cls) => (n == null || !MOMENTS[n] ? null : (
    <div key={cls + n} className={'eht-cap ' + cls} aria-hidden={cls === 'out' ? 'true' : undefined}>
      <Tag k={MOMENTS[n][0]} />
      <b>{MOMENTS[n][1]}</b>
    </div>
  ));
  return (<div className="eht-caps" role="status">{card(shown.prev, 'out')}{card(shown.cur, 'in')}</div>);
}

export default function EngineHeroTour() {
  const camRef = useRef(null), frRef = useRef(null), ptrRef = useRef(null), rootRef = useRef(null);
  const [moment, setMoment] = useState(null);
  const [faded, setFaded] = useState(true);
  const [size, setSize] = useState({ w: 0, narrow: false });

  useEffect(() => {
    const cam = camRef.current, fr = frRef.current, ptr = ptrRef.current;
    if (!cam || !fr) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let run = 0, visible = false, readySent = false;
    const narrow = () => cam.clientWidth < PHONE_BELOW;
    const nw = () => (narrow() ? cam.clientWidth : NW), nh = () => (narrow() ? PHONE_H : NH);

    /* ---------- the demo ---------- */
    const D = () => fr.contentDocument;
    const $ = (s) => D()?.querySelector(s);
    const $$ = (s) => [...(D()?.querySelectorAll(s) || [])];
    const byText = (s, txt) => $$(s).find((e) => e.textContent.trim() === txt);
    const titled = (t) => $$('.react-flow__node').find((n) => (n.querySelector('.t')?.textContent || '').trim() === t);
    const level = () => ($('.bnav-title h2')?.textContent || '').trim();
    const tab = (name) => $$('.ptabs [role=tab]').find((e) => e.textContent.trim().startsWith(name));
    const cmd = (op, extra = {}) => fr.contentWindow?.postMessage({ eng: 'cmd', op, ...extra }, window.location.origin);
    const show = (view) => cmd('show', { view });
    const unscroll = () => { try { fr.contentWindow.scrollTo(0, 0); } catch (e) { /* same origin only */ } };

    /* ---------- time ---------- */
    const wait = (ms, id) => new Promise((ok, no) => setTimeout(() => (id === run ? ok() : no(STOP)), ms));
    const waitFor = async (fn, id, limit = 9000) => {
      const t0 = Date.now();
      for (;;) { if (id !== run) throw STOP; const v = fn(); if (v) return v; if (Date.now() - t0 > limit) throw new Error('the tour waited too long'); await new Promise((r) => setTimeout(r, 60)); }
    };

    /* ---------- the camera ---------- */
    let view = { s: 1, tx: 0, ty: 0 };
    const union = (els) => {
      const rs = els.filter(Boolean).map((e) => e.getBoundingClientRect());
      if (!rs.length) return null;
      const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r = Math.max(...rs.map((x) => x.right)), b = Math.max(...rs.map((x) => x.bottom));
      return { left: l, top: t, width: r - l, height: b - t };
    };
    const frame = (rect, maxS = 1.35, pad = 22) => {
      unscroll();
      const VW = cam.clientWidth, VH = cam.clientHeight, W = nw(), H = nh();
      const whole = narrow() ? VW / W : Math.min(VW / W, VH / H);
      let s = rect ? Math.min(VW / (rect.width + 2 * pad), VH / (rect.height + 2 * pad), narrow() ? 1 : maxS) : whole;
      s = Math.max(s, whole);
      const cx = rect ? rect.left + rect.width / 2 : W / 2, cy = rect ? rect.top + rect.height / 2 : (narrow() ? VH / 2 / s : H / 2);
      const clamp = (v, size, vp) => (size * s <= vp ? (vp - size * s) / 2 : Math.min(0, Math.max(vp - size * s, v)));
      view = { s, tx: clamp(VW / 2 - cx * s, W, VW), ty: clamp(VH / 2 - cy * s, H, VH) };
      fr.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`;
    };
    const instant = (on) => cam.classList.toggle('still', on);

    /* ---------- the pointer ---------- */
    const pointerOff = () => ptr.classList.remove('on');
    const press = async (el, id, before = 600) => {
      if (!el) throw new Error('nothing to press');
      const r = el.getBoundingClientRect();
      ptr.classList.add('on');
      ptr.style.transform = `translate(${view.tx + (r.left + Math.min(r.width / 2, 40)) * view.s}px, ${view.ty + (r.top + r.height / 2) * view.s}px)`;
      await wait(before, id);
      ptr.classList.remove('press'); void ptr.offsetWidth; ptr.classList.add('press');
      el.click(); await wait(250, id);
    };

    /* ---------- the tour ---------- */
    async function tour(id) {
      const nodeEl = (i) => $(`.react-flow__node[data-id="${i}"]`);
      // Groundwork. The camera stays still; the board eases onto the question research block.
      setMoment(0); await wait(900, id);
      cmd('play'); show({ focus: ['g_q', 'kb_q'] }); await wait(400, id);
      if (narrow()) frame(union([$('.bslot'), nodeEl('g_q'), nodeEl('kb_q')]));
      await waitFor(() => $('.bslot')?.innerText.includes('failed'), id);
      setMoment(1); await wait(2400, id);
      await press(byText('.bslot button', 'Retry research'), id);
      await wait(900, id); cmd('seek', { t: 545 }); await wait(2400, id);
      // The report: it fills, then a number and where it came from.
      setMoment(2); await press(tab('Report'), id); pointerOff();
      await waitFor(() => $('.rrail'), id); frame(union([$('.ptabs'), $('.bslot'), $('.rrail')]), 1.25);
      for (let t = 560; t <= 1720; t += 40) { cmd('seek', { t }); await wait(55, id); }
      await wait(700, id);
      setMoment(3); cmd('end');
      const sec = await waitFor(() => $('#rs-84'), id); await wait(200, id); sec.scrollIntoView({ block: 'center' }); unscroll(); await wait(200, id);
      const tok = [...sec.querySelectorAll('.tokv')].find((t) => t.textContent.includes('$4.1B')) || sec.querySelector('.tokv');
      frame(union([sec]), 1.4); await wait(900, id);
      if (tok) { await press(tok, id, 500); tok.focus(); const k = tok.querySelector('.tokv-k'); if (k) k.style.opacity = '1'; }
      await wait(3200, id); pointerOff();
      // The board: the top level, then Science and Emerging papers; rerun there; read its analyst's prompt.
      setMoment(4); show({ panel: 'flow', stack: ['report'], sel: null }); await wait(500, id);
      await waitFor(() => titled('Science'), id); frame(union([$('.canvas')]), 1.2); await wait(1100, id);
      await press(titled('Science').querySelector('button'), id);
      await waitFor(() => level() === 'Science' && titled('Emerging papers'), id); await wait(900, id);
      await press(titled('Emerging papers').querySelector('button'), id);
      await waitFor(() => level() === 'Emerging papers' && titled('Has emerging candidates?'), id); await wait(1100, id);
      setMoment(5); await press(titled('Has emerging candidates?'), id);
      await waitFor(() => byText('button', 'Change and rerun this block'), id);
      frame(narrow() ? union([$('.insp .steer')]) : union([$('.bslot'), $('.canvas'), $('.insp')]), 1); await wait(1100, id);
      await press(byText('button', 'Change and rerun this block'), id); await wait(600, id);
      if (narrow()) { frame(union([$('.insp .steer')])); await wait(800, id); }
      await wait(1400, id);
      await press($$('button').find((b) => b.textContent.startsWith('Rerun 12')), id); pointerOff();
      if (narrow()) frame(union([$('.bslot')]));
      await wait(3400, id);
      setMoment(6); await press(titled('Link-prediction analyst'), id);
      await waitFor(() => $('.insp .tabs'), id);
      if (!byText('.tabs [role=tab][aria-selected="true"]', 'Inside')) await press(byText('.tabs [role=tab]', 'Inside'), id, 400);
      const tabs = $('.insp .tabs');
      frame(narrow() && tabs ? union([tabs, tabs.nextElementSibling]) : union([$('.insp')]), 1.3); pointerOff(); await wait(3600, id);
      // fade out where it is, then again
      setFaded(true); await wait(700, id);
    }

    /* ---------- one loop: load the demo fresh, frame it, fade in, tour ---------- */
    function start() {
      run += 1; const id = run; pointerOff(); setFaded(true); setMoment(null);
      setSize({ w: cam.clientWidth, narrow: narrow() });
      fr.style.width = nw() + 'px'; fr.style.height = nh() + 'px';
      fr.onload = async () => {
        try {
          await waitFor(() => fr.contentDocument && fr.contentDocument.querySelector('.react-flow__node'), id, 15000);
          instant(true); frame(null);
          if (reduced) { cmd('end'); await wait(300, id); }
          else { show({ panel: 'flow', stack: ['report', 'c_ground'], sel: null }); await wait(900, id); }
          void fr.offsetWidth; instant(false);
          setFaded(false);
          if (!readySent) { readySent = true; rootRef.current?.dispatchEvent(new CustomEvent('view:ready', { bubbles: true })); }
          if (reduced) return;
          await tour(id); if (id === run) start();
        } catch (e) { if (e !== STOP) console.warn('engine hero tour stopped:', e); }
      };
      fr.src = '/demos/engine/?tour=' + id;
    }
    // Pause off screen: stop the loop, start again when it comes back.
    const io = new IntersectionObserver((es) => {
      const v = es.some((e) => e.isIntersecting);
      if (v && !visible) start();
      if (!v && visible) { run += 1; pointerOff(); }
      visible = v;
    }, { rootMargin: '100px 0px' });
    io.observe(cam);
    return () => { run += 1; io.disconnect(); };
  }, []);

  return (
    <div className="eht" ref={rootRef}>
      <div className="eht-strip">
        <span className="eht-lbl">RECREATION · MADE-UP RUN, PLAYING BY ITSELF</span>
        <a href="#engWorkflow" className="eht-try">Try it yourself ↓</a>
      </div>
      <div className={'eht-cam' + (size.narrow ? ' narrow' : '')} ref={camRef} aria-label="A recreation of the Futurity Engine running a made-up research run, playing by itself" role="img">
        <iframe ref={frRef} title="The Futurity Engine, playing a tour" tabIndex={-1} aria-hidden="true" />
        <div className="eht-ptr" ref={ptrRef} aria-hidden="true">
          <svg viewBox="0 0 18 18"><path d="M3 2v12l3.4-3 2.3 5 2-1-2.2-5H13z" /></svg><i />
        </div>
        <Caption i={moment} />
        <div className={'eht-fade' + (faded ? ' on' : '')} aria-hidden="true" />
      </div>
    </div>
  );
}
