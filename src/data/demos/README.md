# Demo data conventions

Datasets and replay logs for the demo islands in `src/components/react/demos/`.
Every demo runs fully static/offline — the rules below are non-negotiable
(master plan: `Carlton Portfolio/live-demos/00_MASTER_PLAN.md`).

## Rules

1. **Synthetic or recorded-then-sanitized only.** No client names, no client
   logos, no proprietary data, no API keys, no live API calls. Demos must work
   with the network cable pulled.
2. **Honest labeling.** Every dataset carries a `_meta` block declaring what it
   is (`"synthetic": true` or `"recorded": true, "sanitized": true`). The demo
   UI surfaces the matching DemoFrame label (`live` / `recreation`).
3. **Deterministic.** Anything "random" uses a seeded PRNG so every visitor
   sees the same thing and replays are reproducible.
4. **Gate-able.** Futurity reserves the right to move any project behind a
   password later — keep each demo's data in its own file(s) so a demo can be
   moved to `/private` without touching the others.

## File naming

`<project>-<topic>.json` — e.g. `futurescaper-ocean-plastics.json`.
Replay logs: `<project>-<topic>.replay.jsonl` (one `{t, event, data}` per line,
`t` in ms from recording start; see `_shared/useReplay.js`).

## Sanitization checklist (for recorded logs)

- [ ] No client or partner names anywhere (strings AND ids)
- [ ] No internal hostnames, ports, request ids, user ids, emails
- [ ] No API keys / tokens (grep for `key`, `token`, `bearer`, `sk-`)
- [ ] Research topic is one of the agreed public-interest topics
- [ ] Timestamps normalized to t=0 start

## Current datasets

| File | Demo | Kind |
|---|---|---|
| `futurescaper-ocean-plastics.json` | `demos/futurescaper/FuturescaperDemo.jsx` | Hand-authored synthetic futurescape (46 nodes incl. 3 actions, 5 orders, 1 DAG node) |
