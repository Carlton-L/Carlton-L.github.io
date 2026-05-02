# Self-Hosting & Enhancement Plan: Digital Twin Chatbot v2

**Date:** April 2026  
**Goal:** Self-hosted, zero-cost, cutting-edge RAG chatbot that doubles as a portfolio showpiece  
**Timeline:** 2-3 weeks to demo-ready MVP  
**Hardware available:** Raspberry Pi 5 (8GB), Synology DS225+ NAS

---

## Part 1: Hardware Analysis — What Can Actually Run This?

### Your Raspberry Pi 5 (8GB) — The Sweet Spot

The Pi 5 is genuinely viable for a self-hosted chatbot. Here's what the benchmarks show:

| Model | Quantization | RAM Used | Speed | Quality |
|-------|-------------|----------|-------|---------|
| Gemma 2 2B | Q4_K_M | ~1.5 GB | 6-10 tok/s | Good for simple Q&A |
| Phi-3-mini 3.8B | Q4_K_M | ~2.3 GB | 4-7 tok/s | **Best balance for your use case** |
| Llama 3.2 3B | Q4_K_M | ~2.0 GB | 4-6 tok/s | Strong instruction following |
| Qwen 2.5 3B | Q4_K_M | ~2.2 GB | 4-6 tok/s | Good multilingual |
| Mistral 7B | Q4_K_M | ~4.5 GB | 1-3 tok/s | Better quality but painfully slow |

**Verdict:** A 3B model at Q4_K_M is the sweet spot. 4-7 tokens/second is slow but usable — roughly the speed of a thoughtful human typing. With active cooling, this is a stable setup. You'll have ~5GB free for the OS, vector DB, API server, and embedding model.

For embeddings, you can run **nomic-embed-text** (137M params, 274MB) or **all-MiniLM-L6-v2** (23M params, 46MB) locally — both run comfortably on the Pi 5 CPU. This eliminates the OpenAI embedding API entirely.

**Total cost: $0/month.** Your only costs are electricity (~$5-10/year for a Pi).

### Your Synology DS225+ — Better as Supporting Infrastructure

The DS225+ has an Intel Celeron N100 with only 2GB RAM (expandable to 6GB). Even maxed out at 6GB, it can barely run a 3B model at 1-3 tok/s. However, it's excellent for:

- Running the **vector database** (SQLite is tiny)
- Serving as a **reverse proxy** (Nginx, Caddy)
- **Monitoring and logging** (Grafana, Uptime Kuma)
- **Docker orchestration** if you prefer containers

**Recommended role:** Use the NAS for infrastructure (reverse proxy, DNS, monitoring, backups) and the Pi 5 for AI inference.

### Mac Mini — The Upgrade Path (If You Want It)

If you ever want to level up, Apple Silicon Mac Minis are dramatically better for local AI:

| Mac Mini | Used/Refurb Price | Best Model | Speed |
|----------|-------------------|------------|-------|
| M1 8GB | ~$250-320 | Llama 3.2 3B Q4 | ~35-50 tok/s |
| M2 16GB | ~$400-500 | Llama 3.1 8B Q4 | ~30-40 tok/s (MLX) |
| M4 16GB | $499 new | Llama 3.1 8B Q4 | ~55-70 tok/s (MLX) |

An M4 Mac Mini at $499 runs an 8B model at 55-70 tok/s via MLX — that's instant, conversational-speed AI. An 8B model is a massive quality jump over 3B. But for the MVP, the Pi 5 is more than enough, and "I run this on a Raspberry Pi" is arguably a more interesting talking point than "I run this on a Mac Mini."

**Recommendation for now:** Start with the Pi 5. It works, it's impressive, and it's free. If you later feel the 3B model quality isn't good enough, a Mac Mini M4 is a clear upgrade path — the architecture you build now will work on both.

---

## Part 2: What's Missing from V1

The current implementation is a solid skeleton, but here's what needs work to make it demo-ready and genuinely impressive:

### Must-Fix (MVP Blockers)

1. **No local inference** — V1 depends on cloud APIs. The self-hosted version needs llama.cpp or Ollama for local generation and local embedding models.

2. **No server implementation** — V1 uses a Supabase Edge Function. The self-hosted version needs a proper API server that runs on the Pi.

3. **Naive chunking** — Splitting only on `##` headings means some chunks are too long and others too short. Need overlap and size-aware chunking.

4. **No caching** — Every question hits the LLM, even repeated ones. Semantic caching (cache answers for similar questions) saves inference time and improves response speed.

5. **No rate limiting** — A visitor (or bot) could spam the endpoint and overload the Pi. Need request throttling.

6. **No health monitoring** — No way to know if the Pi is down, overloaded, or returning bad answers.

