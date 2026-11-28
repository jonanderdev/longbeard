---
name: design-wordmark
description: >
  Optional. A wordmark from the identity's faces and devices, judged in the
  chosen screen. Runs once the identity is chosen and they want a mark
  beyond the name set in type.
---

# Design wordmark

**Needs:** `docs/design/design-identity.md`, `docs/design/design-direction.md`  
**Uses if there:** `DESIGN.md`  
**Writes:** `docs/design/wordmark.svg`, a section in `docs/design/design-identity.md`

A product does not need a mark to be designed: until then, the name is set in the display face. This skill is for when they want one. It is not a logo project: it draws marks from the type and colour already chosen.

Comes out: the chosen mark as SVG in `docs/design/wordmark.svg`, a section in `design-identity.md`, and the mark on the identity board. Options live in `.longbeard/design/wordmark/`.

**At every stop,** say what is new and the one question, in up to five lines: one line per option, nothing they already know. They look at the page itself (the board, the canvas, a screen), never a picture of it: its path where they can open this machine's files; where they cannot (a cloud session), `bundle.mjs <page> --out <one file>`, publish that as a private page if your agent can, and give the link. Pictures are for your own checks. Each yes is written to its doc when it is given, so the session can end at any stop. Open the first stop with where they are in the design (the steps done, this one, the ones after), what this step decides, and when it is done. An ask that belongs to another step (another page during the direction, a new colour during the prototype) is named as that step's: say so, and whether to finish this one first. **At the end,** say what is now decided, the next step and why, and to start it in a new session (the files carry it), with what to type; when the next step needs this working folder and the folder will not outlive the session (a cloud session), go on here and say why.

## Gate

1. No `docs/design/design-direction.md` → `design-direction` first: a mark is judged where the name actually sits. No `docs/design/design-identity.md` → `design-identity`. Stop.
2. A mark exists → a change: show it, ask what changes.

Read the identity, the brief's name and identity nouns, and the design brief's personality.

## 0. Marks they like

Ask once which marks they like and why: the cards on their board that show a mark, to pick from, or, when there are none, a search for marks (`design-moodboard`'s one piece). "None, just the name" is a fine answer. A liked mark lends only the kind of device (a cut, a ligature, a case, a rule); its letterforms and shapes never.

## 1. Marks, on the canvas

Four to six marks, each a small HTML page in `.longbeard/design/wordmark/`, made only from the identity's faces and colours and devices that belong to them: a cut, a ligature, a case, a rule, a shape, the accent. One of them is the name set plainly in the display face, so not making a mark is a choice too. Never a stock icon, a generic symbol, or a reference's letterforms or shapes; a kind of device they liked in step 0 is fine.

Each is shown where the name actually sits in the chosen screen (`.longbeard/design/direction/prototype/first.html`, or its kept copy in `docs/design/prototype/`), at that size and on that ground, and once large on its own. Where the chosen screen does not show the name at all, that stays so: the mark is for the places that do (the navigation, the tab, the favicon). Capture them and show them on the canvas:

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/wordmark/1.html" --out .longbeard/design/wordmark/1.jpg
node <skill>/scripts/canvas.mjs .longbeard/design/wordmark/marks.json --shots .longbeard/design/wordmark --title Wordmark --out .longbeard/design/wordmark/canvas.html
```

Each entry in `marks.json` is `{ "n": 1, "row": "Marks", "note": "<what it does>", "state": "built" }`, one line of what it does ("the A's crossbar is the accent bar"), and a fact when it breaks one of the direction's principles. Numbered, never ranked.

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

- Add it to `docs/design/design-identity.html` (the header), to the chosen screen in place of the plain name, and to the Figma Cover if `design-figma` has run.

## Do not

- Make a mark before the direction is chosen, or change the identity or the composition to fit a mark.
- Add the name or the mark to a screen whose composition leaves it out.
- Use a stock icon, a generic symbol, or a reference's mark.
- Rank the marks.
