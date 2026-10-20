# The whole page, not the gallery, not only the hero

A reference is the design from top to bottom. The builder has to take how the **rest** of the page works, not only the first screen.

## Live sites — the script is for a keep

Open as many listings and score pages as the hunt asks. Do not scroll a candidate, and do not screenshot one. Run the script only on a URL you are keeping. That run is the only scroll. Do not screenshot the tab by hand. Do not stitch folds. Stitching is what repeats a sticky hero down the file. A file in `.design/refs/` that is not on the board gets deleted.

From the project root:

```
node <skill>/scripts/capture.mjs https://example.com --out .design/refs/<name>.jpg
```

The script opens Chrome, accepts a cookie button if it can, then scrolls a viewport at a time and pauses so pictures and reveals can finish. It pauses motion. It does not turn animations off, because that puts a revealed section back to blank. Then it unsticks `fixed`/`sticky` and takes **one** JPEG of the document. Node 22+. Chrome, Edge, or Chromium must be installed (`CHROME_PATH` if it is not in the usual place).

Then open the file. Write the hero and what is worth taking from it. A line you could have written without opening it does not count. Invalid if:

- the same band of the page appears twice (a stacked face, a repeated headline)
- a cookie dialog is still on it
- it is only the first screen of a long site
- most of the file is empty bands. Run the script once more. If the second file is still empty bands, the page is pinned or a canvas: write `coverage: fold`, keep a single viewport, and delete the tall file.

If it is invalid, delete it and run the script again. If the site will not scroll (WebGL, a locked canvas), say `coverage: fold` on the board, keep a **single** viewport shot, and find another scrolling site. Never glue folds by hand.

## Open the piece

- Prefer a **live site**. Click through from Awwwards / Godly / Land-book to the actual URL, then run the script on that URL.
- Dribbble: open the **shot page** (`/shots/...`). Capture the artwork image only, not `/search`.
- Never capture a search grid, a home feed, or a listing of cards.

## Dribbble / Behance / Unsplash — not sites

These are pictures, not pages. Capture the **image** (or the type specimen), no page chrome. An illustration goes under **Material** (`kind: imagery`, `type`, or `mark`). A shot of a real screen goes under **Screens**. Never under Sites.

Unsplash and Wikimedia: search the **subject**, not stock category.

A board entry whose `shot` is a gallery listing, a stitched repeat, or an illustration filed as a website does not count.
