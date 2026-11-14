/**
 * The trust triangle's three corners, shared by every place that draws its small mark: the decision
 * cards (TriMark.astro), the tour captions (TriMark.jsx) and, by hand, the home preview (previs.js,
 * which can't import). The Engine case study explains the triangle; its card is #engTri.
 * Names are the long form everywhere (Carlton, 2026-11-14).
 */
export const CORNERS = {
  observability: { label: 'OBSERVABILITY', x: 6.5, y: 1.5 },
  traceability: { label: 'TRACEABILITY', x: 1.5, y: 10.5 },
  steerability: { label: 'STEERABILITY', x: 11.5, y: 10.5 },
};
/** The mark's outline, in its 13 × 12 viewBox. */
export const TRI_PATH = 'M6.5 1.5 L1.5 10.5 L11.5 10.5 Z';
export const TRI_VIEWBOX = '0 0 13 12';
/** Where the triangle is explained. */
export const TRI_HREF = '/projects/futurity-engine/#engTri';
