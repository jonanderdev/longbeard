---
name: design-direction
description: >
  Find the direction for a product's look from what they like and from real
  references. Their own moodboard (a Figma board, a folder, links) is the pool.
  Without one, or with one too thin: a wide pool from every source they
  choose, which they mark like or no on a picker page, and a sharper second
  search from those picks. The pool is then sorted into families that look
  alike. On one board they mark, in the family they want, one anchor and the
  donors. Those are read into a library: how the screens are arranged, how
  they do navigation, what type, grounds and accents they use, each measured
  and none chosen. Runs after docs/brief.md exists and the brief has a UI, or
  when design hits a gap and needs references for one piece. Writes
  design-exploration/<slug>/direction.md and library.json, a proposal, then
  offers to take it into design.
---

# Design direction

Two files come out, both in `design-exploration/<slug>/`: `direction.md`, a proposal for what the product's look should say and sound like, and `library.json`, what their chosen references use. Neither is official. `design` deals screens from the library, and only an approved prototype becomes `DESIGN.md`.

Direction is the inspiration step: it gathers good designs, sorts them, and reads the ones they choose. It records what references use and chooses nothing: no colour, typeface, size or spacing value is picked here, no combination is proposed, and no reference is ranked. Choosing happens in `design`, by them, on rendered screens. Direction never writes `DESIGN.md`.

## Gate

Look at the repo. Do not ask what is there.

1. No `docs/brief.md` → run `idea` first. Stop.
2. The brief says no UI (CLI, API, library) → there is no direction to find. Say so and stop.
3. Called for one piece (a view, a section, a control, an empty state, "ideas for X"), usually by `design` at a gap → **One piece**.
4. Otherwise → **Identity**. With a `DESIGN.md` already, this is a rebrand. Say that `DESIGN.md` stays as it is until `design` approves a new one.

## Folder

Everything goes in `design-exploration/<slug>/`: `candidates.tsv` and `picker.html` (and `-2` for round 2) when there is a search, then `board.md`, `refs/`, `moodboard.html`, `library.json`, `direction.md`. The first pass is `identity/`. One piece uses its own slug (`pricing`, `empty-state`). If the folder exists, use `<slug>-2`. Two explorations never share a folder.

On the first write, add `design-exploration/` to `.gitignore` if it is missing, and say why in one line: it is a working folder for inspiration, not part of the product. References, their links, their authors and their shots stay in this folder and in chat. Nothing the product keeps (`DESIGN.md`, Figma, code, commits) ever names one. If `git ls-files design-exploration` already lists files, say so and leave `git rm -r --cached design-exploration` to them.

## Identity

### 1. Three questions, one round

Read `docs/brief.md` first. It gives the subject, the people, the surface (site or app), the key screens, the position, and the identity nouns. Do not ask for any of that again. Send one message and wait. Do not search in that turn. These questions are how they steer the look, so always ask them, however the run was set up. Only they can say "go".

```
Before I look, three questions. Skip any with "go" and I'll decide.

1. How should <product> feel, and never feel? Any apps, sites, brands, books or places you love for this?
2. Do you already have a moodboard, or a few pictures you like? A Figma link (file, page or section), a folder of images, screenshots or links. A moodboard, I'll work from. A few pictures steer the search.
3. No moodboard, or a small one: where should I look, and how many should I keep? [x] <source> — <what it gives> … [ ] your own. Default about 100, across <the parts>. You'll pick from a wider pool first.
```

A moodboard → **Their moodboard**, below, then step 4. Skip steps 2 and 3. A few pictures or links, not a board → seeds for the search, below.

Default sources:

- **App:** popular Dribbble. No award galleries.
- **Site:** Awwwards, this year's and older winners. Recent. Dribbble for screens. Dark Mode Design only when the feel is dark. siteinspire is offered unticked: it refuses scripts, so it cannot be in the picker.
- **Imagery** (Wikimedia Commons): only when the brief's key screens need pictures.

Each of these was checked to work with this skill's scripts, without a login (2026-11-03). Do not add a source that has not been.

