# Case study playbook

How a case study on carlton.dev is shaped, why, and what to check before it ships. Written after the DomainClaim case study (September 2026). Futurescaper and DomainClaim are the reference pages: `src/pages/projects/futurescaper.astro` and `src/pages/projects/domainclaim.astro`.

## What a case study is for

A case study shows decisions. What the problem was, what I decided, why, and what it changed. It also shows care: every error state, every kind of user, the phone as well as the laptop. The live demo is the proof, so the page is built around it.

A case study stands on its own. It doesn't say who the work was for, what process it came out of, or how it was judged. Anything like that goes on the page only when I say so.

## The shape

Futurescaper is the template. Top to bottom:

1. **Title card.** Meta line, headline, one short paragraph on what it is, the live and repo links.
2. **Ownership card.** Right after the title, in the page source as well as in the layout. PATCH mode puts it top right. READ mode and phones stack cards in source order, so it lands second there too.
3. **A demo that plays by itself.** The product's own animation or home-page demo, wide and centered. It gives the visitor the idea before they read anything.
4. **The problem and the decisions.** A short run of cards. What goes wrong, the research behind it, then numbered decisions.
5. **A section break, then the live demo.** The break slows people down before the part they should play with. One short "Try it" card sits between the break and the demo.
6. **A little more.** What the demo proves, the rules the design followed.
7. **Optional breaks for the code and the process.** Only when those sections hold real code, real files, or the concepts and passes.
8. **Outcome and next.** What is live, what was designed and not built, and a link to the next case study.

## Rules for the page

