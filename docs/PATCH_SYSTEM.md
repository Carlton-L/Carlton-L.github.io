# The patch system

Detailed notes on the site's runtime, layout and backgrounds. Moved out of `CLAUDE.md` on 2026-09-26; `CLAUDE.md` keeps the rules and points here. The design direction itself is `design/DIRECTION_PATCH.md` in the Carlton Portfolio folder.

## Runtime and cables

- **Patch runtime (P1, 2026-07-05)**: `src/lib/patch-runtime.js` (`window.Patch`) is the message bus behind the cables — PatchField inlines it and registers each field. Links may carry ports (`['opIndex:selection','opFx']`), which makes the cable a real subscription; every routed delivery pulses it. Page behaviors are node registrations (`net.node(id, {outs, ins, filter})`) whose timers/listeners/observers the runtime tears down on `astro:before-swap` (`Patch.stats()` = leak counter; `?nopatch=1` = kill switch). Homepage = cycle_clock ─tick→ work_index ─selection→ post_fx (filter adds INVERT) → futurescaper_view. ⚠️ Keep patch-runtime.js free of `//` and `/*` inside string/regex literals (PatchField strips comments + `//<dev` blocks at build); the bus is interaction-driven ONLY — nothing emits per-frame (dither/wires rAF loops stay off it). Plan/phases: portfolio folder `design/PATCH_RUNTIME_PLAN.md` (P2 containers + lab, P3 monitor + public spec).
- Navigation between ideas = **cables** (bezier wires with signal pulses). **Selections re-cook the network** (Carlton's north star): homepage work_index rows swap the VIEW op's preview; interstitial SYS nodes (post_fx INVERT) transform downstream ops — extend this pattern.

- **`Patch.onScreen(el, fn, margin)`** (2026-09-29): the site's one pause rule. `fn(true/false)` as the element comes within `margin` (200px) of the viewport and the tab is visible. Every animation uses it.
- **`Patch.link(field, fromId, { port, initial })`** (2026-09-29): a small shared state (`get`, `set`, `on`) that emits on the controller's port, at most once per 120ms, so the cables out of it pulse. Behind `LinkedViews.astro`.

## Layout resolver

**Flex layouts (2026-10-05).** Every page except the home page now describes its layout as flexbox (`mode: 'flex'`), and the browser does the layout. The page is a column of rows; a row holds cards, or a column of cards where one card sits beside a stack. Why: the sketch placed cards on fixed cells, so spacing between cards of different heights was uneven, and pages leaned on nudges. With flex the gap between rows is the same everywhere (two grid units) and a row is centred, spread or indented by one word.

```js
const layout = {
  mode: 'flex', padTop: 48, gap: 2,
  rows: [
    { row: ['title:5', 'own:3'], justify: 'between' },
    { row: ['hero:10'], justify: 'center' },
    { row: ['what:4', 'role:4'], justify: 'between', inset: 1 },
    { row: ['d1:3', { op: 'd2', w: 3, mt: 1.5 }, { op: 'd3', w: 3, mt: 3 }], justify: 'between', inset: 1 },
    { row: ['bio:5', { col: ['xp:4', 'edu:4'], gap: 1 }], justify: 'between' },
  ],
};
```

- `'area:w'` is a card `w` twelfths of the field wide. No `w` means the card's `maxw`, or 4. `maxw` still caps the width.
- A row or column takes `justify` (start, center, end, between, around, evenly), `align` (start, center, end, stretch), `gap`, `mt`, `inset` (side padding in columns, or `[left, right]`), `w` and `h`. `gap`, `mt` and `h` are in grid units of 26px.
- A stepped row is a row whose cards have `mt` 0, 1.5 and 3.
- How it works: `flexLayout` in `patch-field.js` builds a hidden skeleton of plain boxes from the spec, one per card, lets the browser lay it out, and puts each card where its box landed. Cards stay absolutely placed, so dragging, the resize glide, the page-change handoff and the cables are unchanged.
- Nudges are ignored in flex mode. Cards may sit off the dot grid.
- The home page keeps its sketch (`mode: 'fill'`), described in the next paragraph. It fits one screen and was arranged by hand.

**What was tried first (2026-10-05).** Three hand-rolled systems, all dropped: automatic packing and signal-flow ranks (they ignore reading order), float with ghost nodes and groups in the sketch, and a dev-only editor for arranging pages by hand. Flexbox already solved the problem. The float patch is kept at `design/layout-system-2-pilot.patch` in the Carlton Portfolio folder.
- **Layout resolver (2026-07-05)**: patch-mode node placement is authored as ASCII grid-areas — PatchField takes `layout` (`mode: 'fill'|'content'`, `padTop`, `jitter`, width `tiers` each with `cols` + `areas` string); Operator takes `area` (+ optional `nudge="x y"`, `fit="auto"`, `maxw={px}`). The resolver snaps to the dot grid, relaxes overlaps down-column, computes content-mode field heights (never hardcode field heights again), and re-resolves on resize / mode toggle / island hydration. Dragged ops (`data-manual`) and DUO-docked ops are left alone; centered spans = middle cells + `maxw` (the `translateX(-50%)` idiom is dead). ALL five network pages are migrated — don't reintroduce `pos` strings (still supported, but it's the escape hatch, not the norm). Every tier must name every area op. Reference docs: portfolio folder `design/LAYOUT_ROLLOUT_PLAN.md` + `design/LAYOUT_SYSTEM_NOTES.md`.

