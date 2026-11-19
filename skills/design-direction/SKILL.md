---
name: design-direction
description: >
  Find the direction for a product's look from what they like and from real
  references. Their own moodboard (a Figma board, a folder, links) is the pool.
  Without one, or with one too thin: a wide pool from every source they
  choose, which they mark like or no on a picker page, and a sharper second
  search from those picks. Every reference is read into a profile (measured,
  and tagged for what its picture is), and the pool is sorted on the
  profiles into families that look alike. They take families, and on one
  board mark, in the family they want, one anchor and the donors. Those are
  read into a library: what the family shares, how the screens are arranged,
  how they do navigation, what type, grounds and accents they use, each
  measured and none chosen, shown to them before the direction is written. Runs after docs/brief.md exists and the brief has a UI, or
  when design hits a gap and needs references for one piece. Writes
  design-exploration/<slug>/direction.md and library.json, a proposal, then
  offers to take it into design.
---

# Design direction

Two files come out, both in `design-exploration/<slug>/`: `direction.md`, a proposal for what the product's look should say and sound like, and `library.json`, what their chosen references use. They are what `design` explores from, not its result. Neither is official. `design` deals screens from the library, and only an approved prototype becomes `DESIGN.md`.

Direction is the inspiration step: it gathers good designs, sorts them, and reads the ones they choose. It records what references use and chooses nothing: no colour, typeface, size or spacing value is picked here, no combination is proposed, and no reference is ranked. Choosing happens in `design`, by them, on rendered screens. Direction never writes `DESIGN.md`.

## Gate

Look at the repo. Do not ask what is there.

1. No `docs/brief.md` → run `idea` first. Stop.
2. The brief says no UI (CLI, API, library) → there is no direction to find. Say so and stop.
3. Called for one piece (a view, a section, a control, an empty state, "ideas for X"), usually by `design` at a gap → **One piece**.
4. Otherwise → **Identity**. With a `DESIGN.md` already, this is a rebrand. Say that `DESIGN.md` stays as it is until `design` approves a new one.

## Folder

Everything goes in `design-exploration/<slug>/`: `candidates.tsv` and `picker.html` (and `-2` for round 2) when there is a search, then `board.md`, `refs/`, `moodboard.html`, `library.json`, `direction.md`. The first pass is `identity/`. One piece uses its own slug (`pricing`, `empty-state`). A new exploration whose folder exists uses `<slug>-2`. Two explorations never share a folder. `design-exploration/.cache/` is shared by all of them: what was measured, tagged and read from a Figma board, so none of it is done twice.

Picking up, or a folder already there: `node <skill>/scripts/status.mjs` says where each exploration stopped, from its files. Go on from there; do not start over or reread what is saved.

**Short messages.** Every message is answerable in one read: where this is in the flow, what to open, one question. Up to about six lines plus paths; no tables or explanations of the method unless they ask ("say *details* for more"). Each ask says what is chosen now and what comes later.

**Keep them posted.** Searching and reading a moodboard take a while, and silence reads as stuck. Send a short line at each milestone, and at least every few minutes of work: what is done, with numbers, and what comes next ("Dribbble done: 64 candidates. Awwwards next.", "Section 3 of 7 read: 41 kept so far.", "Measuring 120 references, about 3 minutes."). Before a step that takes long, say what it is and about how long. One line each, no narration of every click, and never a question: they only answer at the asks.

On the first write, add `design-exploration/` to `.gitignore` if it is missing, and say why in one line: it is a working folder for inspiration, not part of the product. References, their links, their authors and their shots stay in this folder and in chat. Nothing the product keeps (`DESIGN.md`, Figma, code, commits) ever names one. If `git ls-files design-exploration` already lists files, say so and leave `git rm -r --cached design-exploration` to them.

## Identity

### 1. The brief round: one message of questions

Read `docs/brief.md` first. It gives the subject, the people, the surface (site or app), the key screens, the position, and the identity nouns. Do not ask for any of that again. Ask what a design studio asks a client before it looks for anything: what the first screen must do, the personality, who to stand apart from, what is already fixed, and where to look. Send one message and wait. Do not search in that turn. These questions are how they steer, so always ask them, however the run was set up. Only they can say "go".

