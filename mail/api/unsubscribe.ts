import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { readToken } from '../lib/unsub.js';
import { page, esc } from '../lib/page.js';

/**
 * /api/unsubscribe?t=<token>
 *
 * GET  → a confirmation page with one button. Nothing changes on GET.
 * POST → adds the address to the Resend suppression list. Two callers:
 *        - the button on the GET page ("This wasn't me" in the receipt)
 *        - the mail client's one-click unsubscribe (RFC 8058: a POST with
 *          body `List-Unsubscribe=One-Click`, from the List-Unsubscribe-Post
 *          header). Answered with a bare 200, no HTML.
 *
 * Why GET must be harmless: mail clients and security gateways fetch links
 * without a human clicking. Apple Mail's link preview, Outlook Safe Links,
 * Proofpoint and Gmail's scanners all issue GETs. A GET that unsubscribes
 * gets triggered by a hover. RFC 8058 chose POST for one-click for exactly
 * this reason; the same rule applies to our own link.
 *
 * Suppression means Resend refuses any future send to that address before it
 * leaves, which protects both the person and the domain's reputation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  const secret = process.env.UNSUB_SECRET, apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) return res.status(500).send(page({ op: 'sys · unsubscribe', title: 'Not configured', body: 'The unsubscribe endpoint is missing its secret.' }));

  const t = String(req.query.t ?? '');
  const email = readToken(t, secret);
  if (!email) return res.status(400).send(page({ op: 'sys · unsubscribe', title: 'Link not valid', body: 'This unsubscribe link is damaged or was not issued by carlton.dev. Nothing was changed.', link: ['https://carlton.dev', 'carlton.dev →'] }));

  if (req.method === 'GET') {
    return res.status(200).send(page({
      op: 'sys · unsubscribe',
      title: 'Stop emails to this address?',
      body: `carlton.dev will not email <strong>${esc(email)}</strong> again, and messages sent from the contact form under this address will be dropped. Nothing has happened yet.`,
      form: { action: `/api/unsubscribe?t=${encodeURIComponent(t)}`, label: '▶ yes, this wasn’t me' },
      link: ['https://carlton.dev', 'no, take me back →'],
    }));
  }

  const oneClick = isOneClick(req);
  const r = await new Resend(apiKey).suppressions.add({ email });
  if (r.error && !/already/i.test(r.error.message ?? '')) {
    console.error('unsubscribe: failed', r.error);
    if (oneClick) return res.status(502).end();
    return res.status(502).send(page({ op: 'sys · unsubscribe', title: 'Could not do that', body: 'Something failed on the way to the mail provider. Reply to the email instead and I will take care of it by hand.' }));
  }
  console.log(JSON.stringify({ type: 'unsubscribe', email, via: oneClick ? 'one-click' : 'confirm' }));
  if (oneClick) return res.status(200).end();
  return res.status(200).send(page({ op: 'sys · unsubscribe', title: 'Done', body: `carlton.dev will not email <strong>${esc(email)}</strong> again. If you did send a message and want a reply, just reply to the receipt.`, link: ['https://carlton.dev', 'carlton.dev →'] }));
}

/* RFC 8058 one-click: form-encoded body `List-Unsubscribe=One-Click`. Vercel
   parses urlencoded bodies into an object; a raw string is handled too. */
function isOneClick(req: VercelRequest) {
  const b = req.body;
  if (typeof b === 'string') return /List-Unsubscribe=One-Click/i.test(b);
  return !!b && typeof b === 'object' && String((b as Record<string, unknown>)['List-Unsubscribe'] ?? '').toLowerCase() === 'one-click';
}
