---
name: design
description: >
  Turn a direction into the product's look. A script deals first-screen
  recipes from the direction's library, each built in plain HTML with the
  product's real content and shown as one numbered grid. They pick, see each
  pick varied one thing at a time, and pick again. The chosen screen is
  finished and the brief's other key screens follow from it. On approval:
  DESIGN.md in one go, a bento board of the look in Figma, and the screens
  built from it. Colour, type, spacing and copy are chosen here, by them, on
  rendered screens. Runs when design-exploration/<slug>/direction.md exists
  and there is no approved DESIGN.md, or for a feature that needs screens.
  Figma is required.
---

# Design

Four things come out, in order: a prototype they approved, `DESIGN.md` (the official look, committed), a bento board of that look in Figma, and the screens in Figma marked **Ready**. Figma is the truth for screens. `DESIGN.md` is the written summary of the rules behind them.

Read [design-rules.md](references/design-rules.md) before the first prototype. It is the checklist for every screen here and in `design-check`.

## Gate

Look at the repo. Do not ask what is there.

1. No `docs/brief.md` → `idea` first. Stop.
2. The brief says no UI → nothing to design. Stop.
3. No `design-exploration/identity*/direction.md` and no `DESIGN.md` → `design-direction` first. Stop. A `direction.md` with no `library.json` beside it is from before the library: `design-direction` again, from its families step, with the references it already has. A `library.json` with no `family` is from before the family: `design-direction` again, from its library step, with the same anchor and donors.
4. `DESIGN.md` exists and an identity `direction.md` is newer than it → a rebrand: **First pass**. On approval its `DESIGN.md` replaces the old one.
5. `DESIGN.md` exists → **Feature loop**.
6. Otherwise → **First pass**.

The first pass reads the newest `design-exploration/identity*/direction.md` (`identity/`, `identity-2/`) and the `library.json` beside it, never a one-piece direction.

No Figma connection → say Figma is required for UI projects, and stop before the Figma step. The prototype and `DESIGN.md` can still be done.

## First pass

The first pass has one rule above the others: **you build, they choose.** You never pick a combination, drop one, or rank what you show. A script deals the combinations, and they choose from rendered screens. A screen you would not have picked may be the one they pick.

### 1. Ask what is fixed

Read the brief, `direction.md` and `library.json`, then send one message and wait. Always ask, however the run was set up. Only they can say "go".

```
Before I build, what is already fixed? Skip any with "go".

1. Colours or typefaces you already own and must use, or refuse?
2. Light, dark, or both?
3. Pictures: which of yours should I use? <what the brief's key screens need>
```

Never ask them to choose a look in words. That is what the grid is for.

- **A refusal** removes the matching entries from the library.
- **Something they own** (a brand colour, a licensed face) is added to its list as an entry with `"from": ["theirs"]`. A fixed face or ground that must be on every screen replaces its list with that one entry.
- **Light, dark or both** removes the grounds that do not fit. "Both" keeps them all: the second theme is made when the chosen screen is finished.
- **No pictures yet:** use stand-ins of the right kind with a clean licence, in `prototype/img/`, and say they are stand-ins.

Say in one line what changed in the library.

### 2. Deal

```
node <skill>/scripts/deal.mjs design-exploration/<slug>/library.json
```

It deals eight recipes and writes them to `deal.json` beside the library, every round so far, and to `deal.js`, the same with the library, for the page to load. A recipe is one entry from each list: arrangement, navigation, type, ground, accent. The script's rules are what keep the result from being a copy or a habit:

- A recipe's arrangement, type and ground come from three different references, so no reference supplies a whole screen.
- The anchor's arrangement is dealt twice. No other arrangement repeats.
- An accent that does not stand off its surface is passed over.
- Entries are used as evenly as the library allows, and no recipe is dealt twice.

Build what was dealt. Never swap an entry, drop a recipe or re-deal because a combination looks wrong to you. Fewer than eight came out → the library is thin: say so and go on with what there is.

