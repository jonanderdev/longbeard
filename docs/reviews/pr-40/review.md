# Review of PR #40 (`dealt-grid`): design direction and the dealt grid

Reviewed at commit d61f859, 2026-11-19. This file is for whoever fixes the PR. Every finding has what is wrong, the evidence, and the smallest fix. The scripts that reproduce the findings are in `repro/` beside this file; how to run them is at the end.

## Verdict

The deal is sound for normal libraries. The two things it rests on are not:

- Families come almost entirely from the agent's tags, not from the measurements.
- Many measurements misread real pages, and the stills are measured over the whole scrolled page instead of the first screen.

"The agent never chooses" is true for which entries get combined. It is not true for grouping, curation, or how each screen is rendered.

`npm test`: 49 of 49 pass, none skipped. Only the two design test files (about 23 tests) cover this PR.

## Broken

### 1. Families are the agent's tags. The measurements almost never split anything.

- **What is wrong.** Distance is plain Euclidean over blocks that are not normalised (`families.mjs:135`, `:162`, `:176`), with a fixed cut of 2.
  - Measured traits alone reach about 2.58 at most, and only when two pages are opposite on every number.
  - Picture plus layout tags differing gives about 1.9, which still joins.
  - Untagged references sit in the middle of every tag field (`:176`), so they pull unrelated groups together.
- **Evidence** (`repro/families/cases.mjs`, `cases2.mjs`, default `--spread 2`):

  | Case | Result |
  |---|---|
  | Photo and illustration, same numbers | 1 family |
  | Picture and layout both differ | 1 family |
  | Empty 90 / loud 0 / 3 colours against empty 10 / loud 80 / 400 colours, same tags | 1 family (splits at `--spread 1.5`) |
  | Composition mirrored, left-heavy against right-heavy | 1 family |
  | 4 photo, 4 untagged, 4 type-only | 1 family of 12, joined through the untagged ones |
  | Three tag words differ (picture, layout, type), numbers identical | splits |
  | 1,000 references, random measured traits, tags from 5 fixed picture and layout pairs | exactly 5 families, one per tag pair, each spanning empty 10–88% and every tone |

- **Smallest fix.**
  - Normalise each block to a 0–1 distance and average across blocks.
  - Set the cut relative to the pool, for example a percentile of all pairwise distances.
  - Leave untagged references out of the tag blocks instead of placing them in the middle.
  - Add these cases as tests.

### 2. Pictures are measured over the whole scrolled page; families are about the first screen.

- **What is wrong.** `capture.mjs` takes the full page by default, and the step 3 capture commands (`skills/design-direction/SKILL.md:145`) pass no `--clip`. `measure.mjs:209` then shrinks the whole image to 200 px.
- **Evidence** (`repro/measure-pages/long.html`: a quiet first screen with loud stripes below).
  - Full-page shot (1440×3900): empty 22.5, loud 63.2, busy 9.6.
  - First screen only: empty 98.7, loud 0, busy 0.5.
  - The library's `family` ranges come from these numbers, and `design` treats a screen outside those ranges as a fault.
- **Smallest fix.** In `readImage`, crop to the top `width × 900/1440` of the picture, or capture keeps with `--clip 0,0,1440,900`.

### 3. Their own entries (`"from": ["theirs"]`) break the three-sources rule.

- **What is wrong.** Every entry of theirs shares the single source "theirs", so the rule treats their face and their ground as one reference.
- **Evidence** (`repro/deal/cases.mjs`, cases A, A2, B).
  - A fixed face plus a fixed ground (design step 1) makes deal fail: "the library is too thin to deal from".
  - Added rather than replacing the lists, their face and their ground appeared together in 0 of 50 deals.
  - A step 5 pick of face plus ground warns, wrongly, "takes most of its look from one".
- **Smallest fix.** Leave `theirs` out of `overlaps` and `threeSources` in `deal.mjs`.

