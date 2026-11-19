---
name: design-wordmark
description: >
  Optional, late. A wordmark made from the identity's own faces and devices:
  four to six marks rendered in the navigation and at hero size on the
  identity's grounds, picked and pushed once. Adds the mark to
  docs/design/design-identity.md and the identity board. Runs once the
  identity exists, best after DESIGN.md, when they want a mark beyond the name
  set in the display face.
---

# Design wordmark

A product does not need a mark to be designed: until then, the name is set in the display face. This skill is for when they want one. It is not a logo project: it draws marks from the type and colour already chosen.

Comes out: the chosen mark as SVG in `docs/design/wordmark.svg`, a section in `design-identity.md`, and the mark on the identity board. Options live in `.longbeard/design/wordmark/`.

## Gate

1. No `docs/design/design-identity.md` → `design-identity` first. Stop.
2. A mark exists → a change: show it, ask what changes.

Read the identity, the brief's name and identity nouns, and the design brief's personality.

## 1. Marks, one sheet

Four to six marks, each a small HTML page in `.longbeard/design/wordmark/`, made only from the identity's faces and colours and devices that belong to them: a cut, a ligature, a case, a rule, a shape, the accent. One of them is the name set plainly in the display face, so not making a mark is a choice too. Never a stock icon, a generic symbol, or anything from a reference.

Each is shown twice: small, in a navigation bar on the main ground; large, at hero size, on each ground. Capture them and set them on one sheet:

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/wordmark/1.html" --out .longbeard/design/wordmark/1.png
node <skill>/scripts/sheet.mjs .longbeard/design/wordmark/sheet.html .longbeard/design/wordmark/1.png … --cols 3
```

Each with one line of what it does ("the A's crossbar is the accent bar"). Numbered, never ranked.

> Which mark? Or one to push further ("2, but tighter").

## 2. Push once

On their pick, two or three variations of it (spacing, weight, the device's size), the same way. Then their yes.

## 3. Write it

- Export the mark as clean SVG, text outlined, at `docs/design/wordmark.svg`, with a version per ground that needs one.
- Add to `design-identity.md`:

  ```markdown
  ## Wordmark
  docs/design/wordmark.svg — <what it does, in one line>. Smallest size: <px>. On: <grounds>.
  ```

- Add it to `docs/design/design-identity.html` (the header), and to the Figma Cover if `design-figma` has run.

## Do not

- Make a mark before the identity is chosen, or change the identity to fit a mark.
- Use a stock icon, a generic symbol, or a reference's mark.
- Rank the marks.