## Dither background

- The dither background is generated by a **visible chain of four SYS ops** (noise_src → feedback → dither → out): value-noise/RIDGE/PLASMA types, feedback buffer (cursor paints phosphor trails), Bayer/SCAN/STATIC dither, palette cycling. Params cook instantly (`data-param`/`data-cycle` runtime in PatchField), **persist in localStorage (`patch-bg`)**, and stay live in READ mode. Perf: ImageData blit + gutter punch-out, 30fps, 140k-cell cap — don't regress to per-cell fillRects.

## Modes, nav and controls

- **Two modes**: PATCH (spatial; desktop ≥1280 only) and READ (visitor-facing name; internally still `body.perform` + localStorage `patch-mode`). Toggle = P key / navbar. READ = default below 1280 and for reduced-motion; SYS control ops compact to an inline strip; author operators in DOM reading order. EVERY new component must work in both modes.
- Footer is a **playbar**; nav is the **PatchBar** (brand + path chip · routes-as-operators w/ port dots · TAB hint + PATCH/READ toggle + cook status). TAB opens op-search in patch mode only; ⌘K anywhere.
- Controls grammar: sliders = `.prange` (white flat rect thumb, signal fill via `--p`); **clickable chips = `.chipbtn`** (signal border/text), static chips stay gray — keep this affordance rule.

## Type and colour

- Type: **Proxima Nova via Adobe Fonts kit** (`use.typekit.net/pxz7fsi.css` in Base.astro; family `'proxima-nova'`, weights 400/500/700/900; replaced unlicensed Gotham 2026-07-06 — never reintroduce self-hosted Gotham, and purge it from git history before wide repo scrutiny) + Inter (fallback) + **IBM Plex Mono** (`--font-mono`, 2026-07 trial winner; Courier Prime + Fira Code pruned; JetBrains Mono @400 stays for Futurescaper viewer interiors). Signal accent `--signal: #3dff88` — cables, live states, links; not a costume.
- Viewer interiors (demos) use each **product's real visual language**, scoped inside the VIEW operator: Futurescaper = ink-on-paper `--paper`/`--ink`, amber `--amber`, Wong STEEPLE palette (`--steep-*`). Tokens already in `src/styles/tokens.css`.

## Shared previews (work index)

- **Shared previews (2026-07-06)**: `src/lib/previs.js` (`window.Previs`, inlined via `PrevisEngine.astro` — same strip pipeline + no-`//`-in-string/regex-literals constraint as patch-runtime.js) owns all work_index viewer scenes: ALL 9 projects have a `V`-registry entry — 5 featured live previews + grid-lamp live mini + 3 recreated minis (equipment board, orb, sensor-zone room; vfoot label starts "RECREATION"). **2026-07-06 restructure:** biomimetic-eye/home-lighting/synthetic-plant were never built → removed from projects, live in /lab instead (eye = CAD study; presence + plant = plan + interactive sims, `public/js/presence-lab.js` + `plant-lab.js`, GridLab init pattern). GRID promoted from lab → `/projects/grid-lamp` (bespoke page hosts the full sim + `public/js/grid-lab.js`); the LIVE badge on /projects reads `p.live ?? p.featured`, so grid-lamp is LIVE without joining the 5 featured on the homepage. Homepage index = 5 featured + see-more row → /projects; /projects = the full-index network (`work_txt → work_index ─selection→ projects_view`; compact single-line rows, LIVE/RECR badges, no category filter — Carlton cut it 2026-07-05), READ mode reuses the homepage sticky-viewer rack. Navbar `/work` → `/projects` (prefix-aware active state); home is reachable via the brand mark. New previews go in previs.js's `V` registry, not in page scripts. **grid-lamp preview = real 3D (2026-07-06, Carlton's call):** the `V` entry is `gl: true`, which makes the engine overlay a WebGL canvas running the case study's actual studio scene — `public/js/previs-gl.js` (a controls-free port of grid-lab.js: Wave motion at speed 0.35, auto-orbit 0.07 rad/s, motors, bloom/DoF) lazy-loads three r128 + postprocessing from CDN only when a work index first selects grid_lamp, so pages that never select it ship nothing. The svg mini remains the reduced-motion / load-failure / load-gap fallback; the dither dissolve renders above the canvas so scene transitions still work; INVERT = css `invert(1) hue-rotate(180deg)` on the canvas. This is a sanctioned exception to "homepage ships ~zero framework JS" (selection-gated, not initial load).

