# Architecture Decision Document: RAG-Powered Digital Twin Chatbot

**Author:** Carlton Lindsay  
**Date:** April 2026  
**Status:** Draft  
**Context:** Portfolio chatbot for carlton.dev — a "digital twin" that answers visitor questions about Carlton's work, skills, and philosophy.

---

## 1. Problem Statement

Carlton's portfolio site (carlton.dev) needs a conversational interface that lets visitors ask questions about his background, projects, and capabilities. The chatbot must:

- Give **accurate, well-sourced answers** — wrong answers are worse than no chatbot
- Run **cost-effectively** (free tier or very low monthly cost)
- Handle "I don't know" gracefully for out-of-scope questions
- Be embeddable as a React widget on the existing Vite/React site
- Itself serve as a **portfolio piece** demonstrating AI integration skills

---

## 2. Options Evaluated

### Option A: Fully Hosted Platform (Botpress, Chatbase, CustomGPT)

**How it works:** Upload documents to a managed platform. They handle embedding, retrieval, generation, and provide an embeddable widget.

| Factor | Assessment |
|--------|-----------|
| **Cost** | Free tiers exist but are limited. Chatbase: ~$19/mo for reasonable usage. Botpress: free tier caps at 100 conversations/month. CustomGPT: starts at $49/mo. |
| **Accuracy** | Decent out-of-box, but limited control over retrieval strategy, chunk sizes, and prompt engineering. You're locked into their RAG pipeline. |
| **Customization** | Widget theming is usually limited. Can't deeply customize the prompt, retrieval logic, or response format. Doesn't match a dark-themed portfolio aesthetic well. |
| **Portfolio value** | Low — using a drag-and-drop tool doesn't demonstrate AI engineering skills. |
| **Time to launch** | Very fast (hours). |
| **Verdict** | **Not recommended.** Too expensive for the feature set, limited customization, and doesn't showcase technical ability. |

### Option B: Custom RAG Pipeline (Full Build)

**How it works:** Build the entire pipeline yourself — document chunking, embedding generation, vector storage, retrieval logic, prompt engineering, and a custom React chat UI. Requires a backend API to orchestrate retrieval and LLM calls.

| Factor | Assessment |
|--------|-----------|
| **Cost** | Can be very low. Supabase pgvector (free tier: 500MB, unlimited API calls). OpenAI text-embedding-3-small ($0.02/1M tokens — essentially free for this scale). LLM generation is the main cost: Claude Haiku or GPT-4o-mini are ~$0.25-0.75/1M tokens. At ~100 conversations/month, expect $0.50-2/month. |
| **Accuracy** | Maximum control — you choose chunk sizes, overlap, retrieval strategy (top-k, hybrid search, re-ranking), and can craft a precise system prompt with citation requirements. |
| **Customization** | Total control over UI, behavior, tone, response format, and guardrails. |
| **Portfolio value** | High — demonstrates RAG architecture, prompt engineering, vector databases, and full-stack AI integration. |
| **Time to launch** | Moderate (1-2 weeks for MVP). |
| **Verdict** | **Recommended.** Best balance of cost, control, accuracy, and portfolio value. |

### Option C: Hybrid — Vercel AI SDK + Serverless

**How it works:** Use the Vercel AI SDK (which provides streaming, tool-use, and chat primitives) with a serverless function that handles retrieval. Combines framework convenience with custom RAG logic.

| Factor | Assessment |
|--------|-----------|
| **Cost** | Similar to Option B. Vercel free tier handles the compute (100GB-hours/month, 100K function invocations). Vector DB and LLM API costs remain the same. |
| **Accuracy** | Same as Option B — you still control the RAG pipeline. |
| **Customization** | High. Vercel AI SDK provides React hooks (`useChat`) and streaming out of the box, reducing boilerplate. |
| **Portfolio value** | High — shows modern AI-SDK integration patterns that employers recognize. |
| **Time to launch** | Faster than Option B (days, not weeks) thanks to SDK abstractions. |
| **Verdict** | **Strong alternative** if you're willing to deploy via Vercel rather than pure GitHub Pages. |

---

## 3. Recommended Architecture: Option B (Custom RAG) with elements of C

The recommended approach is a **custom RAG pipeline** deployed as a lightweight serverless backend. Here's why this beats the alternatives:

1. **GitHub Pages limitation:** Your site is on GitHub Pages, which can't run server-side code. You need a separate API endpoint regardless.
2. **Supabase is ideal:** Free tier gives you a Postgres database with pgvector, Edge Functions (serverless), and auth — all in one platform, no credit card required.
3. **Portfolio signal:** Building this yourself demonstrates exactly the skills companies hiring for AI+Frontend roles want to see.

### Recommended Stack

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                        │
│  React Chat Widget (embedded in carlton.dev)     │
│  - Streaming responses via fetch + ReadableStream│
│  - Citation display with source links            │
│  - "I'm not sure" confidence indicators          │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS POST /api/chat
                   ▼