### Should-Fix (Quality Polish)

7. **No confidence scoring** — The chatbot doesn't indicate how confident it is. Showing the similarity scores from retrieval helps visitors calibrate trust.

8. **No source citation UI** — The prompt tells the LLM to cite sources, but the widget doesn't render citations differently. Show which knowledge base section informed each answer.

9. **No conversation analytics** — You should know what visitors are asking. This tells you what to add to the knowledge base and what's working.

10. **Widget needs polish** — Needs mobile responsiveness, keyboard accessibility, smooth streaming animation, and a way to minimize/maximize.

11. **No graceful degradation** — If the Pi is down, visitors see an error. Should fall back to a "Carlton is offline — here's his email" message.

12. **Knowledge base is sparse** — Many project files have TODO comments. The chatbot is only as good as its source material.

### Nice-to-Have (Wow Factor)

13. **Transparency mode** — Show visitors which knowledge chunks were retrieved and their similarity scores. This is meta-impressive: the chatbot explains its own reasoning.

14. **Response streaming with thinking indicator** — Show "Searching knowledge base..." then "Generating response..." as visual feedback.

15. **Conversation starters that rotate** — Different starter questions each visit, based on time of day or random selection.

16. **Dark/light theme matching** — Widget adapts to the site's current theme.

---

## Part 3: Self-Hosted Architecture

Here's the complete self-hosted stack for the Pi 5:

```
┌──────────────────────────────────────────────────────────────┐
│                     VISITOR'S BROWSER                         │
│  React ChatWidget → HTTPS POST to your-api.carlton.dev       │
└──────────────────┬───────────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  Cloudflare Tunnel │  (free — exposes Pi to internet
         │  or Tailscale      │   without opening router ports)
         └─────────┬─────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│              RASPBERRY PI 5 (8GB)                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  API Server (Node.js / Fastify)                      │     │
│  │  - /api/chat — main chat endpoint                    │     │
│  │  - /api/health — monitoring endpoint                 │     │
│  │  - Rate limiter (10 req/min per IP)                  │     │
│  │  - Semantic cache (SQLite)                           │     │
│  │  - Request logging                                   │     │
│  └────────┬──────────────┬──────────────────────────────┘     │
│           │              │                                     │
│  ┌────────▼────────┐  ┌──▼───────────────────┐               │
│  │  Ollama          │  │  sqlite-vec          │               │
│  │  - Phi-3-mini    │  │  - Knowledge chunks  │               │
│  │    3.8B Q4_K_M   │  │  - Embeddings (1536d │               │
│  │  - nomic-embed   │  │    or 384d)          │               │
│  │    -text         │  │  - Semantic cache     │               │
│  │                  │  │  - Chat logs          │               │
│  └──────────────────┘  └──────────────────────┘               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  System Services                                     │     │
│  │  - Caddy (reverse proxy + auto HTTPS)                │     │
│  │  - systemd services for auto-restart                 │     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘

Optional: Synology NAS
  - Uptime Kuma (monitoring dashboard)
  - Grafana (analytics visualization)
  - Nightly backup of SQLite databases
```

### Key Design Decisions

**Ollama over raw llama.cpp:** Ollama wraps llama.cpp with a clean REST API, automatic model management, and easy model switching. One command to install, one command to pull a model. It also serves embedding models through the same API. This is dramatically simpler than managing llama.cpp builds.

**sqlite-vec over pgvector:** For a knowledge base of ~50-100 chunks, sqlite-vec is perfect. Zero infrastructure — it's just a file. Brute-force search is fast up to ~100K vectors. No Postgres to manage, no separate service. The database is a single file you can back up by copying it.

**Cloudflare Tunnel over port forwarding:** Cloudflare Tunnel (free) creates an outbound connection from the Pi to Cloudflare's edge network. Visitors hit `api.carlton.dev` → Cloudflare → tunnel → Pi. No router ports opened, no dynamic DNS, automatic HTTPS. If the Pi is down, Cloudflare returns a clean error page. You point a CNAME record from `api.carlton.dev` to the tunnel.

**Semantic caching:** Before hitting the LLM, embed the user's question and check if a semantically similar question has been asked before (cosine similarity > 0.95). If yes, return the cached answer. This makes repeated/similar questions instant and saves inference time on the Pi.

**Fallback chain:** If the Pi is down or overloaded, the widget shows a friendly "I'm taking a nap — reach Carlton at carlton@carlton.dev" message. Optionally, you could add a cloud LLM fallback (Claude Haiku) that only activates when the Pi is unreachable — best of both worlds.

---

## Part 4: What Makes This Cutting-Edge

Here's where this goes from "portfolio chatbot" to "this person clearly understands AI infrastructure":

