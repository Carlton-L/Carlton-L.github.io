# Workflow

Adopted: 2026-10-22 · Version: 1
Owner: Carlton Lindsay
Integration branch: astro
Required checks: npm test
Tracker: GitHub Issues (Carlton-L/Carlton-L.github.io)

This file is the authoritative workflow for this repository. It changes through a PR, and each change bumps the version.

## Principles

- Preserve knowledge, not necessarily documents. Keep requirements while they are authoritative, decisions while their reasons matter, and tests wherever behaviour can be checked. Throw away the scaffolding once it has done its job.
- The amount of process scales with the consequences of getting the work wrong. A typo gets a passing check. A change to auth or data gets every step below.
- One writer per thing: one agent per worktree, one agent per PR body, one person (the owner) per commit.

## 1. Documents and their authority

| Document | What it holds | Where | Authority |
|---|---|---|---|
| Product contract | Intended behaviour that isn't obvious or has to survive a rewrite | `docs/product/`, created with the first one | Current intended behaviour |
| Accepted RFC, not superseded | A design, the options, the decision, with its dated changes | `docs/rfc/` | Current design and its reasons |
| Accepted ADR | One significant decision that no RFC records well enough | `docs/decisions/`, created with the first one | Current decision |
| Current prototype | Look and interaction intent | `docs/prototypes/` | Current visual intent |
| Superseded RFC, ADR, contract or prototype | What was decided before, and why | Where it was | History. Context only |
| Plan | Scope, steps and checks for one change | `.agent-work/` (ignored) or the draft PR body | Agreed scope for this change only |
| PR | What was delivered, checked, changed and deferred | GitHub, and `git log` through the squash commit | Change record |
| Code | What the software does | The source folders | The actual implementation |
| Tests | What has been checked | The repository's test layout | Evidence that a behaviour holds |
| CLAUDE.md | How agents work in this repository | Repository root | Working instructions. May summarize an invariant and point to its source, but is never that source |

**Conflicts.** When code or a test conflicts with a current authoritative document, the agent investigates and flags it. It changes neither one on its own. A superseded document is context: it is never an instruction to bring old behaviour back.

**Contracts and tests.** A testable requirement gets a test. A requirement that needs explanation keeps a written contract as well, because a test checks one case of it and the contract says what was meant. Some requirements can't be tested at all ("prefer direct manipulation over modal dialogs"); those live only as a written contract. The test suite is never a complete statement of intended behaviour.

**Status lines.** Every RFC, ADR, product contract and prototype carries a status near the top (an HTML comment in a prototype): `draft`, `accepted` or `current`, or `superseded by <link>`, with a date.

**RFC lifecycle.**
- A draft can be edited freely.
- At acceptance the proposal and its decisions become fixed. After that the RFC only gets status changes and dated entries in a "Changes after acceptance" section at the end.
- When most of an RFC is overturned, a new RFC supersedes it, and the old one gets a single "Superseded by" line.

**ADR lifecycle.** Fixed once accepted. A changed decision gets a new ADR that supersedes it.

## 2. Branches, merging and permissions

- Every independently reviewable change gets a short-lived branch off the integration branch named in the header.
- Two agents in one repository means two worktrees. A new worktree checks out the tracked files and nothing else: untracked and ignored files from other worktrees (plans, `.env`, build output) aren't there.
- Work reaches the integration branch through a PR, squash merged. The repository is set to use "Pull request title and description" as the squash message. GitHub adds the PR number to the title. Before merging, the PR body is reconciled into the final delivery record, and the squash message is checked before confirming.
- The required checks are listed in the header. They run on every PR, and branch protection blocks a merge when one fails. Skipping a required check is an exception, written down in the PR with the reason.
- Doc hygiene checks run as their own script and their own CI step, kept apart from the product tests.

**Who does what**

| Action | Who |
|---|---|
| Edit files in its assigned worktree | Agent |
| Stage changes and propose a commit message | Agent |
| Create a commit | The owner only |
| Push a branch | The owner |
| Open a draft PR, edit its body, comment | The implementing agent, when the owner asks. Other agents comment only |
| Merge a PR | The owner |
| Rewrite published history, force push | The owner, after a check |
| Deploy or touch production | The owner, explicitly approved each time |
| Add a dependency, run a destructive command, run a migration, send data to a new external service | Agent asks first |
| Production credentials | Never given to an agent |

## 3. Plans

**How much plan**

| The work | Plan |
|---|---|
| A 20-minute fix | None, or a local plan |
| A feature done in one session | Local plan |
| A feature over several days | Draft PR once there is a first commit |
| Another agent or person needs the context | Draft PR |
| Work that needs feedback along the way | Draft PR |
| Context needed on another machine or worktree | Draft PR |
| A decision with lasting consequences | RFC or ADR, whether or not there is a draft PR |

