# Building the grid

Read by `design-direction`, step 3.

One page, `.longbeard/design/direction/prototype/grid.html`, from [grid-template.html](grid-template.html): it loads `../deal.js`, sets the look as variables, takes overrides in the URL, fits the type and sets the title to `ready`. Write only what it marks WRITE: the content, one function per navigation, one per arrangement (zones through `ZONES` and `zone()`). The first screen only: 1440×900 for a site, the first key screen's device size for an app.

## Content: what the reference carries, no more

The grid is where they choose a direction, so each screen carries the same amount as its source reference: never a whole site's content fitted in by taste. Fitting everything is design work, and it belongs to `design-prototype`.

- **The same real content, by rule:** the name, the headline, and `C.fill`, in this order: the primary action, then the status, then the thing the product shows (the ownable, today's bakes). Pictures of the product's subject (theirs, or the stand-ins from step 0 in `.longbeard/design/pictures/`; never the references' subject).
- **Each screen takes its arrangement's slots** (`slots` in its library entry): a headline as long as the reference's (`C.headline`, or `C.short` where the reference's headline is one or two words), and as many small blocks as it has, filled from `C.fill` in order (`ctx.fill`), stopping when the slots run out. The template does the filling: never pick which items a screen gets.
- **At most one extra** (`ctx.extra`): a subline or one more picture, only where the reference's own system gives it a place (aligned to an element already there, smaller than the headline). It never moves, resizes or restructures anything else. No place for it: leave it out.
- The page flags a slot it cannot find (`missing:`), and a screen with more text blocks than its slots allow. Both are faults, fixed in the rule.
- Everything else (the full list, the second action, the pickup times) goes under "for the prototype" in `design-direction.md`.

## Each arrangement is a rule

- **Built once from its sentence and its `move`,** with the reference open at full size; it receives type and colour as variables. Take the arrangement, never the reference's content.
- **The type takes the arrangement's role.** The face comes from another reference; its weight, case, tracking and scale come from the arrangement's `role` (the template sets them). Size the display with `var(--display-size)` or `data-fit` as the role's `sits` says ("one word filling the width" is `data-fit="0.92,…"`; "a thin line at a fifth of the width" is `data-fit="0.2,…"`). Never size it from the type entry's own reference. `deal.mjs` notes a face that cannot carry the role: build it anyway, and keep the note for the table.
- **Every colour a variable,** never a hex: `--ink`, `--accent`, `--accent-text` for words in the accent, `--on-accent` for words on an accent fill, `--muted` for quiet text. Panels and bands take `--ground`, `--ink` or `--accent`, so a screen dealt onto any ground still reads.
- **Every offset through `--space`.** Type fills by rule, not by number.
- **Fix faults, never taste:** an overlap that hides text, a clipped word, a missing slot, a repeated sentence, a lone word on a heading's last line, text under 4.5:1 where it sits (`screen-contrast.mjs`), text smaller than 12px at 1440. Fix in the rule so the fix holds for every recipe.

## Capture, check, sheet

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/prototype/grid.html?n=1" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/prototype/grid.html?n=1" --wait-title ready
```

**Contrast on every screen,** not only the chosen one: a composition moved onto another reference's ground is where text stops reading. A failing text is fixed in the rule with the colour variables, never by moving it.

**The fidelity check, each arrangement against its reference.** Put each screen beside the reference its arrangement came from (the recipe's `sources.arrangement`), on one sheet:

```
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/fidelity.html .longbeard/design/direction/grid/1.png .longbeard/design/moodboard/refs/<arrangement's reference>.jpg … --cols 2
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/fidelity.html" --out .longbeard/design/direction/grid/fidelity.png
```

Look at each pair and ask one thing: **does the arrangement's `move` read?** The disc cuts into the title, not beside it; the window's corners are rounded the way the reference's are; the one word fills the width. Where it does not, the rule is wrong: fix the rule, capture again, and look again, until the move reads. Judge only the move. Type and ground come from other references on purpose (the three sources), so a screen is never meant to look like its reference as a whole, and is never made to. A fault is fixed in the rule, never by tidying the composition.

Then the sheet of the eight:

```
node <skill>/scripts/sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png … .longbeard/design/direction/grid/8.png
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
```

For an app, render and capture at the device size instead (`grid.html?n=1&size=390x844`, `--width 390`, a clip of that size), and use the app's navigation (a tab bar, a side rail) as the navigation entries. The same for a site whose design brief says `first seen on: phone` (a restaurant, an event, a local shop): its first screen is the phone's, so the grid is dealt at 390 with the site's phone navigation; the desktop comes in `design-prototype`.