### Tier 1: Do These for the MVP (Week 1-2)

**1. Full local inference stack on a $80 computer.** This alone is impressive. Most portfolio chatbots are wrappers around OpenAI. Yours runs entirely on hardware you own, with zero API costs and zero data leaving your network.

**2. Retrieval transparency panel.** Add a collapsible "How I answered this" section below each response showing:
   - Which knowledge base chunks were retrieved
   - Similarity scores for each chunk
   - Which source file the information came from

   This is a subtle but powerful signal. It shows you understand RAG internals, not just the API surface. It also builds visitor trust — they can see the chatbot isn't making things up.

**3. "Powered by a Raspberry Pi" badge.** A small indicator in the chat widget that says "Running on a Raspberry Pi 5 · Phi-3 3.8B · 100% self-hosted." This is a conversation starter. People will ask about it. It demonstrates edge computing, resource-constrained ML, and infrastructure skills.

**4. Semantic caching with cache-hit indicator.** When a response comes from cache, show a subtle "⚡ Instant — similar question answered before" indicator. This shows you've thought about performance optimization at the infrastructure level.

### Tier 2: Add These After MVP (Week 2-3)

**5. Hybrid retrieval (BM25 + vector).** Vector search is great for semantic similarity, but sometimes keyword matching is better (e.g., searching for "FAST" the project name). Implement both and merge results. This is what production RAG systems do — most portfolio implementations don't bother.

**6. Conversation analytics dashboard.** Build a simple page (protected by a password or your IP) that shows:
   - Most common questions
   - Questions with low retrieval confidence (gaps in knowledge base)
   - Response times
   - Conversations per day/week
   
   This shows you think about AI systems holistically — not just the model, but the feedback loop.

**7. Adaptive starter questions.** Instead of hardcoded starters, rotate them based on:
   - Time of day ("Good morning! Ask me about my current projects" vs. "Evening! Curious about my background?")
   - What's trending in the chat logs (if everyone asks about Apple, feature that)
   - Random selection from a pool to keep the experience fresh

**8. Typing speed simulation.** Instead of dumping streamed tokens at whatever speed llama.cpp produces them (which on Pi 5 is actually naturally paced), add a subtle smoothing algorithm that makes the text appear at a natural reading speed. This is a small UX detail that separates polished from prototype.

### Tier 3: Experimental / Long-term

**9. Voice interaction.** Use the Web Speech API for voice input and a local TTS model (Piper TTS runs on Pi 5) for voice output. Imagine: a visitor clicks a microphone button, asks "What did you build at Apple?", and hears Carlton's digital twin respond. This is legitimately futuristic and would be a major talking point.

**10. Multi-modal retrieval.** Embed images from your portfolio alongside text. When someone asks about the Biomimetic Eye, the chatbot can show a photo. Use CLIP embeddings for image-text matching.

**11. Fine-tuned writing style.** Take your existing writing (portfolio descriptions, LinkedIn posts, any blog posts) and fine-tune a LoRA adapter on your writing style. The chatbot doesn't just answer accurately — it sounds like you. This requires a Mac Mini or cloud GPU for the fine-tuning step, but the resulting adapter can run on the Pi.

**12. A/B model comparison mode.** Let visitors toggle between models (e.g., Phi-3 vs. Llama 3.2) and see how answers differ. Frame it as "I'm experimenting with different models — here's how they compare." This is transparently experimental and very on-brand for a Design Technologist.

**13. Live infrastructure dashboard.** A public page showing real-time Pi metrics: CPU temp, RAM usage, inference queue depth, uptime. "Here's the computer answering your questions, right now." This level of transparency is rare and memorable.

---

## Part 5: Phased Roadmap

### Phase 1: Foundation (Days 1-4)

- [ ] Set up Pi 5 with Raspberry Pi OS (64-bit Lite)
- [ ] Install Ollama, pull Phi-3-mini 3.8B Q4_K_M and nomic-embed-text
- [ ] Test inference speed and stability under load
- [ ] Set up sqlite-vec database, import schema
- [ ] Complete the knowledge base — fill in all TODO sections
- [ ] Run the embedding pipeline locally (replacing OpenAI with Ollama embeddings)

### Phase 2: API Server (Days 5-8)

- [ ] Build the Fastify API server with /api/chat and /api/health
- [ ] Implement RAG pipeline: embed query → sqlite-vec search → build prompt → stream Ollama response
- [ ] Add semantic caching layer
- [ ] Add rate limiting (10 req/min per IP)
- [ ] Add request logging to SQLite
- [ ] Set up Cloudflare Tunnel to expose the API
- [ ] Point api.carlton.dev CNAME to the tunnel
- [ ] Test end-to-end from a browser

### Phase 3: Widget Polish (Days 9-12)