**Promotion check.** At each milestone, and whenever the scope grows, ask whether the plan should move up a level. A plan moves Local → Draft PR → Final PR, each step at most once, and never moves back down. A local plan has no backup, so several days of important work is a reason to promote on its own.

**Which copy is authoritative**
- Before promotion: `.agent-work/<branch>.md`.
- After promotion: the draft PR body. The agent reads it with `gh pr view` and writes it with `gh pr edit`. A local copy is allowed as an editing buffer: fetch it from the PR before editing and push it back right after.
- A PR needs a commit ahead of the base branch. For a plan that deserves a draft PR on day one, the owner starts the branch with `git commit --allow-empty -m "chore: start <feature>"` (the squash removes it).

**What a plan holds**
- Goal, in one or two sentences.
- Acceptance criteria, each with its verification method: a test, a command, or a browser state.
- Out of scope.
- Steps.
- Current state, for work over more than one session: the last milestone finished, the next action, blockers, and the checks still to run. Updated at each milestone.

Write the plan inside the worktree it belongs to, after creating the worktree.

## 4. Starting or resuming work

Before changing anything:

1. Check the branch, the worktree and `git status`.
2. Look for a PR for this branch. If there is one, read its body and comments. If not, read `.agent-work/<branch>.md`.
3. Read the current contracts, RFCs and ADRs that the work touches.
4. Check the plan's current state against the code, the tests and the commit log. Documented progress can be wrong.
5. Name the next action and any blockers before starting it.
6. If a plan already exists, continue it. Never write a second one.

Then run the promotion check.

## 5. When something changes mid-task

| What happened | What to update |
|---|---|
| A better way to build it, same behaviour | The plan. A line in the PR if a reviewer would wonder |
| A requirement added or dropped | The acceptance criteria, the product contract if there is one, and "Changes from the plan" in the PR |
| A decision inside an accepted RFC's scope changed | A dated entry in that RFC's "Changes after acceptance" |
| A significant decision no RFC records | A new ADR |
| A current decision reversed | A dated RFC entry or a new ADR. The old record gets "Superseded by …" |
| Work pushed to later | A tracker item, linked from the PR |
| A design question left open | The RFC's open questions |
| An implementation or product question left open, with no RFC | A tracker item |

In a draft PR, a consequential scope change also gets a PR comment with the reason. The body shows the current scope; the comments show how it got there.

**Three kinds of stop.** Approval and documentation are separate gates.
- **Ask first** (no document needed): a new dependency, a destructive command, a migration, anything in production. Record the reason in the PR.
- **Write it down**: two workable approaches where the choice constrains later code, or reversing a current decision. A dated RFC entry or an ADR.
- **Both**: a new external service, data leaving the product, or a change to privacy or security.

**Too big to review.** When a diff grows past what one sitting can review, split it into PRs that each merge on their own, each with its own criteria. Stack PRs only when they depend on each other.

## 6. Checking the work

- Acceptance criteria and their verification methods are agreed before substantive implementation.
- Tests are written before or alongside the implementation where practical. Tests found along the way are welcome. They never quietly replace an agreed criterion.
- **Whole-diff review.** Before merging, read the complete diff against the integration branch. Every change should be intentional, inside the accepted scope, consistent with the existing architecture, and no more complex than it needs to be. Passing criteria doesn't excuse an unrelated change.
- **Independent review** is standard for anything beyond a small change: a fresh session that gets the acceptance criteria and the diff. It doesn't get the implementer's summary. A small change gets its checks and the whole-diff read.
- **UI** gets run in a browser: the repository's widths, the keyboard, and a look from the owner. A prototype shows the intent. It doesn't prove the build matches it.

## 7. Done

All accepted, in-scope criteria are met before merge, unless a scope change was approved and recorded. When a feature spans several PRs, this holds for each PR's own criteria.

Before deleting the plan, reconcile:
- every acceptance criterion (met, with evidence, or recorded as changed),
- every scope change,
- every significant decision,
- every open question,
- all unfinished work.

Each goes to its home from section 5, or into the PR body. Completed steps that carry no lasting information are thrown away. Delete the plan before removing the worktree.

## 8. PR template

```
## Purpose
## Acceptance criteria
- [x] criterion (evidence: test name, command output, screenshot)
## Delivered
## Verification
## Decisions
## Changes from the plan
## Deferred
## Risks and rollout
```

## 9. Keeping docs true

- Status lines as in section 1. Anything that could be mistaken for current direction gets marked `superseded` or is removed.
- The hygiene script checks at least that every RFC and ADR has a status line, and that nothing under `.agent-work/` is tracked.
- A durable document earns its place by staying useful after the code changes. When it stops, move what still matters and delete it.
- After a few real features, review the policy: are local plans going stale, does the draft PR need too much syncing, are the RFC and ADR thresholds too low or too high. Shorten what proved unnecessary.
