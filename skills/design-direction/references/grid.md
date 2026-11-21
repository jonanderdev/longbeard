# Building the screens

Read by `design-direction`, steps 3 and 4.

Eight first screens: each one reference rebuilt faithfully with the product's own content, changed by one or two things borrowed from other references, and checked until it still works. The agent's own taste adds nothing.

Each screen is its own page, `.longbeard/design/direction/screens/<n>.html`, from [screen-template.html](screen-template.html): plain HTML and CSS, sizes in px at 1440 (or the device's width for an app), every face and colour a variable from `LOOK`, and a `PROVENANCE` list. Keep each screen's translation, before its moves, as `screens/<n>-base.html`. Anything the product does not really have yet (a stand-in picture, a price, an hour, a number or a name the brief does not give) carries `data-standin="picture"` or `data-standin="fact"`, and `data-standin-note` for what is assumed. A picture of theirs carries nothing.

One file for all eight, `.longbeard/design/direction/screens.json`:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move, in a phrase>", "from": "<card name>", "like": "<their words, or null>" }], "picture": "<its main picture>", "tone": "<ground: light or dark, warm or cool>", "why": "<one line>", "proposed": false, "build": "quick", "state": "built" }]
```

`build` is `quick` or `full`. `state` is where the screen ended, written by whoever finishes it, and nothing else is final:

- **A quick screen:** `built`.
- **A full screen:** `built` while its loop runs; `critiqued` when the loop stopped with only small spots left; `fixed` when the third pass ended with larger spots still listed. What is left goes on the sheet as known faults.
- **Failed:** from any job, `"failure": "<why>"`.
- **The round is done** when every screen has ended: a full screen still at `built` is not done. The sheet is drawn only then.

## Five principles

Everything below is one of these; decide a case not listed by them.

### 1. The base stands unless a move names it

A screen is its base, measured, until a move changes one named thing. What no move names stays as the base has it: layout (zones, proportions, margins, where headline, pictures and small text sit), anchors (a centred picture, a full-bleed panel, a headline on the axis), balance, alignments, devices and picture treatment.

- The layout always comes from a reference. A move may turn it or take another reference's, never invent one.
- What they said they like in the base is kept exactly ("this red" stays this red). What they never named is kept by its role: "a punchy accent over a quarter of the page" may become a punchy orange from another reference, at the same strength and share.
- A borrowed thing fits around the base's anchors, or goes to a base with room for it.
- Text on a picture sits on a calm area, as light or dark as the source's. The picture is chosen and cropped to the text, never the text moved off it. With no such picture, say so on the sheet and offer one that has it.
- A device that held content in its source (a box with a product, a band of words) holds the product's content, or is left out; never empty.

### 2. Every measure is a share of the screen, and is kept

Sizes, gaps and fills are measured in the source as a share of its width and height, and kept at 1440 within 15%: type sizes, gaps between pictures, the room between headline and menu, text to the margin or a panel's edge, a label to its picture, the parts of a small device (size, stroke, spacing), and how much of its zone a text block fills.

- An element that grew (longer copy, a bigger face) is set smaller within its role until its room is kept; it never eats its neighbour's gap unless the source collides on purpose.
- A rule or a border ends where it ends in the source; whatever runs off the screen runs off as there.
- Marks that become words (dashes or dots made into links) keep the marks' colour and take the base's small-text size. A poster sets its small text for its own size; on a screen, text read to act (the menu, a control's label) takes the size the board's screen references give it, never smaller.
- **When a layout turns,** every gap and alignment turns with its zone, mirrored, never closed up. Each text block keeps the edge it hangs from (outer margin, seam, axis), its ragged side and its room; running text stays aligned to the reading direction. What is grouped with a text block (button, arrows, small print) moves with it, its inside spacing unchanged.

### 3. A borrowed thing keeps its geometry and its why

Before placing a borrowed thing, measure how it sits in its source (its size against the screen, what it overlaps and how far, the room around it) and keep those relations.

**The why they gave is the rule for using it.** "The orange dot, the only contrast on a quiet page" goes only on a quiet base, alone. A why that describes an arrangement ("black-and-white photos at different heights, like a contact sheet") goes only where the arrangement is, never onto one framed picture. Read each why against the base; if it would not be true there, the move goes to another base. A like belongs to its reference, never a house style across the round.

### 4. A move changes only what it names

One or two moves per screen, each borrowed from another reference, spread across the round. A move is one of:
- **a palette:** another reference's whole palette, or the subject's;
- **a thing from the subject:** one they liked on its card (a stamp, a number, a paper bag), changed in form to fit, a device or a layout, keeping what they liked in it;
- **a colour by its role:** one colour they did not name, for another of the same role and strength;
- **an element:** one device from another reference, on the base's grid;
- **the face:** another's display face that can carry the base's headline, at its size;
- **the picture treatment:** another's crop, tone or frame;
- **the layout turned:** mirrored, headline and picture traded, or one zone moved, proportions kept;
- **the scale:** the headline larger or smaller, as far as another reference sets its own.

A move brings only that one thing: a face move never brings its source's colour, case or weight beyond the role; a palette move never brings a face.

The moves are theirs: what they said they like in each reference, the subject's card too, is what is borrowed. Where they named nothing, propose a move from the reading, marked `"proposed": true` in `screens.json` and in the table. A move the base cannot take is dropped for another, never forced.

### 5. Nothing from outside the board

Every face, colour, element and effect names its reference in `PROVENANCE`; the subject's card is one, and its pictures and what they liked in them are the product's own material, not the agent's taste. The design brief rules out only what it names; a like it rules out is carried by its role.

## Which screens

Every reference they liked is the base of at least one screen, the lead of two. With fewer than eight, the lead, then the likes, take a second screen with other moves. Across the eight, faces, picture treatments, palettes and pictures spread as widely as the board's: each face mostly on its own reference's screens, a borrowed thing on two screens at most, different photos and crops. **The spread is checked on the plan, before any screen is built:** from the `picture` and `tone` in `screens.json`, no main picture on more than two screens and no tone on more than half. A plan that fails changes its pairings. Only a like that says it is the point ("always black and white") repeats more.

## The quick round

Each screen is built once and not judged: no critic, no fixer, no device close-ups.

**1. Plan (you).** Pair bases and moves for the eight (principles 3 and 4), write `screens.json` (`build: quick`), check its spread, and only then write each screen's brief, `.longbeard/design/direction/briefs/<n>.md`: the base's reading from `library.json` and its picture's path; each move in words with its source picture's path, its like and its why; the content in the base's slots, in the fill order; the product's pictures for this base (principle 1); the five principles, as written. Nothing else from this file or the session.

**2. Build (a fresh agent per screen, from its brief only).**
- Translate the base into `screens/<n>-base.html` from [screen-template.html](screen-template.html), with the product's content and pictures, treated only as the reference treats its own. Capture it, then measure it against the reference:
  ```
  node <skill>/scripts/layout-diff.mjs <reference picture> .longbeard/design/direction/grid/<n>-base.png --out .longbeard/design/direction/checks/<n>-base
  ```
  Fix the translation until nothing it lists is off, or each that is has a reason (longer copy set smaller).- Make the moves into `screens/<n>.html`, by principles 3 and 4, and capture it. State `built`.

**Then the round (you).**
- **Not a copy.** A fresh agent is given each screen and its base side by side, at thumbnail size, and answers yes or no: *can you tell them apart at a glance, by the ground or accent, the face, the layout turned, a device added or gone, or the picture treatment?* Yes is not a copy. No is a copy: its plan gets another move, and it is built again from step 2. Keeping the base's layout, measures and system is the method, never a copy by itself.
- **As varied as the board** (Which screens), again on what was built.
- **Contrast,** every screen, rough or not; a failure blocks the sheet. Fixed with the screen's own colours or another crop (principle 1), never by moving the text:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
- **Faults:** a clipped word, text under 12 px at 1440, a lone word on a heading's last line, the same sentence twice.
- **Each picture:** `picture-cast.mjs <pictures>`, run on the product's pictures, not the captures: a cast, blown highlights or crushed shadows the reference lacks is a picture to replace.

A helper that fails twice is recorded as `failed` with why, and shows on the sheet as failed.

## The full build

Only on what they pick: "more of 3" (the pick, if rough, and the new screens), a mix, or the screen they lean to. A screen made on a picked base is full from its plan. One agent that builds and judges defends its own choices, so each job below has a fresh agent with only what it needs. The plan and the build are the quick round's; then:

**3. Critique (a fresh agent per screen, pictures only).** It gets: the base reference (cropped to its screen), the final screen, `layout-diff.mjs`'s `side.png` and `overlay.png` for it (`--mirror` when the layout turned) and the lines its `diff.json` marks off, the translation's capture, 3× crops of every small device, rule, tight gap and edge beside the same crops of the source (made for it: it runs no scripts), each move's source picture, the moves in words, and the contrast report. No rules, no brief, no session; only what the product is, in one line. It answers:
- **Where is this screen less finished than its reference?** Every spot, small ones included (a gap, an edge, a size, a weight, a colour, a picture, text that cannot be read), each with the place in the reference that shows how it should be. The reference is the standard: what it does on purpose is never a fault.
- **What changed from the translation that no move names?**
- **In one line, what made the reference work, and does the screen keep it?**
- **Anything on the screen that no reference has?**
- **What on this screen exists only because of this product?** Not its words or pictures but a thing: its ownable, a mark, a number, a form. An empty answer is a fault, listed like any other: a screen as right for another trade has borrowed and added nothing.

It lists; it never redesigns.

**4. Fix (a fresh agent per screen).** It gets the critic's list, the screen's file and the same pictures, and changes only the spots listed, each toward what the reference does, with what the screen and its references already have; an empty answer to the last question is fixed with the ownable or a thing from the subject's card. Each fix is a new version (`<n>-a.html`, `<n>-b.html`), every one kept: a later fix is not always better. Then capture, `layout-diff.mjs` and contrast again, and a fresh critic again. **It stops when every spot left is small, or after three passes.** A spot is small when it is within the 15% principle 2 keeps, shows only in a 3× crop and never at the screen's own size, and breaks nothing the reference does on purpose; an empty answer to the product question is never small. What is left goes on the sheet as a known fault, in the table, never hidden.

Then the round's checks again on every new or changed screen.

## Without fresh agents

When no agent can be started clean, do the jobs yourself, one screen at a time, each from its brief alone. As critic, look only at the prepared pictures and write the list before you fix anything, never from memory of the build. The round is weaker, and says so: the sheet carries `--note`, and the table's first line says why ("built and judged by one agent: no clean agent could be started"). Never call such a screen checked as if a critic had seen it.

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html --rough 1,2,4 .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

`--rough` lists the quick screens (`none` when all are full), which the sheet labels. `--note "<text>"` prints a line under the sheet. A second sheet shows each screen beside its base (`grid/bases.html`, `--cols 2`).

For an app, or a site whose design brief says `first seen on: phone`, build and capture at the device size (`?size=390x844`, `--width 390`, a clip of that size); the desktop comes in `design-prototype`.
