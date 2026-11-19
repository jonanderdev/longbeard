---
name: design-direction
description: >
  Find the direction: eight first screens dealt by script from the references
  they like, each screen's arrangement, type and colours taken from different
  references, so the round looks like several directions, not one; with the
  product's real content and three or four pictures of its own subject. They
  pick on a rendered grid, vary and mix; then a light touch-up pass fixes
  contrast, anything missing and anything plainly broken, never the
  composition. Writes docs/design/design-direction.md. Runs after design-brief
  and design-moodboard; design-identity then refines its type and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-families.md`, `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

The rule here: **you build, they choose.** A script deals the combinations; they choose on rendered screens; the agent never picks, drops or ranks a dealt screen. Taking the arrangement from one reference, the type from another and the colours from a third makes screens none of them has, and a round that offers several real directions. That is the point, so the spread is protected: enough references, and a deal that spreads light, dark and mid grounds and kinds of face. What the agent owns afterwards is a light touch-up: the chosen screen came from references, not from the agent's taste, so the agent only repairs what is broken and never redesigns it.

Comes out:

- **`docs/design/design-direction.md`**, committed: the chosen composition in words, its hierarchy, the must-carry content, the headline, the voice, and the type and colours as dealt, for `design-identity` to refine.
- **`.longbeard/design/direction/`**, gitignored: `library.json`, `deal.json`, `deal.js`, `prototype/grid.html`, the grid captures and sheets.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, deal again only if the composition does.

## 0. Pictures of the subject

Before the grid: three or four pictures of what the product is about (the bakery's bread, the climbing gym's wall, the app's real data), not other designs. Every screen from here on uses them, and their colours join the deal. Theirs first; with none, a few clearly licensed stand-ins from `pictures.mjs`, one query per picture, never a bulk search. How, and what to check: [subject.md](references/subject.md). Do not stop to ask: show them on a contact sheet with the message in step 1, as stand-ins theirs replace.

## 1. The content and the references, in one message

**What the first screen must carry.** From the brief and the design brief's takeaway: the status (open now, in stock), the main content (today's bakes, the balance), the primary and secondary actions, how to reach it. One line.

**The headline and the ownable.** Three or four headlines that say the takeaway outright, in the voice. With them, the ownable: one thing from the product's own world only it would show (a stamp, a live count, a mark).

**The lead and the likes.** Build the board of what they work from (the moodboard, or the families they took):

```
node <skill>/scripts/moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/direction/board.html
```

(When they took families, build it from `.longbeard/design/families/board.md` instead, on a copy without the cards whose `topic` is a family they did not take: that board holds every family and stray.) Then one message:

> Must carry: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick one or rewrite.
> Then open the board: **Lead** the reference whose composition should set the tone, **Like** the ones I should draw from, and paste the copy-out.

The lead's arrangement is dealt twice; the likes are the donors. **The spread comes from them:** 6 to 10 together, ideally from more than one family and on different grounds. With fewer, say it before dealing: "With 3 references the eight screens will look alike. Like a few more for a wider spread?" A non-screen (a poster) as lead: say it lends picture treatment, not an arrangement, and offer a screen as lead.

## 2. Read the references into the library

Open the lead and every like at full size and write `.longbeard/design/direction/library.json`: for each, its arrangement (with zones), navigation, type (with its `kind`), ground and accent, measured where a live page exists, never judged by eye when it can be measured; the family they share; their controls; one or two grounds from the subject (an accent too when it has a second hue); what they own. The format and the rules for each entry: [library.md](references/library.md). The subject's colours are proposed by `subject-colours.mjs`, then looked at and named as part of the subject before they go in: [subject.md](references/subject.md).

Then deal:

```
node <skill>/scripts/deal.mjs .longbeard/design/direction/library.json
```

Eight recipes: arrangement, navigation, type, ground, accent. A screen's arrangement, type and ground come from three different references; the lead's arrangement twice; no recipe twice; grounds spread across light, dark and mid and faces across kinds. Its `spread:` line says how wide the round is, and it warns when the library is too narrow (one tone, one kind of face, under six references): say that to them with the grid. Build what was dealt: never swap, drop or re-deal because a combination looks wrong to you.

## 3. Build the grid

