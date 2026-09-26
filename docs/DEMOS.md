# Demo infrastructure

How demos are built and embedded. Moved out of `CLAUDE.md` on 2026-09-26. Porting a product's real code is in `docs/DEMO_PORTING.md`; how demos fit into a case study is in `docs/CASE_STUDY_PLAYBOOK.md`.

- Infrastructure: `src/components/react/demos/_shared/` — `DemoFrame.jsx` (inner chrome: title strip, honest label, reset, fullscreen; sits flush inside a VIEW operator's body via a `.fs-viewerwrap`-style negative margin — never duplicate operator chrome), `useReplay.js` (timed event replay, scrub-safe: consumers derive state from `emitted`, never accumulate), `mockLlm.js` (canned streaming responses, seeded jitter).
- Data: `src/data/demos/` — conventions + sanitization checklist in its README.md. Synthetic or recorded-then-sanitized only, deterministic (seeded PRNG), one file per demo so any project can be password-gated later without restructuring.
- Embedding: a demo is a self-contained React island inside a VIEW operator. `client:visible` normally; `client:only="react"` + `slot="fallback"` poster for DOM-only libs (React Flow) and WebGL. Bundle ≤300KB gz per island; homepage stays demo-free.
- Labels: every demo is honestly labeled via DemoFrame — `live` (real product code, synthetic data) or `recreation` (real behavior, portfolio-owned code). FAST/Engine are RECREATED-ONLY per Futurity; Futurescaper + browser extension are public (extraction allowed — `demos/futurescaper/layout.js` is the product's real algorithm, ported verbatim; its `naiveForceLayout` is portfolio-owned).
- Template: `demos/futurescaper/` + its embed in `src/pages/projects/futurescaper.astro` is the reference implementation for future demos (Engine, FAST, extension, Campus AI).
