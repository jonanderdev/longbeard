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

Before the grid: three or four pictures of what the product is about (the bakery's bread and its bench, the climbing gym's wall, the app's real data on a desk). Not other designs, which is the moodboard's job: the product's own world. Every screen from here on uses them, so nothing is judged on grey boxes or on another product's pictures, and their colours join the deal (step 2).

- **Theirs first.** The design brief says whether they have pictures. If they do, ask for three or four, and save them to `.longbeard/design/pictures/`.
- **None yet:** find stand-ins, a few, never a bulk search. Search the subject, not a mood: the brief's identity nouns, one query per picture you need.

  ```
  node <skill>/scripts/pictures.mjs "sourdough loaf" --out .longbeard/design/pictures --count 2
  node <skill>/scripts/pictures.mjs "flour on a wooden bench" --out .longbeard/design/pictures --count 2 --orientation landscape
  ```

  It keeps only clearly licensed pictures (CC0, public domain, CC BY, CC BY-SA) large enough for a screen, and writes `credits.tsv` beside them. Open each; drop one that is off-subject and search again for it.
- **Of the kind the look uses.** When the moodboard is photographs, look for photographs; when it is illustration or renders, say that those are not searched, and use the closest photographs, cropped and toned as the moodboard does, until theirs exist.

Do not stop to ask: show them on a contact sheet (`contact-sheet.mjs .longbeard/design/pictures/credits.tsv --out <scratch>/pictures`) with the message in step 1, as stand-ins theirs replace.

## 1. The content and the references, in one message

**What the first screen must carry.** From the brief and the design brief's takeaway: the status (open now, in stock), the main content (today's bakes, the balance), the primary and secondary actions, how to reach it. One line.

**The headline and the ownable.** Three or four headlines that say the takeaway outright, in the voice. With them, the ownable: one thing from the product's own world only it would show (a stamp, a live count, a mark).

**The lead and the likes.** Build the board of what they work from (the moodboard, or the families they took):

```
node <skill>/scripts/moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/direction/board.html
```

