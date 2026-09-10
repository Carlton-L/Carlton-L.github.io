export type ContactInput = {
  name: string;
  email: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; error: string; field?: keyof ContactInput };

// Deliberately loose: one @, something either side, no whitespace, a dot in the
// domain. RFC 5322 is not the goal; catching "carlton@" and "hello" is.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LIMITS = { name: 120, email: 254, message: 4000 } as const;

// Header injection guard: a name that contains a newline could otherwise be
// folded into a raw header by a careless caller. We only ever place these
// values inside JSON fields for the Resend SDK, but strip anyway.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function validateContact(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Expected a JSON object.' };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === 'string' ? oneLine(b.name) : '';
  const email = typeof b.email === 'string' ? oneLine(b.email).toLowerCase() : '';
  const message = typeof b.message === 'string' ? b.message.trim() : '';

  if (!name) return { ok: false, error: 'Name is required.', field: 'name' };
  if (name.length > LIMITS.name) return { ok: false, error: 'Name is too long.', field: 'name' };
  if (!EMAIL.test(email) || email.length > LIMITS.email)
    return { ok: false, error: 'That email address does not look right.', field: 'email' };
  if (message.length < 10) return { ok: false, error: 'Say a little more (10+ characters).', field: 'message' };
  if (message.length > LIMITS.message)
    return { ok: false, error: `Message is too long (${LIMITS.message} characters max).`, field: 'message' };

  return { ok: true, data: { name, email, message } };
}

/** Minimal HTML escaping for values interpolated into email bodies. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
