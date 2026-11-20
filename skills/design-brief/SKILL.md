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

1. First screen, in five seconds: what should someone think, and what should they do? And is it mostly seen on a phone or a desktop? [<from the brief's remembered-for, first flow and surface>]
2. Three words it should be, and one word it must never be. [<three and one, from the brief's people and position>]
3. Personality, 1 to 5. Lean on each one you can; a 3 says nothing:
   quiet 1 · · · 5 loud
   type-led 1 · · · 5 picture-led
   plain 1 · · · 5 rich
   warm 1 · · · 5 cool
   serious 1 · · · 5 playful
   classic 1 · · · 5 new
   airy 1 · · · 5 dense
   [<a suggestion for each, leaning off 3 wherever the brief gives a reason>]
4. How should it feel, and never feel? Anything you tried before and didn't like, and why?
5. Sites, apps, brands, books or places you love for this? (They steer the moodboard; their names stay out of the docs.)
6. Who should it stand apart from? And how far from what that kind of product usually looks like: 1 familiar to its users · · · 5 nothing like the category? [<the alternatives the brief names, and a number>]
7. What is fixed? A new brand, or a refresh (and what stays)? Colours, typefaces or a logo you own or refuse; light, dark or both; your own pictures, or none yet; languages; accessibility, AA or AAA. [<what the brief or the repo shows; AA unless the people need more>]
8. Motion: none, subtle, or expressive? [<from the personality>]
9. Do you have a moodboard already? A Figma link, a folder, screenshots or links.
10. How much design does this need? Full: the look is part of what the product is. Quick: an internal tool or a first version, done well but fast, with fewer stops. [<quick for an internal or admin tool, full otherwise>]

Anyone else who has to say yes?
```

Never search, open references or propose a look in this turn.

## Read back, once

Two lines, then their yes or a correction. The second is the voice: how the product talks, drafted from the brief and their words, with one sample line in it. They have not been asked about the voice, so this is where they correct it; every headline and every piece of copy is written in it.

> Leads with <takeaway>, first seen on <phone | desktop>; <pace>; <three words>, never <word>; loud 2, picture-led 4, cool 2, playful 1, new 4, dense 2; never <…>; apart from <kind of product>, 4 of 5 from the category; fixed: <…>, AA; motion subtle; a moodboard in Figma.
> Voice: <how it talks>, e.g. "<one sample line>". Right?

Give each number as the scale's right end (loud 2 is fairly quiet), so the read-back says what the doc will. A correction is one more line, not a second round. Several 3s left after the read-back: ask once which way they lean on those, in the same line. Answers that contradict the product brief are `grilling`, not this skill.

## Write `docs/design/design-brief.md`

```markdown
# Design brief: <product>

- takeaway: <what someone thinks in five seconds, and the one thing they do>
- first seen on: <phone | desktop>
- pace: <full | quick>
- words: <three words it is> · never <one word>
- personality: loud <n> · picture-led <n> · rich <n> · cool <n> · playful <n> · new <n> · dense <n> (each 1 to 5, 5 the named end: loud 2 is fairly quiet; one left out was not answered)
- feel: <their words>
- never: <their words, and what they tried and did not like, as looks, not names>
- apart from: <the kind of product it must not be mistaken for, described> · distance <n> (1 familiar to its users, 5 nothing like the category)
- fixed: <new brand, or a refresh and what stays; owned or refused colours and faces as values; light/dark/both; pictures: theirs or none yet; languages>
- accessibility: <AA or AAA>
- motion: <none | subtle | expressive>
- voice: <how it talks, as confirmed in the read-back, and one sample line>
- decides: <who else says yes, or "only them">

## Changes
- <date>: <what changed and why>
```

**Names stay out.** The sites and brands they love, and the competitors they named, go to `.longbeard/design/brief-loves.md` (gitignored) for `design-moodboard` to search from. The committed doc describes what those things do ("long editorial pages, one picture at a time"), never who. Owned colours and faces are theirs, so their values are written.

## Who reads what

So nobody asks again, and so each answer changes something:

| Line | Read by |
|---|---|
| takeaway | `design-direction` (what the screens carry, headlines, the five-second check), `design-prototype` (the five-second check), `design-content` |
| first seen on | `design-direction` (the size the screens are built at) |
| pace | `design` and every design skill: quick drops the optional stops |
| words, personality, feel, never | `design-moodboard` (queries and picks), `design-families` (the sliders), `design-direction` (the against-the-brief column), `design-identity` (options and their notes) |
| apart from, distance | `design-moodboard` (what to search and keep out), `design-direction` (the eye's check), `design-check` (could it be mistaken for one) |
| fixed | the direction's library (`theirs` entries, dropped grounds), `design-identity` |
| accessibility | every contrast check (`contrast.mjs --level`, `screen-contrast.mjs --min`), `DESIGN.md`, `design-check` |
| motion, dense | `design-prototype`, `DESIGN.md` |
| voice | headlines, copy, the identity board, `DESIGN.md` |
| decides | every approval: the direction, the identity board, `DESIGN.md` |

## Quick

`pace: quick` asks the same questions (they take a minute, and everything after reads them) and changes what follows:

- `design-moodboard`: their references as they are (three or more), or one search shown as one contact sheet of about 30, from which they name six to ten; no picker rounds, no gap search, no families.
- `design-direction`: subject pictures, one round of eight, one vary if they ask; touch-up and five-second check as usual.
- `design-identity`: the chosen screen's type and colours become the identity as built, contrast-checked; no options, straight to the board.
- `design-prototype`: as usual. Never quick on states, contrast, or the flows.
- `design-content` and `design-wordmark` are not offered.

They can switch to full at any step; the design brief records it under **Changes**.

## Then

Say the next step in one line, from what they answered:

- A moodboard given → `design-moodboard` to read it.
- None → `design-moodboard` to find references.

## Do not

- Ask what the product brief already says. Ask a second round.
- Write the voice without showing it in the read-back.
- Put a layout, colour, typeface or style name in a suggested answer.
- Write a site, brand, person or link into the committed doc.