Every question carries a suggested answer in brackets, drawn from the brief, so a "yes" settles it. The suggestions are the agent's best reading of the brief, never a look: no layout, colour, typeface or style name in them.

```
Before I look, a few questions. Each has my suggestion in brackets: "yes" takes it, "go" skips the rest and I'll decide.

1. In five seconds on the first screen, what should someone think, and what should they do (sign up, buy, book, read on)? [<from the brief's remembered for and its first flow>]
2. Personality, 1 to 5 on each (3 is the middle, skip any you don't mind):
   quiet 1 · · · 5 loud
   type-led 1 · · · 5 picture-led
   plain 1 · · · 5 rich
   warm 1 · · · 5 cool
   [<a suggestion for each, or "no lean">]
3. How should <product> feel, and never feel? Any apps, sites, brands, books or places you love for this? Anything you tried before and didn't like, and why?
4. Who should it stand apart from: competitors, or products it could be mistaken for? And should it fit in with them or stand out? [<the alternatives the brief names>]
5. What is already fixed? Colours, typefaces or a logo you own and must use, or refuse; light, dark or both; your own pictures (photographs, illustrations), or none yet; and the content's limits: languages, how much there is, an accessibility level to meet. [<what the brief or the repo shows>]
6. Do you already have a moodboard, or a few pictures you like? A Figma link (file, page or section), a folder of images, screenshots or links. A moodboard, I'll work from, and I'll check it has a few from <product>'s own world; if not, I'll offer a small sample. A few pictures steer the search.
   No moodboard, or a small one: where should I look, and how many should I keep? [x] <source> — <what it gives> … [ ] your own. Default about 100, across <the parts>. You'll pick from a wider pool first.

Anyone else who has to say yes? Worth showing them the families and the first screens as we go, not only the end.
```

Then read the answers back in one line before anything else ("Leads with <takeaway>; quiet, picture-led, warm; apart from <X>; fixed: <…>; from your moodboard."), and go on. A correction to the read-back is one more line, not a second round.

What each answer does. None of them chooses the look: they steer the search, they are hints on the families, and they are kept for design.

- **The takeaway** is the subject's second half in `direction.md`, and the line every dealt screen is built to say. The action is the one thing on the first screen that is always there and never fights the headline.
- **The sliders** go to `families.mjs --sliders "loud=2,picture=4,rich=2,cool=2"` (the numbers they gave; leave out a skipped one). Each family is placed on them from what is measured and tagged, and its line says whether it sits near what they asked or is off on one. That is said on the families board as a hint, like "never feel": no family is hidden or dropped for it. They also steer the search queries ("photographic", "type-only", "monochrome").
- **Feel and never feel**, and what they tried and did not like, steer the search and are hinted on the families. A rejected design goes into `leave`.
- **Stand apart from:** open each one's site and keep its first screen as a reference card marked `apart`, in no family. It is not a reference to explore from: on the board it shows what the category looks like. A family that looks like it is said so, as a hint, read by their answer: "fits in with <X>" for fit in, "close to <X>" for stand out. It goes into `leave` in `direction.md`.
- **What is fixed** goes into `direction.md` as `fixed`, and into the library when it is read: a refusal removes matching entries, something they own is added with `"from": ["theirs"]`, light or dark removes the grounds that do not fit. No pictures of their own rules nothing out (stand-ins are made in design), but say which families rely on photographs they do not have. The content's limits are kept for design: the longest real strings in every language go into the grid page's content, and the accessibility level into the contrast checks.
- **Others who decide** are named in the read-back. At the families board and the first grid, remind them in one line that this is a good moment to show those people.

A moodboard → read [moodboard.md](references/moodboard.md) and follow it, then step 4. Skip steps 2 and 3. A few pictures or links, not a board → seeds for the search ([search.md](references/search.md)).

**The parts.** The pool covers the whole product, not its first screen. For a site: home, navigation, index, case study, article, blog, photography, motion. Drop a part the brief has no use for, and add one it needs. For an app: the brief's key screens, its navigation, and motion. Every keep has one part, its `part`.

