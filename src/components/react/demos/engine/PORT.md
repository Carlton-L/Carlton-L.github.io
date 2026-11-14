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
| `FrameEntry.jsx` | Root of the demo document. Runs the demo in outside mode, takes commands from the case study and reports the replay back by postMessage, stops playback off screen. |
| `EngineWorkflowView.jsx` | The case study's island: DemoFrame (RECREATION), the portfolio's replay player, then ProductFrame, 1100 × 780, phone below 720 at 960 tall. |
| `player.css` | The replay player, in the site's own controls (`.chipbtn`, `input.prange`). |
| `EngineHeroTour.jsx`, `hero.css` | The case study's hero: the same demo document playing a scripted tour (prototype `docs/prototypes/engine-hero-tour.html`). |
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

## Replay outside the Engine UI (14 Nov 2026)

The play bar replays a recorded run, which the Engine never does, so it moved out of the Engine's frame into the portfolio (prototype: `docs/prototypes/engine-replay-controls.html`).

- **Outside mode** (`transport="outside"`, FrameEntry's default; `?bar=1` brings back the prototype's own bars): no play bar, no Engine header, no Run settings, no instrument box around the sheet, no toolbar (the workstreams view only). The status line speaks as the Engine ("Not started", "Finished · The report is published.").
- **The player** sits above the frame: play / pause / replay, a scrubber with the crash, retry and filing marked, End. During the hold it shows "Recorded run: Retry at 3 min 20 s · plays in N s"; otherwise no clock or step count.
- **Messages**: `{ eng: 'cmd', op: 'toggle' | 'play' | 'pause' | 'end' | 'retry' }`, `{ eng: 'cmd', op: 'seek', t }` in; `{ eng: 'run', run }` out (`runSnapshot`: time, end, playing, hold, progress, marks, the recorded retry).
- **The crash** moves the board to Groundwork with the question research block and its filing in view. There is no Undo choice: going back before 3:01 forgets the choice, and playing through the crash asks again.
- **Tab badges**: Report counts sections written since you last looked (green) and ones written without the research or declined (amber); Knowledgebase counts pages filed, red while a filing has failed; a pulse when a badge changes, and a one-time hint under the tab. "Show N flagged sections" appears once one exists and opens the report at the first.
- **The run**: the three FAST data pulls that feed the first charts take about 4 minutes, so nothing reaches the report before the crash; the crash, retry, filing and the 38-minute total are unchanged.

## The hero tour (14 Nov 2026)

`EngineHeroTour.jsx` loads `/demos/engine/` in its own frame and drives it through the same messages as the player, plus `show` (put the board somewhere without clicks). It reads the frame's document (same origin) to aim the camera and the pointer, and clicks only the Engine's own controls.

- Seven captions, each tagged with its corner, over the UI; a new one fades and slides in from the bottom. One pass through the app: Groundwork (steps running; the crash and Retry), the report (it fills; the $4.1B and its source), Science › Emerging papers (one layer at a time; rerun the block; the analyst's prompt, part by part).
- The camera is the frame's transform: still for the opening (the board eases onto the question research; the crash frames the same nodes the same way, `FOCUS_FIT`) and the crash, then one smooth move per shot. Fades out in place and loops, loading the demo fresh each time.
- Ignores clicks; "Try it yourself ↓" scrolls to the interactive demo. Stops off screen and starts again on return. Reduced motion: one still frame of the finished run, no tour.
- Below 720px the frame draws at the container's width (the demo's phone layout) and the camera pans at full size, framing the part in use (the rerun panel, the banner, the prompt parts).

## Known, carried over from the prototype

- `stepState` and `openTarget` still name ids the made-up run does not use (`notRun` at 206 s, `21`, `58`, `T20x`). Harmless here.

## Checking it

`.agent-work/compare.mjs` (local) screenshots the prototype page and `/demos/engine/?bar=1&theme=auto` through the same clicks, and `.agent-work/diff.mjs` compares the pixels. On 14 Nov 2026: 59 of 60 states identical (1440 light and dark, 960, 390); the one left differs by 3 pixels, the playhead mid-transition.