## Page change, boot and resize (2026-10-04)

The prototypes are in `docs/prototypes/awwwards-transitions-1` to `-3`. What shipped:

- **The background never restarts.** The dither canvas has `transition:persist` and carries its field with it (`canvas.__pf`). `size()` returns early when the viewport is unchanged, so a change in page height does nothing to it. A resize copies the old field across by position and redraws in the same task.
- **A page change is a view transition with three parts on one clock.** The new page is revealed through a mask, the old page dims to 35%, and a front crosses the dither. The CSS animations (`pf-ring`, `pf-wipe`, `pf-dim` in `global.css`) stay paused. A loop in `src/lib/page-clock.js` moves them by hand and PatchField reads the same progress (`window.__pfNav.f`). A late frame only advances the clock by two frames' worth, so a busy browser plays the start slowly and does not skip it.
- **The duration is 580ms and lives in three places:** `MS` in `src/lib/page-clock.js`, `FRONT_MS` in `patch-field.js`, and the `pf-*` durations in `global.css`. Change all three together. A unit test fails if they differ.
- **A click starts the front at the click.** `page-clock.js` remembers the last click. A navigation within a second of it opens as a ring from that point (`data-pf="ring"` and `--pf-cx/--pf-cy/--pf-max` on `<html>`). Keyboard, back and forward have no click and get a band from the top (from the bottom on back).
- **The front is a fixed brightness shaped by the background.** `FRONT_L` is the peak level and `FRONT_TEX` is how much it follows the noise underneath. It is divided by the visitor's density setting, so it looks the same whatever they set.
- **Handoff.** Operators on screen ease into place as the front reaches them. Operators below the fold are left alone.
- **Cables wire in** after the front, in link order, 260ms each. The gap shrinks on pages with many cables so the whole thing stays under about 860ms.
- **The nav reports it.** The path chip retypes. The status chip reads COOKING until PatchField's `patch:cooking` event says the cables are in.
- **The boot** is the same machinery on the first page of a session (`sessionStorage` key `pf-boot`): a front from the brand mark, the cables wire in, the chip counts `COOK 0%` up. It never hides or fades an operator. An element that starts invisible does not count as painted, so fading operators in would delay LCP.
- **Resize** waits 80ms, then operators glide from the old place to the new one (a transform, 260ms). Width snaps.
- **Reduced motion:** Astro switches the transition animations off, so pages swap. No front, no handoff, no boot. Cables draw whole.

Traps found on the way:

- Firefox does not interpolate a registered custom property whose keyframe value is a `var()` (bug 1899531). It jumps at the halfway point. Keyframes hold plain numbers and the mask works the radius out with `calc()`.
- A view transition's page image is always opaque, so the dither cannot sit still behind a sliding page. That is why the pan was dropped.
- The browser swallows clicks while a view transition runs. A second click during a page change is ignored.
- Saved background settings change how the ring looks. Test in a private window before judging it.

Tests: `npm test` runs three things in order and stops at the first failure.

1. `tests/unit/` in Node, with no browser and no build (`npm run test:unit`, under a second). `patch-runtime.test.mjs` covers routing, filters, the hop cap and teardown. `page-clock.test.mjs` covers the clock, the click rule and the ring. `client-settled.test.mjs` covers when a demo hydrates. `warm.test.mjs` covers early fetching. `source.test.mjs` checks numbers and lists that have to agree across files: the 580ms, the home order, the layout tiers.
2. The build, then `tests/built/`, which checks `dist/`: the shared scripts parse, carry no dev code, and every page asks for the version that was built.
3. `tests/transitions.mjs`, which serves `dist/` and drives a real browser. `BROWSERS=chromium,firefox,webkit npm test` for all three.

The clock is a module so that it can be tested. `bundles.js` wraps it as a plain script and `Base.astro` inlines it in the head.

`node tests/measure.mjs` is a separate tool. It times how long a page change takes to start for each kind of link, on a server that behaves like GitHub Pages. `BROWSER=firefox` picks the engine.