Anything skipped is yours to decide: say what you chose in one line, then search. A Figma link to the product's own screens means the look already exists: say so, and offer `design` instead. A Figma link to a board of other people's work is a moodboard. If their answers contradict the brief, that is `grilling`, not a second round.

### 2 and 3. Search and pick

No moodboard, or one too thin: read [search.md](references/search.md) and follow it. It holds the sources, the wide search, the picker and its two rounds, and how the likes are captured. Then step 4.

### 4. Sort into families

A family is a group of references that look alike: what a person would see from across a room. How large the type is against the pictures, how much of the screen is empty, how loud the colour is, what kind of face, how things sit together. It is not a part (a menu and an article can be one family) and not a subject.

**Read every keep into a profile first**, before any grouping, so every keep is compared on the same terms and none is sorted on a glance. A profile is everything known about one reference, kept in one local file, `profiles.json`, that the rest of the run reads from.

1. **`links.tsv`**: `name<TAB>link`, one row per keep with a live page.
2. **Measure**, the pictures and their pages in one browser run:

   ```
   node <skill>/scripts/measure.mjs design-exploration/<slug>/refs --links design-exploration/<slug>/links.tsv --profiles design-exploration/<slug>/profiles.json --jobs 6
   ```

   From the picture: `tone`, `empty`, `loud`, `busy`, and its **figure**, everything that is not the ground: how many colours, how colourful, how grey, how much is soft surface or hard edge, its palette, and a 6 by 4 grid of where things sit. That is what tells a photograph from a 3D render from chrome lettering, which share "the picture fills the screen". From the page: the largest type and where it sits, what the screen is made of (`media`: images, video, canvas, SVG), how many icons (small pictures and drawings), how much is solid colour blocks, visible `gradient` and `pattern` with their CSS, the loaded fonts and the largest texts with their face, size, weight and tracking. Never one call per image: each call starts a browser. Never read the profiles into the chat: the scripts read them. Nothing is measured twice: a picture measured in any exploration, or a page in the last 14 days, comes from `design-exploration/.cache`, and the first line of stderr says how many. A page that changed: `--fresh`.
3. **Tag**, what numbers cannot see, in a fixed vocabulary:

   ```
   node <skill>/scripts/tag.mjs design-exploration/<slug>/profiles.json --sheets <scratch>/tag
   node <skill>/scripts/tag.mjs design-exploration/<slug>/profiles.json design-exploration/<slug>/tags.tsv
   ```

   The first makes sheets of 16 untagged keeps and prints the vocabulary: `picture` (photo, illustration, render, lettering, ui, product, pattern, icon, shape, collage, none), `photo`, `type`, `weight`, `layout`, `colour`, `surface`, and `scale` (quiet, heading, large, huge): how big the largest type is, which a live page measures but a picture alone, a Figma board or a folder, only has from this tag. Open each sheet and write one row per keep; two values join with `+`, the main one first; a short `note` of what is seen is optional. The second checks every word and merges the rows. A picture tagged in an earlier exploration is tagged from the cache, with no sheet. Tag what is there, never what is good: a gradient, chrome or a default typeface is a tag like any other.

**Sort by the profiles, then by eye.**

```
node <skill>/scripts/families.mjs design-exploration/<slug>/profiles.json --board design-exploration/<slug>/board.md
```

It joins the closest keeps first and stops when the closest groups no longer look alike, so outliers stay apart and become strays. It prints one line per family, its tags' majority first ("lettering · edge-type · display | light · type 165–564px…"), names each pair of strays (the seed of a family the pool is too thin for) and each stray's nearest family, and writes a board skeleton with every keep in its family, most typical first. Each kind of trait gives a distance from 0 to 1, and two keeps are compared on the kinds both have. The measured traits hold about two thirds of the weight and the tags one third, so the eye steers the families without deciding them. A wide gap on any one of what is seen first (how empty, how loud, how big the type, where things sit, what the picture is, the layout) keeps two keeps apart, however much else agrees. Light or dark is not one of them: the same look on a dark and on a light ground is one family, and its library keeps both grounds for `design` to deal (they choose light, dark or both there). Tag every keep before sorting: an untagged one is compared on its numbers only and is named. Two shots of one site (the same link) are one reference, the others listed beside it as `also`. `--spread` lower splits finer; the first line says what a little lower and higher would give, so a grouping sitting on an edge shows.

