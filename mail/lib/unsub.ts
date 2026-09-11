import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Unsubscribe tokens: base64url(email) + '.' + HMAC-SHA256(email, UNSUB_SECRET)[0:32].
 * No login, no database: the signature proves the link came from us for that
 * address, so a stranger can't suppress someone else's email by guessing.
 */
const b64u = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const sig = (email: string, secret: string, purpose: string) => createHmac('sha256', secret).update(purpose + ':' + email).digest('hex').slice(0, 32);

/** purpose: 'unsub' (visitor stops receipts) | 'block' (Carlton bans a sender). Tokens are not interchangeable. */
export function makeToken(email: string, secret: string, purpose: 'unsub' | 'block' = 'unsub') {
  return `${b64u(email)}.${sig(email, secret, purpose)}`;
}

export function readToken(token: string, secret: string, purpose: 'unsub' | 'block' = 'unsub'): string | null {
  const i = token.indexOf('.');
  if (i < 1) return null;
  let email = '';
  try { email = Buffer.from(token.slice(0, i), 'base64url').toString('utf8'); } catch { return null; }
  if (!email || email.length > 254) return null;
  const a = new Uint8Array(Buffer.from(token.slice(i + 1))), b = new Uint8Array(Buffer.from(sig(email, secret, purpose)));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}