┌─────────────────────────────────────────────────┐
│            SUPABASE EDGE FUNCTION                │
│  1. Embed user query (text-embedding-3-small)    │
│  2. Vector similarity search (pgvector)          │
│  3. Build prompt with retrieved context          │
│  4. Stream LLM response (Claude Haiku / GPT-4o-mini) │
│  5. Return streamed response with citations      │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│  Supabase    │    │  LLM API         │
│  pgvector    │    │  (Anthropic /    │
│  (embeddings │    │   OpenAI)        │
│  + metadata) │    │                  │
└──────────────┘    └──────────────────┘
```

### Component Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Vector DB** | Supabase pgvector | Free tier (500MB), no separate service to manage, SQL-based so easy to query/debug, supports metadata filtering |
| **Embeddings** | OpenAI `text-embedding-3-small` | $0.02/1M tokens (pennies for entire knowledge base), 1536 dimensions, excellent quality. Alternative: Cohere `embed-english-v3.0` has a free tier (100 calls/min). |
| **LLM** | Claude 3.5 Haiku or GPT-4o-mini | Both are fast, cheap ($0.25-0.75/1M tokens), and good at following instructions. Claude Haiku is better at staying in-character; GPT-4o-mini is slightly cheaper. Start with one, easy to swap. |
| **Backend** | Supabase Edge Functions (Deno) | Free tier, co-located with the vector DB, supports streaming responses. Alternative: Vercel Serverless Functions or Cloudflare Workers. |
| **Frontend** | React component (in existing Vite app) | No new framework needed. A `<ChatWidget />` component that manages state and streams responses. |

---

## 4. Cost Projection

### Monthly cost at ~100-200 visitor conversations/month:

| Item | Cost |
|------|------|
| Supabase (free tier) | $0 |
| OpenAI embeddings (one-time for knowledge base + per-query) | ~$0.01/month |
| LLM generation (~150 conversations × ~500 tokens each) | ~$0.50-1.50/month |
| **Total** | **~$0.50-1.50/month** |

### One-time setup costs:
| Item | Cost |
|------|------|
| Embedding entire knowledge base (~50 chunks) | ~$0.001 |
| Testing and iteration | ~$0.10 |

This is essentially free at portfolio-traffic scale.

---

## 5. Accuracy Strategy

Accuracy is the highest priority. The architecture addresses this through multiple layers:

1. **Curated knowledge base** — Every fact the chatbot can cite comes from markdown files you write and control. No web scraping, no hallucinated facts.

2. **Chunking strategy** — Semantic chunking by topic (one chunk per project, one per skill area, etc.) rather than fixed-size splitting. Each chunk has metadata (source file, topic, last updated).

3. **Retrieval threshold** — Set a minimum similarity score (e.g., 0.75). If no chunks meet the threshold, the chatbot says "I don't have specific information about that" rather than guessing.

4. **Prompt engineering** — The system prompt explicitly instructs the LLM to:
   - Only answer based on provided context
   - Cite which knowledge base section the answer came from
   - Say "I don't know" rather than speculate
   - Stay in character as Carlton's digital twin (first person, Carlton's voice)

5. **Citation display** — Every response shows which source documents informed it, so visitors (and you) can verify accuracy.

6. **Rate limiting** — Supabase Edge Functions support rate limiting to prevent abuse and runaway costs.

---

## 6. Migration Path

This architecture supports incremental enhancement:

- **Phase 1 (MVP):** Static knowledge base, basic retrieval, single LLM. Deploy and test with real visitors.
- **Phase 2:** Add conversation memory (multi-turn context), refine chunks based on real questions.
- **Phase 3:** Add analytics (what are people asking? where does it fail?), hybrid search (keyword + vector).
- **Phase 4:** If the site migrates to Next.js/Vercel, move the Edge Function to a Vercel API route — same logic, different host.

---

## 7. Updated Decision: Self-Hosted on Raspberry Pi 5

**Original recommendation was Supabase (cloud). Updated to self-hosted.**

After evaluating hardware options, the recommended architecture is now **fully self-hosted on a Raspberry Pi 5 (8GB)**:

- **LLM:** Phi-3-mini 3.8B Q4_K_M via Ollama (4-7 tok/s on Pi 5)
- **Embeddings:** nomic-embed-text via Ollama (local, no API costs)
- **Vector DB:** sqlite-vec (zero infrastructure, single file)
- **API Server:** Node.js/Fastify on the Pi
- **Tunnel:** Cloudflare Tunnel (free, no port forwarding needed)
- **Cost:** ~$0.50/month (electricity only)

This approach eliminates all API costs, runs entirely on hardware you own, and is a significantly stronger portfolio piece than a cloud-hosted wrapper. The Supabase architecture remains available as a fallback or alternative deployment.

See `self-hosting-and-enhancement-plan.md` for the full hardware analysis, enhancement roadmap, and setup instructions.

**Upgrade path:** If 3B model quality isn't sufficient, a Mac Mini M4 (16GB, $499) runs 8B models at 55-70 tok/s via MLX — a drop-in replacement that uses the same Ollama API.
