# Carlton.dev — Astro Portfolio Project Plan

## Overview

Rebuild carlton.dev as a static Astro site with React islands, deployed to GitHub Pages. The site serves as both a professional portfolio and a demonstration of modern frontend/design-systems skills relevant to job applications (Creative Technologist, AI+Frontend, Design Technologist roles).

---

## Architecture

```
                   ┌─────────────────────────────┐
                   │     GitHub Pages (CDN)       │
                   │   carlton.dev — static HTML  │
                   └──────────────┬──────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │        Astro Build           │
                   │  .astro → HTML (zero JS)     │
                   │  .jsx  → hydrated islands    │
                   └──────────────┬──────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   Static Pages              React Islands           Chatbot API
   (SEO, content)        (Three.js, GSAP,         (Raspberry Pi 5)
                           Framer Motion)          Ollama + sqlite-vec
                                                   Cloudflare Tunnel
```

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Astro 6 | Static-first, zero JS default, React islands |
| Styling | Tailwind 4 + CSS custom properties | Shows both utility-class and token fluency |
| Design Tokens | CSS custom properties (Style Dictionary ready) | Portable, Figma-compatible |
| Animations (page) | Astro View Transitions | Native browser, no JS bundle |
| Animations (component) | GSAP + Framer Motion | Industry-standard, shows range |
| 3D | React Three Fiber + Drei | WebGL/creative coding demonstration |
| Deployment | GitHub Pages via GitHub Actions | Free, no vendor lock-in |
| Chatbot | Ollama on Pi 5 + Cloudflare Tunnel | Self-hosted RAG, zero API cost |
| Analytics | Umami (self-hosted on Pi) | Privacy-first, no cookies |

---

## Phases

### Phase 1: Foundation (Current)
**Goal:** Working scaffold that builds and deploys.

- [x] Astro project setup with React, Tailwind, Sitemap integrations
- [x] Design tokens in CSS custom properties + Tailwind config mapping
- [x] Base layout with full SEO (OG, Twitter Cards, JSON-LD, canonical)
- [x] View Transitions enabled
- [x] Navigation + Footer (static Astro components)
- [x] Homepage with Three.js hero island
- [x] Custom project page example (FAST)
- [x] Template-based project fallback ([slug].astro)
- [x] About, Contact, Blog, Lab, Projects pages
- [x] Content data file (carried over from Next.js version)
- [x] SEO utility library (JSON-LD generators)
- [ ] Clean up old Vite files from branch
- [ ] npm install + verify build passes locally
- [ ] Deploy to GitHub Pages
- [ ] CNAME + DNS pointing

### Phase 2: Design & Polish
**Goal:** Production-quality visual design. Site looks as good as the work it showcases.

- [ ] Refine dark/light theme (ThemeToggle as React island)
- [ ] GSAP scroll-triggered animations on project pages
- [ ] Hero scene — replace placeholder particles with final 3D concept
- [ ] Typography refinement (font loading strategy, FOUT prevention)
- [ ] Image optimization pipeline (Astro `<Image />` component, WebP/AVIF)
- [ ] Responsive nav (mobile hamburger or drawer)
- [ ] 404 page
- [ ] Loading states / skeleton screens for islands
- [ ] Page transition refinements (per-element view-transition-name)
- [ ] Signature UI details: PlusIcons, TweenText (port as Astro or React islands)

### Phase 3: Custom Project Pages
**Goal:** Each top project gets a fully bespoke page — unique layout, interactive elements, rich content.

- [ ] FAST — full case study with network graph demo
- [ ] Immersive Experience Builder — spatial/sensor demo
- [ ] Futures Garden — LLM conversation mockup or video
- [ ] Biomimetic Eye — 3D model viewer or video embed
- [ ] Synthetic Plant — PhototropicSandbox demo (port from Next.js version)
- [ ] Remaining projects — template pages with expanded content

### Phase 4: Blog & Lab
**Goal:** Content sections that demonstrate ongoing work and thinking.

- [ ] MDX integration for blog posts (rich content with embedded components)
- [ ] First 2-3 blog posts (topics: self-hosting AI, design tokens pipeline, BEAM robotics)
- [ ] Lab experiment: Phototropic Plants (port Canvas simulation)
- [ ] Lab experiment: GSAP scroll animation showcase
- [ ] RSS feed generation

### Phase 5: Chatbot Integration
**Goal:** RAG-powered digital twin running on self-hosted infrastructure.

- [ ] Raspberry Pi 5 setup (Ollama, Phi-3-mini, nomic-embed-text)
- [ ] sqlite-vec database with chunked knowledge base
- [ ] Node.js/Fastify API server on Pi
- [ ] Cloudflare Tunnel configuration
- [ ] ChatbotWidget React island (UI)
- [ ] Streaming response display
- [ ] Confidence scoring + source citations
- [ ] Conversation starters

### Phase 6: Analytics & Performance
**Goal:** Understand visitor behavior, optimize performance.

