# Building the screens

Read by `design-direction`, steps 3 and 4. Each screen is one reference rebuilt faithfully with the product's content, changed by one or two things borrowed from others. The agent's own taste adds nothing.

Each screen is `.longbeard/design/direction/screens/<n>.html` from [screen-template.html](screen-template.html): plain HTML and CSS in px at 1440 (or the device width for an app), every face and colour a variable in `LOOK`, and a `PROVENANCE` list. The translation before its moves is kept as `screens/<n>-base.html`. Anything the product does not really have yet carries `data-standin="picture"` or `data-standin="fact"`, with `data-standin-note`; their own pictures carry nothing.

`.longbeard/design/direction/screens.json`, one entry per screen:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move>", "from": "<card name>", "like": "<their words, or null>" }], "picture": "<its main picture>", "tone": "<light or dark, warm or cool>", "why": "<one line>", "proposed": false, "build": "quick", "state": "built" }]
```

`build` is `quick` or `full`. `state` is where it ended: a quick screen `built`; the full screen (only their favourite) `built` while it runs, then `critiqued` (only small spots, nothing fixed) or `fixed`; any job that failed twice `failed` with `"failure": "<why>"`. The sheet is drawn only when every screen has ended.

## Five principles

Decide any case by these. They go to every builder as written.

### 1. The base stands unless a move names it

What no move names stays as the base has it: layout (zones, proportions, margins, where headline, pictures and small text sit), anchors, balance, alignments, devices and picture treatment. The layout always comes from a reference; a move may turn it or take another's, never invent one.

- **Left out:** what they wrote to leave out of the base is dropped, or, when the composition needs its role (a ground, a frame, a face), filled from the nearest reference on the board. Never by the agent's own choice.
- **Liked:** what they like in the base is kept exactly, even against contrast. A liked colour is never stepped to pass: fix the text with what the screen has (the pair's other colour, large text, another crop, the colour moved to a fill behind it); when nothing fits, keep it with a warning and its ratio ("liked terracotta under the label: 3.9:1, AA asks 4.5"). What they never named is kept by its role, and may be swapped for another reference's colour of the same role and strength.
- A borrowed thing fits around the base's anchors, or goes to another base.
- Text on a picture sits on a calm area, as light or dark as the source's: the picture is chosen and cropped to the text, never the text moved. With no such picture, say so.
- A device that held content in its source holds the product's content, or is left out; never empty.

### 2. Every measure is a share of the screen, and is kept

Sizes, gaps and fills, measured in the source as a share of its width and height, are kept at 1440 within 15%: type sizes, gaps, the room between headline and menu, text to the margin, a label to its picture, a small device's parts, how much of its zone a text block fills.

- An element that grew (longer copy) is set smaller within its role; it never eats a neighbour's gap unless the source collides on purpose.
- A rule ends where it ends in the source; what runs off the screen runs off as there.
- Text read to act (the menu, a label) takes the size the board's screen references give it, never a poster's smaller size.
- **A turned layout** turns every gap and alignment with its zone, mirrored, never closed up. Each text block keeps the edge it hangs from and its ragged side; what is grouped with it moves with it.

### 3. A borrowed thing keeps its geometry and its why

Measure how it sits in its source (size against the screen, what it overlaps and how far, its room) and keep that. **Nothing they left out of a reference is borrowed from it.**

**Their why is the rule for using it.** "The orange dot, the only contrast on a quiet page" goes only on a quiet base, alone. A why that describes an arrangement goes only where the arrangement is. If the why would not be true on this base, the move goes to another. A like belongs to its reference, never a house style.

### 4. A move changes only what it names

One or two moves per screen, spread across the round. A move is one of:
- **a palette:** another reference's whole palette, or the subject's;
- **a thing from the subject** they liked (a stamp, a number), changed in form to fit;
- **a colour by its role:** one they did not name, for another of the same role and strength;
- **an element:** one device, or a surface finish, from another reference;
- **the face:** another's display face that can carry the base's headline;
- **the picture treatment:** another's crop, tone or frame, never its kind of picture;
- **the layout turned:** mirrored, headline and picture traded, or one zone moved;
- **the scale:** the headline larger or smaller, as far as another reference goes.

A move brings only its one thing: a face move brings no colour, a palette move no face. Moves come from what they like; where they named nothing, propose one from the reading, marked `"proposed": true`. A move the base cannot take is dropped for another.

### 5. Nothing from outside the board

Every face, colour, element and effect names its reference in `PROVENANCE`; the subject's card counts. The design brief rules out only what it names; a like it rules out is carried by its role.

## Which screens

Every like is the base of at least one screen, the lead of two; with fewer than eight, the lead and then the likes take a second. **Check the spread on the plan, before building:** no main picture on more than two screens, no tone on more than half, a borrowed thing on two screens at most. A plan that fails changes its pairings. Only a like that says it is the point ("always black and white") repeats.

## A quick round

**1. Plan (you).** Pair bases and moves, write `screens.json`, check the spread, then one brief per screen, `briefs/<n>.md`: the base's reading and picture path with what they left out of it; each move with its source picture, like and why; the content in fill order; the product's pictures for it; the five principles. Nothing else.

**2. Build (a fresh agent per screen, from its brief only).** Translate the base into `screens/<n>-base.html` with the product's content, capture it, and measure it against the reference:

```
node <skill>/scripts/layout-diff.mjs <reference picture> .longbeard/design/direction/grid/<n>-base.png --out .longbeard/design/direction/checks/<n>-base
```

Fix it until nothing listed is off without a reason. Then make the moves into `screens/<n>.html`, capture, state `built`.

**3. Check the round (you).**
- **Not a copy:** one fresh judge sees every screen beside its base, as numbered thumbnails, and answers yes or no each: *can you tell them apart at a glance* (ground or accent, face, layout turned, a device added or gone, picture treatment)? A no gets another move and is rebuilt; the rebuilt ones go to one judge together.
- **Spread** again, on what was built.
- **Contrast,** every screen; a failure blocks the sheet, except a liked colour with its warning. Fixed with the screen's own colours or another crop:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
- **Faults:** a clipped word, text under 12 px at 1440, a lone last word in a heading, a sentence twice.
- **Pictures:** `picture-cast.mjs` on the product's pictures; a cast or blown highlights the reference lacks means another picture.

**Without fresh agents,** do each job yourself, one screen at a time from its brief alone; as critic, write the list from the prepared pictures before fixing anything. Say the round is weaker: `--note` on the sheet ("built and judged by one agent").

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html --rough 1,2,4 .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

`--rough` lists the quick screens (`none` when all are full); `--note` prints a line under the sheet. A second sheet shows each screen beside its base (`grid/bases.html`, `--cols 2`). For an app, or `first seen on: phone`, build and capture at the device size (`?size=390x844`, `--width 390`).