### 3. Build the grid

The grid is the first screen only: for a site, the screen a person lands on, at 1440 by 900; for an app, the brief's first key screen at its device size. All of that screen is in play, its navigation too.

One page, `design-exploration/<slug>/prototype/grid.html`, plain HTML and CSS, no build step, that shows recipe `n` of the last round at `?n=`. It runs by opening the file, so it loads `../deal.js` with a script tag (`window.DEAL` holds `library` and `rounds`): a page opened as a file cannot fetch JSON.

- **The same real content in every recipe.** The name, the line and the pictures from the brief and `direction.md`'s subject, in its voice. No lorem, no grey boxes. Only the look differs, so the look is what they judge.
- **The family holds on every recipe.** `library.family` is not dealt: every screen gets it, whatever else was dealt. Its scale, how empty, how much is pictures and how they are treated, its margin, radius, edges and density are variables every arrangement reads. A screen outside the family's ranges is a fault, fixed in the rule.
- **Each arrangement and each navigation is built once, as a rule.** Write it from its sentence in the library, with the references' shots open for what a sentence cannot carry. It does not know which type, ground or accent it will get: those arrive as variables. An arrangement fills the space the navigation leaves, wherever that is.
- **Take the arrangement, never the reference.** Nothing of a reference's content, pictures or wording is used.
- **Type fills by rule, not by number.** Display type that should fill a width is sized to that width with a limit on its height, so a narrow face and a wide one both fit. Measure the text, not its box (`width: max-content`). Words on one line share one size, and the line fits between the margins. Display over body stays inside the family's `scale`. Running text uses the type entry's `body`.
- **Nothing small sits on display type.** Text, labels and bands placed by rule go in the clear space beside or between the display lines, found after the type is sized, never at a fixed position. Type that crosses a picture stays readable on it.
- **Fix faults, never taste.** Capture every recipe and open each at full size. An overlap, a clipped word, a stray element, text that cannot be read: fix it with a rule in the arrangement, so the fix holds for whatever is dealt into it, and capture again. Never tune one recipe, and never change what was dealt.

```
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/prototype/grid.html?n=1" --out "$PWD/design-exploration/<slug>/grid/1.png" --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs design-exploration/<slug>/grid/sheet.html design-exploration/<slug>/grid/1.png … design-exploration/<slug>/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/grid/sheet.html" --out "$PWD/design-exploration/<slug>/grid/sheet.png"
```

**Show it.** Give the sheet's path, then a table: each number with its arrangement, navigation, type, ground and accent in plain words. List any fault you could not fix. Do not say which you prefer, and do not rank them. Ask one line:

> Which of these would you take further? Any number of them, or none.

- **Some:** step 4.
- **None:** deal again, once (`deal.mjs` again: it uses the arrangements not yet shown first), and build the new ones. None again → offer the next family on their board, which is `design-direction` from its marks step. None there either → say plainly that this pool is not giving a design they want, and ask what is missing.
- **A screen they like for one thing** ("the type of 3") is a note for the next step.

### 4. Vary, and they choose

```
node <skill>/scripts/deal.mjs design-exploration/<slug>/library.json --vary 4,7,8
```

Each pick gets a row: the pick, then one variation for each of navigation, type, ground and accent, changing only that. The page already takes them: nothing is rebuilt. Capture the round, make the sheet with `--cols 5`, and show it with the same table, saying what changed in each.

> Which one? Mix if you like ("7 with the ground from 3"), or ask for more of one thing ("more typefaces for 4").

- **A mix** is `deal.mjs … --mix 7,ground=3` (an entry id works too: `ground=dark`). Its arrangement, type and ground should still come from three different references. When the script warns that a mix breaks that, build it, and say that it now takes most of its look from one reference.
- **More of one thing** is `deal.mjs … --more 4:type`: the pick, then every entry of that list it can take and has not had.
- Every flag reads its numbers from the last round shown, so a variation can be varied again. Each ask is a new round: capture it and show its sheet. Never edit `deal.json` by hand.
- Iterate until one screen is theirs. Read it back in one line (its arrangement, navigation, type, ground and accent) and wait for their yes.

