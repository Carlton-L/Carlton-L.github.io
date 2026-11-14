/**
 * The Engine demo document's root (src/pages/demos/engine.astro). Mounts the ported Engine Blocks
 * prototype and tells the case study, through ProductFrame, once it has drawn.
 *
 * Query: ?bar=1 shows the prototype's own top bar (for comparing against the prototype page);
 * ?theme=light|dark|auto picks the theme (default dark, to sit in the site). Without the bar the
 * body gets .embed: the instrument fills the frame (embed.css).
 *
 * Messages to the parent, same origin only: { eng: 'ready' } once the board is on screen.
 * Playback stops when the frame leaves the screen: an IntersectionObserver with no root watches
 * against the top page's viewport, even from inside the frame.
 */
import { useEffect, useState } from 'react';
import './engine.css';
import './engine-changes.css';
import './embed.css';
import App from './EngineBlocks.jsx';

const q = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
const bar = q.get('bar') === '1';
if (typeof document !== 'undefined' && !bar) document.body.classList.add('embed');
const theme = ['light', 'dark', 'auto'].includes(q.get('theme')) ? q.get('theme') : 'dark';

const post = (data) => {
  if (window.parent !== window) window.parent.postMessage(data, window.location.origin);
};

export default function FrameEntry() {
  const [offScreen, setOffScreen] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      if (document.querySelector('.react-flow__node')) post({ eng: 'ready' });
      else raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    const io = new IntersectionObserver((es) => setOffScreen(!es.some((e) => e.isIntersecting)));
    io.observe(document.body);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
  return <App bar={bar} theme={theme} offScreen={offScreen} />;
}
