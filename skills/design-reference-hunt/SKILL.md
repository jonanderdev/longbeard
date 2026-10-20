---
name: design-reference-hunt
description: >
  Find real visual references when the project has no official look: no
  DESIGN.md, no Figma link, no .design/board.md. Ask once if they have a
  Figma file; if they paste one, stop hunting. If not, do the full hunt
  and write .design/board.md. Look widely. Scroll and screenshot only
  what you keep. A website aims for 10 live award sites this year; those
  outweigh Dribbble, which is up to 20. An application aims for up to 20
  screen shots; those outweigh award sites. A short board names each drop.
  Cover the same job and also the page type, component, or element,
  including other subjects. The shot files are the evidence. The board’s cards are written in the
  shape taste already reads: idea, hero, type, colour, worth taking.
  A short “Read this” at the top is for a person, or for a builder that
  is not taste. A later section, or a look that already exists: 10
  filtered shots to .design/piece.md. Only keep high-rated Awwwards
  (not weak nominees) and strongly voted Dribbble.
  Use when they ask to design a page or a piece and no direction exists yet.
  This skill writes the board. Taste builds from the cards. This file
  does not say how to lay the page out.
---

# Reference hunt

No official look → this skill. Write a board. Then **keep going and build from that board**. Which builder to load is the project’s router, not this file.

Read [quality.md](references/quality.md) before you keep a reference. Weak nominees and generic Dribbble do not go on the board.

A Dribbble illustration is **imagery**, not a website. A Dribbble shot of a real screen can be a screen reference. It is never a Site.

## Gate (do this first)

Check the repo and the prompt, in order. Stop at the first hit.

1. `DESIGN.md` exists → follow it. Do not hunt a whole look.
2. The prompt has a Figma file or link → implement from that file. Do not hunt.
3. `.design/board.md` exists → whole look is done when **Read this** names a primary card, that card’s hero names the control, and any shortfall is named. Aims: a website, 10 live sites and up to 20 screens; an application, up to 20 screens and not an Awwwards set. Imagery is up to 10. A short board that does not name each drop is unfinished: finish the hunt. Missing control: open the shot and write it, then build. Or run **Piece** if they asked for a section.
4. Otherwise, for a **whole look** only: ask **once**, and wait:

   Do you have a Figma file for this, or should I hunt references?

   - They paste a Figma link → implement from Figma. Stop hunting.
   - They say no, skip, or “hunt” → **Whole look** below. Do not ask again.

Do not ask this on a piece hunt. Do not ask whether DESIGN.md exists; look for the file.

## Whole look

No `DESIGN.md`, no Figma, no `.design/board.md`. The first time this project needs a look. A direction that already exists is **Piece**, not this.

Say once, in one line, what you are looking for, and that the closest come back as a short list. Then look without narrating. No scores, no drops, and no site called interesting until that list.

Look, then keep. The counts below are what you **keep**. They are not how many you open. Read listings and score pages until the keep is full of ones that pass [quality.md](references/quality.md), and do not stop at the first page. There is no small cap on looking. A website looks through at least 30 live candidates before it accepts fewer than 10 sites, and through the popular Dribbble sort (and the other-subject queries) before it accepts fewer than the screens it could have kept. If that pass is weak, look at the next gallery. A thin field stays thin: name each drop, and do not lower the filter to fill the count.

Scroll and screenshot only a keep. Do not scroll a candidate. Do not screenshot a listing, a score page, or a URL you might drop. The capture script scrolls; run it only on a keep. A file in `.design/refs/` that is not on the board gets deleted.

1. Name the subject and the **surface**: `website` or `app`.
2. This year’s date. Do not search only the same subject. Also search the page type, the component, and the element, including other subjects that share that form. Filter with [quality.md](references/quality.md).
   - **Website — Sites (aim 10), mixed `fit`:** live URLs from this year. These outweigh Dribbble. Prefer Awwwards SOTD / high scores (overall and Design ≥ 7.5; never 4s). Also Godly, Land-book, siteinspire. Aim `same-job` 2, `register` 2, `form` 6. `same-job` is this subject. `register` shares its feeling: the hour, the material, the ritual, or the kind of place. `form` is another type of business. From it, take only a layout or a component that still works once this topic’s pictures and words are in the frame. If that frame only makes sense for the other type, drop it. Not its type, and not its colours. Leave their identity. An older site only when nothing current has that structure.
   - **Website — Screens (up to 20):** strongly voted Dribbble from this year, after the quality filter. They lose to a kept site. Tag `role: page | component | element` and `subject: same-job | other`. An illustration stays imagery. These are not Sites.
   - **App — Products (up to 6):** public product pages of this job. Not Awwwards, not a campaign site. Fewer is valid when the board names each drop (a login wall, no public page).
   - **App — Screens (up to 20):** strongly voted Dribbble and component galleries. These outweigh product pages and award sites. The shot is the screen, a component, or an element. Other subjects that share that role count. An illustration stays imagery. Do not fill this board with Awwwards.
   - **Imagery (up to 10):** this subject’s world (Unsplash, Wikimedia, museums). Not stock category. A file counts when a crop can make the principle the subject. Drop the rest. Do not pad.
   - **Type / marks (1–2):** a pairing or a stamp you can name.
