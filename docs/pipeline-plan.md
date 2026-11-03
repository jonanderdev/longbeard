# Long Beard as a pipeline — plan

Settled in a grilling session on 2026-11-03. This file is the work list. Once it ships, PRODUCT.md and the README carry the result and this file can go.

## What changes

Long Beard stops being a toolbox of 28 skills with a router that settles fights between them. It becomes a pipeline: you start in a fresh project with an idea, the router tells you which stage you are in from the files that exist, and each stage ends by offering the next.

- Public on npm, built for Jon's daily use first. Where the two disagree, daily use wins.
- Long Beard owns everything before code. Matt Pocock's kit owns code, as he publishes it. Figma's skills own Figma mechanics.
- Every stage writes one file the next stage reads. No stage depends on chat history. Any stage can start once its input exists, so an existing project can join mid-pipeline.

## Stages

| Stage | Runs | Reads → writes |
|---|---|---|
| 1. Idea | `idea` (ours), via Matt's `grilling` | the idea, or the repo → `docs/brief.md` |
| 2. Direction | `direction` (ours, the slimmed hunt) | brief → `design-exploration/<slug>/direction.md` (a proposal) |
| 3. Design | `design` (ours): Matt's `prototype` → approve → Figma skills; `design-check` frame mode | direction → code prototype → **`DESIGN.md`, official** → Figma |
| 4. Architecture | Matt's `grill-with-docs`, plus framework add-ons | brief, DESIGN.md → `GLOSSARY.md`, ADRs |
| 5. Plan | Matt's `to-spec`, `to-tickets` | brief flows → specs → tickets |
| 6. Build | Matt's `implement-spec` → `design-check` build mode → Matt's `pr` | tickets → one PR per spec; Jon merges |

No UI (CLI, API, library): the brief says so, and stages 2–3 are skipped.

After the first pass, a feature loops: Idea (the feature) → Direction (optional, one piece) → Design (prototype optional) → Plan → Build. Direction and Architecture rerun only for a rebrand or a new stack.

## Decisions by stage

### Idea
- `docs/brief.md`, one page, ~500 words: problem, who it is for, 3–5 core flows, key screens, surface (site / app / no UI), v1 vs later, constraints, identity nouns, out of scope. No tech choices.
- Grilling in rounds, not wayfinder.
- Features get specs, not brief edits. The brief changes only when the product does.
- An existing project: draft the brief from the README and code, then grill the gaps.

### Direction (rewrite of `design-reference-hunt`)
- Finds inspiration from what Jon likes and from preset sources. Outputs ideas and patterns, not tokens.
- Three opening questions: feel / never feel and loves; pictures or links already liked; where to look and how many (default 8). The rest comes from the brief.
- Cards: name, link, shot, pattern, why it fits. Drop `colour`, `tagline`, `worth taking`.
- Moodboard stays; pick by looking. Scripts kept: `capture`, `contact-sheet`, `moodboard`, `dribbble-cards`. `contrast` moves to Design.
- Output `direction.md`: idea, feel, patterns, ownable, voice, leave, the picked references. A proposal, not official. No persist ask; it ends with "take this into Design?".
- One-piece hunts stay as a mode, usually called from Design when it hits a gap. Same card shape, never touches tokens, reads `DESIGN.md` as the base.
- Folder `design-exploration/<slug>/` (visible, gitignored). First pass is `identity/`; features use their own slug. Parallel explorations never share a folder.