### 4. Page traits misread on ordinary pages.

Checked on the local pages in `repro/measure-pages/` and on 9 live sites (`repro/live-sites.tsv`). Traits marked * feed `families.mjs`; the others feed the library or only `board.md`.

- **align\***: a left-aligned `<h1>` reads `centre`, because the full-width block box is measured, not the text (`measure.mjs:394-396`). Seen on `plain-header.html`, Linear and Mailchimp.
- **blocks\***: a white header and section on a page with no body background reads 51% solid blocks (`plain-header.html`). Apple reads 95.6%. The background colour only counts as ground when body or html sets it (`:409`).
- **gradient\***:
  - A Tailwind-v4 `oklch()` gradient over the whole screen reads `gradient 0` (`tw4-gradient.html`): the stop regex only matches `rgb()` (`:359`).
  - A smooth fade written with px stops reads `pattern 100` (`px-gradient.html`, `:366`).
  - Stripe's gradient is drawn on a canvas, so it reads 0.
- **lettering, display\***: a 1440×420 hero photo reads as lettering at `600px`, scale 37.5 (`hero-banner.html`, `:339`).
- **display\***: Linear's headline is not read at all, so its display size comes out as 20px.
- **pictures\***: Figma's poster-collage hero reads `pictures 0`.
- **icons\***: CSS-background icons, mask icons and Unicode glyphs count as 0 (`iconfont.html`).
- **scale**: a hero whose only text is the headline gets `body = display`, so scale 1 (`tw4-gradient.html`).
- **Blank capture**: Patagonia served a maintenance page, captured with exit 0. It reads empty 95.4, below the near-blank rule (≥99, `families.mjs:321`), so it is not flagged.
- **Smallest fix.** Measure a Range of the text instead of its box; include the root canvas as ground; parse any colour function, or compare computed colours; only treat an image as lettering when it is not a raster photo.

### 5. Motion-only keeps never get a profile, so they are never in a family.

- **What is wrong.** `measure.mjs:63` reads only image files at the top of the folder, so `--frames` subfolders are skipped. `families.mjs:67` drops any reference without `image` and `shot`.
- **Why it matters.** It contradicts "Every keep is in exactly one family" (`skills/design-direction/SKILL.md:202`).
- **Evidence.** Read from the code; not run.
- **Smallest fix.** Use the first or middle frame as the reference's shot.

### 6. Design step 6 tells the agent to run something it cannot.

- **What is wrong.** "`measure.mjs` on its file URL" (`skills/design/SKILL.md:147`). `measure.mjs` is not in `skills/design/scripts/`, and it rejects `file://` URLs.
- **Evidence.** `node skills/design-direction/scripts/measure.mjs file:///tmp/x.html` prints usage and exits 2.
- **Smallest fix.** Ship `measure.mjs` with `design` and accept `file://`.

### 7. The anchor's two screens are stacked directly above each other 35% of the time.

- **What is wrong.** The rule only checks list order (`deal.mjs:254-263`). `sheet.mjs` defaults to 2 columns, so screens n and n+2 sit on top of each other.
- **Evidence.** 70 of 200 seeds (`repro/deal/cases.mjs`, case E). The CHANGELOG says they "never sit side by side".
- **Smallest fix.** Pass the column count to deal and check neighbours on the grid.

### 8. The anchor's arrangement can drop out with exit 0.

- **What is wrong.** If the anchor's reference also appears in every type entry, round 1 has no anchor screen, and the only sign is one stderr line. The skill promises its arrangement "is sure to be among the screens" (`skills/design-direction/SKILL.md:257`).
- **Evidence.** Case F.
- **Smallest fix.** Exit non-zero, or relax the freshness and pair rules for the anchor.

### 9. "A type and ground pair repeats at most once" is false in a tight library.

- **Evidence.** With 2 types and 2 grounds, one pair appears 3 times in a round of 8 (case G; the fallback at `deal.mjs:142`). The test of that name only uses the default library.
- **Smallest fix.** Say so on stderr, and test with a tight library.

