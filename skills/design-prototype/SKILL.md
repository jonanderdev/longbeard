---
name: design-prototype
description: >
  Design the product's key screens in the chosen direction and identity: the
  first screen finished, then the other key screens in its frame, with real
  copy and pictures and every reachable state, checked by script. On their yes
  to the rendered prototype, writes DESIGN.md in one go, contrast-checked.
  Runs when docs/design/design-direction.md and design-identity.md exist and
  there is no DESIGN.md, or for a feature that needs screens once DESIGN.md
  exists.
---

# Design prototype

**Needs:** `docs/design/design-direction.md`, `docs/design/design-identity.md`  
**Uses if there:** `docs/design/design-content.md`, `docs/design/design-moodboard.md`  
**Writes:** `DESIGN.md`

A prototype they approve (in `.longbeard/design/prototype/`, gitignored), then **`DESIGN.md`**, committed. Then `design-figma`. Read [Before you build](references/design-floor.md#before-you-build) before building, and apply it while you draw; [the floor](references/design-floor.md) is the checklist here. The direction's **principles** are what every page answers to; the soft rules are `design-check`'s.

**They are the designer; you do the craft.** The chosen screen carries their concept. Develop it across the product, make the craft decisions it leaves open, and add no taste of your own.

**At every stop,** say what is new and the one question, in up to five lines: a path or a sheet instead of pasted content, one line per option, nothing they already know.

## Gate

1. No `docs/design/design-direction.md` → `design-direction`. No `docs/design/design-identity.md` → `design-identity`. Stop, and say which.
2. `DESIGN.md` exists with token tables (rows like `color/ink`) → **Feature loop**.
3. Otherwise → **First pass**. A `DESIGN.md` with no token tables is one they brought: say this writes ours, and ask before replacing it.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

Read the brief, the design brief, the identity, the direction and `design-content.md` if there. The chosen first screen is `.longbeard/design/direction/prototype/first.html`; if it is gone, rebuild it from the direction's composition and the identity, and say so.

## First pass

### 1. Finish the first screen

`first.html` is a fixed 1440 by 900 page. Build `home.html` (or the brief's first key screen) from it as a real, responsive page, on one stylesheet every key screen shares. At 1440 it must still be the screen they chose.

- **Faces** loaded at every size. A stand-in face is said again.
- **The rest of the page:** below the first screen, small text, every width down to the phone.
- **Motion:** exactly the design brief's `motion` line, from the direction's `motion:` line, nothing beyond (`none` is state changes only). Honour `prefers-reduced-motion`.
- **Motion options,** when the brief's motion is present or leading, as a studio shows motion studies once the still look holds: for each moment the brief names (two at most), two or three versions, each rebuilt from a different reference on the board that shows it moving (what moves, trigger, time, easing: from a live page's code, its CSS and the motion library calls in its scripts; from a GIF or video, its own frames; recorded frames only to see the sequence), on `home.html` as a `data-variant` with `data-from`, flipped with [variants.js](references/variants.js). Build each with what its move needs, as the reference does: CSS for a state change, a motion library for sequenced, scroll-driven, split-type or physics work. A version that only hints at a complex move is not that reference. One such reference: one version, and say so. Never a move no reference makes.
- **What waits for the prototype** (the direction's `for the prototype` line), placed in the composition's own system, never shrinking the headline or tidying a device.
- **The ownable**, finished. **The states** reachable here (empty, loading, error), and the second theme if asked for.

### 2. The other key screens

> I'll prototype <the menu>, <screen>, <screen>. Change the list?

Then build them all, linked.

- **The direction's principles hold on every page.** They are this design's rules: a page that would break one is drawn again, or the clash goes to them as a choice.
- **The chosen screen is the frame, as a system, not a composition to repeat.** Its header, navigation, grid, type sizes, colour roles (which colour for headlines, small text, buttons and fields) and spacing steps stay the same on every page. One menu, one card, one row, one heading style everywhere.
- **Each page opens with its own job** in the first view (the list on the menu, the form on checkout), never the first screen's hero again.
- **The direction's devices carry over** where the page has room for them: overlaps, crops, giant type, empty space, never tidied (`data-crop` on text cropped on purpose).
- **Every part** (a footer, a form, a menu, a list) comes, in this order, from:
  1. The chosen screen's frame and concept, always: beside the first screen, it reads as the same product.
  2. Their liked references that show that part, minus their **Leave out**: its layout, inside the frame, never its content, faces or colours.
  3. None, for a key part (a footer, a form, a page's main content): ask once, all of them in one message, with the closest cards or a search for that one part (`design-moodboard`'s One piece).
  4. Never block: build it meanwhile, and a small part (a field, a stepper) at once, from the frame's own system, marked `data-standin`, and put their answer in when it comes.
- **Density** as the design brief's `dense` asks: airy 1–2 shows less, dense 4–5 shows more and keeps spacing tight.
- **Real content:** copy in the voice, the longest real names, every section a person needs. Follow `design-content.md`; without it, draft only from what the brief gives and say what they must supply. Pictures: theirs or the subject's stand-ins in `.longbeard/design/pictures/`; never grey boxes, never a reference's subject.
- **States:** empty, loading and error where reachable (`?state=empty`), every width, each theme.
- **Marked, not hidden:** `data-standin="picture"` or `"fact"` (with `data-standin-note`) on anything the product does not really have yet.

A pattern that brings a feature the brief does not have is named; kept, it is a product change (`idea`) first.

### 3. Check by script

Capture every screen and state at 1440 and 390, each theme, and look at each capture yourself. Then:

```
node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/prototype/home.html" --wait-title ready
node <skill>/scripts/rules.mjs "file://$PWD/.longbeard/design/prototype/home.html" --screen home
node <skill>/scripts/drift.mjs "file://$PWD/.longbeard/design/prototype/home.html" "file://$PWD/.longbeard/design/prototype/menu.html" --identity docs/design/design-identity.md
node <skill>/scripts/links.mjs "file://$PWD/.longbeard/design/prototype/home.html"
```

- **Contrast** reads the whole page (`--level AAA` at that brief). If a colour role fails, change that role everywhere, never on one page. A liked colour may stay, with its ratio said.
- **Rules** measures what a browser can: sideways scroll, small targets, unlabelled inputs, invisible focus, placeholder copy, clipped text. Fix after every run; at "rounds used up", stop and say what is open. A wrong finding is waived with a reason (`--waive <id> --reason "…"`).
- **Drift** lists each face and colour no screen should have, and the type sizes, radii and spacing steps only one screen uses. Bring them to the frame's.
- **Links:** every broken link, dead button and page with no way on is fixed. It also lists the stand-ins.

**The floor, inside the concept** ([how they split](references/design-floor.md#how-to-use-this)). Text a person acts on must pass, fixed from inside the concept. Display type over a picture, overlaps, crops and wide empty space are the look when the chosen screen does them: never tidied away. A finding that would undo the concept is left and told to them as a choice, one line each (what it costs, and what would fix it: keep, or change?): they decide.

### 4. Show it

Give the paths and every key screen on one sheet, desktop then phone (`sheet.mjs --cols 4`), so they judge the set as one product. One line per screen only for a fault, a choice you made, or what sits against the design brief (its words, its never, could it be mistaken for what it must stand apart from). Then **what they still supply**: each stand-in from `links.mjs`, one line each, by screen.

> Is this the product? Want options anywhere?

With motion options, the question also asks which version for each moment, one line each for what moves. The others are removed on their pick, and the pick is what `DESIGN.md`'s Motion records.

**Options** only when asked: two to four layouts for that page or part from different references, on the real page with its header, content and density, each a `data-variant` with `data-from` its reference, flipped with [variants.js](references/variants.js) (`?variant=<n>`, ← →); a sheet only to see them side by side. Never ranked. Iterate until it is the product.

### 5. Approve: write `DESIGN.md` in one go

Only on their yes to the rendered prototype (and the `decides` person's, if named). Write the whole file from [design-md-template.md](references/design-md-template.md):

- **Contrast first:** every text, control and focus pair through `contrast.mjs` (4.5:1 body, 3:1 large and non-text; AAA: 7 and 4.5). Never a failing pair, except a liked colour kept: `WARN liked, kept` after the ratio, its why under Decisions.
  ```
  node <skill>/scripts/contrast.mjs "#1b1b1f on #fafaf7" "#c2410c on #fafaf7:mark"
  ```
- **Themes:** each colour token once, a value per theme, every pair checked in each.
- **Tokens are code names** (`color/ink`, `type/body`, `space/md`, `radius/md`, `motion/enter`), the same in Figma. Colour, type, spacing, radius and motion are tables; the direction's `finish:` is the Finish line; the identity's **Adjusted** lines are built in.
- **The token block** is generated from the tables, never written by hand: `node <skill>/scripts/tokens.mjs DESIGN.md --name "<product>"` (exit 2 names a row it cannot read; `--check` exits 1 when block and tables disagree).
- **Principles** from the direction, kept as the prototype proved them.
- **What makes it this design** goes under Components, with values. **Soft rules overridden on purpose** go under Decisions, with the reason.
- **Still to supply:** `links.mjs` again, then the list by screen, in words, never a file name; "nothing" when empty.
- **Ideas, not sources:** no reference, site, person, link or `.longbeard/` path.

Then `design-check` docs mode on `DESIGN.md` and `docs/design/` (it runs `tokens.mjs --check`), and fix what it finds.

**What this project taught about their taste,** offered once, in the same message as the next step: the whys they gave, what they left out, and what they turned down with their reason (a screen, a face, a palette), from `screens.json`, `library.json` and this run's answers. On yes, write it where their board lives, so the next project starts from it: a Figma board, one `Learned` text frame on the board's page, a line per card (`<card>: like … · why … · leave out …`) and one per no; a folder, `learned.md` in it; anything else, `~/.longbeard/taste.md`. Their own cards and captions are never changed. A no stands.

Next: `design-figma`.

## Feature loop

A feature with screens, once `DESIGN.md` exists.

- **Only existing parts:** compose the screens in Figma (`design-figma`) with their states; no prototype.
- **New parts:** prototype only them, on the real screens around them, in `.longbeard/design/<feature>/`, in the frame, then the checks. Options for a part, when asked, are variants on that page, as in **Options** above.
- `DESIGN.md` gets entries (a token, a component, a dated decision, an item to supply), never a rewrite; `tokens.mjs` refreshes the block.
- **Identity changes need their own yes,** one at a time, rendered. A rebrand is `design-identity` again.

## Do not

- Write `DESIGN.md` before they approve a rendered prototype, or rewrite it in a feature.
- Change the identity, or the frame, on one page: say it, and send it back.
- Repeat the first screen's composition on a page that has another job.
- Undo the concept because a check flagged it.
- Ship a screen with grey boxes, lorem, or an item it needs missing.
- Name a reference anywhere that is kept.
