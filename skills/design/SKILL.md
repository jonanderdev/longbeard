---
name: design
description: >
  The way into the design-* skills. Reads what the project already has and
  says which design skill to run next, and why, in a few lines. It suggests;
  they choose, and any design-* skill can be called directly instead. Runs when
  docs/brief.md exists, the brief has a UI, and there is no approved DESIGN.md,
  or when they ask what to do next on the look.
---

# Design

The design work is a family of small skills. Each does one job, reads what it needs from files, writes one doc, and ends by naming what could come next. None depends on the chat before it, so each can start in a fresh session. This skill only reads the project and suggests.

## The family

| Skill | Job | Needs | Writes |
|---|---|---|---|
| `design-brief` | The questions a designer asks before looking: what the first screen must do, feel and never-feel, yes and no, who to stand apart from, what is fixed | `docs/brief.md` | `docs/design/design-brief.md` |
| `design-moodboard` | Find references, or read their board and fill its gaps | design brief | `docs/design/design-moodboard.md` |
| `design-families` | Optional. Sort a big board or search into looks; they take one or two | a board | `docs/design/design-families.md` |
| `design-identity` | Type pairing and colours, picked on rendered options, ending in the identity board | design brief (a moodboard helps) | `docs/design/design-identity.md` and `.html` |
| `design-direction` | First screens dealt from the references in the identity; they pick; a hierarchy pass | brief, moodboard, identity | `docs/design/design-direction.md` |
| `design-screens` | The key screens and their states in that direction; approved → `DESIGN.md` | direction | `DESIGN.md` |
| `design-figma` | Tokens, the identity board, components and Ready frames | `DESIGN.md` | Figma |
| `design-content` | Optional, any time. What each screen says and shows: copy, pictures, stand-ins | design brief | `docs/design/design-content.md` |
| `design-wordmark` | Optional, late. A mark made from the chosen type | identity, brief | adds to `design-identity.md` |
| `design-check` | Checks a screen against the rules and `DESIGN.md` | a screen | findings |

## Where things go

- **`docs/design/`** is committed and kept up to date: the design docs above. They describe the style ("a condensed grotesk at a fifth of the width, cropped at the right edge"), never a source: no brand, site, studio, designer or person, no link, and no path into `.longbeard/`. A doc that needs a reference to make sense is written again until it does not.
- **`.longbeard/design/`** is the agents' working folder, gitignored: captured references, Figma crops, pickers, contact sheets, profiles, dealt grids, sketches, prototypes. Nobody needs to open it; when there is something to look at, the skill gives the path. It may not survive (a cloud session, a clean checkout): the docs carry the meaning, and a skill that needs a reference again captures it again or says it cannot.

On the first write of either, add `.longbeard/design/` to `.gitignore` if it is missing, and say why in one line. A project with an older `design-exploration/` folder keeps it: nothing writes there any more.

## What to suggest

Look at the repo. Do not ask what is there. Then say, in up to four lines, where the project stands and what to run next, with the reason. Name one next step, and the optional ones only when they earn it.

1. No `docs/brief.md` → `idea` first. The brief says no UI → there is nothing to design; say so.
2. No `docs/design/design-brief.md` → `design-brief`. Every other skill needs it.
3. No moodboard (no `design-moodboard.md`, and they have not named a board or a folder) → `design-moodboard`. Identity can come before it, but options read from references they like beat options from words: say so if they want to start with identity.
4. **The board's size decides families.**
   - Over about 60 references, or a search that came back that big, unsorted → offer `design-families` once: "Your board has 240 references. Sort it into families before choosing?"
   - About 8 to 60 → no sorting. A board this size is already chosen.
   - Under about 8, or a key screen nothing on the board shows → `design-moodboard` for the gap only.
5. No `design-identity.md` → `design-identity`.
6. No `design-direction.md` → `design-direction`.
7. A direction and no `DESIGN.md` → `design-screens`.
8. `DESIGN.md` and no Ready frames → `design-figma`.
9. `DESIGN.md` exists → a feature: `design-screens` (feature loop). A rebrand starts again at `design-identity`, and `DESIGN.md` stays until a new one is approved.

**Offered once, never pushed:**
- `design-content`, when they have no pictures of their own (the design brief says "none yet"), or ask about copy or imagery. Stand-ins of the product's own subject make every later screen read as this product.
- `design-wordmark`, once `DESIGN.md` exists and the name is only set in the display face. Offered once; a no stands.

Example:

> You have a brief, a design brief and a moodboard of 34 references. Next: **design-identity**, to pick the type and colours from them. Your board is small enough to skip sorting.

Then stop. They type the skill, or say yes and you load it.

## Do not

- Run a skill for them without their yes, or run two at once.
- Suggest `design-families` for a board they already curated to a few dozen.
- Write any doc yourself. Each belongs to its skill.
