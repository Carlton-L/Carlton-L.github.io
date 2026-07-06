# Campus AI demo data

`coded-excerpts.json` powers the coded-transcript viewer in the Campus AI case study.

**Source:** the study's real Dovetail export (8 × 90-min interviews, 1,117 coded highlights, 182 tags) plus the Notion study plan and topline report. Campus AI cleared showing the study in full; participants are first-name-only per that clearance.

**Sanitization applied (2026-07-06):**
- First names only (surnames and initials stripped); no employers, no cities.
- Countries kept only where participants stated them.
- Quotes are verbatim with filler trimmed; cuts marked with `…`, clarifying words in `[brackets]`. Nothing paraphrased; anything that needed rewriting was dropped instead.
- Excerpts quoting third parties by name were excluded.
- One excerpt is a researcher summary, marked `"voice": "researcher-summary"` — render it visually distinct from participant quotes.

**Counts methodology:** `taggedMoments` / `participantCount` per theme are computed from tag clusters in the highlights export (e.g. the proxy-communities theme sums the Community-group tags + Learn from Other People's Experiences + Reviews and Testimonies + Credibility). The mapping lives in the evidence draft in the portfolio folder (`campus-ai-case-study/EVIDENCE_DRAFT.md`). Don't restate these numbers elsewhere without that context.

**`to: null`** on a participant means their destination field wasn't confirmed in the transcript review; Carlton to fill from memory or leave rendered as "mid-shift".

Raw transcripts and the full export stay OUT of the repo permanently (privacy). Only this curated file ships.
