# AI layer: ask any node

Status: idea, not scheduled (2026-09-26). Working notes, not published copy.

## The idea

carlton.dev is built with AI but has none in it. The AI-Native Interfaces category should be backed by
the site itself.

Every page is a patch of operators. A visitor can ask a question on any node ("why this layout?",
"what broke here?", "what did you do on this?") and get more context than the page shows. Each page
has a deeper layer behind it: facts, decisions and detail that don't fit on the page. An assistant that
lives in the page answers from that layer, and answers in the patch's own grammar:

1. **Steer.** Scroll to the node that already holds the answer and highlight it, with a pulse along the
   cables on the way.
2. **Spawn.** Pop a new node in near the one asked about, wired to it by a cable, holding the answer
   and where it came from.
3. **Annotate.** Add the answer into the node that was asked about.

## What already exists

- `chatbot/`: the RAG "digital twin" from April 2026. Architecture decision and reviews in
  `chatbot/docs/`, a knowledge base in `chatbot/knowledge-base/` (first person, one file per topic and
  per project), an embedding script, a Supabase pgvector schema, an edge function, and two versions of
  a chat widget. `chatbot/docs/self-hosting-and-enhancement-plan.md` plans a v2 on a Raspberry Pi 5
  (Ollama, sqlite-vec, Fastify, Cloudflare Tunnel).
- `PROJECT_PLAN.md` Phase 5: the same chatbot as a widget island.
- `mail/`: Vercel functions already live at `api.carlton.dev`, with CORS, origin checks and the
  patterns a question endpoint needs.
- The patch runtime (`src/lib/patch-runtime.js`): cables are real subscriptions, and a delivery pulses
  its wire. Steering can use it as is.

The knowledge base predates the July restructure. Its project list still has biomimetic-eye,
home-lighting and synthetic-plant, and it has none of Futurescaper, the Engine, GRID, Campus AI or
DomainClaim. Every line has to be checked against `src/data/content.js` and the CV before anything
answers from it, and nothing can claim work that isn't Carlton's (see the corrections in the project
memory).

The difference from the April plan: that was a chat box beside the site. This is the site answering
through its own nodes.

## How each answer shape fits the patch

| Shape | Layout cost | Use |
|---|---|---|
| Steer | None: scroll and highlight only | First choice, whenever a node on the page already holds the answer |
| Spawn | None if the new node floats outside the layout resolver's flow (absolutely placed, excluded from the field height) | Answers the page doesn't hold |
| Annotate | Changes the node's height, so the field re-resolves and the dither background resets | Avoid, unless a node reserves the space up front |

The rule from the DomainClaim work applies: a card never changes height. A spawned node is placed
beside its source in PATCH mode. In READ mode and on phones there is no free canvas, so the answer
opens in a sheet over the page, with a link back to the node it came from.

## The deeper layer

- One file per page, for example `src/data/deep/<slug>.md`, with sections keyed by operator id
  (`dcFx`, `fsLayout`). Each section: the facts behind that node, the decision and what lost, and a
  source for each fact.
- Written from the notes folders (for DomainClaim, `domainclaim-case-study/01` to `04`), and checked
  against the same ground truth as the page.
- Public by construction: whatever is in the layer can be quoted to anyone. It follows the page's own
  rules: never name Futurity clients, and for DomainClaim everything on the "Off the page" list in
  `04_GROUND_TRUTH.md` stays out.
- Built into chunks with metadata `{ page, opId }`, so retrieval can prefer the node that was asked
  about and its neighbours on the cables.

## Answer contract

The model gets the question, the page, the node it was asked on, the retrieved chunks, and the list of
nodes on the page (id, name, one-line summary). It answers with tool calls, never free text alone:

- `goto(opId)`: steer to a node on this page, or `goto(page, opId)` for another page.
- `note(nearOpId, markdown, sources[])`: spawn a node.
- `say(markdown, sources[])`: a short answer in the sheet.
- `unknown(reason)`: the layer doesn't hold it. Say so, and point to the contact node.

Every fact in an answer names its source chunk, which the node shows. Nothing outside the retrieved
layer. Decide once whether it speaks as Carlton (first person, like the April plan) or about him.

## Backend options

| Option | For | Against |
|---|---|---|
| A function beside `mail/` on Vercel, hosted model API | Already deployed; streaming; no hardware | Per-token cost; rate limits needed from day one |
| The Pi 5 plan (Ollama) | No API cost; the self-hosting story | Small model quality; uptime is a home connection |

Either way: rate limits per IP and globally, no storage of questions by default, and a kill switch that
hides the ask affordance when the endpoint is down.

## Open questions

- Where does "ask" live on a node: a port, a chip in the header, or the TAB op search?
- First person or third?
- Does a spawned node survive navigation, or disappear when the page changes?
- Which page goes first? DomainClaim has the most complete notes to build a layer from.
- Hosted model or the Pi?

## Rough phases

1. Write the deeper layer for one page. Useful on its own as a reading aid.
2. Steer only: questions answered by moving to existing nodes. No new UI beyond the ask affordance.
3. Spawned nodes in PATCH mode, the sheet in READ mode.
4. Cross-page steering, then the rest of the pages.
