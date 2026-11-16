---
name: design-direction
description: >
  Find the direction for a product's look from what they like and from real
  references: a wide pool from every source they choose, which they mark like
  or no on a picker page, a sharper second search from those picks, then a
  moodboard of about 100 across every part of the product, which they mark
  lead, like or no. Ideas and patterns, never tokens: colour and type are chosen
  later, in design, on rendered screens.
  Runs after docs/brief.md exists and the brief has a UI, or when design hits
  a gap and needs references for one piece. Writes
  design-exploration/<slug>/direction.md, a proposal, then offers to take it
  into design.
---

# Design direction

One file comes out: `design-exploration/<slug>/direction.md`, a proposal for how the product should look and sound. It is not official. `design` turns it into screens, and only an approved prototype becomes `DESIGN.md`.

Direction is the inspiration step: it looks at good designs and works to find ideas and patterns for something new. It never picks a colour, a typeface, a size or a spacing value, and it never writes `DESIGN.md`.

## Gate

Look at the repo. Do not ask what is there.

1. No `docs/brief.md` → run `idea` first. Stop.
2. The brief says no UI (CLI, API, library) → there is no direction to find. Say so and stop.
3. Called for one piece (a view, a section, a control, an empty state, "ideas for X"), usually by `design` at a gap → **One piece**.
4. Otherwise → **Identity**. With a `DESIGN.md` already, this is a rebrand. Say that `DESIGN.md` stays as it is until `design` approves a new one.

## Folder

Everything goes in `design-exploration/<slug>/`: `candidates.tsv` and `picker.html` (and `-2` for round 2), `board.md`, `refs/`, `moodboard.html`, `direction.md`. The first pass is `identity/`. One piece uses its own slug (`pricing`, `empty-state`). If the folder exists, use `<slug>-2`. Two explorations never share a folder.

On the first write, add `design-exploration/` to `.gitignore` if it is missing, and say why in one line: it is a working folder for inspiration, not part of the product. If `git ls-files design-exploration` already lists files, say so and leave `git rm -r --cached design-exploration` to them.

## Identity

### 1. Three questions, one round

Read `docs/brief.md` first. It gives the subject, the people, the surface (site or app), the key screens, the position, and the identity nouns. Do not ask for any of that again. Send one message and wait. Do not search in that turn. These questions are how they steer the look, so always ask them, however the run was set up. Only they can say "go".

```
Before I look, three questions. Skip any with "go" and I'll decide.

1. How should <product> feel, and never feel? Any apps, sites, brands, books or places you love for this?
2. Pictures or links you already like? Screenshots, links or files.
3. Where should I look, and how many should end up on the moodboard? [x] <source> — <what it gives> … [ ] your own. Default about 100, across <the parts>. You'll pick from a wider pool first.
```

Default sources:

- **App:** popular Dribbble. No award galleries.
- **Site:** Awwwards, this year's and older winners. Recent. Dribbble for screens. Dark Mode Design only when the feel is dark. siteinspire is offered unticked: it refuses scripts, so it cannot be in the picker.
- **Imagery** (Wikimedia Commons): only when the brief's key screens need pictures.

Each of these was checked to work with this skill's scripts, without a login (2026-11-03). Do not add a source that has not been.

**The parts.** The moodboard covers the whole product, not its first screen. For a site: home, navigation, index, case study, article, blog, photography, motion. Drop a part the brief has no use for, and add one it needs. For an app: the brief's key screens, its navigation, and motion. Every keep has one part, its `topic`.

Anything skipped is yours to decide: say what you chose in one line, then search. A Figma link pasted before the search means the look already exists: say so, and offer `design` instead. If their answers contradict the brief, that is `grilling`, not a second round.

A picture they gave is a **seed**: a picker row with source `seed`, which starts liked, then a card with `link: none (shared in chat)` or its URL, never dropped. Seeds steer the queries ("more like this").

### 2. Search wide

Read [sources.md](references/sources.md) before keeping anything. Do not narrate while looking. One line at the end is enough ("Found 210 across Dribbble, Awwwards and Recent, every part covered, building the picker.").