One page, `.longbeard/design/direction/prototype/grid.html`, from [grid-template.html](references/grid-template.html), with the same real content on every screen (the headline, every must-carry item, the ownable, the subject's pictures), each arrangement built once as a rule, and faults fixed in the rule, never taste. How to build, capture and sheet it, for a site or an app: [grid.md](references/grid.md).

Show the sheet, a table of each number's arrangement, navigation, ground and accent in plain words, and any fault you could not fix. Never say which you prefer.

> Which would you take further? Any number, or none.

## 4. Vary, mix, choose

- **Some:** `deal.mjs … --vary 4,7` gives each pick a row, changing one thing at a time: navigation, type, ground, accent. This is where colour is felt early: each pick on other grounds and accents, from the references and the subject. Capture, sheet with `--cols 5`, show.
- **A mix:** `--mix 7,ground=3`; inside an arrangement, `--mix 7,zone.side=4` or `zone.band=none`. A change no zone covers is a new arrangement entry, `from` both references.
- **More of one thing:** `--more 4:ground`.
- **None:** deal again once. None again: ask what is missing; a search for it is `design-moodboard`.

Every flag reads the last round shown. Iterate until one screen is theirs, read it back in one line, and on their yes: `deal.mjs … --choose <n>`.

## 5. The touch-up pass

On the chosen screen only, after their yes. Every grid screen was built by script from their references and chosen by them: **the composition is theirs, not the agent's.** This pass repairs; it never redesigns. Done carelessly, it is where a distinctive screen turns generic, so touch as little as possible.

**Modern design breaks old rules on purpose, and that is the point to keep.** Text over a picture, type that collides with or runs behind an image, words cropped at the edge, giant type, elements touching or overlapping, off-grid placement, wide empty space, tiny navigation, an unusual reading path. These are never faults here. Never separate, shrink, move or tidy them.

**It fixes only:**
- **Contrast where text sits.** Text under 4.5:1 (3:1 large) on what is actually behind it (`screen-contrast.mjs`): fixed with the text's colour, a weight, or a scrim the size of the text, never by moving the text off the picture.
- **Something missing.** A must-carry item, the primary action, or a button the screen needs that is not there or cannot be found: added inside the zone where it belongs, in the look's own controls.
- **Something plainly off.** A clipped word, text hidden where it cannot be read at all, a control that looks tappable and is not, the same line twice.
- **Rank, only when inverted.** The headline outranked by smaller text (a description bigger or louder than the title): the smaller one is brought down, not the headline restyled.

**Only with:** colour, weight, size within a step, and spacing inside a zone. Never a zone moved, the arrangement changed, a section added, or a device the references use removed.

**When unsure, leave it** and ask in one line ("the name sits under the photo's edge: on purpose, or should it clear it?").

Make the fixes as URL overrides or rule edits on a copy, capture before and after side by side, and list each change in one line ("description 32→20px: it outranked the headline"). Nothing to fix is a fine result: say so. Then:

> Keep all, or turn any off?

The before wins any change they turn off. Record the result: `deal.mjs … --choose` on it stays the chosen screen; copy the page to `.longbeard/design/direction/prototype/first.html` and write the URL overrides into the copy, since a copied file keeps no query string. Without `?n=`, the page shows the chosen screen.

## Write `docs/design/design-direction.md`

```markdown
# Direction: <product>

- takeaway: <from the design brief>
- headline: "<the one they picked>"
- must carry: <the list>
- ownable: <what, from the product's world>

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

## Look, as dealt
Proposal; `design-identity` refines it.
- type: <display face, weight, case> with <body face>
- colours: ground <#…>, ink <#…>, accent <#… or none>
```

No reference names, links or paths; face names and values are fine. Then the direction in five lines, and one question:

> Change anything, or take this into the identity (type and colour, refined on this screen)?

Yes → `design-identity`.

## Do not

- Pick, swap, drop or rank a dealt screen, or say which you prefer.
- Polish grid screens. Spacing, detail and states wait for `design-prototype`.
- In the touch-up pass: move a zone, change the arrangement, add a section, or tidy an overlap, a crop or a collision the references use on purpose.
- Take a reference's content, pictures or words.
- Pick a face or a colour by taste. Here they are dealt from the references and the subject; `design-identity` refines them, on this screen, after.
