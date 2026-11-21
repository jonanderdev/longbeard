# Building the screens

Read by `design-direction`, step 3.

Eight first screens, built the way a designer works from a board: one reference whose design works, rebuilt with the product's own content, changed by things borrowed from the other cards, the subject's among them, and checked until it still works. Measuring against the references keeps their craft; it never decides how far a screen moves from them. The round spans near to far, and the person, choosing on rendered screens, decides how new. The agent's own taste adds nothing.

Each screen is a page, `.longbeard/design/direction/screens/<n>.html`, from [screen-template.html](screen-template.html): plain HTML and CSS, px at 1440, every face and colour a variable from `LOOK`, and a `PROVENANCE` list. One file for all eight, `screens.json`:

```
[{ "n": 1, "base": "<card name>", "distance": "near | mid | far", "moves": [{ "what": "<the move, in a phrase>", "from": "<card name, or subject>", "like": "<their words, or null>", "proposed": false }], "why": "<one line>", "versions": ["1-base", "1-a", "1-b"] }]
```

## Five principles

Everything below is one of these. When a case is not listed, decide it by them.

### 1. The base stands as far as the screen's distance says

A screen starts from its base reference, measured. How much of it stands is the screen's distance, planned for the round:
- **near:** the base, with one move. What no move names stays as the base has it: its layout, its anchors (a picture centred on the page, a headline on the axis), its balance, its alignments, its devices and its pictures' treatment.
- **mid:** two or three moves, at least one that changes structure (an element, the layout turned, a structure, a form from the subject).
- **far:** only the base's proportions and system stand: its margins, grid, type scale, spacing rhythm and how empty it is. What fills them comes from moves, at least one from the subject.

At every distance:
- The layout comes from a card on the board: a reference's, turned or not, or a form from the subject's world. Never invented.
- What they said they like in the base is kept exactly ("this red" stays this red). What they never named is kept by its role: an unnamed big red is "a punchy accent over a quarter of the page", which a move may make another reference's orange, at the same strength.
- A borrowed thing fits around the base's anchors (placed, sized or set smaller to fit), or goes to a base with room for it.
- Text on a picture sits on an area as calm and as light or dark as its source's (sky, a plain wall): the picture is chosen and cropped for the text, which never leaves it. With no such picture, say so on the sheet.
- A device that held content in its source holds the product's content, or is left out; never empty.

### 2. Every measure is a share of the screen, and is kept

Sizes, gaps and fills are measured in the source as a share of its width and height, and kept at 1440 within 15%: type sizes, the gaps between pictures, text to the margin or a panel's edge, a label to its picture, the parts of a small device (each part's size, its stroke, the spacing between them), how much of its zone a text block fills. This is the craft every distance keeps.

