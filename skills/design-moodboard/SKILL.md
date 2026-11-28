---
name: design-moodboard
description: >
  References for the look: reads their own board, or finds a pool they mark
  like or no, and fills only gaps. Writes docs/design/design-moodboard.md.
  Runs after the design brief, or when a key screen has no reference.
---

# Design moodboard

**Needs:** `docs/design/design-brief.md`  
**Uses if there:** their own board (a Figma link, a folder, links)  
**Writes:** `docs/design/design-moodboard.md`

Writes `docs/design/design-moodboard.md` (committed: what the board says, never a source) and works in `.longbeard/design/moodboard/` (gitignored): `board.md`, one card per keep, `refs/` (the captures), the picker pages. It chooses no look and ranks nothing.

**At every stop,** say what is new and the one question, in up to five lines: one line per option, nothing they already know. They look at the page itself (the board, the canvas, a screen), never a picture of it: its path where they can open this machine's files; where they cannot (a cloud session), `bundle.mjs <page> --out <one file>`, publish that as a private page if your agent can, and give the link. Pictures are for your own checks. Each yes is written to its doc when it is given, so the session can end at any stop. Open the first stop with where they are in the design (the steps done, this one, the ones after), what this step decides, and when it is done. An ask that belongs to another step (another page during the direction, a new colour during the prototype) is named as that step's: say so, and whether to finish this one first. **At the end,** say what is now decided, the next step and why, and to start it in a new session (the files carry it), with what to type; when the next step needs this working folder and the folder will not outlive the session (a cloud session), go on here and say why.

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

**A reference that moves is judged from its frames, never from one picture.** A GIF or a video, in a folder or on a card marked moving (a `gif-link` line, `motion` in its caption or tags): a board card's picture and a GIF's first frame are stills, so fetch the GIF or video itself (from that link on Figma), record it (`capture.mjs file:///<path> --out refs/<name>-frames --frames 12 --every 200`), look at the frames and give its card `frames:`.

**What earlier projects learned:** a `Learned` frame on their board, a `learned.md` in their folder, or `~/.longbeard/taste.md`. Its likes, whys and leave-outs go on the matching cards (`like:`, `avoid:`), its noes under **Not this**. Their words, never reworded.

**Screens of one product** (a section or a group of cards from the same site or app): the one they starred or captioned is the keep, and the others are its `also:` lines.

A keep with a live link to a site or app gets its other screens as in **Search**, step 7.

**Keep every card that fits;** drop only what plainly fails (off-topic, broken, a duplicate) and say how many in one line. A poster, specimen, packaging or illustration is kept as `screen: no`.

**Is it enough?** At least six screens; every key screen in the brief shown by at least one keep; when every keep is a screen, one far reference (print, signage, packaging; Fonts In Use has these, [sources.md](references/sources.md)); and, when the design brief's motion is present or leading, a keep that shows it moving (a card with `frames:`, or the site they pasted for its motion). All met: say so in one line. Otherwise say what it lacks in up to three lines:

> Search for these, or go with what your board has?

A gap: search only that, 20 to 60 candidates, one picker round. A motion gap is judged moving, never from a thumbnail: in the picker they open each candidate's link and watch it live, then like it with what moves that they like. Only a like is read, so the prototype can rebuild it: a live page from its code, a GIF or video from its own frames. Too thin: the full **Search**, their fits as seeds. "Go": what it lacks goes under `Missing`.

**Big boards.** Over about 60 keeps (not at `quick`), group them by eye so the board they choose from has headings: look at them on contact sheets (`contact-sheet.mjs`, never picture by picture), and give each card a `topic:` line naming its group for what is seen, in words a person outside design would use ("one huge word is the picture"). As many groups as there are looks; strays stay strays, and none is dropped. Their own board is never changed. Say the groups in one line each with the doc.

## Search

Read [sources.md](references/sources.md) first. Default sources: for an app, popular Dribbble; for a site, Awwwards, Recent, then Dribbble for screens, Minimal Gallery, httpster and Internet Gems when a look needs more. For one part: Footer Design and CTA Gallery for a footer or a call to action; Recent's motion and launch videos, and Codrops demos, for motion; Recent's interface, app screenshot and app icon listings for an app; its branding, posters and print for the far reference. Sites they love (`.longbeard/design/brief-loves.md`) are seeds; competitors they named never are.

**The design brief steers the pool, not the picks.** Queries carry the personality where it leans off 3 ("bold colour-block dashboard", "minimal serif editorial homepage"), half the pool from those, half wide. At distance 4–5, leave out what looks like the kind of product in `apart from`. Drop only what is plainly the `never`; anything less plain is theirs to say no to.

1. **A wide pool:** 150 to 250 candidates across every part, querying the form, not the word, from every listed source that fits the brief: no one gallery's taste sets the pool, so no source gives over half (`group.mjs` counts them). Cut only what is not a candidate (off-form, broken, under the source's floor), never for taste; pass `--drop` only for what this brief rules out. One row each in `candidates.tsv`: `title<TAB>thumbnail<TAB>link<TAB>source<TAB>meta`.
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
7. **Its other screens.** A like is one screen of a product designed whole. When it is a live site or app with more pages, capture up to four of its pages that show the brief's other key screens (an index, an article, the menu open, a form) as `also:` lines on its card. They are not likes and are never marked: they show how that product carried its look from screen to screen, so `design-prototype` borrows its layouts first. A shot or a poster has none.

An app's Dribbble concept stays only if it survives the brief's longest names, real numbers and an empty state. For a site, live sites outweigh shots. "You choose": pick closest to the design brief, and say so.

## The board

`.longbeard/design/moodboard/board.md`, one card per keep:

```
### <card name>
- link: <the page, or "none (shared in chat)">
- part: <home, navigation, article, …>
- shot: .longbeard/design/moodboard/refs/<file>
- frames: <for motion, the folder; else leave out>
- also: <part>: .longbeard/design/moodboard/refs/<file> (one line per other screen of the same product; else leave out)
- screen: <yes | no>
- like: <their words from the picker's note, as written; leave out when none>
- avoid: <what they want left out of it, in their words; leave out when none>
- topic: <its group on a big board, named for what is seen; leave out when not grouped>
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

Next: `design-direction`.

## One piece

For one part, asked for by `design-direction` or `design-prototype` (they opened it and said "find more", or no reference shows it). Their own board first: the cards whose `part` or `also` shows it, and, with a library they keep (a Figma board, a folder), its cards of that part; then outside. Read `DESIGN.md` (or the direction) and the design brief: the piece fits what was chosen. Ask once about style or requirements (optional). A pool of 20 to 40, including the piece in other subjects and outside software, one picker round, their likes (up to 8) captured into `.longbeard/design/<piece>/board.md`, and a short section in `design-moodboard.md`. Hand back.

## Do not

- Cut their board or their likes to a number, or drop for taste.
- Search past a board that is enough, or before they say yes to a gap search.
- Save a thumbnail as a shot, judge motion from a still, or screenshot a listing page.
- Write a source's name, link or a `.longbeard/` path into the committed doc.
