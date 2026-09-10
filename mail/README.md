# mail/ — carlton.dev serverless mail surface

Two Vercel functions. Deployed as a separate Vercel project whose **Root Directory = `mail`**
(the Astro site keeps deploying to GitHub Pages; this folder is ignored by that build).

| Route          | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `POST /api/contact` | contact form → notification to Carlton + visitor auto-reply (Resend) |
| `POST /api/webhook` | Resend delivery events, signature-verified, logged   |

## Local

```
cd mail && npm install
cp .env.example .env.local   # fill in; never commit
npx vercel dev               # http://localhost:3000/api/contact
```

## Env vars (Vercel → Settings → Environment Variables)

See `.env.example`. `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are secrets: server-side only,
never in the site bundle, never in git.

## Smoke test

```
curl -i -X POST https://<project>.vercel.app/api/contact \
  -H 'Origin: https://carlton.dev' -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"carltonl@pm.me","message":"Hello from curl, ten chars+"}'
```