**The parts.** The pool covers the whole product, not its first screen. For a site: home, navigation, index, case study, article, blog, photography, motion. Drop a part the brief has no use for, and add one it needs. For an app: the brief's key screens, its navigation, and motion. Every keep has one part, its `part`.

Anything skipped is yours to decide: say what you chose in one line, then search. A Figma link to the product's own screens means the look already exists: say so, and offer `design` instead. A Figma link to a board of other people's work is a moodboard. If their answers contradict the brief, that is `grilling`, not a second round.

A picture they gave is a **seed**: a picker row with source `seed`, which starts liked, then a card with `link: none (shared in chat)` or its URL, never dropped. Seeds steer the queries ("more like this").

### Their moodboard

Their board already holds their taste, so it is the pool. A rich board needs no search and no picker. A thin one is topped up with a search sized to what it lacks.

**Read it.** A folder: open every image. Links: capture each page (sources.md has the options). Figma, a section at a time:

- `create_session` with the file key first.
- **Find the sections.** A section link: start there. A page or file link: `get_metadata` on the page. A board of hundreds of cards returns about 100K tokens, saved to a file: read only its section lines from it (name, id, size), never the whole dump into context.
- **Read the cards.** Metadata gives frames and names, not the text on them. `get_screenshot` a section with `maxDimension` set to its longer side, so it renders at full size, and open it in crops of about 1100 px tall: a whole section opened at once is shrunk until its captions blur.

**Keep** every card that fits the brief, however many: the board is their taste, and the keep never cuts it to a number. Drop only what plainly fails (off-topic, broken, a duplicate), and say how many went and why in one line. Marks they already made on the board (a star, a tag, a "yes" section) are their picks: they stay, and are named on the families board.

Save each keep's original to `refs/<name>.<format>`. For Figma, `download_assets` returns `rawImages`, the original uploads at full size, GIFs included, up to 20 from anywhere under the node: call it on the card, or on a frame holding up to 20 cards when the result shows which card each image belongs to. A card's render on the board is a thumbnail, so it is never what is saved.

**Motion** is judged from frames. For a GIF, write a page in the slug folder that shows it at its own size, and record it: `capture.mjs "file://…/<name>.html" --out design-exploration/<slug>/refs/<name>-frames --frames 16 --every 250`. A moving reference with no playable source counts for its layout only. Say so.

**Is it enough?** After the keep, check what it can carry:

- **A family to deal from:** at least six keeps that look alike. Step 6 needs that many.
- **The product's parts:** every key screen and part in the brief has at least one fit: a reference that shows that kind of screen, or one that clearly carries over to it.

Both met → go on, and say so in one line ("Your board covers it: 34 fits, every part, four families."). Otherwise say what it lacks in up to three lines, with what it does hold ("12 cards, all print posters: one family, nothing for navigation or a data screen"), and offer a search sized to the gap. Then wait.

> Search for these, or go with what your board has?

- **A gap:** search only what is missing (the parts it lacks, or more that look like their board), a pool of 20 to 60 new candidates plus their board's fits as seeds, one picker round as in step 3. Their likes are opened at full size and captured as in step 3, then join the keep.
- **Too thin to make even one family:** the full search, steps 2 and 3, with their board's fits as seeds.
- **"Go":** work with the board. What it lacks goes under `Missing`, and a key screen that depends on it gets **One piece** after they choose.

Then step 4.

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

**Check the pool before the picker.** Look at every candidate on contact sheets, not one by one (`contact-sheet.mjs candidates.tsv --out <scratch>/sheets`, about 36 a sheet). Drop only what is not a candidate: not a screen (an illustration, packaging, a logo sheet, a poster, merch), a broken or blank thumbnail, an exact twin. Never drop for taste or for a look: a gradient, a typeface, a colour, a style the rules call a tell. Say how many went and why in one line.

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

**The likes are the keep.** Open each at full size and drop what fails sources.md, naming each drop and why in one line. Keep up to the number they chose (default about 100), spread across the parts: later-round likes and the clearest patterns first. A part with few likes stays small; never pad it. Nothing is kept from a thumbnail.

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

### 4. Sort into families

A family is a group of references that look alike: what a person would see from across a room. How large the type is against the pictures, how much of the screen is empty, how loud the colour is, what kind of face, how things sit together. It is not a part (a menu and an article can be one family) and not a subject.

