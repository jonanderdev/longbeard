---
name: design-identity
description: >
  Refines the chosen screen's type and colours from rendered options traced
  to their board, then the identity board. Writes docs/design/design-
  identity.md. Runs after design-direction, or for a rebrand.
---

# Design identity

**Needs:** `docs/design/design-brief.md`, `docs/design/design-direction.md`  
**Uses if there:** `docs/design/design-moodboard.md`  
**Writes:** `docs/design/design-identity.md`, `docs/design/design-identity.html`

The direction found the look by building screens from their references. This skill makes it the product's own: it starts from what the chosen screen was built with, shows close alternatives on that same screen, and locks one pairing and one palette. Every option comes from somewhere they can point to. The agent never invents a palette or picks a face by taste.

Two files come out, both committed:

- **`docs/design/design-identity.md`**: the faces and the colours with their values and roles, and why, in plain words. Its `json identity` block is what `design-prototype` builds with.
- **`docs/design/design-identity.html`**: the identity board. `design-figma` puts it on the Figma Cover.

Options and captures live in `.longbeard/design/identity/`, gitignored.

Three stops, no more: options, one refinement, the board.

**At every stop,** say what is new and the one question, in up to five lines: one line per option, nothing they already know. They look at the page itself (the board, the canvas, a screen), never a picture of it: its path where they can open this machine's files; where they cannot (a cloud session), `bundle.mjs <page> --out <one file>`, publish that as a private page if your agent can, and give the link. Pictures are for your own checks. Each yes is written to its doc when it is given, so the session can end at any stop. **At the end,** say what is now decided, the next step and why, and to start it in a new session (the files carry it), with what to type; when the next step needs this working folder and the folder will not outlive the session (a cloud session), go on here and say why.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No `docs/design/design-direction.md` → `design-direction`. Stop, and say which.
2. An identity exists → a change. Show the board, ask what changes, and reopen only that.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

Read the design brief (words, personality, feel, never, what is fixed, accessibility, voice, decides) and the direction's principles and "Look, as built". The chosen screen is `.longbeard/design/direction/prototype/first.html`; if the working folder is gone, take the kept copy in `docs/design/prototype/`, else rebuild it from `design-direction.md` and say so. **What is fixed is fixed:** a face or colour they own is in every option; a refused one is in none; light, dark or both decides which grounds count.

**At `pace: quick`** (the design brief): no options and no refinement. The chosen screen's type and colours, as built, are the identity: check every pair with `contrast.mjs` (at the brief's level), fix a failing ink with the nearest step that passes (`colours.mjs`, with `--level AAA` when the brief asks for it); a colour they liked by name is never stepped: it stays, with its warning. The accent is still asked (below), then go to **3. The board**. They can ask for options at the board; that is full pace from there.

## 1. Options, on the chosen screen, in one message

When the project brought a `DESIGN.md` with tokens (see `design`), its faces and colours come first in each row, "as brought", ahead of the options below, and are rendered on the chosen screen like any other. They are the person's choice and are never overruled.

**Type pairings, three to five.** A pairing is a display face and a text face. The first is the one the screen was built with.

- **Measured neighbours, never from memory:** `fonts.mjs` lists every Google Fonts face of the same kind, measured (width, x-height, darkness, stroke contrast), nearest first, each with how widely it is used.

  ```
  node <skill>/scripts/fonts.mjs "Newsreader" --weight 300
  node <skill>/scripts/fonts.mjs "Inter" --body
  node <skill>/scripts/fonts.mjs "Their Face" --kind sans --css "<its stylesheet>"
  ```