- **They choose, so the pool is wide:** about twice the keep (150 to 250 for the default), across the sources they chose and every part. Cut only what is not a candidate: off-form, off-topic, under the source's quality floor, a near-twin from the same designer, anything sources.md drops. Never cut for taste here. A pool holding only what you would pick is the problem this step exists to fix.
- **Query the form, not the word.** "writing app" returns T-shirts. `product-design?q=text+editor+screen` returns screens.
- **Search each part.** A part is a form to search for ("editorial article layout", "portfolio case study", "full-screen menu"), and one site can fill several parts with its inner pages. Note the part in `meta`.
- **Older winners count.** A site that won years ago is a reference if it is still live and its idea has not dated. Reach back through the award archives, not only this year's listing.
- **Thin is a search problem.** Before calling a field thin, search at least three more forms, and the objects in the brief's identity nouns: the product's world often beats its category. Still thin: say what was missing rather than lowering the filter.
- **One row per candidate** in `design-exploration/<slug>/candidates.tsv`: `title<TAB>thumbnail<TAB>link<TAB>source<TAB>meta`. The thumbnail is the listing's own: sources.md says where each source keeps it. `meta` is optional, one short line (designer, likes, award).
- **Nothing is captured yet.** The picker shows listing thumbnails, which is a view, not a capture.

### 3. Pick

```
node <skill>/scripts/picker.mjs design-exploration/<slug>/candidates.tsv --out design-exploration/<slug>/picker.html
```

Look at it yourself first (`capture.mjs "file://$PWD/design-exploration/<slug>/picker.html" --out <scratch>/picker.jpg`). Drop or replace a row whose thumbnail is broken or blank, and run it again. Then say where it is and ask one line:

> Open the picker: click like on what pulls you, no on what feels wrong, add a why if you have one, then paste the picks here.

Each id is the round's letter and its row number in that round's TSV, comments not counted: `a7` is row 7 of `candidates.tsv`.

**Read the picks back**, in up to four lines, and wait for their yes or correction:

- what the likes share: a layout, an arrangement, a kind of picture, a density, a mood, with ids
- what the noes share
- the search this points to next

> Is that it, or what did I miss?

**Round 2, once.** Search again from the corrected read, sharper than round 1: the forms the likes share, the same designer or studio, the same gallery tag or category, and the shared pattern on the other sources (a liked Dribbble concept becomes a search for live sites with that pattern). Fill the parts the likes left thin. Leave out what the noes share. 60 to 100 rows in `candidates-2.tsv`, then `picker.mjs … --round 2 --out design-exploration/<slug>/picker-2.html`, and the same ask. Skip round 2 when they say the likes already cover it. There is never a third round.

**The likes are the shortlist.** Open each at full size and drop what fails sources.md, naming each drop and why in one line. Keep up to the number they chose (default about 100), spread across the parts: later-round likes and the clearest patterns first. A part with few likes stays small; never pad it. Nothing is kept from a thumbnail.

A keep is a page, not a site. For each, open the page that shows its part (the case study, the article, the menu open) and capture only that ([sources.md](references/sources.md) has the options):

```
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>.jpg
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>-menu.jpg --click "<menu button>"
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>-intro --frames 12
```

Motion is never judged from a still: a motion keep is recorded frames (`--frames`, with `--scroll` or `--click` for what moves on scroll or on a click). Run up to four captures at a time. Open every file, and capture again or drop the keep if it is blank, still loading, or repeats a band.

- **App:** a Dribbble concept has never faced real content. Keep it only if its idea survives the brief's longest names and its empty state.
- **Site:** live sites outweigh Dribbble shots.

If they say "go" or "you choose" instead of picking, pick from the pool yourself, closest to the brief, and say so in one line.

### 4. Write `board.md`

A few header lines, then one card per keep.

```
Asked: <feel, never feel, loves, or none>
Sources: <what was searched, and any skip: "Awwwards: no fit">
Picked: <the likes, by id, and what they share>
Noes: <what the noes share, or none>
Missing: <what the search could not find, or none>
Parts: <each part and how many keeps it has>

### <name>
- link: <the page a person can open, or "none (shared in chat)">
- topic: <its part: home, navigation, index, case study, article, blog, photography, motion, or a key screen>
- shot: design-exploration/<slug>/refs/<file>
- frames: <for motion: the folder --frames wrote; leave out otherwise>
- pattern: <the idea that inspires, about six words: a layout, an arrangement, a way of showing data, a voice>
- why: <why it fits this brief, one line>
```

