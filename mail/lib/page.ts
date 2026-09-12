/**
 * Tiny dark confirmation pages for the unsubscribe / block endpoints, styled as
 * one SYS operator. `form` renders a POST button (same URL, token in the query)
 * so the action only happens on a real click, never on a link preview or a
 * security scanner following the GET.
 */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function page(o: { op: string; title: string; body: string; form?: { action: string; label: string }; link?: [string, string] }) {
  const form = o.form
    ? `<form method="post" action="${esc(o.form.action)}"><button type="submit">${esc(o.form.label)}</button></form>`
    : '';
  const link = o.link ? `<p><a href="${esc(o.link[0])}">${esc(o.link[1])}</a></p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${esc(o.title)} · carlton.dev</title>
<style>body{margin:0;background:#0a0a0b;color:#e6e6e2;font:15px/1.6 'proxima-nova',Inter,Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}
.op{max-width:440px;background:#101013;border:1px solid #232326;border-radius:7px}.h{padding:6px 10px;border-bottom:1px solid #232326;font:10px 'IBM Plex Mono',Menlo,monospace;letter-spacing:1.5px;color:#8f8f8a;display:flex;justify-content:space-between}
.h b{background:#232326;padding:1px 6px;border-radius:3px;font-weight:700;font-size:9px}.b{padding:14px}.b h1{font-size:18px;margin:0 0 8px}a{color:#3dff88}
button{margin:6px 0 4px;padding:8px 14px;border:1px solid #2c2c30;border-radius:4px;background:#161619;color:#ff6b60;font:11px 'IBM Plex Mono',Menlo,monospace;letter-spacing:.04em;cursor:pointer}button:hover{border-color:#ff6b60}</style></head>
<body><div class="op"><div class="h"><span>${esc(o.op)}</span><b>SYS</b></div><div class="b"><h1>${esc(o.title)}</h1><p>${o.body}</p>${form}${link}</div></div></body></html>`;
}
