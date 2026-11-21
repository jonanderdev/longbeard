# Building the screens

Read by `design-direction`, step 3.

Eight first screens, each built the way a designer works from a board: take one reference whose design works, rebuild it faithfully with the product's own content, then change it with one or two things borrowed from other references, and make sure it still works. The references are finished designs: their sizes, spacing, type and colour were chosen together, and that is why they work. The agent's own taste adds nothing.

Each screen is its own page, `.longbeard/design/direction/screens/<n>.html`, from [screen-template.html](screen-template.html): plain HTML and CSS, sizes in px at 1440 (or the device's width for an app), every face and colour a variable from `LOOK`, and a `PROVENANCE` list. Keep each screen's translation too, before its moves, as `screens/<n>-base.html`. Anything on a screen the product does not really have yet (a stand-in picture, a price, an hour, a number or a name the brief does not give) carries `data-standin="picture"` or `data-standin="fact"` on its element, and `data-standin-note` for what is assumed. A picture of theirs carries nothing.

One file for all eight, `.longbeard/design/direction/screens.json`:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move, in a phrase>", "from": "<card name>", "like": "<their words, or null>" }], "why": "<one line>", "proposed": false }]
```

## Five principles

Everything below is one of these. When a case is not listed, decide it by them.

### 1. The base stands unless a move names it

A screen is its base reference, measured, until a move changes one named thing. What no move names stays as the base has it: its layout (zones, proportions, margins, where the headline, pictures and small text sit), its anchors (a picture centred on the page, a full-bleed panel, a headline on the axis), its balance (symmetrical stays symmetrical; an asymmetric base keeps its counterweight), its alignments (every element on an edge or an axis of its zone), its devices, and its pictures' treatment.

- The layout always comes from a reference, even when no like mentions layout. A move may turn it or take another reference's layout, never invent one.
- What they said they like in the base is kept exactly ("this red" stays this red) and no move changes it. What they never named is kept by its role: a big red they never named is "a punchy accent over a quarter of the page", and a move may make it a punchy orange from another reference, at the same strength and share.
- A borrowed thing fits around the base's anchors (placed, sized or set smaller to fit), or goes to a base with room for it.
- Text on a picture relies on what is under it: the source chose a calm area (sky, skin, a plain wall) for its words. The product's picture is chosen and cropped so the text sits on an area as calm and as light or dark as the source's: the picture is fitted to the text, the text never leaves the picture. When no picture of theirs or stand-in has such an area, say so on the sheet and offer the screen with a picture that does, never one whose text cannot be read.
- A device that held content in its source (a box with a product, a band of words, a thumbnail with a label) holds the product's content, or is left out; never empty.

### 2. Every measure is a share of the screen, and is kept

Sizes, gaps and fills are measured in the source as a share of its width and height, and kept at 1440 within 15%. That covers type sizes, the gaps between pictures, the room between a headline and the menu, text to the margin or a panel's edge, a label to its picture, the parts of a small device (arrows, a ring, a seal: each part's size, its stroke, the spacing between them), and how much of its zone a text block fills.

- An element that grew (longer copy, a bigger face) is set smaller within its role until its room is kept; it never eats its neighbour's gap unless the source collides on purpose.
- A rule or a border ends where it ends in the source (the screen's edge, the box's, the column's). Whatever runs off the screen runs off as in the source: a band looping off both sides starts and ends mid-word.
- Marks that become words (a device's dashes or dots made into links or labels) keep the marks' colour and take the base's small-text size, never smaller than its other small text.
- A poster or a print piece sets its small text for its own size. On a screen, text a visitor reads to act (the menu, a control's label) takes the size the board's screen references give it, never smaller.
- **When a layout turns,** every gap and alignment turns with its zone, mirrored, never closed up. Each text block keeps the edge it hangs from (the outer margin, the seam, the axis), the side its ragged edge faces, and its room; left or right follows from that. Running text of several lines stays aligned to the reading direction, in the column beside its edge. What is grouped with a text block (its button, its arrows, its small print) moves with it, its inside spacing unchanged.

### 3. A borrowed thing keeps its geometry and its why

Before placing a borrowed thing, measure how it sits in its source (its size against the screen, where it crosses what it overlaps and how far, the room around it) and place it with the same relations.

**The why they gave is the rule for using it.** "The orange dot, the only contrast on a quiet page" goes only on a quiet base, alone. A why that describes an arrangement goes only where the arrangement is: "black-and-white photos at different heights, like a contact sheet" is about several photos together, so it never goes onto one framed picture. Before each move, read its why against the base; if it would not be true there, the move goes to another base. A like belongs to its reference: it goes where that reference goes, never a house style across the round.

### 4. A move changes only what it names

One or two moves per screen, each borrowed from another reference, spread across the round. A move is one of:
- **a palette:** another reference's whole palette, as it works together, or the subject's;
- **a colour by its role:** one colour they did not name, for another of the same role and strength;
- **an element:** one device from another reference, on the base's grid;
- **the face:** another reference's display face, of a kind that can carry the base's headline, at the base's size;
- **the picture treatment:** another reference's crop, tone or frame;
- **the layout turned:** mirrored, the headline and picture traded, or one zone moved, proportions kept;
- **the scale:** the headline larger or smaller, as far as another reference sets its own.

A move brings only that one thing. A face move brings the face, never its source's colour, case or weight beyond the role; a palette move brings colours, never a face. Everything else on that element stays the base's: a liked terracotta headline stays terracotta whatever face it takes.

The moves are theirs: what they said they like in each reference is what is borrowed. Where they named nothing for a reference, propose its move from its reading, and mark it `"proposed": true` in `screens.json` and in the table. A move the base cannot take is dropped for another, never forced.

### 5. Nothing from outside the board

Every face, colour, element and effect names its reference in `PROVENANCE`. The design brief rules out only what it names; a like it rules out is carried by its role, as said to them before building.

## Which screens

Every reference they liked is the base of at least one screen, the lead of two. With fewer than eight references, the lead, then the likes, take a second screen with other moves. Across the eight, the faces, picture treatments, palettes and pictures spread as widely as the board's: each face mostly on its own reference's screens, a borrowed thing on two screens at most, different photos and crops from screen to screen. Only a like that says it is the point ("always black and white") repeats more.

## Build each screen: plan, build, critique, fix

One agent that builds eight screens and judges them thins its attention and defends its own choices. So each screen is made by fresh agents, each with one job and only what that job needs; screens may be built side by side.

**1. Plan (you).** Pair bases and moves for the eight (Which screens, principles 3 and 4), write `screens.json`, and for each screen a brief, `.longbeard/design/direction/briefs/<n>.md`: the base's reading from `library.json` and its picture's path; each move in words with its source picture's path, the like it carries and its why; the content in the base's slots, in the fill order; the product's pictures to use (chosen for this base, principle 1); the five principles above, as written. Nothing else from this file or the session.

**2. Build (a fresh agent per screen, from its brief only).**
- Translate the base into `screens/<n>-base.html` from [screen-template.html](screen-template.html), with the product's content and pictures, treated only as the reference treats its own. Capture it, then measure it against the reference:
  ```
  node <skill>/scripts/layout-diff.mjs <reference picture> .longbeard/design/direction/grid/<n>-base.png --out .longbeard/design/direction/checks/<n>-base
  ```
  Fix the translation until nothing it lists is off, or each that is has a reason (longer copy set smaller). This is the one step where a screen should look like its reference.
- Make the moves into `screens/<n>.html`, by principles 3 and 4, and capture it.

**3. Critique (a fresh agent per screen, pictures only).** It gets: the base reference (cropped to its screen), the final screen, `layout-diff.mjs`'s `side.png` and `overlay.png` for it (`--mirror` when the layout turned) and the lines its `diff.json` marks off, the translation's capture, 3× crops of every small device, rule, tight gap and edge beside the same crops of the source (make them for it; it may not run scripts), each move's source picture, the moves in words, and the contrast report. No rules, no brief, no session. It answers:
- **Where is this screen less finished than its reference?** Every spot, small ones included (a gap, an edge, a size, a weight, a colour, a picture, text that cannot be read), each with the place in the reference that shows how it should be. The reference is the standard: what it does on purpose (overlaps, crops, collisions, tiny type) is never a fault.
- **What changed from the translation that no move names?**
- **In one line, what made the reference work, and does the screen keep it?**
- **Anything on the screen that no reference has?**

It lists; it never redesigns. "Nothing" is a fine answer.

**4. Fix (a fresh agent per screen).** It gets the critic's list, the screen's file and the same pictures, and changes only the spots listed, each toward what the reference does, with what the screen and its references already have. Each fix is a new version (`<n>-a.html`, `<n>-b.html`), every one kept: a later fix is not always better. Then capture, `layout-diff.mjs` and contrast again, and a fresh critic again, until a critic finds nothing, at most three times. What is still listed after the third goes on the sheet as a known fault, in the table, never hidden; they may take any version.

**Then the round (you),** once every builder, critic and fixer has finished.
- **Not a copy.** A fresh agent, given each screen and its base only: does it read as the same design with new words and pictures? Every screen changes at least one thing they did not name, beyond the content; where it still reads as the base, its plan gets another move, and it is built again from step 2.
- **As varied as the board** (Which screens).
- **Contrast,** every screen; a failure blocks the sheet. Fixed with the screen's own colours or another crop (principle 1), never by moving the text:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
- **Faults:** a clipped word, text smaller than 12 px at 1440, a lone word on a heading's last line, the same sentence twice.
- **Each picture:** `picture-cast.mjs <pictures>`; a cast, blown highlights or crushed shadows the reference does not have is a picture to replace.

**A screen shown again** (more of it, a mix, a fix they asked for) goes beside the version they last saw first, to a fresh critic: what got worse? A change that breaks something they liked is undone.

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

And a second sheet of each screen beside its base (`grid/bases.html`, `--cols 2`), so they can see what each one keeps and what it changes.

For an app, or a site whose design brief says `first seen on: phone`, build and capture at the device size (`?size=390x844`, `--width 390`, a clip of that size); the desktop comes in `design-prototype`.
