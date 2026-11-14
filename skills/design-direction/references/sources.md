# Sources: what to keep, and how to get the shot

## Thumbnails for the picker

Each picker row takes its title, thumbnail and link from the same card on the listing page, so a pick always opens the thing that was picked. Hotlink the thumbnail and never save it. Use the smallest size that still reads at about 400 px wide. The link is the item's own page, never the listing. These were checked by reading the plain listing HTML, without a login (2026-11-14):

- **Dribbble:** `dribbble-cards.mjs --picker` prints the rows.
- **Awwwards:** use `/websites/sites_of_the_day/`, which already meets the award floor. Each card's `figure-rollover__link` has the title (`aria-label`) and the site page (`/sites/<slug>`), and its image's `data-srcset` has the `thumb_440_330` size.
- **Recent:** each card's image is the poster (`…/recording/poster/640.webp`). The link next to it is labelled `View post: <title>` and goes to `/i/<id>-<slug>`.
- **Dark Mode Design:** each card is a link to the live site around an image whose `alt` is the title.
- **Wikimedia Commons:** `thumburl`, with `descriptionurl` as the link.

**siteinspire** refuses scripted requests to its listing (429), so it is not in the picker. Do not work around a site that refuses scripts. If they tick it anyway, say so, and take any siteinspire page they paste as a seed.

A source whose cards you cannot read is not in the picker. Say so under `Sources:`. Never screenshot a listing to fake one.

## Keeping

A nominee is not a reference. Open it full size and drop anything weak before it goes on the board. A weak pass means fewer keeps, not a lower bar.

## Galleries

- **Awwwards.** Open the site page, not the listing card. Keep Site of the Day, Month, or Year, or an Honorable Mention with overall and Design ≥ 7.5. Drop any 4s, and any gate or password wall.
- **siteinspire, Recent** (recent.design/websites). These are curated, not scored. Keep a live page with one clear idea: a crop, a component, or an arrangement. Drop generic SaaS (centred headline, three icon cards, soft gradient, Inter). On Recent, open the source URL on the item.
- **Dark Mode Design.** Only when the look is dark.
- **Muzli.** Only a way to reach the original, which then has to pass its own test.

## Dribbble

Listing pages render in the browser, and shot pages hit human verification. Use the script on a popular listing for this year:

```
node <skill>/scripts/dribbble-cards.mjs "https://dribbble.com/search/shots/popular/product-design?q=text+editor+screen&timeframe=year" --scrolls 4
```

It prints `id-slug`, likes, views, designer, image URL, and title, sorted by likes. With `--picker` it prints picker rows instead (title, thumbnail, shot page, `dribbble`, designer and likes), ready to append to `candidates.tsv`. It drops shots under 100 likes (`--min-likes` changes that), and merch, CVs, worksheets, posters, logos, and tool ads by slug and title. Extend that list with `--drop "a,b"` and relax it with `--keep "a,b"`. Save the image from `cdn.dribbble.com` (`<url>?resize=1600x1200`).

- Use a category path and the form, not the word: `/product-design?q=…`, `/mobile?q=…`, `/web-design?q=…`.
- If most of what gets through is off-form, the query is wrong. Fix the query rather than scrolling further.
- A product's category can be swamped by stores. Query the thing people do with it, and `--drop` what the brief rules out.
- A thin query ignores `timeframe=year`: the shot ids show it.
- Run one query at a time. If a query returns 0 cards, retry after 8 s, then 30 s. If it is still 0, note it under `Sources:` as a possible rate limit.
- **Popular is not good.** Dribbble's popular order mixes likes with recency, so the top of a listing is often just new. Rank by likes, never by position on the page.
- **Likes grow with age.** Shot ids rise over time, so compare likes between shots of similar id. A shot whose id is far below the rest is years old: keep it only if nothing about it looks dated.
- **Judge the designer, not only the shot.** One designer with several near-identical shots in a listing is a concept studio: keep at most one of theirs.
- For the pool, the mechanical cuts are enough: off-topic, the likes floor, one per near-identical designer. At the shortlist, keep a shot when you can name its idea in one line, it stands out on likes in its own listing, and it looks current. Drop AI mush, fake browser chrome, purple-on-dark gradients, Inter everywhere, and emoji icons.
- A Dribbble illustration is imagery, never a site.

## Cropping a downloaded image

To crop a picture you already have (a screen inside a marketing frame, a type specimen):

```
node <skill>/scripts/capture.mjs "file://<abs path to image>" --out design-exploration/<slug>/refs/<name>.jpg --clip x,y,w,h
```

`--clip` is in the image's own pixels.

## Imagery

Search the subject, not a stock category. One real place or material beats a pile of similar ones. Zero imagery is a complete answer.

- **Wikimedia Commons.** Query the API with `-A "<project>-hunt/0.1"`, `prop=imageinfo&iiprop=url&iiurlwidth=1920`. Save `thumburl`. `descriptionurl` is the `link`.

## Contact sheets

Viewing listing thumbnails is fine. It is not a capture. Build labelled grids in scratch, never under `design-exploration/`:

```
node <skill>/scripts/contact-sheet.mjs candidates.tsv --out <scratch>/sheets   # TSV: label<TAB>imageURL
```

## Capture a live page

Only for a keep, run from the project root:

```
node <skill>/scripts/capture.mjs <url> --out design-exploration/<slug>/refs/<name>.jpg
```

The script dismisses cookie banners, scrolls so reveals load, unsticks fixed headers, and takes one full-page JPEG. Node 22+ and an installed Chrome are required (set `CHROME_PATH` if Chrome is somewhere unusual). Options:

- `--review <scratch>/x.jpg` writes a readable side-by-side version of a tall page.
- `--clip-selector "main"` or `--clip x,y,w,h` crops to a type specimen.

Open the file. Delete it and run again if it repeats a band, still shows a cookie dialog, or is mostly empty. If a page will not scroll (WebGL, a locked canvas), keep one viewport and say so on the card. Never stitch screenshots.
