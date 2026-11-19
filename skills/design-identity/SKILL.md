---
name: design-identity
description: >
  The product's identity: a type pairing and a small set of colours, chosen by
  them on rendered options drawn from their references, measured font lists and
  even colour steps, never picked by the agent. Ends in the identity board: the
  faces at size and the colours as swatches with their values and roles.
  Starts by making sure there are three or four pictures of the product's own
  subject to design with: theirs, or licensed stand-ins it finds. Runs after
  docs/design/design-brief.md exists, best after design-moodboard; or for a
  rebrand.
---

# Design identity

**Needs:** `docs/design/design-brief.md`  
**Uses if there:** `docs/design/design-moodboard.md`, `docs/design/design-families.md`  
**Writes:** `docs/design/design-identity.md`, `docs/design/design-identity.html`

Two files come out, both committed:

- **`docs/design/design-identity.md`**: the faces and the colours with their values and roles, and why, in plain words. Its `json identity` block is what `design-direction` deals from.
- **`docs/design/design-identity.html`**: the identity board. `design-figma` puts it on the Figma Cover.

Options and captures live in `.longbeard/design/identity/`, and the subject's pictures in `.longbeard/design/pictures/`, both gitignored.

Three stops, no more: options, one refinement, the board.

## Gate

1. No `docs/design/design-brief.md` → `design-brief` first. Stop.
2. No moodboard → say options from references they like beat options from words, and offer `design-moodboard`. On "go", work from the design brief's words.
3. An identity exists → a change. Show the board, ask what changes, and reopen only that.

Read the design brief (personality, feel, never, what is fixed) and the moodboard: `design-moodboard.md`, the taken families in `design-families.md`, and the captures under `.longbeard/design/`. **What is fixed is fixed:** a face or colour they own is in every option; a refused one is in none; light, dark or both decides which grounds count.

## 0. Pictures of the subject

Before any option: three or four pictures of what the product is about (the bakery's bread and its bench, the climbing gym's wall, the app's real data on a desk). Not inspiration from other designs, which is the moodboard's job: the product's own world. They feed the palette options below, and every screen after this (`design-direction`'s grid, `design-prototype`) uses them, so no screen is judged on grey boxes or on another product's pictures.

- **Theirs first.** The design brief says whether they have pictures. If they do, ask for three or four, and save them to `.longbeard/design/pictures/`.
- **None yet:** find stand-ins, a few, never a bulk search. Search the subject, not a mood: the brief's identity nouns ("sourdough loaf", "flour on a wooden bench"), one query per picture you need.

  ```
  node <skill>/scripts/pictures.mjs "sourdough loaf" --out .longbeard/design/pictures --count 2
  node <skill>/scripts/pictures.mjs "flour on a wooden bench" --out .longbeard/design/pictures --count 2 --orientation landscape
  ```

  It keeps only clearly licensed pictures (CC0, public domain, CC BY, CC BY-SA) large enough for a screen, and writes `credits.tsv` beside them. Open each and drop one that is off-subject, then search again for it.
- **Of the kind the look uses.** When the moodboard is photographs, look for photographs; when it is illustration or renders, say that stand-ins for those are not searched, and use the closest photographs, cropped and toned as the moodboard does, until theirs exist.

Do not stop to ask: show the pictures on a contact sheet (`contact-sheet.mjs .longbeard/design/pictures/credits.tsv --out <scratch>/pictures`) with the options in step 1, and say they are stand-ins that theirs replace. They can swap any there.

## 1. Options, in one message

**Type pairings, three to five.** A pairing is a display face and a text face.

- **From the references:** the faces their likes use, read from the live pages (`measure.mjs` on a link lists the loaded fonts), or, from a picture only, the nearest match, marked as a stand-in.
- **Measured, never from memory:** `fonts.mjs` lists every Google Fonts face of the same kind, measured (width, x-height, darkness, stroke contrast), nearest first, each with how widely it is used.

  ```
  node <skill>/scripts/fonts.mjs "Newsreader" --weight 300
  node <skill>/scripts/fonts.mjs "Inter" --body
  node <skill>/scripts/fonts.mjs "Their Face" --kind sans --css "<its stylesheet>"
  ```

