---
name: design
description: >
  The way into the design-* skills. Reads what the project already has and
  says which design skill to run next, and why, in a few lines. It suggests;
  they choose, and any design-* skill can be called directly instead. Runs when
  docs/brief.md exists, the brief is a site, an app or a graphic, and there is no approved DESIGN.md,
  or when they ask what to do next on the look.
---

# Design

The design work is a family of small skills. Each does one job, reads what it needs from files, writes one doc, and ends by naming what could come next. None depends on the chat before it, so each can start in a fresh session. This skill only reads the project and suggests.

## Where it ends

This is a designer's process, a few short steps with their choice at each, and never one prompt to a finished page. It ends in work they can deliver: `DESIGN.md`, and a Figma file of their own (variables, styles, the identity board, components, every key screen with its states) that they keep changing by hand or with their agent. Say so in one line the first time you suggest a step in a project with no design docs. Never again after that.

## The family

Each skill says at its top what it **Needs**, what it **Uses if there**, and what it **Writes**. Read those lines, not this table, to see what a skill is missing before you suggest it.

| Skill | Job |
|---|---|
| `design-brief` | The questions a designer asks before looking: what the first screen must do, feel and never-feel, yes and no, who to stand apart from, what is fixed |
| `design-moodboard` | Find references, or read their board and fill its gaps |
| `design-families` | Optional. Sort a big board or search into looks; they take one or two |
| `design-direction` | Three or four pictures of the subject, then eight first screens, each one of their references rebuilt with the product's content and changed by a move or two borrowed from the others; nothing that is not on the board. They choose; a light touch-up pass |
| `design-identity` | The type pairing and colours of the chosen screen, refined on it from close, rendered options; ends in the identity board |
| `design-prototype` | The key screens and their states in that direction; approved → `DESIGN.md` |
| `design-figma` | Tokens, the identity board, components and Ready frames |
| `design-content` | Optional, any time. What each screen says and shows: copy, and the full picture list |
| `design-wordmark` | Optional, after the identity. A mark made from the chosen type, judged in the chosen screen |
| `design-check` | Checks a screen against the rules and `DESIGN.md` |

## Where things go

- **`docs/design/`** is committed and kept up to date: the design docs above. They describe the style ("a condensed grotesk at a fifth of the width, cropped at the right edge"), never a source: no brand, site, studio, designer or person, no link, and no path into `.longbeard/`. A doc that needs a reference to make sense is written again until it does not.
- **`.longbeard/design/`** is the agents' working folder, gitignored: captured references, Figma crops, pickers, contact sheets, profiles, direction screens, sketches, prototypes. Nobody needs to open it; when there is something to look at, the skill gives the path. It may not survive (a cloud session, a clean checkout): the docs carry the meaning, and a skill that needs a reference again captures it again or says it cannot.

On the first write of either, add `.longbeard/design/` to `.gitignore` if it is missing, and say why in one line. A project with an older `design-exploration/` folder keeps it: nothing writes there any more.

## What to suggest

Look at the repo. Do not ask what is there. Read the design brief's `pace` first: with `quick`, skip what the steps below mark optional, and say so in the suggestion. Then say, in up to four lines, where the project stands and what to run next, with the reason. Name one next step, and the optional ones only when they earn it.

1. No `docs/brief.md` → `idea` first. The brief says no UI → there is nothing to design; say so.
2. No `docs/design/design-brief.md` → `design-brief`. Every other skill needs it.
3. No moodboard (no `design-moodboard.md`, and they have not named a board or a folder) → `design-moodboard`. The direction is built from it, so it is not skipped.
4. **The board's size decides families.**
   - Over about 60 references, or a search that came back that big, unsorted → offer `design-families` once: "Your board has 240 references. Sort it into families before choosing?" (Not at `pace: quick`.)
   - About 8 to 60 → no sorting. A board this size is already chosen.
   - Under about 8, or a key screen nothing on the board shows → `design-moodboard` for the gap only. At `pace: quick`, three or more references are enough: go on.
5. No `design-direction.md` → `design-direction`.
6. No `design-identity.md` → `design-identity`.
7. A direction and an identity, and no `DESIGN.md` → `design-prototype`.
8. `DESIGN.md` and no Ready frames → `design-figma`.
9. `DESIGN.md` exists (one the design skills wrote) → a feature: `design-prototype` (feature loop). A rebrand starts again at `design-direction`, and `DESIGN.md` stays until a new one is approved.

A graphic (the brief's surface) takes the same steps and ends at its exported Figma frame, so never offer Architecture; its other pieces are `design-prototype`.

**Offered once, never pushed** (and not at `pace: quick`):
- `design-content`, when they ask about copy or imagery, or the key screens need more pictures than the three or four `design-direction` found.
- `design-wordmark`, once the identity is chosen and the name is only set in the display face. Offered once; a no stands. No mark is a fine answer: the name in the right face is often the brand, and not every screen needs to show it.

Example:

> You have a brief, a design brief and a moodboard of 34 references. Next: **design-direction**, eight first screens built from them. Your board is small enough to skip sorting.

Then stop. They type the skill, or say yes and you load it.

**A `DESIGN.md` they bring** (one with no `docs/design/` beside it) in the published DESIGN.md format, with its token block at the top, is said once and offered as the identity's starting point. Every value in it is their choice: kept unless they change it, and never replaced by ours. It does not count as step 9, and it is not rewritten.

## Do not

- Run a skill for them without their yes, or run two at once.
- Suggest `design-families` for a board they already curated to a few dozen.
- Write any doc yourself. Each belongs to its skill.
