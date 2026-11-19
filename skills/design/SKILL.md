---
name: design
description: >
  Turn a direction into the product's look. A script deals first-screen
  recipes from the direction's library, each built in plain HTML with the
  product's real content and shown as one numbered grid. They pick, see each
  pick varied one thing at a time, and pick again, then tune its colour and
  type from rows of options rendered on it. The chosen screen is finished and the brief's other key screens follow from it. On approval:
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

The first pass reads `design-exploration/identity/direction.md` and the `library.json` beside it, never a one-piece direction. When there are two looks (`identity/` and `identity-2/`, two families led), it works on the one they named first, and offers the other when that one is approved or set aside. A rebrand is the newest `identity*` folder.

No Figma connection → say Figma is required for UI projects, and stop before the Figma step. The prototype and `DESIGN.md` can still be done.

## First pass

The first pass has one rule above the others: **you build, they choose.** You never pick a combination, drop one, or rank what you show. A script deals the combinations, and they choose from rendered screens. A screen you would not have picked may be the one they pick.

### 1. Check what is fixed

Read the brief, `direction.md` and `library.json`. What is fixed was asked in design-direction's first round and is in `direction.md` as `fixed`. Say it back in one line, with what it changes in the library, and wait. Always ask, however the run was set up. Only they can say "go".

```
Fixed, from the start: <what they own, what they refuse, light/dark/both, their pictures>. That <removes / adds> <entries> in the library. Still right, or anything new?
```

A `direction.md` with no `fixed` line (from an earlier version) gets the three questions instead: colours or typefaces they own and must use, or refuse; light, dark or both; which of their pictures to use for <what the brief's key screens need>.

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

One page, `design-exploration/<slug>/prototype/grid.html`, plain HTML and CSS, no build step, that shows recipe `n` of the last round at `?n=`. **Start from [grid-template.html](references/grid-template.html):** copy it there. It already loads the deal (`../deal.js`, since a page opened as a file cannot fetch JSON), sets the look as variables, takes overrides in the URL, loads the faces, fits the type and signals `ready` for a capture. Write only what it marks WRITE: the content, one function per navigation, one per arrangement, and in step 7 the layouts of a screen that forks. Never change the template's part for one run: a fault in it is fixed in `references/grid-template.html`.

- **The same real content in every recipe.** The name, the line and the pictures from the brief and `direction.md`'s subject, in its voice. No lorem, no grey boxes. Only the look differs, so the look is what they judge.
- **The family holds on every recipe.** `library.family` is not dealt: every screen gets it, whatever else was dealt. Its scale, how empty, how much is pictures and how they are treated, its margin, radius, edges and density are variables every arrangement reads. A screen outside the family's ranges is a fault, fixed in the rule.
- **Each arrangement and each navigation is built once, as a rule.** Write it from its sentence in the library, with the references' shots open for what a sentence cannot carry. It does not know which type, ground or accent it will get: those arrive as variables. An arrangement fills the space the navigation leaves, wherever that is.
- **Take the arrangement, never the reference.** Nothing of a reference's content, pictures or wording is used.
- **Type fills by rule, not by number.** Display type that should fill a width is sized to that width with a limit on its height, so a narrow face and a wide one both fit. Measure the text, not its box (`width: max-content`). Words on one line share one size, and the line fits between the margins. Display over body stays inside the family's `scale`. Running text uses the type entry's `body`.
- **Nothing small sits on display type.** Text, labels and bands placed by rule go in the clear space beside or between the display lines, found after the type is sized, never at a fixed position. Type that crosses a picture stays readable on it.
- **Overrides in the URL.** The page also takes `&ground=%23hex&ink=%23hex&accent=%23hex&face=Name&body=Name`, so a colour or a face can be tried on a recipe by capturing it, not by rebuilding it. Step 5 uses this.
- **Fix faults, never taste.** Capture every recipe and open each at full size. An overlap, a clipped word, a stray element, text that cannot be read: fix it with a rule in the arrangement, so the fix holds for whatever is dealt into it, and capture again. Never tune one recipe, and never change what was dealt.

```
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/prototype/grid.html?n=1" --out "$PWD/design-exploration/<slug>/grid/1.png" --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs design-exploration/<slug>/grid/sheet.html design-exploration/<slug>/grid/1.png … design-exploration/<slug>/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/grid/sheet.html" --out "$PWD/design-exploration/<slug>/grid/sheet.png"
```

