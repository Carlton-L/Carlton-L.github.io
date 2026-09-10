import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowed = (process.env.ALLOWED_ORIGINS ?? 'https://carlton.dev')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Browser-facing endpoints only. The site is on GitHub Pages and this function
 * is on vercel.app, so every call is cross-origin; the browser sends a
 * preflight OPTIONS first. We answer it only for origins we recognise.
 * Returns true when the request was a preflight and has been fully handled.
 */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin ?? '';
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