Then the eye, family by family, from contact sheets, never from each picture opened alone:

```
node <skill>/scripts/contact-sheet.mjs design-exploration/<slug>/families/f1.tsv --out <scratch>/f1 --contain
```

A family is seen from across a room, so thumbnails are the right size for this step. Contact sheets are also where broken captures show (blank, a loader, an error page): `families.mjs` names the near-blank ones, and the live pages that may not be the real site (an error status, a maintenance or bot-check page, nothing on it): those are sorted on their picture alone, but only the sheet confirms either. A picture that is that wrong page too goes to `Dropped`, with the reason. Split a family that holds two looks, merge two that are one, move a stray, and name each. Say in the family's line what the eye changed. Full size is for step 6, the anchor and the donors.

**A family has a name a person would say.** Name each one for what is seen ("huge lettering is the picture", "dark app page, headline centred"). If the only honest name is a number ("dark, all picture", "light, small type"), it is a bin, not a family: the numbers agree and the pictures do not. Break it up: each member to the family it looks like, or to the strays. Look hardest at a family whose tags disagree on picture or layout.

**Strays are not noise.** They are often the most distinctive keeps on the board, the ones a designer looks at first: place each by eye, into a family, as a pair's family, or as the seed of one, and never drop one for being a stray.

- **As many families as there are looks.** The count comes from the pool, not from a fixed number: a varied board of a thousand can hold twenty, a tight board of thirty can hold two. `families.mjs` stops joining when the closest groups no longer look alike; `--spread` lower splits finer. Never merge two looks to reach a number, and never split one look on a detail.
- **Named for what is seen**, in plain words a person outside design would use, with one line saying what its members share. Never a reference's name or a style label.
- **Every keep is in exactly one family.** A keep that was saved for one detail (a control, a mark, a single card) and shows no whole look goes in a last group, `One detail`.
- **Do not force a fit.** A keep that belongs nowhere is its own small family or goes under `One detail`. A family under six is small: it is shown, but cannot be dealt from alone.
- **Check the spread.** Write each family's traits as ranges. A family wide on one trait (light and dark together, a scale of 2 beside one of 9) is two families or has a stray: split it, move the stray, or say in its line why it still holds.

Write `board.md`: a few header lines, then one card per keep.

