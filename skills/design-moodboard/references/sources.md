# Sources: what to keep, and how to get the shot

## What is saved

Nothing from a listing is saved. A picker thumbnail is hotlinked from the listing and never written to disk. The one case of saving is a keep: once they like it, it is captured at full size into the gitignored working folder (`.longbeard/design/moodboard/refs/`), and nothing else is. A contact sheet of thumbnails is a view in scratch, outside the project, and never a reference.

## Thumbnails for the picker

Each picker row takes its title, thumbnail and link from the same card on the listing page, so a pick always opens the thing that was picked. Use the smallest size that still reads at about 400 px wide. The link is the item's own page, never the listing. These were checked by reading the plain listing HTML, without a login (2026-11-14):

- **Dribbble:** `dribbble-cards.mjs --picker` prints the rows.
- **Awwwards:** use `/websites/sites_of_the_day/`, which already meets the award floor. For older winners, `?page=N` goes back through the years (around page 120 is 2016), and `/websites/sites_of_the_year/` holds each year's best in two pages (from 2014, checked 2026-11-16). Each card's `figure-rollover__link` has the title (`aria-label`) and the site page (`/sites/<slug>`), and its image's `data-srcset` has the `thumb_440_330` size.
- **Recent:** each card's image is the poster (`…/recording/poster/640.webp`). The link next to it is labelled `View post: <title>` and goes to `/i/<id>-<slug>`.
- **Dark Mode Design:** each card is a link to the live site around an image whose `alt` is the title.
- **Wikimedia Commons:** `thumburl`, with `descriptionurl` as the link.
- **Minimal Gallery:** its search box returns nothing to a script (`?s=` always says 0 results), so browse a tag: `/tag/<tag>/` (`food-drink`, `portfolio`, `e-commerce`, `editorial`…; the tags are listed on the home page), `/page/N/` for more. Each card's link has `aria-label="View details for <title>"` and goes to the item page; its `img` `srcset` has the `-768x426` size. Open the live site from the item page.
- **httpster:** it has no search (`/search/` is a 404). Browse by what the site is, `/type/<type>/` (`food-drink`, `online-store`, `service`…), or by look, `/style/<style>/` (`typographic`, `brutalist`, `print`, `photographic`…), `?page=N` for more. Each card is an `article.Preview`: the image is `.Preview__img` (relative, on httpster.net, 300 px wide), the title and item page are `.Preview__title`, and `.Preview__ext` is the live site.
- **Fonts In Use:** its `robots.txt` asks scripts to keep out of `/search` and to wait 10 s between requests: never use the search, and pace every request. Browse a tag instead, `/tags/<id>/<name>` (a subject: `/tags/1428/bakeries`), or a format, `/in/2/formats/<id>/<name>` (`4/packaging`, `7/signs`, `12/posters-flyers`, `6/books`, `9/branding-identity`), or a topic, `/in/1/topics/<id>/<name>` (`30/food-beverage`). The ids are not guessable: read them from the links on a use page or a listing. Each card's link (`/uses/<id>/<slug>`) holds the title in `.fiu-galleryItem__headline`, and its `img` is the thumbnail.

**siteinspire** (429), **Land-book**, **Lapa Ninja** and **landing.love** (403) refuse scripted requests to their listings, so they are not in the picker. **One Page Love** answers, but its pages ask scripts to use its API, which needs a key: it is not in the picker either. **Best Website Gallery**'s search matches only site names and returns mostly sites from 2009–2011: not in the picker. (All checked 2026-11-21.) A site that refuses scripts is not worked around, here or anywhere: no other client, no pacing around the limit, no archive. If they tick it anyway, say so, and take any page from these they paste as a seed.

A source whose cards you cannot read is not in the picker. Say so under `Sources:`. Never screenshot a listing to fake one.

## Keeping

A nominee is not a reference. Open it full size and drop anything weak before it goes on the board. A weak pass means fewer keeps, not a lower bar.

## Galleries

- **Awwwards.** Open the site page, not the listing card. Keep Site of the Day, Month, or Year, or an Honorable Mention with overall and Design ≥ 7.5. Drop any 4s, and any gate or password wall. An older winner is captured live: drop it if the domain is dead, parked, or now another site (capture names a redirect). Never reach it through an archive.
- **siteinspire, Recent** (recent.design/websites), **Minimal Gallery, httpster.** These are curated, not scored. Keep a live page with one clear idea: a crop, a component, or an arrangement. Drop a page that is a template's defaults with nothing of its own. Never drop for a look (a gradient, a typeface, a colour): that is theirs to choose. On Recent, open the source URL on the item.
- **Fonts In Use.** Print, signage, packaging, books and identities, each with its typefaces named: the place for the far reference (`screen: no`), and for type when the board has none. Its `web` and `software-apps` formats are screens like any gallery's. Keep a use with one clear idea (a crop, a type pairing, a material); its typefaces go on the card as what was read, never as a pick. Capture the use page's own image, never the shop or studio it shows.
- **Dark Mode Design.** Only when the look is dark.
- **Muzli.** Only a way to reach the original, which then has to pass its own test.

## Dribbble

