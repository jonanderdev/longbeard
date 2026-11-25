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
//                                   records it, so score.mjs uses the same one.
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
// where it says {prompt}, else as its last argument; quoting works. Put {prompt} first when the
// command's flags take a list (--allowedTools does), or the list swallows the prompt:
//   --agent 'claude -p {prompt} --permission-mode acceptEdits --allowedTools "Bash(node:*)" "Bash(git:*)" "Bash(mkdir:*)" "Bash(cp:*)" Read Write Edit Glob Grep'
// A headless agent has nobody to approve what it asks to do, so it is given what the flow needs: write
// files, run the skills' node scripts, git. The agent needs Chrome, and the network for Google Fonts and
// Wikimedia Commons (the subject's stand-in pictures). Figma is not part of it.
//
// --timeout <minutes> (default 180) stops the agent, and everything it started, when it runs past that.
// The agent gets only the environment it needs: PATH, HOME and the shell's basics, proxy and certificate
// settings, CHROME_PATH, and anything named ANTHROPIC_* or CLAUDE_*. Another variable it needs (a
// key for another agent's API, say) is named with --env NAME (repeat it, or comma-separate).
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// What --from never takes from a finished run: its screens, checks, messages, tools and eval files.
const fromSkip = /\/design\/tools(\/|$)|\/design\/direction\/(screens|grid|prototype|checks|fix-check|briefs|build)(\/|$)|\/screens\.json$|\/eval(\/|$)|\/design\/direction\/(round-\d+|messages|message-\d+|table)\.md$/;
const repo = resolve(here, "../..");
const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
// Every occurrence of a flag, each value split at commas.
const flags = (name) => {
  const all = [];
  for (let i = args.indexOf(`--${name}`); i !== -1; i = args.indexOf(`--${name}`)) all.push(...(args.splice(i, 2)[1] ?? "").split(",").map((v) => v.trim()).filter(Boolean));
  return all;
};
const shortAt = args.indexOf("--short");
const short = shortAt !== -1 && Boolean(args.splice(shortAt, 1));
const out = flag("out");
const agent = flag("agent");
const pace = flag("pace", "full");
// --short builds on the fixture's own finished readings, offline.
const from = short ? join(here, "fixture/readings") : flag("from");
const timeoutMinutes = Number(flag("timeout", short ? "30" : "180"));
const extraEnv = flags("env");
const plainAt = args.indexOf("--plain");
const plain = plainAt !== -1 && Boolean(args.splice(plainAt, 1));
const liveAt = args.indexOf("--live");
const live = liveAt !== -1 && Boolean(args.splice(liveAt, 1));
// A build-only run takes its board from the finished run it builds on, so the readings and the board always agree.
const fromFixture = from && existsSync(join(resolve(from), ".longbeard/eval/fixture.txt")) ? readFileSync(join(resolve(from), ".longbeard/eval/fixture.txt"), "utf8").trim() : "";
const fixtureArg = flag("fixture");
// The recorded path may be another checkout's: the same fixture folder in this one.
const fixture = resolve(fixtureArg || (fromFixture ? join(here, fromFixture.split("/").pop()) : join(here, "fixture")));
// A file of the fixture, or the default fixture's when it has none of its own (a second board shares the brief).
const fx = (rel) => (existsSync(join(fixture, rel)) ? join(fixture, rel) : join(here, "fixture", rel));
// What the agent is given of this shell's environment: the basics a command needs, the network's settings, and
// the agent's own variables. Everything else (other tools' keys and tokens) stays out unless --env names it.
const allowed = /^(PATH|HOME|USER|LOGNAME|SHELL|TERM|LANG|LANGUAGE|LC_[A-Z_]+|TMPDIR|TZ|PWD|CHROME_PATH|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|SSL_CERT_DIR|(HTTPS?|NO|ALL)_PROXY|ANTHROPIC_[A-Z0-9_]+|CLAUDE_[A-Z0-9_]+)$/i;
const usage = "usage: node eval/design/run.mjs --out <new folder outside this repo> [--short] [--pace full|quick] [--from <a finished run>] [--live] [--fixture <folder>] [--plain] [--agent \"claude -p {prompt}\"] [--timeout <minutes, default 180>] [--env NAME]";
if (!out || args.length || (short && plain) || !["full", "quick"].includes(pace) || !(timeoutMinutes > 0) || extraEnv.some((n) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) || (plain && (!from || !agent))) {
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
  const run = await runAgent(work, brief);
  const shots = existsSync(join(work, "screens")) ? readdirSync(join(work, "screens")).filter((f) => /^\d+\.html$/.test(f)) : [];
  mkdirSync(dir, { recursive: true });
  cpSync(work, dir, { recursive: true });
  const capture = join(repo, "skills/design-direction/scripts/capture.mjs");
  for (const f of shots) {
    const png = join(dir, "screens", f.replace(/html$/, "png"));
    const c = spawnSync(process.execPath, [capture, pathToFileURL(join(dir, "screens", f)).href, "--out", png, "--clip", "0,0,1440,900"], { encoding: "utf8" });
    if (c.status !== 0) console.error(`run: no capture of ${f}: ${c.stderr.trim()}`);
  }
  console.log(`agent ${run.timedOut ? `stopped after ${timeoutMinutes} minutes` : `exited ${run.status}`}; ${shots.length} screens in ${join(dir, "screens")}. Shuffle them into a run's sheet: node ${join(here, "score.mjs")} <run> --plain ${dir}`);
  process.exit(shots.length && !run.timedOut ? 0 : 1);
}

