---
name: design-brief
description: >
  The questions a designer asks a client before looking for anything: what the
  first screen must make someone think and do, the personality, how it should
  feel and never feel, who it must stand apart from, and what is already fixed.
  One message of questions with suggested answers from the product brief, one
  read-back, and the answers written to docs/design/design-brief.md. Runs after
  docs/brief.md exists and the brief has a UI, before any other design-* skill,
  or when the feel of the product changes.
---

# Design brief

**Needs:** `docs/brief.md`  
**Writes:** `docs/design/design-brief.md`

One doc comes out, `docs/design/design-brief.md`, committed. Every other design skill reads it, so nobody is asked the same question twice. It records what they want the look to do, in words. It chooses no look: no layout, colour, typeface or style name.

## Gate

1. No `docs/brief.md` → `idea` first. Stop.
2. The brief says no UI → nothing to design. Stop.
3. A design brief exists → this is a change. Read it, ask only about what changes, and add a line under **Changes** with the date and why.

## The round: one message, then wait

Read `docs/brief.md` first. It gives the subject, the people, the surface, the key screens, the position and the identity nouns. Never ask for those again. Ask only what the product brief cannot answer.

Every question carries a suggested answer in brackets, drawn from the brief, so "yes" settles it. A suggestion is the agent's best reading of the brief, never a look.

```
Before any design, a few questions. Each has my suggestion in brackets: "yes" takes it, "go" takes all of them.

1. First screen, in five seconds: what should someone think, and what should they do? [<from the brief's remembered-for and first flow>]
2. Personality, 1 to 5 (skip any you don't mind):
   quiet 1 · · · 5 loud
   type-led 1 · · · 5 picture-led
   plain 1 · · · 5 rich
   warm 1 · · · 5 cool
   [<a suggestion for each, or "no lean">]
3. How should it feel, and never feel? Anything you tried before and didn't like, and why?
4. Sites, apps, brands, books or places you love for this? (They steer the moodboard; their names stay out of the docs.)
5. Who should it stand apart from, and should it fit in with them or stand out? [<the alternatives the brief names>]
6. What is fixed? Colours, typefaces or a logo you own or refuse; light, dark or both; your own pictures, or none yet; languages; an accessibility level. [<what the brief or the repo shows>]
7. Do you have a moodboard already? A Figma link, a folder, screenshots or links.

Anyone else who has to say yes?
```

Never search, open references or propose a look in this turn.

## Read back, once

One line, then their yes or a correction:

> Leads with <takeaway>; quiet 2, picture-led 4, warm 2; never <…>; apart from <kind of product>; fixed: <…>; a moodboard in Figma. Right?

A correction is one more line, not a second round. Answers that contradict the product brief are `grilling`, not this skill.

## Write `docs/design/design-brief.md`

```markdown
# Design brief: <product>

- takeaway: <what someone thinks in five seconds, and the one thing they do>
- personality: quiet <n> · picture-led <n> · rich <n> · cool <n> (or "no lean")
- feel: <their words>
- never: <their words, and what they tried and did not like, as looks, not names>
- apart from: <the kind of product it must not be mistaken for, described, and fit in or stand out>
- fixed: <owned or refused colours and faces as values, light/dark/both, pictures: theirs or none yet, languages, accessibility level>
- voice: <how it talks, from the brief's personality, and one sample line>
- decides: <who else says yes>

## Changes
- <date>: <what changed and why>
```

**Names stay out.** The sites and brands they love, and the competitors they named, go to `.longbeard/design/brief-loves.md` (gitignored) for `design-moodboard` to search from. The committed doc describes what those things do ("long editorial pages, one picture at a time"), never who. Owned colours and faces are theirs, so their values are written.

## Then

Say the next step in one line, from what they answered:

- A moodboard given → `design-moodboard` to read it.
- None → `design-moodboard` to find references. Starting with `design-identity` works too, from words alone.

## Do not

- Ask what the product brief already says. Ask a second round.
- Put a layout, colour, typeface or style name in a suggested answer.
- Write a site, brand, person or link into the committed doc.
