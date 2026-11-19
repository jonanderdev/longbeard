---
name: design-direction
description: >
  Find the composition. First screens are dealt by script from the references
  they like, each screen's arrangement, navigation and zones taken from
  different references and set in the identity they chose, with the product's
  real content; they pick on a rendered grid, vary and mix; then a hierarchy
  pass repairs what reads wrong without touching the composition. Writes
  docs/design/design-direction.md. Runs after design-brief, design-moodboard
  and design-identity.
---

# Design direction

The rule here: **you build, they choose.** A script deals the combinations; they choose on rendered screens; the agent never picks, drops or ranks a dealt screen. Taking ideas from different references makes compositions none of them has, and that is the point. What the agent owns is the craft afterwards: a hierarchy pass that makes the chosen screen read right while keeping its composition.

Comes out:

- **`docs/design/design-direction.md`**, committed: the chosen composition in words, its hierarchy, the must-carry content, the headline, the voice.
- **`.longbeard/design/direction/`**, gitignored: `library.json`, `deal.json`, `deal.js`, `prototype/grid.html`, the grid captures and sheets.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. No `docs/design/design-identity.md` → `design-identity`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, deal again only if the composition does.

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

The lead's arrangement is dealt twice; the likes are the donors. Six or more together, or the round is smaller: say so. A non-screen (a poster) as lead: say it lends picture treatment, not an arrangement, and offer a screen as lead.

## 2. Read the composition into the library

Open the lead and every like at full size. Write `.longbeard/design/direction/library.json`: composition only. Type, grounds and accents come from the identity.

```
{
  "anchor": "<lead's card name>",
  "family":       { "empty": "55–70%", "scale": "4–7", "pictures": "30–50%", "margin": "2–4%", "radius": "0px", "images": "<how pictures are treated>", "edges": "<rules, borders, or none>", "density": "<how much sits on the first screen>", "from": ["…"] },
  "arrangements": [{ "id": "<a plain word>", "what": "<one sentence>", "zones": { "hero": "…", "side": "…", "band": "…" }, "from": ["<card name>"] }],
  "navigation":   [{ "id": "…", "what": "<one sentence>", "from": ["…"] }],
  "controls":     { "button": { "fill": "accent | ink", "radius": "0px", "case": "none", "weight": 600 }, "from": ["…"] }
}
```

- **Arrangements:** one per reference. Where the title, pictures and small text sit, how they relate (what overlaps, what runs off an edge, how much is empty). One sentence, complete enough to build with the picture closed. No content, colour or face.
- **Zones:** name the parts a person could point to (hero, side, band) with the same names across arrangements, so "the left side of 4" is a dealt move.
- **Family:** what the lead and likes share, as ranges, measured where a page exists (`measure.mjs <link>`), never averaged. It is not dealt: every screen gets it, so eight screens stay one look.
- **Record, never judge.** Ids are plain words, never a reference's name. Merge only twins.

Then deal, with the identity:

```
node <skill>/scripts/deal.mjs .longbeard/design/direction/library.json --identity docs/design/design-identity.md
```

It writes the identity's faces, grounds (each with the identity colour that reads best on it) and accents into the library, and deals eight recipes: arrangement, navigation, type, ground, accent. No two of a screen's arrangement pieces from one reference; the lead's arrangement twice; no recipe twice. Build what was dealt: never swap, drop or re-deal because a combination looks wrong to you.

## 3. Build the grid

One page, `.longbeard/design/direction/prototype/grid.html`, from [grid-template.html](references/grid-template.html): it loads `../deal.js`, sets the look as variables, takes overrides in the URL, fits the type and sets the title to `ready`. Write only what it marks WRITE: the content, one function per navigation, one per arrangement (zones through `ZONES` and `zone()`). The first screen only: 1440×900 for a site, the first key screen's device size for an app.

- **The same real content on every screen:** the name, the headline, every must-carry item (`data-must`; the page flags a missing one in red), the ownable, pictures of the product's subject (theirs, or stand-ins from `design-content`; never the references' subject).
- **Each arrangement is a rule,** built once from its sentence with the shots open; it receives type and colour as variables. Take the arrangement, never the reference's content.
- **Every offset through `--space`.** Type fills by rule, not by number.
- **Fix faults, never taste:** an overlap that hides text, a clipped word, a missing item, a repeated sentence, a lone word on a heading's last line, text under 4.5:1 where it sits (`screen-contrast.mjs`). Fix in the rule so the fix holds for every recipe.

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/grid.html?n=1" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

Show the sheet, a table of each number's arrangement, navigation, ground and accent in plain words, and any fault you could not fix. Never say which you prefer.

> Which would you take further? Any number, or none.

## 4. Vary, mix, choose

- **Some:** `deal.mjs … --vary 4,7` gives each pick a row, changing one thing at a time. Capture, sheet with `--cols 5`, show.
- **A mix:** `--mix 7,ground=3`; inside an arrangement, `--mix 7,zone.side=4` or `zone.band=none`. A change no zone covers is a new arrangement entry, `from` both references.
- **More of one thing:** `--more 4:ground`.
- **None:** deal again once. None again: ask what is missing; a search for it is `design-moodboard`.

Every flag reads the last round shown. Iterate until one screen is theirs, read it back in one line, and on their yes: `deal.mjs … --choose <n>`.

## 5. The hierarchy pass

On the chosen screen only, after their yes. The grid screens stay raw; this pass is the craft.

**It checks,** whatever the style:
- The headline is the strongest text: biggest, heaviest or most contrasted. Nothing smaller in rank outranks it.
- One clear first read, a clear second, then the rest.
- The primary action is found at a glance and does not fight the headline.
- Every must-carry item is there and findable.
- Text reads: 4.5:1 where it sits (3:1 large), body at a readable size.

**It leaves alone,** because that is taste: overlaps, collisions, crops, bleeds, off-grid placement, extreme scale jumps, wide empty space, tiny navigation, an odd reading path that still starts at the headline.

**It fixes only** with size, weight, colour or contrast, and spacing inside a zone. It never moves a zone, changes the arrangement or adds a section. A problem only a composition change can fix is named, not fixed.

Make the fixes as URL overrides or rule edits on a copy, capture before and after side by side, and list each change in one line ("headline 48→72px: now the biggest text"). Then:

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
```

No reference names, links or paths. Then the direction in five lines, and one question:

> Change anything, or take this into the screens?

Yes → `design-screens`.

## Do not

- Pick, swap, drop or rank a dealt screen, or say which you prefer.
- Polish grid screens. Spacing, detail and states wait for `design-screens`.
- Move a zone, change an arrangement or add a section in the hierarchy pass.
- Take a reference's content, pictures or words.
- Choose type or colour here: they are the identity's. A composition that clearly wants another face is said in one line, never changed silently.
