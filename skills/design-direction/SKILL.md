---
name: design-direction
description: >
  Find the direction: eight first screens. Six rebuild one of their
  references faithfully with the product's real content and pictures, changed
  by one or two things borrowed from their other references; two develop a
  liked reference's concept, redrawn for this product. Nothing on a screen
  that is not on their board. One agent builds them, scripts check
  contrast and clipped text, and they pick on a rendered canvas, or ask for
  more or a mix. Writes docs/design/design-direction.md. Runs after
  design-brief and design-moodboard; design-identity then refines its type
  and colour.
---

# Design direction

**Needs:** `docs/design/design-brief.md`, `docs/design/design-moodboard.md`  
**Uses if there:** `docs/design/design-content.md`  
**Writes:** `docs/design/design-direction.md`

**They are the designer; you do the craft.** Everything on a screen comes from their board. Understand what they like in each reference and why, and carry that concept onto this product. Make the craft decisions it leaves open, and add no taste of your own.

**Style is theirs; structure can be yours.** Faces, colours, finishes, devices and how pictures are treated come only from their board. How this product's content is arranged (composition, hierarchy, pacing) may be your design, as long as it carries a concept they liked: what you know about design serves their taste, never replaces it.

Writes `docs/design/design-direction.md` (committed) and works in `.longbeard/design/direction/` (gitignored): `library.json`, `screens/<n>.html`, `screens.json`, `prototype/first.html`, captures and the canvas.

**At every stop,** say what is new and the one question, in up to five lines: a path or a sheet instead of pasted content, one line per option, nothing they already know.

## Gate

1. No `docs/design/design-brief.md` → `design-brief`. No moodboard → `design-moodboard`. Stop, and say which.
2. A direction exists → a change: show it, ask what changes, build new screens only if the composition does.

