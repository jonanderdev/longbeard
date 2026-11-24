---
name: design-moodboard
description: >
  References for the look. Reads their own moodboard (a Figma board, a folder,
  links) and fills only what it lacks, or, without one, finds a wide pool from
  the sources they choose for them to mark like or no on a picker page, with
  one sharper second round. The keeps are captured privately; the committed doc
  describes what the board says, move by move, without naming a source. Runs
  after docs/design/design-brief.md exists, or when a key screen has no
  reference ("one piece").
---

# Design moodboard

**Needs:** `docs/design/design-brief.md`  
**Uses if there:** their own board (a Figma link, a folder, links)  
**Writes:** `docs/design/design-moodboard.md`

Writes `docs/design/design-moodboard.md` (committed: what the board says, never a source) and works in `.longbeard/design/moodboard/` (gitignored): `board.md`, one card per keep, `refs/` (the captures), the picker pages. It chooses no look and ranks nothing.

**At every stop,** say what is new and the one question, in up to five lines: a path or a sheet instead of pasted content, one line per option, nothing they already know.

## Gate

1. No `docs/design/design-brief.md` → `design-brief` first. Stop.
2. Called for one piece (a menu, an empty state) → **One piece**, below.
3. A board given in the design brief, or now → **Their board**.
4. Otherwise → **Search**.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

**At `pace: quick`:** their board as it is, with three or more references, and no gap search. With none, one search of about 30, grouped (step 2 below), on one contact sheet; they name six to ten by number. No picker, no round two.

**The parts.** The board covers the whole product: for a site, home, navigation, index, case study, article, photography as the brief needs them; for an app, its key screens and navigation; motion only when the design brief's `motion` is not none. Every keep has one `part`.

## Their board

Their board already holds their taste: it is the pool, with no search and no picker.

**Read it.** A folder: open every image. Links: capture each page. Figma, a section at a time:
- `create_session` with the file key first. Over about 200 cards, ask once: the whole file, or one page or section?
- `get_metadata` to a file; read only its section lines.
- Captions, tags and stars from the nodes with `use_figma`, paged under its 48 KB cap, never from a screenshot. A star is a keep.
- Originals with `download_assets` (up to 20 per call) into `refs/<card name>.<ext>`, never the board's thumbnail.
- **Cards cut from shared sheets** (many cards, one `imageHash`, `scaleMode: CROP`): read each card's name, hash, transform, caption and tags into `cards.json`, then
  ```
  node <skill>/scripts/crops.mjs .longbeard/design/moodboard/cards.json --list
  node <skill>/scripts/crops.mjs .longbeard/design/moodboard/cards.json --sheets <scratch>/sheets --out .longbeard/design/moodboard/refs
  ```

**Keep every card that fits;** drop only what plainly fails (off-topic, broken, a duplicate) and say how many in one line. A poster, specimen, packaging or illustration is kept as `screen: no`.

**Is it enough?** At least six screens; every key screen in the brief shown by at least one keep; and, when every keep is a screen, one far reference (print, signage, packaging; Fonts In Use has these, [sources.md](references/sources.md)). All met: say so in one line. Otherwise say what it lacks in up to three lines:

> Search for these, or go with what your board has?

A gap: search only that, 20 to 60 candidates, one picker round. Too thin: the full **Search**, their fits as seeds. "Go": what it lacks goes under `Missing`.

**Big boards.** Over about 60 keeps, say once: "That's 240 references. `design-families` can sort them into looks, as headings on the board you choose from; none is dropped." Their call.

## Search

Read [sources.md](references/sources.md) first. Default sources: for an app, popular Dribbble; for a site, Awwwards, then Dribbble for screens, Minimal Gallery and httpster when a look needs more. Sites they love (`.longbeard/design/brief-loves.md`) are seeds; competitors they named never are.

