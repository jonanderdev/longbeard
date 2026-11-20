# Building the screens

Read by `design-direction`, step 3.

Eight first screens, each built the way a designer works from a board: take one reference whose design works, rebuild it faithfully with the product's own content, then change it with one or two things borrowed from other references, and make sure it still works. The references are finished designs: their sizes, spacing, type and colour were chosen together, and that is why they work. The agent's own taste adds nothing.

Each screen is its own page, `.longbeard/design/direction/screens/<n>.html`, from [screen-template.html](screen-template.html): plain HTML and CSS, sizes in px at 1440 (or the device's width for an app), every face and colour a variable from `LOOK`, and a `PROVENANCE` list. Keep each screen's translation too, before its moves, as `screens/<n>-base.html`. One file for all eight, `.longbeard/design/direction/screens.json`:

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
- A device that held content in its source (a box with a product, a band of words, a thumbnail with a label) holds the product's content, or is left out; never empty.

### 2. Every measure is a share of the screen, and is kept

Sizes, gaps and fills are measured in the source as a share of its width and height, and kept at 1440 within 15%. That covers type sizes, the gaps between pictures, the room between a headline and the menu, text to the margin or a panel's edge, a label to its picture, the parts of a small device (arrows, a ring, a seal: each part's size, its stroke, the spacing between them), and how much of its zone a text block fills.

- An element that grew (longer copy, a bigger face) is set smaller within its role until its room is kept; it never eats its neighbour's gap unless the source collides on purpose.
- A rule or a border ends where it ends in the source (the screen's edge, the box's, the column's). Whatever runs off the screen runs off as in the source: a band looping off both sides starts and ends mid-word.
- Marks that become words (a device's dashes or dots made into links or labels) keep the marks' colour and take the base's small-text size, never smaller than its other small text.
- **When a layout turns,** every gap and alignment turns with its zone, mirrored, never closed up. Each text block keeps the edge it hangs from (the outer margin, the seam, the axis), the side its ragged edge faces, and its room; left or right follows from that. Running text of several lines stays aligned to the reading direction, in the column beside its edge. What is grouped with a text block (its button, its arrows, its small print) moves with it, its inside spacing unchanged.

### 3. A borrowed thing keeps its geometry and its why

Before placing a borrowed thing, measure how it sits in its source: its size against the screen, where it crosses what it overlaps and how far, the room around it. Place it on the base with the same relations. "The headline over the picture's edge" in a source where it crosses at mid-height with room all round never sits on the picture's foot.

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

## Build each screen

1. **Translate the base.** Rebuild its reading (library.md) at 1440, with the product's content in the base's slots, filled in order (the headline, the primary action, the status, what the product shows), each as long as the base's own, at most one more where the base has a place for it. Pictures treated only as the reference treats its own. Save it as `screens/<n>-base.html`.
2. **Check the translation** beside the reference, on one sheet: the boxes in the same places, and principle 2's measures within 15%. Fix until they are. This is the one step where a screen should look like its reference.
3. **Make the moves,** by principles 3 and 4, into `screens/<n>.html`.

## Then check all eight

Each screen gets one fresh reviewer that runs these checks in order, seeing only the pictures each check names, so it judges what is there, not what was meant. Make what it needs first (the captures, the translation's capture, the 3× crops beside the same crops of the source), since a reviewer may not run scripts; after its fixes, the screen gets a fresh reviewer again, until one finds nothing. Each finding is fixed by the principle it breaks, never by tidying the composition.

- **What else changed.** Given the translation (`<n>-base.html`), the final screen and its moves in words: everything that differs that no move names (a colour, a gap, a size, a weight, an alignment, a picture's tone, balance). Each is put back as the translation had it. This is how a move stops carrying more than it names.
- **Still feels like it.** Given the base reference and the final screen: in one line, what made the reference work (its colour mood, its rhythm of space, its type's colour and weight, its calm or its punch), then whether the screen keeps it. Where it does not, find what took it away and put it back.
- **Each borrowed thing beside its source.** Given the screen and the references its moves came from: does each borrowed thing sit as it does there (where it crosses, how big, the room around it)?
- **Close up.** Crops at three times size of every small device, every rule and border, every tight gap and both ends of whatever runs off the screen, each beside the same crop of its source: where a part, a stroke, a spacing or a line's end differs. And each picture: `node <skill>/scripts/picture-cast.mjs <pictures>` on every picture the screen uses; a strong cast, blown highlights or crushed shadows the reference does not have is a picture to replace or correct.
- **Not a copy.** Given the screen and its base only: does it read as the same design with new words and pictures? Every screen changes at least one thing they did not name, beyond the content; where it still reads as the base, add or strengthen a move.
- **Nothing that is not on the board.** Given the screen, the reference pictures and its `PROVENANCE`: anything no reference has (a gradient, a shadow, a default button, a pill, a decoration, a colour, an effect). Each comes out or is replaced by what its reference uses.
- **Contrast,** every screen; a failure blocks the sheet until it is fixed, with colours the screen already has, never by moving the text:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
- **Faults:** a clipped word, text over a picture that cannot be read, text smaller than 12 px at 1440, a lone word on a heading's last line, the same sentence twice. Overlaps, crops and collisions the references use are not faults.

**After a round they did not take, or a fix:** before showing a rebuilt screen again, put it beside the version they last saw and list what got worse, not only what changed. A fix that breaks something they liked is undone.

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

And a second sheet of each screen beside its base (`grid/bases.html`, `--cols 2`), so they can see what each one keeps and what it changes.

For an app, build and capture at the device size (`?size=390x844`, `--width 390`, a clip of that size), with the app's navigation. The same for a site whose design brief says `first seen on: phone`: its first screen is the phone's; the desktop comes in `design-prototype`.