**Show it.** Give the sheet's path, and a second sheet of the references each screen's arrangement was read from, so they can judge the reading, not only the result (`sheet.mjs` with their shots, in the screens' order). Then a table: each number with its arrangement, navigation, type, ground and accent in plain words. List any fault you could not fix. Do not say which you prefer, and do not rank them. Ask one line:

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
- Iterate until one screen is theirs. Read it back in one line (its arrangement, navigation, type, ground and accent) and wait for their yes. On the yes, record it: `deal.mjs … --choose <n>` (n in the last round shown). Steps 5 and 7 build on it.

### 5. Colour and type, by them

The chosen screen took its colours and faces from the library, which holds only what the references use. Before it is finished, they tune them on the screen itself, one thing at a time, from rendered options. The look stays the family's; the exact values become theirs.

One sheet, a row per thing, every option on the chosen screen at the grid's size (`sheet.mjs --cols 4`), numbered, never ranked:

- **Display face:** the face it has, then up to five more of the same kind, from `scripts/fonts.mjs`, never from memory. It takes every face of that kind in Google Fonts' list (serif or sans, display or text, with the weight in use), measures each in one Chrome (width, x-height, how dark it sets, stroke contrast) and lists them nearest in shape first, each with how widely it is used. An `eye` stand-in is always in this row.
- **Body face:** the body face it has, then up to five from `fonts.mjs --body` (text faces with 400 and 700) that sit with the chosen display face.

  ```
  node <skill>/scripts/fonts.mjs "Newsreader" --weight 300
  node <skill>/scripts/fonts.mjs "Inter" --body
  node <skill>/scripts/fonts.mjs "Their Face" --kind sans --css "<its stylesheet>"
  ```
- **Ground and ink, and accent:** made by `scripts/colours.mjs`, never picked by hand: the ground and accent as dealt, even steps around each (lighter, darker, warmer, cooler, in OKLCH), the family's other colours (their palettes in `profiles.json`), none for the accent, and theirs. Each ground comes with the ink that reads best on it; an option under 4.5:1 for text, or 3:1 for an accent on its ground, is left out, and the script says so.

  ```
  node <skill>/scripts/colours.mjs --ground "#f1ede4" --ink "#111111" --accent "#fe2601" --family "<the family's colours>" --theirs "<theirs>"
  ```

- **Spacing:** as dealt, tighter and looser (`&space=0.8`, `&space=1.25` on the grid page: the margins and the gaps every arrangement writes as `calc(… * var(--space))`).

Which of the listed faces go in a row is the agent's to choose, never by taste: take the nearest, and at least two of the five from beyond the hundred most used (`used` over 100), so the row is not only the faces every site has. Say for each, from its numbers, how it is of the same kind ("as narrow, darker, less contrast"). Every face is free to license, or theirs.

> Pick one in each row, or name your own: a colour, a face. "Keep" leaves a row as it is.

- **A pick** becomes a library entry with `"from": ["theirs"]`, and the chosen screen is dealt with it (`deal.mjs … --mix chosen,accent=<id>,type=<id>`: `chosen` is the screen recorded in step 4, whatever round is last), captured and shown again, once, with everything they picked together. On their yes, `--choose 1` records it.
- **Something they name** is built the same way, checked the same way, and shown before it counts.
- **"Go"** keeps what the screen has, and says so.

Read the screen back in one line (arrangement, navigation, display and body faces, ground, ink, accent) and wait for their yes.

### 6. Finish the chosen screen

Until now every screen was a sketch at one size. Now it becomes the design. Read [design-rules.md](references/design-rules.md) again and work through it on this screen.

- **The faces they chose** in step 5, loaded properly and set at every size. A face still marked `eye` that they kept is said again here: it is a stand-in, and the product ships whatever it stands in for, or it.
- **The detail the sketch skipped:** the small text, the spacing between things, the page below the first screen, every width down to the phone. The family's ranges hold here too: measure the finished screen with design-direction's script (`node <design-direction skill>/scripts/measure.mjs "file://$PWD/design-exploration/<slug>/prototype/<screen>.html"`) and say where it falls outside them.
- **Navigation on this screen** as it was dealt and tuned. The menu open, what it does on scroll and what it becomes on a phone are prototyped in step 7, first.
- **Motion.** A reference that moves is felt again, not remembered. Play its recorded frames and open its live link again: record it with `capture.mjs <url> --out design-exploration/<slug>/refs/<name>-replay --frames 12`, with `--scroll` or `--click` for what moves on scroll or on a click. Note what moves, in what order, how fast, and how it eases. Then build that kind of motion in CSS, with the same feel and none of its content, and say in chat which reference it came from. A link that no longer loads: work from the frames, and say so.
- **The ownable.** The one thing `direction.md`'s subject says this screen must show is on it, somewhere you can point to, made from the product's own world and not from a reference. It is unconfirmed until they have seen it rendered: confirm it or replace it here. It is `ownable` in `DESIGN.md`.
- **The second theme**, if they asked for both: the same screen on a ground from the library that fits it.

The finished screen moves to its own file, `design-exploration/<slug>/prototype/<screen>.html`. The folder is gitignored: the winner goes into `DESIGN.md`, not into git.

### 7. Prototype the rest, choose where it forks

The identity is chosen: the first screen, its navigation, its faces and colours. The other key screens follow it, and a working prototype shows them better than a sheet of options per screen, so they are prototyped, not dealt. Choosing comes back only where the layout really forks, or where they ask.

1. **Which screens.** List the brief's other key screens, navigation's details first (the menu open, what it does on scroll, what it becomes on a phone), and ask once:

   > I'll prototype <the menu>, <screen>, <screen>. Change the list?

   A screen they cut is not built; one they add is listed with what it is for.
2. **Prototype them all, in one go**, in the chosen look, linked so they click through, in `design-exploration/<slug>/prototype/`. Each layout comes from `direction.md`'s Other parts where a reference shows that kind of screen, taken as a layout and never whole, from any family: the look is already fixed, so a reference only lends how the screen is arranged. Where nothing shows it, it follows from the first screen. Build once and reuse: one menu, one card, one list row, one heading style across every screen, so what one screen settles, the next keeps. Real content: real copy in the voice from `direction.md`, the longest real names, real or properly chosen pictures.
3. **Show it, and name the forks.** Give the paths, say what each screen is made of, and name every fork: a screen where the references arrange it in clearly different ways, or nothing showed it and you had to choose ("the index could be a grid or a list"). Never pick among them silently.

   > Click through. Want options anywhere? I'd offer them for <forks>.

4. **Options, only where asked or forked.** Read that screen's layouts into the library's `parts` (from the keeps that show it, the chosen family's first, and one that follows from the screens already built, `"from": ["first screen"]`). The screen they settled on is already recorded (steps 4 and 5). Then `deal.mjs … --part <name>`: two to four layouts, each from a different reference, carrying the chosen look and the screens chosen so far; a layout that needs what was not chosen is left out. Build them inside the prototype, show one sheet, never ranked, and they pick, mix, or ask for more. `--choose` on that round records it, so later options know it. Nothing fits: `design-direction` one-piece mode for it, then back.
5. **States, once a screen is settled.** The empty, loading and error states a person can reach, as frames in the same file (`?state=empty`, hidden switcher when the URL has `capture`), every width, each theme.

A pattern a layout brings that the brief does not have is named when it is shown: if they keep it, that is a product change (`idea`, Change) before `DESIGN.md`.

### 8. Self-check, then show

Screenshot each screen at desktop and mobile:

```
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/prototype/today.html?capture" --out <scratch>/today.png
node <skill>/scripts/capture.mjs "file://$PWD/design-exploration/<slug>/prototype/today.html?capture" --out <scratch>/today-mobile.png --width 390
```

Shoot every state, in every theme, not only the default. Check them against the rules: Idea first, then hard, then soft. That includes the hard rules about controls: every input has a visible label, focus and pressed exist, and what looks tappable has a stated result. A hard finding after approval reopens an approved screen. Fix what fails before they see it. Then give the paths, name the colours and faces in use, and ask whether this is the product. Iterate on the prototype until they say it is right.

A pattern can bring a feature the brief does not have. Name it when you show it. If they keep it, that is a product change: `idea`, Change, before `DESIGN.md`.

### 9. Approve: write `DESIGN.md` in one go

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

### 10. Figma

On their yes to `DESIGN.md`: read [figma.md](references/figma.md) and follow it. It holds what this skill adds to `figma-use`, `figma-generate-library` and `figma-generate-design` (one file, our tokens, modes, pages, states, names, Ready), and the board: the whole look on one bento frame, shown for their yes before any component.

If a Figma decision changes a rule (a new token, a component variant, a spacing step), update `DESIGN.md` in the same turn and say what changed.

### 11. Clean up

Offer to delete `design-exploration/<slug>/`. `DESIGN.md` and Figma now carry the result. On no, leave it. It is gitignored either way.

Then offer the next stage: architecture. They start it by typing `/grill-with-docs`. When it runs, seed `GLOSSARY.md` from the brief and the copy in the Figma screens, and ask before renaming a term the screens show.

## Feature loop

A feature with screens, once `DESIGN.md` exists: read [feature-loop.md](references/feature-loop.md) and follow it. A rebrand is not a feature: that is `design-direction` again, then a first pass.

## Do not

- Choose, swap, drop or rank a dealt recipe, or say which screen you prefer. Tune one recipe instead of fixing its arrangement.
- Ask them to describe the look they want. Show them screens.
- Pick a colour or a face for them in step 5, rank the options, or show one that fails contrast.
- Build more than the first screen before they have chosen one.
- Take a reference's content, pictures or wording, or all of its arrangement, type and ground together.
- Write `DESIGN.md` before they approve a rendered prototype, or rewrite it during a feature. Only a rebrand's first pass replaces it.
- Name a reference, its link, its author or a `design-exploration/` path in anything that outlives the exploration: `DESIGN.md`, Figma, code, comments, commits, PRs, specs, tickets.
- Use a community kit's components or variables in Figma.
- Build the whole component library before the screens need it.
- Mark a frame Ready that lacks a state a person can reach, or that has open hard findings.
