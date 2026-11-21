# Design eval

A repeatable end-to-end run of the design skills, judged by the files it leaves and by the owner's eye, blind. Run it before merging a change to any design-* skill, and compare with the last run.

## What is fixed

- `fixture/docs/brief.md`: the product brief of a fictional bakery (Hearth Bakehouse), with key screens, flows, real content and an empty case.
- `fixture/board/`: ten JPEGs, the person's moodboard folder. Each takes its composition, type, spacing and colour from a starred card on a real art-direction board, rebuilt with our own words, fictional names and CC0 photographs (credited in `CREDITS.md`). No original design or image is included: the pictures are the fixture.
- `fixture/sources.json`: the fictional names on the board and the sites the person loves, which a committed doc must never carry.
- `fixture/answers.md`: the person's answer at every stop. A stop it does not cover is taken as "yes" and logged as **uncovered**.
- `fixture/plain.md`: the content the screens carry, for the baseline.
- `fixture-2/`: a second board of seven references, with its own `answers.md`, sharing the brief, so a run on it differs only in its references. `run.mjs --fixture eval/design/fixture-2` builds from it.

## Run

```
node eval/design/run.mjs --out ../lb-eval                                   # builds the project, prints the command
node eval/design/run.mjs --out ../lb-eval --agent 'claude -p {prompt}'      # builds it and runs the agent
node eval/design/run.mjs --out ../lb-eval-2 --from ../lb-eval --agent …     # only the direction's screens
node eval/design/score.mjs ../lb-eval
```

`run.mjs` builds a fresh project outside this repo: the brief, the answers, the moodboard folder, the design skills as an install lays them out, `AGENTS.md` from the router, and `PROMPT.txt`. The agent runs from `design` to `DESIGN.md`, never Figma, and keeps `eval-log.md`. It needs Chrome, and the network for Google Fonts and Wikimedia Commons. `--agent` takes the prompt where it says `{prompt}`, else last.

To change only how the direction's screens are built, `--from <finished run>` takes its design brief, moodboard, readings, pictures and board, and the agent builds and checks the first round only. Every such run builds on the same inputs, so a difference between sheets is the rules'. Run the whole flow again before merging.

## Score

`score.mjs` checks, hard unless marked soft:

- every design doc and `DESIGN.md` is there; the design brief has every line, all seven scales, a distance and AA or AAA;
- no committed doc names a reference or a loved site, links to one, or points into `.longbeard/`;
- every screen has a base and moves from cards on the board, every reference is a base (soft), and a screen was chosen;
- the identity's json block parses; `DESIGN.md` records the brief's accessibility level, and every contrast pair on its colour tokens passes at it;
- rendered (skipped with `--no-browser`): the chosen screen and every prototype page pass contrast; the prototype's links lead somewhere from the first page;
- the round's screens (`screens.mjs`): no text under 12px at 1440, no clipped text, contrast on every screen; no more text blocks than the base carries and one more (soft);
- the tells of a generic page in each screen's source (soft): gradient text, gradients of two hues, frosted glass, soft drop shadows, pills, a default face, a violet accent, tracked caps labels, emoji, stock marketing words. Facts, not verdicts: a reference may use one on purpose;
- `eval-log.md` reports nothing the agent could not follow (soft).

It prints `score: passed/checked` and exits 1 on any hard fail. What it cannot judge: whether the screens are good. That is the owner's, below.

## Against the default, blind

A round should beat what an agent makes from the same brief with no board.

```
node eval/design/run.mjs --out ../lb-plain --plain --from ../lb-eval --agent 'claude -p {prompt}'   # the baseline, once
node eval/design/score.mjs ../lb-eval --plain ../lb-plain
```

- **The baseline:** the same product brief, design brief, pictures and content, built by an agent with no board and no skills, in a folder of its own: eight first screens. Keep one for a series of runs, so each round meets the same default.
- **The blind sheet:** the round and the baseline shuffled into one sheet, numbered only (`.longbeard/eval/blind/sheet.png`, the key apart in `key.json`). The owner writes good, OK or bad beside each number in `marks.md`; the next score tallies the marks by set, and only then shows the baseline's tells.
- **Sameness** (`--other <run on the other board>`, soft): faces, ground, ink, how empty, picture share and headline size, measured alike on both runs; screens from two boards should be no more alike than screens of one. `.longbeard/eval/sameness/closest.html` shows the closest pairs.

`test/eval-score.test.js` keeps the scorer honest: a hand-made good run passes every check; a leaked name, a gap in the brief, a failing pair, a screen with no move and a dead link each fail; the tells are found; the blind sheet is shuffled once and tallied by set.