- [ ] Umami self-hosted on Pi (or separate VPS)
- [ ] Event tracking (project views, contact clicks, chatbot usage)
- [ ] Lighthouse CI in GitHub Actions (performance regression alerts)
- [ ] Bundle analysis + code splitting audit
- [ ] Core Web Vitals monitoring

---

## Dependencies & Their Purpose

### Employability Signals

| Dependency | What It Demonstrates |
|-----------|---------------------|
| Tailwind CSS 4 | Modern utility-first CSS (expected in most frontend roles) |
| CSS Custom Properties as tokens | Design systems thinking, Figma-to-code workflow |
| React Three Fiber | WebGL/3D (creative tech differentiator) |
| GSAP | Production animation (agency/studio standard) |
| Framer Motion | React animation library (startup/product standard) |
| Astro | Modern meta-framework knowledge (shows range beyond Next.js) |
| View Transitions API | Cutting-edge browser APIs |
| Self-hosted RAG | AI/ML infrastructure (major differentiator) |

### Future Additions (When Ready)

| Dependency | Purpose | When |
|-----------|---------|------|
| Style Dictionary | Formalized token pipeline (CSS → Figma → iOS → Android) | Phase 2 |
| Playwright | E2E testing for interactive demos | Phase 4 |
| MDX | Rich blog content with embedded React components | Phase 4 |
| sharp | Image processing at build time | Phase 2 |

---

## SEO Strategy

### Per-Page Checklist
Every page must have:
- Unique `<title>` (50-60 chars)
- Unique `<meta description>` (120-160 chars)
- Canonical URL
- Open Graph image (1200x630px)
- JSON-LD structured data (appropriate schema type)
- Breadcrumb schema (except homepage)
- Semantic HTML (h1-h6 hierarchy, article, section, nav, main)

### Structured Data Types
- **Homepage:** Person + WebSite
- **Project pages:** CreativeWork + BreadcrumbList
- **About:** Person + BreadcrumbList
- **Blog posts:** BlogPosting + BreadcrumbList
- **Category pages:** CollectionPage + BreadcrumbList

### Technical SEO
- Auto-generated sitemap.xml via @astrojs/sitemap
- robots.txt (allow all, disallow drafts)
- Clean URLs (no trailing slashes, no hash routing)
- Image alt text on all images
- Preconnect hints for external resources
- Font display: swap (prevent FOIT)

---

## Deployment

### GitHub Pages Setup
```yaml
# .github/workflows/deploy.yml
# Triggers on push to main
# Builds with Astro, deploys to GitHub Pages
```

### Local Development
```bash
npm run dev      # Astro dev server (localhost:4321)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

### Domain
- carlton.dev → GitHub Pages
- api.carlton.dev → Cloudflare Tunnel → Raspberry Pi (chatbot)

---

## File Structure

```
Carlton-L.github.io/          (astro branch)
├── src/
│   ├── layouts/Base.astro           # Shared HTML shell
│   ├── pages/
│   │   ├── index.astro              # Homepage
│   │   ├── about.astro              # About
│   │   ├── contact.astro            # Contact
│   │   ├── projects/
│   │   │   ├── index.astro          # All projects grid
│   │   │   ├── fast.astro           # Custom page
│   │   │   ├── immersive-exp...     # Custom page
│   │   │   └── [slug].astro         # Template fallback
│   │   ├── blog/
│   │   │   ├── index.astro          # Blog listing
│   │   │   └── [slug].astro         # Blog post template
│   │   └── lab/
│   │       └── index.astro          # Lab experiments
│   ├── components/
│   │   ├── *.astro                  # Static components (no JS)
│   │   └── react/                   # Islands (hydrate on demand)
│   │       ├── HeroScene.jsx
│   │       ├── ChatbotWidget.jsx
│   │       └── demos/
│   ├── data/content.js              # All content
│   ├── lib/seo.js                   # JSON-LD generators
│   └── styles/
│       ├── tokens.css               # Design token definitions
│       └── global.css               # Tailwind + base styles
├── public/                          # Static assets (images, fonts)
├── chatbot/                         # RAG chatbot knowledge base + docs
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── CNAME
└── package.json
```

---

## Migration Checklist (from current live site)

- [ ] Remove old Vite files (src/App.jsx, src/main.jsx, vite.config.js, index.html, etc.)
- [ ] Port project images from dist/hero-images/ to public/images/projects/
- [ ] Verify all content matches current live site
- [ ] Set up GitHub Actions deploy workflow
- [ ] Verify CNAME still works with new build
- [ ] Redirect old hash-based URLs if possible (meta refresh in 404)
- [ ] Verify Google Search Console picks up new sitemap
- [ ] Submit sitemap to Google/Bing

---

## Open Questions

1. **Domain:** Keep carlton.dev on GitHub Pages, or consider Cloudflare Pages (free, faster CDN, native redirects)?
2. **Image hosting:** Keep images in repo, or use a CDN / image service?
3. **Analytics timeline:** Set up Umami in Phase 2 or wait for Pi setup in Phase 5?
4. **Blog cadence:** How often? Weekly, biweekly, when-inspired?

---

*Last updated: 2026-05-02*
