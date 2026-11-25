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

The design work is a family of small skills. Each does one job, reads its inputs from files, writes one doc, and ends by naming the next step, so each can start in a fresh session. This skill only reads the project and suggests.

It ends in work they can deliver: `DESIGN.md`, and a Figma file of their own (variables, styles, the identity board, components, every key screen with its states). Say so in one line the first time you suggest a step in a project with no design docs, never again.

## The family

Each skill's top lines say what it **Needs**, **Uses if there** and **Writes**: read those, not this table, to see what a skill is missing.

| Skill | Job |
|---|---|
| `design-brief` | The questions a designer asks before looking: what the first screen must do, feel and never-feel, who to stand apart from, what is fixed |
| `design-moodboard` | Read their board and fill its gaps, or find references they mark like or no; each like keeps its product's other screens; a big board is grouped by eye into headings |
| `design-direction` | Pictures of the subject, then eight first screens, each one of their references adapted to the product as a designer would (never a copy), with a move or two from the others; nothing off the board, nothing they said to leave out. One agent builds them, scripts check contrast and clipped text; they choose, or ask for more or a mix |
| `design-identity` | The chosen screen's type and colours, refined on it from rendered options and a few bounded controls; the identity board |
| `design-prototype` | The key screens and their states in the chosen screen's frame, each page opening with its own job, checked by script and shown as one set; approved → `DESIGN.md` |
| `design-figma` | Tokens, the identity board, components and Ready frames |
| `design-content` | Optional, any time. What each screen says and shows: copy, and the full picture list |
| `design-wordmark` | Optional, after the identity. A mark made from the chosen type |
| `design-check` | Checks a screen against the rules and `DESIGN.md` |

**Two folders.** `docs/design/` is committed: the docs describe the style, never a source (no brand, site, person, link, or path into `.longbeard/`). `.longbeard/design/` is the agents' working folder, gitignored, and may not survive; the docs carry the meaning. On the first write of either, add `.longbeard/design/` to `.gitignore` if it is missing, and say why in one line. An older `design-exploration/` folder is left alone.

## What to suggest

Look at the repo; do not ask what is there. Read the design brief's `pace` first: at `quick`, skip what is marked optional and say so. Then say in up to four lines where the project stands and the one next step, with the reason.

1. No `docs/brief.md` → `idea`. The brief says no UI → nothing to design; say so.
2. No `docs/design/design-brief.md` → `design-brief`.
3. No moodboard (no `design-moodboard.md`, and no board or folder named) → `design-moodboard`. Never skipped.
4. **The board's size:** under about 8, or a key screen nothing shows → `design-moodboard` for the gap only (at `quick`, three are enough).
5. No `design-direction.md` → `design-direction`.
6. No `design-identity.md` → `design-identity`.
7. No `DESIGN.md` → `design-prototype`.
8. `DESIGN.md` and no Ready frames → `design-figma`.
9. `DESIGN.md` exists → a feature: `design-prototype` (feature loop). A rebrand starts again at `design-direction`.

A graphic takes the same steps and ends at its exported Figma frame; never offer Architecture.

Offered once, never pushed, not at `quick`: `design-content` when they ask about copy or imagery or need more pictures than the direction found; `design-wordmark` once the identity is chosen and the name is only set in the display face. A no stands.

> You have a brief, a design brief and a moodboard of 34 references. Next: **design-direction**, eight first screens built from them. Your board is small enough to skip sorting.

Then stop. They type the skill, or say yes and you load it.

**A `DESIGN.md` they bring** has no token tables of ours (rows like `color/ink`). Until `design-prototype` writes ours, steps 7 to 9 treat it as none: say so once, and offer it as the identity's starting point, every value in it kept unless they change it.

## Do not

- Run a skill without their yes, or two at once.
- Write any doc yourself. Each belongs to its skill.
