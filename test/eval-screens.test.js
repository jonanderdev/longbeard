import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// A run's direction folder by hand: two built screens, 1 drawn well, 2 with a tiny label, a clipped line and too many blocks.
function project() {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-screens-"));
  const d = join(dir, ".longbeard/design/direction");
  mkdirSync(join(d, "screens"), { recursive: true });
  writeFileSync(join(d, "library.json"), JSON.stringify({ references: [{ name: "a", slots: { small: 1 } }, { name: "b", slots: { small: 2 } }] }));
  writeFileSync(join(d, "screens.json"), JSON.stringify([{ n: 1, base: "a", moves: [{ what: "the face", from: "b" }] }, { n: 2, base: "b", moves: [{ what: "a palette", from: "a" }] }]));
  const page = (body) => `<!doctype html><style>body{margin:0;font:16px system-ui;background:#f4f1ea;color:#111}nav a{font-size:13px;margin:8px}</style><body>${body}<script>document.title="ready"</script></body>`;
  writeFileSync(join(d, "screens/1.html"), page('<nav><a>Today</a><a>Order</a></nav><h1 style="font-size:96px">Bread is here.</h1><p>Order a loaf for pickup.</p>'));
  writeFileSync(join(d, "screens/2.html"), page('<nav><a>Today</a></nav><h1 style="font-size:96px">Bread</h1><p style="font-size:8px">tiny</p><p>one</p><p>two</p><p>three</p><div style="width:60px;overflow:hidden;white-space:nowrap">a line too long for its box</div>'));
  return dir;
}

test("screens: each screen's smallest text, clipped text, and blocks against its base's slots", (t) => {
  const dir = project();
  const r = spawnSync(process.execPath, [join(root, "eval/design/screens.mjs"), dir, "--json"], { encoding: "utf8", timeout: 240000 });
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stderr);
  const { summary, screens } = JSON.parse(r.stdout);
  assert.equal(summary.screens, 2);
  const [one, two] = screens;
  assert.ok(one.dom.minText >= 13, JSON.stringify(one.dom));
  assert.equal(two.dom.minText, 8);
  assert.deepEqual(summary.tiny.map((x) => parseInt(x)), [2]);
  assert.equal(one.dom.clipped.length, 0);
  assert.match(two.dom.clipped.join(), /a line too long/);
  // Blocks outside the navigation: the headline and the line on 1 (its base carries 1 small slot); six on 2 (2 slots).
  assert.deepEqual([one.dom.blocks, one.capacity], [2, 3]);
  assert.deepEqual([two.dom.blocks, two.capacity], [6, 4]);
  assert.deepEqual(summary.overSlots, ["2 (6 blocks, its base carries 3)"]);
});

// screens.mjs finds screen-contrast.mjs from its own place in the repo, so a copy of it in a made-up tree runs a stub in its stead.
function withContrastStub(body) {
  const tree = mkdtempSync(join(tmpdir(), "longbeard-screens-tree-"));
  mkdirSync(join(tree, "eval/design"), { recursive: true });
  mkdirSync(join(tree, "skills/design-direction/scripts"), { recursive: true });
  copyFileSync(join(root, "eval/design/screens.mjs"), join(tree, "eval/design/screens.mjs"));
  writeFileSync(join(tree, "skills/design-direction/scripts/screen-contrast.mjs"), body);
  return join(tree, "eval/design/screens.mjs");
}

test("screens: a contrast run that crashes, exits with another code or says nothing readable is not run, never a pass", (t) => {
  const dir = project();
  const stubs = {
    crash: 'throw new Error("boom");\n',
    "could not run": 'console.error("screen-contrast: no Chrome"); process.exit(3);\n',
    "nothing readable": 'console.log("done"); process.exit(0);\n',
    "usage": "process.exit(2);\n",
  };
  for (const [what, body] of Object.entries(stubs)) {
    const r = spawnSync(process.execPath, [withContrastStub(body), dir, "--json"], { encoding: "utf8", timeout: 240000 });
    if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
    assert.equal(r.status, 0, `${what}: ${r.stderr}`);
    const { summary, screens } = JSON.parse(r.stdout);
    assert.deepEqual(screens.map((s) => s.contrast.failing), [null, null], what);
    assert.equal(summary.contrastNotRun.length, 2, what);
    assert.deepEqual(summary.contrast, [], what);
  }
  // A result with a failure is a failure: exit 1 with what failed.
  const failing = 'process.stdout.write(JSON.stringify({ texts: [{ text: "Order", p5: 2.1, pass: false }], failing: 1 })); process.exit(1);\n';
  const r = spawnSync(process.execPath, [withContrastStub(failing), dir, "--json"], { encoding: "utf8", timeout: 240000 });
  const { summary } = JSON.parse(r.stdout);
  assert.equal(summary.contrast.length, 2);
  assert.deepEqual(summary.contrastNotRun, []);
});

// A fake agent that writes down the environment it was given, or sleeps past its time limit.
const nodeAgent = (code) => `"${process.execPath}" -e '${code}' {prompt}`;
const runFolder = () => join(mkdtempSync(join(tmpdir(), "longbeard-run-")), "p");