## Fonts (2026-10-04)

Every font is self-hosted: files in `public/fonts/` with their licence files, faces in `src/styles/fonts.css`. Red Hat Display replaced Proxima Nova as the display and sans face, and the Adobe Fonts kit is gone. The kit was a render-blocking stylesheet and hid the headline until its font arrived. Red Hat Display is one variable file (31KB, weights 300 to 900). Sometype Mono replaced IBM Plex Mono as the mono face (one 17KB variable file, weights 400 to 700; the few uses of 300 fall back to 400). IBM Plex Mono and JetBrains Mono stay in `public/fonts/` for the DomainClaim and Futurescaper interiors. The "Type and colour" note above describes the old setup. The DomainClaim demo is its own document and still loads its fonts from Google.

## Page-change speed (2026-10-05)

On the live site a click did nothing for up to a second or two, worst on phones. The animation was waiting for the next page to download, parse and start up. Four changes fixed it. Keep all four.

- **Shared scripts are cached files.** The runtime, the network script and the previews used to be inlined in every page (78% of the home page's HTML). They are now `/js/patch.js` and `/js/previs.js`, built by `src/lib/bundles.js`, minified with esbuild and served by the endpoints in `src/pages/js/`. The script tags carry `data-astro-rerun`, so they run again on every page from the browser's cache. Home went from 55KB to 16KB compressed. The notes above that say these files are inlined and stripped describe the old setup.
- **Pages are fetched early, with their stylesheets.** `src/lib/warm.js` does it (Astro's own prefetch is off). Resting on a link for 80ms fetches the page, then the stylesheets that page links to. A press or a touch fetches at once. The four nav routes are marked `data-warm` and are fetched when the page is idle. A page change cannot start until the page and its stylesheets are in hand, so both have to be in the cache before the click.
- **A fetched page is refreshed after 5 minutes.** GitHub Pages lets the browser keep a page for 10 minutes. A hover on a link fetched more than 5 minutes ago fetches it again, so a tab left open does not pay at the click.
- **Internal links end in a slash.** Every page is a folder, and GitHub Pages answers `/about` with a redirect to `/about/`. That redirect is a round trip before the page change can start. `trailingSlash: 'always'` makes the dev server answer 404 to a link without the slash. Three checks keep it that way: `tests/unit/source.test.mjs` reads the links written in source, `tests/built/dist.test.mjs` reads every link in the built pages, and the browser tests fail if any request in the run was redirected.
- **The click answers at once.** While the next page is on its way, `patch-field.js` holds the heat at the click point (`__pfNav.nav && !__pfNav.started`), on the page being left and on the new one until the clock starts.
- **The clock starts when the network is up.** `patch-field.js` fires `pf:ready` when it has finished setting up, and `page-clock.js` starts the clock on that. It no longer waits for the page's other scripts or `astro:page-load`. Pages with no network still start on `astro:page-load`. The clock fires `pf:done` at the end.
- **Demos hydrate after the change.** `client:settled` (`src/lib/client-settled.js`, registered in `astro.config.mjs`) waits for `pf:done` when the page was reached by a link, and hydrates at once on a direct load. With `{ rootMargin }` it also waits until the demo is near the screen.

Measured in Chromium with the processor slowed four times and no network delay, click to first frame of the ring: Futurescaper on a phone 562ms before, 294ms after. With 300ms of network latency, a tap on a nav route: 380ms before, 79ms after. First-load LCP did not change.

Tried and not done: placing blank operators before their content arrives. Setting up the network, layout included, is not what is slow (9ms on a slowed phone, 38ms on a slowed desktop), and sizes depend on content, so there was nothing to gain.

## Hover: verb chip (2026-10-05)

The system crosshair stays. In PATCH mode, for mouse and pen only, a chip sits beside it. It lives in `PatchField.astro` and does not touch the patch bus. A hover trace along the cables was tried and dropped: it lit things that did not need it.

A small chip beside the pointer (`.pfverb`), only where a click or drag does something: DRAG, OPEN, OPEN ↗, WRITE, CYCLE, TOGGLE, SCRUB, and PRESS for any other button. Disabled controls get none. Ports get no chip, since they do nothing. It types itself out when it changes. The verb comes from the element, so most things need no markup. Add `data-verb="..."` to set one by hand, or `data-noverb` to keep the chip away. Demo islands and iframes never get a chip. 

No `title` attributes on site controls: the native tooltip fights the chip. Give a control visible text or an `aria-label`.

Prototype: `docs/prototypes/awwwards-cursor.html`.
