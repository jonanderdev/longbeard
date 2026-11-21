---
name: design-prototype
description: >
  Design the product's key screens in the chosen direction and identity: the
  first screen finished, the other key screens prototyped in one go with real
  copy and pictures, every reachable state, options only where a layout really
  forks. On their yes to the rendered prototype, writes DESIGN.md in one go,
  contrast-checked. Runs when docs/design/design-direction.md and design-identity.md exist and there
  is no DESIGN.md, or for a feature that needs screens once DESIGN.md exists.
---

# Design prototype

**Needs:** `docs/design/design-direction.md`, `docs/design/design-identity.md`  
**Uses if there:** `docs/design/design-content.md`, `docs/design/design-moodboard.md`  
**Writes:** `DESIGN.md`

Comes out: a prototype they approved (in `.longbeard/design/prototype/`, gitignored), then **`DESIGN.md`**, committed, the official look. Then `design-figma`.

Read [design-rules.md](references/design-rules.md) before the first screen: it is the checklist here and in `design-check`.

## Gate

1. No `docs/design/design-direction.md` → `design-direction`. No `docs/design/design-identity.md` → `design-identity`. Stop, and say which.
2. `DESIGN.md` exists → **Feature loop**.
3. Otherwise → **First pass**.

Read the brief, `docs/design/design-brief.md`, `design-identity.md`, `design-direction.md`, and `design-content.md` if it exists. The chosen first screen is `.longbeard/design/direction/prototype/first.html`. If the private folder is gone, rebuild the first screen from `design-direction.md`'s composition and the identity, and say so.

**At `pace: quick`** (the design brief): options only when they ask, never offered at a fork (build the one that follows the first screen, and name the fork). Everything else is as full: the states, contrast, the walks and the five-second check are what make it work, and quick never skips them.

## First pass

### 1. Finish the first screen

