# The library: its shape and each list

From `design-direction` step 6. `library.mjs` writes this shape with every measured value filled in; what is left as `WRITE:` follows the rules below.

```
{
  "anchor": "<the anchor's card name>",
  "family":       { "tone": "light", "empty": "55–70%", "loud": "under 5%", "scale": "4–7", "pictures": "30–50%", "margin": "2–4%", "radius": "0px", "images": "<how pictures are treated: crop, bleed, colour, grain>", "edges": "<rules, borders, or none>", "density": "<one sentence: how much sits on the first screen>", "from": ["<card name>"] },
  "arrangements": [{ "id": "<a short word>", "what": "<one sentence>", "from": ["<card name>"] }],
  "navigation":   [{ "id": "…", "what": "<one sentence>", "from": ["…"] }],
  "type":         [{ "id": "…", "what": "<the kind of face, in plain words>", "face": "<a face the product can use>", "by": "page | eye", "weight": 400, "case": "none | uppercase | lowercase", "italic": true, "tracking": "-0.02em", "size": "<the display size at 1440 wide, or null>", "body": { "face": "<the face its running text uses>", "size": "16px", "leading": "1.5" }, "from": ["…"] }],
  "grounds":      [{ "id": "…", "ground": "#…", "panel": "#… or null", "ink": "#…", "gradient": "<the CSS as measured, or null>", "pattern": "<the CSS as measured, or null>", "from": ["…"] }],
  "accents":      [{ "id": "…", "colour": "#… or null", "device": "<what carries it>", "from": ["…"] }],
  "parts":        { "<part>": [{ "id": "…", "what": "<one sentence>", "needs": ["<ids it only works with>"], "from": ["…"] }] }
}
```

Open each reference at full size again. Its measurements are already in `profiles.json`, and `library.mjs` copied them in: the picture's colours and palette, and from the live page its ground, the fonts it loaded, its largest texts with face, size, weight, tracking and case, its gradients and patterns. Read them from there; measure again only a page that has changed (`measure.mjs <its live link>` gives every text on the first screen). A size or a weight read from a picture is a guess, and the guess is often far off.

- **Family.** What the anchor and every donor share: their measured traits as ranges, and in words what numbers cannot carry: how pictures are treated, edges, density. A trait they do not share is left out, never averaged. The family is not dealt: every screen gets it, so it is what makes eight different screens one look.
- **Parts, later and only when needed.** Leave `parts` out here. `design` prototypes the other screens from `direction.md`'s Other parts, and reads a screen's layouts into `parts` only when that screen forks or they ask for options. When it does: one per reference that shows that kind of screen, from any family (the look is fixed by then, so a reference only lends the layout), named for the part (`navigation`, `index`, `article`, an app's key screen). The same rules as an arrangement: complete enough to build from with the picture closed, no content, colour or typeface. For `navigation`, the menu open, what it does on scroll, and what it becomes on a phone. `needs` lists what a layout only works with: the navigation it grows from (a full-screen menu that opens from a small corner link needs `corners`), or another screen's layout (a detail page that continues an index's cards needs that index layout). Leave it out when a layout works with anything. `design` deals them one screen at a time, in the chosen look, and only those whose needs were chosen. A part no keep shows is left out, and named under `Missing`.
- **Arrangements.** One per reference: where the title, the pictures and the small text sit on the first screen, and how they relate (what overlaps what, what is centred, what runs off an edge, how much is left empty). One sentence, complete enough to build from with the picture closed. It carries no content, no colour and no typeface: those are other lists.
- **Navigation.** Where the name and the links sit, how many are shown, and what rides with them (a caption, a button, a count). One sentence, the same rules.
- **Type.** The kind of face in plain words, and `face`: a face the product can use, free to license or one they own. `by` is `page` when the reference's own face was read from its page and can be used, `eye` when it is the nearest match judged from the picture. Weight, case, italic and tracking as measured, or as seen when there is only a picture. `size` is the display size from the page, `null` with only a picture. `axes` holds variable-font settings the reference uses (`"\"wdth\" 25"` for a condensed width), and `css` a stylesheet URL when the face is not on Google Fonts (Fontshare, their own) or its axes need one: the grid page loads it. `body` is the face, size and leading its running text uses, so a display face stays with the body face it was paired with.
- **Grounds.** The ground colour, the ink, and `panel` when the design sits as a panel on a surround of another colour. `gradient` and `pattern` when the ground carries one: `measure.mjs` lists them as written (`gradients`, `patterns`), with how much of the screen each covers. Measured, never judged by eye.
- **Record, never judge.** A gradient, a glow, a pattern, a typeface the rules list as a tell: if the references use it, it goes in the library like any colour. A family may rely on it, and choosing is theirs.
- **Accents.** The colour and the device that carries it: a shape, the letters themselves, a panel. Measured. When some of them use no accent, that is an entry too, with `colour: null`.
- **`from` on every entry:** the card names of the references that show it. `design` needs it to keep any one reference from supplying a whole screen.
- **Merge only twins.** Two references that do the same thing are one entry with both in `from`. An entry stretched to cover many references leaves nothing to deal: when in doubt, keep them apart.
- **Ids are plain words** for the thing ("split", "arch", "condensed"), never a reference's name.
