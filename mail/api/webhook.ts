import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * POST /api/webhook — Resend event receiver.
 *
 * Resend signs every delivery (Svix-style): headers svix-id, svix-timestamp,
 * svix-signature, HMAC over `${id}.${timestamp}.${rawBody}` with the endpoint's
 * signing secret. Verification proves (a) the payload came from Resend, not
 * anyone who found our URL, and (b) it was not altered in transit. The
 * timestamp check (default tolerance 5 min) blocks replaying an old event.
 *
 * Idempotency: Resend retries on non-2xx, so the same event can arrive twice.
 * svix-id is stable across retries; a real receiver stores it and skips
 * duplicates. This one only logs, so a duplicate costs a duplicate log line.
 */
export const config = { api: { bodyParser: false } }; // signature needs the RAW body

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('webhook: RESEND_WEBHOOK_SECRET not set');
    return res.status(500).end();
  }

  const raw = await readRaw(req);
  const headers = {
    id: String(req.headers['svix-id'] ?? ''),
    timestamp: String(req.headers['svix-timestamp'] ?? ''),
    signature: String(req.headers['svix-signature'] ?? ''),
  };

  // The SDK wraps the Svix verification (HMAC-SHA256 over id.timestamp.body,
  // constant-time compare, timestamp tolerance). No API key needed for this.
  const resend = new Resend(process.env.RESEND_API_KEY ?? 're_unused');
  let event: ReturnType<typeof resend.webhooks.verify>;
  try {
    event = resend.webhooks.verify({ payload: raw, headers, webhookSecret: secret });
  } catch (err) {
    console.warn('webhook: signature rejected', (err as Error).message);
    return res.status(400).json({ error: 'invalid signature' });
  }

  const d = event.data as unknown as Record<string, unknown>;
  const tags = (d.tags ?? {}) as Record<string, string>;
  const to = Array.isArray(d.to) ? (d.to as string[]) : [];
  const bounce = d.bounce as { message?: string; type?: string; subType?: string } | undefined;
  console.log(
    JSON.stringify({
      at: event.created_at,
      type: event.type,
      email_id: d.email_id,
      to,
      subject: d.subject,
      kind: tags.kind,
      svix_id: headers.id,
      bounce,
    }),
  );

  // The one action worth taking for a contact form: a receipt that bounced or
  // was reported as spam means the visitor's address is wrong (or hostile).
  // Tell Carlton, since the only reply channel he had just failed.
  const isReceipt = tags.kind === 'contact-ack';
  const isTrouble = event.type === 'email.bounced' || event.type === 'email.complained';
  if (isReceipt && isTrouble) {
    const owner = process.env.CONTACT_TO;
    const from = process.env.CONTACT_FROM;
    const apiKey = process.env.RESEND_API_KEY;
    if (owner && from && apiKey) {
      const what = event.type === 'email.bounced' ? 'bounced' : 'was reported as spam';
      const why = bounce ? ` (${bounce.type ?? ''}${bounce.subType ? '/' + bounce.subType : ''}: ${bounce.message ?? ''})` : '';
      const r = await new Resend(apiKey).emails.send({
        from,
        to: owner,
        subject: `carlton.dev: receipt to ${to.join(', ')} ${what}`,
        text: `The auto-reply for a contact-form message ${what}${why}.\n\nVisitor address: ${to.join(', ')}\nReceipt email id: ${d.email_id}\n\nTheir address may be mistyped. Check the original notification (same time, subject "carlton.dev: <name>") for context, and find another way to reach them if it matters.`,
        tags: [{ name: 'kind', value: 'contact-alert' }],
      });
      if (r.error) console.error('webhook: alert failed', r.error);
      else console.log('webhook: alert sent', r.data?.id);
    }
  }

  // 200 quickly. A slow or non-2xx handler makes Resend retry (same svix-id),
  // which is where idempotency matters in a real receiver.
  return res.status(200).json({ received: true });
}

function readRaw(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
