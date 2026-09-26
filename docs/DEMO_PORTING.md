# Porting a product into a VIEW operator

How a case study's VIEW runs the product's own code, from any stack, without losing anything. Written for DomainClaim first and meant for every case study after it. First applied 2026-09-25 (DomainClaim, see `src/components/react/demos/domainclaim/PORT.md`). Moved into the repo from the Carlton Portfolio notes on 2026-09-26. How demos fit into a case study is in `docs/CASE_STUDY_PLAYBOOK.md`.

## The rule

The VIEW runs the product's real components. Only the **seams** change, and each seam is replaced at a boundary the product already has, with the smallest possible shim:

| Seam | What changes | What must not change |
|---|---|---|
| Data | Where answers come from: fixtures, a recorded stream, or the product's own server logic running in the page | The shape the UI receives (the product's DTOs, events, stream format) |
| Network | `fetch`, sockets, SSE, auth | The product's own client module that calls them, where possible |
| Framework | Router, links, image and font helpers, server-only markers | Component code |
| Platform | Timers, storage, clipboard, `window` size | Behavior |
| Style | Where the stylesheet is scoped | The stylesheet itself: the product's tokens, utilities and motion |

A port that edits component source is a recreation, however close. The label says so: **LIVE** means real product code on synthetic data; **RECREATION** means portfolio-owned code reproducing real behavior (FAST and the Engine, by Futurity's rule).

## The steps, for any stack

1. **Inventory.** Name the entry component. Walk its import closure with esbuild (`metafile`) and classify every module: pure logic, UI, framework seam, server-only, network. The server-only and network modules are the seams. Everything else should come across byte for byte.
2. **Pick the data seam.** Find the narrowest boundary where data enters the UI: an API client module, a store, a stream reader. Replace behind it:
   - **Scripted** (a demo that plays a script): no data seam at all. DomainClaim's `SignInDemo`.
   - **Recorded:** real responses captured, sanitized, replayed with their real timing through the product's own reader. `useReplay.js` is the precedent.
   - **In-page server:** the product's own pure server logic runs in the browser behind a fake `fetch` that honors the API contract. Only possible when that logic is pure and publishable. DomainClaim v2: the check pipeline plus the scripted `.test` resolver.
3. **Shim the framework.** Map framework imports to small local modules through a Vite plugin that only rewrites imports coming from the demo's own folder, so nothing else on the site is affected. Record every shim in the port manifest.
4. **Scope the style.** Compile the product's styling system as its own root and keep it out of the site's cascade (see "Style" below).
5. **Vendor with provenance.** Copy the product files verbatim into `src/components/react/demos/<project>/vendor/`, keeping their relative paths. A `PORT.md` beside them records the source repo, the commit, the file list, each shim, and any edit (the target is zero). `scripts/port-sync.mjs <project>` re-copies from a checkout and prints the diff, so the demo follows the product instead of drifting.
6. **Mount.** An Astro island inside `DemoFrame`, `client:visible` (or `client:only` with a poster for DOM-only libraries), inside a VIEW operator. Check the gz size of the island's chunks against the 300 KB budget from the build manifest.
7. **Prove nothing was lost.** Screenshot the product and the island at the same size and state (Playwright), and compare. Differences are either a documented seam or a bug.

## Where the product runs: its own document

Learned on the first port. A product that reads the window (media queries, page scroll, sticky
headers, `window.location`) can't share the portfolio's window: its media queries would read the
portfolio's width, and its scroll would move the case study. So a full-screen port runs in a
**demo document of its own** (an Astro page under `/demos/<project>/`, noindex, out of the
sitemap), and the VIEW shows it in a **scaled, same-origin iframe**, the way DomainClaim's own home
page shows its demo.

- Wide operators draw the product at a laptop width and scale it down. Below the product's phone
  breakpoint the frame draws at the container's real width, so the product's own phone rules apply.
- The frame mounts only when the operator nears the viewport.
- The case study talks to the demo with `postMessage` (commands in, observations out), same origin
  only.
- The demo document loads the product's stylesheet and nothing of the site's, so the style problem
  below mostly disappears. The site's Tailwind is told to skip the port's folder (`@source not`).

A single self-contained component that doesn't read the window can still mount inline in a shadow
root (below).

## Style, for inline components

The site runs Tailwind 4 with its own theme. A product brings its own styling system, whose class names, tokens and reset can collide with the site's. Options, best first:

1. **Shadow root.** The island mounts into a shadow root and the product's compiled CSS is attached inside it. The site's styles can't reach in and the product's can't leak out, including its reset and its `:root` tokens (Tailwind 4 writes theme variables to `:root, :host`, and `:host` matches the shadow host). Costs: fonts must be declared at document level; React portals and the native `dialog` need their container inside the root (`showModal` still uses the top layer); the site's Tailwind must not scan the demo folder (`@source not`).
2. **Rewritten scope.** Compile the product's CSS separately and rewrite selectors under `.dc-demo` with PostCSS (`:root` → the scope class, utilities prefixed). Works without shadow DOM; a reset rule can still escape if the rewrite misses it.
3. **Tailwind prefix.** Rebuild with `prefix(dc)`. It rewrites every class in the component source, so it breaks the zero-edit rule. Last resort.

By styling system:

| System | Method |
|---|---|
| Tailwind 4 | Separate CSS root: the product's `globals.css` with its `@theme`, `@source` pointed at the vendored folder, compiled to a string and attached in the shadow root |
| Tailwind 3 | The product's own config, compiled with its CLI, attached the same way |
| CSS Modules, plain CSS | Imported as text and attached in the shadow root |
| Emotion, Chakra, MUI | `CacheProvider` with a cache whose `container` is the shadow root; the product's `ThemeProvider` inside the island |
| styled-components | `StyleSheetManager target={shadowRoot}` |

## By stack

| Source | Method | Precedent |
|---|---|---|
| React (Next.js, Vite, CRA) | Verbatim components; framework shims; data seam at the API client | Futurescaper `HeroMap`, `layout.js`; DomainClaim |
| Next.js server components | Only the client subtree comes across; what the server rendered becomes fixtures in the same DTO | DomainClaim's rebuild made this unnecessary (screens are all client) |
| Vue, Svelte, Solid | Astro's own integrations run them as islands; same method | none yet |
| Frameworks Astro can't host (Angular and others) | The product's own build emits a custom element with fixtures baked in; the island mounts the element | none yet |
| Canvas, WebGL, three.js | Module port, lazy-loaded on first view | GRID (`previs-gl.js`, `grid-lab.js`) |
| Streaming UIs (SSE, NDJSON) | Record the stream with real timing; replay through the product's own reader | Engine replay, `useReplay.js` |
| Backend-heavy (Python API) | Record and sanitize at the API boundary; the frontend stays real where publishable, otherwise RECREATION | FAST (recreation by rule) |
| Server-rendered HTML (templates, static reports) | Snapshot the rendered HTML and CSS into a shadow root | none yet |
| Hardware, native apps | Video or RECREATION | the lab minis |

## Seams that turned up in practice

- **Build-time environment.** Vite replaces `process.env` in client code, so an environment switch
  the product reads (`DOMAINCLAIM_TEST_NAMESPACE`) is set per port in `port.json` and inlined by the
  port's Vite plugin, the way the product's own framework inlines it.
- **Wrapping one function.** To read a value that never reaches the screen, or to tell another
  shim what the product is working on, wrap one exported function in a module that re-exports the
  rest unchanged and passes the return value on untouched. DomainClaim's `check-scope.ts` wraps
  `runCheck` so the DNS shim knows which name is being checked.
- **Forbidden request headers.** A browser drops Origin and Host from a `Request` it builds, and the
  product's same-origin check reads both. The in-page API hands route handlers a request object
  with a standalone `Headers`, which keeps them.
- **Caches outlive remounts.** SWR's default cache is global. A fresh scene needs its own cache
  boundary around the product's shell.
- **Requests that skip `fetch`.** An `<img src="/api/...">` goes straight to the network. The demo
  routes the image's `src` (React sets it as an attribute, then again as a property) to the same
  in-page handler and hands the bytes over as a blob.
- **Cross-origin reads.** A server feature that reads other sites (DomainClaim's favicon fetch)
  can only reach the site the demo is served from. Run the product's own logic for that one site.
  For a few chosen sites, save the real data once and ship it with the demo. Give every other
  input the product's own "nothing found" answer.
- **Seeded data that must pass.** Seeded rows can trigger the product's own work (opening a
  verified claim runs a check). Seed whatever that work needs too, or the product shows a failure
  the real app never would. DomainClaim's seeded claims register their records with the DNS shim.
- **An iframe can't move.** Moving an iframe's element in the DOM reloads it and loses the demo's
  state, so a demo in its own document stays where it is (no DUO dock).
- **Seam modules the product imports.** When a seam re-exports a vendored module, list that module
  as an entry in `port.json`, or the sync drops it and its imports.

## Tooling (site repo)

- `src/components/react/demos/ports.mjs`: one Vite plugin for every port. It reads each
  `port.json` and applies the alias, the seams and the environment to files in that port's folder
  only.
- `scripts/port-sync.mjs <project> <product repo>`: re-copies the import closure (esbuild, seams not
  followed) into `vendor/`, writes `vendor.lock.json`, prints what changed.

## DomainClaim, applied

- **Entries:** the sign-in demo (`SignInDemo`), the app shell, the domains and claim screens, the
  client API, the route handlers (me, claims, check, release, favicon) and `lib/claims/check.ts`.
  The esbuild walk from these is the vendored closure.
- **Seams (11):** `server-only`, `next/server`, `next/link`, `next/navigation` (a memory router),
  `node:crypto`, the claim store (in memory, keeping the one-owner index), the rate limiter, the
  Supabase route client (one demo account), the node DNS resolver, `check` (scoped for the resolver)
  and the favicon fetch.
- **Where it runs:** its own document, `/demos/domainclaim/`, with the product's `globals.css`
  (Tailwind 4, its own `@theme`) and fonts. Two views: `?view=signin` (the home-page demo, playing
  by itself) and the app, driven by the state card under it.
- **Data:** the sign-in demo is scripted. The app runs the product's route handlers in the page
  behind a fake `fetch`, with the product's scripted `.test` resolver and an in-memory store. Each
  scene also seeds carlton.dev, apple.com and microsoft.com as verified claims of the demo account,
  with their records in place and their real site icons.
- **Label:** LIVE.
- **Result:** 86 vendored files, 11 seams, zero edits. The demo document ships about 96 KB gz of its
  own plus React. Every demo name plays its real script, including held-by-another (seeded with a
  second account) and the check limit.
