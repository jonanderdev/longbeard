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

Two things come out:

- **`docs/design/design-moodboard.md`**, committed: what the board says. The moves it holds, what the likes share, what the noes share, what is missing. Never a source.
- **`.longbeard/design/moodboard/`**, gitignored: `board.md` (one card per keep, with its link), `refs/` (the captures), the picker pages. Contact sheets are scratch, outside it. The skills read it; nobody needs to open it.

It chooses no look and ranks nothing. It gathers what they like and says what it holds.

## Gate

1. No `docs/design/design-brief.md` → `design-brief` first. Stop.
2. Called for one piece (a menu, an empty state, "ideas for the pricing table") → **One piece**, below.
3. A board given in the design brief, or now → **Their board**.
4. Otherwise → **Search**.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

**At `pace: quick`** (the design brief): their board as it is, with three or more references, and no gap search. With none, one search: a pool of about 30 across the key screens, steered by the design brief as below, grouped first (step 2 below, `--sheet` for the order) and shown as one contact sheet (`contact-sheet.mjs`), group by group; they name six to ten by number, and those are the keeps. No picker, no round two. The board and the doc are written as usual.

## The parts

The board covers the whole product, not its first screen. For a site: home, navigation, index, case study, article, photography, motion, as the brief needs them. For an app: the brief's key screens, its navigation, motion. Motion is a part only when the design brief's `motion` is not none: the site they pasted for it (in `brief-loves.md`) is its first keep, and examples are searched for only if they asked for some. Every keep has one `part`.

## Their board

Their board already holds their taste: it is the pool. A rich board needs no search and no picker.

**Read it.** A folder: open every image. Links: capture each page. Figma, a section at a time:

- `create_session` with the file key first. Over about 200 cards, ask once: "The whole file, or one page or section?" Where the board has its own tags, offer to read only the ones that are screens.
- `get_metadata` on the page, saved to a file; read only its section lines, never the whole dump into context.
- Captions, tags and stars are read from the nodes with `use_figma`, paged under its 48 KB return cap, never from a screenshot. A star is a keep that is named in the read-back.
- Save each keep's original to `refs/<card name>.<ext>`: `download_assets` returns the original uploads (up to 20 per call). A card's render on the board is a thumbnail, never what is saved.
- **Cards cut from shared sheets** (many cards share one `imageHash`, filled with `scaleMode: CROP`): read each card's name, hash, transform, caption and tags into `cards.json`, then

  ```
  node <skill>/scripts/crops.mjs .longbeard/design/moodboard/cards.json --list
  node <skill>/scripts/crops.mjs .longbeard/design/moodboard/cards.json --sheets <scratch>/sheets --out .longbeard/design/moodboard/refs
  ```

  The first lists each sheet once to download; the second checks each against its hash and crops every card at full size.

**Keep every card that fits.** Never cut their board to a number. Drop only what plainly fails (off-topic, broken, a duplicate), and say how many and why in one line. A poster, a type specimen, packaging or an illustration is kept, marked `screen: no`: it carries colour and picture treatment, not an arrangement.

**Is it enough?** Three checks:

