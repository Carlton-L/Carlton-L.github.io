/**
 * TriMark — the trust triangle's small mark with one corner lit, for React islands. The Astro twin
 * is src/components/case/TriMark.astro; both draw from src/lib/trust-triangle.js.
 */
import { CORNERS, TRI_PATH, TRI_VIEWBOX } from '../../../../lib/trust-triangle.js';

export default function TriMark({ corner }) {
  return (
    <svg viewBox={TRI_VIEWBOX} aria-hidden="true">
      <path d={TRI_PATH} />
      {Object.entries(CORNERS).map(([k, c]) => <circle key={k} cx={c.x} cy={c.y} r="1.6" className={k === corner ? 'on' : undefined} />)}
    </svg>
  );
}
