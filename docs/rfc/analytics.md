# RFC: Usage analytics on carlton.dev

Status: accepted · 2026-10-22

## Purpose

I don't know how people use this site. I want to see which case studies they open, whether they read to the end, whether they touch the demos, and where they leave. The second goal is practice: building the habit of measuring how people use what I make, and changing it because of what I see.

## Background

- The site is static Astro on GitHub Pages. Page changes go through Astro's ClientRouter, so after the first load a visit never reloads the page.
- There is no analytics today.
- Traffic is small. Replays of a few real visits will probably teach more than charts.
- The PostHog project is set up in the EU region (Frankfurt). The free tier covers 1M events and 5,000 recordings a month.
- The home page ships almost no framework JavaScript. That rule stays.

## Proposal

1. A visitor lands. PostHog counts the visit without cookies or anything stored in the browser.
2. A small consent operator asks once if they're OK with their visit being recorded to improve the site.
3. Accept: PostHog stores an ID and records the session, with every form field masked. Decline: the visit is still counted anonymously, nothing is recorded, and the question doesn't come back.
4. Every page change counts as a page view.
5. I read the results every week for two weeks, then pick one thing to change.

The questions the data should answer:

- Which case studies get opened, and from where?
- How many people read a case study to the end?
- How many touch a demo?
- How many reach the CV or send a message?
- Which page do people leave from?
- Does anyone drag operators or move the background sliders, or switch to READ?

## Technical details

### Setup

- The PostHog snippet goes in the head of `Base.astro` as an `is:inline` script, inside a `window.__posthog_initialized` guard. Without the guard the ClientRouter re-runs it on every page change.
- It only starts on `carlton.dev`. Local dev and previews send nothing.
- Options: `api_host: 'https://eu.i.posthog.com'`, `defaults: '2026-05-30'`, `capture_pageview: 'history_change'`, `cookieless_mode: 'on_reject'`, `opt_out_capturing_by_default: true`. Without the last one PostHog captures nothing until the visitor answers, so step 1 of the proposal wouldn't hold.
- Autocapture stays on. It gives click counts and heatmaps for free; the custom events below carry the meaning.
- Custom events go through one helper, `track(name, props)`, that does nothing when PostHog isn't there (an ad blocker, or `?nopatch=1`). A page never breaks because analytics is missing.
- My own visits don't count. Visiting with `?notrack=1` sets a localStorage flag, and the loader skips PostHog's init while the flag is set. PostHog's own opt-out isn't enough: with `on_reject`, an opt-out still counts me, cookieless.
- The project token is public by design.

### Events

