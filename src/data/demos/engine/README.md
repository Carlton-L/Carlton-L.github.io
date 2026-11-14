# Made-up Engine run: Small Modular Reactors

The data for the Engine workflow demo (a RECREATION; the Engine is recreation-only). Every name, number, prompt and output here is invented. Nothing comes from a Futurity client or a real run.

## Files

| File | What it is |
|---|---|
| `smr-run.source.mjs` | The one file to edit: the run, the lab, facts, workstreams, blocks, 70 steps with their wiring, prompts, rejections and outputs, the write order, the report outline and the two steering cases. |
| `smr-run.js` | Generated. ES module exporting the Engine Blocks prototype's structures (`CATP KIND ENGINE_RULES P D G LEVELS BLOCKS CHAPTERS REPORT_OUTLINE PARENT ORDER_CHAIN LINKS_ALL PARAMS PRODUCTS XW KBR TL`), plus `RUN` (names and counts the views quote), `STORY` (the failure and the default run setting), `STEER` (the steering cases), `FACTS` (each fact token's value and label, shown in the report) and `_meta`. |

`before.json` is the layout for the case study's before/after slider (the old all-at-once screen and the redesign's top level), generated from `smr-run.js` by `scripts/engine-run/build-before.mjs`. Rebuild it after changing the run.

The generator is `scripts/engine-run/build-engine-run.mjs`, with the prototype's port catalog, type names and engine rules in `engine-constants.mjs` beside it. It works out the schedule, prompt parts, levels with node positions, cross-workstream wires, products and filings, and checks every edge has its node and ports.

Rebuild after editing the source:

    node scripts/engine-run/build-engine-run.mjs

The look and behavior the demo reproduces: `docs/prototypes/engine-blocks-smr.html`.

## The run

- Lab "Small Modular Reactors" (smr), six leaves. Run "SMR data-centre outlook", Insight with Deep Search, the run's model, finished 12 Nov 2026.
- 70 steps (68 ran), 4 file nodes, 21 writers chained in write order. 38 minutes; writing takes 29 of them, single file.
- Made-up companies: Orrin Reactor Works, Brannock Nuclear, Tessaly Power, Velde Compute. Searched 14 Nov 2026: no company by any of these names.
- These numbers belong to the demo. The page cites the real Engine only as "about 160 steps".

## The four moments

1. **Failure.** Step 182 (Deep research: the question) crashes 3 minutes in, reading a PDF. `STORY.q.failDur` is 180 s; the person presses Retry at 200 s (`STORY.policy.action`); it files at 9 minutes. Eleven steps search the question research; five pause while it is retried, the rest are already waiting on its findings through a wire.
2. **Rejected answers.** 18 Key Patent Observations, 23 Engineering red team, 26 Engineering recommendations, 172 Business figures from sources. In each step's `attempts`.
3. **Declined section.** 19 Patent Analysis Dimensions, `declined: true` with its reason.
4. **Skipped branch.** 110 Has emerging candidates? finds none; 61 and 62 are skipped. A skipped writer keeps its place in the write order.

## Steering (`STEER`)

- Rerun "Emerging papers" with the gate threshold lowered from 0.62 to 0.45.
- Rewrite "Patent Analysis Dimensions" with one added instruction.

Each case lists the steps that depend on it (they rerun with it). The rerun's result carries prompt parts for the analyst and section the first pass skipped, since the rerun sends those prompts.
