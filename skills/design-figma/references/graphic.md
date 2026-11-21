# Figma for a graphic

Read when the product brief's surface is a graphic. Everything in `SKILL.md` holds except what is said here. A piece counts as a screen wherever the skill says screen.

A graphic's run ends here. Nothing is offered after the exported frame: no Architecture, no Plan.

## Build

- **One frame per size.** A single piece is one frame. A set is one frame for each piece, side by side, named `<piece> — <width>×<height>`.
- **Pages:** Cover, Foundations, `Pieces`, `Explorations`. There is no `Components` page unless a set repeats a block (a footer, a date lockup) that each piece reuses. Then it holds that one component and nothing else.
- **No state frames.** A piece has no empty, loading or error. Rule 8 does not apply, so a missing state is not a finding.
- **Tokens, the Cover board, faithful build, stand-in notes, and Ready** are as in the skill. Variables and styles still come from `DESIGN.md`.
- **A print piece's frame includes the bleed** (3 mm unless they give one), with an inner frame named `Trim` where it is cut. Nothing important sits in the trim.
- **Check each frame** with `design-check` frame mode and the Graphics list in the rules.

## What is delivered

Say it plainly, in the file's `DESIGN.md` under Decisions and to them, before the export:

- **Delivered:** each frame exported as a PNG at its size, and for print also a PDF at the trim size plus bleed. Both are RGB. The export settings are set on the frame, so they can export again.
- **Not delivered:** CMYK, spot colours, crop marks, a colour-managed proof or any prepress. Figma works in RGB. If a printer needs them, that step is done in a print tool, not here.
- **Assumptions are said and theirs to change:** the bleed (3 mm), and the print resolution the PNG scale gives (300 ppi). A scale or a size that could not be checked in the file is "not checked".

## Then

Say in two lines what they have: the frame or frames in their own Figma file, with its link, and the exports. Offer to delete `.longbeard/design/` working files as the skill says. Then stop. Do not offer `/grill-with-docs`, even though no `GLOSSARY.md` exists.
