import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { cors } from '../lib/cors.js';

/**
 * GET /api/status?id=<resend email id>
 *
 * Returns { last_event } for one email so the contact form can show the
 * visitor whether their receipt was accepted or bounced. The id is an
 * unguessable UUID handed to the same browser that triggered the send; we
 * return nothing else (no addresses, no body), so knowing an id buys you a
 * single word.
 *
 * last_event vocabulary (Resend): queued → sent → delivered | bounced |
 * delivery_delayed | complained | failed | suppressed. "delivered" means the
 * receiving server accepted the message (SMTP 250), not that it reached an
 * inbox — the UI must say "accepted", never "delivered to inbox".
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = String(req.query.id ?? '');
  if (!UUID.test(id)) return res.status(400).json({ error: 'bad id' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mail is not configured.' });

  const r = await new Resend(apiKey).emails.get(id);
  if (r.error) {
    console.warn('status: lookup failed', r.error);
    return res.status(404).json({ error: 'unknown' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ last_event: r.data?.last_event ?? 'queued' });
}
