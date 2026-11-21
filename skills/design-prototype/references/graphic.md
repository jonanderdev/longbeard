# Prototype for a graphic

Read when the product brief's surface is a graphic. Everything in `SKILL.md` holds except what is said here. A piece counts as a screen wherever the skill says screen.

For a single piece the prototype finishes the chosen piece and nothing else. For a set it also builds the other pieces. Either way `DESIGN.md` is written, short, so `design-figma` and the router work as they do for any project.

## First pass

1. **Finish the chosen piece.** `first.html` is fixed at the format's size, so `home.html` is the same page at that size, not responsive, and `first.html` stays beside it. Keep the faces loaded at the size and the direction's devices untouched. Spacing options, widths, states and walks do not apply. The facts the direction left for the prototype (a second language, the small print) are placed in the composition's own system. A fact the brief marks missing stays a stand-in, marked, and listed under Still to supply.
2. **A set.** List the other pieces and their sizes once, and ask "Change the list?" Each is built from the chosen piece: reflowed to its size, never scaled, with the same type, colours, devices and facts. A story is tall, a square is square. Each takes the same touch-up as the first. A piece's own choices (which fact leads when there is less room) are named, never silent. A single piece skips this.
3. **The self-check.** Capture each piece whole: `--width <w> --clip 0,0,<w>,<h>` at its working size. Then:
   - **Contrast:** `screen-contrast.mjs` as usual.
   - **Rules script:** run `rules.mjs` with `--widths <the piece's width>`. Read only its copy findings (rule 11) and its cut text (rule 5). Its sideways scroll is reported "not checked" above 480 px. Its targets, focus and labels do not apply to a graphic: report any it prints as "not applicable to a graphic" in the self-check. Never fix or waive them, and ignore its exit code and its round count for them.
   - **Walks:** `links.mjs` and the flow walks are not run. The five-second check is, on each piece, at the size it reaches the eye (see the direction's graphic reference).
   - **Facts:** every fact in the brief is on the piece, spelt as the brief gives it.
   - **Trim:** nothing important sits in the trim or the safe margin.

## DESIGN.md

Written from the template, once, on their yes. Sections that do not apply say "none" and why.

- **Idea, Voice, Colour, Type, Imagery, Accessibility, Still to supply, Decisions:** as written.
- **Format** goes under Decisions: its size, orientation, print or screen, and the pieces of a set.
- **Spacing:** the margin and the grid the piece holds, in a line or two. Components: none. Motion: none.
- A set or a brand that will make more adds components and spacing when a later piece needs them.

Then the next step: `design-figma`.
