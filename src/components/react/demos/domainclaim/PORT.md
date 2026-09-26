# DomainClaim port

The DomainClaim case study runs the product's own code: its screens, its client, and its route
handlers, copied unchanged from the product repo. This file lists what was copied, what was
replaced, and why. The method is written up in the portfolio folder,
`domainclaim-case-study/06_DEMO_PORT_METHOD.md`.

## Layout

| Path | What |
|---|---|
| `vendor/` | The product's files, byte for byte, at their repo paths. Never edited. |
| `vendor.lock.json` | Each vendored file with a content hash, from the last sync. |
| `port.json` | Entry points, the path alias, the seams and the build-time environment. |
| `shims/` | One module per seam. The only product-facing code written here. |
| `runtime/` | Glue: the in-page API and the demo document's root. |
| `DomainClaimFrame.jsx`, `SignInHero.jsx`, `StateCard.jsx`, `FailureView.jsx`, `explorer-*.js` | The case study's side: the scaled frame, the sign-in VIEW, and the states card driving the claim VIEW. |
| `../ports.mjs` | The Vite plugin that applies `port.json` to files in this folder only. |
| `src/pages/demos/domainclaim.astro` | The demo document the frames load. |

## Why a document of its own

The product reads the window: media queries at 720px, the page scroll, a sticky header. Inside a
case-study operator the window is the portfolio's, so the product runs in its own document at
`/demos/domainclaim/` and the operator shows it in a scaled frame, the same way the product's home
page shows its own demo. Its stylesheet is its own Tailwind build (`vendor/src/app/globals.css`);
the site's stylesheet never loads there, and `src/styles/global.css` skips this folder.

## Seams

| Import | Replaced by | Why |
|---|---|---|
| `server-only` | empty module | The "server" runs in the demo document. |
| `next/server` | `shims/next-server.ts` | `NextResponse` over the platform `Response`; the request shape the handlers read. |
| `next/link` | `shims/next-link.tsx` | An anchor that moves the in-memory router. |
| `next/navigation` | `shims/next-navigation.ts` | In-memory routing, so the demo never adds to the visitor's Back button. |
| `node:crypto` | `shims/node-crypto.ts` | `randomBytes` from the browser's secure random source. |
| `@/lib/claims/store` | `shims/store.ts` | The same functions over an in-memory table, each write keeping its product condition and the one-owner index. |
| `@/lib/claims/rateLimit` | `shims/rate-limit.ts` | The product's two check windows, counted in memory. |
| `@/lib/auth/supabase/route` | `shims/supabase-route.ts` | One signed-in demo account. Sign in is out of the demo. |
| `@/lib/dns/nodeResolver` | `shims/node-resolver.ts` | A browser can't send DNS queries. A real domain gets the product's own "the check could not run" answer; every `.test` name uses the product's scripted resolver, as in production. |
| `@/lib/favicon/fetch` | `shims/favicon-fetch.ts` | A browser can only read the site it is on without that site's permission. The product's icon search (`/favicon.ico`, then the home page's icon links, raster only, with its own parser and type check) runs for carlton.dev; every other name gets the product's answer for a site with no icon, the globe. |
| `@/lib/claims/check` | `shims/check-tap.ts` | Observation only: re-exports the product module and hands what `runCheck` decided to the explorer's "what the code decided" pane. |

Build-time environment (`port.json` `env`): `DOMAINCLAIM_TEST_NAMESPACE=on`, the same switch as the
production deployment.

## Glue

- `runtime/api.ts` answers `fetch('/api/...')` inside the demo document with the product's route
  handlers, adds 90 ms of latency, and copies each streamed check to the explorer.
- `runtime/api.ts` also answers the product's `<img src="/api/favicon/:id">`: an image request never goes
  through `fetch`, so the image's `src` (attribute and property) is routed to the same handler and
  given the bytes as a blob.
- `runtime/FrameApp.tsx` mirrors the product's root and app layouts, and takes one command from the
  case study: open a demo name as a fresh claim (optionally held by a second account first). Every scene also
  seeds carlton.dev as a verified claim of the demo account, the one site whose icon the demo can read.

## Updating

```
node scripts/port-sync.mjs domainclaim ../resend-take-home
```

Rewrites `vendor/` from the product's current source and prints what changed. Then build and check
both VIEWs.

Source: github.com/Carlton-L/resend-take-home, synced 2026-09-25 at `a2fb3a8`.