### Design (new)
- Order: read brief, `direction.md`, and the rules → prototype key screens in code (Matt's `prototype`, UI branch, plain HTML in `design-exploration/<slug>/prototype/`, 2–3 variations, real copy and imagery) → self-check against the rules, then show → Jon picks and iterates → **approve: write `DESIGN.md` in one go** (idea, voice, colour, type, spacing, components, decisions; contrast checked) → Figma → offer to delete that exploration's subfolder.
- Prototype only the key screens from the brief (2–4) and their main states. Other screens are composed in Figma from the components.
- Colour and type are chosen here, on rendered screens, not in the hunt.
- Content (copy and imagery) belongs to this stage. Voice comes from the direction.
- Figma is built directly through the MCP. Load `figma-use`, `figma-generate-library`, `figma-generate-design` and follow them. Ours adds only:
  - file layout: Cover, Foundations, Components (from generate-library); one `Screens — <flow>` page per flow or feature; an `Explorations` page by date; approved frames marked **Ready**.
  - order: tokens from `DESIGN.md` → only the components key screens need → key screens → their states. The library grows with features.
  - every screen has empty, loading and error states.
  - Figma variable code names are the token names in code.
- Figma is required for UI projects; no fallback yet.
- Figma is the truth for screens. `DESIGN.md` is the written summary; Design updates it when a Figma decision changes a rule.
- Feature loop: new page per feature, reuse components, `DESIGN.md` gets entries, never a rewrite. Anything that changes the identity needs its own yes; two such changes are approved one at a time. A feature that uses only existing parts skips hunt and prototype.

### Design rules (new reference file)
- `design-rules.md`, ~2–2.5k words, our own text. Ideas drawn from Gestalt, WCAG 2.2, Refactoring UI practice, Apple HIG and Material basics, and taste-skill's tells (MIT, credited).
- Each section: one principle line plus 3–5 checks you can pass or fail from a screenshot.
- Sections: 0 Idea (cover the logo: is it still this product?), 1 Hierarchy, 2 Grouping, 3 Alignment and grid, 4 Spacing rhythm, 5 Typography, 6 Colour, 7 Consistency, 8 States, 9 Affordance and feedback, 10 Accessibility, 11 Copy, 12 Imagery, 13 Responsive, 14 Tells (dated, reviewed each release).
- A shared core plus a short site list and a short app list.
- Hard rules (structure, contrast, targets, focus, states) are the floor. Soft rules (tells, spacing and type defaults) can be overridden by `DESIGN.md` on purpose, with a reason.
- The rules never suggest a look. Direction decides the look, the rules decide execution.
- A reference file, not a skill: read by `design` and `design-check` only.

### design-check (new)
- Frame mode: `design` runs it after each Figma screen. Screenshot, check Idea → hard → soft, fix, then show.
- Build mode: after `implement-spec` on a UI spec. Render with `capture.mjs` at mobile and desktop, compare with the Ready frame on meaning (structure, tokens, copy, states), not pixels.
- Findings: rule, hard or soft, where, fix. Hard blocks: one fresh fix pass, one re-check; what remains goes in the PR body. Soft is reported.

### Architecture, Plan, Build (Matt, unchanged)
- Architecture is `grill-with-docs`; `codebase-design` for module interfaces. The router offers framework add-ons here (for example `longbeard add react`).
- ADRs ride on `code-review`'s standards axis; name and place them so it finds them.
- First pass: one spec per core flow. Later: one spec per feature. Tracker per `setup-matt-pocock-skills`.
- `implement-spec` as published: integration branch, fresh agent per ticket in a worktree, `tdd`, `code-review` at the end, one PR per spec. `pr` writes the body; `design-check` evidence goes in its Before/After.

### Router
- Under 200 words: a stage table (stage, starts when, skill, writes), helpers, add-on hints.
- Three glue lines every agent reads: UI tickets link their Ready Figma frame; UI work follows `DESIGN.md` and that frame; a mismatch with the frame is a bug.
- Add-ons are suggested at the moment they are needed, one line, yes or no.

## Kit

- **Long Beard:** `idea`, `direction`, `design`, `design-check`, plus `design-rules.md`.
- **Matt Pocock:** the whole kit (27 skills, his plugin manifest), one `"kit": true` entry.
- **Figma:** `figma-use`, `figma-generate-library`, `figma-generate-design`, `figma-design-to-code`.
- **Add-ons (optional):** animate, jury, web-design-guidelines, security-audit, image-to-code, framework skills.
- **Dropped:** ponytail (4), premortem, design-taste-frontend, design-md (folded into `design`).

## Work list

In order. Tick as done.

1. [x] **Risk tests.** Each one decides how a skill is written.
   - [x] Figma: discovery and tokens in an empty file with generate-library and generate-design.
   - [x] Matt's `prototype` (read `UI.md`) pointed at plain HTML outside an app.
   - [x] `capture.mjs` against a local app, including one behind a login.
   - [x] `update` in `bin/long-beard.js` removes skills dropped from the catalog.
2. [x] **Catalog** (`beard.json`): one Matt kit entry replacing the 17 single entries; Figma's four; drop ponytail, premortem, taste, design-md; mark add-ons optional; add the four local skills.
3. [x] **`design-rules.md`**: draft, then real word count. Decide where the one copy lives so both skills read it.
4. [x] **`direction`**: rewrite `skills/design-reference-hunt` (rename, slimmer, `design-exploration/<slug>/`, new cards, `direction.md` output). Check `references/sources.md` while there.
5. [ ] **`design`**: new skill. Absorbs what is still needed from `skills/design-md` (contrast, ideas-not-sources, the `DESIGN.md` template), then delete `skills/design-md`.
6. [ ] **`design-check`**: new skill, two modes.
7. [ ] **`idea`**: new skill, small.
8. [ ] **Router**: change the generator in `bin/long-beard.js`, run `npm run router`, check it is under 200 words.
9. [ ] **Docs**: rewrite PRODUCT.md (job, shape, stages, design stack); README kit table; CHANGELOG `Unreleased` with the migration note (what is gone, what replaced it, what to run).
10. [ ] **Tests**: `npm test` green; add a case for removed skills if step 1 shows `update` needs it. (Removed-skills case done in S2: `test/update.test.js`.)
11. [ ] **Smoke**: run the first pass in `../longbeard-smoke` from an idea to Figma, and one small spec through Build.
12. [ ] **Release** as one `0.x` minor, per PRODUCT.md.

## Findings

What each session learned that a later one needs. One or two lines each, newest last.

- **S1 Figma (→ S5, S6).** Empty file to 6 variables with `var(--…)` syntax, 2 text styles, the plan's pages, one component, one composed screen: 4 `use_figma` calls. Works. `design` must say two things Figma's skills push against. First, this team attaches 8 community kits to new files and generate-design says reuse them, so tokens come from `DESIGN.md` and kits are not used. Second, given a rendered UI, generate-design wants a `generate_figma_design` capture (`html_to_figma` is not in this build), so choose capture-as-reference or tokens only. Test screen for S6: file `rbN0HU2znXmJfhLrlrKSmx`, node `1:17`. Keep it.
- **S1 prototype (→ S5).** Matt's UI branch, followed by hand on a plain folder, works: one `index.html`, `?variant=`, floating switcher. `design` must override sub-shape A (use B), the router, NODE_ENV and task runner (just open the file), "skip the polish" (we want real copy and imagery), and the throwaway branch (gitignored folder, winner goes to `DESIGN.md`).
- **S1 capture (→ S6).** Works on localhost and on `file://…?variant=B`. It turns `position: fixed` into in-flow blocks, so the prototype switcher and bottom bars land in the shot. Exit 0 is no login check: a server redirect, or a client redirect inside the first 2.5 s, captures the login page with exit 0. Build mode must compare the final URL with the requested one. Before build mode, add a viewport or mobile flag (fixed at 1440×900) and a cookie flag.
- **S1 update (→ S2).** `update` retires only lock entries with `kit`. Proved on a scratch copy: ponytail went; premortem, design-md and design-taste-frontend stayed. Fix: retire any lock entry missing from the full catalog (optional items included, not `chosen()`, which drops them without `--all`), plus extras and kit expansions, minus `omit`. Keep the edited guard.
- **S2 catalog (→ S4–S8).** `beard.json` has the four local skills as stubs, the `matt-pocock` kit (no `routes` yet, S8), Figma's four, and five optional add-ons. design-md and design-reference-hunt are out of the catalog, but their folders stay for S4/S5. `update` removes any lock entry the full catalog doesn't list, and `--force` removes edited ones too. `skills remove` exits 0 on unknown names.
- **S2 migration (→ S8 CHANGELOG, S9).** animate, jury and web-design-guidelines are optional now, so a plain `update` leaves existing installs alone without refreshing them; use `--all`. Local skills refresh only when the lock `version` differs from the package version, so a project that took the 0.9.0 stubs keeps them until a version bump or `--force`. That, plus the smoke project's edited copies, is why S9 starts fresh.
- **S3 rules (→ S5, S6).** `rules/design-rules.md`, 2,331 words: sections 0–14, 24 hard and 57 soft checks, a site list and an app list, tells dated 2026-11-03. `npm run rules` copies it to `skills/design/references/` and `skills/design-check/references/`, and `test/rules.test.js` fails on drift. S5 and S6 edit only `rules/`, never the copies, and link `references/design-rules.md` from their SKILL.md.
- **S3 choices (→ S5, S6, S9).** The hard target floor is WCAG 2.2 AA (24×24 CSS px), and the app list raises it to 44 pt / 48 dp on touch. Every tell is soft, including the ones taste-skill bans, and the list never names a replacement. State checks (focus, empty, loading, error) are judged from state frames, so a missing frame fails rule 8.
- **S4 direction (→ S5, S8).** `skills/direction/` replaces design-reference-hunt. Card fields are `link`, `shot`, `pattern`, `why`. The moodboard captions with `pattern` and has no product slot, and `sources.md` lost its Colour and type section. `contrast.mjs` is now `skills/design/scripts/contrast.mjs`, so S5 links it from there. The one-piece mode writes a short `direction.md` and hands back to `design`. Old `.design/` paths survive only in files S5 and S8 rewrite (design-md, AGENTS.md, README, PRODUCT, CHANGELOG).

## Open

- How `DESIGN.md`, the brief, and ADRs are named and placed so `code-review`'s standards axis picks up the ADRs.