The chosen screen, `first.html`, is a fixed 1440×900 page built from their references: the reference, not the page. Build `.longbeard/design/prototype/home.html` (or the brief's first key screen) as a real page from it: the same composition, type, colours, content and devices, responsive, on one stylesheet (and script) that every key screen shares. Keep `first.html` open beside it and compare captures at 1440: the first screen must still be the one they chose. Then finish it:

- **The faces** loaded properly at every size. A stand-in face is said again: the product ships it, or the face it stands in for.
- **Spacing:** as built, tighter and looser (the same page with its margins and gaps scaled to 0.8 and 1.25), shown on a crop where the margin and the navigation meet as well as whole. They pick.
- **The rest of the page:** what sits below the first screen, the small text, every width down to the phone. The direction's ranges hold.
- **Motion,** exactly what the design brief's `motion` line picks, and nothing beyond it. `none` is state changes only, no entrances. How much: quiet is fades only; present adds moves that guide the eye; leading makes motion part of the identity. Driven by: only the triggers it names (scroll, cursor, time). Character: each named character (physics: inertia, springs, weight; smooth: eased, calm; snappy: fast, crisp) where the line says it applies. Moments: only those it names. A pick the line leaves out is not built. A reference that moves is played again from its frames or its live link (`capture.mjs <url> --out .longbeard/design/prototype/<name>-replay --frames 12`); build that kind of motion in CSS, none of its content, and only within the picks. Every motion honours `prefers-reduced-motion`.
- **What waits for the prototype.** The grid screen carried only what its reference carries; `design-direction.md`'s `for the prototype` line lists the rest the first screen needs (a second action, the full list, pickup times). Place each in the composition's own system: aligned to what is there, in its type sizes, never shrinking the headline or tidying a device to make room. What does not fit the first screen goes below it or onto the screen it belongs to. Where it forks (the full list on the first screen, or one line and a link to it), build two or three options and let them choose (at `pace: quick`, the one that keeps the first screen as chosen, and name the fork).
- **The ownable**, finished from the product's own world.
- **The states** a person can reach here (empty, loading, error), and the second theme if the design brief asked for both.

### 2. The other key screens, in one go

List them once, navigation's details first (the menu open, on scroll, on a phone):

> I'll prototype <the menu>, <screen>, <screen>. Change the list?

Then build them all, linked so they click through, in the identity and the direction. Build once and reuse: one menu, one card, one row, one heading style everywhere.

- **Layout:** where a moodboard reference shows that kind of screen, take its layout (never its content), from any family; the look is already fixed. Where none does, it follows from the first screen.
- **The direction's devices carry over.** Overlaps, collisions, crops, giant type, wide empty space: the chosen screen's moves appear on the other screens too, never tidied away. Each screen gets the same light touch-up as the first: contrast where text sits, every item the screen needs and its primary action present, nothing plainly broken. A screen is not done until it reads right *and* still looks like the chosen one.
- **Density** as the design brief's `dense` asks, on every screen: how much sits on a screen, row heights, how much is shown before "more". An airy 1–2 shows less and lets it breathe; a dense 4–5 shows more per screen and keeps spacing tight.
- **Real content, complete.** Copy in the voice, the longest real names, every section a person needs to act, and everything under `for the prototype` that belongs on this screen. With `design-content.md`, follow it. Without it, draft the copy and the sections yourself from the brief and the design brief, and say they are drafts. Pictures: theirs, or the stand-ins of the product's own subject in `.longbeard/design/pictures/` (more with `pictures.mjs`, or a full set planned with `design-content`); never grey boxes, never the references' subject.
- **States,** once a screen is settled: empty, loading and error where reachable (`?state=empty`), every width, each theme.

A pattern that brings a feature the brief does not have is named when shown: kept, it is a product change (`idea`, Change) before `DESIGN.md`.

### 3. Show it, and name the forks

Give the paths and say what each screen is made of. Name every fork: a screen the references arrange in clearly different ways, or one where you had to choose. Never pick among them silently.

> Click through. Want options anywhere? I'd offer them for <forks>.

**Options, only at a fork or when asked:** two to four layouts, each from a different reference (or one that follows the first screen), built inside the prototype, captured on one sheet (`sheet.mjs`), never ranked. They pick, mix or ask for more. Nothing fits → `design-moodboard`, one piece, then back.

### 4. Self-check

Capture every screen and state at desktop and phone, each theme:

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/prototype/home.html?capture" --out <scratch>/home.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/prototype/home.html?capture" --out <scratch>/home-phone.png --width 390
node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/prototype/home.html" --wait-title ready
```

Check them against the rules: Idea first, then hard (structure, contrast, targets, focus, states, labels), then soft. Fix what fails before they see it.

**Walk the links.** Every page the key screens list, reached by clicking from the first:

```
node <skill>/scripts/links.mjs "file://$PWD/.longbeard/design/prototype/home.html" --expect menu,product,basket,checkout
```

It says each broken link, each link or button that goes nowhere, each page with no way on, each key screen no click reaches, and how many clicks each page is from the start. Fix every one before they see it. A key screen deeper than its flow needs is said.

**Walk the flows.** For each flow in the brief, one fresh agent that knows nothing of the product: a new agent or a clean session, given the first page's path and the flow's goal in the person's words, never the steps ("you want a sourdough for Saturday pickup"). It uses the browser it already has (a browser tool, or Playwright from a script: never a browser tool written for the job) to click, fill and choose through the prototype like a person, and says where it went, where it hesitated, and whether it got there. A flow it cannot finish, a wrong turn two of them take, or a step it calls unclear is fixed inside the identity and the direction: a label, a missing link or action, an order of sections. No agent can be started clean: walk it yourself, say so, and say it is weaker.

**The five-second check** on the first screen and each key screen, with what each screen is for as its takeaway: [five-second.md](references/five-second.md). Then show the screens with what the walks and the five-second check found and fixed, ask whether this is the product, and iterate until it is. Check it against the design brief too, as facts said with the screens: its three words and never word, its never, and apart from (could it be mistaken for the kind of product named there?).

### 5. Approve: write `DESIGN.md` in one go

Only on their yes to the rendered prototype, and, when the design brief's `decides` names someone else, once that person has seen the paths and it holds. Write the whole file from [design-md-template.md](references/design-md-template.md): idea, voice, colour, type, spacing, components, decisions.

- **Contrast first.** Every text and background pair, and every control against its ground, through `contrast.mjs` (4.5:1 body, 3:1 large and non-text; at the design brief's AAA, `--level AAA`: 7:1 body, 4.5:1 large). Never write a failing pair. The level goes in `DESIGN.md`'s Accessibility line.
  ```
  node <skill>/scripts/contrast.mjs "#1b1b1f on #fafaf7" "#c2410c on #fafaf7:mark"
  ```
- **Themes:** each colour token once, a value per theme, every pair checked in each.
- **Tokens are code names** (`color/ink`, `space/md`); Figma uses the same.
- **What makes it this design** goes under Components, with values, not adjectives.
- **Soft rules overridden on purpose** go under Decisions, with the reason. A device the chosen look relies on that the rules call a tell is on purpose: write the idea it serves.
- **Ideas, not sources.** Nothing names a reference, site, studio, designer, link or `.longbeard/` path.

Then run `design-check` in docs mode on `DESIGN.md` and `docs/design/`: a picture site, a reference, a link or a `.longbeard/` path left in a committed doc (a copied template's comment counts) is fixed before you say it is done.

Then the next step: `design-figma`.

## Feature loop

A feature with screens, once `DESIGN.md` exists.

- **Only existing parts:** compose the screens in Figma (`design-figma`) with their states; no prototype.
- **New parts:** prototype only them, on the real screens around them, in `.longbeard/design/<feature>/`, with 2–3 options where a real choice is open, then the self-check.
- `DESIGN.md` gets entries (a token, a component, a decision with date and reason). It is never rewritten in a feature.
- **Identity changes need their own yes:** a new colour role, a face, a change to the idea or voice, each shown rendered and approved one at a time. A rebrand is `design-identity` again.

## Do not

- Write `DESIGN.md` before they approve a rendered prototype, or rewrite it in a feature.
- Change the identity or the direction's composition while building screens. Say it, and send it back to that skill.
- Pick a fork silently, or rank options.
- Ship a screen with grey boxes, lorem, or an item it needs missing (the `for the prototype` list included).
- Name a reference anywhere that is kept.
