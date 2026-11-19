# The library

Read by `design-direction`, step 2. The library is what the lead and the likes use, written down so `deal.mjs` can deal from it. Reading it is measuring, not judging: nothing here is a choice.

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
- **The subject's colours:** one or two grounds from the subject pictures (and an accent only when the subject has a second hue; otherwise accents come from the references), chosen and tuned by rule, never sampled raw, and each named as part of the subject after a look: [subject.md](subject.md).
- **What is fixed:** a face or colour they own is an entry with `"from": ["theirs"]`; a refused one is left out; light or dark only drops the other grounds.
- **Record, never judge.** A gradient, a glow, a typeface the rules call a tell: if a reference uses it, it is an entry. Ids are plain words, never a reference's name. Merge only twins.
