---
name: design-content
description: >
  Optional, any time. Plan what each key screen says and shows: its sections in
  order, the one thing it leads with, real copy in the product's voice, and
  the full set of pictures each screen needs, with licensed stand-ins of the
  product's own subject where they have none. (The first three or four
  pictures are found by design-direction.) Never asks them to write final copy.
  Writes docs/design/design-content.md. Runs after the design brief, when
  they ask about copy or imagery, or when design offers it because they have
  no pictures.
---

# Design content

**Needs:** `docs/design/design-brief.md`  
**Uses if there:** `docs/design/design-identity.md`, `docs/design/design-direction.md`  
**Writes:** `docs/design/design-content.md`

The screens skill drafts copy on its own, so this one is never required. Run it when content deserves its own decisions: a site that lives on its words, a product with no pictures yet, or a team that wants to sign off copy before screens.

Comes out:

- **`docs/design/design-content.md`**, committed: per key screen, what it says and shows.
- New stand-ins join `.longbeard/design/pictures/` (gitignored), with `credits.tsv`.

## Gate

1. No `docs/design/design-brief.md` → `design-brief` first. Stop.
2. A content doc exists → a change: ask what changes, and update only that.

Read the brief (flows, key screens, identity nouns), the design brief (takeaway, voice, what is fixed) and, if they exist, the direction (what it carries, what waits for the prototype, the headline) and the identity (how pictures should feel).

## 1. Facts first, then the draft, then ask once

Copy is made from facts the product has, never from plausible inventions. Before any sentence, fill the fact sheet from the brief and the design brief, in their words where you can:

- **What it is:** one plain sentence.
- **Who it is for,** and who it is not for.
- **What people do today instead.**
- **What is true here and not elsewhere,** with its proof.
- **Words their customers use.**
- **Numbers,** each with where it came from.
- **One limit:** what it does not do, or who it is wrong for.

The voice is the design brief's `voice` line, as confirmed in its read-back. Do not add to it.

An empty field stays empty. Never fill it with a likely fact. Each section is built from fields that have something in them. A section with none is shortened or dropped, and the doc lists what they must supply. A fact you assumed to go on is marked as assumed (see the prototype's stand-in marks), not stated as true.

Each rhetorical device (a heading in two fragments, "X, not Y", a row of three figures) is used once per screen, where it lands hardest. A generic line gets a fact or a decision, never a synonym.

You write; they correct. For each key screen in the brief:

- **Job:** what a person comes to do here, in one line.
- **Leads with:** the first read: a headline, a number, a picture.
- **Sections, in order:** each with what it is for and its real copy, in the voice. Real names, real numbers, the longest real string where it matters.
- **Actions:** primary and secondary, worded.
- **Pictures:** what each shows (the subject, not a mood), how many, and whether theirs exist.
- **States:** what the empty, loading and error states say.

Show it in chat, one screen at a time if there are many, compact:

> Home: leads with "<headline>". Sections: <a>, <b>, <c>. Pictures: today's bread, the oven, the street. Still to supply: <empty fields>. Right, or what's off?

One round of corrections. "Go" takes the draft.

## 2. The picture list, and stand-ins for the gaps

`design-direction` already found three or four pictures of the subject in `.longbeard/design/pictures/`. Here, list every picture the key screens need, mark which exist (theirs, or those stand-ins), and find only the missing ones: one query per picture, of the product's own subject, never the references'.

```
node <skill>/scripts/pictures.mjs "baker shaping dough" --out .longbeard/design/pictures --count 1
```

It keeps only clear licences (CC0, public domain, CC BY, CC BY-SA), large enough for a screen, and adds each to `credits.tsv`. Of the kind the look uses, treated the way the direction says (crop, toning). Show what was added on a contact sheet; they drop any they dislike. Never ranked.

```
node <skill>/scripts/contact-sheet.mjs .longbeard/design/pictures/credits.tsv --out <scratch>/pictures
```

Stand-ins stay marked as stand-ins everywhere they are used, until theirs replace them.

## Write `docs/design/design-content.md`

```markdown
# Content: <product>

## Facts
- is: <one sentence> · for: <who> · not for: <who>
- instead: <what people do today>
- only here: <what is true here, with its proof>
- their words: <…>
- numbers: <each with its source>
- limit: <what it does not do>
- to supply: <empty fields, and the sections they shrink or drop>

## <Key screen>
- job: <one line>
- leads with: <the first read>
- sections: 1. <name>: "<copy>" 2. …
- actions: <primary> · <secondary>
- pictures: <what each shows> — <theirs | stand-ins: n chosen>
- states: empty "<…>" · loading "<…>" · error "<…>"
```

Credits stay in `.longbeard/`, except where a licence requires credit in the product: then say where it must appear.

Then the next step in one line, from where the project is (`design` knows).

## Do not

- Ask them to write the copy. Draft it.
- Invent a number, a name or a quote. An empty field is a gap to name.
- Use the references' pictures, subject or words.
- Keep a picture without a clear licence, or rank pictures.