- **Few section breaks.** Three is plenty. A break goes only where the visitor should slow down. Never put one before a section without interesting content.
- **Cut cards that don't earn their place.** Text cards run about 30 to 90 words. If a card restates another, merge them or drop it.
- **Cards never change height.** A height change resets the dither background. Anything that changes inside a card has a fixed height at each width. For a set of variants (the states on DomainClaim's state card), stack them all in one grid cell and show one: the card is as tall as the longest variant at the current width, and switching never moves the page.
- **Author in reading order.** READ mode stacks cards in source order, so the source order is the reading order on phones.
- **The process shows the real artifacts.** An old screen becomes the "first pass". Concepts appear in the order they're shown, the first tab is selected, and each one says whether it was picked. Two design passes are presented as two passes, without claiming they were planned from the start.

## Demos

- **Real code first.** A VIEW runs the product's own components, ported from whatever stack it was built in. The method is in `docs/DEMO_PORTING.md`. When that isn't allowed (FAST and the Engine), the demo is a recreation and the label says so.
- **Honest labels.** `DemoFrame` marks every demo LIVE (real product code, synthetic data) or RECREATION (real behavior, portfolio code).
- **When something can't run in a browser**, show the product's own honest state for it. DomainClaim's demo can't query DNS, so a real domain typed into it gets the product's "the check could not run".
- **Real data by choice.** When a demo needs real-world data (site icons, a real domain), pick it on purpose, write the choice down in the port's `PORT.md`, and mention it on the page if a visitor would wonder.
- **Say that it's clickable.** People assume a frame is a picture. The "Try it" card says plainly that everything in it works.
- **One demo, its controls under it.** A demo that needs controls (a state picker) gets them inside the same frame, under the view. Two cards side by side split attention.
- **No pop-in.** Every demo that loads code (an island, an iframe, a library from a CDN) sits in a `ViewSlot` (`src/components/ViewSlot.astro`). Content an inline page script draws at once needs no slot. The slot's box has its final size before any script runs, it shows a COOKING VIEWER poster until the content is ready, then fades it in. React demos are rendered on the server (`client:load` for a hero, `client:visible={{ rootMargin: '600px' }}` further down), never `client:only`, so their real markup holds the space.
- **Nothing animates off screen.** Every animation runs only while it is on screen and the tab is visible: `Patch.onScreen(el, fn)` in page scripts, `useOnScreen(ref)` in React.
- **An iframe never moves.** Moving an iframe's element reloads it, so a demo in its own document can't use the DUO corner dock.

## The two kinds of demo

**Hero previews** open the page, right after the title and ownership card.

- It plays by itself and can't be interacted with. It loops, and pauses off screen.
- It is wide and centred (`maxw={900}`), with a fixed aspect ratio, and loads with the page (`client:settled`: at once on a direct load, after the page change when reached by a link).
- It shows the product doing its one thing, with no explanation needed: Futurescaper's map drawing itself, DomainClaim's check landing step by step, the Engine's run.
- With reduced motion it shows a settled frame.

**Interactive demos** come after a section break and a "Try it" card, and are the product itself, as close as allowed. There are three kinds, in this order of preference:

1. **The product's own code, in its own page** (`ProductFrame`, DomainClaim). The most faithful, and possible from any stack (`docs/DEMO_PORTING.md`).
2. **The product's real logic in a portfolio-built screen** (Futurescaper's layout algorithm, GRID's sim). Use it when the product's screens can't be separated from its backend.
3. **A recreation** (FAST, the Engine's agent card), when the real code can't be published. The label says RECREATION.

A demo with a separate controller and viewer (GRID's app and 3D studio) uses `LinkedViews`: one shared state, a cable that pulses on every change, and the corner dock.

## Parts

Case-study cards that repeat are components in `src/components/case/`, styled once in `src/styles/case-study.css`: `SectionBreak`, `DecisionCard`, `OwnershipMeter`, `NextCase`. Use them; don't copy their markup. Page-specific cards stay on the page.

**Reading order.** `caseOrder` in `src/data/content.js` is the order of every case study: the homepage's seven (`homeOrder`), then the rest in the /projects page's order, then back to the start. `NextCase` reads it, so each case study's last card is a button to the next one, with that project's `teaser` under its name. A new case study goes into `caseOrder` and gets a `teaser`.

**Large links** use `LinkButton` (`src/components/LinkButton.astro`): an icon cell, a label, a line that says where it goes, an arrow. `GithubButton` and the next-case button are built on it.

## Controls and affordances

- Clickable means a green outline (`--signal`). Hover adds a faint green fill.
- Something disabled or "available later" keeps the same shape, dashed and grey. Nothing moves when it goes live.
- Large link buttons use `src/components/GithubButton.astro` (variant A in `docs/prototypes/github-button.html`).
- A link to one source file uses `src/components/SourceButton.astro`: the same button with a file icon and the path under the label.
- Code excerpts use `src/components/case/CodeExcerpt.astro`: plain text, no syntax colours, the file path underneath. Keep lines under 46 characters so nothing scrolls at 1280 wide or on a phone.
- The main control of a demo gets a real button, wide enough to hit on a phone. Small arrows in a corner read as decoration.

## Copy

- Copy lives in `src/data/content.js` and follows my register (`CARLTON_REGISTER.md` in the Carlton Portfolio folder). Short declarative sentences, concrete nouns, no em dashes, no "X, not Y".
- Claude brings copy as a few options with one recommended. I pick.
- Facts are checked against the project's ground-truth notes before they go on the page.

## How we work on it

- **Prototype new pieces in HTML first.** A few directions, one recommended. The picked one becomes a component, and the prototype is saved in `docs/prototypes/`.
- **Screenshots every round.** 1440, 1280, 768 and 375 wide, in PATCH and READ. When a demo changes state, the page height has to stay the same.
- **Claude edits, I commit.** Before overwriting a file in my working copy, Claude checks it still matches what was last delivered. Commit messages are mine: conventional, short, no AI mentions.
- **Commands name their folder.** A git command meant for another repo starts with `cd` into that repo.

## Before it ships

- [ ] The ownership card is second in the page source.
- [ ] No more than three section breaks, each before something the visitor should slow down for.
- [ ] Every text card is under about 90 words and says something no other card says.
- [ ] Every demo is labeled LIVE or RECREATION, and the "Try it" card says it's clickable.
- [ ] Every demo that loads code is in a ViewSlot, and every animation pauses off screen.
- [ ] Switching every demo state leaves the page height unchanged, and nothing shifts while demos load (layout shift 0 in Playwright).
- [ ] Screenshots at 1440, 1280, 768 and 375, PATCH and READ, reviewed.
- [ ] No mention of who the work was for or how it was judged, unless I asked for it.
- [ ] Every fact on the page is in the ground-truth notes. No Futurity client names.
- [ ] Links work: live site, repo (or its "available later" state), next case study.
- [ ] The build passes, and the demo island is under 300 KB gz.

## Things that break quietly

- Astro drops a `<p>` whose text starts with `//`. Write it as `{'// …'}`.
- READ mode forces paragraphs inside operators to 15px. Demo panes that need their own text size use `div` elements.
- `.chipbtn` isn't styled on case-study pages. Give tabs their own class.
- A static preview server dies when `dist` is rebuilt. Restart it after every build.
- Never put `scroll-behavior: smooth` on `html`. It turns the router's jump to the top and the back button's return into slow glides. A link that should glide does it itself. `src/lib/scroll-hold.js` keeps the page where the router put it until the visitor scrolls.
