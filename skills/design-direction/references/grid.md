# Building the screens

Read by `design-direction`, step 3.

Eight first screens, each built the way a designer works from a board: take one reference whose design works, rebuild it faithfully with the product's own content, then change it with one or two things borrowed from other references, and make sure it still works. The references are finished designs; what made each one work (its sizes, spacing, type and colour, chosen together) must still work on the screen. The agent's own taste adds nothing: every face, colour, element and effect comes from a reference on the board.

Each screen is its own page, `.longbeard/design/direction/screens/<n>.html`, from [screen-template.html](screen-template.html): plain HTML and CSS, sizes in px at 1440 (or the device's width for an app), every face and colour a variable from `LOOK`, and a `PROVENANCE` list. And one file for all eight, `.longbeard/design/direction/screens.json`:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move, in a phrase>", "from": "<card name>" }], "why": "<one line>" }]
```

## Which screens

- **Bases:** every reference they liked is the base of at least one screen, the lead of two. Fewer than eight references: the lead, then the likes, take a second screen, with other moves.
- **Moves:** one or two per screen, each borrowed from another reference on the board, and spread: across the eight screens, the moves come from as many references as there are. A move is one of:
  - **a palette:** another reference's whole palette (ground, ink and accent as they work together), or the subject's;
  - **an element:** one device from another reference (its disc, its arch window, its word band, its ring of text), placed by the base's own grid;
  - **the face:** another reference's display face, of a kind that can carry the base's headline (a heavy word stays heavy, a hairline line stays light), at the base's size;
  - **the picture treatment:** another reference's crop, tone or frame;
  - **the layout turned:** the base mirrored, or its headline and picture traded, or one zone moved, the proportions kept;
  - **the scale:** the headline larger or smaller, as far as another reference sets its own.
- Choosing which move suits which base is design judgement, and it is yours: say why in one line (`why`). Choose moves that the base's system can take: a condensed face where the base's headline is one wide word, a palette whose contrast its type can carry.

## Build each screen

1. **Translate the base.** Rebuild its reading (library.md) at 1440: its layout as measured, its type at its measured sizes, weights, tracking and leading, its spacing, its palette, its picture treatment applied to the product's own pictures (`filter: grayscale(1)`, a duotone, the frame's shape: only what the reference does). The content is the product's, in the base's slots, filled in order: the headline, then the primary action, the status, what the product shows; as many small blocks as the base has, each as long as the base's own (a three-word label stays three words), and at most one more where the base's system has a place for it. Everything else waits for the prototype.
2. **Check the translation against the base,** before any move: capture it and put it beside the reference on one sheet. The layout's boxes in the same places, the type at the same size against the screen (within 15%), the same amount of empty space, the concept and the move plainly there. Fix until they are. This is the one step where a screen should look like its reference.
3. **Make the moves.** Change only what the move changes. Then **check that it still works:** the headline's size and weight still fit the layout they were made for, the spacing is the base's, a borrowed element sits on the base's grid and at a size the base would give it, the text reads on its ground (`screen-contrast.mjs`). A move the base cannot take is dropped for another, never forced.

## Then check all eight

- **Contrast,** every screen:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
  Fixed with the colours the screen already has (the palette's ink, the panel's ink), never by moving the text.
- **Nothing that is not on the board.** A fresh agent, given only the screen, the reference pictures and the screen's `PROVENANCE`, lists anything on the screen that no reference has: a gradient, a shadow, a default button, a pill, a decoration, a colour, an effect. Each is taken out or replaced by what its reference uses. This is how taste stays out.
- **Not a copy.** A fresh agent, given the screen and its base reference only, says whether it reads as the same design with new words. Where it does, add or strengthen a move (another reference's palette, element or face) until it reads as its own screen in that manner, the concept kept.
- **Faults:** a clipped word, text over a picture that cannot be read, text smaller than 12 px at 1440, a lone word on a heading's last line, the same sentence twice. Overlaps, crops and collisions the references use are not faults.

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

And a second sheet of each screen beside its base (`grid/bases.html`, `--cols 2`), so they can see what each one keeps and what it changes.

For an app, build and capture at the device size (`?size=390x844`, `--width 390`, a clip of that size), with the app's navigation. The same for a site whose design brief says `first seen on: phone`: its first screen is the phone's; the desktop comes in `design-prototype`.