### 5. Finish the chosen screen

Until now every screen was a sketch at one size. Now it becomes the design. Read [design-rules.md](references/design-rules.md) again and work through it on this screen.

- **The real faces.** An entry marked `eye` is a stand-in. Where the product can use something closer, show the title in up to six candidates as one more row, and let them pick. Every face is free to license or one they own.
- **The detail the sketch skipped:** the small text, the spacing between things, the page below the first screen, every width down to the phone. The family's ranges hold here too: measure the finished screen (`measure.mjs` on its file URL) and say where it falls outside them.
- **Navigation that works:** the menu open, what it does on scroll, what it becomes on a phone.
- **Motion.** A reference that moves is felt again, not remembered. Play its recorded frames and open its live link again: record it with `capture.mjs <url> --out design-exploration/<slug>/refs/<name>-replay --frames 12`, with `--scroll` or `--click` for what moves on scroll or on a click. Note what moves, in what order, how fast, and how it eases. Then build that kind of motion in CSS, with the same feel and none of its content, and say in chat which reference it came from. A link that no longer loads: work from the frames, and say so.
- **The ownable.** The one thing `direction.md`'s subject says this screen must show is on it, somewhere you can point to, made from the product's own world and not from a reference. It is unconfirmed until they have seen it rendered: confirm it or replace it here. It is `ownable` in `DESIGN.md`.
- **The second theme**, if they asked for both: the same screen on a ground from the library that fits it.

The finished screen moves to its own file, `design-exploration/<slug>/prototype/<screen>.html`. The folder is gitignored: the winner goes into `DESIGN.md`, not into git.

### 6. The other key screens

Read the brief's key screens (2–4). Each keeps the chosen navigation, type, ground and accent. Its arrangement comes from `direction.md`'s Other parts where a reference shows that kind of screen, taken as an arrangement and never whole, and otherwise follows from the finished first screen.

- **2–3 variants** behind `?variant=` only where a real choice is open (two references arrange that screen differently, or nothing shows it). A screen with one clear answer is built once.
- **Hide the switcher when the URL has `capture`** (`?variant=B&capture`), so screenshots show only the design.
- **Real content:** real copy in the voice from `direction.md`, the longest real names, real or properly chosen pictures.

The default state is not enough. Each key screen also gets the empty, loading and error states a person can reach, as frames in the same file (`?state=empty`), built once the screen's variant is chosen. A product with more than one theme shows each one, so they approve every theme, not only the first.

A gap no reference covers (a screen, a control) → `design-direction` one-piece mode with its own slug, then back here.

### 7. Self-check, then show

Screenshot each screen at desktop and mobile:

```
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/prototype/today.html?capture" --out <scratch>/today.png
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/prototype/today.html?capture" --out <scratch>/today-mobile.png --width 390
```

Shoot every state, in every theme, not only the default. Check them against the rules: Idea first, then hard, then soft. That includes the hard rules about controls: every input has a visible label, focus and pressed exist, and what looks tappable has a stated result. A hard finding after approval reopens an approved screen. Fix what fails before they see it. Then give the paths, name the colours and faces in use, and ask whether this is the product. Iterate on the prototype until they say it is right.

A pattern can bring a feature the brief does not have. Name it when you show it. If they keep it, that is a product change: `idea`, Change, before `DESIGN.md`.

### 8. Approve: write `DESIGN.md` in one go

Only on their yes to a rendered prototype. Write the whole file from [design-md-template.md](references/design-md-template.md): idea, voice, colour, type, spacing, components, decisions. Write it once, from what was approved. Do not draft it during iteration.