`pattern` is the moodboard caption, so write it as a pattern ("one column, the date as the spine"), never as their brand ("Linear's purple").

### 5. Mark the moodboard

```
node <skill>/scripts/moodboard.mjs design-exploration/<slug>/board.md --out design-exploration/<slug>/moodboard.html
```

The moodboard groups the keeps by part. Each tile has Lead, Like and No, and a note. Lead is one per part: the one that should set the tone for that part.

Look at it yourself first, one part at a time so every tile stays readable (`capture.mjs "file://$PWD/design-exploration/<slug>/moodboard.html" --out <scratch>/moodboard-<part>.jpg --clip-selector "#t-<part>"`, the part's name in lowercase with dashes: `#t-case-study`). Fix a wrong caption, a wrong part or a missing picture on the board and run it again. Then say where it is and ask one line:

> Open the moodboard: Lead what should set the tone for each part, Like what belongs, No what feels wrong, add a note where you have one, then paste the copy-out here.

Read it back in up to three lines (what the leads share, what the noes share, any part with no lead) and wait for their yes. If they say "you choose", lead each part with the closest to the brief and say which.

### 6. Write `direction.md`

From their answer. Short: it is read by `design`, not by a client.

```
# Direction: <product>

Proposal, not official. design turns this into screens. Only an approved prototype becomes DESIGN.md.

- idea: <the one thing this product's look says, in one sentence>
- feel: <their words for feel and never feel>
- patterns: <what inspires us, each with its reference: a layout, an arrangement, a kind of picture, a way of moving>
- ownable: <one concrete element made from the brief's `remembered for` and identity nouns, so this is not the lead. For a lighthouse logbook: a lamp-glow marker on the active item. Unconfirmed until seen rendered>
- voice: <how it talks: the brief's personality, and one sample line in that voice>
- leave: <what stays behind: each reference's name, colours and typefaces, what the brief's `against` looks like, what their noes on the picker and the moodboard share, and whatever they said feels wrong>

## References
### <part>
- lead: <card> — <link>
- also: <their likes in this part> — <links>
```

- **The leads are theirs.** A part they did not lead gets the closest to the brief, marked as your pick: the closest, not the boldest. Each lead sets the feeling of its part. None is the brand.
- **Notes count.** A tile note is about that reference: it goes into `patterns` or `leave`. Their moodboard noes are not references.
- **No values.** No hex, no font name, no size. If a reference's colour or type is the point, describe the quality ("near-black ink on a warm page", "a condensed display face") and let `design` choose the value.

Then say the direction in chat in four lines (idea, patterns, ownable, leave), and end with one question. Wait for the answer, however the run was set up: the direction is theirs to correct before anything is built on it.

> Change anything, or take this into design?

Yes → load `design`. No → stop. The folder stays on this machine.

## One piece

Usually called from `design` when a key screen has a gap no reference covers. Same card shape, same moodboard, its own slug.

1. Read `DESIGN.md` if it exists, and the brief. They are the base: the piece fits the colour, type and voice already chosen and never changes them.
2. Ask once, then wait, unless the caller already said what is needed:

   ```
   Any style or requirements for this? Optional.

   A few ways to search:
   - <a form you can type into a gallery: "a bar that fills once">
   - <…>
   ```

3. Build a pool of 20 to 40. Include the same piece in other subjects. For a gap software has not solved, search outside software for the same form.
4. One picker round, no round 2. Keep up to the number asked (default 8 for one piece) from their likes, opened at full size. Record frames for a piece that moves.
5. Write `design-exploration/<slug>/board.md` (the topic is the piece), run the moodboard, and ask them to mark it.
6. Write a short `direction.md` for the piece: `patterns`, `leave`, and the references. Hand back to `design`.

## Do not

- Pick colour, type, spacing, or any value. Write `DESIGN.md`. Code or lay out a page.
- Search before the three questions are answered, answer them yourself, or ask them a second round of questions. Run a third picker round.
- Cut the pool for taste before they pick. Pad the keep by lowering the filter. Keep a shot nobody opened at full size.
- Screenshot a source's listing or search page, or a candidate you are not keeping. Never stitch screenshots or frames into one picture.
- Judge motion from a still.
- Name a reference in `direction.md`'s idea, patterns or ownable as the thing to copy. Name the pattern.
- Put notes or skill feedback under `design-exploration/`. Use the chat.
