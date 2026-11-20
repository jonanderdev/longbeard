# Design eval

A repeatable end-to-end run of the design skills, judged by the files it leaves. Run it before merging a change to any design-* skill, and compare the score with the last run.

## What is fixed

- `fixture/docs/brief.md`: the product brief of a fictional bakery (Hearth Bakehouse), with key screens, flows, real content and an empty case.
- `fixture/board/`: ten JPEGs, the person's moodboard folder. Each takes its composition, type, spacing and colour from a starred card on a real art-direction board, rebuilt with our own words, fictional names and CC0 photographs (credited in `CREDITS.md`). No original design or image is included, and the code that drew them is not kept: the pictures are the fixture.
- `fixture/sources.json`: the fictional names on the board and the sites the person loves, which a committed doc must never carry.
- `fixture/answers.md`: the person's answer at every stop, from the design brief's ten questions to "write DESIGN.md: yes". A stop it does not cover is taken as "yes" and logged as **uncovered**.
- `fixture-2/`: a second board of seven references (`board/`, `sources.json`, `frames.json`, `answers.md` with its own lead and likes), made the same way. It shares the first fixture's brief, so a run on it differs only in its references: the test of whether the direction's rules hold beyond the board they were tuned on. `run.mjs --fixture eval/design/fixture-2` builds from it, and the project records which board it came from, for `score.mjs` and `odd-one-out.mjs`.

## Run

```
node eval/design/run.mjs --out ../longbeard-eval                        # builds the project, prints the command
node eval/design/run.mjs --out ../longbeard-eval --agent "claude -p"    # builds it and runs the agent
node eval/design/run.mjs --out ../longbeard-eval-quick --pace quick     # the quick path
node eval/design/score.mjs ../longbeard-eval
```

To change only how the direction's screens are built, start from a finished run: `run.mjs --out <dir> --from <finished run>` takes its design brief, moodboard, readings, pictures and board, and the agent only builds and checks the screens, in about half the time. Every such run builds on the same inputs, so a difference between sheets is the rules'. Run the whole flow again before merging, and whenever reading, measuring or matching faces changes.

`run.mjs` builds a fresh project outside this repo: the brief, the answers, the moodboard folder, the design skills as an install lays them out (`.claude/skills` and `.agents/skills`), `AGENTS.md` from the router, and `PROMPT.txt`. The agent runs from `design` to `DESIGN.md`, never Figma, and keeps `eval-log.md`. It needs Chrome, and the network for Google Fonts and Wikimedia Commons.

## Score

`score.mjs` checks, hard unless marked soft:

- every design doc and `DESIGN.md` is there; at quick pace, no optional skill ran (soft);
- the design brief has every line, all seven scales, a distance and AA or AAA; it records the pace they gave (soft);
- no committed doc names a reference or a loved site, links to one, or points into `.longbeard/`;
- every screen has a base and moves from references on the board, every reference is a base, and a screen was chosen (older dealt runs: every dealt screen takes arrangement, type and ground from three);
- the five-second check ran (soft); the identity's json block parses;
- `DESIGN.md` records the brief's accessibility level and motion (soft), and every contrast pair on its colour tokens passes at that level;
- rendered (skipped with `--no-browser` or without Chrome): the chosen screen and every prototype page pass `screen-contrast.mjs` at the level; `links.mjs` finds nothing broken, nowhere or a dead end from the first page; every key screen is reached (soft);
- `eval-log.md` reports nothing in a skill the agent could not follow (soft), and counts the uncovered answers.

- rendered, the dealt screens (`screens.mjs`, which also runs on its own on any run, old or new): no text under 12px at 1440, no clipped text, contrast on every screen (hard); no more text blocks than the arrangement's reference carries and one more, grounds of a tone the references use, and each screen measured against its references (soft): empty share against the arrangement's reference, display size and weight against the type's, ground against the ground reference's palette;
- the odd-one-out rate (soft), once the judges have run.

It prints `score: passed/checked` and exits 1 on any hard fail. What it cannot judge alone: whether the screens are good.

## Against the default

Better than the references' level is not enough: a round should beat what an agent makes from the same brief with no board, and two boards should not lead to the same screens.

```
node eval/design/run.mjs --out ../lb-plain --plain --from ../longbeard-eval --agent 'claude -p {prompt}'   # the baseline, once
node eval/design/score.mjs ../longbeard-eval --plain ../lb-plain --other ../longbeard-eval-2
```

- **The baseline** (`run.mjs --plain`): the same product brief, design brief, pictures and content (`fixture/plain.md`), built by an agent with no board and no skills, in a folder of its own so it sees no other run: eight first screens, captured.
- **The blind sheet** (`score.mjs --plain`): the round and the baseline shuffled into one sheet, numbered only, in `.longbeard/eval/blind/` (`sheet.png`; `key.json` apart). The owner writes good, OK or bad beside each number in `marks.md`; the next score tallies the marks by set. Keep one baseline for a series of runs, so each round meets the same default.
- **Tells of a generic page,** every run: gradient text, a gradient of two hues, frosted glass, soft drop shadows, pills, rounded cards with shadows, a default face, a violet accent, tracked caps labels, emoji, stock marketing words, read from each screen's source. Facts, not verdicts: a reference may use one on purpose. The baseline's are shown only once the marks are in, so nothing hints which tiles are which.
- **Sameness** (`--other`): a run on the other board, built by the same rules. Every screen is measured alike (the faces it names, ground, ink, how empty, picture share, the headline's size, place and letter shapes), and the mean likeness across the two boards is set against the likeness within each; `.longbeard/eval/sameness/closest.html` shows the three closest pairs across, for the eye.

## Odd one out

Blind judges, for whether the dealt screens hold up beside the references. Each judge gets six pictures in a random order (one screen and five references from the board, presentation frames cropped off by `fixture/frames.json`) and picks the least finished in craft: spacing, alignment, type setting, text that does not fit. Picked at chance (1 in 6) or less, the screens are at the references' level. Judges work in folders outside the project and this repo, see nothing else, and edit nothing; their reasons become fixes to rules, never to a screen.

```
node eval/design/screens.mjs ../longbeard-eval                    # captures the screens too
node eval/design/odd-one-out.mjs ../longbeard-eval --prepare
node eval/design/odd-one-out.mjs ../longbeard-eval --judge "claude -p {prompt} --model sonnet --allowedTools Read"
node eval/design/odd-one-out.mjs ../longbeard-eval --tally          # writes eval-odd-one-out.json, read by score.mjs
```

Then show the person the sheets blind, as A and B: their choice is the last word. Open `.longbeard/design/direction/grid/sheet.png`, the identity board and the prototype, and read `eval-log.md`: a stop it calls unclear is a skill to fix.

`test/eval-score.test.js` keeps the scorer honest: a hand-made good run passes every check, and a run with a leaked name, a gap in the brief, a failing pair, a one-source screen and a dead link fails each.