- **From their other references:** a face another like uses (the library's `type`), when it suits this composition.
- At least two of the pairings use faces from beyond the hundred most used (`used` over 100), so the set is not only what every site has. A face read `by: eye` is a stand-in: say so, and offer the free faces nearest it. Every face is free to license, or theirs.

**Palettes, three to five.** A palette is three to five colours, each with a role: `ground` (a surface it can stand on), `ink` (text), `accent`. A colour can hold more than one role. The first is the one the screen was built with.

- **Even steps** around it: `colours.mjs` gives lighter, darker, warmer, cooler in OKLCH, and the derived roles, and leaves out what fails contrast.

  ```
  node <skill>/scripts/colours.mjs --ground "#f1ede4" --ink "#111111" --accent "#fe2601" --family "<the references' colours>" --theirs "<theirs>" --level <AA|AAA, the design brief's accessibility>
  ```

- **From their other references,** the palettes in the direction's readings (`library.json`), each whole.
- **From the subject:** the light, dark and signature palettes `subject-colours.mjs .longbeard/design/pictures --level <AA|AAA>` proposes: the pictures' own colours, chosen and tuned to their roles by rule, never sampled raw. Often the most ownable, because they are the product's own world. Say for each the thing in the picture it came from ("the crust, lightened to carry white text"); a colour that cannot be named as part of the subject is not offered.
- **Theirs,** what the design brief records as owned.
- Every palette meets [rule 6](references/design-floor.md#6-colour)'s contrast at the brief's level; the scripts offer only that, so pass `--level` every time. A colour they liked by name is never stepped to pass: fix the pair with its other colour, or move it to a fill, a mark or large text; else keep it with its warning and ratio, and let them choose.

**The accent, at every pace.** Picking a screen is not picking its accent: unless they named it or the board leaves no doubt, render the harmony options (`colours.mjs --harmony`), the subject's and the built one on the chosen screen, and ask.

**Render them on the chosen screen, never list them.** The screen takes overrides in its URL, so each option is a capture, not a rebuild:

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/first.html?face=Newsreader&body=Inter&weight=300" --out .longbeard/design/identity/type-1.png --clip 0,0,1440,900
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/first.html?ground=%23f1ede4&ink=%23111111&accent=%23fe2601" --out .longbeard/design/identity/colour-1.png --clip 0,0,1440,900
node <skill>/scripts/canvas.mjs .longbeard/design/identity/options.json --shots .longbeard/design/identity --title Identity --out .longbeard/design/identity/canvas.html
```

`options.json` lists each capture: `{ "n": "type 1", "row": "Type", "note": "as built", "shot": ".longbeard/design/identity/type-1.png", "state": "built" }`. On the canvas, a row of pairings (each on the screen's colours) and a row of palettes (each on the screen's type), so each choice is seen alone and in the composition they chose. Number them, never rank them. For each, one line of where it comes from (its `note`) ("as built", "a narrower, darker cousin, less used", "from the bread's crust and flour"), never which is best. Where an option sits plainly against the design brief (a script face for a serious 1, a cold palette for a warm 1, its never word) or breaks one of the direction's principles, add that as a fact on the same line; it stays an option.

> Pick a pairing and a palette (any mix: "type 2, colours 4"), or tell me what you're after: "warmer", "no green", "something like the type in X". "Keep" leaves the screen as built.

## 2. One refinement

On what they picked, one row of nearby choices on the same canvas (`"row": "Refine"`), rendered on the screen the same way: the display face's nearest neighbours, each colour's even steps. Or build what they asked for in words, and show it before it counts.

In the same message, the screen with their pick and a few live controls (type scale, line spacing, accent strength, corner radius), each limited to what their references measure, so they judge a value by seeing it. How: [controls.md](references/controls.md).

> Keep this, or take any from the row? Or open the screen, press Adjust, and paste the copy-out.

"Go" keeps what they picked.

## 3. The board

Copy [identity-board.html](references/identity-board.html) to `docs/design/design-identity.html`, write its `IDENTITY` block (the product's real name, one line in the voice, the faces, the colours with roles), capture it and read it yourself (every face loaded, every colour shown, nothing clipped). Then show the board itself, the page, and the chosen screen in the identity, as a second page.

> Is this us?

A note reopens only that row, then the board again. A yes is the identity. When the design brief's `decides` names someone else, the board is what they confirm: give it the same way, and write the identity once they say it holds.

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

## Adjusted
<one line per control they moved, "headline 96 to 110 px"; or "none">

## Board
docs/design/design-identity.html

```json identity
{ "name": "…", "display": { "face": "…", "weight": 500, "case": "uppercase", "tracking": "-0.01em", "css": null },
  "body": { "face": "…", "weight": 400, "css": null },
  "colours": [{ "name": "…", "hex": "#…", "role": ["ground", "accent"] }] }
```
~~~

Contrast is checked before it is written (`contrast.mjs "#111 on #eee"`, with `--level AAA` when the design brief asks for it). Faces with a stylesheet outside Google Fonts carry its `css`. Names and values only: no reference, site or person.

Then put the identity on the chosen screen, so the prototype starts from it: in `.longbeard/design/direction/prototype/first.html`, set `LOOK` to the identity's faces and colours (the display face and weight, the body face, the ground, the ink, the accent, and any other colour by its role in `more`), and capture it once to see it holds. Nothing else in the page changes. A kept copy in `docs/design/prototype/` (see `design-direction`) takes the same change.

Then the next step in one line: `design-prototype`. If the name is only set in the display face, offer `design-wordmark` once, in the same line; no mark is a fine answer.

## Do not

- Pick a face or a colour for them, rank options, or hide a failing contrast.
- List faces from memory, or describe an option instead of rendering it.
- Run more than one refinement round before the board.
- Choose spacing, layout or a logo here.
