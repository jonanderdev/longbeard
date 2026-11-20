#!/usr/bin/env node
// Blind odd-one-out: does a dealt screen hold up beside the references? For
// each screen of the first dealt round, each judge gets six pictures in a
// random order (the screen and five references from the board, presentation
// frames cropped off, all at one width) and is asked which looks least
// finished in craft: spacing, alignment, type setting, text that does not fit.
// Not which style they prefer. Picked at chance (1 in 6) or less, the screens
// are at the references' level.
//
//   node eval/design/odd-one-out.mjs <project> --prepare [--judges 3] [--seed 1] [--out /tmp/odd-<name>]
//   node eval/design/odd-one-out.mjs <project> --judge "claude -p {prompt} --model sonnet --allowedTools Read" [--jobs 6]
//   node eval/design/odd-one-out.mjs <project> --tally
//
// --prepare writes one folder per screen and judge outside the project (a
// judge must never see the brief, the skills or this repo), with a.png to
// f.png and PROMPT.txt, and keeps the key in <project>/.longbeard/eval/odd-key.json.
// --judge runs the command in each folder with the prompt as its last
// argument and writes answer.txt. --tally reads every answer.txt and writes
// <project>/eval-odd-one-out.json, which score.mjs reads. The judges' reasons
// are for fixing rules, never a screen's composition.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const prepare = has("prepare");
const tally = has("tally");
const judgeCmd = flag("judge");
const judges = Number(flag("judges", "3"));
const jobs = Number(flag("jobs", "6"));
const seedArg = Number(flag("seed", "1"));
const outArg = flag("out");
const [projectArg] = args;
if (!projectArg || args.length !== 1 || [prepare, tally, Boolean(judgeCmd)].filter(Boolean).length !== 1 || !(judges >= 1 && judges <= 9)) {
  console.error('usage: node eval/design/odd-one-out.mjs <project> --prepare [--judges 3] [--seed 1] [--out dir] | --judge "<command>" [--jobs 6] | --tally');
  process.exit(2);
}
const dir = resolve(projectArg);
const keyPath = join(dir, ".longbeard/eval/odd-key.json");
// A PNG's or a JPEG's size, from its header.
function sizeOf(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  for (let i = 2; i < b.length; ) {
    const marker = b[i + 1], len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error(`cannot read the size of ${file}`);
}
const PROMPT = [
  "This folder holds six pictures, a.png to f.png. Each is a design: a web page or a poster.",
  "Open all six at full size. Which one looks least finished in its craft: spacing, alignment, type setting, text that does not fit or is too small to read?",
  "Judge the craft, not the style: not which you like least.",
  "Answer with the first line exactly `pick: <letter>`, then one or two sentences on why.",
].join(" ");

if (prepare) {
  // The screens: screens.mjs's captures, else the run's own grid captures.
  const shots = [join(dir, ".longbeard/eval/screens"), join(dir, ".longbeard/design/direction/grid"), ...(existsSync(join(dir, "design-exploration")) ? readdirSync(join(dir, "design-exploration")).map((d) => join(dir, "design-exploration", d, "grid")) : [])].find((d) => existsSync(join(d, "1.png")));
  if (!shots) throw new Error("no screen captures: run screens.mjs first");
  const screens = readdirSync(shots).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
  const board = join(here, "fixture/board");
  const frames = JSON.parse(readFileSync(join(here, "fixture/frames.json"), "utf8"));
  const refs = readdirSync(board).filter((f) => f.endsWith(".jpg"));
  const out = resolve(outArg || join(tmpdir(), `odd-${basename(dir)}`));
  if (out.startsWith(dir) || out.startsWith(repo)) throw new Error("--out must be outside the project and this repo");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  let state = seedArg >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = (xs) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // Every picture set at 1200 px wide, a framed reference cropped to its screen: drawn by Chrome, no image library.
  const capture = join(repo, "skills/design-direction/scripts/capture.mjs");
  const render = (src, crop, to) => {
    const [x, y, w, h] = crop || [0, 0, null, null];
    const [iw, ih] = sizeOf(src);
    const cw = w || iw, ch = h || ih, k = 1200 / cw;
    const page = join(out, `.render-${basename(to)}.html`);
    writeFileSync(page, `<!doctype html><style>html,body{margin:0;width:1200px;height:${Math.round(ch * k)}px;overflow:hidden}img{position:absolute;left:${-x * k}px;top:${-y * k}px;width:${iw * k}px}</style><img src="${pathToFileURL(src).href}" onload="document.title='ready'">`);
    const r = spawnSync(process.execPath, [capture, pathToFileURL(page).href, "--out", to, "--clip", `0,0,1200,${Math.round(ch * k)}`], { encoding: "utf8" });
    rmSync(page, { force: true });
    if (r.status !== 0) throw new Error(`could not draw ${src}: ${r.stderr}`);
  };
  const cache = join(out, ".refs");
  mkdirSync(cache, { recursive: true });
  for (const f of refs) render(join(board, f), frames[f.replace(/\.jpg$/, "")], join(cache, f.replace(/\.jpg$/, ".png")));
  const key = { out, judges, seed: seedArg, folders: {} };
  for (const s of screens) {
    const n = parseInt(s);
    const screenPng = join(cache, `screen-${n}.png`);
    render(join(shots, s), null, screenPng);
    for (let j = 1; j <= judges; j++) {
      const five = shuffle(refs).slice(0, 5).map((f) => f.replace(/\.jpg$/, ".png"));
      const six = shuffle([{ what: "screen", file: screenPng }, ...five.map((f) => ({ what: f.replace(/\.png$/, ""), file: join(cache, f) }))]);
      const folder = join(out, `${n}-${j}`);
      mkdirSync(folder, { recursive: true });
      const letters = {};
      six.forEach((p, i) => {
        const letter = "abcdef"[i];
        writeFileSync(join(folder, `${letter}.png`), readFileSync(p.file));
        letters[letter] = p.what;
      });
      writeFileSync(join(folder, "PROMPT.txt"), `${PROMPT}\n`);
      key.folders[`${n}-${j}`] = { n, judge: j, letters };
    }
  }
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, `${JSON.stringify(key, null, 1)}\n`);
  console.log(`odd-one-out: ${Object.keys(key.folders).length} folders in ${out} (${screens.length} screens × ${judges} judges). Next: --judge "<command>"`);
  process.exit(0);
}

