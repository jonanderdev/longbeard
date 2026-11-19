#!/usr/bin/env node
// A repeatable end-to-end run of the design skills: a fresh project with a fixed
// product brief, a ten-reference board and the person's answers for every stop,
// the skills as they are in this repo, and one prompt that takes an agent from
// `design` to DESIGN.md. Then score.mjs judges what it wrote.
//
//   node eval/design/run.mjs --out ../longbeard-eval                       builds the project, prints the command
//   node eval/design/run.mjs --out ../longbeard-eval --agent "claude -p"   builds it and runs the agent there
//   node eval/design/run.mjs --out ../longbeard-eval --pace quick          the quick path instead of full
//
// --agent is any command that takes the prompt as its last argument and works in
// the current folder. It needs Chrome, and the network for Google Fonts and
// Wikimedia Commons (the subject's stand-in pictures). Figma is not part of it.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { refs } from "./fixture/refs.mjs";

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
const usage = "usage: node eval/design/run.mjs --out <new folder outside this repo> [--pace full|quick] [--agent \"claude -p\"]";
if (!out || args.length || !["full", "quick"].includes(pace)) {
  console.error(usage);
  process.exit(2);
}
const dir = resolve(out);
if (dir === repo || dir.startsWith(repo + "/")) {
  console.error("run: build the project outside this repo, so the run cannot touch it");
  process.exit(2);
}
if (existsSync(dir) && readdirSync(dir).length) {
  console.error(`run: ${dir} is not empty: every run starts fresh`);
  process.exit(1);
}

// The project: the brief, the answers, git, and the skills as an install would lay them out.
mkdirSync(dir, { recursive: true });
cpSync(join(here, "fixture/docs"), join(dir, "docs"), { recursive: true });
const answers = readFileSync(join(here, "fixture/answers.md"), "utf8").replace(/^- 10\. Pace: full\..*$/m, `- 10. Pace: ${pace}.`);
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

// The board: each reference page rendered to the picture a person would have saved.
const pages = join(dir, ".longbeard/eval-pages");
mkdirSync(pages, { recursive: true });
mkdirSync(join(dir, "moodboard"), { recursive: true });
const capture = join(repo, "skills/design-moodboard/scripts/capture.mjs");
for (const [name, html] of Object.entries(refs)) {
  writeFileSync(join(pages, `${name}.html`), html);
  const shot = spawnSync(process.execPath, [capture, pathToFileURL(join(pages, `${name}.html`)).href, "--out", join(dir, "moodboard", `${name}.png`), "--wait", "0"], { encoding: "utf8" });
  if (shot.status !== 0) {
    console.error(`run: could not render ${name}: ${shot.stderr.trim()}`);
    process.exit(1);
  }
}
rmSync(pages, { recursive: true, force: true });

const prompt = [
  "Run this project's design flow end to end, from the `design` skill to an approved DESIGN.md, following each design-* skill exactly as written.",
  "The person is away. Whenever a skill asks them anything, take their answer from answers.md and go on; never stop to wait.",
  "Keep eval-log.md: one line per stop (skill, what you asked, the answer you used, and **uncovered** when answers.md did not cover it), and one line for anything in a skill you could not follow, and why.",
  "Do not run design-figma. Stop once DESIGN.md is written.",
].join(" ");
writeFileSync(join(dir, "PROMPT.txt"), `${prompt}\n`);
console.log(`project: ${dir} (pace ${pace}, ${skills.length} skills, ${Object.keys(refs).length} references)`);
if (!agent) {
  console.log(`run the agent there with the prompt in PROMPT.txt, e.g.\n  cd ${dir} && claude -p "$(cat PROMPT.txt)"\nthen: node ${join(here, "score.mjs")} ${dir}`);
  process.exit(0);
}
const [cmd, ...rest] = agent.split(/\s+/).filter(Boolean);
console.log(`running: ${agent} <prompt>`);
const run = spawnSync(cmd, [...rest, prompt], { cwd: dir, stdio: "inherit" });
if (run.error) {
  console.error(`run: ${run.error.message}`);
  process.exit(1);
}
console.log(`agent exited ${run.status}. Score it: node ${join(here, "score.mjs")} ${dir}`);
process.exit(run.status ?? 1);
