/**
 * Email templates in the site's patch grammar. Table-based, inline styles,
 * 600px, system font fallbacks. Every word sits in a solid operator card on
 * a #0a0a0b ground; the visitor's dither snapshot (inline image, cid:patchbg)
 * only ever paints the gutters, so a blocked image gives the READ-mode look.
 */
const F_SANS = "'proxima-nova','Inter',Helvetica,Arial,sans-serif";
const F_MONO = "'IBM Plex Mono','SFMono-Regular',Menlo,Consolas,monospace";
const C = { bg: '#0a0a0b', el: '#101013', sur: '#161619', text: '#e6e6e2', muted: '#8f8f8a', dim: '#5c5c58', border: '#232326', bad: '#ff6b60' };
const TYP: Record<string, [string, string]> = { view: ['#123c24', '#3dff88'], txt: ['#2a2a20', '#e6e6d8'], data: ['#0f2c3d', '#56b4e9'], sys: ['#232326', '#8f8f8a'] };
export const PALETTE_HOT: Record<string, string> = { GRN: '#3dff88', AMB: '#e8a317', CYN: '#56b4e9', MONO: '#9f9f98' };

export const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function op(name: string, typ: keyof typeof TYP, body: string) {
  const [tb, tf] = TYP[typ];
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="pm-op" bgcolor="${C.el}" style="border-collapse:separate;background:${C.el};background-color:${C.el};border:1px solid ${C.border};border-radius:7px;margin:0 0 26px;">
  <tr><td bgcolor="${C.el}" style="padding:6px 10px;border-bottom:1px solid ${C.border};background-color:${C.el};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${F_MONO};font-size:10px;letter-spacing:1.5px;color:${C.muted};">${esc(name)}</td>
      <td align="right" style="font-family:${F_MONO};font-size:9px;letter-spacing:1.5px;"><span style="display:inline-block;padding:1px 6px;border-radius:3px;background:${tb};color:${tf};font-weight:700;">${typ.toUpperCase()}</span></td>
    </tr></table>
  </td></tr>
  <tr><td class="pm-text" bgcolor="${C.el}" style="padding:12px 14px;font-family:${F_SANS};font-size:14px;line-height:1.6;color:${C.text};background-color:${C.el};">${body}</td></tr>
</table>`;
}

const readout = (rows: [string, string, boolean?][], sig: string, valueColor = C.text) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:${F_MONO};font-size:11px;line-height:1.75;">${rows
    .map(([k, v, hot]) => `<tr><td style="padding:0 14px 0 0;color:${C.dim};font-family:${F_MONO};font-size:11px;">${esc(k)}</td><td style="font-family:${F_MONO};font-size:11px;color:${hot ? sig : valueColor};">${v}</td></tr>`)
    .join('')}</table>`;

/* stop marker: a small red block, no emoji (renders identically in every client) */
const STOP = `<span style="display:inline-block;width:8px;height:8px;background:${C.bad};border-radius:2px;vertical-align:0;margin-right:7px;"></span>`;
const linkRow = (href: string, label: string, hint: string, col: string, icon = '') =>
  `<tr><td style="padding:4px 0;font-family:${F_MONO};font-size:11px;">${icon}<a href="${href}" style="color:${col};text-decoration:none;">${label} &rarr;</a> <span style="color:${C.dim};">${hint}</span></td></tr>`;

const strip = (sig: string, k: string, v: string, id: string, when: string, field: string) =>
  `<div style="margin:14px 0 0;font-family:${F_MONO};font-size:10px;letter-spacing:1px;color:${C.dim};">${k} <span style="color:${sig};">${v}</span> &middot; ${esc(id.slice(0, 8))}&hellip; &middot; ${esc(when)}${field ? ' &middot; ' + esc(field) : ''}</div>`;

const channels = () =>
  op('data · channels', 'data', `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:${F_MONO};font-size:11px;line-height:1.9;">
<tr><td style="padding-right:18px;color:${C.dim};font-family:${F_MONO};font-size:10px;letter-spacing:1.5px;">EMAIL</td><td><a href="mailto:carlton@carlton.dev" style="color:${C.text};text-decoration:none;font-family:${F_MONO};font-size:11px;">carlton@carlton.dev &rarr;</a></td></tr>
<tr><td style="padding-right:18px;color:${C.dim};font-family:${F_MONO};font-size:10px;letter-spacing:1.5px;">LINKEDIN</td><td><a href="https://linkedin.com/in/carltonl" style="color:${C.text};text-decoration:none;font-family:${F_MONO};font-size:11px;">linkedin.com/in/carltonl &rarr;</a></td></tr>
<tr><td style="padding-right:18px;color:${C.dim};font-family:${F_MONO};font-size:10px;letter-spacing:1.5px;">WORK</td><td><a href="https://carlton.dev/projects" style="color:${C.text};text-decoration:none;font-family:${F_MONO};font-size:11px;">carlton.dev/projects &rarr;</a></td></tr></table>`);

function shell(o: { preheader: string; bg: boolean; sig: string; ops: string; footer: string }) {
  const bgCss = o.bg ? `background:${C.bg} url('cid:patchbg') repeat-y top center;` : `background:${C.bg};`;
  const bgAttr = o.bg ? ` background="cid:patchbg"` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>carlton.dev</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  /* Pins for clients that still transform colours in dark mode (Apple Mail, Outlook, Proton apps). The email is authored dark; keep it dark. */
  @media (prefers-color-scheme: dark) {
    .pm-ground, .pm-ground td.pm-g { background-color: ${C.bg} !important; }
    .pm-op { background-color: ${C.el} !important; border-color: ${C.border} !important; }
    .pm-text, .pm-text p, .pm-text div { color: ${C.text} !important; }
    .pm-text p.pm-muted, .pm-muted { color: ${C.muted} !important; }
  }
  [data-ogsc] .pm-op { background-color: ${C.el} !important; }
  [data-ogsc] .pm-text { color: ${C.text} !important; }
  [data-ogsc] .pm-text p.pm-muted { color: ${C.muted} !important; }
</style>
</head>
<body class="pm-ground" bgcolor="${C.bg}" style="margin:0;padding:0;background:${C.bg};background-color:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="pm-ground" bgcolor="${C.bg}" style="background:${C.bg};background-color:${C.bg};">
<tr><td align="center" class="pm-g" bgcolor="${C.bg}" style="padding:18px 8px;background-color:${C.bg};">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="pm-ground" bgcolor="${C.bg}" style="width:600px;max-width:600px;border:1px solid ${C.border};border-radius:9px;overflow:hidden;background:${C.bg};background-color:${C.bg};">
  <tr><td class="pm-g" bgcolor="${C.bg}" style="padding:9px 14px;background:${C.bg};background-color:${C.bg};border-bottom:1px solid ${C.border};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${F_SANS};font-size:13px;font-weight:700;letter-spacing:1px;color:${C.text};">CARLTON.DEV <span style="display:inline-block;margin-left:8px;padding:2px 7px;border:1px solid ${C.border};border-radius:3px;font-family:${F_MONO};font-size:10px;font-weight:400;letter-spacing:1px;color:${C.muted};">/contact</span></td>
      <td align="right" style="font-family:${F_MONO};font-size:10px;letter-spacing:1.5px;color:${o.sig};">&#9679; COOKED</td>
    </tr></table>
  </td></tr>
  <tr><td${bgAttr} bgcolor="${C.bg}" style="${bgCss}background-color:${C.bg};padding:44px 44px 22px;">
    ${o.ops}
  </td></tr>
  <tr><td class="pm-g" bgcolor="${C.bg}" style="padding:10px 14px;border-top:1px solid ${C.border};background:${C.bg};background-color:${C.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${F_MONO};font-size:10px;letter-spacing:1px;color:${C.dim};">${o.footer}</td>
      <td align="right" style="font-family:${F_MONO};font-size:10px;letter-spacing:1px;"><a href="https://carlton.dev" style="color:${o.sig};text-decoration:none;">carlton.dev &rarr;</a></td>
    </tr></table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const viaResend = `sent via <a href="https://resend.com" style="color:${C.dim};text-decoration:underline;">resend</a> &middot; eu-west-1 &middot; no tracking`;

export type Ctx = { name: string; email: string; message: string; id: string; when: string; field: string; sig: string; bg: boolean; unsubUrl: string; blockUrl: string };

/** Receipt → the visitor. Note first, options list, channels, receipt strip. Never echoes the message body. */
export function receiptHtml(c: Ctx) {
  const note = `<p style="margin:0 0 12px;font-size:17px;line-height:1.5;">Hi ${esc(c.name)},</p>
<p style="margin:0 0 12px;font-size:15px;">Your message reached me on carlton.dev. I read everything and reply to most things within a couple of days. If it&rsquo;s time-sensitive, reply to this email and it lands in the same inbox.</p>
${c.field ? `<p class="pm-muted" style="margin:0;color:${C.muted};font-size:13px;">The field behind this card is the one you left the site on.</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;">
${linkRow('mailto:carlton@carlton.dev?subject=' + encodeURIComponent('Re: my message on carlton.dev'), 'Reply to add to your message', 'same thread, same inbox', c.sig)}
${linkRow('https://carlton.dev/carlton.vcf', 'Save my contact', 'vCard', c.sig)}
${linkRow(c.unsubUrl, 'This wasn&rsquo;t me', 'stops any further email to this address', C.bad, STOP)}
</table>`;
  const ops = op('txt · from_carlton', 'txt', note) + channels() + strip(c.sig, 'receipt', '&#10003; received', c.id, c.when, c.field);
  return shell({ preheader: 'Your message reached Carlton. Receipt inside.', bg: c.bg, sig: c.sig, ops, footer: viaResend });
}

export function receiptText(c: Ctx) {
  return `Hi ${c.name},\n\nYour message reached me on carlton.dev. I read everything and reply to most things within a couple of days. If it's time-sensitive, reply to this email and it lands in the same inbox.\n\nReply to add to your message: carlton@carlton.dev\nSave my contact: https://carlton.dev/carlton.vcf\nThis wasn't me (stops any further email to this address): ${c.unsubUrl}\n\nEmail    carlton@carlton.dev\nLinkedIn https://linkedin.com/in/carltonl\nWork     https://carlton.dev/projects\n\nreceipt ${c.id.slice(0, 8)}… · ${c.when}${c.field ? ' · ' + c.field : ''}\nsent via resend · carlton.dev`;
}

/** Notification → Carlton. Message first, options list, greyed form details, relay strip. */
export function notifyHtml(c: Ctx & { ackId?: string; ackState: string; resendUrl: string }) {
  const msg = `<p style="margin:0 0 10px;font-size:15px;"><strong>${esc(c.name)}</strong> <span style="color:${C.muted};font-family:${F_MONO};font-size:11px;">&lt;${esc(c.email)}&gt;</span></p>
<div style="border-left:3px solid ${c.sig};padding:2px 0 2px 12px;white-space:pre-wrap;font-size:15px;line-height:1.6;">${esc(c.message)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;">
${linkRow('mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent('Re: your message on carlton.dev'), 'Reply', 'goes to them via reply-to', c.sig)}
${linkRow(c.resendUrl, 'Open in Resend', 'events, headers, receipt status', C.muted)}
${linkRow(c.blockUrl, 'Block this sender', 'they can&rsquo;t use the form again; undo in Resend &rarr; Suppressions', C.bad, STOP)}
</table>`;
  const ops =
    op('txt · message', 'txt', msg) +
    op('input · send_message', 'txt', readout([['name', esc(c.name)], ['email', esc(c.email)], ['reply_to', 'set &rarr; them'], ['field', c.field ? esc(c.field) : 'default']], c.sig, C.muted)) +
    strip(c.sig, 'relay', `&#10003; sent &middot; receipt ${esc(c.ackState)}`, c.id, c.when, '');
  return shell({ preheader: `${c.name} wrote via carlton.dev`, bg: c.bg, sig: c.sig, ops, footer: 'reply to answer them directly' });
}

export function notifyText(c: Ctx & { ackState: string }) {
  return `From: ${c.name} <${c.email}>\n\n${c.message}\n\n---\nreply_to set to them · receipt ${c.ackState}${c.field ? ' · field ' + c.field : ''}\nBlock this sender: ${c.blockUrl}`;
}