- [ ] Update ChatWidget to point to self-hosted API
- [ ] Add retrieval transparency panel (collapsible)
- [ ] Add "Powered by Raspberry Pi" badge
- [ ] Add semantic cache-hit indicator
- [ ] Add graceful degradation (Pi-down fallback message)
- [ ] Mobile responsive testing
- [ ] Keyboard accessibility
- [ ] Smooth streaming animation

### Phase 4: Testing & Analytics (Days 13-16)

- [ ] Run the accuracy test suite against the self-hosted endpoint
- [ ] Fix any factual accuracy failures
- [ ] Tune similarity threshold and prompt
- [ ] Set up conversation analytics (query logging + simple dashboard)
- [ ] Load testing: simulate 10 concurrent users
- [ ] Set up monitoring (Uptime Kuma on Synology, optional)
- [ ] Document the entire setup for your portfolio write-up

### Phase 5: Enhancements (Post-Launch)

- [ ] Hybrid retrieval (BM25 + vector)
- [ ] Adaptive starter questions
- [ ] Voice interaction prototype
- [ ] Live infrastructure dashboard
- [ ] Blog post / case study about the build

---

## Part 6: Pi 5 Setup Checklist

### Hardware Setup

```
Required:
- Raspberry Pi 5 (8GB) — you have this
- Active cooler (fan + heatsink) — critical for sustained inference
- 64GB+ microSD or NVMe SSD via M.2 HAT (SSD strongly recommended)
- USB-C power supply (5V 5A, official Pi 5 supply recommended)
- Ethernet connection (more reliable than WiFi for a server)

Optional but recommended:
- Argon ONE or Pimoroni NVMe Base case with M.2 slot (~$25)
- 256GB NVMe SSD (~$25) — much faster than microSD, better for database I/O
- UPS HAT or UPS via Synology for power reliability
```

### Software Stack

```bash
# 1. Install Raspberry Pi OS 64-bit Lite
# Use Raspberry Pi Imager, enable SSH, set hostname to "carlton-ai"

# 2. Initial setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

# 3. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 4. Pull models
ollama pull phi3:3.8b        # or phi3:mini for the Q4_K_M variant
ollama pull nomic-embed-text  # local embeddings

# 5. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 6. Install Cloudflare Tunnel
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# 7. Authenticate and create tunnel
cloudflared tunnel login
cloudflared tunnel create carlton-chatbot
# Configure DNS: api.carlton.dev → tunnel
```

---

## Part 7: Cost Summary

### Self-Hosted (Pi 5) — Recommended

| Item | Cost |
|------|------|
| Pi 5 8GB | Already owned |
| NVMe SSD + HAT (optional) | ~$50 one-time |
| Electricity (~5W continuous) | ~$5-10/year |
| Cloudflare Tunnel | Free |
| Domain (carlton.dev) | Already owned |
| LLM API costs | $0 |
| Embedding API costs | $0 |
| Vector database | $0 (SQLite) |
| **Monthly total** | **~$0.50** (electricity) |

### Cloud (Previous Architecture) — For Comparison

| Item | Cost |
|------|------|
| Supabase free tier | $0 |
| OpenAI embeddings | ~$0.01/month |
| LLM generation (Claude Haiku) | ~$0.50-1.50/month |
| **Monthly total** | **~$0.50-1.50** |

Both approaches cost under $2/month. The self-hosted approach has a slightly higher upfront cost (SSD) but eliminates all API dependencies and is a much stronger portfolio piece.

---

## Part 8: Why This Is Impressive

When a hiring manager or technical interviewer looks at this, here's what they see:

1. **Full-stack AI engineering** — not just calling an API, but running inference, managing embeddings, building retrieval pipelines, and deploying on constrained hardware.

2. **Edge computing** — running a production AI system on a $80 computer. This is relevant to IoT, on-device ML, and privacy-preserving AI — all hot topics.

3. **Infrastructure thinking** — tunneling, caching, monitoring, graceful degradation, rate limiting. This is how production systems work.

4. **Retrieval engineering** — chunking strategy, similarity thresholds, hybrid search. These are the skills that separate "I used LangChain once" from "I understand how RAG systems actually work."

5. **UX integration** — the chatbot isn't a separate page. It's a thoughtfully designed widget embedded in the portfolio, with streaming, transparency, and fallback states.

6. **Meta-recursion** — the chatbot is a portfolio piece that lives inside the portfolio. Asking it "How did you build this chatbot?" returns a real, accurate answer. This is delightfully self-referential.

7. **Cost engineering** — you can articulate exactly why you chose this architecture, what the tradeoffs are, and what it costs. This is practical engineering maturity.

The combination of these signals says: "This person can ship AI products, not just prototype them."