// The project: the brief, the answers, git, and the skills as an install would lay them out.
mkdirSync(dir, { recursive: true });
cpSync(fx("docs"), join(dir, "docs"), { recursive: true });
const answers = readFileSync(fx("answers.md"), "utf8").replace(/^- 10\. Pace: full\..*$/m, `- 10. Pace: ${pace}.`);
writeFileSync(join(dir, "answers.md"), answers);
const skills = readdirSync(join(repo, "skills")).filter((name) => name === "design" || name.startsWith("design-"));
for (const folder of [".claude/skills", ".agents/skills"]) for (const name of skills) {
  cpSync(join(repo, "skills", name), join(dir, folder, name), { recursive: true });
  // The subject's pictures are the fixture's, never a search: same photographs every run, no network.
  if (!live && existsSync(join(dir, folder, name, "scripts/pictures.mjs"))) cpSync(join(here, "mock/pictures.mjs"), join(dir, folder, name, "scripts/pictures.mjs"));
}
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
  cpSync(join(src, ".longbeard"), join(dir, ".longbeard"), { recursive: true, filter: (p) => !fromSkip.test(p.slice(src.length)) });
  // The fixture's readings keep no second copy of the fixture's pictures (freeze.mjs): put them back.
  if (existsSync(join(src, "restore.json"))) for (const [to, f] of Object.entries(JSON.parse(readFileSync(join(src, "restore.json"), "utf8")))) cpSync(join(here, f), join(dir, to));
}
// Which fixture this project was built from, for score.mjs.
mkdirSync(join(dir, ".longbeard/eval"), { recursive: true });
writeFileSync(join(dir, ".longbeard/eval/fixture.txt"), `${fixture}\n`);
// A run --from another stops at the first sheet: score.mjs skips what comes after it.
if (from) writeFileSync(join(dir, ".longbeard/eval/first-round.txt"), "design-direction, the first round's sheet\n");
// A short run is offline: its Chrome (the agent's and score.mjs's) reaches no host, and the faces the readings
// name come from fixture/fonts. Fontconfig serves them, so on Linux; elsewhere they fall back to installed faces.
if (short) {
  const real = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"].find((p) => p && p !== "none" && existsSync(p));
  if (!real) {
    console.error("run: no Chrome found (set CHROME_PATH); a short run needs one");
    process.exit(1);
  }
  const conf = join(dir, ".longbeard/eval/fonts.conf");
  writeFileSync(conf, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n  <dir>${join(here, "fixture/fonts")}</dir>\n  <cachedir>${join(dir, ".longbeard/eval/font-cache")}</cachedir>\n</fontconfig>\n`);
  writeFileSync(join(dir, ".longbeard/eval/chrome"), `#!/bin/sh\n# The eval's Chrome: no network, the fixture's faces installed.\nexport FONTCONFIG_FILE='${conf}'\nexec '${real}' --host-resolver-rules='MAP * ~NOTFOUND' --no-proxy-server "$@"\n`, { mode: 0o755 });
  process.env.CHROME_PATH = join(dir, ".longbeard/eval/chrome");
}
// The run ends when the agent's turn does, so nothing may still be working then.
const helpers = "Ending your turn ends the run: wait for every helper you start to finish, and never end while one is still working.";
const prompt = from ? [
  "This project's design flow has been run up to design-direction step 2: the design brief, the moodboard, the pictures and the readings (`.longbeard/design/direction/library.json`) are done, and the person's answers so far are in answers.md.",
  "Continue design-direction from step 3, following the skill exactly as written, with the readings and pictures as they are: do not read the references or search for pictures again.",
  "The person is away. Whenever a skill asks them anything, take their answer from answers.md and go on; never stop to wait.",
  "Keep eval-log.md: one line per stop (skill, what you asked, the answer you used, and **uncovered** when answers.md did not cover it), and one line for anything in a skill you could not follow, and why.",
  "Stop when you would show the person the first round's sheet of screens (after its checks): write the sheet, then end, going no further.",
  short ? "The Chrome the skills' scripts find is already this run's (CHROME_PATH): offline, with the readings' faces installed. Run the scripts as they are; do not set CHROME_PATH or point them at another Chrome." : "",
  helpers,
].filter(Boolean).join(" ") : [
  "Run this project's design flow end to end, from the `design` skill to an approved DESIGN.md, following each design-* skill exactly as written.",
  "The person is away. Whenever a skill asks them anything, take their answer from answers.md and go on; never stop to wait.",
  "Keep eval-log.md: one line per stop (skill, what you asked, the answer you used, and **uncovered** when answers.md did not cover it), and one line for anything in a skill you could not follow, and why.",
  "Do not run design-figma. Stop once DESIGN.md is written.",
  helpers,
].join(" ");
writeFileSync(join(dir, "PROMPT.txt"), `${prompt}\n`);
console.log(`project: ${dir} (pace ${pace}, ${skills.length} skills, ${board.length} references)`);
if (!agent) {
  console.log(`run the agent there with the prompt in PROMPT.txt, e.g.\n  cd ${dir} && claude -p "$(cat PROMPT.txt)" --permission-mode acceptEdits --allowedTools "Bash(node:*)" "Bash(git:*)" "Bash(mkdir:*)" "Bash(cp:*)" Read Write Edit Glob Grep\nthen: node ${join(here, "score.mjs")} ${dir}`);
  process.exit(0);
}
// The clock for score.mjs's time to the first sheet. A run by hand: `date +%s000 > .longbeard/eval/started.txt` before the agent starts.
writeFileSync(join(dir, ".longbeard/eval/started.txt"), `${Date.now()}\n`);
console.log(`running: ${agent} <prompt>`);
const run = await runAgent(dir, prompt);
console.log(`agent ${run.timedOut ? `stopped after ${timeoutMinutes} minutes (--timeout); what it wrote so far can still be scored` : `exited ${run.status}`}. Score it: node ${join(here, "score.mjs")} ${dir}`);
// A short run scores itself: one command for the check before a release.
if (short) process.exit(spawnSync(process.execPath, [join(here, "score.mjs"), dir], { stdio: "inherit" }).status || (run.timedOut || run.status ? 1 : 0));
process.exit(run.timedOut ? 1 : run.status ?? 1);

function agentEnv(text) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (allowed.test(k) || extraEnv.includes(k)) env[k] = v;
  // A headless agent ends when its turn does, and takes with it any helper still running in the
  // background: the prototype's workers were lost that way. Helpers run in the foreground here.
  delete env.CLAUDE_AUTO_BACKGROUND_TASKS;
  env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1";
  env.LB_EVAL_PICTURES = join(here, "fixture/pictures");
  env.LB_PROMPT = text;
  return env;
}

// The agent, through the shell so its command may quote (--allowedTools "Bash(node:*)"), the prompt at {prompt} or last.
// It runs as its own process group, so the time limit (and an interrupt here) stops whatever it started too.
function runAgent(cwd, text) {
  const line = agent.includes("{prompt}") ? agent.replaceAll("{prompt}", '"$LB_PROMPT"') : `${agent} "$LB_PROMPT"`;
  return new Promise((done) => {
    const child = spawn("/bin/sh", ["-c", line], { cwd, stdio: "inherit", env: agentEnv(text), detached: true });
    let timedOut = false;
    const stop = () => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => ((timedOut = true), stop()), timeoutMinutes * 60000);
    const interrupt = () => (stop(), process.exit(130));
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    child.on("error", (e) => {
      console.error(`run: ${e.message}`);
      process.exit(1);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
      done({ status, timedOut });
    });
  });
}
