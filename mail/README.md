# mail/ — carlton.dev serverless mail surface

Five Vercel functions behind the contact form on carlton.dev. Deployed as its own Vercel
project (`carlton-dev`, **Root Directory = `mail`**, production branch `astro`) at
`https://api.carlton.dev`. The Astro site keeps deploying to GitHub Pages; this folder is
not part of that build. Mail goes out through Resend (eu-west-1, domain `carlton.dev`).

## Routes

| Route | Method | What it does |
| --- | --- | --- |
| `/api/contact` | POST | Contact form. Honeypot, validation, suppression-list gate, then two sends: notification to Carlton (reply-to = visitor) and a receipt to the visitor (reply-to = Carlton, `List-Unsubscribe` headers). Returns `{ ok, id, ack }`. |
| `/api/status` | GET `?id=` | Proxies `emails.get(id)` and returns only `{ last_event }`, so the form can show whether the receipt was accepted or bounced. |
| `/api/webhook` | POST | Resend event receiver. Verifies the Svix signature over the raw body, logs one JSON line per event, and emails Carlton when a receipt bounces or is reported as spam. |
| `/api/unsubscribe` | GET / POST `?t=` | "This wasn't me" link in the receipt and the one-click `List-Unsubscribe-Post` target. Adds the address to the Resend suppression list. |
| `/api/block` | GET `?t=` | "Block this sender" link in Carlton's notification. Same suppression list; `/api/contact` refuses suppressed addresses with a fake 200. |

`lib/` holds the shared pieces: `cors.ts` (origin allowlist, preflight), `validate.ts` (field
rules + `esc`), `unsub.ts` (HMAC tokens), `templates.ts` (the two emails, HTML + text).

## The flow

```
visitor  ── POST {name,email,message,bg,field} ──▶  /api/contact
                                                       │  suppressions.get(email)   (gate)
                                                       │  emails.send  notify → CONTACT_TO
                                                       │  emails.send  receipt → visitor
                                                       ◀── { ok, id, ack }
form polls /api/status?id=<ack> every 3 s for ≤45 s ──▶ "accepted by their server ✓" / "bounced ✗"

Resend ── email.sent / delivered / delivery_delayed / bounced / complained ──▶ /api/webhook
                                                       │  verify signature, log
                                                       └─ bounced|complained on a receipt → alert email to CONTACT_TO
```

Tags on every send (`kind`): `contact-notify`, `contact-ack`, `contact-alert`. The webhook
keys its one action off `contact-ack`.

## Env vars (Vercel → Settings → Environment Variables)

See `.env.example`. `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` and `UNSUB_SECRET` are secrets:
server-side only, never in the site bundle, never in git. The API key needs **Full access**
(`emails.get` and `suppressions.*` are not covered by a sending-only key).

## Resend dashboard state (done by hand, for the record)

- Domain `carlton.dev` verified, region eu-west-1. DNS at Squarespace: TXT `resend._domainkey`
  (DKIM), CNAME `send` and `rsend` → `*.forge.rmta.net` (SPF/Return-Path served through the
  alias). Root SPF and DMARC (`p=quarantine`) belong to Proton and were left alone.
- Webhook endpoint `https://api.carlton.dev/api/webhook`, events: sent, delivered,
  delivery_delayed, bounced, complained. No opens/clicks (no tracking in these emails).
- API key `carlton-dev-contact`, Full access.

## Emails (`lib/templates.ts`)

Both emails are a stack of operator cards in the site's patch grammar. Receipt: note (with
reply / vCard / "This wasn't me"), `view · your_field`, channels, receipt strip. Notification:
the message with reply / open-in-Resend / block rows, `view · their_field`, input readout,
relay strip. The field image is one 600×120 PNG the contact page renders from the visitor's
own background settings, attached inline as `cid:hero`.

Rendering rules that came out of testing in Apple Mail, Proton, Gmail and Outlook.com
(light and dark): no CSS backgrounds on cells, art is a plain `<img>` with a dark background;
dividers are 1px `bgcolor` rows; spacing is spacer rows; `color-scheme` meta plus `bgcolor`
attributes and `!important` pins keep the dark ground dark; no emoji anywhere. The Resend
inspector never resolves `cid:` images; real sends are the test.

## Local

```
cd mail && npm install
cp .env.example .env.local   # fill in; never commit
npx vercel dev               # http://localhost:3000/api/contact
```

## Smoke tests

```
# happy path (receipt goes to the address you put in "email")
curl -i -X POST https://api.carlton.dev/api/contact \
  -H 'Origin: https://carlton.dev' -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"carltonl@pm.me","message":"Hello from curl, ten chars+"}'

# Resend test addresses: delivered@resend.dev, bounced@resend.dev, complained@resend.dev
# (a bounce on the receipt should produce a webhook log line and an alert email)

curl -s 'https://api.carlton.dev/api/status?id=<uuid>' -H 'Origin: https://carlton.dev'
```

## Known gaps

- Webhook is not idempotent (Resend retries on non-2xx; a duplicate costs a duplicate log
  line and, on a bounce, a duplicate alert). A real receiver would store `svix-id`.
- No rate limit or captcha. Honeypot + suppression gate only. Cloudflare Turnstile would be
  the next step if spam shows up.
- Hotmail/Outlook.com junks the first sends from a new domain (pure reputation; auth passes,
  mail-tester 9.5/10). Marking one as not junk moves the sender to the trusted list.