- An element that grew (longer copy) is set smaller within its role until its room is kept, never eating its neighbour's gap.
- A rule or a border ends where it ends in the source; whatever runs off the screen runs off as in the source.
- Marks that become words (a device's dots made into links) keep the marks' colour and the base's small-text size.
- A poster or a print piece sets its small text for its own size. On a screen, text a visitor reads to act (the menu, a control's label) takes the size the board's screen references give it, never smaller.
- **When a layout turns,** every gap and alignment turns with its zone, mirrored, never closed up; each text block keeps the edge it hangs from and its room, and what is grouped with it moves with it.

### 3. A borrowed thing keeps its geometry, and its why guides it

Before placing a borrowed thing, measure how it sits in its source (its size against the screen, where it crosses what it overlaps and how far, the room around it) and place it with the same relations.

**The why they gave says how to use it.** "The orange dot, the only contrast on a quiet page" goes on a quiet base, alone; "black-and-white photos at different heights, like a contact sheet" goes where there are several photos. Where a why would not be true on a base, the move goes to another. A like belongs to its card, never a house style across the round. **The pick decides, the why guides:** words reach colour and type more easily than proportion or rhythm, so what they pick on the sheet outranks what they said. A picked screen is never blocked by a why it breaks.

### 4. A move changes only what it names

Moves are borrowed from the other cards and spread across the round. A move is one of:
- **a palette:** another card's whole palette, as it works together, the subject's included;
- **a colour by its role:** one colour they did not name, for another of the same role and strength;
- **the face:** another reference's display face, of a kind that can carry the base's headline, at the base's size;
- **the picture treatment:** another reference's crop, tone or frame;
- **the scale:** the headline larger or smaller, as far as another reference sets its own;
- **an element** (structure): one device from another reference, on the base's grid;
- **the layout turned** (structure): mirrored, the headline and picture traded, or one zone moved, proportions kept;
- **a structure:** another reference's grid, columns or reading path, on the base's proportions;
- **a form from the subject** (structure): something only the product's world has, made into a layout or a device: the bakery's stamp holding the action, the oven's numbers carrying the status, the chalked list as the page's column. It comes from the subject card ([subject.md](subject.md)) and the ownable, never from the agent's idea of the category.

A move brings only that one thing: a face move brings the face, never its source's colour or case; a palette move brings colours, never a face. A liked terracotta headline stays terracotta whatever face it takes.

The moves are theirs: what they like in each card is what is borrowed. Where they named nothing for a card, the subject's included, propose its move from its reading, and mark it `"proposed": true` in `screens.json` and in the table; never write a like for them. A move the base cannot take is dropped for another, never forced.

### 5. Nothing from outside the board, and the subject is on it

Every face, colour, element and effect names its card in `PROVENANCE`: a reference, or the subject. The product's own world (its objects, signs, numbers and marks) is a card like any other, so its forms may shape a screen; the agent's taste may not. The design brief rules out only what it names; a like it rules out is carried by its role, as said to them before building.

## Build each screen: plan, build, critique, fix

One agent that builds eight screens and judges them thins its attention and defends its own choices. So each screen is made by fresh agents, each with one job and only what that job needs; screens may be built side by side. **Wait for every one** before the round's checks and the sheet: a run never ends with a helper still working.

**1. Plan (you).**
- **The range.** Each round spans near to far, for example three near, three mid and two far, so they see how far their board can go; "more of 3" keeps 3's distance.
- **The bases.** Every reference they liked is the base of a screen, the lead of two; with fewer than eight, the lead, then the likes, take another at another distance.
- **The spread, checked now, before any screen is built.** Across the eight, faces, palettes, tones, picture treatments, pictures and crops spread as widely as the board's: each face mostly on its own reference's screens, a borrowed thing on two screens at most, no photo the main picture on more than two, no tone on more than half. Only a like that says it is the point ("always black and white") repeats more.

Write `screens.json`, and a brief per screen, `briefs/<n>.md`: its distance; the base's reading and picture path; each move in words with its source picture (for a subject form, the subject pictures), its like and its why; the content in the base's slots, in the fill order; the product's pictures for this base; the five principles, as written. Nothing else from this file or the session.

**2. Build (a fresh agent per screen, from its brief only).**
- Translate the base into `screens/<n>-base.html`, with the product's content and pictures, treated as the reference treats its own. Capture it and measure it against the reference:
  ```
  node <skill>/scripts/layout-diff.mjs <reference picture> .longbeard/design/direction/grid/<n>-base.png --out .longbeard/design/direction/checks/<n>-base
  ```
  Fix it until nothing it lists is off without a reason (longer copy set smaller; a portrait poster, read by its shares). At far, only its proportions and system carry on.
- Make the moves into `screens/<n>.html`, by principles 3 and 4, and capture it.

**3. Critique (a fresh agent per screen, pictures only).** It gets: the base reference (cropped to its screen), the final screen, the translation's capture, 3× crops of the small devices, rules and tight gaps beside the same crops of their sources (made for it; it runs no scripts), each move's source picture and words, the screen's distance, and the contrast report. At near, `layout-diff.mjs`'s `side.png` and `overlay.png` too (`--mirror` when the layout turned); at mid and far no overlay, since what moved was planned. No rules, no brief, no session. It answers:
- **Where is the craft less finished than its sources?** Every spot a visitor would see (a gap, an edge, a size, a weight, a colour, a picture, text that cannot be read), each with the place in a source that shows how it should be. Craft, never distance: how far the screen moved from its reference is not a fault, and what a source does on purpose (overlaps, crops, collisions, tiny type) is never one.
- **What on this screen exists only because of this product?** Name it. Nothing but the content and the pictures is a fault.
- **In one line, what made the reference work, and does the screen keep it?**
- **Anything on the screen that no card has?**

It lists; it never redesigns.

**4. Fix (a fresh agent per screen).** It gets the critic's list, the screen's file and the same pictures, and changes only the spots listed, toward its sources' craft, never back toward the base's layout. Each fix is a new version (`<n>-a.html`, `<n>-b.html`), every one kept and captured: a later fix is not always better. Then capture, `layout-diff.mjs` at near, contrast, and a fresh critic again. Stop when the critic lists nothing a visitor would see at full size (only points under 4 px or one step of weight), or after three fixes. What is left goes on the sheet as a known fault; the person may take any version.

**Then the round (you):**
- **Distance as planned.** A fresh agent, given each screen and its base only, says near, mid or far. A screen planned mid or far that reads as near gets another move and is built again from step 2; one planned near that reads far loses a move. Near is a fine answer: it changes one thing they did not name, beyond the content.
- **Contrast,** every screen; a failure blocks the sheet. Fixed with the screen's own colours or another crop (principle 1), never by moving the text:
  ```
  node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
  ```
- **Faults:** a clipped word, text smaller than 12 px at 1440, a lone word on a heading's last line, the same sentence twice.
- **Each picture:** `picture-cast.mjs <pictures>`; a cast, blown highlights or crushed shadows the reference does not have is a picture to replace.

## Capture and sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

And a second sheet of each screen beside its base (`grid/bases.html`, `--cols 2`), so they can see what each one keeps and what it changes.

For an app, or a site whose design brief says `first seen on: phone`, build and capture at the device size (`?size=390x844`, `--width 390`, a clip of that size); the desktop comes in `design-prototype`.