3. Scroll and screenshot only a keep. `node <skill>/scripts/capture.mjs <url> --out .design/refs/<name>.jpg` for that URL only. Do not stitch. How: [shots.md](references/shots.md). Jury quotes only from an Awwwards page you kept. Dribbble: the shot artwork of a keep, not the search grid.
4. Write `.design/board.md`. One file, two layers. **Read this** is a few lines a person can read. **Cards** are the references, in the shape taste already reads. A website is valid at 10 sites, or short when each missing site is named after the 30-candidate look. Screens are up to 20. An application is valid with its screens, and invalid if the spine is Awwwards. A short one names each missing screen. Imagery is up to 10. Products are up to 6. Do not pad by lowering the filter. Hexes come from a kept shot, not a palette library. Later pages reuse it. Do not run **whole look** again. Do not build from a board that is short and does not name each drop.

**Read this** is written from the cards, after they choose. The primary card is the closest to this subject, not the largest type and not the highest score. Closest means the subject’s world is in the shot: the same job, or a register that shares its hour, its material, its ritual, or its kind of place. Colour and type come from that card, or from this subject’s pictures. A form card does not supply them. It can only add a layout or a component that still belongs on this topic.

Before you write **Read this**, ask once, and wait. That message names the two or three closest cards. Each one has its idea in one line, why it is close, and the live URL, so the page can be opened. It also says the shots and the other cards are in `.design/board.md`. It does not list scores, drops, or the other keeps. Their answer is the primary card. If they say you should choose, take the closest.

```
## Read this
- primary: <card name>
- also: <one other card>
- control: <as that card’s hero describes it: text link, filled shape, or absent, and where it sits>
- colour: <where it sits in the shot>
- type: <the pairing>
- leave: <one line>
```

Each site, product page, or screen is a card, written from the open shot file. `role` is required on `form`. A hero that says “one action” and does not say what the control is does not count. On a website the primary card is the closest live site, not a form site chosen for its type. On an application it is a screen, not an award site.

```
### <name>
- source:
- score:
- fit: same-job | register | form
- role: page | component | element
- subject: same-job | other
- url:
- shot: .design/refs/<file>
- idea: <one sentence. The principle, not their name>
- hero: <what is in the frame. The control: text link, filled shape, or absent, and where it sits>
- type: <the faces, and how the shot uses them>
- colour: <hexes you can see, and where each sits. A colour is a button fill only when the shot fills a button with it>
- imagery: <what the pictures are>
- worth taking: <one principle. On a form card: a layout or a component only, and only if it still works on this topic. Not their type. Not their colours>
- leave: <their identity, and anything that is not the principle>
```

Imagery and type stay short. They are material, not cards.

```
- kind: imagery | type
- url:
- shot: .design/refs/<file>
- shows:
- leave:
```

The cards are the references. The shot files are the evidence.

## Piece

The smaller hunt. A direction already exists (`DESIGN.md`, Figma, or a board), or they only asked for this piece.

1. Name the piece (hero, menu, pricing, empty state, icon, …) and its role: page, component, or element.
2. **Keep 10** after the quality filter. Not 20. Look through more than 10 before you choose, including the same role in other subjects. Dribbble (popular, this year), Land-book, Godly, component galleries, Unsplash for imagery. Capture only the 10 you keep. Crop to the **shot**, not the gallery. Live sites only if the piece is a whole block on a real page.
3. Tag each: `kind: section | component | imagery | type | mark` and `subject: same-job | other`. Do not file a drawing as a section.
4. Write `.design/piece.md` (or `.design/piece-<slug>.md` if more than one). Do **not** replace `.design/board.md`. If a board or `DESIGN.md` exists, take the layout principle from the piece refs and keep that look’s colour and type.

```
# Piece
Name: <hero / menu / …>
### <name>
- kind: section | component | imagery | type | mark
- subject: same-job | other
- url:
- shot: .design/refs/<file>
- idea:
- hero: <the frame, and the control>
- worth taking:
- leave:
Read this: <one sentence, from the cards>
```

## After the board

Do not end the turn on the cards. In the chat, name only the two or three closest, each with its live URL, and say the shots are in `.design/board.md`. Then wait. After they answer, write **Read this**, say it in the chat, and build. The cards stay in the file.

The cards are the references. Do not deal a library of other ones. On a website the site cards outweigh the screen cards. On an application the screen cards outweigh award sites. How the page is built — scale, grid, sections, motion — belongs to the builder, and with this kit that builder is taste. The control in the primary card is the control. Do not add a filled button the card does not show. Do not lower the score for that. A custom cursor, a password gate, or a WebGL scene is used only when a card shows it.

## Do not

- Keep an Awwwards nominee with 4s or overall under 7.5.
- Stitch viewport screenshots. A file that repeats one fold is invalid.
- Screenshot a gallery listing.
- Put files under `.claude/`.
- Put layout steps in this file. The description may name taste as the reader of the cards.
- Run whole look twice. A piece hunt is allowed later; a second project board is not.
- Pad the count by lowering the filter, or by keeping pictures you would not put on the page.
- Stop looking at the first page of results, or treat the keep count as the number of candidates you open.
- Scroll or screenshot a candidate. The capture script runs on a keep only.
- Narrate candidates, scores, or drops while looking. After the opening line, the next thing said is the short list of the closest, each with its live URL.
- Write a hero that does not say what the control is.
- Build from a short board that does not name each drop.
- Take colour or type from a card about another business.
- Let a card lead because its type is large, when a closer card has the subject’s world in the shot.
- Let a screen card be the primary card on a website, or an award site be the primary card on an application.
- Fill an application board with Awwwards.
