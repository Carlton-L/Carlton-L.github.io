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