**The design brief steers the pool, not the picks.** Queries carry the personality where it leans off 3 ("bold colour-block dashboard", "minimal serif editorial homepage"), half the pool from those, half wide. At distance 4–5, leave out what looks like the kind of product in `apart from`. Drop only what is plainly the `never`; anything less plain is theirs to say no to.

1. **A wide pool:** 150 to 250 candidates across every part, querying the form, not the word. Cut only what is not a candidate (off-form, broken, under the source's floor), never for taste; pass `--drop` only for what this brief rules out. One row each in `candidates.tsv`: `title<TAB>thumbnail<TAB>link<TAB>source<TAB>meta`.
2. **Check and group it.** Drop non-screens and broken thumbnails on contact sheets (`contact-sheet.mjs`), then:
   ```
   node <skill>/scripts/group.mjs .longbeard/design/moodboard/candidates.tsv --out .longbeard/design/moodboard/families.json
   ```
   Name each group for what is seen. `floor: not met` (fewer than four groups of real size): search other forms and sources, twice at most, then go on and say it is thin.
3. **The picker:**
   ```
   node <skill>/scripts/picker.mjs .longbeard/design/moodboard/candidates.tsv --families .longbeard/design/moodboard/families.json --out .longbeard/design/moodboard/picker.html
   ```
   Look at it first and replace broken rows, then:
   > Open the picker: like what pulls you and say in its note what you like and why; no what feels wrong. Paste the picks.
4. **Read the picks back** in up to three lines (what the likes share, what the noes share, the next search) and wait.
5. **Round two, once:** sharper, from the corrected read, 60 to 100 rows (`--round 2`). Skip it when they say the likes cover it.
6. **Capture every like** (`capture.mjs <url> --out refs/<name>.jpg`; `--click` for a menu, `--frames 12` for motion, judged from frames, never a still). Up to four at a time; open each file and capture again if blank. Drop only a dead page or a gate, and say so.

An app's Dribbble concept stays only if it survives the brief's longest names, real numbers and an empty state. For a site, live sites outweigh shots. "You choose": pick closest to the design brief, and say so.

## The board

`.longbeard/design/moodboard/board.md`, one card per keep:

```
### <card name>
- link: <the page, or "none (shared in chat)">
- part: <home, navigation, article, …>
- shot: .longbeard/design/moodboard/refs/<file>
- frames: <for motion, the folder; else leave out>
- screen: <yes | no>
- like: <their words from the picker's note, as written; leave out when none>
- move: <what it does, about ten words: "headline fills the width, cropped at the right edge">
- why: <why it fits the design brief, one line>
```

`like` is theirs, never reworded; `move` and `why` are your reading, never a brand. Build the page and look at it yourself:

```
node <skill>/scripts/moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/moodboard/moodboard.html
```

## Write `docs/design/design-moodboard.md`

```markdown
# Moodboard: <product>

<n> references across <parts>. From <their board / a search of n candidates, two rounds>.

## What it says
- <a shared move, in plain words; three to six lines>

## Moves worth keeping
- <part>: <a move, as on its card> (<n> references)

## Not this
- <what the noes share, and the design brief's never>

## Missing
- <a part nothing shows, or none>
```

No names, links or paths. Then the doc in up to five lines, how many likes it holds (the direction draws on 6 to 10), and:

> Anything wrong in how I read your board?

Next: `design-direction`, or `design-families` first for a board over about 60.

## One piece

For one part `design-prototype` has no reference for. Read `DESIGN.md` and the design brief: the piece fits what was chosen. Ask once about style or requirements (optional). A pool of 20 to 40, including the piece in other subjects and outside software, one picker round, their likes (up to 8) captured into `.longbeard/design/<piece>/board.md`, and a short section in `design-moodboard.md`. Hand back.

## Do not

- Cut their board or their likes to a number, or drop for taste.
- Search past a board that is enough, or before they say yes to a gap search.
- Save a thumbnail as a shot, judge motion from a still, or screenshot a listing page.
- Write a source's name, link or a `.longbeard/` path into the committed doc.