**Read every keep into a profile first**, before any grouping, so every keep is compared on the same terms and none is sorted on a glance. A profile is everything known about one reference, kept in one local file, `profiles.json`, that the rest of the run reads from.

1. **`links.tsv`**: `name<TAB>link`, one row per keep with a live page.
2. **Measure**, the pictures and their pages in one browser run:

   ```
   node <skill>/scripts/measure.mjs design-exploration/<slug>/refs --links design-exploration/<slug>/links.tsv --profiles design-exploration/<slug>/profiles.json --jobs 6
   ```

   From the picture: `tone`, `empty`, `loud`, `busy`, and its **figure**, everything that is not the ground: how many colours, how colourful, how grey, how much is soft surface or hard edge, its palette, and a 6 by 4 grid of where things sit. That is what tells a photograph from a 3D render from chrome lettering, which share "the picture fills the screen". From the page: the largest type and where it sits, what the screen is made of (`media`: images, video, canvas, SVG), visible `gradient` and `pattern` with their CSS, the loaded fonts and the largest texts with their face, size, weight and tracking. Never one call per image: each call starts a browser. Never read the profiles into the chat: the scripts read them.
3. **Tag**, what numbers cannot see, in a fixed vocabulary:

   ```
   node <skill>/scripts/tag.mjs design-exploration/<slug>/profiles.json --sheets <scratch>/tag
   node <skill>/scripts/tag.mjs design-exploration/<slug>/profiles.json design-exploration/<slug>/tags.tsv
   ```

   The first makes sheets of 16 untagged keeps and prints the vocabulary: `picture` (photo, illustration, render, lettering, ui, product, pattern, collage, none), `photo`, `type`, `weight`, `layout`, `colour`, `surface`. Open each sheet and write one row per keep; two values join with `+`, the main one first; a short `note` of what is seen is optional. The second checks every word and merges the rows. Tag what is there, never what is good: a gradient, chrome or a default typeface is a tag like any other.

**Sort by the profiles, then by eye.**

```
node <skill>/scripts/families.mjs design-exploration/<slug>/profiles.json --board design-exploration/<slug>/board.md
```

It joins the closest keeps first and stops when the closest groups no longer look alike, so outliers stay apart and become strays. It prints one line per family, its tags' majority first ("lettering · edge-type · display | light · type 165–564px…"), names each pair of strays (the seed of a family the pool is too thin for) and each stray's nearest family, and writes a board skeleton with every keep in its family, most typical first. Each kind of trait counts once, weighted by how much it shows from across a room: light or dark most, then what the picture is and the layout, then type, colour and surface. `--spread` lower splits finer.

Then the eye, family by family, from contact sheets, never from each picture opened alone:

```
node <skill>/scripts/contact-sheet.mjs design-exploration/<slug>/families/f1.tsv --out <scratch>/f1 --contain
```

A family is seen from across a room, so thumbnails are the right size for this step. Contact sheets are also where broken captures show (blank, a loader, an error page): `families.mjs` names the near-blank ones, but only the sheet confirms them. Split a family that holds two looks, merge two that are one, move a stray, and name each. Say in the family's line what the eye changed. Full size is for step 6, the anchor and the donors.

**A family has a name a person would say.** Name each one for what is seen ("huge lettering is the picture", "dark app page, headline centred"). If the only honest name is a number ("dark, all picture", "light, small type"), it is a bin, not a family: the numbers agree and the pictures do not. Break it up: each member to the family it looks like, or to the strays. Look hardest at a family whose tags disagree on picture or layout.

**Strays are not noise.** They are often the most distinctive keeps on the board, the ones a designer looks at first: place each by eye, into a family, as a pair's family, or as the seed of one, and never drop one for being a stray.