(Use the families' `board.md` when they took families.) Then one message:

> Must carry: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick one or rewrite.
> Then open the board: **Lead** the reference whose composition should set the tone, **Like** the ones I should draw from, and paste the copy-out.

The lead's arrangement is dealt twice; the likes are the donors. **The spread comes from them:** 6 to 10 together, ideally from more than one family and on different grounds. With fewer, say it before dealing: "With 3 references the eight screens will look alike. Like a few more for a wider spread?" A non-screen (a poster) as lead: say it lends picture treatment, not an arrangement, and offer a screen as lead.

## 2. Read the composition into the library

Open the lead and every like at full size. Write `.longbeard/design/direction/library.json`: what each one uses, measured where a live page exists (`measure.mjs <link>` lists its fonts, sizes, colours, gradients), never judged by eye when it can be measured. Nothing here is a choice.

```
{
  "anchor": "<lead's card name>",
  "family":       { "empty": "55–70%", "scale": "4–7", "pictures": "30–50%", "margin": "2–4%", "radius": "0px", "images": "<how pictures are treated>", "edges": "<rules, borders, or none>", "density": "<how much sits on the first screen>", "from": ["…"] },
  "arrangements": [{ "id": "<a plain word>", "what": "<one sentence>", "zones": { "hero": "…", "side": "…", "band": "…" }, "from": ["<card name>"] }],
  "navigation":   [{ "id": "…", "what": "<one sentence>", "from": ["…"] }],
  "type":         [{ "id": "…", "what": "<the kind of face, in plain words>", "kind": "serif | sans | condensed | display | mono | script", "face": "<a face the product can use>", "by": "page | eye", "weight": 400, "case": "none | uppercase", "tracking": "-0.02em", "size": null, "body": { "face": "…", "size": "16px", "leading": "1.5" }, "css": null, "from": ["…"] }],
  "grounds":      [{ "id": "…", "ground": "#…", "panel": null, "ink": "#…", "gradient": null, "pattern": null, "from": ["…"] }],
  "accents":      [{ "id": "…", "colour": "#… or null", "device": "<what carries it>", "from": ["…"] }],
  "controls":     { "button": { "fill": "accent | ink", "radius": "0px", "case": "none", "weight": 600 }, "from": ["…"] }
}
```

- **Arrangements:** one per reference. Where the title, pictures and small text sit, how they relate (what overlaps, what runs off an edge, how much is empty). One sentence, complete enough to build with the picture closed. No content, colour or face.
- **Zones:** name the parts a person could point to (hero, side, band) with the same names across arrangements, so "the left side of 4" is a dealt move.
- **Family:** what the lead and likes share, as ranges, measured where a page exists (`measure.mjs <link>`), never averaged. It is not dealt: every screen gets it, so eight screens stay one look.
- **Type:** one per reference: the face it uses (`by: page`, read from the page), or from a picture only the nearest free face (`by: eye`, a stand-in). Its `kind`, so the deal can spread kinds. The body face it is paired with.
- **Grounds and accents:** one per reference, measured: the ground, the ink on it, a panel, a gradient or pattern as written. An accent is a colour and what carries it; none is an entry too.
- **The subject's colours:** one or two grounds and an accent proposed from the subject pictures, so some screens wear the product's own colours. Never a colour sampled raw from a photo (that gives background greys and shadow browns): `subject-colours.mjs` reads the pictures' main colours, drops noise, highlights and shadows, finds the signature colour (the crust, the wall, the leaf), and tunes each to its role: an off-white or near-black that keeps the subject's hue, an accent with enough chroma, ink at 4.5:1, the accent at 3:1. Each colour says what it came from and how it was tuned.

  ```
  node <skill>/scripts/subject-colours.mjs .longbeard/design/pictures --json
  ```

  **Then look, and name every colour.** Open its sheet (`--sheet <scratch>/subject.html`, captured), which shows each proposed colour beside the pictures with the places it comes from lit up. Every colour must be something a person sees as the subject and can name: "the crust", "the flour", "the oven's black". A colour that lights up the backdrop, a cloth, a wall or a prop is not the subject's, even when it fills the photo: drop it (`--exclude "#hex"`) and run it again. The script already flags colours that sit mostly at the edges as background and never makes them the signature or the accent; the look is the check it cannot do. Write the name beside each colour wherever it is shown ("crust, lightened to carry white text").

  Only then its `library` entries go in, `"from": ["subject"]`.
- **What is fixed:** a face or colour they own is an entry with `"from": ["theirs"]`; a refused one is left out; light or dark only drops the other grounds.
- **Record, never judge.** A gradient, a glow, a typeface the rules call a tell: if a reference uses it, it is an entry. Ids are plain words, never a reference's name. Merge only twins.

Then deal:

```
node <skill>/scripts/deal.mjs .longbeard/design/direction/library.json
```

Eight recipes: arrangement, navigation, type, ground, accent. A screen's arrangement, type and ground come from three different references; the lead's arrangement twice; no recipe twice; grounds spread across light, dark and mid and faces across kinds. Its `spread:` line says how wide the round is, and it warns when the library is too narrow (one tone, one kind of face, under six references): say that to them with the grid. Build what was dealt: never swap, drop or re-deal because a combination looks wrong to you.

## 3. Build the grid

One page, `.longbeard/design/direction/prototype/grid.html`, from [grid-template.html](references/grid-template.html): it loads `../deal.js`, sets the look as variables, takes overrides in the URL, fits the type and sets the title to `ready`. Write only what it marks WRITE: the content, one function per navigation, one per arrangement (zones through `ZONES` and `zone()`). The first screen only: 1440×900 for a site, the first key screen's device size for an app.

- **The same real content on every screen:** the name, the headline, every must-carry item (`data-must`; the page flags a missing one in red), the ownable, pictures of the product's subject (theirs, or the stand-ins from step 0 in `.longbeard/design/pictures/`; never the references' subject).
- **Each arrangement is a rule,** built once from its sentence with the shots open; it receives type and colour as variables. Take the arrangement, never the reference's content.
- **Every offset through `--space`.** Type fills by rule, not by number.
- **Fix faults, never taste:** an overlap that hides text, a clipped word, a missing item, a repeated sentence, a lone word on a heading's last line, text under 4.5:1 where it sits (`screen-contrast.mjs`). Fix in the rule so the fix holds for every recipe.

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/grid.html?n=1" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

For an app, render and capture at the device size instead (`grid.html?n=1&size=390x844`, `--width 390`, a clip of that size), and use the app's navigation (a tab bar, a side rail) as the navigation entries.

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

The before wins any change they turn off. Record the result: `deal.mjs … --choose` on it stays the chosen screen; copy the page to `.longbeard/design/direction/prototype/first.html`, keeping the URL overrides.

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