```
Asked: <the takeaway, the sliders, feel and never feel, loves, apart from, fixed; or none>
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

The message, in this shape, one line per family:

> <n> families from your <n> references: <families.html>
> 1. <name> (<count>)<: a hint, if any: "near what you asked", "close to <apart from>", "needs photos you don't have">
> …
> Take the families you'd like to see in full. Which one becomes the look comes next, and colours and fonts much later.

What the eye changed from the numbers goes in that family's line in a few words, only when it changed something ("two merged"), so they can push back on the grouping. **What they chose against what they said.** The pool is what they chose (their moodboard) or liked (the picker), so `families.mjs --sliders` also places the whole pool on the sliders. Where the pool sits 1.5 or more from what they said, say it in the same message, as one question, never a verdict: "You said quiet (2); what you chose sits at loud (4). Should the families be read against what you said, or what you chose?" Their answer is the slider from then on. People often describe one look and pick another; this is where it is cheapest to find out.

The hints come from the sliders (`families.mjs --sliders`), their words, what they said it should never feel or stand apart from, and the pictures they have. A hint, never a cut: no family is hidden or dropped for it.

Pairs of strays are on the board as their own small groups (`Pair 1`, `Pair 2`): the seed of a look the pool holds only twice. Taking one is taking a family: offer a search for more like it before marking, since a family needs six to deal from.

> Open the families board. Take the families you want to see in full, any number, and note one that looks like two or belongs with another. Then paste the copy-out here.

Apply their notes (a split, a merge), then write the board of the taken families only, and go on below. A small board skips the first step, and its families are presented with the same lines.

**None taken** is an answer, not a dead end. Ask in one line what is missing, from what they see ("closer to the photographs, but warmer", "nothing like any of these"). Their words count like a note: offer a search sized to them (a pool of 20 to 60, one picker round as in [search.md](references/search.md)), its likes sorted into the families or into a new one, then the families board again.

```
node <skill>/scripts/moodboard.mjs design-exploration/<slug>/board.md --out design-exploration/<slug>/moodboard.html
```

The page groups the keeps by family. Each tile has Lead, Like and No, and a note.

Look at it yourself first, one family at a time so every tile stays readable (`capture.mjs "file://$PWD/design-exploration/<slug>/moodboard.html" --out <scratch>/moodboard-<family>.jpg --clip-selector "#t-<family>"`, the family's name in lowercase with dashes). A family whose tiles do not look alike side by side is wrong: regroup and run it again. Fix a wrong caption or a missing picture too. Then give its path, one line per family with its hint (only if the families board did not already), and ask:

> Open the board. In the family you want, Lead the one reference that should set the tone, Like the ones I should draw from, and No what doesn't belong. Add a note where you have one, then paste the copy-out here.

- **The lead is the anchor.** Its arrangement is sure to be among the screens `design` shows. It is never followed whole.
- **The likes are the donors.** Only the anchor and the donors are read into the library.
- **The marks are theirs.** Say which families fit; never pick the family, the anchor or the donors for them. Only on "you choose": the family closest to their words for feel, its member closest to the brief as anchor, the rest of the family as donors, and say so.
- **Leads in two families** are two looks: each gets its own library and its own round of screens, in its own folder. Ask which comes first: it stays in this folder; the second is read into `design-exploration/identity-2/` (its own `library.json` and `direction.md`, the same board's references). `design` works on one at a time, the one they named first, and offers the other after. Never merge two families into one library. Mixed families are what make a screen look assembled.
- **Likes outside the lead's family** are asked about, never dropped or folded in quietly: "You liked 3 in <family>: bring them in as donors (the screens will mix two looks), or keep them for later screens?" Brought in, they join the library and the read-back says the family is now mixed. Kept, they go under Other parts in `direction.md`, for the screens they show.

- **A note "move to <family>"** moves that tile. Move it, run the board again, and say what moved. Their grouping wins over the numbers.

Read the marks back in two lines (the family and the anchor; what the donors share) and wait for their yes.

**Enough to deal from?** The anchor and the donors together need to be six or more, because every screen draws on three different references. Fewer: say so, and offer a search for more that look like them (a pool of 20 to 60, one picker round as in [search.md](references/search.md), the likes joining the donors). On "go", continue with what there is and say that the round of screens will be smaller.

### 6. Read the library

The library is what the anchor and the donors use, written down so `design` can deal from it. It has what they share, the family, and five lists that are dealt. Reading it is measuring, not judging: nothing here is a choice.

Prefill it from the profiles, so the numbers are copied by the script, never by hand:

```
node <skill>/scripts/library.mjs design-exploration/<slug>/profiles.json --anchor <card> --donors <card>,<card> --out design-exploration/<slug>/library.json
```

Every measured value is in: the family's ranges, each reference's ground, ink, gradient and pattern, its largest type and its body text, its loud colours. What needs an eye is left as `WRITE: …`. Read [library.md](references/library.md) for the shape and the rules of each list, open each reference at full size, write those fields, merge twins (one entry, both in `from`), and run `library.mjs design-exploration/<slug>/library.json --check` until it passes: `deal.mjs` refuses a library with a `WRITE:` left. A size or weight read from a picture is a guess; for a reference with only a picture, its type is `by: eye`, with the nearest face the product can use.

The library stays in `design-exploration/`. It names references, so nothing the product keeps ever copies from it by name.

**The library and the direction are shown together, in one message**, after the direction is written (step 7): one stop, not two. The library part is what every screen will be dealt from, and reading it made choices they have not seen, so it is shown, short, one line per list. It is information, not a vote on each id: the choosing happens on rendered screens. They may drop an entry or name a swap if something reads wrong to them.

```
Library, from <anchor> and <n> donors: <what every screen will share, in plain words>.
<n> layouts, <n> navigations, <n> type pairs (<faces>), <n> grounds (<light n, dark n>), <n> accents.
Worth a look: <stand-in faces, a gradient or pattern, anything not read>, or leave the line out.
```

A drop removes the entry. A swap is a face, a ground or an accent they name: it goes in as `"from": ["theirs"]`.

### 7. Write `direction.md`

From their answers. Short: it is read by `design`, not by a client.

```
# Direction: <product>