test("run.mjs gives the agent only the environment it needs, and the ones named with --env", () => {
  const out = runFolder();
  const run = spawnSync(process.execPath, [join(root, "eval/design/run.mjs"), "--out", out, "--env", "WANTED_KEY", "--agent", nodeAgent('require("fs").writeFileSync("env.json", JSON.stringify(process.env))')], {
    encoding: "utf8",
    env: { ...process.env, SECRET_TOKEN: "s", AWS_SECRET_ACCESS_KEY: "s", GITHUB_TOKEN: "s", WANTED_KEY: "w", ANTHROPIC_API_KEY: "a", CLAUDE_CODE_X: "c", CLAUDE_AUTO_BACKGROUND_TASKS: "true" },
  });
  assert.equal(run.status, 0, run.stderr);
  const env = JSON.parse(readFileSync(join(out, "env.json"), "utf8"));
  for (const name of ["PATH", "HOME", "LB_PROMPT", "WANTED_KEY", "ANTHROPIC_API_KEY", "CLAUDE_CODE_X"]) assert.ok(env[name], `${name} reaches the agent`);
  for (const name of ["SECRET_TOKEN", "AWS_SECRET_ACCESS_KEY", "GITHUB_TOKEN"]) assert.equal(env[name], undefined, `${name} stays out`);
  // A headless agent must not leave helpers in the background when its turn ends.
  assert.equal(env.CLAUDE_AUTO_BACKGROUND_TASKS, undefined);
  assert.equal(env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS, "1");
  assert.match(env.LB_PROMPT, /wait for every helper/);
});

test("run.mjs --short builds on the frozen readings, offline, and its pictures.mjs searches nothing", () => {
  const out = runFolder();
  // Any file stands in for Chrome: the project is only built here, never rendered.
  const run = spawnSync(process.execPath, [join(root, "eval/design/run.mjs"), "--short", "--out", out], { encoding: "utf8", env: { ...process.env, CHROME_PATH: process.execPath } });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(out, ".longbeard/design/direction/library.json")));
  assert.match(readFileSync(join(out, "PROMPT.txt"), "utf8"), /Continue design-direction from step 3/);
  // The pictures the freeze left out come back from the fixture.
  const restore = JSON.parse(readFileSync(join(root, "eval/design/fixture/readings/restore.json"), "utf8"));
  for (const path of Object.keys(restore)) assert.ok(existsSync(join(out, path)), `${path} restored`);
  // Its Chrome resolves no host and has the fixture's faces.
  const chrome = readFileSync(join(out, ".longbeard/eval/chrome"), "utf8");
  assert.match(chrome, /MAP \* ~NOTFOUND/);
  assert.match(readFileSync(join(out, ".longbeard/eval/fonts.conf"), "utf8"), /fixture\/fonts/);
  // pictures.mjs hands out the fixture's photographs, credited, with no search.
  const pics = join(out, "pics");
  const p = spawnSync(process.execPath, [join(out, ".claude/skills/design-direction/scripts/pictures.mjs"), "sourdough loaf", "--out", pics, "--count", "2"], { encoding: "utf8", cwd: out, env: { ...process.env, LB_EVAL_PICTURES: join(root, "eval/design/fixture/pictures") } });
  assert.equal(p.status, 0, p.stderr);
  const rows = readFileSync(join(pics, "credits.tsv"), "utf8").trim().split("\n").slice(1);
  assert.equal(rows.length, 2);
  for (const r of rows) assert.ok(existsSync(r.split("\t")[1]) && r.split("\t")[4] === "CC0", r);
});

test("run.mjs stops an agent that runs past --timeout, and says so", () => {
  const out = runFolder();
  const began = Date.now();
  // 0.02 minutes: a little over a second; the agent would sleep half a minute.
  const run = spawnSync(process.execPath, [join(root, "eval/design/run.mjs"), "--out", out, "--timeout", "0.02", "--agent", nodeAgent("setTimeout(() => {}, 30000)")], { encoding: "utf8" });
  assert.equal(run.status, 1, run.stdout + run.stderr);
  assert.match(run.stdout, /stopped after 0\.02 minutes/);
  assert.ok(Date.now() - began < 20000, "stopped well before the agent would have ended");
  // A limit that is not a positive number of minutes is a usage error.
  assert.equal(spawnSync(process.execPath, [join(root, "eval/design/run.mjs"), "--out", runFolder(), "--timeout", "soon"], { encoding: "utf8" }).status, 2);
});

test("run.mjs --fixture builds from another board, and score.mjs guards that board's names", () => {
  const fx = mkdtempSync(join(tmpdir(), "longbeard-fixture-"));
  mkdirSync(join(fx, "board"));
  writeFileSync(join(fx, "board/01-other-card.jpg"), "not really a jpeg");
  writeFileSync(join(fx, "sources.json"), JSON.stringify(["Quillfeather Studio"]));
  const out = join(mkdtempSync(join(tmpdir(), "longbeard-run-")), "p");
  const run = spawnSync(process.execPath, [join(root, "eval/design/run.mjs"), "--out", out, "--fixture", fx], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /1 references/);
  assert.equal(readFileSync(join(out, "moodboard/01-other-card.jpg"), "utf8"), "not really a jpeg");
  assert.equal(readFileSync(join(out, ".longbeard/eval/fixture.txt"), "utf8").trim(), fx);
  // The brief and the answers come from the default fixture when the board has none of its own.
  assert.ok(readFileSync(join(out, "answers.md"), "utf8").length > 0);
  writeFileSync(join(out, "DESIGN.md"), "# Design\n\nThe headline is set like Quillfeather Studio's.\n");
  const score = spawnSync(process.execPath, [join(root, "eval/design/score.mjs"), out, "--json", "--no-browser"], { encoding: "utf8" });
  const leak = JSON.parse(score.stdout).results.find((r) => r.id === "no source in the docs");
  assert.equal(leak.status, "FAIL", score.stdout);
  assert.match(leak.detail, /Quillfeather Studio/);
});
