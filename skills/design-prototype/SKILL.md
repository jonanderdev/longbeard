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

A prototype they approve (in `.longbeard/design/prototype/`, gitignored), then **`DESIGN.md`**, committed. Then `design-figma`. Read [design-rules.md](references/design-rules.md) before the first screen: it is the checklist here and in `design-check`.

**At every stop,** say what is new and the one question, in up to five lines: a path or a sheet instead of pasted content, one line per option, nothing they already know.

## Gate

1. No `docs/design/design-direction.md` → `design-direction`. No `docs/design/design-identity.md` → `design-identity`. Stop, and say which.
2. `DESIGN.md` exists with token tables (rows like `color/ink`) → **Feature loop**.
3. Otherwise → **First pass**. A `DESIGN.md` with no token tables is one they brought: say this writes ours, and ask before replacing it.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

Read the brief, the design brief, the identity, the direction and `design-content.md` if there. The chosen first screen is `.longbeard/design/direction/prototype/first.html`; if it is gone, rebuild it from the direction's composition and the identity, and say so.

**At `pace: quick`:** options only when asked (build the one that follows the first screen, and name the fork). States, contrast, the walks and the five-second check are never skipped.

## First pass

### 1. Finish the first screen

`first.html` is a fixed 1440×900 page. Build `home.html` (or the brief's first key screen) from it as a real, responsive page, on one stylesheet every key screen shares, and compare captures at 1440: it must still be the screen they chose. Then:

- **Faces** loaded at every size. A stand-in face is said again.
- **Spacing:** as built, 0.8 and 1.25 (margins and gaps scaled), whole and on a crop where margin meets navigation. They pick.
- **The rest of the page:** below the first screen, small text, every width down to the phone.
- **Motion:** exactly the design brief's `motion` line, nothing beyond (`none` is state changes only). Build from the direction's `motion:` line: replay its base reference (`capture.mjs <url> --frames 12`), build that motion in CSS, and say whose it was. Honour `prefers-reduced-motion`.
- **What waits for the prototype** (the direction's `for the prototype` line): placed in the composition's own system, never shrinking the headline or tidying a device. Where it forks (the full list here, or a line and a link), two or three options.
- **The ownable**, finished. **The states** reachable here (empty, loading, error), and the second theme if asked for.

### 2. The other key screens, in one go

> I'll prototype <the menu>, <screen>, <screen>. Change the list?

Then build them all, linked, in the identity and the direction; one menu, one card, one row, one heading style everywhere.

- **Layout:** from a moodboard reference that shows that kind of screen (never its content), any family; else from the first screen.
- **The direction's devices carry over:** overlaps, crops, giant type, empty space appear on every screen, never tidied (`data-crop` on text cropped on purpose). Each screen gets the direction's touch-up: contrast where text sits, its items and primary action present, nothing plainly broken.
- **Density** as the design brief's `dense` asks: airy 1–2 shows less, dense 4–5 shows more and keeps spacing tight.
- **Real content:** copy in the voice, the longest real names, every section a person needs. Follow `design-content.md`; without it, draft only from what the brief gives and say what they must supply. Say the copy is a draft. Pictures: theirs or the subject's stand-ins in `.longbeard/design/pictures/`; never grey boxes, never a reference's subject.
- **States:** empty, loading and error where reachable (`?state=empty`), every width, each theme.
- **Marked, not hidden:** `data-standin="picture"` or `"fact"` (with `data-standin-note`) on anything the product does not really have yet.

A pattern that brings a feature the brief does not have is named; kept, it is a product change (`idea`) first.

### 3. Show it, and name the forks

Give the paths, one line per screen. Name every fork (a screen the references arrange in clearly different ways, or where you had to choose); never pick silently.

> Click through. Want options anywhere? I'd offer them for <forks>.

**Options**, only at a fork or when asked: two to four layouts from different references, on one sheet (`sheet.mjs`), never ranked. Nothing fits → `design-moodboard`, one piece.

### 4. Self-check

Capture every screen and state at desktop and phone, each theme, and run the scripts. Fix what fails before they see it.

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/prototype/home.html?capture" --out <scratch>/home.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/prototype/home.html?capture" --out <scratch>/home-phone.png --width 390
node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/prototype/home.html" --wait-title ready
node <skill>/scripts/rules.mjs "file://$PWD/.longbeard/design/prototype/home.html" --screen home
node <skill>/scripts/links.mjs "file://$PWD/.longbeard/design/prototype/home.html"
```

- **Contrast** reads the whole page down to `--max-height` (`--level AAA` at that brief). Exit 1 is a failing text, 3 a run that did not finish; "not read" texts are unchecked, never passed.
- **Rules,** in order: Idea, hard (structure, contrast, targets, focus, states, labels), then soft. `rules.mjs` measures what a browser can (sideways scroll, small targets, unlabelled inputs, invisible focus, placeholder copy, clipped text) and counts rounds per screen: fix after every run; at "rounds used up", stop and say what is open. A wrong finding is waived with a reason (`--waive <id> --reason "…"`), still shown. Overlap, collision, alignment and empty space are the look: only your eye judges them.
- **Links:** every broken link, dead button and page with no way on is fixed. It also lists the stand-ins, and `unmarked` for an unmarked stand-in picture: mark it.
- **Flow walks:** for each flow in the brief, one fresh agent (on `sonnet` where you can choose) gets the first page and the goal in the person's words, never the steps, clicks through with the browser it has, and says where it went, hesitated, and whether it got there. A failure or a wrong turn two take is fixed inside the identity and the direction. No clean agent: walk it yourself and say it is weaker.
- **The five-second check,** once, here: the same three strangers see the first screen (against the design brief's takeaway) and each key screen (against what it is for): [five-second.md](references/five-second.md). The first screen's result is `DESIGN.md`'s `five seconds:` line.

Then show them, in a few lines: what the walks and the five-second check found and fixed, anything against the design brief (its words and never word, its never, could it be mistaken for what it must stand apart from), and **what they still supply**: each stand-in from `links.mjs`, one line each, by screen. They give the real one, confirm it, or leave it listed. Ask whether this is the product; iterate until it is.

### 5. Approve: write `DESIGN.md` in one go

Only on their yes to the rendered prototype (and the `decides` person's, if named). Write the whole file from [design-md-template.md](references/design-md-template.md):

- **Contrast first:** every text, control and focus pair through `contrast.mjs` (4.5:1 body, 3:1 large and non-text; AAA: 7 and 4.5). Never a failing pair, except a liked colour kept: `WARN liked, kept` after the ratio, its why under Decisions.
  ```
  node <skill>/scripts/contrast.mjs "#1b1b1f on #fafaf7" "#c2410c on #fafaf7:mark"
  ```
- **Themes:** each colour token once, a value per theme, every pair checked in each.
- **Tokens are code names** (`color/ink`, `type/body`, `space/md`, `radius/md`, `motion/enter`), the same in Figma. Colour, type, spacing, radius and motion are tables; the direction's `finish:` is the Finish line; the identity's **Adjusted** lines are built in.
- **The token block** is generated from the tables, never written by hand: `node <skill>/scripts/tokens.mjs DESIGN.md --name "<product>"` (exit 2 names a row it cannot read; `--check` exits 1 when block and tables disagree).
- **What makes it this design** goes under Components, with values. **Soft rules overridden on purpose** go under Decisions, with the reason.
- **Still to supply:** `links.mjs` again, then the list by screen, in words, never a file name; "nothing" when empty.
- **Ideas, not sources:** no reference, site, person, link or `.longbeard/` path.

Then `design-check` docs mode on `DESIGN.md` and `docs/design/` (it runs `tokens.mjs --check`), and fix what it finds. Next: `design-figma`.

## Feature loop

A feature with screens, once `DESIGN.md` exists.

- **Only existing parts:** compose the screens in Figma (`design-figma`) with their states; no prototype.
- **New parts:** prototype only them, on the real screens around them, in `.longbeard/design/<feature>/`, with 2–3 options where a choice is open, then the self-check.
- `DESIGN.md` gets entries (a token, a component, a dated decision, an item to supply), never a rewrite; `tokens.mjs` refreshes the block.
- **Identity changes need their own yes,** one at a time, rendered. A rebrand is `design-identity` again.

## Do not

- Write `DESIGN.md` before they approve a rendered prototype, or rewrite it in a feature.
- Change the identity or the direction's composition while building screens: say it, and send it back.
- Pick a fork silently, or rank options.
- Ship a screen with grey boxes, lorem, or an item it needs missing.
- Name a reference anywhere that is kept.
