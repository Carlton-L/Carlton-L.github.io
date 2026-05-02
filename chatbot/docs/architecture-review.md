# Architecture Review: Digital Twin Chatbot

**Date:** April 2026  
**Verdict:** The code has confirmed bugs that crash at runtime. The architecture over-indexes on infrastructure and under-indexes on the thing that actually determines quality: content. Several "impressive" features are solutions looking for problems. The strategic framing needs to be challenged.

---

## Confirmed Bugs (Code Will Not Run)

These aren't theoretical concerns. I wrote test scripts and ran them.

### Bug 1: sqlite-vec insert crashes on every call

The `db.js` `insertChunk` method does this:

```js
db.prepare("INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (?, ?)").run(chunkId, embedding);
```

**This throws `SqliteError: Only integers are allowed for primary key values` every time.** sqlite-vec's vec0 virtual tables cannot resolve which positional `?` parameter is the integer primary key when a Float32Array is also present. Tested with better-sqlite3 + sqlite-vec v0.1.9. Named parameters (`:id`, `$id`) also fail.

The only working pattern is interpolating the integer ID directly into the SQL string:

```js
db.prepare(`INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (${Number(chunkId)}, ?)`).run(embedding);
```

This affects every insert in `db.js` — `insertChunk`, `cacheResponse`, and the embed-local pipeline. **The entire embedding pipeline and cache system will crash on first use.**

### Bug 2: Wrong distance metric, wrong similarity formula, wrong thresholds

sqlite-vec defaults to **L2 (Euclidean) distance**, not cosine distance. My code assumes cosine and uses the formula `similarity = 1 - distance / 2`. Tested with known vectors:

| Vector pair | L2 distance (actual) | My formula output | Correct cosine similarity |
|-------------|---------------------|-------------------|--------------------------|
| Same | 0.0 | 1.0 | 1.0 |
| Similar | 0.14 | 0.93 | 0.99 |
| Orthogonal | 1.41 | 0.29 | 0.0 |
| Opposite | 2.0 | 0.0 | -1.0 |

The formula is wrong. The thresholds (0.72 for retrieval, 0.95 for cache) are calibrated to a metric that isn't being used. This means retrieval will either return irrelevant results or miss relevant ones — the core function of the entire RAG pipeline is miscalibrated.

**Fix:** Declare the table with `distance_metric=cosine`:

```sql
CREATE VIRTUAL TABLE chunk_embeddings USING vec0(
  chunk_id INTEGER PRIMARY KEY, 
  embedding FLOAT[768] distance_metric=cosine
);
```

Then similarity = `1 - distance` (not `1 - distance/2`). Verified this works correctly in testing.

### Bug 3: Rate limiter blocks ALL visitors after 10 requests from ANY visitor

Behind Cloudflare Tunnel, `req.ip` resolves to `127.0.0.1` or a Cloudflare edge IP — not the visitor's real IP. The rate limiter uses `keyGenerator: (req) => req.ip`, which means all visitors share a single rate limit bucket. Ten requests from one person blocks everyone for a minute.

**Fix:** Use the Cloudflare header and enable Fastify's proxy trust:

```js
const app = Fastify({ trustProxy: true });
// ...
keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip
```

---

## Strategic Problems

### The effort ratio is inverted

The plan contains ~1,200 lines of infrastructure code (server, database, caching, streaming, edge function, two widget versions, embedding pipeline) and ~1,500 words of actual knowledge base content. That's the wrong ratio for a system whose output quality is 90% determined by input content quality.

I ran the chunking pipeline against the knowledge base. Results:

- **76 total chunks** across 14 files
- **8 chunks under 100 characters** — too short for meaningful embeddings (includes "My Role: Robotics & Exploration" at 31 characters)
- **2 stub chunks** that are mostly TODO comments — the chatbot will retrieve these and generate answers from nothing
- **Every project file** fragments into 4-5 tiny chunks (What It Is, My Role, Technologies Used, Why It Matters, Category) instead of one coherent chunk per project

The project file template is the worst offender. When a visitor asks "Tell me about the Futures Garden project," the retrieval system has to find and stitch together 5 separate tiny chunks instead of getting one rich, contextual passage. Each chunk in isolation lacks the context that makes a good answer. "My Role: Experience Design & Prototyping" tells the LLM almost nothing. A 3B model will not synthesize these fragments well.

**The fix isn't better chunking code — it's better content.** Each project should be a single 400-600 character narrative paragraph, not a structured template that gets shredded by the chunker. Write how you'd explain the project to someone at a conference, not how you'd fill in a form.

### The "Powered by Raspberry Pi" narrative might backfire

The plan frames Pi hosting as a portfolio flex. But consider this from a hiring manager's perspective: they open the chatbot, ask a question, and wait 15 seconds for a mediocre answer from a 3B model. The footer says "Running on a Raspberry Pi 5." Their takeaway isn't "impressive infrastructure" — it's "chose a cool constraint over a good user experience."

The Pi hosting is only impressive if the chatbot works well despite the constraint. If the quality isn't there, the Pi is an excuse, not a feature. A recruiter doesn't care what hardware runs it. They care whether it makes them want to hire you.

**This is the hard question the plan avoids:** Is a 3B model on a Pi 5 actually good enough to represent you professionally? Nobody has tested this. The accuracy test plan exists on paper but hasn't been run against any model. Before writing another line of infrastructure code, you need to run Phi-3-mini against 20 test questions and honestly evaluate whether the answers are good enough. If they're not, the "self-hosted" story needs to include a cloud generation fallback (Claude Haiku at $1-2/month) — and that's fine. "Self-hosted retrieval pipeline with cloud generation" is still a strong portfolio piece. "Fully self-hosted but gives bad answers" is not.