A graphic (the brief's surface): read [graphic.md](references/graphic.md) first.

## 0. Pictures of the subject

Three or four pictures of what the product is about, not other designs: theirs, or a few licensed stand-ins from `pictures.mjs`, one query per picture. Every screen uses them, and their colours are one more palette. How: [subject.md](references/subject.md). Show them on a contact sheet with step 1's message; do not stop to ask.

## 1. The content and the references, in one message

**What a screen carries.** Only as much text as its base carries (its reading's `slots`), filled in this order until they run out: the headline (the takeaway), the primary action, the status (open now, in stock), the thing the product shows. What does not fit waits for `design-prototype`, never squeezed in as one more line.

**Headlines and the ownable.** Three or four headlines that say the takeaway outright, in the voice, and the ownable: one thing only this product would show (a stamp, a live count, a mark).

**Their board, every reference on it.** Copy the moodboard's `board.md` to `.longbeard/design/direction/board.md`, every card, plus the subject as a card (its contact sheet as the shot, `part: subject`, `screen: no`). Cards with a `topic:` line show under their group: a heading, never a filter.

```
node <skill>/scripts/moodboard.mjs .longbeard/design/direction/board.md --one-lead --out .longbeard/design/direction/board.html
```

It says how many cards it left out for a missing shot: capture those again first. **Likes are asked once:** a card with a `like:` line starts liked, with their words.

> Fill order: <primary> · <status> · <what it shows>; later: <list>. Headline: 1 "…" · 2 "…" · 3 "…". Ownable: <…>. Pick or rewrite.
> Then open the board (your likes are marked): **Lead** the one whose composition sets the tone, Like any more, and for each new like say what you like and why ("the orange dot: the only contrast on a quiet page"). Anything you don't want from a reference goes in its **Leave out** box. Paste the copy-out.

- **What they like** is what is borrowed; **why** is where it may go. A like without a why: ask once.
- **What they leave out is never on a screen:** dropped, or its role filled from another of their references.
- With fewer than 6 references, say once that the eight will look alike.
- **A like the design brief rules out** ("gold on deep green", brief: light only): the brief wins, and the like is carried by its role. Say it once before building; a change goes under **Changes** in the design brief.

## 2. Read the references

Read the lead and every like closely: its grid, the share of the screen each block takes, type sizes against the width, spacing, colours, faces (the closest Google Font), and what they like in it and why. A live page is measured (`measure.mjs <link>`): its numbers are the page's own. A picture is read by eye at full size; `measure.mjs <picture> --lines` only for a number you cannot read, and the face through `fonts.mjs --shape`. Write it to `library.json`, with the subject and its palette from `subject-colours.mjs`: [library.md](references/library.md).

**Never invent a key part.** Once the readings show what each reference has: if none shows a hero or a header and menu, or their picks leave one unclear, ask once, in one message: the cards that show it, to pick from, or a search for that one part (`design-moodboard`'s one piece). **Never block on it:** build on with that part from the closest system on the board, marked `data-standin`, and put their answer in when it comes, in the next round or the prototype.

**The accent** ([rule 6](references/design-floor.md#6-colour)): unless the board clearly shows one or they named it, add the options as swatches to that message, or send them alone, never waiting: `colours.mjs --harmony --primary <#> --ground <#> --family "<board's colours>" --level <AA|AAA>`, plus the subject's accent. Never pick or rank.

## 3. Eight first screens

Read [Before you build](references/design-floor.md#before-you-build) first, and apply it to each screen while you draw it. Build them yourself, one after another, each `screens/<n>.html` from [screen-template.html](references/screen-template.html) at 1440 by 900 (an app, or `first seen on: phone`: 390 by 844).

- **Every screen does a first screen's job:** what this is, for whom, the one action. A reference that is not a first screen (a section from mid-page, an inner page, a poster) lends its system and its moves; what only works in its own role is left out.
- **On a rebuild, one reference is the base,** rebuilt faithfully: its composition, proportions, type and colour, with this product's content and pictures, and only the text its `slots` allow. Its sizes are scaled to this screen, at [rule 5](references/design-floor.md#5-typography)'s size floor.
- **Then one or two moves** borrowed from their other liked references. A move is what they said they like, placed where their why says it belongs, and it changes only what it names. A why that would not be true on this base sends the move to another base.
- **Never a collage.** A screen is its base and at most two moves, nothing more. The lead may set the round's tone, but its devices are moves like any other's: a device sits on its own reference's screens and on at most two others, so the eight stay eight different screens.
- **Spread:** the lead is the base of two screens; four stand on one of their liked references each; two are **concepts**, each from a liked reference no other screen stands on. Eight screens, seven references: only with fewer than six likes does a reference take a second screen, the lead first, then the likes. Accent options still unanswered: about two screens each. Only the lead and their likes are used, never a card they did not pick. No main picture on more than two screens.
- **What they like is taken whole.** A liked reference's scene, and any device borrowed from it (a ring of text, a block of colour, prints laid on a table), keeps the form, the job and the space around it that it has there. It is never taken apart, restyled or given another job: a block of colour that is a ground does not become a button, a ring of text gets no extra line, pictures laid over each other stay far enough apart to read as separate pictures. A move changes where things sit, never what they are.
- **A concept** develops one liked reference that no other screen is built on (the like with the clearest why first) instead of rebuilding it. First write its `concept` in the reading as a designer would defend it: what it is, and why it works (the tension, the hierarchy, what does the work). Then redraw the arrangement for this product's content so that idea still does the work, with that reference's devices, type, colour and picture treatment. Before you check it, two questions: would a designer call it the same concept, and would they call it a copy? Either answer wrong: redraw. A screen with no concept behind it is not a concept: it is generic, and goes.
- **Nothing that is not on their board:** no face, colour, gradient, shadow, radius, button style or effect that none of their references has. `PROVENANCE` names the reference for each; before the checks, go through the screen's CSS, and anything it cannot name goes.
- **Where the board shows nothing for a part** (a field, a price, a badge), take it from the base's own system; if the base has none, from another of their references. The name is set in the base's type; a mark is `design-wordmark`'s.
- **Marked, not hidden:** anything the product does not really have yet carries `data-standin="picture"` or `"fact"`, with `data-standin-note`.

Record each in `.longbeard/design/direction/screens.json`:

```
[{ "n": 1, "base": "<card name>", "moves": [{ "what": "<the move>", "from": "<card name>", "like": "<their words, or null>" }], "accent": "<#hex from the options, or null>", "state": "built" }]
```

A concept also has `"kind": "concept"` and `"idea": "<the concept it keeps, in one line>"`; its `base` is the reference it develops.

`state` is `built`, or `failed` with `"failure": "<why>"`. Optional: `round` (1 when left out), `fault` (one line), `shot`.

**Check each screen by script:**

```
node <skill>/scripts/capture.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --out .longbeard/design/direction/grid/1.png --clip 0,0,1440,900
node <skill>/scripts/screen-contrast.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --wait-title ready
node <skill>/scripts/rules.mjs "file://$PWD/.longbeard/design/direction/screens/1.html" --screen direction-1 --widths 1440
```

Act here on `rules.mjs`'s clipped text, text size and placeholder copy; targets, focus and labels are the prototype's. Fix clipped text by setting it smaller within its role or cutting words. Look at each capture yourself, beside the pictures of what it is made from (its base, each move's reference): as a designer would, check that every borrowed scene and device still reads as it does there, whole, with its job and its spacing. Fix what broke before you show it.

**The floor, inside the concept** ([how they split](references/design-floor.md#how-to-use-this)). Text a person acts on must pass contrast and size, fixed with the screen's own colours or another crop, never by moving it off the picture. Display type over a picture, overlaps, crops and wide empty space are the look when a reference does them: never tidied away. A liked colour or size stays, its measure in `fault`. A finding left is theirs to decide: `fault` says it as a choice (what it costs, and what would fix it: keep, or change?), and that line goes in your message with the canvas.

**Show the canvas:**

```
node <skill>/scripts/canvas.mjs .longbeard/design/direction/screens.json --board .longbeard/design/direction/board.md --shots .longbeard/design/direction/grid --out .longbeard/design/direction/canvas.html
```

It shows every screen in a strip and, for the one they open, what it is made from: its base and each move, with the reference and their words. Give its path, and one line per screen only for a fault or for what sits against the brief (its never, its words, its personality, or could be mistaken for what it must stand apart from). Then one recommendation, as a studio would give it: the screen that best does what the design brief asks, and why, naming the line it serves (the takeaway, the never, what it must stand apart from). Never a preference of your own: the brief's case, theirs to overrule.

> Which is closest? Or "more", "more of 3", "3 with 6's accent".

## 4. More, mix, choose

- **More of 3:** three more on 3's base with other moves, in round 2.
- **A mix** ("4 with 7's colours"): one screen.
- **More:** a fresh round of eight, new pairings. After two rounds with nothing taken, ask once what is missing (`design-moodboard`).
- **A part,** only when they ask ("other menus for 3"): three or four versions of that part on the real screen, everything else kept, each from a reference that shows that part. **Options live on the page:** each version is an element with `data-variant="<n>"` and `data-from="<card name>"`, and the page loads [variants.js](references/variants.js) (copy it beside the page): `?variant=<n>` shows one, a small bar names its reference, and ← → flip between them. Capture each with `?variant=<n>&bar=0`, and record each in `screens.json` as `"of": <n>, "part": "<name>"`.

Every version stays theirs. A pick that breaks a why they gave: ask once whether the why still holds; never block it.

On their yes, read it back in one line, with three to five **principles**: what this design does on every screen, drawn from their whys and the chosen screen, in their words where they gave some ("one loud thing per screen", "pictures always run to the edge", "type does the decorating"). Each is specific enough that a page could break it. A correction rewrites a principle. Then read its base's motion unless the brief's is none ([library.md](references/library.md)), copy it to `prototype/first.html`, and set `"chosen": n` in `screens.json`. When the brief's `decides` names someone else, they confirm it first.

**In context, before the identity.** A studio shows a chosen concept where it will live before it is signed off. Build two more pages from the chosen screen: its phone view (390 wide), and the brief's key screen that is hardest for this look (the densest list, a form), in the chosen screen's frame and principles, each page opening with its own job. Check them like the eight, and show them beside the chosen screen with the direction. If the look breaks on real content, say where in one line: going back to another pick is still cheap. The prototype starts from these pages.

## Write `docs/design/design-direction.md`

```markdown
# Direction: <product>

- takeaway: <from the design brief>
- headline: "<the one they picked>"
- carries: <what the chosen screen holds, in fill order>
- for the prototype: <everything else the first screen needs>
- ownable: <what, from the product's world>

## Composition
<The chosen first screen in words, complete enough to rebuild with no picture: where everything sits, what overlaps or runs off, how much is empty, how big type is against the rest.>

- navigation: <one sentence>
- zones: <one line each>
- holds across screens: <how empty, type scale, picture share, margin, radius, edges, density>
- pictures: <how they are treated>
- motion: <what moves, trigger, ms, easing, within the brief's pick; or "none">
- finish: <a pasteable recipe; or "none">

## Principles
- <three to five, as confirmed: what every screen of this design does>

## Hierarchy
1. <first read> 2. <second> 3. <the rest>. Primary action: <what, where>.

## Voice
<from the design brief, with the headline as its sample>

## Look, as built
Proposal; `design-identity` refines it.
- type: <display face, weight, case> with <body face>
- colours: ground <#…>, ink <#…>, accent <#… or none>
```

No reference names, links or paths. Then the direction in up to five lines:

> Change anything, or go on to the identity?

## Do not

- Rank the screens, or recommend from taste: the one recommendation names the design brief line it serves.
- Add anything their board does not have, or anything they wrote to leave out.
- Show a concept that drops the idea it develops, or copies its reference's layout.
- Fit more text on a screen than its base carries.
- Undo what they like because a check flagged it.
- Take a reference's content, pictures or words.
