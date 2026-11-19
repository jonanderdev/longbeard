# Search and pick

From `design-direction`, when there is no moodboard, or one too thin. The parts, the sliders and what they said steer every query.

## Sources

- **App:** popular Dribbble. No award galleries.
- **Site:** Awwwards, this year's and older winners. Recent. Dribbble for screens. Dark Mode Design only when the feel is dark. siteinspire is offered unticked: it refuses scripts, so it cannot be in the picker.
- **Imagery** (Wikimedia Commons): only when the brief's key screens need pictures.

Each of these was checked to work with this skill's scripts, without a login (2026-11-03). Do not add a source that has not been.

## Seeds

A picture they gave is a **seed**: a picker row with source `seed`, which starts liked, then a card with `link: none (shared in chat)` or its URL, never dropped. Seeds steer the queries ("more like this").

## 2. Search wide

Read [sources.md](sources.md) before keeping anything. Post one line as each source or part is done ("Dribbble done: 64 candidates, home and navigation covered. Awwwards next."), and one at the end ("Found 210 across Dribbble, Awwwards and Recent, every part covered, building the picker."). Not every query or page.

- **They choose, so the pool is wide:** about twice the keep (150 to 250 for the default), across the sources they chose and every part. Cut only what is not a candidate: off-form, off-topic, under the source's quality floor, a near-twin from the same designer, anything sources.md drops. Never cut for taste here. A pool holding only what you would pick is the problem this step exists to fix.
- **Query the form, not the word.** "writing app" returns T-shirts. `product-design?q=text+editor+screen` returns screens.
- **Search each part.** A part is a form to search for ("editorial article layout", "portfolio case study", "full-screen menu"), and one site can fill several parts with its inner pages. Note the part in `meta`.
- **Older winners count.** A site that won years ago is a reference if it is still live and its idea has not dated. Reach back through the award archives, not only this year's listing.
- **Thin is a search problem.** Before calling a field thin, search at least three more forms, and the objects in the brief's identity nouns: the product's world often beats its category. Still thin: say what was missing rather than lowering the filter.
- **One row per candidate** in `design-exploration/<slug>/candidates.tsv`: `title<TAB>thumbnail<TAB>link<TAB>source<TAB>meta`. The thumbnail is the listing's own: sources.md says where each source keeps it. `meta` is optional, one short line (designer, likes, award).
- **Nothing is captured yet.** The picker shows listing thumbnails, which is a view, not a capture.

## 3. Pick

```
node <skill>/scripts/picker.mjs design-exploration/<slug>/candidates.tsv --out design-exploration/<slug>/picker.html
```

**Check the pool before the picker.** Look at every candidate on contact sheets, not one by one (`contact-sheet.mjs candidates.tsv --out <scratch>/sheets`, about 36 a sheet). Drop only what is not a candidate: not a screen (an illustration, packaging, a logo sheet, a poster, merch), a broken or blank thumbnail, an exact twin. Never drop for taste or for a look: a gradient, a typeface, a colour, a style the rules call a tell. Say how many went and why in one line. A big pool: a line every few sheets ("Sheets 3 of 6 checked: 9 dropped so far").

The check never shrinks the pool to fit. If what is left is under about one and a half times the keep, or a part has only a handful, search again for what is thin (another query, another source) and check the new rows the same way. A person can only pick from what the pool holds.

Then build the picker and look at it yourself (`capture.mjs "file://$PWD/design-exploration/<slug>/picker.html" --out <scratch>/picker.jpg`). Replace a row whose thumbnail is broken, and run it again. Then say where it is and ask one line:

> Open the picker: click like on what pulls you, no on what feels wrong, add a why if you have one, then paste the picks here.

Each id is the round's letter and its row number in that round's TSV, comments not counted: `a7` is row 7 of `candidates.tsv`.

**Read the picks back**, in up to four lines, and wait for their yes or correction:

- what the likes share: a layout, an arrangement, a kind of picture, a density, a mood, with ids
- what the noes share
- the search this points to next

> Is that it, or what did I miss?

**Round 2, once.** Search again from the corrected read, sharper than round 1: the forms the likes share, the same designer or studio, the same gallery tag or category, and the shared pattern on the other sources (a liked Dribbble concept becomes a search for live sites with that pattern). Fill the parts the likes left thin. Leave out what the noes share. 60 to 100 rows in `candidates-2.tsv`, then `picker.mjs … --round 2 --out design-exploration/<slug>/picker-2.html`, and the same ask. Skip round 2 when they say the likes already cover it. There is never a third round.

**The likes are the keep, all of them.** They chose them, so none is cut to reach a number. Open each at full size and drop only what fails sources.md (a dead page, a gate, broken work), never for taste. Every drop goes on the board as a card in a last group, `Dropped`, with its reason as its `why`, so they can see it and bring it back with a note. A part with few likes stays small; never pad it. Nothing is kept from a thumbnail.

A keep is a page, not a site. For each, open the page that shows its part (the case study, the article, the menu open) and capture only that ([sources.md](sources.md) has the options):

```
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>.jpg
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>-menu.jpg --click "<menu button>"
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>-intro --frames 12
```

Motion is never judged from a still: a motion keep is recorded frames (`--frames`, with `--scroll` or `--click` for what moves on scroll or on a click). Run up to four captures at a time, and post a line every batch or so ("Captured 24 of 58"). Open every file, and capture again or drop the keep if it is blank, still loading, or repeats a band.

- **App:** a Dribbble concept has never faced real content. Keep it only if its idea survives the brief's longest names and its empty state.
- **Site:** live sites outweigh Dribbble shots.

If they say "go" or "you choose" instead of picking, pick from the pool yourself, closest to the brief, and say so in one line.

Then step 4 of `design-direction`.