### 10. A flag with no value deals a fresh round instead of failing.

- **Evidence.** `deal.mjs library.json --vary` with nothing after it exits 0 and writes a new `deal` round (case C, `deal.mjs:44`). `--seed abc` silently becomes seed 0 (case K).
- **Smallest fix.** A flag that is present but empty, or a seed that is not a number, is a usage error.

## Weak

11. **Accent check.** `standsOff` passes anything at contrast ≥1.15, so `#ececec` on white is dealt. Three-digit hex (`#fff`) skips the check (`deal.mjs:109-113`, case H). Fix: normalise the hex and use 3:1, the non-text threshold.
12. **`--more` has no cap.** `--more 1:type` with 34 types gave 32 screens in one round (case I).
13. **"None → deal again" repeats itself.** The library usually holds one arrangement per reference, all already shown, so round 2 reuses them, with the anchor twice again (case D).
14. **Two shots of one site count as two references.** `site.jpg`, `site-menu.jpg` and `site-full.jpg` each get a profile, so they can meet "three different sources" and the minimum of six. Fix: key references by link.
15. **Stale text.** The header of `families.mjs` (`:18-29`, `:55`) still describes the old top-down split with `--spread 0.1`. The CHANGELOG still cites `measure.mjs <folder> --tsv` and an untested "20 times faster".

## The principle: where the agent still chooses

The deal stops the agent choosing combinations. Upstream and downstream of it, the agent still chooses:

- **Grouping.** Tags decide families (finding 1). The eye pass then splits, merges and moves keeps (`skills/design-direction/SKILL.md:194`). The families board shows 6 "typical" per family, picked by the algorithm, and the agent says which fit.
- **Curation of their likes.**
  - Over the number, the agent keeps "the clearest patterns first" (`:140`).
  - It drops likes that fail sources.md (`:140`), or a Dribbble concept that fails its own test against the brief (`:152`).
  - Before they see anything, it cuts the pool to "the source's quality floor" (`:106`).
  - None of these drops are shown to them.
- **What the screens look like.** Each arrangement is a sentence the agent writes, then a rule the agent builds into HTML (`skills/design/SKILL.md:85`). The deal randomises which entries combine; the agent authors the look of every arrangement. With no `grid.html` template, two runs will differ a lot.
- **Which options exist.** The `eye` stand-in face is the agent's pick (`skills/design-direction/SKILL.md:290`). The step 5 rows are "up to five more of the same kind" and "a step lighter or darker", both defined by the agent.
- **Taste fixed in code.** `TAGW` (`families.mjs:135`) ranks picture over layout over type and colour.
- **"Go" paths.** `skills/design-direction/SKILL.md:48, 67, 155, 259` let the agent decide feel, picks and the whole marking. The flow picture shows none of them.

Smallest fixes:

- Show every drop in a "dropped" tray they can bring back.
- Generate the face and colour options in a script: OKLCH steps, and a fixed face catalogue filtered by measured class.
- Show the anchor's shot beside its dealt screens, so they can judge the agent's reading of the arrangement.
- Draw the "go" paths on the picture.

## Steering, as a non-designer

- **About 16 stops before `DESIGN.md`.** Three in a row ask nearly the same thing: the marks read-back, the library readout, the direction.
  - The library readout asks a non-designer to drop or swap text ids ("arrangements (6): split, arch…") before anything is rendered, which contradicts "choose on rendered screens".
  - Fold it into the grid step, or make it optional.
