import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { readToken } from '../lib/unsub.js';

/**
 * GET|POST /api/unsubscribe?t=<token>
 * "This wasn't me" in the receipt, and the List-Unsubscribe header (one-click
 * POST from Gmail/Proton/Apple Mail). Adds the address to the Resend
 * suppression list: Resend then refuses any future send to it before it
 * leaves, which protects both the person and the domain's reputation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  const secret = process.env.UNSUB_SECRET, apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) return res.status(500).send(page('Not configured', 'The unsubscribe endpoint is missing its secret.'));

  const email = readToken(String(req.query.t ?? ''), secret);
  if (!email) return res.status(400).send(page('Link not valid', 'This unsubscribe link is damaged or was not issued by carlton.dev. Nothing was changed.'));

  const r = await new Resend(apiKey).suppressions.add({ email });
  if (r.error && !/already/i.test(r.error.message ?? '')) {
    console.error('unsubscribe: failed', r.error);
    return res.status(502).send(page('Could not do that', 'Something failed on the way to the mail provider. Reply to the email instead and I will take care of it by hand.'));
  }
  console.log(JSON.stringify({ type: 'unsubscribe', email, method: req.method }));
  if (req.method === 'POST') return res.status(200).end();
  return res.status(200).send(page('Done', `carlton.dev will not email <strong>${esc(email)}</strong> again. If you did send a message and want a reply, just reply to the receipt.`));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function page(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)} · carlton.dev</title>
<style>body{margin:0;background:#0a0a0b;color:#e6e6e2;font:15px/1.6 'proxima-nova',Inter,Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
.op{max-width:440px;background:#101013;border:1px solid #232326;border-radius:7px}.h{padding:6px 10px;border-bottom:1px solid #232326;font:10px 'IBM Plex Mono',Menlo,monospace;letter-spacing:1.5px;color:#8f8f8a;display:flex;justify-content:space-between}
.h b{background:#232326;padding:1px 6px;border-radius:3px;font-weight:700;font-size:9px}.b{padding:14px}.b h1{font-size:18px;margin:0 0 8px}a{color:#3dff88}</style></head>
<body><div class="op"><div class="h"><span>sys · unsubscribe</span><b>SYS</b></div><div class="b"><h1>${esc(title)}</h1><p>${body}</p><p><a href="https://carlton.dev">carlton.dev →</a></p></div></div></body></html>`;
}
