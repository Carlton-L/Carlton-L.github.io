import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { cors } from '../lib/cors.js';
import { validateContact, esc } from '../lib/validate.js';

/**
 * POST /api/contact
 * Body: { name, email, message, website? }   (website = honeypot, must be empty)
 *
 * Sends two emails:
 *   1. notification → CONTACT_TO (Carlton). from = our verified domain,
 *      reply_to = the visitor, so "Reply" in Proton goes straight back to them.
 *   2. auto-reply → the visitor (only when AUTOREPLY_ENABLED=1, i.e. after
 *      carlton.dev is verified). from = our domain, reply_to = Carlton.
 *
 * Why `from` can't be the visitor: SPF/DKIM/DMARC authenticate the From
 * domain. We can only sign for carlton.dev. Spoofing gmail.com in From would
 * fail DMARC at Proton and be quarantined. reply_to carries no such rule; it's
 * just a hint to the mail client.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;
  if (!apiKey || !to || !from) {
    console.error('contact: missing env', { apiKey: !!apiKey, to: !!to, from: !!from });
    return res.status(500).json({ error: 'Mail is not configured.' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;

  // Honeypot: a hidden field real users never see. Bots fill every field.
  // Return 200 so the bot believes it succeeded and does not retry/adapt.
  if (body && typeof body === 'object' && (body as any).website) {
    console.warn('contact: honeypot tripped');
    return res.status(200).json({ ok: true });
  }

  const v = validateContact(body);
  if (!v.ok) return res.status(400).json({ error: v.error, field: v.field });
  const { name, email, message } = v.data;

  const resend = new Resend(apiKey);

  // 1. Notification to Carlton
  const notify = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `carlton.dev: ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; wrote via carlton.dev:</p>
<blockquote style="border-left:3px solid #3dff88;margin:0;padding:8px 12px;white-space:pre-wrap">${esc(message)}</blockquote>`,
    headers: { 'X-Entity-Ref-ID': cryptoId() },
    tags: [{ name: 'kind', value: 'contact-notify' }],
  });

  if (notify.error) {
    // Resend errors carry a machine-readable `name` (validation_error,
    // rate_limit_exceeded, ...) and a human `message`. Log both, show neither
    // to the visitor beyond a generic failure.
    console.error('contact: notify failed', notify.error);
    return res.status(502).json({ error: 'Could not send right now. Email me directly instead.' });
  }

  // 2. Auto-reply to the visitor (best effort; never fails the request)
  let autoreplyId: string | undefined;
  if (process.env.AUTOREPLY_ENABLED === '1') {
    const ack = await resend.emails.send({
      from,
      to: email,
      replyTo: to,
      subject: 'Got your message',
      text: `Hi ${name},\n\nYour message reached me on carlton.dev. I read everything and reply to most things within a couple of days.\n\nCarlton\ncarlton.dev`,
      html: `<p>Hi ${esc(name)},</p><p>Your message reached me on carlton.dev. I read everything and reply to most things within a couple of days.</p><p>Carlton<br><a href="https://carlton.dev">carlton.dev</a></p>`,
      tags: [{ name: 'kind', value: 'contact-ack' }],
    });
    if (ack.error) console.error('contact: autoreply failed', ack.error);
    else autoreplyId = ack.data?.id;
  }

  return res.status(200).json({ ok: true, id: notify.data?.id, ack: autoreplyId });
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

// Unique per-submission id so Gmail-style threading never collapses two
// different visitors' notifications into one thread.
function cryptoId() {
  return globalThis.crypto.randomUUID();
}
