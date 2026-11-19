---
name: design-content
description: >
  Optional, any time. Plan what each key screen says and shows: its sections in
  order, the one thing it leads with, real copy in the product's voice, and
  the pictures it needs, with stand-ins of the product's own subject, clearly
  licensed, when they have none yet. Never asks them to write final copy.
  Writes docs/design/design-content.md. Runs after the design brief, when
  they ask about copy or imagery, or when design offers it because they have
  no pictures.
---

# Design content

The screens skill drafts copy on its own, so this one is never required. Run it when content deserves its own decisions: a site that lives on its words, a product with no pictures yet, or a team that wants to sign off copy before screens.

Comes out:

- **`docs/design/design-content.md`**, committed: per key screen, what it says and shows.
- **`.longbeard/design/content/img/`**, gitignored: stand-in pictures, with `credits.tsv`.

## Gate

1. No `docs/design/design-brief.md` → `design-brief` first. Stop.
2. A content doc exists → a change: ask what changes, and update only that.

Read the brief (flows, key screens, identity nouns), the design brief (takeaway, voice, what is fixed) and, if they exist, the direction (must carry, headline) and the identity (how pictures should feel).

## 1. Draft it, then ask once

You write; they correct. For each key screen in the brief:

- **Job:** what a person comes to do here, in one line.
- **Leads with:** the first read: a headline, a number, a picture.
- **Sections, in order:** each with what it is for and its real copy, in the voice. Real names, real numbers, the longest real string where it matters.
- **Actions:** primary and secondary, worded.
- **Pictures:** what each shows (the subject, not a mood), how many, and whether theirs exist.
- **States:** what the empty, loading and error states say.

Show it in chat, one screen at a time if there are many, compact:

> Home: leads with "<headline>". Sections: <a>, <b>, <c>. Pictures: today's bread, the oven, the street. Right, or what's off?

One round of corrections. "Go" takes the draft.

## 2. Pictures, when they have none

Stand-ins make every screen read as this product, so they show the product's own subject (the bakery's bread, the app's real data), never the references' subject.

- **Search the subject,** from the brief's identity nouns, on sources checked to work without a login ([sources.md](references/sources.md), Imagery). Keep only clear licences (CC0, CC BY, CC BY-SA, public domain), large enough for the screen.
- **Of the kind the look uses:** photographs, illustrations or renders, as the moodboard and identity show; treated the way the direction says (crop, toning).
- Save to `.longbeard/design/content/img/`, with `credits.tsv` (name, file, source page, author, licence: the first two are what the contact sheet reads).
- **They choose:** a contact sheet of what was found (`contact-sheet.mjs`); they drop any they dislike. Never ranked.

  ```
  node <skill>/scripts/contact-sheet.mjs .longbeard/design/content/img/credits.tsv --out .longbeard/design/content/sheet
  ```

Stand-ins stay marked as stand-ins everywhere they are used, until theirs replace them.

## Write `docs/design/design-content.md`

```markdown
# Content: <product>

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
- Use the references' pictures, subject or words.
- Keep a picture without a clear licence, or rank pictures.
