# Reading the references

Read by `design-direction`, step 2. Each reference the screens are built from is a finished design: its sizes, spacing, type and colours were chosen together and work together. Reading it is understanding that system well enough to rebuild it at screen size, and measuring it so the rebuild can be checked. Nothing here is a choice.

Write `.longbeard/design/direction/library.json`, one reading per reference (the lead and every like):

```
{
  "lead": "<card name>",
  "references": [{
    "name": "<card name>",
    "likes": [{ "what": "<what they like in it, in their words>", "why": "<what it does for them: the rule for using it>" }],
    "avoid": ["<what they wrote to leave out of it, in their words>"],
    "concept": "<what makes it, in one or two sentences: the idea a designer would defend>",
    "move": "<the one move a person would point at: the disc cutting into the title, one word filling the width>",
    "layout": "<where everything sits, as a share of the screen: margins, columns, the picture's box, the headline's box, the small text's places, what overlaps or runs off an edge, how much is empty>",
    "type": { "display": { "face": "…", "by": "page | measured | eye", "kind": "serif | sans | condensed | display | mono | script", "size": 96, "weight": 300, "case": "none", "tracking": "-0.02em", "leading": 0.95, "lines": 2 },
              "small": { "face": "…", "size": 13, "weight": 400, "case": "uppercase", "tracking": "0.12em" }, "scale": 7.4 },
    "spacing": "<the margin, the gaps, how close small text sits to what it belongs to, at 1440>",
    "palette": { "ground": "#…", "ink": "#…", "accent": "#… or null", "more": { "<role>": "#…" } },
    "pictures": "<how pictures are treated: crop, tone (black and white, a duotone, as shot), frame (an arch, a rounded window, full bleed), how many, how big>",
    "motion": { "what": "…", "trigger": "…", "ms": 600, "easing": "…", "character": "…", "by": "page | frames | not seen" },
    "finish": { "css": "…", "by": "page | eye" },
    "picture_kind": "photo | illustration | 3d | mixed",
    "slots": { "headline": { "words": 3, "lines": 2 }, "small": 3, "pictures": 1 },
    "devices": ["<each element that is not content: a disc, a ruled line, a word band, a ring of text>"],
    "measured": { "empty": 62, "pictures": 28, "radius": 12 }
  }]
}
```

## Measure first, then look

**A live page:** `measure.mjs <link>` lists its fonts, sizes, weights, colours and gradients (`by: page`). It also lists the page's motion (each transition and animation with its property, time, easing and trigger) and its finish (shadows, filters, blends and textures with the share of the screen they cover), read before anything is judged by eye.

**A reference that is only a picture** (a shot, a poster, a presentation frame):

```
node <skill>/scripts/measure.mjs .longbeard/design/moodboard/refs/<name>.jpg --lines
```

It reads inside a presentation frame, and gives the ground, the `ink`, the palette (`common`, `loud`), how much is `empty` and how much is `pictures`, and the type: the display line's `px1440`, `weight`, `case`, `box`, the body size, the `scale`, the headline's words and lines, the text `blocks`. `--lines` lists every line it read, with its box: that is the layout's measurements. Sizes are given as px at 1440 wide, which is the size to build at.

What it cannot read (text on a photograph, rotated text, script faces, letters that touch) is read by eye with the picture at full size, and says `by: eye`. A number that disagrees with what you plainly see is a misread: use your reading, and say so.

**The face, from a picture:** the nearest free face by its measured shape, of the kind you see:

```
node <skill>/scripts/fonts.mjs --shape width=<w>,xheight=<x>,contrast=<c> --kind serif --weight <weight>
```

Give it every measure the picture gave (`width`, `xheight`, `dark`, `contrast`). Then set the top three in the reference's own words, at its size, beside the reference, and take the one that is plainly its kind (a hairline didone for a hairline didone, never a heavy slab). When it says nothing is close, the face is a stand-in: say so in the reading (`"stand-in": true`), and try `--kind display` too. Never one face for every reference: each is matched on its own.

## What each part is for

- **`likes`:** their words from the board's note (or the card's `like:`). What they like is what the designs borrow; why is how it is used, and where it would be wrong.
- **`avoid`:** their words from the board's Leave out box (or the card's `avoid:`). Never on a screen built on it, never borrowed from it; the reading still records it (in `devices`, `palette`, wherever it sits), so the rebuild knows what to drop. Empty when they wrote nothing.
- **`concept` and `move`:** what must survive every change; a screen built on it keeps them.
- **`layout`, `type`, `spacing`:** the system, in numbers, so the rebuild is measured, not approximated. Type sizes are the reference's against its screen: a 96 px headline on a 1440 screen stays 96 px.
- **`palette`:** the colours as they work together. A palette is borrowed whole, or one colour they did not name is swapped for another of the same role. Never one colour picked out of it by itself.
- **`pictures`:** the treatment the product's pictures get on a screen built from it.
- **`slots`:** how much text it carries; a screen built on it carries the same, and one small element more at most.
- **`devices`:** every element that is not content, so each on a screen traces to one.

## Motion, finish and picture kind

What a reference cannot show is "not seen", never guessed.

- **`motion`:** only for the lead and the references a pick is built on, never every like. `what` opens with the kind in the `motion` tag, where there is one; `character` is in the design brief's words. A live page: the page's motion as `measure.mjs` lists it (`by: page`). Motion made by script is listed too, with its time and easing "not seen". Recorded frames: by eye (`by: frames`), an easing they cannot show left "not seen". A still: `{ "by": "not seen" }`. A design brief whose motion is none ignores the field; its pick is never overridden.
- **`finish`:** a grain, shadow, blend or filter as a recipe that can be pasted: from a live page its own CSS, from a picture by eye. No recipe is "not seen".
- **`picture_kind`:** recorded only, never borrowed: the product's own pictures decide it, and when it has none of that kind the sheet says so.

## The subject

The subject is a card on the board and is read like a reference, without a layout and never a base. `subject-colours.mjs` proposes a palette from its pictures ([subject.md](subject.md)): a quiet ground, its ink, and an accent when the subject has a second hue. Write it as `"subject": { "ground", "ink", "accent", "likes": [{ "what", "why" }], "things": ["<what they liked in its pictures or world: a stamp, a number, a paper bag>"] }`. The palette is one more a screen may borrow, as a quiet tint or an accent, never stronger than the references' own pages. A liked thing is a move that may change form (principle 4).

**Record, never judge.** A gradient, a glow, a face the rules call a tell: if a reference uses it, it is in its reading. What they own goes in `"theirs"`; a refused face or colour is left out; light only or dark only leaves out the readings' palettes of the other kind as borrowable palettes, never the references.
