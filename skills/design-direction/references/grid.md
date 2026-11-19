# Building the grid

Read by `design-direction`, step 3.

One page, `.longbeard/design/direction/prototype/grid.html`, from [grid-template.html](grid-template.html): it loads `../deal.js`, sets the look as variables, takes overrides in the URL, fits the type and sets the title to `ready`. Write only what it marks WRITE: the content, one function per navigation, one per arrangement (zones through `ZONES` and `zone()`). The first screen only: 1440×900 for a site, the first key screen's device size for an app.

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
