---
name: design-direction
description: >
  Find the direction: a quick first round of eight screens, each one of their
  references rebuilt faithfully with the product's real content and pictures,
  then changed by one or two things borrowed from their other references.
  Nothing on a screen that is not on their board. They pick on a rendered
  sheet, ask for more of one or a mix; what they pick is built in full, then
  a light touch-up fixes contrast, anything missing and anything plainly
  broken, never the composition. Writes
  docs/design/design-direction.md. Runs after design-brief and
  design-moodboard; design-identity then refines its type and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-families.md`, `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

The rule here: **work from the references the way a designer works from a board.** Each reference is a finished design: its sizes, spacing, type and colours were chosen together, and that is why it works. So a screen starts as one reference rebuilt faithfully with the product's own content, then takes one or two things from other references, and, once they pick it, is checked until what made the reference work still works. **They are the designer.** They pick the references, say what they like in each, and choose the result; what they like is what the screens borrow. The agent's craft is making a borrowed move fit its base. Its own taste adds nothing: every face, colour, element and effect on a screen comes from their board (the product's own subject is a card on it), and a fresh agent checks that. They choose on rendered screens; the agent never ranks them.

Comes out:

- **`docs/design/design-direction.md`**, committed: the chosen composition in words, its hierarchy, what the screen carries and what waits for the prototype, the headline, the voice, and the type and colours as built, for `design-identity` to refine.
- **`.longbeard/design/direction/`**, gitignored: `library.json` (the readings), `screens/<n>.html` and `screens.json`, `prototype/first.html` (the chosen screen), the captures and sheets.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, build new screens only if the composition does.

**At `pace: quick`** (the design brief): one round of eight; more, a mix or another round only when they ask, never pressed. The rest is as usual: what they pick is still built in full.

## 0. Pictures of the subject

Before the grid: three or four pictures of what the product is about, not other designs. Every screen uses them, treated as its reference treats its pictures, and their colours are one more palette it may borrow. Theirs first; with none, a few clearly licensed stand-ins from `pictures.mjs`, one query per picture, never a bulk search. How: [subject.md](references/subject.md). Do not stop to ask: show them on a contact sheet with the message in step 1, as stand-ins theirs replace.

## 1. The content and the references, in one message

**What the screens carry, in order.** A reference holds the text it was made for; a whole site's content forced into it breaks it. So each screen carries what its base carries, filled by rule:
- **The headline** says the takeaway.
- **The small slots** take real content in a fixed order: the primary action, then the status (open now, in stock), then the thing the product shows (today's bakes, the balance, the ownable). Each screen takes as many as its base has, from the top, and stops.
- **At most one extra** small element, only where the reference's own system gives it a place.
- **The rest** (the second action, the full list, how to reach it) is written down for `design-prototype`, which fits it with options where it forks.

**The headline and the ownable.** Three or four headlines that say the takeaway outright, in the voice. With them, the ownable: one thing from the product's own world only it would show (a stamp, a live count, a mark). Say the fill order in one line.

**The lead and the likes.** Build the board of what they work from: a copy of the moodboard's `board.md` as `.longbeard/design/direction/board.md` (with families taken, copy `.longbeard/design/families/board.md` without the cards whose `topic` is a family they did not take), plus the subject as a card (its contact sheet as the shot, `part: subject`, `screen: no`):

```
node <skill>/scripts/moodboard.mjs .longbeard/design/direction/board.md --out .longbeard/design/direction/board.html
```

Then one message:

> Filled in this order: <primary> · <status> · <what it shows>; the rest waits for the prototype: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick one or rewrite.
> Then open the board: **Lead** the reference whose composition should set the tone, **Like** the ones I should draw from, and in each one's note say **what you like in it, and what it does for you** ("the orange dot: the only contrast on a quiet page", "the thin serif: it makes the page feel slow and expensive"). What you like is what the designs borrow, and why you like it is how they use it. A like without a why: I'll ask once. Paste the copy-out.

The lead is the base of two screens, every like of at least one, and all of them lend moves. **The spread comes from them:** 6 to 10 together, ideally from more than one family and on different grounds. With fewer, say it before building: "With 3 references the eight screens will look alike. Like a few more for a wider spread?" The subject's card is liked like any other, for a picture, a colour or a thing in it (a stamp, a number, a paper bag), with a why; it lends moves and is never a base. A poster is a reference like any other: its layout is rebuilt at screen size, its proportions kept.

**A like against the design brief.** When a like asks for what the design brief rules out ("gold on deep green" when the brief says light only), the brief wins, and say it before building, once. The brief rules out only what it names: a lesson from a past site rules out what went wrong there, not every element that site had. Say it:

> Your like for <reference> names <what>, and the brief says <what it fixes>. I'll keep the brief and carry <what> by its role (the gold on a light ground). Or change the brief?

Their answer either stands, or goes under **Changes** in the design brief, with why.

## 2. Read the references

Open the lead and every like at full size and write `.longbeard/design/direction/library.json`: for each, a reading complete enough to rebuild it at screen size (concept, move, layout, type, spacing, palette, picture treatment, text carried, every device). **Measured when it can be measured:** a live page with `measure.mjs <link>`; a picture with `measure.mjs <picture> --lines` and `fonts.mjs --shape` for the nearest free face. Add the subject, with its palette from `subject-colours.mjs`, named after a look ([subject.md](references/subject.md)), its likes and the things in its pictures they liked, and anything they own. How: [library.md](references/library.md).

## 3. Build the screens

Eight screens, each `.longbeard/design/direction/screens/<n>.html` from [screen-template.html](references/screen-template.html), recorded in `screens.json` with its base, its moves, its `build` (`quick` or `full`) and its `state`.

Five principles decide every case: the base stands unless a move names it; every measure is a share of the screen and is kept; a borrowed thing keeps its geometry and its why; a move changes only what it names; nothing from outside the board.

**The first round is quick.** Each screen is its base and its moves, built once by a fresh agent, with no critic loop and no device close-ups. **The full build** (plan, build, critique, fix, every version kept) runs only on what they pick (step 4). Before any screen is built, the plan is checked for spread: pictures, tones and moves across the eight.

Then the round: not a copy, as varied as the board, contrast (a failure blocks the sheet, rough or not), faults. **The round is done when every screen in `screens.json` has ended in a `state`.** Wait for each helper, and draw the sheet only then; a failed screen is shown as failed. With no fresh agents, do each job yourself in turn and say the round is weaker.

How, with the moves, the states and the checks: [grid.md](references/grid.md).

Show the sheet, marked rough or full for each screen, the sheet of each screen beside its base, and a table: each number, rough or full, its base and its moves in plain words, every visible choice that came from their likes (with the like: "black and white photos: your like for <reference>"), and any fault you could not fix. Never say which you prefer.

**Against the brief,** one column of the table, facts only: what sits against the design brief's never, its three words, its personality (a cool palette for a warm brief), and apart from (a screen that could be mistaken for the kind of product named there, at distance 4–5). It lets them choose knowingly, not steers. Taken, it goes under **Changes** in the design brief, with why.

> Which would you take further? Any number, or none: a pick is built in full. Or roll again: "more" for a fresh round of eight, "more of 3" for three more on 3's base, "3 with 6's colours" for a mix.

## 4. More, mix, choose

- **More of some:** each pick, if still rough, is built in full, and gets three more screens on the same base with other moves, also built in full. Capture, sheet with `--cols 4`, show.
- **A mix:** "4 with the colours of 7": the base of one with the move of another, built in full.
- **More, or none:** a fresh round of eight, quick like the first, as often as they ask: other pairings of bases and moves from what they liked, none shown before. After two rounds with nothing taken, ask once what is missing; a search for it is `design-moodboard`.

**A screen shown again** (more of it, a mix, a fix) goes beside the version they last saw first, to a fresh critic: what got worse? A change that breaks something they liked is undone. Any earlier version stays theirs to take.

**The pick decides, the why guides.** When they pick a screen that breaks a why they gave, record it and ask once whether the why still holds; the screen is never blocked by it.

**Their favourite, alone.** Before the yes, build in full the one they lean to if it is still rough, then show it at full size on its own, as a visitor meets it: a sheet rewards what stands out beside its neighbours. Iterate until one screen is theirs, read it back in one line, and on their yes copy it to `.longbeard/design/direction/prototype/first.html` and note its number in `screens.json` (`"chosen": n`). A rough screen never becomes `first.html`.

**A few controls, bounded by their board.** Offer them a few live controls on that screen (type scale, line spacing, accent strength, corner radius), each limited to what their references use, so they judge a value by seeing it. They paste the copy-out back and you record it in the screen, never as a query string. How: [controls.md](references/controls.md).

**The other width, before the yes, without a stop.** Render the one they settled on at the other size yourself (`screens/<n>.html?size=390x844`, or the desktop for phone screens) and look. Say one line only when the composition's core depends on the width ("on a phone the headline breaks into five lines"); `design-prototype` designs the phone properly. When the design brief's `decides` names someone else, say the choice is theirs to confirm with that person, give the sheet's path to send, and go on only once they say it holds.

## 5. The touch-up pass

On the chosen screen only, after their yes. **The composition is theirs, not the agent's.** This pass repairs; it never redesigns. Touch as little as possible: done carelessly, a distinctive screen turns generic here.

**Breaking old rules on purpose is the look.** Text over a picture, type that collides with or runs behind an image, words cropped at the edge, giant type, elements touching or overlapping, off-grid placement, wide empty space, an unusual reading path are never faults here. Never separate, shrink, move or tidy them.

**It fixes only:**
- **Contrast where text sits.** Text under 4.5:1 (3:1 large) on what is actually behind it (`screen-contrast.mjs`; with the design brief's accessibility at AAA, `--min 7 --large 4.5`): fixed with the text's colour, a weight, or a scrim the size of the text, never by moving the text off the picture.
- **Something missing.** A slot's item, the primary action, or a button the screen needs that is not there or cannot be found: added inside its zone, in the look's own controls. What waits for the prototype is not missing.
- **Something plainly off.** A clipped word, text hidden where it cannot be read, a control that looks tappable and is not, the same line twice.
- **Rank, only when inverted.** The headline outranked by smaller text: the smaller one is brought down, not the headline restyled.

**Only with:** colour, weight, size within a step, and spacing inside a zone. Never a zone moved, the arrangement changed, a section added, or a device the references use removed.

**When unsure, leave it** and ask in one line.

Make the fixes on `first.html`, keep the screen before them, capture both side by side, and list each change in one line. Nothing to fix is a fine result: say so. Then:

> Keep all, or turn any off?

The before wins any change they turn off.

**Then the five-second check** on the touched-up screen: three fresh agents who know nothing of the product say what it is, who it is for, what they would do first, and how it feels, and that is set against the takeaway. How, and what a miss allows: [five-second.md](references/five-second.md). Its fixes are the touch-up's own, shown before and after like them.

Record the result in `first.html` itself, its `LOOK` and its CSS, never as a query string: `design-identity` and `design-prototype` open it as it is.

## Write `docs/design/design-direction.md`

```markdown
# Direction: <product>

- takeaway: <from the design brief>
- headline: "<the one they picked>"
- carries: <what the chosen screen holds, in the fill order>
- for the prototype: <everything else the first screen needs, which design-prototype places>
- ownable: <what, from the product's world>
- five seconds: <what it is n of 3, what to do n of 3, feel words; people's answers when given; "not run" and why otherwise>

## Composition
<The chosen first screen in words, complete enough to rebuild with no picture: where everything sits, what overlaps or runs off, how much is empty, how big type is against the rest.>

- navigation: <one sentence>
- zones: <hero, side, band: one line each>
- holds across screens: <what the other screens keep from this one: how empty, type scale, picture share, margin, radius, edges, density>
- pictures: <how they are treated>

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
- In the touch-up pass: move a zone, change the layout, add a section, or tidy an overlap, a crop or a collision the references use on purpose.
- Take a reference's content, pictures or words.
