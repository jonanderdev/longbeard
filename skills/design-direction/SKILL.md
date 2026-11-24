---
name: design-direction
description: >
  Find the direction: a quick first round of eight screens, each one of their
  references rebuilt faithfully with the product's real content and pictures,
  then changed by one or two things borrowed from their other references.
  Nothing on a screen that is not on their board. They pick on a rendered
  sheet, ask for more of one or a mix; the one they settle on is built in
  full, then a light touch-up fixes contrast, anything missing and anything
  plainly broken, never the composition. Writes
  docs/design/design-direction.md. Runs after design-brief and
  design-moodboard; design-identity then refines its type and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-families.md`, `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

The rule here: **work from the references the way a designer works from a board.** Each reference is a finished design: its sizes, spacing, type and colours were chosen together, and that is why it works. So a screen starts as one reference rebuilt faithfully with the product's own content, then takes one or two things from other references, and, once they settle on it, is checked until what made the reference work still works. **They are the designer.** They pick the references, say what they like in each and what to leave out of it, and choose the result; what they like is what the screens borrow, and what they leave out is never on a screen. The agent's craft is making a borrowed move fit its base. Its own taste adds nothing: every face, colour, element and effect on a screen comes from their board (the product's own subject is a card on it), and a fresh agent checks that.

Comes out:

- **`docs/design/design-direction.md`**, committed: the chosen composition in words, its hierarchy, what the screen carries and what waits for the prototype, the headline, the voice, and the type and colours as built, for `design-identity` to refine.
- **`.longbeard/design/direction/`**, gitignored: `library.json` (the readings), `screens/<n>.html` and `screens.json`, `prototype/first.html` (the chosen screen), the captures and sheets.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, build new screens only if the composition does.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

**At `pace: quick`** (the design brief): one round of eight; more, a mix or another round only when they ask, never pressed. The one they settle on is still built in full.

## 0. Pictures of the subject

Before the grid: three or four pictures of what the product is about, not other designs. Every screen uses them, treated as its reference treats its pictures, and their colours are one more palette it may borrow. Theirs first; with none, a few clearly licensed stand-ins from `pictures.mjs`, one query per picture, never a bulk search. How: [subject.md](references/subject.md). Do not stop to ask: show them on a contact sheet with step 1's message, as stand-ins theirs replace.

## 1. The content and the references, in one message

**What the screens carry, in order.** A reference holds the text it was made for; a whole site's content forced into it breaks it. So each screen carries what its base carries, filled by rule:
- **The headline** says the takeaway.
- **The small slots** take real content in a fixed order: the primary action, then the status (open now, in stock), then the thing the product shows (today's bakes, the balance, the ownable). Each screen takes as many as its base has, from the top, and stops.
- **At most one extra** small element, only where the reference's own system gives it a place.
- **The rest** (the second action, the full list, how to reach it) is written down for `design-prototype`, which fits it with options where it forks.

**The headline and the ownable.** Three or four headlines that say the takeaway outright, in the voice. With them, the ownable: one thing from the product's own world only it would show (a stamp, a live count, a mark). Say the fill order in one line.

**The lead and the likes.** Build their board with every reference on it: a copy of the moodboard's `board.md` as `.longbeard/design/direction/board.md`, every card, plus the subject as a card (its contact sheet as the shot, `part: subject`, `screen: no`). When the board was sorted, `--topics` puts each card under its family; a family is a heading, never a filter: a reference they like can come from any family, and a screen can borrow across them.

```
node <skill>/scripts/moodboard.mjs .longbeard/design/direction/board.md --one-lead [--topics .longbeard/design/families/board.md] --out .longbeard/design/direction/board.html
```

It says how many tiles it drew; one fewer than the cards is a missing shot, named on its own line: capture it again before showing the board.

**Likes are asked once.** A card with a `like:` line already holds their like and why: it starts liked, with their words in its note, so they only correct it. Ask only for what is not there yet.

Then one message:

> Filled in this order: <primary> · <status> · <what it shows>; the rest waits for the prototype: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick one or rewrite.
> Then open the board: your likes so far are marked. **Lead** the one reference whose composition should set the tone, Like any more I should draw from, and in each new like's note say **what you like in it, and what it does for you** ("the orange dot: the only contrast on a quiet page"). Where a reference you like has something you don't want, write it in its **Leave out** box ("the drop shadow", "the all-caps menu"). Paste the copy-out.

What they like is what the designs borrow, and why is how they use it; a like without a why is asked once. **What they leave out is never on a screen:** on a screen built on that reference, the thing is dropped, or its role is filled from another of their references (principle 1), and it is never borrowed as a move.

The lead is the base of two screens, every like of at least one, and all of them lend moves. **The spread comes from them:** 6 to 10 together, ideally from more than one family and on different grounds. With fewer, say it before building: "With 3 references the eight screens will look alike. Like a few more for a wider spread?" The subject's card is liked like any other, for a picture, a colour or a thing in it (a stamp, a number, a paper bag), with a why; it lends moves and is never a base. A poster is a reference like any other: its layout is rebuilt at screen size, its proportions kept.

**A like against the design brief.** When a like asks for what the brief rules out ("gold on deep green" when the brief says light only), the brief wins, and say it before building, once. The brief rules out only what it names: a lesson from a past site rules out what went wrong there, not every element that site had. Say it:

> Your like for <reference> names <what>, and the brief says <what it fixes>. I'll keep the brief and carry <what> by its role (the gold on a light ground). Or change the brief?

Their answer stands, or goes under **Changes** in the design brief, with why.

## 2. Read the references

Open the lead and every like at full size and write `.longbeard/design/direction/library.json`: for each, a reading complete enough to rebuild it at screen size (concept, move, layout, type, spacing, palette, picture treatment and kind, finish, text carried, every device). **Measured when it can be measured:** a live page with `measure.mjs <link>`; a picture with `measure.mjs <picture> --lines` and `fonts.mjs --shape` for the nearest free face. Add the subject, with its palette from `subject-colours.mjs`, named after a look ([subject.md](references/subject.md)), its likes and the things in its pictures they liked, and anything they own. How: [library.md](references/library.md).

## 3. Build the screens

Eight screens, each `.longbeard/design/direction/screens/<n>.html` from [screen-template.html](references/screen-template.html), recorded in `screens.json` with its base, its moves, its `build` (`quick` or `full`) and its `state`.

Five principles decide every case: the base stands unless a move names it; every measure is a share of the screen and is kept; a borrowed thing keeps its geometry and its why; a move changes only what it names; nothing from outside the board.

**Every round is quick.** Each screen is its base and its moves, built once by a fresh agent, with no critic and no device close-ups: one agent per screen and one judge per round. **The full build** (one critique, one fix, both versions kept) runs once, on the screen they settle on (step 4). Before any screen is built, the plan is checked for spread: pictures, tones and moves across the eight.

Then the round: not a copy (one judge for the whole round), as varied as the board, contrast (a failure blocks the sheet, rough or not, unless it is a colour they liked, kept with a warning), faults. **The round is done when every screen in `screens.json` has ended in a `state`.** Wait for each helper before drawing the sheet; a failed screen is shown as failed. With no fresh agents, do each job yourself in turn and say the round is weaker.

How, with the moves, the states and the checks: [grid.md](references/grid.md). The full build, read only once they settle on one: [full-build.md](references/full-build.md).

**Judges run small.** A judge only looks and answers: the not-a-copy check and the critic. Start each on the smallest model that sees pictures well enough for its job, where your agent lets you choose one (in Claude Code, the Agent tool's `model`: `haiku` for not-a-copy, `sonnet` for the critic). Builders and the fixer run on the session's model. Where you cannot choose, every agent runs on the session's model, and nothing else changes. Every helper ends when it answers: wait for it, never leave one running.

Show the sheet, each screen marked rough or full and beside its base, and a table: each number, its base and its moves in plain words, every visible choice that came from their likes (with the like: "black and white photos: your like for <reference>"), and any fault you could not fix. Never say which you prefer.

**Against the brief,** one column of the table, facts only: what sits against the design brief's never, its three words, its personality (a cool palette for a warm brief), and apart from (a screen that could be mistaken for the kind of product named there, at distance 4–5). It informs; it does not steer. Taken, it goes under **Changes** in the design brief, with why.

> Which one is closest? Name it and it is built in full. Or roll again: "more" for a fresh round of eight, "more of 3" for three more on 3's base, "3 with 6's colours" for a mix.

## 4. More, mix, choose

- **More of some:** three more screens on each named base with other moves, quick like the first round, with its judge. Capture, sheet with `--cols 4`, show beside the one they named.
- **A mix:** "4 with the colours of 7": the base of one with the move of another, quick.
- **More, or none:** a fresh round of eight, quick like the first, as often as they ask: other pairings of bases and moves from what they liked, none shown before. After two rounds with nothing taken, ask once what is missing; a search for it is `design-moodboard`.

Every version stays theirs to take.

**The pick decides, the why guides.** When they pick a screen that breaks a why they gave, record it and ask once whether the why still holds; the screen is never blocked by it.

**Their favourite, alone.** When they name the one they lean to, build it in full ([full-build.md](references/full-build.md)): this is the only full build in the step. Show it at full size on its own, as a visitor meets it, beside the quick version they named. Iterate until one screen is theirs, read it back in one line, read its base's motion unless the design brief's is none ([library.md](references/library.md)), and on their yes copy it to `.longbeard/design/direction/prototype/first.html` and note its number in `screens.json` (`"chosen": n`). A rough screen never becomes `first.html`.

**The other width, before the yes, without a stop.** Render the one they settled on at the other size yourself (`screens/<n>.html?size=390x844`, or the desktop for phone screens) and look. Say one line only when the composition's core depends on the width ("on a phone the headline breaks into five lines"); `design-prototype` designs the phone properly. When the design brief's `decides` names someone else, say the choice is theirs to confirm with that person, give the sheet's path to send, and go on only once they say it holds.

## 5. The touch-up pass

On the chosen screen only, after their yes. This pass repairs; it never redesigns. Touch as little as possible: done carelessly, a distinctive screen turns generic here.

**Breaking old rules on purpose is the look.** Text over a picture, type that collides with or runs behind an image, words cropped at the edge, giant type, elements touching or overlapping, off-grid placement, wide empty space, an unusual reading path are never faults here. Never separate, shrink, move or tidy them.

**It fixes only:**
- **Contrast where text sits.** Text under 4.5:1 (3:1 large) on what is actually behind it (`screen-contrast.mjs`; with the design brief's accessibility at AAA, `--min 7 --large 4.5`): fixed with the text's colour, a weight, or a scrim the size of the text, never by moving the text off the picture.
- **Something missing.** A slot's item, the primary action, or a button the screen needs that is not there or cannot be found: added inside its zone, in the look's own controls. What waits for the prototype is not missing.
- **Something plainly off.** A clipped word, text hidden where it cannot be read, a control that looks tappable and is not, the same line twice.
- **Rank, only when inverted.** The headline outranked by smaller text: the smaller one is brought down, not the headline restyled.

**Only with:** colour, weight, size within a step, and spacing inside a zone. Never a zone moved, the arrangement changed, a section added, or a device the references use removed.

**When unsure, leave it** and ask in one line.

Make the fixes on `first.html`, keep the screen before them, capture both side by side, and list each change in one line. Nothing to fix is a fine result. Then:

> Keep all, or turn any off?

The before wins any change they turn off. Whether a stranger reads it in five seconds is checked once, in `design-prototype`, on this screen and the other key screens together.

Record the result in `first.html` itself, its `LOOK` and its CSS, never as a query string: `design-identity` and `design-prototype` open it as it is.

## Write `docs/design/design-direction.md`

```markdown
# Direction: <product>

- takeaway: <from the design brief>
- headline: "<the one they picked>"
- carries: <what the chosen screen holds, in the fill order>
- for the prototype: <everything else the first screen needs, which design-prototype places>
- ownable: <what, from the product's world>

## Composition
<The chosen first screen in words, complete enough to rebuild with no picture: where everything sits, what overlaps or runs off, how much is empty, how big type is against the rest.>

- navigation: <one sentence>
- zones: <hero, side, band: one line each>
- holds across screens: <what the other screens keep from this one: how empty, type scale, picture share, margin, radius, edges, density>
- pictures: <how they are treated>
- motion: <what moves, its trigger, ms and easing, from its base's reading and within the design brief's pick; or "none">
- finish: <the surface finish as a pasteable recipe, from its base or a borrowed move; or "none">

## Hierarchy
1. <first read> 2. <second> 3. <the rest>. Primary action: <what, where>.

## Voice
<from the design brief, and the headline as its sample>

## Look, as built
Proposal; `design-identity` refines it.
- type: <display face, weight, case> with <body face>
- colours: ground <#…>, ink <#…>, accent <#… or none>
```

No reference names, links or paths; face names and values are fine. Then the direction in five lines, and one question:

> Change anything, or take this into the identity (type and colour, refined on this screen)?

Yes → `design-identity`.

## Do not

- Rank the screens, or say which you prefer.
- Show a rough screen as finished, or draw the sheet while a screen has no final state.
- Add anything their board does not have: a gradient, a shadow, a default button, a pill, a decoration, a colour, an effect.
- Fit more content onto a screen than its base carries, or polish it beyond its references. The rest, detail and states wait for `design-prototype`.
- Put on a screen anything they wrote to leave out, or hide a reference because of its family.
- Build in full anything but the screen they settle on.
- In the touch-up pass: move a zone, change the layout, add a section, or tidy an overlap, a crop or a collision the references use on purpose.
- Take a reference's content, pictures or words.
