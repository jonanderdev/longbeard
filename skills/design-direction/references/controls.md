# Live controls on the chosen screen

Read by `design-direction`, step 4, once their favourite is shown alone. They judge a value by seeing it, so a few measures are theirs to move in the browser, and the board bounds each one: a control runs only between values their own references use. It never produces a look no reference has, and it never adds taste that is not theirs.

It moves measures. It never moves a zone, changes the layout, or adds a device; those stay with the round (more, mix).

## The controls

The screen's page (from [screen-template.html](screen-template.html)) carries them. Each one is read from the screen as it is, so its own value is marked, and each is shown only when the board gives it a range.

| Control | What it moves | Its range, from `library.json` |
|---|---|---|
| Type scale | Every display size, against the text size. The text stays. | `type.scale` of each reading. |
| Line spacing | The display's line height. | `type.display.leading` of each reading. |
| Accent strength | The accent's contrast against the ground, along the line from the ground through the accent. | The contrast of each reading's `palette.accent` against its `palette.ground`. A reading with no accent counts for nothing. |
| Corner radius | Every rounded corner. Discs, pills and arches stay as they are. | `measured.radius` of each reading. |

A range needs two readings that differ. Fewer, or all alike, and the control is left out: the board has nothing to bound it. The page also drops a control it cannot read on the screen (no display text, no accent, no rounded corner). When the screen's own value lies outside the board's range, the range is widened to hold it, so the screen can always come back to itself.

`measured.radius` is the usual corner of a reading's boxes in px at 1440: `traits.radius` from `measure.mjs` for a live page. A picture's reading has it only when the corner is plain to see at full size. A `pill` is not a radius.

## Fill the ranges

Before they open it, write the board's ranges into the page's `CONTROLS`, in the page that becomes `first.html`. Only from `library.json`, only the lead and the likes:

```js
const CONTROLS = {
  type: [5.2, 9],                        // the least and most type.scale
  leading: [0.9, 1.3],                   // the least and most type.display.leading
  accent: [["#f4f1ea", "#e2501c"], …],   // each reading's ground and accent: the page measures the contrast
  radius: [0, 24],                       // the least and most measured.radius
};
```

Leave out a line when fewer than two readings have it. Do not compute a contrast yourself, and do not widen a range by taste.

## Open it

Give them the link, and say the button "Adjust" is at the bottom right:

```
file://<path>/.longbeard/design/direction/screens/<n>.html?controls
```

The panel appears only with `?controls`, and never with `?capture`. No capture, sheet or identity option is made with either, so none shows it. It sits over the screen and moves nothing under it. Each slider's tick is the screen's own value; Reset puts the screen back.

## Read the copy-out

They press Copy and paste the text back. It lists only what moved, as own to chosen, each with its factor. Record it in the screen's own `LOOK` and CSS, never as a query string, because `design-identity` and `design-prototype` open the page as it is:

- **Type scale:** multiply every display size by the factor, to the nearest px. The text size stays.
- **Line spacing:** multiply each display line height by the factor.
- **Accent strength:** set `LOOK.accent` to the colour given.
- **Corner radius:** multiply each rounded corner by the factor.

Nothing else changes. Keep the screen before, capture before and after side by side, and list each change in one line ("headline 96 to 110 px"), as the touch-up does. Add one line under "Look, as built" in `design-direction.md`: `adjusted: <the lines>`.

When a value breaks something (a headline past the edge), say so once and leave the choice with them. `CONTROLS` stays in the page; with the new values recorded, each control starts at the screen's new own value.
