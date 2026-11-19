# Figma

From `design` step 10, after their yes to `DESIGN.md`.

Load `figma-use`, `figma-generate-library` and `figma-generate-design`, and follow them. This skill adds only what they do not decide.

- **One file per product.** A new one if the project has none (`figma-create-new-file`). Put its URL in `DESIGN.md`.
- **Our tokens, not a kit.** Variables and styles come from `DESIGN.md`. New files may come with community kits attached (Material, Apple, Simple Design System). Their discovery steps tell you to reuse them. Do not: search the file only (no `includeLibraryKeys`), and build what is missing from `DESIGN.md`.
- **Build, do not capture.** Compose screens from the tokens and components. Do not run `generate_figma_design` on the prototype. It is a throwaway with a switcher. For pictures, create the image frames, then `upload_assets` the prototype's own files with those `nodeIds`.
- **Themes are modes.** One colour collection with a mode per theme. Each screen is built once and switches with the mode, never a colour set or a frame per theme. If Figma refuses the modes, stop and ask. Never fall back to separate sets.
- **Pages:** Cover (the board), Foundations, Components; one `Screens — <flow>` page per flow from the brief; `Explorations` for anything kept for later, by date.
- **Order:** tokens and styles from `DESIGN.md` → the board → only the components the key screens need → the key screens → their states. The library grows with features. It is not built ahead.
- **States:** every screen has a frame for each of empty, loading and error that a person can reach, next to the default. A state nobody can reach gets no frame: add the screen, the state and the reason under Decisions in `DESIGN.md`.
- **Names:** `<screen> — <state>`. When a screen's layout differs by device, `<screen> · <device> — <state>`. The state can describe itself. Theme is never in the name.
- **Components have their states too:** focus and pressed for every control, before a screen uses it.
- **One text style per weight used.** Changing a font on styled text detaches it. A weight `DESIGN.md` does not list is a new style, and a new row there.
- **Trust the file, not the picture.** Take a screenshot only after the edit has returned, and read text back from the nodes. A cloned variant loses its text property links: wire them again. Swapping an instance can keep old overrides: replace it with a fresh one.
- **Be faithful to the approved prototype.** It is what they said yes to, and Figma is that design, not a new reading of it. Tokens carry the values, not the whole design, so work with the approved variant open and match it. If something cannot be built the same way, say so and ask. Never simplify it silently.
- **Check each screen** with `design-check` frame mode before showing it, passing the prototype shot. Fix its hard findings.
- **Ready:** when they approve a frame, add `— Ready` to its name. Tickets link Ready frames, and build is checked against them.

## The board

Before any component, lay the whole look out on one frame, `Board`, on the Cover page: a bento of tiles in different sizes that shows the identity at a glance, the way a studio presents a brand. It is where they see colour, type, imagery and voice working together, and where a weak look shows before a screen is built on it.

- **What it holds**, each its own tile: the product's name set in the display face; the type, each text style named and shown in use; the colours, each token as a swatch with its name, and every theme; two or three of the prototype's real pictures, cropped hard; one line in the voice, set large; a crop of an approved key screen in a device frame; the `ownable`; and, if the brief has one, a number or fact about the product set very large. Add a tile for anything else that makes this look this look (a mark, a shape, an illustration). Leave out a tile that would be empty.
- **Composed, not listed.** One tile leads and is the largest; the rest vary in size and in which colour they sit on. Tiles share one gap and one radius from `DESIGN.md`. Text sits on its tile's colour at the contrast `DESIGN.md` checked.
- **Real, and bound.** Every fill, text and radius is bound to a variable or style: the board is the tokens in use, and changes when they change. Copy comes from the brief and the prototype, pictures from `prototype/img/`. No placeholder, no reference's name or picture.
- **Their yes.** Screenshot it, read the text back from the nodes, and show it. Ask whether this is the product. A no is a change to `DESIGN.md` and the prototype first, then the board again. It is not marked Ready: it is not a screen, and nothing is built from it but the feeling.

If a Figma decision changes a rule (a new token, a component variant, a spacing step), update `DESIGN.md` in the same turn and say what changed.