- **As many families as there are looks.** The count comes from the pool, not from a fixed number: a varied board of a thousand can hold twenty, a tight board of thirty can hold two. `families.mjs` splits while a family spreads wide; `--spread` lower splits finer. Never merge two looks to reach a number, and never split one look on a detail.
- **Named for what is seen**, in plain words a person outside design would use, with one line saying what its members share. Never a reference's name or a style label.
- **Every keep is in exactly one family.** A keep that was saved for one detail (a control, a mark, a single card) and shows no whole look goes in a last group, `One detail`.
- **Do not force a fit.** A keep that belongs nowhere is its own small family or goes under `One detail`. A family under six is small: it is shown, but cannot be dealt from alone.
- **Check the spread.** Write each family's traits as ranges. A family wide on one trait (light and dark together, a scale of 2 beside one of 9) is two families or has a stray: split it, move the stray, or say in its line why it still holds.

Write `board.md`: a few header lines, then one card per keep.

```
Asked: <feel, never feel, loves, or none>
Sources: <their moodboard (what it was), or what was searched, and any skip: "Awwwards: no fit">
Picked: <the likes, by id, and what they share; leave out with their own moodboard>
Noes: <what the noes share, or none>
Missing: <what the pool lacks, or none>
Families: <each family, what its members share, its measured ranges ("light · empty 55–70% · loud under 5% · scale 4–7"), and how many keeps it has>

### <name>
- link: <the page a person can open, or "none (shared in chat)">
- topic: <its family>
- part: <the part of the product it shows: home, navigation, index, case study, article, blog, photography, motion, or a key screen>
- shot: design-exploration/<slug>/refs/<file>
- frames: <for motion: the folder --frames wrote; leave out otherwise>
- pattern: <what it adds to its family, about six words: an arrangement, a kind of picture, a way of using colour>
- measured: <its traits from measure.mjs, one line: "light · empty 64% · loud 2% · scale 6.5 · pictures 40% · margin 3% · radius 0px">
- why: <why it fits this brief, one line>
```

`pattern` is the tile's caption, so write it as a pattern ("one column, the date as the spine"), never as their brand ("Linear's purple").

### 5. They mark the anchor and the donors

**A big pool is chosen in two steps.** Over about 60 keeps or 8 families, one board to mark is too long to read. First the families board: each family as its six most typical, its size and its ranges, with Take and a note.

```
node <skill>/scripts/moodboard.mjs design-exploration/<slug>/board.md --overview 6 --out design-exploration/<slug>/families.html
```

> Open the families board. Take the families you want to see in full, any number, and note one that looks like two or belongs with another. Then paste the copy-out here.

Apply their notes (a split, a merge), then write the board of the taken families only, and go on below. A small board skips the first step.

```
node <skill>/scripts/moodboard.mjs design-exploration/<slug>/board.md --out design-exploration/<slug>/moodboard.html
```

The page groups the keeps by family. Each tile has Lead, Like and No, and a note.