- At least two of the pairings use faces from beyond the hundred most used (`used` over 100), so the set is not only what every site has. Every face is free to license, or theirs.

**Palettes, three to five.** A palette is three to five colours, each with a role: `ground` (a surface it can stand on), `ink` (text), `accent`. A colour can hold more than one role.

- **From the references and the subject:** the colours their likes share, from the captures' measured palettes, and the colours of the subject's pictures (`measure.mjs` on the pictures folder gives each its palette).
- **Even steps:** `colours.mjs` gives steps around a colour (lighter, darker, warmer, cooler, in OKLCH) and the derived roles, and leaves out what fails contrast.

  ```
  node <skill>/scripts/colours.mjs --ground "#f1ede4" --ink "#111111" --accent "#fe2601" --family "<the references' colours>" --theirs "<theirs>"
  ```

- Every palette has an ink that reads on each ground at 4.5:1, and an accent that holds 3:1 on at least one ground.

**Render them, never list them.** Copy [identity-board.html](references/identity-board.html) once per option into `.longbeard/design/identity/option-<n>.html`, write each option's `IDENTITY` block (the product's real name, one line in the design brief's voice), capture each, and set them on one sheet:

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/identity/option-1.html" --out .longbeard/design/identity/option-1.png --width 1280
node <skill>/scripts/sheet.mjs .longbeard/design/identity/options.html .longbeard/design/identity/option-1.png … --cols 3
```

When there are many, show pairings on one sheet and palettes on another, each on a neutral pairing or palette, so each choice is seen alone.

Number them, never rank them. For each, one line of where it comes from ("the serif three of your likes share", "a narrower, darker cousin of it, less used"), never which is best.

> Pick a pairing and a palette (any mix: "type 2, colours 4"), or tell me what you're after: "warmer", "no green", "something like the type in X". The pictures are stand-ins I found: swap any.

## 2. One refinement

On what they picked, one row of nearby choices, rendered the same way: the display face's nearest neighbours from `fonts.mjs`, and each colour's even steps from `colours.mjs`. Or build what they asked for in words, and show it before it counts.

> Keep this, or take any from the row?

"Go" keeps what they picked.

## 3. The board

Write the final `IDENTITY` block into a copy of the template at `docs/design/design-identity.html`, capture it, read it yourself (every face loaded, every colour shown, nothing clipped), and show it.

> Is this us?

A note reopens only that row, then the board again. A yes is the identity.

## Write `docs/design/design-identity.md`

~~~markdown
# Identity: <product>

## Type
- display: <face>, <weight>, <case>, <tracking> — <why, in plain words: "narrow and dark, so one word can fill a screen">
- text: <face>, <weight> — <why>

## Colour
| Name | Value | Role | Reads on |
|---|---|---|---|
| <name> | #… | ground | ink 17.0:1 |

## Board
docs/design/design-identity.html

```json identity
{ "name": "…", "display": { "face": "…", "weight": 500, "case": "uppercase", "tracking": "-0.01em", "css": null },
  "body": { "face": "…", "weight": 400, "css": null },
  "colours": [{ "name": "…", "hex": "#…", "role": ["ground", "accent"] }] }
```
~~~

Contrast is checked before it is written (`contrast.mjs "#111 on #eee"`). Faces with a stylesheet outside Google Fonts carry its `css`. Names and values only: no reference, site or person.

Then the next step in one line: `design-direction`. Offer `design-wordmark` only once a `DESIGN.md` exists.

## Do not

- Pick a face or a colour for them, rank options, or show one that fails contrast.
- List faces from memory, or describe an option instead of rendering it.
- Run more than one refinement round before the board.
- Choose spacing, layout or a logo here.
- Search for more than a handful of pictures, or use the references' pictures as the subject's.
