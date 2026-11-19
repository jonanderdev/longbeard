---
name: design-families
description: >
  Optional. Sort a big or messy moodboard (a large Figma board, a folder, a
  wide search) into families: groups of references that look alike from across
  a room. Every reference is measured and tagged, sorted by script, checked by
  eye, and named for what is seen. They take one or two families, and those
  become the references the next skills work from. Call it by hand, or when
  design or design-moodboard offers it for a board over about 60 references.
  Never worth it for a board someone already curated to a few dozen.
---

# Design families

One job: sort a board into looks so choosing is easy. It marks no anchor, builds no library and deals nothing.

Comes out:

- **`docs/design/design-families.md`**, committed: each family named, what it shares, how big it is, and which they took.
- **In Figma**, for a Figma board: a new page, `Families`, with one section per family holding copies of its cards. Their own pages are never moved or changed.
- **`.longbeard/design/families/`**, gitignored: `profiles.json`, `tags.tsv`, one TSV per family, the families page.

## Gate

1. No board → `design-moodboard` first, or they give one now (a Figma link, a folder, a list of links).
2. Under about 40 references → say a board this size is easier to choose from as it is, and stop unless they insist.
3. A Figma board of hundreds → ask once, "The whole file, or one page or section?", and offer to read only cards their own tags mark as screens. Reading and tagging 1,300 cards cost about 800K tokens.

A board `design-moodboard` already read has its captures in `.longbeard/design/moodboard/refs/` and `board.md`. Otherwise read it the way `design-moodboard` does (Figma originals, crops from shared sheets, captures for links).

## 1. Measure, in one browser run

`links.tsv` (`name<TAB>link`) for the keeps with a live page, then:

```
node <skill>/scripts/measure.mjs .longbeard/design/moodboard/refs --links .longbeard/design/families/links.tsv --profiles .longbeard/design/families/profiles.json --jobs 6
```

From each picture: how light, how empty, how loud, how busy, its colours, and where things sit on a 6×4 grid. From a live page: the largest type and where it sits, what the screen is made of, its fonts, gradients and patterns. A screen on a presentation surround is measured inside the surround. Never one call per image, and never read the profiles into the chat.

## 2. Tag what numbers cannot see

```
node <skill>/scripts/tag.mjs .longbeard/design/families/profiles.json --sheets <scratch>/tag
node <skill>/scripts/tag.mjs .longbeard/design/families/profiles.json .longbeard/design/families/tags.tsv
```

The first makes sheets of 16 untagged keeps and prints the vocabulary (picture, photo, type, weight, layout, colour, surface, scale). Write one row per keep from the sheets; the second checks every word. Their own board tags seed the rows: map each to the vocabulary and tag only what is left. Tag what is there, never what is good. On a big board, split the sheets across a few agents.

## 3. Sort, then the eye

```
node <skill>/scripts/families.mjs .longbeard/design/families/profiles.json --board .longbeard/design/families/board.md --sliders "loud=2,picture=4,rich=2,cool=2"
```

The sliders are the design brief's personality. It joins the closest references first and stops when groups no longer look alike, so outliers stay strays. A wide gap on what is seen first (how empty, how loud, type size, where things sit, what the picture is) keeps two apart; light or dark does not. A bin far bigger than the rest is sorted again on its own and said; one it cannot split is sorted alone with `--only <family tsv> --spread 0.4`. `--spread` lower splits finer.

Then check each family by eye on contact sheets, never picture by picture:

```
node <skill>/scripts/contact-sheet.mjs .longbeard/design/families/f1.tsv --out <scratch>/f1 --contain
```

- Split a family that holds two looks, merge two that are one, place each stray. Strays are often the most distinctive references: never drop one for being a stray.
- **Name each family for what is seen**, in words a person outside design would use ("one huge word is the picture", "dark app pages, headline centred"). If the only honest name is a number ("dark, all picture"), it is a bin: break it up.
- As many families as there are looks. Never merge to reach a number.
- On hundreds of references: check each family's six most typical now, and every member of a family once it is taken.

## 4. Show them, once

The families page, each family as its six most typical, its size and what it shares:

```
node <skill>/scripts/moodboard.mjs .longbeard/design/families/board.md --overview 6 --out .longbeard/design/families/families.html
```

For a Figma board, also build the `Families` page with `use_figma` (load `figma-use` first): a section per family, named, with copies of its cards, most typical first. Read the names back from the nodes.

In the same message, one line per family: its name, what the eye changed from the numbers, and, as hints only, which fit the design brief's personality, which look like its "never", and which rely on pictures they do not have. Where what they chose sits far from what they said ("you said quiet; your board is loud"), ask which to go by. Then:

> Take the families you want to work from, one or two. Note any that look like two, or belong together.

- **A split or merge note:** apply it, show the page again.
- **None taken:** ask in one line what is missing, and offer `design-moodboard` for a search sized to it.
- **Two taken:** two looks. Ask which comes first; the other waits.

## Write `docs/design/design-families.md`

```markdown
# Families: <product>

<n> references sorted into <n> families and <n> strays.

## Taken
### <family name>
<what its members share, in one or two lines: how much type against picture, how empty, how loud, how pictures are treated> · <n> references

## Also on the board
- <family name> — <what it shares> · <n>
```

No names, links or paths. The members of each family are in `.longbeard/design/families/f<n>.tsv`; the taken ones are the references `design-identity` and `design-direction` work from.

Then the next step in one line: `design-identity`.

## Do not

- Run on a curated board of a few dozen without being asked.
- Move, rename or delete anything on their own Figma pages.
- Pick the family for them, or hide one because it looks like their "never".
- Sort before every keep is measured and tagged, or read profiles into the chat.