### The semantic cache has a stale data problem

When Carlton updates his knowledge base (changes jobs, adds a project, updates availability), cached responses become wrong. Someone asks "Are you available for hire?" and gets a cached answer from three months ago saying "I'm happy at Futurity Systems." There's no cache invalidation tied to knowledge base changes. The `embed-local.js` script calls `db.clearCache()` but only if you remember to run it — and the plan doesn't automate this or make the coupling explicit.

### The enhancement roadmap is a feature wishlist, not a strategy

The plan lists voice interaction, multi-modal retrieval, LoRA fine-tuning, A/B model comparison, and a live infrastructure dashboard as potential enhancements. These are cool ideas with no analysis of feasibility, effort, or actual impact on the thing that matters (whether the chatbot helps Carlton get hired).

Voice interaction on a Pi 5? Piper TTS runs, but it adds another 1-2 seconds of latency on top of 15-second generation. The total round-trip for a voice response would be ~20 seconds. That's not a feature, it's a frustration.

LoRA fine-tuning? Requires a GPU you don't have, training data you haven't collected, and produces marginal improvements on a 3B model. The time would be better spent writing better knowledge base content.

A/B model comparison mode? This says "I'm still experimenting" — not the signal you want on a portfolio piece. Ship one model that works well.

The one enhancement that's actually high-impact and under-discussed: **a fallback FAQ mode.** Pre-generate answers to the 15 most common questions and bundle them as static JSON in the frontend. When the Pi is offline, the widget becomes a keyword-matching FAQ. This eliminates the single worst user experience (chatbot completely dead during a recruiter visit) with minimal effort.

---

## Code Quality Issues That Matter

### The embedding dimension is inconsistent across implementations

The Supabase schema declares `vector(1536)` (OpenAI dimensions). The self-hosted sqlite-vec schema declares `FLOAT[768]` (nomic-embed-text dimensions). These are fundamentally incompatible. If Carlton starts with the cloud version and migrates to self-hosted (or vice versa), he has to re-embed everything. This isn't documented anywhere, and the "fallback to cloud" narrative assumes they're interchangeable. They're not.

### Two widget implementations with no shared code

`ChatWidget.jsx` (cloud version) and `ChatWidget.v2.jsx` (self-hosted version) are 300+ lines each with ~70% overlap. The SSE parsing, styling, state management, and most of the UI are duplicated. When you fix a bug in one, you'll forget to fix it in the other. This should be one component with a configurable API adapter.

### The project knowledge base template produces bad chunks

As shown in the chunk analysis, the template structure (What It Is / My Role / Technologies Used / Why It Matters / Category) creates 4-5 fragments per project, most too short for good embeddings. The "Category" sections ("Category\n\nExperiences") are 141-216 characters of near-zero information that will pollute retrieval results.

The chunking code also strips HTML comments (TODO markers) but doesn't strip the heading that precedes an otherwise-empty section. So a project with "## My Role\n\n<!-- TODO: fill in -->" produces a chunk with heading "My Role" and empty content. The `text.length > 30` filter catches some of these but not all.

### No input length enforcement on the server

The widget enforces 500-character max on the client side, but the server only does `query.trim().slice(0, 500)` after the full message has already been received and parsed. A malicious client can send a 100KB message body. The server should enforce `Content-Length` limits at the Fastify level:

```js
const app = Fastify({ bodyLimit: 2048 });
```

---

## What's Actually Good

For balance — these parts of the plan are sound:

1. **Cloudflare Tunnel** is the right choice for exposing a home server. No port forwarding, free HTTPS, built-in DDoS protection.

2. **sqlite-vec** is the right database for this scale. Zero infrastructure, single file, works on Pi. The choice is correct even though the implementation has bugs.

3. **Ollama** is the right abstraction over llama.cpp. Clean API, handles model management, serves both chat and embeddings.

4. **The knowledge base as markdown files in the repo** is the right content strategy. Version-controlled, easy to edit, easy to validate.

5. **The system prompt** is well-crafted — first person voice, explicit "I don't know" instructions, tone guidance, and the self-referential "how was this built" answer.

6. **The accuracy testing plan** with specific test questions and a scoring rubric is genuinely useful and should be run before launch.

---

## Revised Priority Order

| # | Action | Why it matters |
|---|--------|---------------|
| 1 | **Fix the three confirmed bugs** (insert crash, distance metric, rate limiter) | Code literally doesn't run |
| 2 | **Rewrite knowledge base content as narratives, not templates** | Determines answer quality more than any code change |
| 3 | **Test Phi-3 3.8B against the accuracy suite** and make a go/no-go decision on local-only vs. cloud-fallback generation | Determines whether the "self-hosted" story works |
| 4 | **Merge the two widgets into one** with configurable API adapter | Reduce maintenance burden before you start iterating |
| 5 | **Add static FAQ fallback** for when the Pi is offline | Eliminates the worst-case user experience |
| 6 | **Fix the chunking to produce one coherent chunk per project** instead of 5 fragments | Direct retrieval quality improvement |
| 7 | **Add cosine distance metric** to sqlite-vec table definition | Fixes retrieval accuracy |
| 8 | **Add Fastify bodyLimit and trustProxy** | Basic security |
| 9 | Everything else | Infrastructure polish after the fundamentals work |

The first three items should happen before any infrastructure enhancement. No amount of caching, monitoring, or voice interaction helps if the content is thin, the model is too weak, and the code crashes.