- **Step 5 command is wrong after a vary round.** `--mix 1,accent=<id>` (`skills/design/SKILL.md:136`) assumes the pick is recipe 1. After a vary round it usually is not.
- **Leads in two families** get "its own library" (`skills/design-direction/SKILL.md:260`), but no file name is given, and `design` only reads the one `library.json` beside `direction.md`.
- **Spacing is promised and never offered.** The `design` description says colour, type, spacing and copy are chosen by them.
- **No template for the grid page**, the hardest artefact in the flow: `deal.js` loading, family variables, URL overrides, fit-to-width type.
- **The picture does not match the skills.**
  - "Search the gap, or go?" goes straight to profiling. The skill requires a picker round for the gap search (`skills/design-direction/SKILL.md:96`).
  - There is no "yes" after vary, or after colour and type (`skills/design/SKILL.md:119, 140`).
  - The Figma board approval is missing.

## Cost: a Figma moodboard of 1,000 references

Measured: `families.mjs` takes 2.4 s on 1,000 profiles; `measure.mjs` took 17.8 s for 9 images plus 9 pages at `--jobs 6 --wait 4000`. The rest are estimates.

| Step | Time | Tokens |
|---|---|---|
| Section screenshots in 1100 px crops | — | about 50–100K |
| `download_assets`, mapping each card to its image (the worst bottleneck) | 10 min (about 50 calls) to 1.5–3 h (one call per card) | 50K to 1M |
| Measure 1,000 live pages at 6 jobs | about 25–40 min | — |
| Tagging: 63 sheets of 16 | — | about 130–170K; accuracy at thumbnail size decides the families (finding 1) |
| Family contact sheets (about 28) | — | about 50K |
| GIF frame captures | about 5–8 s each | — |

Total: roughly 0.5–1.5M tokens and 2–5 hours, dominated by the Figma downloads and the tagging.

## Tests: what is missing

- The families cases in finding 1, including untagged references bridging groups.
- Full-page against first-screen measuring.
- Any of the misreads in finding 4.
- `theirs` entries.
- Grid adjacency on the sheet.
- A tight library, an empty flag, the anchor going missing.
- The picker and moodboard copy-out, end to end. The page scripts are only checked for syntax.
- Whether the commands named in each SKILL.md exist and run.

## Checked and sound

- Three sources hold on every normal deal; a seed gives the same round.
- The anchor's two screens are never consecutive in list order.
- `--vary` changes only one list; `--mix` warns when it should.
- Library validation fails with the reason.
- Families split opposite extremes, keep light and dark together as intended, and handle pairs and strays.
- Canvas and video detection works (Bruno Simon 100% canvas, Apple 21% video). `rgb()` gradients and SVG lettering are detected.
- `tag.mjs` checks every word strictly.

## Not checked

- The Figma path: no board link was given.
- Awwwards (unreachable from the review machine), Dribbble and the other sources.
- The 65-site pool `--spread 2` was tuned on: it is not in the repo.
- The picker and moodboard pages in a browser.
- A fresh agent following both skills end to end.
- The PR description on GitHub.

## Running the repro scripts

From the repo root, Node 22+ and an installed Chrome:

```
node docs/reviews/pr-40/repro/families/cases.mjs     # finding 1
node docs/reviews/pr-40/repro/families/cases2.mjs    # finding 1, extremes
node docs/reviews/pr-40/repro/deal/cases.mjs         # findings 3, 7–13

# findings 2 and 4: serve the test pages, then measure them
(cd docs/reviews/pr-40/repro/measure-pages && python3 -m http.server 8765) &
node skills/design-direction/scripts/measure.mjs http://localhost:8765/plain-header.html --wait 500
node skills/design-direction/scripts/capture.mjs http://localhost:8765/long.html --out /tmp/long.jpg
node skills/design-direction/scripts/capture.mjs http://localhost:8765/long.html --out /tmp/long-screen.jpg --clip 0,0,1440,900
node skills/design-direction/scripts/measure.mjs /tmp/long.jpg /tmp/long-screen.jpg --tsv
```

`repro/live-sites.tsv` lists the 9 live sites measured for finding 4. Their numbers will drift as the sites change. The family and deal scripts write their working files to the system temp folder.
