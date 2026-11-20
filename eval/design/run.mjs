#!/usr/bin/env node
// A repeatable end-to-end run of the design skills: a fresh project with a fixed
// product brief, a ten-reference board and the person's answers for every stop,
// the skills as they are in this repo, and one prompt that takes an agent from
// `design` to DESIGN.md. Then score.mjs judges what it wrote.
//
//   node eval/design/run.mjs --out ../longbeard-eval                       builds the project, prints the command
//   node eval/design/run.mjs --out ../longbeard-eval --agent "claude -p"   builds it and runs the agent there
//   node eval/design/run.mjs --out ../longbeard-eval --pace quick          the quick path instead of full
//   node eval/design/run.mjs --out ../longbeard-eval --fixture eval/design/fixture-2
//                                   another board: the fixture folder's board/, and its docs/ and
//                                   answers.md where it has its own (else fixture/'s). The project
//                                   records it, so score.mjs and odd-one-out.mjs use the same one.
//   node eval/design/run.mjs --out ../longbeard-eval-2 --from ../longbeard-eval
//                                   only the build: the design brief, the moodboard, the readings
//                                   (library.json) and the pictures are taken from a finished run, and the
//                                   agent builds the direction's screens and checks them, with this repo's
//                                   skills. For changing the build rules: faster, and every run builds on
//                                   the same inputs, so a difference between sheets is the rules'. The board
//                                   is the finished run's own (its .longbeard/eval/fixture.txt) unless --fixture says.
//   node eval/design/run.mjs --out ../longbeard-plain --plain --from ../longbeard-eval --agent "claude -p"
//                                   the baseline: the same product, design brief, pictures and content, built
//                                   by an agent with no board and no skills, eight first screens. It works in
//                                   a fresh folder of its own, outside any run, so it sees nothing else; its
//                                   screens are copied to --out/screens and captured. score.mjs --plain shuffles
//                                   them unlabelled into a run's sheet for the owner to mark.
//
// --agent is any shell command that works in the current folder and takes the prompt
// where it says {prompt}, else as its last argument; quoting works:
//   --agent 'claude -p {prompt} --allowedTools "Bash(node:*)" Read Write'. The agent needs Chrome, and the network for Google Fonts and
// Wikimedia Commons (the subject's stand-in pictures). Figma is not part of it.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const out = flag("out");
const agent = flag("agent");
const pace = flag("pace", "full");
const from = flag("from");
const plainAt = args.indexOf("--plain");
const plain = plainAt !== -1 && Boolean(args.splice(plainAt, 1));
// A build-only run takes its board from the finished run it builds on, so the readings and the board always agree.
const fromFixture = from && existsSync(join(resolve(from), ".longbeard/eval/fixture.txt")) ? readFileSync(join(resolve(from), ".longbeard/eval/fixture.txt"), "utf8").trim() : "";
const fixtureArg = flag("fixture");
if (fixtureArg && fromFixture && resolve(fixtureArg).replace(/\/$/, "").split("/").pop() !== fromFixture.split("/").pop()) {
  console.error(`run: --fixture ${fixtureArg} is not the board ${from} was read from (${fromFixture})`);
  process.exit(2);
}
// The recorded path may be another checkout's: the same fixture folder in this one.
const fixture = resolve(fixtureArg || (fromFixture ? join(here, fromFixture.split("/").pop()) : join(here, "fixture")));
// A file of the fixture, or the default fixture's when it has none of its own (a second board shares the brief).
const fx = (rel) => (existsSync(join(fixture, rel)) ? join(fixture, rel) : join(here, "fixture", rel));
const usage = "usage: node eval/design/run.mjs --out <new folder outside this repo> [--pace full|quick] [--from <a finished run>] [--fixture <folder>] [--plain] [--agent \"claude -p\"]";
if (!out || args.length || !["full", "quick"].includes(pace) || (plain && (!from || !agent))) {
  if (plain && (!from || !agent)) console.error("run: --plain needs --from (the brief, pictures and content it builds from) and --agent");
  console.error(usage);
  process.exit(2);
}
const dir = resolve(out);
if (!existsSync(join(fixture, "board"))) {
  console.error(`run: ${fixture} has no board/ folder`);
  process.exit(2);
}
if (dir === repo || dir.startsWith(repo + "/")) {
  console.error("run: build the project outside this repo, so the run cannot touch it");
  process.exit(2);
}
if (existsSync(dir) && readdirSync(dir).length) {
  console.error(`run: ${dir} is not empty: every run starts fresh`);
  process.exit(1);
}

