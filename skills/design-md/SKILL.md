---
name: design-md
description: >
  Use when building or changing UI and the project has a DESIGN.md, or when
  the user asks to write or follow a brand file. Follow that file.
  If they asked to design a page and there is no DESIGN.md and no Figma,
  that is design-reference-hunt, not this skill. Do not invent a look.
---

# DESIGN.md

The project's `DESIGN.md` is the look.

If that file exists, read it before writing UI. Use its color, type, spacing, and components the way that file states them. They asked to **hunt references** → load `design-reference-hunt`. Do not rewrite this file from that hunt.

If it does not exist:

- They asked to **design a page or a piece** and there is no Figma → load `design-reference-hunt`. Do not ask what the brand is.
- They asked to **hunt references** → load `design-reference-hunt`.
- They asked for a **brand file / DESIGN.md** → ask which reference to follow. Write the file only when they want one.

Leave brand catalogs out of the repo. Leave a second visual system out when one already exists.
