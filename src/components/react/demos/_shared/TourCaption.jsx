/**
 * TourCaption — the caption over a demo that plays by itself (the Engine hero's tour; any other
 * self-playing demo). A new caption fades and slides in from the bottom while the last one fades
 * out. Each caption can carry a trust-triangle corner tag.
 *
 *   <TourCaption caption={{ corner: 'observability', text: 'Every step says where it is' }} />
 *   <TourCaption caption={cap} link />   // the tag links to the triangle on the Engine page
 *
 * `caption` is null for none. `link` is off by default (Carlton, 2026-11-14): on the Engine page the
 * triangle is just below, elsewhere it explains the tag. The caller's container needs
 * position: relative. Corners and the link target: src/lib/trust-triangle.js.
 */
import { useEffect, useState } from 'react';
import TriMark from './TriMark.jsx';
import { CORNERS, TRI_HREF } from '../../../../lib/trust-triangle.js';
import './tour-caption.css';

function Tag({ corner, link }) {
  const inner = (<><TriMark corner={corner} />{CORNERS[corner].label}</>);
  return link
    ? <a className="tcap-tag" href={TRI_HREF} aria-label={`${CORNERS[corner].label}: what the trust triangle is`}>{inner}</a>
    : <span className="tcap-tag">{inner}</span>;
}

export default function TourCaption({ caption, link = false }) {
  const [shown, setShown] = useState({ cur: caption, prev: null });
  useEffect(() => {
    if ((caption && caption.text) === (shown.cur && shown.cur.text)) return undefined;
    setShown({ cur: caption, prev: shown.cur });
    const t = setTimeout(() => setShown((s) => ({ ...s, prev: null })), 260);
    return () => clearTimeout(t);
  }, [caption && caption.text]);
  const card = (c, cls) => (!c ? null : (
    <div key={cls + c.text} className={'tcap ' + cls} aria-hidden={cls === 'out' ? 'true' : undefined}>
      {c.corner ? <Tag corner={c.corner} link={link && cls === 'in'} /> : null}
      <b>{c.text}</b>
    </div>
  ));
  return (<div className="tcap-box" role="status">{card(shown.prev, 'out')}{card(shown.cur, 'in')}</div>);
}
