---
name: design-direction
description: >
  Find the direction: a quick round of eight screens, each one of their
  references rebuilt faithfully with the product's real content and pictures,
  then changed by one or two things borrowed from their other references.
  Nothing on a screen that is not on their board. They pick on a rendered
  canvas, ask for more of one or a mix; the one they settle on is built in
  full, then a light touch-up fixes contrast, anything missing and anything
  plainly broken, never the composition. Writes
  docs/design/design-direction.md. Runs after design-brief and
  design-moodboard; design-identity then refines its type and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-families.md`, `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

**Work from the references the way a designer works from a board.** Each reference is a finished design whose sizes, spacing, type and colours work together. A screen is one reference rebuilt faithfully with the product's content, plus one or two things borrowed from others. **They are the designer:** they pick the references, say what they like in each and what to leave out, and choose. The agent makes a borrowed move fit its base and adds nothing: every face, colour, element and effect comes from their board (the subject is a card on it).

Writes `docs/design/design-direction.md` (committed) and works in `.longbeard/design/direction/` (gitignored): `library.json`, `screens/<n>.html`, `screens.json`, `prototype/first.html`, captures and the canvas.

**At every stop,** say what is new and the one question, in up to five lines: a path or a sheet instead of pasted content, one line per option, nothing they already know.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, build new screens only if the composition does.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

**At `pace: quick`:** one round of eight; more only when they ask.

## 0. Pictures of the subject

Three or four pictures of what the product is about, not other designs: theirs, or a few licensed stand-ins from `pictures.mjs`, one query per picture. Every screen uses them, and their colours are one more palette. How: [subject.md](references/subject.md). Show them on a contact sheet with step 1's message; do not stop to ask.

## 1. The content and the references, in one message

**What a screen carries.** As much text as its base carries, filled in order: the headline (the takeaway), then the small slots: the primary action, the status (open now, in stock), the thing the product shows. At most one extra small element, where the base's system has room. The rest is listed for `design-prototype`.

**Headlines and the ownable.** Three or four headlines that say the takeaway outright, in the voice, and the ownable: one thing only this product would show (a stamp, a live count, a mark).

**Their board, every reference on it.** Copy the moodboard's `board.md` to `.longbeard/design/direction/board.md`, every card, plus the subject as a card (its contact sheet as the shot, `part: subject`, `screen: no`). With families, `--topics` puts each card under its family: a heading, never a filter.

```
node <skill>/scripts/moodboard.mjs .longbeard/design/direction/board.md --one-lead [--topics .longbeard/design/families/board.md] --out .longbeard/design/direction/board.html
```

It says how many cards it left out for a missing shot: capture those again first. **Likes are asked once:** a card with a `like:` line starts liked, with their words.

> Fill order: <primary> · <status> · <what it shows>; later: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick or rewrite.
> Then open the board (your likes are marked): **Lead** the one whose composition sets the tone, Like any more, and for each new like say what you like and why ("the orange dot: the only contrast on a quiet page"). Anything you don't want from a reference goes in its **Leave out** box. Paste the copy-out.

- **What they like** is what is borrowed; **why** is where it may go. A like without a why: ask once.
- **What they leave out is never on a screen:** dropped, or its role filled from another of their references, and never borrowed.
- **Spread:** the lead is the base of two screens, every like of at least one. With fewer than 6 references, say once that the eight will look alike. The subject's card lends moves, never a base.
- **A like the design brief rules out** ("gold on deep green", brief: light only): the brief wins, the like is carried by its role. Say it once before building; a change goes under **Changes** in the design brief.

## 2. Read the references

For the lead and every like, a reading complete enough to rebuild it at screen size, measured where it can be (`measure.mjs <link>`, or `measure.mjs <picture> --lines` and `fonts.mjs --shape`), with their likes and leave-outs, into `library.json`. Add the subject with its palette from `subject-colours.mjs`. How: [library.md](references/library.md).

## 3. Build the screens

Eight screens from [screen-template.html](references/screen-template.html), recorded in `screens.json` with base, moves, `build` and `state`. Five principles decide every case: the base stands unless a move names it; every measure is a share of the screen and is kept; a borrowed thing keeps its geometry and its why; a move changes only what it names; nothing from outside the board. How, with the checks: [grid.md](references/grid.md).