Look at it yourself first, one family at a time so every tile stays readable (`capture.mjs "file://$PWD/design-exploration/<slug>/moodboard.html" --out <scratch>/moodboard-<family>.jpg --clip-selector "#t-<family>"`, the family's name in lowercase with dashes). A family whose tiles do not look alike side by side is wrong: regroup and run it again. Fix a wrong caption or a missing picture too. Then say where it is, name each family in one line, say which ones fit what they asked for and why, and ask one line:

> Open the board. In the family you want, Lead the one reference that should set the tone, Like the ones I should draw from, and No what doesn't belong. Add a note where you have one, then paste the copy-out here.

- **The lead is the anchor.** Its arrangement is sure to be among the screens `design` shows. It is never followed whole.
- **The likes are the donors.** Only the anchor and the donors are read into the library.
- **The marks are theirs.** Say which families fit; never pick the family, the anchor or the donors for them. Only on "you choose": the family closest to their words for feel, its member closest to the brief as anchor, the rest of the family as donors, and say so.
- **Leads in two families** are two looks: each gets its own library and its own round of screens. Never merge two families into one library. Mixed families are what make a screen look assembled. Ask which comes first.

- **A note "move to <family>"** moves that tile. Move it, run the board again, and say what moved. Their grouping wins over the numbers.

Read the marks back in up to three lines (the family, the anchor, what the donors share, what the noes share) and wait for their yes.

**Enough to deal from?** The anchor and the donors together need to be six or more, because every screen draws on three different references. Fewer: say so, and offer a search for more that look like them (a pool of 20 to 60, one picker round as in step 3, the likes joining the donors). On "go", continue with what there is and say that the round of screens will be smaller.

### 6. Read the library

The library is what the anchor and the donors use, written down so `design` can deal from it. It has what they share, the family, and five lists that are dealt. Reading it is measuring, not judging: nothing here is a choice.

```
{
  "anchor": "<the anchor's card name>",
  "family":       { "tone": "light", "empty": "55–70%", "loud": "under 5%", "scale": "4–7", "pictures": "30–50%", "margin": "2–4%", "radius": "0px", "images": "<how pictures are treated: crop, bleed, colour, grain>", "edges": "<rules, borders, or none>", "density": "<one sentence: how much sits on the first screen>", "from": ["<card name>"] },
  "arrangements": [{ "id": "<a short word>", "what": "<one sentence>", "from": ["<card name>"] }],
  "navigation":   [{ "id": "…", "what": "<one sentence>", "from": ["…"] }],
  "type":         [{ "id": "…", "what": "<the kind of face, in plain words>", "face": "<a face the product can use>", "by": "page | eye", "weight": 400, "case": "none | uppercase | lowercase", "italic": true, "tracking": "-0.02em", "size": "<the display size at 1440 wide, or null>", "body": { "face": "<the face its running text uses>", "size": "16px", "leading": "1.5" }, "from": ["…"] }],
  "grounds":      [{ "id": "…", "ground": "#…", "panel": "#… or null", "ink": "#…", "gradient": "<the CSS as measured, or null>", "pattern": "<the CSS as measured, or null>", "from": ["…"] }],
  "accents":      [{ "id": "…", "colour": "#… or null", "device": "<what carries it>", "from": ["…"] }]
}
```

Open each reference at full size again. Its measurements are already in `profiles.json`: the picture's colours and palette, and from the live page its ground, the fonts it loaded, its largest texts with face, size, weight, tracking and case, its gradients and patterns. Read them from there; measure again only a page that has changed (`measure.mjs <its live link>` gives every text on the first screen). A size or a weight read from a picture is a guess, and the guess is often far off.

- **Family.** What the anchor and every donor share: their measured traits as ranges, and in words what numbers cannot carry: how pictures are treated, edges, density. A trait they do not share is left out, never averaged. The family is not dealt: every screen gets it, so it is what makes eight different screens one look.
- **Arrangements.** One per reference: where the title, the pictures and the small text sit on the first screen, and how they relate (what overlaps what, what is centred, what runs off an edge, how much is left empty). One sentence, complete enough to build from with the picture closed. It carries no content, no colour and no typeface: those are other lists.
- **Navigation.** Where the name and the links sit, how many are shown, and what rides with them (a caption, a button, a count). One sentence, the same rules.
- **Type.** The kind of face in plain words, and `face`: a face the product can use, free to license or one they own. `by` is `page` when the reference's own face was read from its page and can be used, `eye` when it is the nearest match judged from the picture. Weight, case, italic and tracking as measured, or as seen when there is only a picture. `size` is the display size from the page, `null` with only a picture. `body` is the face, size and leading its running text uses, so a display face stays with the body face it was paired with.
- **Grounds.** The ground colour, the ink, and `panel` when the design sits as a panel on a surround of another colour. `gradient` and `pattern` when the ground carries one: `measure.mjs` lists them as written (`gradients`, `patterns`), with how much of the screen each covers. Measured, never judged by eye.
- **Record, never judge.** A gradient, a glow, a pattern, a typeface the rules list as a tell: if the references use it, it goes in the library like any colour. A family may rely on it, and choosing is theirs.
- **Accents.** The colour and the device that carries it: a shape, the letters themselves, a panel. Measured. When some of them use no accent, that is an entry too, with `colour: null`.
- **`from` on every entry:** the card names of the references that show it. `design` needs it to keep any one reference from supplying a whole screen.
- **Merge only twins.** Two references that do the same thing are one entry with both in `from`. An entry stretched to cover many references leaves nothing to deal: when in doubt, keep them apart.
- **Ids are plain words** for the thing ("split", "arch", "condensed"), never a reference's name.

The library stays in `design-exploration/`. It names references, so nothing the product keeps ever copies from it by name.

### 7. Write `direction.md`

From their answers. Short: it is read by `design`, not by a client.

```
# Direction: <product>

Proposal, not official. design deals screens from the library. Only an approved prototype becomes DESIGN.md.

- subject: <what the first screen must say, in one sentence, in the brief's own words, and the one thing it must show: the brief's `remembered for`>
- feel: <their words for feel and never feel>
- voice: <how it talks: the brief's personality, and one sample line in that voice>
- leave: <what stays behind: every reference's name and content, what the brief's `against` looks like, what their noes share, and whatever they said feels wrong>
- family: <its name> — <what its members share>
- library: design-exploration/<slug>/library.json

## References
- anchor: <card> — <link> — <shot, or frames for motion>
- donors: <cards> — <links> — <shots or frames>

## Other parts
### <part>
- <keeps that show this part, the chosen family's first> — <links> — <shots or frames>
```

- **The subject is the brief's, not a reference's.** It is what makes the result this product: the same library dealt for another subject gives another design.
- **Other parts** lists the keeps that show a part beyond the first screen (a menu open, an article, a data screen), so `design` has them when it reaches that screen. A part nothing shows is left out, and named under `Missing` on the board.
- **Notes count.** A tile note is about that reference: it goes into `leave`, or into the library entry it speaks of.
- **No values here.** No hex, no font name, no size in `direction.md`. The measured values live in `library.json`, as a record of what the references use.

Then say the direction in chat in four lines (subject, family, anchor and donors, leave), and end with one question. Wait for the answer, however the run was set up: the direction is theirs to correct before anything is built on it.

> Change anything, or take this into design?

Yes → load `design`. No → stop. The folder stays on this machine.

## One piece

Usually called from `design` when a key screen has a gap no reference covers. Same card shape, same moodboard, its own slug.

1. Read `DESIGN.md` if it exists, and the brief. If they gave a moodboard, look there first: a fit on their board beats a search. They are the base: the piece fits the colour, type and voice already chosen and never changes them.
2. Ask once, then wait, unless the caller already said what is needed:

   ```
   Any style or requirements for this? Optional.

   A few ways to search:
   - <a form you can type into a gallery: "a bar that fills once">
   - <…>
   ```

3. Build a pool of 20 to 40. Include the same piece in other subjects. For a gap software has not solved, search outside software for the same form.
4. One picker round, no round 2. Keep up to the number asked (default 8 for one piece) from their likes, opened at full size. Record frames for a piece that moves.
5. Write `design-exploration/<slug>/board.md` (the topic is the piece), run the moodboard, and ask them to mark it: Lead the one that should set the tone, Like what belongs, No what feels wrong.
6. Write a short `direction.md` for the piece: `patterns` (what inspires, each with its reference), `leave`, and the references, the lead first. Hand back to `design`.

## Do not

- Choose a colour, a typeface, a size or a spacing value, or propose a combination. The library records what references use. Write `DESIGN.md`. Code or lay out a page.
- Pick the family, the anchor or the donors for them, or rank the references, unless they say "you choose". Merge two families into one library.
- Write a size, a weight or a colour into the library from looking at a picture when it can be measured. Sort keeps into families before every keep is measured.
- Measure one image per call, open every keep at full size to sort it, or read a big pool's traits into the chat. One browser for the folder, contact sheets for the eye, `families.mjs` for the numbers.
- Cut their moodboard to a number, or force its families to one.
- Search past their moodboard when it is enough, or search for its gaps before they say yes. Search before the three questions are answered, answer them yourself, or ask them a second round of questions. Run a third picker round.
- Cut the pool for taste before they pick. Pad the keep by lowering the filter. Save a thumbnail as a shot, or read a reference into the library from one.
- Screenshot a source's listing or search page, or a candidate you are not keeping. Never stitch screenshots or frames into one picture.
- Judge motion from a still.
- Name a reference in `direction.md`'s subject, or in a library entry's `id` or `what`. Name the thing it does.
- Put notes or skill feedback under `design-exploration/`. Use the chat.
