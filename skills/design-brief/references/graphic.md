# Design brief for a graphic

Read when the product brief's surface is a graphic. Everything in `SKILL.md` holds except what is said here. A piece counts as a screen wherever the skill says screen.

The kind, the format, the people and the facts are in `docs/brief.md`. Never ask them again. A question the brief or an earlier answer settles is not asked: it goes in the read-back as an assumption they can correct.

## The round

One message, as in the skill, with a suggested answer on each. These replace its numbered list.

```
Before any design, a few questions. Each has my suggestion in brackets: "yes" takes it, "go" takes all of them.

1. What must it say at a glance, and from how far away is it read? [<from the brief's what it is for and seen by>]
2. Three words it should be, and one word it must never be. [<from the brief>]
3. Personality, 1 to 5. Lean on each one you can; a 3 says nothing:
   quiet 1 · · · 5 loud
   type-led 1 · · · 5 picture-led
   plain 1 · · · 5 rich
   warm 1 · · · 5 cool
   serious 1 · · · 5 playful
   classic 1 · · · 5 new
   how much it holds: 1 one line · · · 5 every detail
   [<a suggestion for each>]
4. How should it feel, and never feel? Anything you tried before and didn't like, and why?
5. Posters, covers, books, brands or places you love for this? (They steer the moodboard; their names stay out of the docs.)
6. Who should it stand apart from? And how far from what pieces of its kind usually look like: 1 familiar · · · 5 nothing like it? [<the kind it is, and a number>]
7. What is fixed? One colour or full colour. Colours, typefaces or a logo you own or refuse. Your own pictures, or none yet. [<what the brief or the repo shows>]
8. A moodboard already? A Figma link, a folder, screenshots or links.
9. One piece, or a set (a poster, a story, a square)? Are the facts in the brief complete? [<what the brief says>]

Anyone else who has to say yes?
```

- **Print or screen is in the brief's format.** It is not asked again: the read-back states it as an assumption they can correct.
- **Question 6 is left out for a personal piece** (a birthday card): it has no category.
- **Never asked:** motion (a graphic has none, so `motion: none`), light or dark, languages, the accessibility level (written as AA unless they say otherwise), and full or quick (a single piece is `pace: quick`; a set is asked once, with question 9).
- **The other sizes of a set** are `design-prototype`'s. They are named here and built there.

## Read back, once

Two lines, as in the skill. The first says what it must say at a glance and from how far, the format from the brief in a few words, the pace, the words, the personality, never, apart from (or none), fixed, and the facts' state.

> Says <what> at a glance, read from <distance>; <format>; <pace>; <three words>, never <word>; loud 2, picture-led 4, …, holds 2; apart from <kind>, 4 of 5 from it; fixed: <…>; facts: <complete | missing …>.

## Write the doc

The template holds, with these changes:

- **No `first seen on` line.** The format is in `docs/brief.md`, which `design-direction` reads for the size. Write `read from: <how far, and where>` in its place.
- **`takeaway`:** what someone thinks and does at a glance. The one thing to do may be to remember a date, scan a code or go to a place.
- **`dense`:** 1 is one line, 5 is every detail. The key stays `dense`.
- **`motion: none`.**
- **`accessibility`:** AA unless they said otherwise.
- **`fixed`:** adds print or screen (from the brief's format) and one colour or full colour.
- **`apart from`:** `none: a personal piece`, with no distance, when there is no category.
- **Adds `pieces:`** one piece, or the list for a set, and **`facts:`** complete, or what is missing.

`pace: quick` for a single piece drops the same stops it drops anywhere. It never drops the contrast check or the facts.
