---
name: design-identity
description: >
  Lock and refine the identity on the screen they chose in design-direction:
  the type pairing and a small set of colours, starting from what that screen
  was dealt, with close alternatives from measured font lists, even colour
  steps, their other references, the subject's pictures and anything they own,
  all rendered on that screen, never picked by the agent. Ends in the identity
  board: the faces at size and the colours as swatches with their values and
  roles. Runs after design-direction; or for a rebrand.
---

# Design identity

**Needs:** `docs/design/design-brief.md`, `docs/design/design-direction.md`  
**Uses if there:** `docs/design/design-moodboard.md`, `docs/design/design-families.md`  
**Writes:** `docs/design/design-identity.md`, `docs/design/design-identity.html`

The direction found the look by dealing type and colour from many references. This skill makes it the product's own: it starts from what the chosen screen was dealt, shows close alternatives on that same screen, and locks one pairing and one palette. Every option comes from somewhere they can point to: the chosen screen, the measured lists, their references, the subject's pictures, what they own. The agent never invents a palette or picks a face by taste.

Two files come out, both committed:

- **`docs/design/design-identity.md`**: the faces and the colours with their values and roles, and why, in plain words. Its `json identity` block is what `design-prototype` builds with and `deal.mjs --identity` deals from.
- **`docs/design/design-identity.html`**: the identity board. `design-figma` puts it on the Figma Cover.

Options and captures live in `.longbeard/design/identity/`, gitignored.

Three stops, no more: options, one refinement, the board.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No `docs/design/design-direction.md` → `design-direction`. Stop, and say which.
2. An identity exists → a change. Show the board, ask what changes, and reopen only that.

Read the design brief (personality, feel, never, what is fixed) and the direction's "Look, as dealt". The chosen screen is `.longbeard/design/direction/prototype/first.html`; if the private folder is gone, rebuild it from `design-direction.md` and say so. **What is fixed is fixed:** a face or colour they own is in every option; a refused one is in none; light, dark or both decides which grounds count.

## 1. Options, on the chosen screen, in one message

**Type pairings, three to five.** A pairing is a display face and a text face. The first is the one the screen was dealt.

- **Measured neighbours, never from memory:** `fonts.mjs` lists every Google Fonts face of the same kind, measured (width, x-height, darkness, stroke contrast), nearest first, each with how widely it is used.

  ```
  node <skill>/scripts/fonts.mjs "Newsreader" --weight 300
  node <skill>/scripts/fonts.mjs "Inter" --body
  node <skill>/scripts/fonts.mjs "Their Face" --kind sans --css "<its stylesheet>"
  ```

- **From their other references:** a face another like uses (the library's `type`), when it suits this composition.
- At least two of the pairings use faces from beyond the hundred most used (`used` over 100), so the set is not only what every site has. A face dealt `by: eye` is a stand-in: say so, and offer the free faces nearest it. Every face is free to license, or theirs.

**Palettes, three to five.** A palette is three to five colours, each with a role: `ground` (a surface it can stand on), `ink` (text), `accent`. A colour can hold more than one role. The first is the one the screen was dealt.

- **Even steps** around it: `colours.mjs` gives lighter, darker, warmer, cooler in OKLCH, and the derived roles, and leaves out what fails contrast.

  ```
  node <skill>/scripts/colours.mjs --ground "#f1ede4" --ink "#111111" --accent "#fe2601" --family "<the references' colours>" --theirs "<theirs>"
  ```

- **From their other references,** the library's grounds and accents.
- **From the subject:** the light, dark and signature palettes `subject-colours.mjs .longbeard/design/pictures` proposes: the pictures' own colours, chosen and tuned to their roles by rule, never sampled raw. Often the most ownable, because they are the product's own world. Say for each what it came from ("the crust, lightened to carry white text").
- **Theirs,** what the design brief records as owned.
- Every palette has an ink that reads on each ground at 4.5:1, and an accent that holds 3:1 on at least one ground.

**Render them on the chosen screen, never list them.** The screen takes overrides in its URL, so each option is a capture, not a rebuild:

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/first.html?face=Newsreader&body=Inter&weight=300" --out .longbeard/design/identity/type-1.png --clip 0,0,1440,900
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/first.html?ground=%23f1ede4&ink=%23111111&accent=%23fe2601" --out .longbeard/design/identity/colour-1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/identity/type.html .longbeard/design/identity/type-1.png … --cols 3
```

One sheet of pairings (each on the dealt colours) and one of palettes (each on the dealt type), so each choice is seen alone and in the composition they chose. Number them, never rank them. For each, one line of where it comes from ("as dealt", "a narrower, darker cousin, less used", "from the bread's crust and flour"), never which is best.

> Pick a pairing and a palette (any mix: "type 2, colours 4"), or tell me what you're after: "warmer", "no green", "something like the type in X". "Keep" leaves the screen as dealt.

## 2. One refinement

On what they picked, one row of nearby choices, rendered on the screen the same way: the display face's nearest neighbours, each colour's even steps. Or build what they asked for in words, and show it before it counts.

> Keep this, or take any from the row?

"Go" keeps what they picked.

## 3. The board

Copy [identity-board.html](references/identity-board.html) to `docs/design/design-identity.html`, write its `IDENTITY` block (the product's real name, one line in the voice, the faces, the colours with roles), capture it, read it yourself (every face loaded, every colour shown, nothing clipped), and show it beside the chosen screen in the identity.

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

Then put the identity on the chosen screen, so the prototype starts from it (the names are the colours' names in the identity block; `--identity` swaps the library's type and colours for the identity's):

```
node <skill>/scripts/deal.mjs .longbeard/design/direction/library.json --identity docs/design/design-identity.md --mix chosen,type=identity,ground=<ground name>,accent=<accent name>
node <skill>/scripts/deal.mjs .longbeard/design/direction/library.json --choose 1
```

Then the next step in one line: `design-prototype`. If the name is only set in the display face, offer `design-wordmark` once, in the same line; no mark is a fine answer.

## Do not

- Pick a face or a colour for them, rank options, or show one that fails contrast.
- List faces from memory, or describe an option instead of rendering it.
- Run more than one refinement round before the board.
- Choose spacing, layout or a logo here.
