# Building the screens

Read by `design-direction`, step 3.

Eight first screens, each built the way a designer works from a board: take one reference whose design works, rebuild it faithfully with the product's own content, then change it with one or two things borrowed from other references, and make sure it still works. The references are finished designs; what made each one work (its sizes, spacing, type and colour, chosen together) must still work on the screen. The agent's own taste adds nothing: every face, colour, element and effect comes from a reference on the board.

Each screen is its own page, `.longbeard/design/direction/screens/<n>.html`, from [screen-template.html](screen-template.html): plain HTML and CSS, sizes in px at 1440 (or the device's width for an app), every face and colour a variable from `LOOK`, and a `PROVENANCE` list. And one file for all eight, `.longbeard/design/direction/screens.json`:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move, in a phrase>", "from": "<card name>" }], "why": "<one line>" }]
```

## Which screens

- **Bases:** every reference they liked is the base of at least one screen, the lead of two. Fewer than eight references: the lead, then the likes, take a second screen, with other moves.
- **The layout always comes from a reference.** Whatever they liked, and even when no like mentions layout, every design stands on its base's layout as measured: its zones, proportions, margins and where the headline, pictures and small text sit. A move may turn it (mirrored, a zone moved) or take another reference's layout, never invent one. A like about a colour or a face says what to carry; it never frees the layout.
- **What the layout quietly relies on is part of it,** and a move never breaks it:
  - **Balance.** A symmetrical base stays symmetrical; an asymmetric one keeps its counterweight. A move that adds weight on one side (a headline pushed off the axis, a borrowed element) is balanced by the base's own elements, or placed on the axis.
  - **Alignment.** Every element sits on an edge or an axis of its zone in the base's grid (the panel's margin, the column's edge, the picture's side), never at a distance from the screen's edge. When the layout turns, the alignments turn with their zones: a title on the panel's left margin stays on the panel's left margin, wherever the panel goes, and the corners' elements move to the matching corners.
  - **Edges.** Whatever runs off the screen's edge runs off as in its source: a band that loops off both sides starts and ends mid-word, never flush on one side and chopped on the other.
  - **Reading direction.** Turning a layout moves its zones, never the direction text is read in. Text and what is grouped with it (a title, its button, its arrows, its small print) keep their alignment to their own column (left, for English) wherever the column lands, and move as one group, their spacing inside it unchanged.
  - **Text fills its zone as in its source.** Measure how much of its zone's width and height the text takes in the source, and the room left on each side, the ragged side above all. Copy longer than the reference's is set smaller, within the role, until it keeps those proportions; it never runs to the zone's far edge.
  - **Devices hold what they held.** A device that carries content in its source (a box with a product in it, a band of words, a thumbnail with a label) carries the product's content here, or is left out; never shown empty.
- **A like belongs to its reference.** It goes where that reference goes: on screens built on it, or borrowed from it as a move. It is never a house style for the round. Every other screen keeps its own base's treatment of pictures, type and colour; the product's pictures stay as shot unless its base treats them.
- **Kept exactly, or kept by role.** What they said they like in the base is kept exactly: "this red" stays this red. Everything else in it, apart from its layout, is kept by its role, not its value. A big red they never named is "a punchy accent over a quarter of the page": it may become a punchy orange from the subject or a punchy yellow from another reference, at the same strength and the same share. A face they never named is "a light, wide serif headline": another face of that role may take its place. The role is what made the base work; the value is free to change.
- **Moves:** one or two per screen, each borrowed from another reference on the board, and spread: across the eight screens, the moves come from as many references as there are. A move is one of:
  - **a palette:** another reference's whole palette (ground, ink and accent as they work together), or the subject's;
  - **a colour by its role:** one colour of the base they did not name, swapped for another of the same role and strength (a punchy accent for a punchy accent, a quiet ground for a quiet ground), from another reference or the subject;
  - **an element:** one device from another reference (its disc, its arch window, its word band, its ring of text), placed by the base's own grid;
  - **the face:** another reference's display face, of a kind that can carry the base's headline (a heavy word stays heavy, a hairline line stays light), at the base's size;
  - **the picture treatment:** another reference's crop, tone or frame;
  - **the layout turned:** the base mirrored, or its headline and picture traded, or one zone moved, the proportions kept;
  - **the scale:** the headline larger or smaller, as far as another reference sets its own.
- **The moves are theirs.** What they said they like in each reference (its note on the board) is what is borrowed: "the disc" of one is an element move, "the colours" of another a palette move. **The why they gave is the rule for using it:** "the orange dot, the only contrast on a quiet page" goes only on a quiet base, alone, as its one loud thing, never onto a busy one. A move whose why the base would break is given to another base. Pair each with a base that can take it (a condensed face where the base's headline is one wide word, a palette whose contrast its type can carry), and say in one line which like it carries (`why`). Where they named nothing for a reference, propose its move from its reading (its `move`, its palette), mark it `"proposed": true` in `screens.json` and as proposed in the table, so they see which choices were theirs and which were offered. Never a move from outside the board.

## Build each screen

1. **Translate the base.** Rebuild its reading (library.md) at 1440: its layout as measured, its type at its measured sizes, weights, tracking and leading, its spacing, its palette, its picture treatment applied to the product's own pictures (`filter: grayscale(1)`, a duotone, the frame's shape: only what the reference does). The content is the product's, in the base's slots, filled in order: the headline, then the primary action, the status, what the product shows; as many small blocks as the base has, each as long as the base's own (a three-word label stays three words), and at most one more where the base's system has a place for it. Everything else waits for the prototype.
2. **Check the translation against the base,** before any move: capture it and put it beside the reference on one sheet. The layout's boxes in the same places, the type at the same size against the screen (within 15%), the same amount of empty space, the concept and the move plainly there. Fix until they are. This is the one step where a screen should look like its reference.
3. **Make the moves.** Change only what the move changes. **A borrowed thing comes with its geometry, not only its idea.** Before placing it, measure how it sits in the reference it comes from: how far it crosses what it overlaps and where along that edge, its size against the screen, the room around it on each side. Place it on the base with the same relations. "The headline over the picture's edge" in a reference where it crosses at mid-height with room all round never sits on the picture's foot. Then **check that it still works:** the headline's size and weight still fit the layout they were made for, the spacing is the base's, a borrowed element sits on the base's grid and at a size the base would give it, the text reads on its ground (`screen-contrast.mjs`). A move the base cannot take is dropped for another, never forced.

## Then check all eight

- **Balance, alignment and edges.** A fresh agent, given each screen and its base, says where the balance shifted, where an element or a group lost its alignment to its column, where text fills its zone more than in the source, where something is cut at the edge differently from its source, and where a device is empty. Each is fixed by the principle above, never by tidying the composition.
- **Each borrowed thing beside its source.** Put each screen beside the references its moves came from, and look at one thing: does each borrowed thing sit as it does there (where it crosses, how big, how much room around it)? Fix the placement until it does.
- **The round is as varied as the board.** Across the eight: the faces, the picture treatments, the palettes and the pictures spread as widely as the board's do. A board with six display faces shows most of them, each mostly on its own reference's screens; a borrowed thing (a treatment, a face, a device) is on two screens at most; the pictures differ from screen to screen, other photos and other crops, never one picture everywhere. Only a like that says it is the point ("this face", "always black and white") repeats more.

- **Contrast,** every screen; a failure blocks the sheet until it is fixed:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
  Fixed with the colours the screen already has (the palette's ink, the panel's ink), never by moving the text.
- **Nothing that is not on the board.** A fresh agent, given only the screen, the reference pictures and the screen's `PROVENANCE`, lists anything on the screen that no reference has: a gradient, a shadow, a default button, a pill, a decoration, a colour, an effect. Each is taken out or replaced by what its reference uses. This is how taste stays out.
- **Not a copy.** A fresh agent, given the screen and its base reference only, says whether it reads as the same design with new words and pictures. Every screen changes at least one thing in the base they did not name, beyond the content: a colour or the palette by its role, the face by its role, the picture treatment, or the layout turned. Where it still reads as the base, add or strengthen a move until it reads as its own design in that manner, what they liked and the concept kept.
- **Faults:** a clipped word, text over a picture that cannot be read, text smaller than 12 px at 1440, a lone word on a heading's last line, the same sentence twice. Overlaps, crops and collisions the references use are not faults.

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

And a second sheet of each screen beside its base (`grid/bases.html`, `--cols 2`), so they can see what each one keeps and what it changes.

For an app, build and capture at the device size (`?size=390x844`, `--width 390`, a clip of that size), with the app's navigation. The same for a site whose design brief says `first seen on: phone`: its first screen is the phone's; the desktop comes in `design-prototype`.