- **Enough to compose from:** at least six keeps that are screens.
- **Every part:** each key screen in the brief has at least one keep that shows that kind of screen.
- **One far reference:** when every keep is a screen, at least one from outside screens (print, signage, packaging, an object from the subject's world), marked `screen: no`, so the screens have something to borrow that no other screen has.

All met → say so in one line ("34 fits, every part covered") and write the doc. Otherwise say what it lacks in up to three lines and ask:

> Search for these, or go with what your board has?

- **A gap:** search only what is missing, 20 to 60 candidates, one picker round. The likes join the keep.
- **Too thin for six screens:** the full **Search**, with their board's fits as seeds.
- **"Go":** what it lacks goes under `Missing`.

**Big boards.** Over about 60 keeps, say once: "That's 240 references. `design-families` can sort them into looks before you choose." Their call.

## Search

Read [sources.md](references/sources.md) first. Default sources: for an app, popular Dribbble; for a site, Awwwards (this year's and older winners), Recent, and Dribbble for screens. The sites they love (in `.longbeard/design/brief-loves.md`) are seeds: captured, and searched from ("more like this").

**The design brief steers the pool, not the picks.** Read its words, personality, never, apart from and distance before the first query:

- **Queries carry the personality** where it leans (1–2 or 4–5): a loud, playful, dense brief searches "bold colour-block dashboard", a quiet, classic, airy one "minimal serif editorial homepage". A slider at 3, or not answered, adds nothing. Half the pool from the leaning forms, half wide, so they can still surprise themselves.
- **Apart from:** with distance 4–5, leave out candidates that look like the kind of product named there (its usual layout, its usual colours); with 1–2, keep them in, since fitting in is the ask. In `brief-loves.md`, the competitors they named are never seeds.
- **Never:** a candidate that is plainly the never ("a dark neon dashboard" when never says neon) is not a candidate. Anything less plain stays: they say no on the picker, not you.

1. **A wide pool:** 150 to 250 candidates, across every part. Query the form, not the word ("editorial article layout", not "writing app"). Before calling a field thin, try three more forms and the brief's identity nouns. Cut only what is not a candidate (off-form, broken, under the source's floor); never cut for taste. The Dribbble script's default drop list holds only what is never a screen for any product (merch, CVs, worksheets, seasonal cards, stickers, mockups). A kind of product or a look is a candidate for some brief, so you pass it with `--drop` only when this brief rules it out, and the script says on stderr what it cut. One row per candidate in `.longbeard/design/moodboard/candidates.tsv`: `title<TAB>thumbnail<TAB>link<TAB>source<TAB>meta`.
2. **Check it on contact sheets** (`contact-sheet.mjs candidates.tsv --out <scratch>/sheets`): drop non-screens and broken thumbnails only. Then **group it**, before anyone picks:

   ```
   node <skill>/scripts/group.mjs .longbeard/design/moodboard/candidates.tsv --out .longbeard/design/moodboard/families.json
   ```

   Taste only steers when there are real choices. It measures each thumbnail from its URL and sorts them with `families.mjs`. Nothing is saved: each is read from a scratch folder outside the project, deleted when the script ends. Name each group for what is seen (`name` in the file). **The floor:** with fewer than four groups of real size (a twentieth of the pool, three at least), it says `floor: not met`. Say which looks the pool holds and which it lacks, and search again in other forms and sources, twice at most; then go on and say it is thin. Round one only.
3. **The picker**, grouped, each group headed by its size:

   ```
   node <skill>/scripts/picker.mjs .longbeard/design/moodboard/candidates.tsv --families .longbeard/design/moodboard/families.json --out .longbeard/design/moodboard/picker.html
   ```

   Look at it yourself first, replace broken rows, then give the path:

   > Open the picker: like what pulls you and, in its note, say what you like in it and why while you feel it; no what feels wrong, which needs none. Then paste the picks here.

4. **Read the picks back** in up to three lines (what the likes share, what the noes share, the next search) and wait.
5. **Round two, once:** sharper, from the corrected read: the forms the likes share, the same designers, the pattern on other sources. 60 to 100 rows, `picker.mjs … --round 2`. Skip it when they say the likes cover it. Never a third.
6. **Capture the likes**, all of them. Open each at full size; drop only a dead page, a gate or broken work, and say so. A keep is a page, not a site: capture the page that shows its part.

   ```
   node <skill>/scripts/capture.mjs <url> --out .longbeard/design/moodboard/refs/<name>.jpg
   node <skill>/scripts/capture.mjs <url> --out .longbeard/design/moodboard/refs/<name>-menu.jpg --click "<menu button>"
   node <skill>/scripts/capture.mjs <url> --out .longbeard/design/moodboard/refs/<name>-intro --frames 12
   ```

   Motion is judged from recorded frames, never a still. Up to four captures at a time; open every file and capture again if it is blank or still loading.

- **App:** a Dribbble concept has never faced real content. Keep it only if its idea survives the brief's longest names, real numbers and an empty state.
- **Site:** live sites outweigh Dribbble shots.

"You choose" instead of picking: pick closest to the design brief (its words, personality and never, in that order), and say so.

## The board

Write `.longbeard/design/moodboard/board.md`, one card per keep:

```
### <card name>
- link: <the page, or "none (shared in chat)">
- part: <home, navigation, article, …>
- shot: .longbeard/design/moodboard/refs/<file>
- frames: <for motion, the folder; else leave out>
- screen: <yes | no>
- like: <their words from the picker's note, as written: what they like in it, and why; leave out when none>
- move: <what it does, as a move, about ten words: "headline fills the width, cropped at the right edge">
- why: <why it fits the design brief, one line, in its words or personality: "dense and serious, as asked">
```

`like` is theirs, copied as written, and is never reworded; `move` and `why` are your reading. `move` is the heart of it: the composition, picture treatment or type move that made them like it, written so a person could draw it with the picture closed. Never a brand ("like <studio>'s purple").

Build the page to look through, and check it yourself:

```
node <skill>/scripts/moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/moodboard/moodboard.html
```

## Write `docs/design/design-moodboard.md`

```markdown
# Moodboard: <product>

<n> references across <parts>. From <their board / a search of n candidates, two rounds>.

## What it says
- <a shared move, in plain words: "type is the picture: one word, enormous, cropped">
- <…, three to six lines>

## Moves worth keeping
- <part>: <a move, as on its card> (<n> references)
- <…>

## Not this
- <what the noes share, and what the design brief says never>

## Missing
- <a part nothing shows, or none>
```

No names, links or paths. Then say the doc in five lines and end with one question:

> Anything wrong in how I read your board?

Then the next step, in one line: `design-direction`, or `design-families` first for a board over about 60. Say how many likes it holds: the direction's spread comes from 6 to 10 of them.

## One piece

For one part (`design-prototype` hits a screen nothing shows). Read `DESIGN.md` and the design brief: the piece fits what was chosen and never changes it. Ask once what style or requirements it has (optional), with a few ways to search. A pool of 20 to 40, including the same piece in other subjects and outside software. One picker round. Keep their likes (default up to 8), captured at full size, in `.longbeard/design/<piece>/board.md`. Add a short section to `design-moodboard.md`: the piece and its moves. Hand back.

## Do not

- Cut their board or their likes to a number, or drop for taste.
- Search past a board that is enough, or before they say yes to a gap search.
- Save a thumbnail as a shot. Judge motion from a still. Screenshot a listing page.
- Write a source's name, link or a `.longbeard/` path into the committed doc.