The script reads the listing a browser renders, and only that: shot pages ask for human verification, so it never opens one. When the site answers with a verification page or a limit, stop, say so under `Sources:`, and go on without Dribbble. Never retry around it. Use the script on a popular listing for this year:

```
node <skill>/scripts/dribbble-cards.mjs "https://dribbble.com/search/shots/popular/product-design?q=text+editor+screen&timeframe=year" --scrolls 4
```

It prints `id-slug`, likes, views, designer, image URL, and title, sorted by likes. With `--picker` it prints picker rows instead (title, thumbnail, shot page, `dribbble`, designer and likes), ready to append to `candidates.tsv`. It drops shots under 100 likes (`--min-likes` changes that), and what is never a screen for any product by slug and title: merch, CVs, worksheets, seasonal cards, stickers and mockups. It says on stderr how many it dropped and for which words. `--scrolls 0` reads the first screen only.

That list is short on purpose. A kind of product (a dashboard, a CRM, a chatbot, an editor) or a look (a poster, an illustration, a logo) is a candidate for some brief, so it is never in the default. When the brief rules one out, you pass it: `--drop "a,b"`. `--keep "a,b"` brings a default word back. A keep's full-size image is saved from `cdn.dribbble.com` (`<url>?resize=1600x1200`), as the one case of saving above.

- Use a category path and the form, not the word: `/product-design?q=…`, `/mobile?q=…`, `/web-design?q=…`.
- If most of what gets through is off-form, the query is wrong. Fix the query rather than scrolling further.
- A product's category can be swamped by stores. Query the thing people do with it, and `--drop` what the brief rules out.
- A thin query ignores `timeframe=year`: the shot ids show it.
- Run one query at a time. If a query returns 0 cards, do not retry it: note it under `Sources:` (a verification page or a limit, when the script says so).
- **Popular is not good.** Dribbble's popular order mixes likes with recency, so the top of a listing is often just new. Rank by likes, never by position on the page.
- **Likes grow with age.** Shot ids rise over time, so compare likes between shots of similar id. A shot whose id is far below the rest is years old: keep it only if nothing about it looks dated.
- **Judge the designer, not only the shot.** One designer with several near-identical shots in a listing is a concept studio: keep at most one of theirs.
- For the pool, the mechanical cuts are enough: off-topic, the likes floor, one per near-identical designer. At the shortlist, keep a shot when you can name its idea in one line, it stands out on likes in its own listing, and it looks current. Drop broken work: AI mush (garbled text, melted shapes), fake browser chrome. Never drop for a look (a gradient, a typeface, a colour): a family may rely on it, and they choose.
- A Dribbble illustration is imagery, never a site.

## Cropping a downloaded image

To crop a picture you already have (a screen inside a marketing frame, a type specimen):

```
node <skill>/scripts/capture.mjs "file://<abs path to image>" --out .longbeard/design/moodboard/refs/<name>.jpg --clip x,y,w,h
```

`--clip` is in the image's own pixels.

## Imagery

Search the subject, not a stock category. One real place or material beats a pile of similar ones. Zero imagery is a complete answer.

- **Wikimedia Commons.** `pictures.mjs` (in `design-direction`, `design-content` and `design-prototype`) searches it, keeps only clear licences and large enough files, and writes the credits. For a picker row by hand: the API with `prop=imageinfo&iiprop=url&iiurlwidth=1920`; `thumburl` is the thumbnail, `descriptionurl` the `link`.

## Contact sheets

Viewing listing thumbnails is fine. It is not a capture. Build labelled grids in scratch, never under `.longbeard/design/`:

```
node <skill>/scripts/contact-sheet.mjs candidates.tsv --out <scratch>/sheets   # TSV: label<TAB>imageURL
```

## Capture a live page

Only for a keep, run from the project root:

```
node <skill>/scripts/capture.mjs <url> --out .longbeard/design/moodboard/refs/<name>.jpg
```

Node 22+ and an installed Chrome are required (set `CHROME_PATH` if Chrome is somewhere unusual). Before the shot the script waits out loaders and intros: until no loader covers the screen, the screen is not one flat colour, and the network is quiet, for up to 15 s (`--wait ms` changes that). It turns down cookie banners, scrolls so reveals load, unsticks fixed headers, and takes one full-page JPEG. A page that draws in a canvas often goes blank when laid out full length: then the shot is the first screen, the full page is kept beside it as `<name>-full.jpg`, and it says so on stderr. Options:

- `--click "css"` clicks that element once the page has loaded and keeps the screen after it: a menu open, a filter, a tab. One site's inner pages are their own captures, by their own URL.
- `--frames N` records motion: N screens, `--every ms` apart (500), into the folder `--out` names, each file named by when it was taken. Alone, the frames start as the page opens: the loader and the intro. With `--scroll`, each frame scrolls half a screen. With `--click "css"`, the first frame is before the click and the rest are what it does: a menu opening, a page transition. The card's `frames:` is that folder, and the moodboard plays it.
- `--review <scratch>/x.jpg` writes a readable side-by-side version of a tall page.
- `--clip-selector "main"` or `--clip x,y,w,h` crops to a type specimen.

Open the file. Delete it and run again if it repeats a band, still shows a cookie dialog, or is mostly empty. A message on stderr that it waited the full time means the page may still be loading: look before keeping it. Never stitch screenshots.
