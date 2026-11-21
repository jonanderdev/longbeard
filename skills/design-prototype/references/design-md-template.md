# DESIGN.md template

Write the whole file once, from the approved prototype. A builder follows it without the prototype or the references open. Short lines. Our words, never a reference's name.

The tables are the source. Write them, then run `tokens.mjs` (see the notes below): it puts the same tokens at the top of the file as a front-matter block, so a tool that reads the published DESIGN.md format can take the design without Long Beard. Never write the block by hand.

```markdown
# Design

Figma: <file URL>. Figma is the truth for screens. This file is the rules behind them.

## Idea
<one sentence: what this product's look says>
- ownable: <the one element made from the product's own identity, as approved on the prototype>

## Voice
- <three adjectives>
- <one sample line, and one line it would never say>

## Colour
| Token | Value | Use |
|---|---|---|
| color/bg | #… | page ground |
| color/ink | #… | body text |
| … | | |

Contrast (scripts/contrast.mjs, at the level under Accessibility):
- color/ink on color/bg: <ratio> <AA | AAA>
- <every text, control and focus pair>

## Type
| Token | Face, weight | Size / line height | Tracking | Use |
|---|---|---|---|---|
| type/heading | Fraunces, 600 | 48 / 1.1 | -0.02em | screen titles |
| type/body | Inter, 400 | 18 / 1.5 | | body, lists |

- Licence: <covers how this ships: web, app bundle>

## Spacing
- Density: <airy | balanced | dense, from the design brief, and what it means here: rows per screen, how much before "more">
- <how the scale is used: inside components, between items, between groups, between sections>

| Token | Value | Use |
|---|---|---|
| space/sm | 8 | inside a control |
| space/md | 16 | between items |
| radius/md | 8 | cards and controls: where, and where not |

## Components
- <component>: <what it is for, its variants, its states>

## Motion
- <the design brief's picks as built: how much, driven by, character and where it applies, moments, or "none: state changes only"; what moves and when; reduced motion turns it off>

| Token | Duration | Easing | Use |
|---|---|---|---|
| motion/state-change | 100ms | ease-out | hover, focus, press |
| motion/enter | 250ms | cubic-bezier(0.2, 0, 0, 1) | a surface coming on |

## Accessibility
- Level: <AA | AAA, from the design brief>. Every contrast pair above meets it; design-check checks against it.

## Imagery
- <what the pictures are and how they are treated, or "none">

## Still to supply
- <screen>: <what the stand-in picture shows, or the assumed fact as shown> — <stand-in | assumed>. <What replaces it>
- Written even when empty: "Nothing: every picture and fact is theirs."

## Decisions
- <date>: <what was decided> — <the reason>. <Soft rule overridden, if any: rule number and why>

## Do not
- <what we leave, as ideas: "a bright brand accent", never whose>
```

- Every token name is its code name, and the same name in Figma. A token is `group/name`: `color/`, `type/`, `space/`, `radius/`, `motion/`.
- Values are plain: a hex or a css colour for colour, a number (px) or a unit for sizes, a weight as a number or its name, a line height under 4 as a multiplier, durations in ms. A table with no tokens of a kind (a design with no motion) leaves that kind out.
- `tokens.mjs` reads every table row whose Token starts with one of those groups, and writes the block: `colors`, `typography`, `rounded`, `spacing` and `motion`, with `version` and `name`. It adds `primary`, the one name the format expects, pointing at `color/primary` if the table has it, else `color/accent`, else `color/ink`. Our names stay as they are. `--check` exits 1 when the block and the tables disagree.
- Every colour pair in the table has been through `scripts/contrast.mjs`. No FAIL is written.
- More than one theme: one row per token, with a value column per theme, headed by its name (Light, Dark). Every pair is checked in each theme. The block groups them under `colors.light` and `colors.dark`.
- A section with nothing to say is left out, not filled with a guess. Still to supply is the one that stays: its "nothing" says it was checked.
