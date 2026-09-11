import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { readToken } from '../lib/unsub.js';

/**
 * GET /api/block?t=<token>
 * "Block this sender" in Carlton's notification email. Adds the visitor's
 * address to the Resend suppression list; /api/contact checks that list
 * before sending anything, so the address can no longer use the form (and
 * can no longer receive receipts). One list, three doors: the visitor's
 * "This wasn't me", the mail client's one-click unsubscribe, and this.
 * Undo: Resend → Emails → Suppressions → remove.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const secret = process.env.UNSUB_SECRET, apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) return res.status(500).send(page('Not configured', 'Missing UNSUB_SECRET or API key.'));
  const email = readToken(String(req.query.t ?? ''), secret, 'block');
  if (!email) return res.status(400).send(page('Link not valid', 'This block link is damaged or not for this purpose. Nothing was changed.'));
  const r = await new Resend(apiKey).suppressions.add({ email });
  if (r.error && !/already/i.test(r.error.message ?? '')) {
    console.error('block: failed', r.error);
    return res.status(502).send(page('Could not block', 'Resend refused the suppression call. Try again from the dashboard.'));
  }
  console.log(JSON.stringify({ type: 'block', email }));
  return res.status(200).send(page('Blocked', `<strong>${esc(email)}</strong> can no longer submit the contact form or receive receipts. Undo any time in Resend &rarr; Emails &rarr; Suppressions.`));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function page(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)} · carlton.dev</title>
<style>body{margin:0;background:#0a0a0b;color:#e6e6e2;font:15px/1.6 'proxima-nova',Inter,Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
.op{max-width:440px;background:#101013;border:1px solid #232326;border-radius:7px}.h{padding:6px 10px;border-bottom:1px solid #232326;font:10px 'IBM Plex Mono',Menlo,monospace;letter-spacing:1.5px;color:#8f8f8a;display:flex;justify-content:space-between}
.h b{background:#232326;padding:1px 6px;border-radius:3px;font-weight:700;font-size:9px}.b{padding:14px}.b h1{font-size:18px;margin:0 0 8px}a{color:#3dff88}</style></head>
<body><div class="op"><div class="h"><span>sys · block_sender</span><b>SYS</b></div><div class="b"><h1>${esc(title)}</h1><p>${body}</p><p><a href="https://resend.com/emails">Resend &rarr; Suppressions</a></p></div></div></body></html>`;
}
