import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { readToken } from '../lib/unsub.js';
import { page, esc } from '../lib/page.js';

/**
 * /api/block?t=<token>
 * "Block this sender" in Carlton's notification email.
 *
 * GET  → confirmation page, no side effect (link previews and mail scanners
 *        follow GETs; see unsubscribe.ts).
 * POST → adds the visitor's address to the Resend suppression list.
 *        /api/contact checks that list before sending anything, so the address
 *        can no longer use the form or receive receipts. One list, three doors:
 *        the visitor's "This wasn't me", the client's one-click unsubscribe,
 *        and this. Undo: Resend → Emails → Suppressions → remove.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  const secret = process.env.UNSUB_SECRET, apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) return res.status(500).send(page({ op: 'sys · block_sender', title: 'Not configured', body: 'Missing UNSUB_SECRET or API key.' }));

  const t = String(req.query.t ?? '');
  const email = readToken(t, secret, 'block');
  if (!email) return res.status(400).send(page({ op: 'sys · block_sender', title: 'Link not valid', body: 'This block link is damaged or not for this purpose. Nothing was changed.' }));

  if (req.method === 'GET') {
    return res.status(200).send(page({
      op: 'sys · block_sender',
      title: 'Block this sender?',
      body: `<strong>${esc(email)}</strong> will no longer be able to submit the contact form or receive receipts. Nothing has happened yet.`,
      form: { action: `/api/block?t=${encodeURIComponent(t)}`, label: '▶ yes, block them' },
      link: ['https://resend.com/emails', 'no, back to Resend →'],
    }));
  }

  const r = await new Resend(apiKey).suppressions.add({ email });
  if (r.error && !/already/i.test(r.error.message ?? '')) {
    console.error('block: failed', r.error);
    return res.status(502).send(page({ op: 'sys · block_sender', title: 'Could not block', body: 'Resend refused the suppression call. Try again from the dashboard.' }));
  }
  console.log(JSON.stringify({ type: 'block', email }));
  return res.status(200).send(page({ op: 'sys · block_sender', title: 'Blocked', body: `<strong>${esc(email)}</strong> can no longer submit the contact form or receive receipts. Undo any time in Resend &rarr; Emails &rarr; Suppressions.`, link: ['https://resend.com/emails', 'Resend → Suppressions'] }));
}