| Event | When it fires | Properties |
|---|---|---|
| `$pageview`, `$pageleave` | Automatic, on every page change | path |
| `case_finished` | The next-case card scrolls into view | slug |
| `next_case_clicked` | The NEXT button is clicked | from, to |
| `demo_touched` | First pointer down inside a demo on that page | demo |
| `demo_reset` | RESET is clicked | demo |
| `cv_downloaded` | The CV link is clicked | page |
| `message_sent` | The contact form sends successfully | none (never the form's contents) |
| `patch_used` | First drag, slider or chip change on a page | kind |
| `mode_changed` | PATCH to READ or back | to |

The funnel: landed, then opened a case study, then `case_finished` or `demo_touched`, then `cv_downloaded` or `message_sent`.

### Recordings

- Form fields are masked by default. The contact form stays masked.
- Canvas recording is off by default, so the dither background and canvas demos won't show in replays. That keeps recordings small. It also means a replay shows the operators, not what was drawn inside a canvas.

### Performance

The loader is small. The full library and the recorder are not. Load PostHog once the page has settled, and measure the first page change with `tests/measure.mjs` before and after. If the home page gets slower, defer it further.

### Privacy

A short `/privacy/` page: what is collected, that it stays in the EU, how long it's kept, and how to opt out. Linked from the footer and from the consent operator.

Cookieless visits get no location data and no bot filtering: PostHog hashes the IP and strips it before storing anything.

## Implementation plan

1. Prototype the consent operator in `docs/prototypes/`, a few directions with one recommended. I pick.
2. Write the privacy page.
3. Add the snippet, the helper and page views. Check events arrive in PostHog's live view from the deployed site.
4. Add the custom events.
5. Measure performance before and after.
6. Build one PostHog dashboard: the funnel, case studies by visits, exit pages.
7. After two weeks, write down what I learned and the one change I made because of it.

## Open questions

- Consent operator wording and where it sits, in PATCH and in READ.
- How long to keep data (PostHog's retention setting).
- Ad blockers will hide some visitors. A reverse proxy would fix that. Not now.

## Changes after acceptance


### 2026-10-22: questions, events, settings, retention, consent operator

- Questions. The list in the Proposal becomes:
  - Which case studies get opened, and from where?
  - Which work-index previews do people hover? Where do they click?
  - How many people read a case study to the end? How long do they stay, and how far do they scroll?
  - How many people click an external link (e.g. the code on GitHub)? Which ones?
  - How many touch a demo? Which demos?
  - How many reach the CV or send a message?
  - Which page do people leave from?
  - Does anyone drag operators or move the background sliders, or switch to READ?
  - What device and screen size do people visit from?
  - Which links I sent brought a visit?
  - How many say yes to recording?
  - Does anything break for visitors?
  - Where do people click on something that isn't clickable?
  - How fast is the site for real visitors?
- Hover means the work-index previews only. PostHog's heatmaps record mouse movement, but the free plan collects them for 3 pages, and operators move when they're dragged, so positions don't line up between visitors. Heatmaps stay off.
- Three events added: `preview_hovered` (a work-index row shows its preview, once per row per page; slug), `link_out` (a link to another site is clicked; href, label, page), `consent_answered` (the operator is answered; answer).
- Settings added: `capture_exceptions: true`, `capture_dead_clicks: true`, `capture_performance: true` (web vitals), `capture_heatmaps: false`. Every event carries the current mode, PATCH or READ, as a registered property. READ is forced below 1280 px, so a switch only means something above it.
- Link tags. Links I hand out carry `utm_source` (where the link sits) and `utm_campaign` (an ID I keep outside this repo). PostHog reads both from the landing URL.
- Retention. Events are kept 1 year, PostHog's period on the free plan. It can't be made shorter. Recordings are kept 30 days, the most the free plan allows. The privacy page says both.
- Consent operator. Settled by the accepted prototype `docs/prototypes/consent-operator.html`: a docked SYS operator at the bottom left on the first visit, and a REC chip beside PATCH / READ that shows the answer on every page and reopens the question. This answers the first open question.
- `defaults` stays at `2026-05-30`. From `2026-06-25` the defaults turn on `session_recording.streamNetworkBody`, and the contact form's request should never reach a replay. A bump needs that set to false first.

### 2026-10-23: as built

- Setup. The head holds a small inline loader (`src/lib/analytics-loader.js`): it reads the `?notrack` flag, puts the recording answer on `<html data-rec>` before the first paint, and loads `/js/analytics.js`, a cached file built in `src/lib/bundles.js`. That file holds the question, the REC chip, `track()` and the events. PostHog's library comes from its CDN once the page change has finished and the browser is idle, on `carlton.dev` only.
- Storage. The answer is kept in localStorage as `rec-consent` (`yes` or `no`). `?notrack=1` sets `notrack` to `1`, and `?notrack=0` clears it.
- Correction to Setup. `?nopatch=1` has nothing to do with PostHog: under it PostHog loads as usual. `track()` does nothing when PostHog isn't there: an ad blocker, a host other than `carlton.dev`, or `notrack`. The background controls and dragging still work under `?nopatch=1`, so `patch_used` still fires there.
- Events, as built:
  - `case_finished` fires when half the next-case card is in view, once per page.
  - `link_out` covers `mailto:` and any site other than `carlton.dev`; a middle click counts. Links inside DomainClaim's live demo aren't counted, because it runs in an iframe.
  - `demo_touched` counts demos marked `data-demo` (Operator's `demo`), once per demo per page. A pointer down inside DomainClaim's iframe is passed on to the page; the product's own messages never count.
  - `demo_reset` counts every RESET click, and Campus's "back to stars".
  - `patch_used` fires once per kind per page: `drag` (a header pressed and moved), `slider`, `chip` and `palette` (the PAL chip or a swatch).
  - `mode_changed` comes only from the PATCH / READ toggle, never from a switch forced by screen width.
- Recordings. The contact page's relay readout and its "sent" text show the visitor's email, so both are hidden in recordings (`ph-no-capture`), on top of the masked inputs.
- REC chip. Its states are named with `aria-label`, not `title` (the site has no `title` tooltips). Below 1280 px it is the size of the OPS chip, and at 500 px and under it shows only its glyph.
- Consent operator. Changed from the prototype after review:
  - In PATCH it appears under the REC chip, where it opens when reopened. In READ it sits at the bottom of the reading column. On phones it spans the width.
  - No cable.
  - On a first visit it comes in half a second after the page: 220 ms, 16 px, fading in, down from the top in PATCH and up from the bottom in READ. This replaces "no entrance animation". It still floats, so nothing on the page moves.
  - After an answer it is hidden (`display: none`) instead of removed, because it persists across page changes.
