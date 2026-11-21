---
name: design-direction
description: >
  Find the direction: eight first screens, each built on one of their
  references with the product's real content and pictures and changed by
  things borrowed from their other cards, the product's own world among them.
  Each screen stays faithful to one reference's whole system; a round reaches
  from screens built on sites to screens built on print, signs or objects,
  and they decide how new. Nothing on a screen that is not on their board.
  They pick on a rendered sheet, ask for
  more of one or a mix; then a light touch-up pass fixes contrast, anything
  missing and anything plainly broken, never the composition. Writes
  docs/design/design-direction.md. Runs after design-brief and
  design-moodboard; design-identity then refines its type and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-families.md`, `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

The rule here: **work from the references the way a designer works from a board.** Each reference is a finished design whose sizes, spacing, type and colours were chosen together. So a screen starts from one reference, rebuilt with the product's own content, takes one or two things from the other cards (a palette, a face, an element, a form from the product's own world), and is checked until its craft holds. A system that was tuned together breaks when it is bent, so newness comes from which reference a screen is built on, near (a site) or far (a poster, a sign, a package), never from bending one. **They are the designer.** They pick the references, say what they like in each, and choose the result; originality comes from their references meeting their product. The agent's craft is making the moves fit; its own taste adds nothing: every face, colour, element and effect on a screen comes from a card on their board, and a fresh agent checks that. The agent never ranks the screens. After the choice, a light touch-up repairs what is broken and never redesigns.

Comes out:

- **`docs/design/design-direction.md`**, committed: the chosen composition in words, its hierarchy, what the screen carries and what waits for the prototype, the headline, the voice, and the type and colours as built, for `design-identity` to refine.
- **`.longbeard/design/direction/`**, gitignored: `library.json` (the readings), `screens/<n>.html` and `screens.json`, `prototype/first.html` (the chosen screen), the captures and sheets.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, build new screens only if the composition does.

**At `pace: quick`** (the design brief): one round of eight; more, a mix or another round only when they ask, never pressed. The pictures, the touch-up and the five-second check are as usual: quick is fewer choices, never a rougher screen.

## 0. Pictures of the subject

