# DESIGN.md template

Write the whole file once, from the approved prototype. A builder follows it without the prototype or the references open. Short lines. Our words, never a reference's name.

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
| Token | Face, weight | Size / line height | Use |
|---|---|---|---|
| type/heading | … | …/… | screen titles |
| type/body | … | …/… | body, lists |

- Licence: <covers how this ships: web, app bundle>

## Spacing
- Density: <airy | balanced | dense, from the design brief, and what it means here: rows per screen, how much before "more">
- Scale: <space/sm 8, space/md 16, …>
- <how the scale is used: inside components, between items, between groups, between sections>
- Corner radius: <value, and where>

## Components
- <component>: <what it is for, its variants, its states>

## Motion
- <the design brief's picks as built: how much, driven by, feel and where it applies, moments, or "none: state changes only"; durations, what moves and when; reduced motion turns it off>

## Accessibility
- Level: <AA | AAA, from the design brief>. Every contrast pair above meets it; design-check checks against it.

## Imagery
- <what the pictures are and how they are treated, or "none">

## Decisions
- <date>: <what was decided> — <the reason>. <Soft rule overridden, if any: rule number and why>

## Do not
- <what we leave, as ideas: "a bright brand accent", never whose>
```

- Every token name is its code name, and the same name in Figma.
- Every colour pair in the table has been through `scripts/contrast.mjs`. No FAIL is written.
- More than one theme: one row per token, with a value column per theme. Every pair is checked in each theme.
- A section with nothing to say is left out, not filled with a guess.
