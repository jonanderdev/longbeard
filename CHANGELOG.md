# Changelog

## Unreleased

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
