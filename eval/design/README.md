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
node eval/design/run.mjs --out ../lb-eval --agent 'claude -p {prompt} --permission-mode acceptEdits --allowedTools "Bash(node:*)" "Bash(git:*)" "Bash(mkdir:*)" "Bash(cp:*)" Read Write Edit Glob Grep'
                                                                            # builds it and runs the agent
node eval/design/run.mjs --out ../lb-eval-2 --from ../lb-eval --agent …     # only the direction's screens
node eval/design/score.mjs ../lb-eval
```

`run.mjs` builds a fresh project outside this repo: the brief, the answers, the moodboard folder, the design skills as an install lays them out, `AGENTS.md` from the router, and `PROMPT.txt`. The agent runs from `design` to `DESIGN.md`, never Figma, and keeps `eval-log.md`. It needs Chrome, and the network for Google Fonts and Wikimedia Commons. `--agent` takes the prompt where it says `{prompt}`, else last; put it first when a flag takes a list (`--allowedTools` does), or the list swallows it. A headless agent has nobody to approve what it asks to do, so the example gives it what the flow needs: write files, run the skills' node scripts, git.

The agent is run with a time limit and a plain environment. `--timeout <minutes>` stops it, and everything it started, when it runs past that; the default is 180 (three hours: a full run takes hours, and a round of screens one or two). A run that was stopped says so and exits 1, and what it wrote can still be scored. It gets only `PATH`, `HOME`, the shell's basics (`USER`, `SHELL`, `TERM`, `LANG`, `LC_*`, `TMPDIR`, `TZ`), `CHROME_PATH`, proxy and certificate settings, and anything named `ANTHROPIC_*` or `CLAUDE_*`. Another variable it needs, such as a key for a different agent's API, is named with `--env NAME` (repeat the flag, or separate names with commas); everything else in your shell stays out.

To change only how the direction's screens are built, `--from <finished run>` takes its design brief, moodboard, readings, pictures and board, and the agent builds and checks the first round only. Every such run builds on the same inputs, so a difference between sheets is the rules'. Run the whole flow again before merging.

## Score

`score.mjs` checks, hard unless marked soft:

- every design doc and `DESIGN.md` is there; the design brief has every line, all seven scales, a distance and AA or AAA;
- no committed doc names a reference or a loved site, links to one, or points into `.longbeard/`. A name is matched as the board draws it (case and all) and as a whole word, so a name that is also a plain word (`calma`, `still practice`) trips only on the name itself, never on ordinary use;
- every screen has a base and moves from cards on the board, every reference is a base (soft), and a screen was chosen;
- the identity's json block parses; `DESIGN.md` records the brief's accessibility level, and every contrast pair on its colour tokens passes at it;
- rendered (skipped with `--no-browser`): the chosen screen and every prototype page pass contrast; the prototype's way on leads somewhere from the first page: a link, a form that submits to another page, or a button that navigates by script (`links.mjs` clicks it and follows the page it lands on);
- the round's screens (`screens.mjs`): no text under 12px at 1440, no clipped text, contrast on every screen; no more text blocks than the base carries and one more (soft);
- every screen has a `build` (quick or full) and a `state` in `screens.json`, a failed one with its why (soft);
- the tells of a generic page in each screen's source (soft): gradient text, gradients of two hues, frosted glass, soft drop shadows, pills, a default face, a violet accent, tracked caps labels, emoji, stock marketing words. The colours are read as the screen renders with them: in its CSS, and in its `LOOK` object (where the template keeps them, named in the CSS as `var(--ground)` and the like). Emoji are the pictures; ©, ™, ® and arrows are not. Facts, not verdicts: a reference may use one on purpose;
- `eval-log.md` reports nothing the agent could not follow (soft).

It also tells, outside the score, the time to the first sheet: from `run.mjs --agent`'s start (`.longbeard/eval/started.txt`; for a run by hand, `date +%s000 > .longbeard/eval/started.txt` before the agent starts) to `grid/sheet.png`. Read it on `--from` runs, which stop at the first sheet; an end-to-end run may draw later sheets over it. The first round is quick and should arrive in minutes.

It prints `score: passed/checked` and exits 1 on any hard fail. A score counts only the checks that ran. A check that could not run (no Chrome, a checker that crashed or gave no result, a fixture folder that cannot be read) is reported `NOT RUN`: it is not counted, it is never a pass, a hard one stays hard and fails the run, and the line says why. `SKIP` is only what you asked for (`--no-browser`) or what has nothing to check. The fixture is found from any checkout: a project records the path it was built from, and when that folder is not here, the same folder of this checkout is used. What it cannot judge: whether the screens are good. That is the owner's, below.

## Against the default, blind

A round should beat what an agent makes from the same brief with no board.

```
node eval/design/run.mjs --out ../lb-plain --plain --from ../lb-eval --agent 'claude -p {prompt}'   # the baseline, once
node eval/design/score.mjs ../lb-eval --plain ../lb-plain
```

- **The baseline:** the same product brief, design brief, pictures and content, built by an agent with no board and no skills, in a folder of its own: eight first screens. Keep one for a series of runs, so each round meets the same default.
- **The blind sheet:** the round and the baseline shuffled into one sheet, numbered only (`.longbeard/eval/blind/sheet.png`, the key apart in `key.json`). The owner writes good, OK or bad beside each number in `marks.md`; the next score tallies the marks by set, and only then shows the baseline's tells.
- **Sameness** (`--other <run on the other board>`, soft): faces, ground, ink, how empty, picture share and headline size, measured alike on both runs; screens from two boards should be no more alike than screens of one. `.longbeard/eval/sameness/closest.html` shows the closest pairs.

`test/eval-score.test.js` keeps the scorer honest: a hand-made good run passes every check; a leaked name, a gap in the brief, a failing pair, a screen with no move and a dead link each fail; a checker that crashes is not run and fails the run; the tells are found; the blind sheet is shuffled once and tallied by set.
