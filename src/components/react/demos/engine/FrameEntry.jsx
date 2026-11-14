/**
 * The Engine demo document's root (src/pages/demos/engine.astro). Mounts the ported Engine Blocks
 * prototype in outside mode: the Engine UI only (no play bar, header or Run settings), driven by the
 * portfolio's replay player in the case study (EngineWorkflowView.jsx).
 *
 * Query: ?bar=1 shows the prototype's own top bar and play bar again (inline mode), for comparing
 * against the prototype page; ?theme=light|dark|auto picks the theme (default dark, to sit in the
 * site). Without the bar the body gets .embed: the Engine UI fills the frame (embed.css).
 *
 * Messages, same origin only:
 *   to the parent:   { eng: 'ready' } once the board is on screen; { eng: 'run', run } on every
 *                    change of the replay (time, progress, marked moments, the hold; see runSnapshot)
 *   from the parent: { eng: 'cmd', op: 'toggle' | 'play' | 'pause' | 'end' | 'retry' }
 *                    { eng: 'cmd', op: 'seek', t: seconds }
 *                    { eng: 'cmd', op: 'show', view: { panel, stack, sel, focus } } (the hero tour's jumps)
 * Playback stops when the frame leaves the screen: an IntersectionObserver with no root watches
 * against the top page's viewport, even from inside the frame.
 */
import { useEffect, useRef, useState } from 'react';
import './engine.css';
import './engine-changes.css';
import './embed.css';
import App from './EngineBlocks.jsx';

const q = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
const bar = q.get('bar') === '1';
if (typeof document !== 'undefined' && !bar) document.body.classList.add('embed');
const theme = ['light', 'dark', 'auto'].includes(q.get('theme')) ? q.get('theme') : 'dark';
// Tab badges, decided 2026-11-14: new sections since you looked, pages filed, a pulse and a first-time hint.
const TABS = { report: 'new', kb: 'pages', emphasis: 'hint' };

const post = (data) => {
  if (window.parent !== window) window.parent.postMessage(data, window.location.origin);
};

export default function FrameEntry() {
  const [offScreen, setOffScreen] = useState(false);
  const control = useRef(null);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      if (document.querySelector('.react-flow__node')) post({ eng: 'ready' });
      else raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    const io = new IntersectionObserver((es) => setOffScreen(!es.some((e) => e.isIntersecting)));
    io.observe(document.body);
    const listen = (m) => {
      if (m.origin !== window.location.origin || m.source !== window.parent) return;
      const d = m.data, c = control.current;
      if (!d || d.eng !== 'cmd' || !c) return;
      if (d.op === 'seek') c.seek(+d.t || 0);
      else if (d.op === 'show') c.show(d.view || {});
      else if (typeof c[d.op] === 'function') c[d.op]();
    };
    window.addEventListener('message', listen);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('message', listen); };
  }, []);
  if (bar) return <App bar theme={theme} offScreen={offScreen} />;
  return <App bar={false} theme={theme} offScreen={offScreen} transport="outside" settingsAt="none" tabs={TABS} control={control} onRun={(run) => post({ eng: 'run', run })} />;
}
