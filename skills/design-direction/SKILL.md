---
name: design-direction
description: >
  Find the direction: eight first screens, each one of their references
  rebuilt faithfully with the product's real content and pictures, then
  changed by one or two things borrowed from their other references. Nothing
  on a screen that is not on their board. One agent builds them, scripts check
  contrast and clipped text, and they pick on a rendered canvas, or ask for
  more or a mix. Writes docs/design/design-direction.md. Runs after
  design-brief and design-moodboard; design-identity then refines its type
  and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-families.md`, `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

**They are the designer; you do the craft.** Everything on a screen comes from their board. Understand what they like in each reference and why, and carry that concept onto this product. Make the craft decisions it leaves open, and add no taste of your own.

Writes `docs/design/design-direction.md` (committed) and works in `.longbeard/design/direction/` (gitignored): `library.json`, `screens/<n>.html`, `screens.json`, `prototype/first.html`, captures and the canvas.

**At every stop,** say what is new and the one question, in up to five lines: a path or a sheet instead of pasted content, one line per option, nothing they already know.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, build new screens only if the composition does.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

## 0. Pictures of the subject

Three or four pictures of what the product is about, not other designs: theirs, or a few licensed stand-ins from `pictures.mjs`, one query per picture. Every screen uses them, and their colours are one more palette. How: [subject.md](references/subject.md). Show them on a contact sheet with step 1's message; do not stop to ask.

## 1. The content and the references, in one message

**What a screen carries.** Only as much text as its base carries, filled in order: the headline (the takeaway), the primary action, the status (open now, in stock), the thing the product shows. The rest is listed for `design-prototype`.

**Headlines and the ownable.** Three or four headlines that say the takeaway outright, in the voice, and the ownable: one thing only this product would show (a stamp, a live count, a mark).

**Their board, every reference on it.** Copy the moodboard's `board.md` to `.longbeard/design/direction/board.md`, every card, plus the subject as a card (its contact sheet as the shot, `part: subject`, `screen: no`). With families, `--topics` puts each card under its family: a heading, never a filter.

```
node <skill>/scripts/moodboard.mjs .longbeard/design/direction/board.md --one-lead [--topics .longbeard/design/families/board.md] --out .longbeard/design/direction/board.html
```

It says how many cards it left out for a missing shot: capture those again first. **Likes are asked once:** a card with a `like:` line starts liked, with their words.

> Fill order: <primary> · <status> · <what it shows>; later: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick or rewrite.
> Then open the board (your likes are marked): **Lead** the one whose composition sets the tone, Like any more, and for each new like say what you like and why ("the orange dot: the only contrast on a quiet page"). Anything you don't want from a reference goes in its **Leave out** box. Paste the copy-out.

- **What they like** is what is borrowed; **why** is where it may go. A like without a why: ask once.
- **What they leave out is never on a screen:** dropped, or its role filled from another of their references.
- With fewer than 6 references, say once that the eight will look alike.
- **A like the design brief rules out** ("gold on deep green", brief: light only): the brief wins, and the like is carried by its role. Say it once before building; a change goes under **Changes** in the design brief.

## 2. Read the references

Read the lead and every like closely: its grid, the share of the screen each block takes, type sizes against the width, spacing, colours, faces (the closest Google Font), and what they like in it and why. Measure where you can (`measure.mjs <link>`, or `measure.mjs <picture> --lines` and `fonts.mjs --shape`). Write it to `library.json`, with the subject and its palette from `subject-colours.mjs`: [library.md](references/library.md).

## 3. Eight first screens

Build them yourself, one after another, each `screens/<n>.html` from [screen-template.html](references/screen-template.html) at 1440 by 900 (an app, or `first seen on: phone`: 390 by 844).