- **Contrast first.** Every text and background pair, and every control colour against its ground, goes through `scripts/contrast.mjs` before it is written: 4.5:1 for body text, 3:1 for large text and non-text marks. A failing pair is fixed in the prototype, shown again, then written. Never write a failing pair.
  ```
  node <skill>/scripts/contrast.mjs "#1b1b1f on #fafaf7" "#c2410c on #fafaf7:mark"
  ```
- **Themes.** A product with more than one theme lists each colour token once, with a value per theme, and every pair passes the contrast check in each theme.
- **Ideas, not sources.** References live only in `design-exploration/` on this machine, and only for this step. Nothing that outlives it names one: not `DESIGN.md`, not Figma (layers, descriptions, comments), not code or its comments, not a commit, PR, spec or ticket. No product, site, studio, designer or link from the exploration, and no `design-exploration/` path. Turn each into the idea: "a quiet reading page", not whose. Which reference a move came from is said in chat only.
- **Write down what makes it this design.** Whatever someone would need to rebuild it without the prototype open goes under Components, with values, not adjectives.
- **Tokens are code names.** Name each colour, type and spacing token as it will be named in code (`color/ink`, `space/md`). Figma variables use the same names, with code syntax `var(--color-ink)`.
- **Soft rules overridden on purpose** go under Decisions with the reason. Hard rules cannot be overridden. A device that came with the chosen look and that the rules list as a tell is on purpose: write it under Decisions as the idea it serves here, never as where it came from.

### 9. Figma

Load `figma-use`, `figma-generate-library` and `figma-generate-design`, and follow them. This skill adds only what they do not decide.

- **One file per product.** A new one if the project has none (`figma-create-new-file`). Put its URL in `DESIGN.md`.
- **Our tokens, not a kit.** Variables and styles come from `DESIGN.md`. New files may come with community kits attached (Material, Apple, Simple Design System). Their discovery steps tell you to reuse them. Do not: search the file only (no `includeLibraryKeys`), and build what is missing from `DESIGN.md`.
- **Build, do not capture.** Compose screens from the tokens and components. Do not run `generate_figma_design` on the prototype. It is a throwaway with a switcher. For pictures, create the image frames, then `upload_assets` the prototype's own files with those `nodeIds`.
- **Themes are modes.** One colour collection with a mode per theme. Each screen is built once and switches with the mode, never a colour set or a frame per theme. If Figma refuses the modes, stop and ask. Never fall back to separate sets.
- **Pages:** Cover (the board), Foundations, Components; one `Screens — <flow>` page per flow from the brief; `Explorations` for anything kept for later, by date.
- **Order:** tokens and styles from `DESIGN.md` → the board → only the components the key screens need → the key screens → their states. The library grows with features. It is not built ahead.
- **States:** every screen has a frame for each of empty, loading and error that a person can reach, next to the default. A state nobody can reach gets no frame: add the screen, the state and the reason under Decisions in `DESIGN.md`.
- **Names:** `<screen> — <state>`. When a screen's layout differs by device, `<screen> · <device> — <state>`. The state can describe itself. Theme is never in the name.
- **Components have their states too:** focus and pressed for every control, before a screen uses it.
- **One text style per weight used.** Changing a font on styled text detaches it. A weight `DESIGN.md` does not list is a new style, and a new row there.
- **Trust the file, not the picture.** Take a screenshot only after the edit has returned, and read text back from the nodes. A cloned variant loses its text property links: wire them again. Swapping an instance can keep old overrides: replace it with a fresh one.
- **Be faithful to the approved prototype.** It is what they said yes to, and Figma is that design, not a new reading of it. Tokens carry the values, not the whole design, so work with the approved variant open and match it. If something cannot be built the same way, say so and ask. Never simplify it silently.
- **Check each screen** with `design-check` frame mode before showing it, passing the prototype shot. Fix its hard findings.
- **Ready:** when they approve a frame, add `— Ready` to its name. Tickets link Ready frames, and build is checked against them.