**Every round is quick:** one fresh agent per screen, built once, then one not-a-copy judge for the round. Check the plan's spread before building. Contrast blocks the canvas (a liked colour kept with a warning). The canvas is drawn only when every screen has a `state`; wait for every helper, never leave one running. Judges run on the smallest model that sees well enough (`haiku` for not-a-copy, `sonnet` for the critic, where the agent lets you choose); builders on the session's. With no fresh agents, do each job in turn and say the round is weaker.

**Show the canvas,** with every screen captured (grid.md):

```
node <skill>/scripts/canvas.mjs .longbeard/design/direction/screens.json --board .longbeard/design/direction/board.md --shots .longbeard/design/direction/grid --out .longbeard/design/direction/canvas.html
```

It shows every screen in a strip, rounds and parts in rows, and the one they open large beside what it is made from: its base and each move, with the reference and their words. Give its path, and one line per screen only for a fault or what sits against the brief (its never, words, personality, or could be mistaken for what it must stand apart from). Never say which you prefer.

> Which is closest? Name it and it's built in full. Or "more", "more of 3", "3 with 6's colours".

## 4. More, mix, choose

- **More of 3:** three more on 3's base with other moves, quick, one judge, on the canvas beside 3.
- **A mix** ("4 with 7's colours"): quick.
- **More:** a fresh round of eight, new pairings. After two rounds with nothing taken, ask once what is missing (`design-moodboard`).

Every version stays theirs. A pick that breaks a why they gave: ask once whether the why still holds; never block it.

**Their favourite.** When they name one, build it in full ([full-build.md](references/full-build.md)) and show it at full size beside the quick version. Iterate on it until it is theirs. Then two short things, before the yes:

- **Parts, if they want.** Name its parts in one line (the menu, the headline, the primary action, a card or row, the pictures, the footer: what it has) and ask: "Open any part?" None is a fine answer. For a part they open: three or four versions of that part only, on the favourite with everything else frozen, each from a reference that shows that part (a card's `part`, or its `also` shots), quick, one agent each, in `screens.json` as `"of": <n>, "part": "<name>"`. "Find more" for a part is `design-moodboard`'s one piece: their board first, then outside. They take one, mix, or keep the original.
- **The hardest screen.** One more screen in the favourite's look: the brief's key screen that is hardest for it (the densest list, a form, a table), its layout from the base's `also` shot of that kind if it has one, else from a reference that shows that kind, built in full, in `screens.json` as `"of": <n>, "test": true`. It tests the look; it is not designed here. Show it beside the favourite on the canvas, and if the look breaks on it, say where in one line: they keep it, go back to another pick, or mix. A graphic skips it.

On their yes, read it back in one line, read its base's motion unless the brief's is none ([library.md](references/library.md)), copy it to `prototype/first.html`, and set `"chosen": n` in `screens.json`. Look at it at the other width yourself, and say one line only if the composition breaks there. When the brief's `decides` names someone else, they confirm it first.

## 5. The touch-up

On the chosen screen only. It repairs; it never redesigns. Text over pictures, collisions, crops, giant type, overlaps, wide empty space are the look: never tidied.

It fixes only, with colour, weight, size within a step or spacing inside a zone:
- **Contrast where text sits** (`screen-contrast.mjs`; at AAA `--min 7 --large 4.5`), never by moving text off the picture.
- **Something missing:** a slot's item or the primary action, inside its zone.
- **Something plainly off:** a clipped word, unreadable text, a dead control, a line twice.
- **Rank, only when inverted:** bring the smaller text down.

When unsure, leave it and ask in one line. Keep the before, capture both side by side, one line per change:

> Keep all, or turn any off?

Record it in `first.html` itself (`LOOK` and CSS), never a query string. The five-second check runs later, in `design-prototype`.

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
- Hide a reference because of its family.
- Fit more content than the base carries, or polish beyond its references.
- Build in full anything but their favourite and its hardest screen, or show the canvas before every screen has a state.
- Open a part they did not ask to open.
- In the touch-up: move a zone, change the layout, add a section, or tidy what the references do on purpose.
- Take a reference's content, pictures or words.