Before the grid: three or four pictures of what the product is about (the bakery's bread, the climbing gym's wall, the app's real data), not other designs. Every screen uses them, treated as its reference treats its pictures; with the ownable they are the subject's card on the board. Theirs first; with none, a few clearly licensed stand-ins from `pictures.mjs`, one query per picture. How, and what to check: [subject.md](references/subject.md). Do not stop to ask: show them on a contact sheet with the message in step 1, as stand-ins theirs replace.

## 1. The content and the references, in one message

**What the screens carry, in order.** A reference's design holds the amount of text it was made for; a whole site's content forced into it breaks it. So each screen carries what its base reference carries, filled by rule:
- **The headline** says the takeaway.
- **The small slots** take real content in a fixed order: the primary action, then the status (open now, in stock), then the thing the product shows (today's bakes, the balance, the ownable). Each screen takes as many as its reference has, from the top, and stops.
- **At most one extra** small element, only where the reference's own system gives it a place.
- **The rest** (the second action, the full list, how to reach it) is written down for `design-prototype`.

Say the order in one line.

**The headline and the ownable.** Three or four headlines that say the takeaway outright, in the voice. With them, the ownable: one thing from the product's own world only it would show (a stamp, a live count, a mark).

**The lead and the likes.** Build the board of what they work from (the moodboard, or the families they took):

```
node <skill>/scripts/moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/direction/board.html
```

(When they took families, build it from `.longbeard/design/families/board.md` instead, on a copy without the cards whose `topic` is a family they did not take: that board holds every family and stray.) Then one message:

> Filled in this order: <primary> · <status> · <what it shows>; the rest waits for the prototype: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick one or rewrite.
> Then open the board: **Lead** the reference whose composition should set the tone, **Like** the ones I should draw from, and in each one's note say **what you like in it, and what it does for you** ("the orange dot: the only contrast on a quiet page", "the thin serif: it makes the page feel slow and expensive"). The product's own pictures and the ownable are a card too: what you like there can shape more than colour. What you like is what the designs borrow, and why is how they use it. Paste the copy-out.
> One more, if the board has none: a picture of something not made for a screen, from your product's world or near it (a sign, a package, a printed menu, an object). The far screens are built on it.

Add the subject card to the board (its pictures and the ownable, [subject.md](references/subject.md)). A missing why is asked once. The lead is the base of two screens, every like of at least one, and all of them lend moves. **The spread comes from them:** 6 to 10 together, from more than one family. With fewer, say it before building: "With 3 references the eight screens will look alike. Like a few more?"

**A like against the design brief.** When a like asks for what the design brief rules out ("gold on deep green" when the brief says light only), the brief wins, and say it before building, once. The brief rules out only what it names: a lesson from a past site rules out what went wrong there, not every element that site had. Say it:

> Your like for <reference> names <what>, and the brief says <what it fixes>. I'll keep the brief and carry <what> by its role (the gold on a light ground). Or change the brief?

Their answer either stands, or goes under **Changes** in the design brief, with why.

## 2. Read the references

Open the lead and every like at full size and write `.longbeard/design/direction/library.json`: for each, a reading complete enough to rebuild it at screen size, its concept and its move, its layout as measured, its type (faces, sizes in px at 1440, weights, tracking, leading), its spacing, its palette, how it treats pictures, how much text it carries, and every device on it. **Measured, never judged by eye when it can be measured:** a live page with `measure.mjs <link>`; a picture with `measure.mjs <picture> --lines` and `fonts.mjs --shape` for the nearest free face. Read the subject card as well: its palette, proposed by `subject-colours.mjs` and named after a look, its forms, and its likes ([subject.md](references/subject.md)); and anything they own. How: [library.md](references/library.md).

## 3. Build the screens

Eight screens, each `.longbeard/design/direction/screens/<n>.html` from [screen-template.html](references/screen-template.html), recorded in `screens.json` with its base and its moves:

Five principles decide every case: one base, one whole system, unless a move names it; every measure is a share of the screen and is kept; a borrowed thing keeps its geometry, and its why guides it; a move changes only what it names; nothing from outside the board, and the subject is on it. Each screen is made by fresh agents with one job each:

1. **Plan** (you): the bases, every card not made for a screen among them, one or two moves each, the spread checked before any build, and a brief per screen.
2. **Build:** translate the base, measured against it (`layout-diff.mjs`), then make the moves.
3. **Critique:** with only the pictures, where the craft is less finished than its sources, and what on the screen exists only because of this product; nothing sends it back to the plan.
4. **Fix:** only those spots, toward the sources' craft, each fix a new version, every version kept; a fresh critic again until nothing a visitor would see is left, at most three times. What is left is shown as a known fault.

Wait for every helper. Then the round: not a copy and not a stranger to its base, contrast (a failure blocks the sheet), faults.

How, with the list of moves and the checks: [grid.md](references/grid.md).

Show the sheet, the sheet of each screen beside its base, and a table: each number, its distance, its base and its moves in plain words, every visible choice that came from their likes (with the like: "black and white photos: your like for <reference>"), so nothing on a screen is a mystery to them, and any fault you could not fix. Never say which you prefer.

**Against the brief,** one column of the table, facts only: what sits against the design brief's never, its three words, its personality (a cool palette for a warm brief), and apart from (a screen that could be mistaken for the kind of product named there, at distance 4–5). It is there so they choose knowingly, not to steer them. Taken, it goes under **Changes** in the design brief, with why.

> Which would you take further? Any number, or none. Or roll again: "more" for a fresh round of eight, "more of 3" for three more on 3's base, "3 with 6's colours" for a mix.

## 4. More, mix, choose

- **More of some:** for each pick, three more on the same base with other moves, built and checked the same way; sheet with `--cols 4`.
- **A mix:** "4 with the colours of 7", "6 with the disc from 2": the base of one with the move of another.
- **More, or none:** a fresh round of eight, as often as they ask, none shown before. After two rounds with nothing taken, ask once what is missing; a search for it is `design-moodboard`.

**Before showing a screen again** (more of it, a mix, a fix), a fresh critic puts it beside the version they last saw and lists what got worse; a change that breaks something they liked is undone. Any earlier version stays theirs to take.

**The pick decides, the why guides.** When they pick a screen that breaks a why they gave, record it and ask once whether the why still holds; the screen is never blocked by it, and their answer updates the like.

**Their favourite, alone.** Before the yes, show the one they lean to at full size on its own, as a visitor meets it: a sheet rewards what stands out beside its neighbours. Iterate until one screen is theirs, read it back in one line, and on their yes copy it to `.longbeard/design/direction/prototype/first.html` and note its number in `screens.json` (`"chosen": n`).

**The other width, before the yes, without a stop.** Render the one they settled on at the other size yourself (`screens/<n>.html?size=390x844`, or the desktop for phone screens) and look. Say one line only when the composition's core depends on the width ("on a phone the headline breaks into five lines"); the phone is designed properly in `design-prototype`. When the design brief's `decides` names someone else, say the choice is theirs to confirm with that person, and give the sheet's path to send; go on only once they say it holds.

## 5. The touch-up pass

On the chosen screen only, after their yes. The screen was built from their references and chosen by them: **the composition is theirs, not the agent's.** This pass repairs; it never redesigns. Done carelessly, it turns a distinctive screen generic.

**Modern design breaks old rules on purpose, and that is the point to keep.** Text over a picture, type that collides with or runs behind an image, words cropped at the edge, giant type, elements touching or overlapping, off-grid placement, wide empty space, an unusual reading path. These are never faults here. Never separate, shrink, move or tidy them.

**It fixes only:**
- **Contrast where text sits.** Text under 4.5:1 (3:1 large) on what is actually behind it (`screen-contrast.mjs`; with the design brief's accessibility at AAA, `--min 7 --large 4.5`): fixed with the text's colour, a weight, or a scrim the size of the text, never by moving the text off the picture.
- **Something missing.** A slot's item, the primary action, or a button the screen needs that is not there or cannot be found: added inside the zone where it belongs, in the look's own controls. What waits for the prototype is not missing.
- **Something plainly off.** A clipped word, text hidden where it cannot be read at all, a control that looks tappable and is not, the same line twice.
- **Rank, only when inverted.** The headline outranked by smaller text (a description bigger or louder than the title): the smaller one is brought down, not the headline restyled.

**Only with:** colour, weight, size within a step, and spacing inside a zone. Never a zone moved, the arrangement changed, a section added, or a device the references use removed.

**When unsure, leave it** and ask in one line ("the name sits under the photo's edge: on purpose, or should it clear it?").

Make the fixes on `first.html`, keeping the screen before them, capture before and after side by side, and list each change in one line ("description 32→20px: it outranked the headline"). Nothing to fix is fine. Then:

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
- holds across screens: <the family's ranges: how empty, type scale, picture share, margin, radius, edges, density>
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
- Add anything no card has: a gradient, a shadow, a default button, a pill, a decoration, a colour, an effect.
- Polish the screens: detail and states wait for `design-prototype`.
- In the touch-up pass: move a zone, change the layout, add a section, or tidy an overlap, a crop or a collision the references use on purpose.
- Take a reference's content, pictures or words.
