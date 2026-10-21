# Changelog

## Unreleased

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
