# Changelog

## Unreleased

- `tdd` from [Matt Pocock](https://github.com/mattpocock/skills) is in the default kit, under Code. It runs only when you ask for TDD, test-first, or red-green-refactor; `ponytail` stays the default for building and fixing. People who already ran `init`: install this version, then run `npx longbeard update`.
- The `AGENTS.md` block `init` and `update` write now matches the 0.6.0 hunt: the `DESIGN.md` ask is its own message, asked once more if they move on without answering. 0.6.0 shipped the older "ask once" line. Run `npx longbeard update` after installing this release.
- `update` tells an edit by content, not by file time. A fresh clone or a checkout no longer makes every skill look edited, so they refresh again. A lock written by 0.6.0 or earlier has no hash yet: if `update` lists a skill under "your edits" that you did not change, run `npx longbeard update --force` once.

## 0.6.0 — 2026-10-23

- `update` refreshes a kit skill from the installed package. It used to hand every refresh to the skills CLI, which cannot fetch a skill that ships inside this package, so it printed "up to date" over files from an older release. Each line now says which versions moved (`design-reference-hunt 0.5.1 → 0.6.0`), `--force` always replaces, and the last line names the version you are running. Install the package first; `update` still does not fetch it.
- `design-reference-hunt` opens the moodboard **before** the pick, with eight to twelve screens rather than two, every picture linked to its source, captions under the shot, and whole references instead of a 320 px crop. New card fields carry it: `tagline:` (about six words, the only text on a tile), `faces:` (names only, so the type tile sets them for real), and `slot:` (a product page stays off the moodboard). After the pick it runs again with `--leads` and `--why`, so the lead's caption is the reason they gave, not a line written before they chose. `--imagery` is opt-in: a look with no pictures in it shows no imagery tiles, and an imagery count of 0 is a complete board.
- `design-reference-hunt` adapts a colour for a reason — contrast, the twist, our own pictures, our own brand — and keeps a generic sampled cream or ink as it is. Nudging a hex so it differs is a change nobody can see.
- `scripts/dribbble-cards.mjs` reads likes and views from the card's own stat elements and prints both columns. It used to take the first number in the card text, which could be the likes count, a digit from the title, or a full stop. A count it cannot read stays empty.
- `scripts/capture.mjs` takes a `file://` URL, so the moodboard can be checked before anyone is shown it, and `--clip-selector "<css>"` clips to an element's box instead of guessing coordinates for a type specimen.
- `design-reference-hunt` starts a whole look with a conversation, not a search. One round, every question skippable with "go": what they are into, pictures they already like (kept as `source: user` seeds that steer and rank the search), the subject and surface with the identity nouns from the name, whether it needs pictures at all, a checklist of sources with defaults for the surface, and how many references to see. It never asks a second round before searching.
- The search is smaller and cleaner. It queries for the form, not the word, and `dribbble-cards.mjs` drops a shared negative list (tees, CVs, worksheets, posters, logos) by slug and title before any thumbnail is fetched, then prints the noise rate. An app stops when two more queries add nothing, keeps the number they chose, and opens every shortlisted shot at full size. App hunts go to shipped screens first and mark each card `shipped: yes | concept`. Cards are short; only the lead and the `also` cards get the full fields.
- The moodboard is the narrowing step. It is built from what was found, before they answer, and the question is "which leads, which do you also like, which feel wrong, and why?". `--also` takes several cards, `--count` sets how many references show.
- **Read this** gains `ownable` (one concrete element from the project's own identity that the lead does not have), `gaps` (key screens with no strong reference, each offered as a later hunt after the persist answer) and `not shown` (what a concept lead never faced). `design-md` carries `ownable` and `gaps` into `DESIGN.md` and sends a board without `ownable` back.
- New `scripts/proof.mjs` writes `.design/proof.html` from **Read this**: paper and night side by side, a list row and a phone column, the faces at body size, contrast ratios, and text from the project's own README or product file. It is not the product. It runs before the persist ask and asks whether fewer font families would do.
- A redo of the whole look uses at least one source the last board did not, and one deliberately opposite query, to test whether the lead still wins.
- People who already ran `init` get all of this by installing this release, then running `npx longbeard update`.

## 0.5.2 — 2026-10-23

- `design-reference-hunt` opens `.design/moodboard.html` after a leading reference is chosen. That file is the references: pictures, type we saw, colour we saw. The direction is the adaptation said after it — what we take, what we change, what we leave — and `DESIGN.md` is written from that, not from the reference’s exact colours or faces. A later hunt does not replace the moodboard. People who already ran `init` get it by installing the release that contains it, then running `npx longbeard update`.

## 0.5.1 — 2026-10-23

- `design-reference-hunt` defines direction and does not code. After a primary pick (or an accepted later hunt), it explains the direction in chat and asks once to write or update `DESIGN.md`. Direction-only stops there. Build only if they also asked to build.
- `design-md` writes or updates `DESIGN.md` from the board or a hunt note only when they confirm — colour, type, control, layout principles, leave. It does not invent a look.
- The `AGENTS.md` router matches that split: hunt / define direction → hunt; build or code a page → taste (when installed), preferring `DESIGN.md` then the board. People who already ran `init` get it by installing the release that contains it, then running `npx longbeard update`.

## 0.5.0 — 2026-10-23

- `design-reference-hunt` also looks through MaxiBestOf, Recent, Supahero, Muzli, Pinterest, and Dark Mode Design. The board stays the same size: 10 live sites, up to 20 screens, 10 for a piece. What goes up is how many candidates it opens — at least 60 live ones, past the first page of each live gallery, before a short board. A piece looks through at least 30 before it keeps 10. Dark Mode Design only when the subject, the register, or the style they asked for is dark. Supahero is heroes. Muzli opens the original. Pinterest pins are pictures, never sites. People who already ran `init` get it by installing the release that contains it, then running `npx longbeard update`.
- `jury` from [juliobsz](https://github.com/juliobsz/skills/tree/main/jury) is in the default kit. It runs only when they ask to jury, score, judge, or roast the design (or a live URL / local build): a blind evidence scorecard, not a redesign. Fixes stay on the board, `DESIGN.md`, or Figma. People who already ran `init`: install this version, then run `npx longbeard update`.
- `design-reference-hunt` asks once, before looking, for a specific style and any requirements. For one piece — a loading state, a control — that message also offers two or three search ideas, then looks after the answer. A loading search and the whole no-look board stay side by side: neither replaces the other’s files, whichever ran first. The same whole look may rewrite its own board. A second pass of the same piece is the next slug. People who already ran `init` get it by installing the release that contains it, then running `npx longbeard update`.

## 0.4.0 — 2026-10-21

- `diagnosing-bugs`, `grill-me`, `grilling`, and `handoff` from [Matt Pocock](https://github.com/mattpocock/skills) are in the default kit. Hard bugs get a diagnosis loop; an underspecified ask gets grilled; a session can hand off cleanly. `grill-me` needs `grilling` beside it. People who already ran `init`: install this version, then run `npx longbeard update`.

## 0.3.0 — 2026-10-20

- `init` waits for a key on the agent picker. Node 24 leaves the terminal non-blocking, so the first read was throwing `EAGAIN` and aborting the install. Install this version and run `npx longbeard init` again. Anyone who already finished `init` can leave it.

## 0.2.0 — 2026-10-20 

- Install from npm: `@jonandev/longbeard`. The command prints that version with `--version`.
- `design-reference-hunt` can run after a direction or a design exists. A full hunt with no look still writes `.design/board.md`. Any later pass (a view, a control, new ideas, a double-check) writes `.design/hunts/<slug>/` and does not replace the board, `DESIGN.md`, or a Figma file. Before looking, it asks once for optional ideas to search. People who already ran `init` get it by installing the release that contains it, then running `npx longbeard update`.
- `animate` is in the default kit. It builds a control or a transition they asked to animate. A page `design-taste-frontend` is building keeps that skill’s motion.
- `security-audit` is optional. `--all` installs it with `image-to-code`. It runs when they ask for a security review. The full audit runs only when they ask for an audit or a pen-test. People who already ran `init` get it from this release with `npx longbeard update --all`.

## 0.1.0 — 2026-10-20

First public release.

- `init`, `update`, `list`, `add`, and `remove`.
- The kit in `beard.json`, the `AGENTS.md` block, and the two skills written here: `design-reference-hunt` and `design-md`.
- `init` asks which agents. `--yes` uses Cursor and Claude Code.
