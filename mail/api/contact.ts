import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { cors } from '../lib/cors.js';
import { validateContact } from '../lib/validate.js';
import { makeToken } from '../lib/unsub.js';
import { receiptHtml, receiptText, notifyHtml, notifyText, PALETTE_HOT, type Ctx } from '../lib/templates.js';

/**
 * POST /api/contact
 * Body: { name, email, message, website?, bg?, field? }
 *   website = honeypot, must be empty
 *   bg      = base64 PNG, one 600x120 frame of the visitor's dither field, shown as a VIEW op (cid:hero)
 *   field   = short label of their settings, e.g. "GRN · RIDGE · BAYER2 · density 0.77"
 *
 * Sends two emails:
 *   1. notification → CONTACT_TO (Carlton). from = our verified domain,
 *      reply_to = the visitor, so "Reply" in Proton goes straight back to them.
 *   2. receipt → the visitor (AUTOREPLY_ENABLED=1). from = our domain,
 *      reply_to = Carlton. Carries List-Unsubscribe so mail clients offer
 *      their own one-click "stop", same endpoint as "This wasn't me".
 *
 * Both carry the visitor's field snapshot as an inline attachment (cid:hero),
 * rendered by the templates as a `view · your_field` / `view · their_field` op.
 * The response { ok, id, ack } lets the form poll /api/status for the receipt.
 * Why `from` can't be the visitor: SPF/DKIM/DMARC authenticate the From domain;
 * we can only sign for carlton.dev. reply_to carries no such rule.
 */
const BG_MAX = 60 * 1024; // base64 chars (~45 KB of PNG)
const PNG_B64 = /^iVBORw0KGgo/; // base64 of the PNG signature

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;
  const unsubSecret = process.env.UNSUB_SECRET;
  const base = process.env.PUBLIC_BASE_URL || 'https://carlton-dev.vercel.app';
  if (!apiKey || !to || !from) {
    console.error('contact: missing env', { apiKey: !!apiKey, to: !!to, from: !!from });
    return res.status(500).json({ error: 'Mail is not configured.' });
  }

  const body = (typeof req.body === 'string' ? safeJson(req.body) : req.body) as Record<string, unknown> | null;

  // Honeypot: a hidden field real users never see. Bots fill every field.
  // Return 200 so the bot believes it succeeded and does not retry/adapt.
  if (body && body.website) {
    console.warn('contact: honeypot tripped');
    return res.status(200).json({ ok: true });
  }

  const v = validateContact(body);
  if (!v.ok) return res.status(400).json({ error: v.error, field: v.field });
  const { name, email, message } = v.data;

  // Optional field snapshot: strictly a PNG, strictly small, or dropped.
  let bg: string | null = null;
  if (typeof body?.bg === 'string' && body.bg.length <= BG_MAX && PNG_B64.test(body.bg) && /^[A-Za-z0-9+/=]+$/.test(body.bg)) bg = body.bg;
  const field = typeof body?.field === 'string' ? body.field.replace(/[^\w .·:-]/g, '').slice(0, 60) : '';
  const palName = (field.match(/^(GRN|AMB|CYN|MONO)/) || [])[1] || 'GRN';
  const sig = PALETTE_HOT[palName] || PALETTE_HOT.GRN;
  const attachments = bg ? [{ filename: 'field.png', content: bg, contentType: 'image/png', contentId: 'hero' }] : undefined;

  const resend = new Resend(apiKey);

  // Inbound gate: an address on the suppression list (visitor opted out, or
  // Carlton blocked them) can't use the form. Same fake 200 as the honeypot.
  try {
    const sup = await resend.suppressions.get(email);
    if (sup.data) { console.warn('contact: suppressed sender', email); return res.status(200).json({ ok: true }); }
  } catch (e) { /* lookup failure never blocks a real visitor */ }

  const when = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' CEST';
  const unsubUrl = unsubSecret ? `${base}/api/unsubscribe?t=${makeToken(email, unsubSecret, 'unsub')}` : `mailto:${to}?subject=${encodeURIComponent('Please stop emailing ' + email)}`;
  const blockUrl = unsubSecret ? `${base}/api/block?t=${makeToken(email, unsubSecret, 'block')}` : 'https://resend.com/emails';
  const ctx: Ctx = { name, email, message, id: '', when, field, sig, bg: !!bg, unsubUrl, blockUrl };

  // 1. Notification to Carlton (sent first; its id is the reference id in both emails)
  const notifyId = cryptoId();
  const notify = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `carlton.dev: ${name}`,
    text: notifyText({ ...ctx, ackState: process.env.AUTOREPLY_ENABLED === '1' ? 'queued' : 'off' }),
    html: notifyHtml({ ...ctx, id: notifyId, ackState: process.env.AUTOREPLY_ENABLED === '1' ? 'queued' : 'off', resendUrl: 'https://resend.com/emails' }),
    headers: { 'X-Entity-Ref-ID': notifyId },
    tags: [{ name: 'kind', value: 'contact-notify' }],
    attachments,
  });

  if (notify.error) {
    // Resend errors carry a machine-readable `name` (validation_error,
    // rate_limit_exceeded, ...) and a human `message`. Log both, show neither
    // to the visitor beyond a generic failure.
    console.error('contact: notify failed', notify.error);
    return res.status(502).json({ error: 'Could not send right now. Email me directly instead.' });
  }
  const id = notify.data?.id ?? notifyId;

  // 2. Receipt to the visitor (best effort; never fails the request)
  let ackId: string | undefined;
  if (process.env.AUTOREPLY_ENABLED === '1') {
    const c = { ...ctx, id };
    const ack = await resend.emails.send({
      from,
      to: email,
      replyTo: to,
      subject: 'Got your message',
      text: receiptText(c),
      html: receiptHtml(c),
      headers: unsubSecret
        ? { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : undefined,
      tags: [{ name: 'kind', value: 'contact-ack' }],
      attachments,
    });
    if (ack.error) console.error('contact: autoreply failed', ack.error);
    else ackId = ack.data?.id;
  }

  return res.status(200).json({ ok: true, id, ack: ackId });
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

// Unique per-submission id so Gmail-style threading never collapses two
// different visitors' notifications into one thread.
function cryptoId() {
  return globalThis.crypto.randomUUID();
}
