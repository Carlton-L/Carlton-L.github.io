# Carlton-L.github.io (carlton.dev) — Claude Guidelines

Portfolio site for carlton.dev. Astro 6 + React islands + Tailwind 4, static output. **This repo is the canonical source**; branch `astro`; deploys via GitHub Actions → Pages (`.github/workflows/deploy.yml`). The `chatbot/` directory is a separate project (RAG digital twin) — leave it alone unless asked.

This file holds the rules. The detail behind them lives in `docs/` (listed at the end).

## Design system: "THE PATCH"

The site is a live dataflow network (TouchDesigner-derived grammar). **Read `design/DIRECTION_PATCH.md` in the "Carlton Portfolio" folder before any UI work.** Detail: `docs/PATCH_SYSTEM.md`.

- Content blocks are **operators** (`src/components/Operator.astro`): typed header (VIEW / TXT / DATA / SYS), ports, draggable in PATCH mode. The network runtime is `PatchField.astro`; document pages use `PatchDoc.astro`.
- **Cables are real subscriptions** through `src/lib/patch-runtime.js` (`window.Patch`). The bus is interaction-driven only; nothing emits per frame. Selections re-cook the network (Carlton's north star): extend that pattern.
- ⚠️ `patch-runtime.js` and `previs.js` must have no `//` or `/*` inside string or regex literals (PatchField strips comments at build).
- **Layout** is authored as ASCII grid areas (`layout` on PatchField, `area` on Operator). Every tier names every area op. Never hardcode field heights; don't reintroduce `pos` strings or `translateX(-50%)`.
- **Two modes**: PATCH (desktop ≥1280) and READ (default below 1280 and for reduced motion; internally `body.perform`). READ stacks operators in source order. Every component works in both.
- The dither background is a visible chain of four SYS ops, persisted in localStorage (`patch-bg`). Keep the ImageData blit; don't regress to per-cell fills.
- Controls: sliders are `.prange`; clickable chips are `.chipbtn` (signal border/text); static chips stay grey.
- Type: Proxima Nova (Adobe Fonts kit) + Inter fallback + IBM Plex Mono (`--font-mono`). Never reintroduce self-hosted Gotham. `--signal: #3dff88` marks cables, live states and links.
- Demo interiors use each product's own visual language, scoped inside the VIEW.
- New work-index previews go in `previs.js`'s `V` registry, never in page scripts.

## Conventions

- Tokens: `src/styles/tokens.css` (names are stable; Tailwind maps them in `tailwind.config.mjs`).
- Content: `src/data/content.js` is the single source for project and case-study copy. Copy is fact-checked: don't embellish roles or numbers. **Never name Futurity clients.**
- Tagline: **"Designer who deploys. Engineer who dreams. I build what I design."** Carlton doesn't sketch; never reintroduce "engineer who sketches". The CV is `public/cv/Carlton_Lindsay_Design_Engineer_CV.pdf` (generator: portfolio folder `archive/gen-cv.js`).
- FAST is "Futurity Analysis & Synthesis Tools". Never reintroduce "Accelerated Science" in copy.
- Prefer zero-JS Astro; inline `<script is:inline data-astro-rerun>` for patch behaviors; React islands only for demos.
- SEO: every page uses the JSON-LD helpers in `src/lib/seo.js`, with a unique title and description.
- Astro quirks: variables used by `getStaticPaths` must be defined inside it; a `<p>` whose text starts with `//` is dropped, so write `{'// …'}`.
- Performance: the homepage ships about zero framework JS (the grid-lamp 3D preview is the one selection-gated exception); demo islands ≤300 KB gz; never scroll-jack; respect reduced motion.

## Case studies

Read `docs/CASE_STUDY_PLAYBOOK.md` before building or reshaping a case study, and `docs/DEMO_PORTING.md` before porting a product into a VIEW. The rules that always apply:

- **Futurescaper is the template.** Title, ownership, a demo that plays by itself, a short run of problem and decisions, a break, the live demo, a little more, outcome. DomainClaim follows it.
- **The ownership card comes right after the title in the page source.** READ mode and phones stack cards in source order.
- **Three section breaks at most**, each before something the visitor should slow down for. Cut text cards that restate another card; keep them to about 30 to 90 words.
- **A case study stands on its own.** It shows decisions, reasons, impact and care for every error state and every kind of user. It never says who the work was for or how it was judged unless Carlton asks.
- **Real demos.** VIEWs run the product's own code wherever that's allowed, labeled LIVE or RECREATION. When something can't run in a browser, show the product's own honest state. The "Try it" copy says everything is clickable.
- **Cards never change height** (it resets the dither background). Fixed heights per width; for variants, stack them in one grid cell so the card fits the longest.
- **Affordances.** Clickable = green outline. Disabled or "later" = the same shape, dashed grey, so nothing moves when it goes live. Large links use `GithubButton.astro`.
- **Check every round** with screenshots at 1440, 1280, 768 and 375, PATCH and READ, and confirm demo state changes leave the page height alone.

## Working with Carlton

- New UI pieces start as an HTML prototype with a few directions and one recommended, saved in `docs/prototypes/`. Copy comes as options with one recommended. Carlton picks.
- Copy follows `CARLTON_REGISTER.md` (Carlton Portfolio folder).
- Claude edits, Carlton commits. Before overwriting a file in his working copy, check it still matches what was last delivered. Commit messages are his: conventional, short, no AI mentions or co-author trailers.
- A git command meant for another repo starts with `cd` into that repo.

## Demos

Detail: `docs/DEMOS.md` (infrastructure, data, embedding), `docs/DEMO_PORTING.md` (running a product's own code), and the `NOTES.md` or `PORT.md` beside each demo.

- Shared chrome is `src/components/react/demos/_shared/DemoFrame.jsx`: title strip, honest label, reset. It sits flush inside the VIEW; never duplicate operator chrome.
- Demo data is synthetic or recorded-then-sanitized, deterministic, one file per demo (`src/data/demos/`).
- Labels: LIVE (real product code, synthetic data) or RECREATION (real behavior, portfolio code). **FAST and the Engine are recreation-only per Futurity**; Futurescaper and the browser extension are public.
- Reference implementations: Futurescaper (`demos/futurescaper/`) for inline islands, DomainClaim (`demos/domainclaim/`) for a full product port in its own document.

## Building in the Cowork sandbox

The mounted repo's `.vite`/`.astro`/`dist` caches are NOT writable from the Linux sandbox. To verify builds: copy the project (excluding node_modules/.astro/dist) to /tmp, `npm install --prefer-offline`, `npx astro build` there. `astro.config.sandbox.mjs` exists for this; safe to ignore locally.

## Related docs (in the "Carlton Portfolio" project folder — `~/Documents/Claude/Projects/Carlton Portfolio/`)

- `HANDOFF_2026-07-02.md` — session state + gap list (read first in a new session)
- `REVAMP_PLAN_2026-07.md` — overall strategy, positioning, job-spec→evidence matrix
- `design/DIRECTION_PATCH.md` — the chosen creative direction + Awwwards strategy
- `design/concept-patch.html` — living mockup of home + Futurescaper case-study network
- `live-demos/` — master plan, per-project demo session prompts, intake answers (incl. Futurity publish permissions: FAST/Engine recreated-only, Futurescaper/extension public)
- `archive/` — salvaged pages from the pre-patch site (e.g. immersive-experience-builder.astro)

In this repo: `docs/CASE_STUDY_PLAYBOOK.md`, `docs/DEMO_PORTING.md`, `docs/DEMOS.md`, `docs/PATCH_SYSTEM.md`, `docs/AI_LAYER.md`, `docs/prototypes/`, and a `NOTES.md` or `PORT.md` beside each demo.