// --plain: the baseline. No board, no skills, no Long Beard: the product brief, the design brief, the subject's
// pictures and the content the screens carry, in a fresh folder of its own, so the agent cannot look into another run.
if (plain) {
  const src = resolve(from);
  const pics = join(src, ".longbeard/design/pictures");
  if (!existsSync(join(src, "docs/design/design-brief.md")) || !existsSync(pics)) {
    console.error(`run: ${src} has no design brief or pictures to build the baseline from`);
    process.exit(1);
  }
  const work = mkdtempSync(join(tmpdir(), "plain-"));
  cpSync(join(src, "docs/brief.md"), join(work, "docs/brief.md"));
  cpSync(join(src, "docs/design/design-brief.md"), join(work, "docs/design-brief.md"));
  for (const f of readdirSync(pics).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) cpSync(join(pics, f), join(work, "pictures", f));
  cpSync(join(here, "fixture/plain.md"), join(work, "content.md"));
  const brief = [
    "Design the first screen of the website for the product in docs/brief.md, following its design brief in docs/design-brief.md.",
    "Make eight different directions for that first screen, each as good as you can make it: screens/1.html to screens/8.html, each a self-contained page of plain HTML and CSS (web fonts are fine) designed for a 1440 by 900 window, using the photographs in pictures/ and exactly the content in content.md.",
    "The owner will choose one of the eight. Work alone in this folder; when the eight files are written, stop.",
  ].join(" ");
  writeFileSync(join(work, "PROMPT.txt"), `${brief}\n`);
  console.log(`baseline: ${work}\nrunning: ${agent} <prompt>`);
  const run = runAgent(work, brief);
  const shots = existsSync(join(work, "screens")) ? readdirSync(join(work, "screens")).filter((f) => /^\d+\.html$/.test(f)) : [];
  mkdirSync(dir, { recursive: true });
  cpSync(work, dir, { recursive: true });
  const capture = join(repo, "skills/design-direction/scripts/capture.mjs");
  for (const f of shots) {
    const png = join(dir, "screens", f.replace(/html$/, "png"));
    const c = spawnSync(process.execPath, [capture, pathToFileURL(join(dir, "screens", f)).href, "--out", png, "--clip", "0,0,1440,900"], { encoding: "utf8" });
    if (c.status !== 0) console.error(`run: no capture of ${f}: ${c.stderr.trim()}`);
  }
  console.log(`agent exited ${run.status}; ${shots.length} screens in ${join(dir, "screens")}. Shuffle them into a run's sheet: node ${join(here, "score.mjs")} <run> --plain ${dir}`);
  process.exit(shots.length ? 0 : 1);
}

// The project: the brief, the answers, git, and the skills as an install would lay them out.
mkdirSync(dir, { recursive: true });
cpSync(fx("docs"), join(dir, "docs"), { recursive: true });
const answers = readFileSync(fx("answers.md"), "utf8").replace(/^- 10\. Pace: full\..*$/m, `- 10. Pace: ${pace}.`);
writeFileSync(join(dir, "answers.md"), answers);
const skills = readdirSync(join(repo, "skills")).filter((name) => name === "design" || name.startsWith("design-"));
for (const folder of [".claude/skills", ".agents/skills"]) for (const name of skills) cpSync(join(repo, "skills", name), join(dir, folder, name), { recursive: true });
const router = spawnSync(process.execPath, [join(repo, "bin/long-beard.js"), "router"], { encoding: "utf8" });
if (router.status !== 0) {
  console.error(router.stderr);
  process.exit(1);
}
writeFileSync(join(dir, "AGENTS.md"), router.stdout);
writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n");
writeFileSync(join(dir, ".gitignore"), ".longbeard/\n");
spawnSync("git", ["init", "-q"], { cwd: dir });

