# Engine workflow demo: port notes

A RECREATION. The Engine is recreation-only, so this is not the product's code: it is Carlton's Engine Blocks prototype, ported, running on a made-up run (`src/data/demos/engine/`). The target is `docs/prototypes/engine-blocks-smr.html`; the port should look and behave the same.

## Files

| File | What it is |
|---|---|
| `EngineBlocks.jsx` | The prototype's views (board, nodes, inspector, timeline, run settings, banner, Report and Knowledgebase tabs), converted from htm templates to JSX. Default export `App`. |
| `sim.js` | The replay: `simulate(policy)`, the made-up run's own version (recorded retry, go on without it, the wait limit, go on and flag). |
| `engine.css` | The prototype's own stylesheet, unchanged, after React Flow's (`@import` first, so the prototype's rules win, as they did there). |
| `engine-changes.css` | Styles for the changes agreed after the port (below). |
| `embed.css` | Seams for the embed only (below). |
| `FrameEntry.jsx` | Root of the demo document. Reads the query, posts `{ eng: 'ready' }` to the case study, stops playback off screen. |
| `EngineWorkflowView.jsx` | The case study's island: DemoFrame (RECREATION) around ProductFrame, 1100 × 780, phone below 720 at 960 tall. |
| `../../../../pages/demos/engine.astro` | The demo document, `/demos/engine/` (noindex, out of the sitemap). |

## How it was ported

The htm templates were converted to JSX mechanically (a converter that reads each `html\`…\`` and writes the same tree as JSX: `class` to `className`, `<${X}>…<//>` to `<X>…</X>`, quoted attributes with `${}` to template literals), then the UMD globals became imports. Nothing in the views was rewritten by hand except `App`'s props.

## Seams

- **Top bar.** The prototype's own bar ("Prototype … Theme auto light dark") shows only with `?bar=1`, for comparing against the prototype page.
- **Theme.** The prototype follows the system. The embed defaults to dark to sit in the site; `?theme=light|dark|auto` overrides.
- **Height.** The prototype sizes its board from the window (`100vh` less a guess at the header), so in a fixed frame it ran past the bottom, and further when the failure banner showed. Without the bar, `body.embed` makes the instrument fill the frame and the board take what is left (`embed.css`). Below 1000px the prototype's stacked layout scrolls inside the frame.
- **Off screen.** `App` takes `offScreen`; FrameEntry sets it from an IntersectionObserver (no root, so it watches the top page's viewport), and playback stops.
- **Stylesheet order.** React Flow's CSS imported from JS landed in a shared chunk after `engine.css` and won; it is `@import`ed at the top of `engine.css` instead.

## Changes agreed after the port (14 Nov 2026)

Decided in `docs/prototypes/engine-steering-states.html` and `engine-board-nav.html` (both accepted). The views were ported as they were; these are deliberate departures from the prototype page, so the pixel comparison no longer applies to the toolbar, the board's top or the banner.

- **Toolbar.** This run (always on), Write order (off), and the States and Files look switches (badges, file glyphs) are gone. The breadcrumb is gone too.
- **Board.** The current level's title sits top left at 20 px under a mono label ("BLOCK · 3 STEPS"); an up-arrow button to the level above sits top centre (`BoardNav`). The board fits with room for them (`FIT_PAD`). With nothing selected, the board has the selected outline; selecting a node moves it to the node.
- **Banner slot.** One strip of fixed height (88 px, 176 px below 1000 px) under the timeline, always there, so nothing below moves. It holds a status line (ready, running, writing n of 21, finished) or a banner, and cross-fades between them in 250 ms (none under reduced motion).
- **The crash.** Playing into the crash at 3 min 01 s stops playback and holds: red banner with Retry research and Go on without it, and "Retrying in 10 s, as in the recorded run". The countdown runs only while the demo is on screen; at 0, or if Play is pressed, it plays the recorded Retry from that moment. A choice resumes playback after 0.6 s. Scrubbing never holds and drops a hold. A recorded or chosen action counts only once the replay reaches its time (`actNow`), which fixed the wrong "went on without it" banner. Undo goes back to the recorded run. Play from the end starts the recorded run again.
- **Success.** When the research files, a green banner ("5 waiting steps resumed") for 3 s of playback, then the status line.
- **Fact values.** In the report a fact token shows the value Assemble put in, with the token on hover and focus (`FACTS`, exported by the generator). A step's own output keeps the raw token. A token that names no fact stays raw.
- **Start.** The demo opens at 0:00 ("Ready to replay"), not on the finished run. End shows the finished run.
- **Steering**, only once the run has finished. In Emerging papers' panel (block or its gate step): change the threshold, see the 12 steps that will rerun (its 3 and the 9 that use its result, outlined on the board), rerun; they show as running for 2.5 s, then done with their new results. The Engine reruns dependents on its own, so nothing is left stale. In the report, "Patent Analysis Dimensions" takes an added instruction and is rewritten. Both can be undone.

## Known, carried over from the prototype

- `stepState` and `openTarget` still name ids the made-up run does not use (`notRun` at 206 s, `21`, `58`, `T20x`). Harmless here.

## Checking it

`.agent-work/compare.mjs` (local) screenshots the prototype page and `/demos/engine/?bar=1&theme=auto` through the same clicks, and `.agent-work/diff.mjs` compares the pixels. On 14 Nov 2026: 59 of 60 states identical (1440 light and dark, 960, 390); the one left differs by 3 pixels, the playhead mid-transition.
