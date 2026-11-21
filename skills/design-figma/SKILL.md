---
name: design-figma
description: >
  Build the approved design in Figma: variables and styles from DESIGN.md, the
  identity board on the Cover, only the components the key screens need, the
  key screens and every reachable state, each checked with design-check and
  marked Ready on approval. Runs when DESIGN.md exists and its screens have no
  Ready frames, or for a feature's screens. Figma is required for UI projects.
---

# Design Figma

**Needs:** `DESIGN.md`, `docs/design/design-identity.html`  
**Writes:** Ready Figma frames

Figma is the truth for screens. `DESIGN.md` is the written summary of the rules behind them. This skill builds the first from the second, faithful to the approved prototype.

Load `figma-use`, `figma-generate-library` and `figma-generate-design`, and follow them. This skill adds only what they do not decide.

## Gate

1. No `DESIGN.md` → `design-prototype` first. Stop.
2. No Figma connection → say Figma is required for UI projects, and stop.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

Open the approved prototype (`.longbeard/design/prototype/`) beside every screen you build. If it is gone, work from `DESIGN.md` and say so.

## Rules

- **One file per product.** A new one if the project has none. Its URL goes in `DESIGN.md`.
- **Our tokens, not a kit.** Variables and styles come from `DESIGN.md`. New files can come with community kits attached; their steps say to reuse them. Do not: search the file only, and build what is missing from `DESIGN.md`. Read its tables or the token block at the top (the same tokens, written from the tables); if they differ, the tables win and `design-check` docs mode reports it.
- **Build, do not capture.** Compose screens from tokens and components. Never run `generate_figma_design` on the prototype. For pictures, create the image frames, then `upload_assets` the prototype's own files.
- **Themes are modes.** One colour collection, a mode per theme; each screen built once. If Figma refuses the modes, stop and ask.
- **Pages:** Cover, Foundations, Components, one `Screens — <flow>` per flow in the brief, `Explorations` for anything kept for later.
- **Order:** tokens and styles → the Cover board → only the components the key screens need → the key screens → their states. The library grows with features.
- **States:** a frame for each of empty, loading and error a person can reach, beside the default. One nobody can reach gets no frame: add it, with the reason, under Decisions in `DESIGN.md`.
- **Names:** `<screen> — <state>`; `<screen> · <device> — <state>` when the layout differs by device. Never the theme.
- **Components have their states:** focus and pressed for every control, before a screen uses it.
- **One text style per weight used.** A weight `DESIGN.md` lacks is a new style and a new row there.
- **Trust the file, not the picture.** Screenshot only after an edit returns, and read text back from the nodes. Re-wire a cloned variant's text properties; replace a swapped instance that keeps old overrides.
- **Stand-ins are said on the frame.** Each item under Still to supply in `DESIGN.md` gets a short note beside the frame that shows it (what is a stand-in or assumed, and what replaces it), and a stand-in picture's layer is named `… (stand-in)`. The note is not part of the design. It stays until the real one is in.
- **Finish and motion.** A static finish (a grain, a shadow, a blend) is built as fills and effects from the Finish line. Motion Figma cannot carry (scroll, physics) is a note beside the frame, from the Motion section, and not built.
- **Faithful.** Match the approved prototype. Anything that cannot be built the same way: say so and ask. Never simplify silently.
- **Check each screen** with `design-check` frame mode, passing the prototype shot. Fix its hard findings.
- **Ready:** on their yes to a frame, add `— Ready` to its name. Tickets link Ready frames.

## The Cover: the identity board

Rebuild `docs/design/design-identity.html` on one frame, `Identity`, on the Cover page: the same board they approved, now bound to the variables and styles. Primary and secondary type at size with their names; every colour as a squircle swatch with its token name and value, for each theme. Add the wordmark if `design-wordmark` made one.

- Every fill, text and radius bound to a variable or style, so the board changes when the tokens do.
- Real copy: the name and one line in the voice. No reference's name or picture.
- Screenshot it, read the text back, and show it. A no is a change to `DESIGN.md` first, then the board again. It is not marked Ready: it is not a screen.

If a Figma decision changes a rule (a new token, a variant, a spacing step), update `DESIGN.md` in the same turn and say what changed.

## Then

Say in two lines what they now have: a Figma file of their own, with its link, built from variables and components, so a change to a token changes every screen. They can keep working in it by hand or by asking; a change to a rule goes into `DESIGN.md` too.

Offer to delete `.longbeard/design/` working files: the docs, `DESIGN.md` and Figma carry the result. On no, leave them; they are gitignored. Then the next stage the router lists: architecture, which they start by typing `/grill-with-docs`. A design-only install has none, and ends here.

## Do not

- Use a community kit's components or variables.
- Build the whole component library before the screens need it.
- Mark a frame Ready that lacks a reachable state or has open hard findings.
- Name a reference in a layer, description or comment.
