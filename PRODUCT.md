# Long Beard — what this is

Read this before changing the catalog, the installer, or a skill we own. The public install story is [README.md](README.md). The router that lands in other projects is generated from [beard.json](beard.json).

## Job

A drop-in kit so agents you already use (Cursor, Claude Code, and the rest) produce small, correct, well-designed work. Two commands: `init`, then later `update`.

It is not an agent runtime. It is not a marketplace. It is not a replacement for Cursor or Claude commands. It is not Ruflo.

The product is Long Beard. The GitHub repo is `jonanderdev/longbeard`. The npm package is `@jonanderdev/longbeard`. The command is `longbeard`.

## Shape

- Curated catalog in `beard.json` (`items`, optional `kind`, default `skill`). Skills stay with their authors. Do not vendor other people’s skills.
- Installer: `bin/long-beard.js`. Pins Skills CLI `skills@1.7.2`. `--agent` **adds** to the defaults; it does not replace them.
- One block in the project’s `AGENTS.md`, between `<!-- longbeard:start -->` and `<!-- longbeard:end -->`. Do not write `CLAUDE.md` or Copilot files unless asked.
- Local skills we own live under `skills/` and use `"source": "local"`. Today: `design-md` (keep) and `design-reference-hunt` (prototype).
- A project can omit or add skills in `beard.local.json`. Init is blocked inside this repository.

Few skills. One job each. No two skills that do the same job. Few tokens. A skill that stops earning its place is dropped.

`kind` is the door to grow past skills later. Until a new kind has an installer, do not catalog it. MCP servers (for example Awwwards search) are not a `skill` and `init` cannot wire them yet.

## Design stack

Official look wins, in this order:

1. This project’s `DESIGN.md` → `design-md`. If it is missing, ask. Do not invent a look.
2. A Figma file or link → `figma-design-to-code`.
3. A picture they already have → `image-to-code` (optional).
4. No official look → `design-reference-hunt` writes `.design/board.md`, then `design-taste-frontend` **builds in the same turn**.
5. `web-design-guidelines` only when they ask for a UI review.

Taste is the builder. Hunt is the missing first step (live references, not a frozen gallery). Do not add a second “build an Awwwards site” skill.

Hunt board: **Sites** (exactly 3 live websites or app screens that match the brief) and **Material** (imagery / type / marks). Taste follows Sites for structure, Material for pictures and type. A Dribbble illustration is imagery, never a site. Shots: full page, cookies accepted, one image with no repeated scroll chunks. Awwwards **jury** lines are quoted from the Awwwards page or omitted — never invented.

`design-reference-hunt` is a prototype in this repo. If it earns its place, move it to its own repository and point `beard.json` at that source. Do not ship public hunt skills we already tried: they wrote Claude paths, mixed imagery with sites, and searched with stale years.

Do not put model-picker warnings in the kit. A skill that needs the current year should say so.

## How to know it worked

Installed ≠ used. There is no usage logger in v1 (Cursor has no reliable skill-used hook we will ship). Judge the work: ponytail ends with what it did not check; hunt writes `.design/board.md`; taste runs `draw.mjs` / `inspect.mjs` and a real browser.

Smoke project (outside this git tree): `../longbeard-smoke`. After changing a local skill, copy `skills/<name>/` into that project’s `.agents/skills/<name>/` (and `.claude/skills/` if present) and rewrite the `AGENTS.md` block to match `beard.json`. Do not run `longbeard init` in *this* repo.

## Do not

- Discuss skills in the README that are not in the catalog.
- Treat Awwwards as a style to copy (gates, WebGL, custom cursors). It is a jury, and only when quoted.
- Monitor skill use, or add competing design builders, “for completeness.”