### The board

Before any component, lay the whole look out on one frame, `Board`, on the Cover page: a bento of tiles in different sizes that shows the identity at a glance, the way a studio presents a brand. It is where they see colour, type, imagery and voice working together, and where a weak look shows before a screen is built on it.

- **What it holds**, each its own tile: the product's name set in the display face; the type, each text style named and shown in use; the colours, each token as a swatch with its name, and every theme; two or three of the prototype's real pictures, cropped hard; one line in the voice, set large; a crop of an approved key screen in a device frame; the `ownable`; and, if the brief has one, a number or fact about the product set very large. Add a tile for anything else that makes this look this look (a mark, a shape, an illustration). Leave out a tile that would be empty.
- **Composed, not listed.** One tile leads and is the largest; the rest vary in size and in which colour they sit on. Tiles share one gap and one radius from `DESIGN.md`. Text sits on its tile's colour at the contrast `DESIGN.md` checked.
- **Real, and bound.** Every fill, text and radius is bound to a variable or style: the board is the tokens in use, and changes when they change. Copy comes from the brief and the prototype, pictures from `prototype/img/`. No placeholder, no reference's name or picture.
- **Their yes.** Screenshot it, read the text back from the nodes, and show it. Ask whether this is the product. A no is a change to `DESIGN.md` and the prototype first, then the board again. It is not marked Ready: it is not a screen, and nothing is built from it but the feeling.

If a Figma decision changes a rule (a new token, a component variant, a spacing step), update `DESIGN.md` in the same turn and say what changed.

### 10. Clean up

Offer to delete `design-exploration/<slug>/`. `DESIGN.md` and Figma now carry the result. On no, leave it. It is gitignored either way.

Then offer the next stage: architecture. They start it by typing `/grill-with-docs`. When it runs, seed `GLOSSARY.md` from the brief and the copy in the Figma screens, and ask before renaming a term the screens show.

## Feature loop

A feature with screens, once `DESIGN.md` exists.

- **Only existing parts?** Compose the screens in Figma from the library, with their states, and skip the prototype and `design-direction`.
- **New parts?** Prototype only the new parts, on the real screens around them, in `design-exploration/<feature>/prototype/`, in 2–3 variants where a real choice is open, then as above from the self-check. No deal: the look is already chosen.
- New page `Screens — <feature>`. Reuse components. New ones are added to Components.
- `DESIGN.md` gets entries (a token, a component, a decision with date and reason). It is never rewritten in a feature.
- **Identity changes need their own yes.** A new colour role, a typeface, a change to the idea or the voice: ask for each one separately, after showing it rendered. Two such changes are approved one at a time, never bundled. An approved one goes on the board too.
- A rebrand is not a feature: that is `design-direction` again, then a first pass.
- **A screen with no Ready frame.** A project that joined with its screens already in Figma has frames nobody marked. When a feature touches one, run `design-check` frame mode on it, add what it lacks, and mark it Ready on their yes. A screen with a copy per theme becomes one frame on modes. Only the screens the feature touches, never the whole file.

## Do not

- Choose, swap, drop or rank a dealt recipe, or say which screen you prefer. Tune one recipe instead of fixing its arrangement.
- Ask them to describe the look they want. Show them screens.
- Build more than the first screen before they have chosen one.
- Take a reference's content, pictures or wording, or all of its arrangement, type and ground together.
- Write `DESIGN.md` before they approve a rendered prototype, or rewrite it during a feature. Only a rebrand's first pass replaces it.
- Name a reference, its link, its author or a `design-exploration/` path in anything that outlives the exploration: `DESIGN.md`, Figma, code, comments, commits, PRs, specs, tickets.
- Use a community kit's components or variables in Figma.
- Build the whole component library before the screens need it.
- Mark a frame Ready that lacks a state a person can reach, or that has open hard findings.