- **One reference is the base,** rebuilt faithfully: its composition, proportions, type and colour, with this product's content and pictures.
- **Then one or two moves** borrowed from their other liked references. A move is what they said they like, placed where their why says it belongs, and it changes only what it names. A why that would not be true on this base sends the move to another base.
- **Spread:** the lead is the base of two screens; the other six each stand on one of their liked references. With fewer than six likes, the lead and then the likes take a second. Only the lead and their likes are used, never a card they did not pick. No main picture on more than two screens.
- **Nothing that is not on their board:** no face, colour, gradient, shadow, radius, button style or effect that none of their references has. `PROVENANCE` names the reference for each.
- **Where the board shows nothing for a part** (a field, a price, a badge), take it from the base's own system; if the base has none, from another of their references; if none has it, ask.
- **Marked, not hidden:** anything the product does not really have yet carries `data-standin="picture"` or `"fact"`, with `data-standin-note`.

Record each in `.longbeard/design/direction/screens.json`:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move>", "from": "<card name>", "like": "<their words, or null>" }], "build": "quick", "state": "built" }]
```

Optional: `round` (1 when left out), `fault` (one line), `shot`.

**Check each screen by script:**

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
node <skill>/scripts/rules.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --screen direction-1 --widths 1440
```

Fix a text that fails contrast with the screen's own colours or another crop, never by moving it off the picture. A liked colour stays, with its ratio in `fault`. Fix clipped text by setting it smaller within its role or cutting words. Look at each capture yourself.

**A check reports; the concept wins.** Text over a picture, overlaps, crops, giant type and wide empty space are the look when a reference does them: never tidied away. A finding that would undo what they like is left, said in `fault`, and theirs to decide.

**Show the canvas:**

```
node <skill>/scripts/canvas.mjs .longbeard/design/direction/screens.json --board .longbeard/design/direction/board.md --shots .longbeard/design/direction/grid --out .longbeard/design/direction/canvas.html
```

It shows every screen in a strip and, for the one they open, what it is made from: its base and each move, with the reference and their words. Give its path, and one line per screen only for a fault or for what sits against the brief (its never, its words, its personality, or could be mistaken for what it must stand apart from). Never say which you prefer.

> Which is closest? Or "more", "more of 3", "3 with 6's colours".

## 4. More, mix, choose

- **More of 3:** three more on 3's base with other moves, in round 2.
- **A mix** ("4 with 7's colours"): one screen.
- **More:** a fresh round of eight, new pairings. After two rounds with nothing taken, ask once what is missing (`design-moodboard`).
- **A part,** only when they ask ("other menus for 3"): three or four versions of that part on the screen with everything else kept, each from a reference that shows that part, in `screens.json` as `"of": <n>, "part": "<name>"`.

Every version stays theirs. A pick that breaks a why they gave: ask once whether the why still holds; never block it.

On their yes, read it back in one line, read its base's motion unless the brief's is none ([library.md](references/library.md)), copy it to `prototype/first.html`, and set `"chosen": n` in `screens.json`. When the brief's `decides` names someone else, they confirm it first.

## Write `docs/design/design-direction.md`

```markdown
# Direction: <product>

- takeaway: <from the design brief>
- headline: "<the one they picked>"
- carries: <what the chosen screen holds, in fill order>
- for the prototype: <everything else the first screen needs>
- ownable: <what, from the product's world>

## Composition
<The chosen first screen in words, complete enough to rebuild with no picture: where everything sits, what overlaps or runs off, how much is empty, how big type is against the rest.>

- navigation: <one sentence>
- zones: <one line each>
- holds across screens: <how empty, type scale, picture share, margin, radius, edges, density>
- pictures: <how they are treated>
- motion: <what moves, trigger, ms, easing, within the brief's pick; or "none">
- finish: <a pasteable recipe; or "none">

## Hierarchy
1. <first read> 2. <second> 3. <the rest>. Primary action: <what, where>.

## Voice
<from the design brief, with the headline as its sample>

## Look, as built
Proposal; `design-identity` refines it.
- type: <display face, weight, case> with <body face>
- colours: ground <#…>, ink <#…>, accent <#… or none>
```

No reference names, links or paths. Then the direction in up to five lines:

> Change anything, or go on to the identity?

## Do not

- Rank the screens, or say which you prefer.
- Add anything their board does not have, or anything they wrote to leave out.
- Fit more text on a screen than its base carries.
- Undo what they like because a check flagged it.
- Take a reference's content, pictures or words.
