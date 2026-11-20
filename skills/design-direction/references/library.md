# The library

Read by `design-direction`, step 2. The library is what the lead and the likes use, written down so `deal.mjs` can deal from it. Reading it is measuring, not judging: nothing here is a choice.

Open the lead and every like at full size. Write `.longbeard/design/direction/library.json`: what each one uses, measured, never judged by eye when it can be measured. Nothing here is a choice.

```
{
  "anchor": "<lead's card name>",
  "family":       { "empty": "55–70%", "scale": "4–7", "pictures": "30–50%", "margin": "2–4%", "radius": "0px", "images": "<how pictures are treated>", "edges": "<rules, borders, or none>", "density": "<how much sits on the first screen>", "from": ["…"] },
  "arrangements": [{ "id": "<a plain word>", "what": "<one sentence>", "move": "<the one move that makes it>", "zones": { "hero": "…", "side": "…", "band": "…" },
                     "slots": { "headline": { "words": 3, "lines": 2 }, "small": 3, "pictures": 1 },
                     "role": { "scale": 0.16, "weight": 300, "width": "normal", "case": "none", "sits": "<how the headline sits>" },
                     "measured": { "empty": 62, "pictures": 28 }, "from": ["<card name>"] }],
  "navigation":   [{ "id": "…", "what": "<one sentence>", "from": ["…"] }],
  "type":         [{ "id": "…", "what": "<the kind of face, in plain words>", "kind": "serif | sans | condensed | display | mono | script", "face": "<a face the product can use>", "by": "page | measured | eye", "weight": 400, "weights": "300–700", "axes": "wght", "case": "none | uppercase", "tracking": "-0.02em", "body": { "face": "…", "size": "16px", "leading": "1.5" }, "css": null, "from": ["…"] }],
  "grounds":      [{ "id": "…", "ground": "#…", "panel": null, "ink": "#…", "gradient": null, "pattern": null, "by": "page | measured", "from": ["…"] }],
  "accents":      [{ "id": "…", "colour": "#… or null", "device": "<what carries it>", "from": ["…"] }],
  "controls":     { "button": { "fill": "accent | ink", "radius": "0px", "case": "none", "weight": 600 }, "from": ["…"] }
}
```

## Measure first

**A live page:** `measure.mjs <link>` lists its fonts, sizes, weights, colours and gradients (`by: page`).

**A reference that is only a picture** (a shot, a poster, a Dribbble frame): measure the picture, never judge it by eye when the numbers are there.

```
node <skill>/scripts/measure.mjs .longbeard/design/moodboard/refs/<name>.jpg --lines
```

It reads inside a presentation frame, and gives:
- `traits`: the ground, the `ink` (the colour most of the type is set in), how much is empty, and `pictures` (how much is photograph);
- `common` and `loud`: the palette, each colour with its share;
- `type`: the `display` line (its `size` as a share of the screen's height, `px1440`, `weight`, `stroke`, `contrast`, `width`, `xheight`, `case`, `ink`, `box`), the `body` size, the `scale` between them, the `headline` (its words and lines) and how many text `blocks` and `small` blocks the picture holds. `--lines` lists every line it read.

What it cannot read: text set on a photograph (unless in a strong colour), rotated text, script faces, letters so tight they touch. Look at the picture with its numbers beside it: a line it missed or misread is read by eye, and that entry says `by: eye`. A number that disagrees with what you plainly see is a misread: say so and use your reading.

**The face, from a picture:** the nearest free face by its measured shape, of the kind you see (serif, sans, condensed…), at the measured weight:

```
node <skill>/scripts/fonts.mjs --shape width=<w>,xheight=<x>,contrast=<c> --kind serif --weight <weight>
```

Take the top row unless it is plainly another kind (a slab for a didone): then the next. Write `by: measured`, its `weights` and `axes` from the row. Never a face picked by eye when the shape was measured.

## Each list

- **Arrangements:** one per reference. Where the title, pictures and small text sit, how they relate (what overlaps, what runs off an edge, how much is empty). One sentence, complete enough to build with the picture closed. No content, colour or face.
  - **`move`:** the one thing that makes this arrangement, in a phrase a person would point at: "a red disc cuts into the title from below", "the photo sits in a rounded window, the text in its four corners", "one word fills the width". The fidelity check (grid.md) judges the built screen on this.
  - **`slots`:** how much text and how many pictures the reference carries, from `measure.mjs` (`type.headline`, `type.small`) checked against the picture: the headline's words and lines, the number of small text blocks (not counting the navigation), the pictures. A screen built on it carries the same amount, and at most one more small element.
  - **`role`:** what the move needs of the type, since the face itself is dealt from another reference: `scale` (the display's em as a share of the screen's height, from `type.display.size`), `weight`, `width` (condensed, normal, wide), `case`, and `sits`, how the headline sits (one word filling the width, a thin line at a fifth of it, two lines broken around a picture). The grid sets whatever face is dealt to this role; `deal.mjs` notes a face that cannot carry it.
  - **`measured`:** its `empty` and `pictures` from `measure.mjs`, so a screen built on it can be checked against it.
- **Zones:** name the parts a person could point to (hero, side, band) with the same names across arrangements, so "the left side of 4" is a dealt move.
- **Family:** what the lead and likes share, as ranges, measured, never averaged. It is not dealt: every screen gets it, so eight screens stay one look.
- **Type:** one per reference: the face it uses (`by: page`), or the nearest free face by its measured shape (`by: measured`), or by eye only where nothing could be measured (`by: eye`). Its `kind`, so the deal can spread kinds, its `weights`, so it can tell when a face cannot carry an arrangement's role. The body face it is paired with.
- **Grounds and accents:** one per reference, measured: the ground, the ink on it (`traits.ink`, or `type.display.ink`), a panel, a gradient or pattern as written. The ink must read 4.5:1 on the ground: where the reference's own ink does not (a pale colour on a pale ground), take its hue at the lightness that reads, and say so. An accent is a colour and what carries it; none is an entry too.
- **The subject's colours:** a quiet ground from the subject pictures, and an accent only when the subject has a second hue of its own (otherwise accents come from the references), chosen and tuned by rule, never sampled raw, and each named as part of the subject after a look: [subject.md](subject.md). `deal.mjs` keeps them to the board: a subject ground of a tone no reference uses is not dealt, and one more saturated than any reference's ground is dealt as an accent.
- **What is fixed:** a face or colour they own is an entry with `"from": ["theirs"]`; a refused one is left out; light or dark only drops the other grounds.
- **Record, never judge.** A gradient, a glow, a typeface the rules call a tell: if a reference uses it, it is an entry. Ids are plain words, never a reference's name. Merge only twins.