Proposal, not official. design deals screens from the library. Only an approved prototype becomes DESIGN.md.

- subject: <what the first screen must say, in one sentence, in the brief's own words, and what someone should think or do in five seconds: their takeaway, or the brief's `remembered for`>
- feel: <their words for feel and never feel, and the sliders they gave: "quiet 2 · picture-led 4 · plain 2 · warm 2">
- apart from: <what it must not be mistaken for, with links, and whether to fit in with it or stand out; or none>
- fixed: <what they own and must use, what they refuse, light or dark or both, their pictures or none yet, the languages, how much content, the accessibility level>
- voice: <how it talks: the brief's personality, and one sample line in that voice>
- leave: <what stays behind: every reference's name and content, what the brief's `against` and what they stand apart from look like, what their noes share, and whatever they said feels wrong>
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
- **Other parts** lists the keeps that show a part beyond the first screen (a menu open, an article, a data screen), from any family, the chosen family's first, so `design` can prototype each screen from them. By then the look is fixed, so a reference from another family only lends how a screen is arranged. A part nothing shows is left out, and named under `Missing` on the board.
- **Notes count.** A tile note is about that reference: it goes into `leave`, or into the library entry it speaks of.
- **No values here.** No hex, no font name, no size in `direction.md`. The measured values live in `library.json`, as a record of what the references use.

Then say the direction in chat in two lines (the subject; the family, with what it leaves behind), the library readout from step 6 under it, and the full file's path for the rest. End with one question. Wait for the answer, however the run was set up: the direction and what the screens are dealt from are theirs to correct before anything is built on them.

> Change anything (the direction, or an entry in the library), or take this into design?

Yes → say in one line that this is a good point for a fresh session ("Everything is saved. A fresh session works better from here: start one and say *continue design*."), then load `design` if they go on here. No → stop. The folder stays on this machine.

## One piece

Called for one piece (a view, a section, a control, an empty state), usually by `design` at a gap: read [one-piece.md](references/one-piece.md) and follow it.

## Do not

- Choose a colour, a typeface, a size or a spacing value, or propose a combination. The library records what references use. Write `DESIGN.md`. Code or lay out a page.
- Pick the family, the anchor or the donors for them, or rank the references, unless they say "you choose". Merge two families into one library.
- Take the direction into design before they have seen it with the library readout. Cut their likes to a number, or drop one without putting it in `Dropped`. Hide or drop a family because it looks like their "never feel": say so, and let them decide. Fold likes from another family into the library without asking.
- Write a size, a weight or a colour into the library from looking at a picture when it can be measured. Sort keeps into families before every keep is measured.
- Measure one image per call, open every keep at full size to sort it, or read a big pool's traits into the chat. One browser for the folder, contact sheets for the eye, `families.mjs` for the numbers.
- Cut their moodboard to a number, or force its families to one.
- Search past their moodboard when it is enough, or search for its gaps before they say yes. Search before the brief round is answered, answer it yourself, or ask them a second round of questions. Put a look (a layout, a colour, a typeface, a style name) in a suggested answer. Run a third picker round.
- Cut the pool for taste before they pick. Pad the keep by lowering the filter. Save a thumbnail as a shot, or read a reference into the library from one.
- Screenshot a source's listing or search page, or a candidate you are not keeping. Never stitch screenshots or frames into one picture.
- Judge motion from a still.
- Name a reference in `direction.md`'s subject, or in a library entry's `id` or `what`. Name the thing it does.
- Put notes or skill feedback under `design-exploration/`. Use the chat.