const key = JSON.parse(readFileSync(keyPath, "utf8"));
if (judgeCmd) {
  const [cmd, ...rest] = judgeCmd.split(/\s+/).filter(Boolean);
  const todo = Object.keys(key.folders).filter((f) => !existsSync(join(key.out, f, "answer.txt")));
  let running = 0, i = 0;
  await new Promise((done) => {
    const next = () => {
      if (i >= todo.length && !running) return done();
      while (running < jobs && i < todo.length) {
        const folder = join(key.out, todo[i++]);
        running++;
        // {prompt} marks where the prompt goes (a flag that takes a list, like --allowedTools, would take it as one more); else it goes last.
        const argv = rest.includes("{prompt}") ? rest.map((a) => (a === "{prompt}" ? PROMPT : a)) : [...rest, PROMPT];
        const child = spawn(cmd, argv, { cwd: folder, stdio: ["ignore", "pipe", "pipe"] });
        let text = "";
        child.stdout.on("data", (d) => (text += d));
        child.on("close", () => {
          if (/pick:\s*[a-f]/i.test(text)) writeFileSync(join(folder, "answer.txt"), text);
          else console.error(`odd-one-out: no pick from ${folder}`);
          running--;
          next();
        });
      }
    };
    next();
  });
  console.log(`odd-one-out: judged ${todo.length} folders. Next: --tally`);
  process.exit(0);
}

// --tally
const picks = {};
let picked = 0, judged = 0;
const reasons = [];
for (const [name, f] of Object.entries(key.folders)) {
  const file = join(key.out, name, "answer.txt");
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const letter = text.match(/pick:\s*([a-f])/i)?.[1]?.toLowerCase();
  if (!letter) continue;
  const what = f.letters[letter];
  judged++;
  if (what === "screen") {
    picked++;
    reasons.push({ n: f.n, judge: f.judge, why: text.replace(/^.*pick:\s*[a-f]\s*/is, "").trim().slice(0, 400) });
  }
  (picks[f.n] ||= []).push(what);
}
const result = { picked, judged, rate: judged ? Math.round((1000 * picked) / judged) / 1000 : null, chance: 1 / 6, screens: picks, reasons };
writeFileSync(join(dir, "eval-odd-one-out.json"), `${JSON.stringify(result, null, 1)}\n`);
console.log(`odd one out: a dealt screen was picked ${picked} of ${judged} times (rate ${result.rate}; chance ${(1 / 6).toFixed(3)})`);
for (const [n, xs] of Object.entries(picks)) console.log(`  ${n}: ${xs.join(", ")}`);
