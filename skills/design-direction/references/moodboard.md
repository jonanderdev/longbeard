# Their moodboard

From `design-direction`, when they gave a moodboard at the brief round.

Their board already holds their taste, so it is the pool. A rich board needs no search and no picker. A thin one is topped up with a search sized to what it lacks.

**Read it.** A folder: open every image. Links: capture each page (sources.md has the options). Figma, a section at a time, and only what changed since the board was last read:

- `create_session` with the file key first.
- **Find the sections.** A section link: start there. A page or file link: `get_metadata` on the page. A board of hundreds of cards returns about 100K tokens, saved to a file: never read it into context. The script reads it:

  ```
  node <skill>/scripts/figma-board.mjs <the saved metadata> --board <fileKey>:<nodeId>
  ```

  It lists each section (id, name, size, cards) as `new`, `same` or `changed` since the last read, and the cards to read: new ones, and ones renamed or resized. A board read before: `--reuse design-exploration/<slug>/refs` copies back the keeps of every unchanged card, and lists the ones dropped before with why. Read only what is left. Say it in one line ("Board read on 2026-11-02: 61 cards as they were, 3 new to read."). They say the pictures changed inside cards: `--fresh`.
- **Say where you are.** A line after each section ("Section 3 of 7, Type: 18 cards, 15 kept. Motion next."), and one after each download batch ("Saved 40 of 61 originals").
- **Read the cards.** Metadata gives frames and names, not the text on them. `get_screenshot` a section that has cards to read, with `maxDimension` set to its longer side, so it renders at full size, and open it in crops of about 1100 px tall: a whole section opened at once is shrunk until its captions blur.
- **Remember the read.** Write `design-exploration/<slug>/cards.tsv` as you go, one row per card read: `card id<TAB>the file it was saved to, or drop<TAB>why`. Then `figma-board.mjs <the saved metadata> --board <fileKey>:<nodeId> --done design-exploration/<slug>/cards.tsv`, so the next run reads only what changes.

**Keep** every card that fits the brief, however many: the board is their taste, and the keep never cuts it to a number. Drop only what plainly fails (off-topic, broken, a duplicate), and say how many went and why in one line. Marks they already made on the board (a star, a tag, a "yes" section) are their picks: they stay, and are named on the families board.

Save each keep's original to `refs/<name>.<format>`. For Figma, `download_assets` returns `rawImages`, the original uploads at full size, GIFs included, up to 20 from anywhere under the node: call it on the card, or on a frame holding up to 20 cards when the result shows which card each image belongs to. A card's render on the board is a thumbnail, so it is never what is saved.

**Motion** is judged from frames. For a GIF, write a page in the slug folder that shows it at its own size, and record it: `capture.mjs "file://…/<name>.html" --out design-exploration/<slug>/refs/<name>-frames --frames 16 --every 250`. A moving reference with no playable source counts for its layout only. Say so.

**Is it enough?** After the keep, check what it can carry:

- **A family to deal from:** at least six keeps that look alike. Step 6 of `design-direction` needs that many.
- **The product's parts:** every key screen and part in the brief has at least one fit: a reference that shows that kind of screen, or one that clearly carries over to it.

Both met → go on, and say so in one line ("Your board covers it: 34 fits, every part, four families."). Otherwise say what it lacks in up to three lines, with what it does hold ("12 cards, all print posters: one family, nothing for navigation or a data screen"), and offer a search sized to the gap. Then wait.

> Search for these, or go with what your board has?

- **A gap:** search only what is missing (the parts it lacks, or more that look like their board), a pool of 20 to 60 new candidates plus their board's fits as seeds, one picker round as in [search.md](search.md). Their likes are opened at full size and captured as in [search.md](search.md), then join the keep.
- **Too thin to make even one family:** the full search ([search.md](search.md)), with their board's fits as seeds.
- **"Go":** work with the board. What it lacks goes under `Missing`, and a key screen that depends on it gets **One piece** after they choose.

Then step 4.

What was measured or tagged before is not done again: `measure.mjs` and `tag.mjs` keep every result in `design-exploration/.cache` by the picture's bytes, so a board read in an earlier exploration costs nothing to measure or tag.