// The board: the pictures a person would have saved, as they are (board/CREDITS.md).
mkdirSync(join(dir, "moodboard"), { recursive: true });
const board = readdirSync(join(fixture, "board")).filter((f) => f.endsWith(".jpg"));
for (const f of board) cpSync(join(fixture, "board", f), join(dir, "moodboard", f));

// --from: the inputs of a finished run, up to and including the readings, never its screens.
if (from) {
  const src = resolve(from);
  if (!existsSync(join(src, ".longbeard/design/direction/library.json"))) {
    console.error(`run: ${src} has no .longbeard/design/direction/library.json to build from`);
    process.exit(1);
  }
  cpSync(join(src, "docs"), join(dir, "docs"), { recursive: true });
  cpSync(join(src, ".longbeard"), join(dir, ".longbeard"), { recursive: true, filter: (p) => !/\/design\/tools(\/|$)|\/design\/direction\/(screens|grid|prototype|checks|fix-check|briefs|build)(\/|$)|\/screens\.json$|\/eval\/|\/design\/direction\/(round-\d+|messages|message-\d+|table)\.md$/.test(p) });
}
// Which fixture this project was built from, for score.mjs and odd-one-out.mjs.
mkdirSync(join(dir, ".longbeard/eval"), { recursive: true });
writeFileSync(join(dir, ".longbeard/eval/fixture.txt"), `${fixture}\n`);
const prompt = from ? [
  "This project's design flow has been run up to design-direction step 2: the design brief, the moodboard, the pictures and the readings (`.longbeard/design/direction/library.json`) are done, and the person's answers so far are in answers.md.",
  "Continue design-direction from step 3, following the skill exactly as written, with the readings and pictures as they are: do not read the references or search for pictures again.",
  "The person is away. Whenever a skill asks them anything, take their answer from answers.md and go on; never stop to wait.",
  "Keep eval-log.md: one line per stop (skill, what you asked, the answer you used, and **uncovered** when answers.md did not cover it), and one line for anything in a skill you could not follow, and why.",
  "Stop when you would show the person the first round's sheet of screens (after its checks): write the sheet, then end, going no further.",
].join(" ") : [
  "Run this project's design flow end to end, from the `design` skill to an approved DESIGN.md, following each design-* skill exactly as written.",
  "The person is away. Whenever a skill asks them anything, take their answer from answers.md and go on; never stop to wait.",
  "Keep eval-log.md: one line per stop (skill, what you asked, the answer you used, and **uncovered** when answers.md did not cover it), and one line for anything in a skill you could not follow, and why.",
  "Do not run design-figma. Stop once DESIGN.md is written.",
].join(" ");
writeFileSync(join(dir, "PROMPT.txt"), `${prompt}\n`);
console.log(`project: ${dir} (pace ${pace}, ${skills.length} skills, ${board.length} references)`);
if (!agent) {
  console.log(`run the agent there with the prompt in PROMPT.txt, e.g.\n  cd ${dir} && claude -p "$(cat PROMPT.txt)"\nthen: node ${join(here, "score.mjs")} ${dir}`);
  process.exit(0);
}
console.log(`running: ${agent} <prompt>`);
const run = runAgent(dir, prompt);
console.log(`agent exited ${run.status}. Score it: node ${join(here, "score.mjs")} ${dir}`);
process.exit(run.status ?? 1);

// The agent, through the shell so its command may quote (--allowedTools "Bash(node:*)"), the prompt at {prompt} or last.
function runAgent(cwd, text) {
  const line = agent.includes("{prompt}") ? agent.replaceAll("{prompt}", '"$LB_PROMPT"') : `${agent} "$LB_PROMPT"`;
  const r = spawnSync("/bin/sh", ["-c", line], { cwd, stdio: "inherit", env: { ...process.env, LB_PROMPT: text } });
  if (r.error) {
    console.error(`run: ${r.error.message}`);
    process.exit(1);
  }
  return r;
}
