import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const skills = join(dirname(fileURLToPath(import.meta.url)), "../skills");
const canvas = join(skills, "design-direction", "scripts", "canvas.mjs");
const drift = join(skills, "design-prototype", "scripts", "drift.mjs");
const moodboard = join(skills, "design-moodboard", "scripts", "moodboard.mjs");

function project(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-cohesion-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
const run = (file, dir, args, env = {}) => spawnSync(process.execPath, [file, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } });

const board = `### Quiet <b>serif</b>
- shot: refs/a.jpg
- like: the orange "dot"
- also: index: refs/a-index.jpg
- also: article: refs/a-article.jpg

### Loud
- shot: refs/b.jpg
`;
const screens = [
  { n: 1, base: "Quiet <b>serif</b>", moves: [{ what: "the headline", from: "Loud", like: "confident" }], build: "quick", state: "built" },
  { n: 2, base: "Loud", moves: [], build: "quick", state: "failed", failure: "could not read it" },
  { n: 3, of: 1, part: "menu", base: "Quiet <b>serif</b>", moves: [], build: "quick", state: "built" },
  { n: 4, of: 1, test: true, base: "Quiet <b>serif</b>", moves: [], build: "full", state: "fixed", fault: "names wrap" },
];
const files = { "board.md": board, "refs/a.jpg": "x", "refs/b.jpg": "x", "refs/a-index.jpg": "x", "refs/a-article.jpg": "x", "grid/1.png": "x", "grid/2.png": "x", "grid/3.png": "x", "grid/4.png": "x" };

test("canvas: rounds, parts and the hardest screen each in a row, references escaped", () => {
  const dir = project({ ...files, "screens.json": JSON.stringify(screens) });
  const r = run(canvas, dir, ["screens.json", "--board", "board.md", "--shots", "grid", "--out", "canvas.html"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /4 screens in 3 rows/);
  const html = readFileSync(join(dir, "canvas.html"), "utf8");
  assert.match(html, /<span class="rl">Round 1<\/span>/);
  assert.match(html, /<span class="rl">1 · menu<\/span>/);
  assert.match(html, /<span class="rl">1 · hardest screen<\/span>/);
  assert.match(html, /data-n="2" data-failed/);
  assert.match(html, /"fault":"failed: could not read it"/);
  assert.match(html, /"like":"the orange \\"dot\\""/);
  assert.doesNotMatch(html, /<b>serif/);
  assert.match(html, /Quiet \\u003cb>serif/);
});

test("canvas: refuses while a screen has no state, and counts a missing picture", () => {
  const dir = project({ ...files, "screens.json": JSON.stringify([{ n: 1, base: "Loud", moves: [] }]) });
  const r = run(canvas, dir, ["screens.json", "--shots", "grid", "--out", "c.html"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no state yet/);
  const dir2 = project({ "screens.json": JSON.stringify([{ n: 9, base: "Loud", moves: [], state: "built" }]) });
  const r2 = run(canvas, dir2, ["screens.json", "--shots", "grid", "--out", "c.html"]);
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(r2.stderr, /1 without a picture/);
});

test("moodboard: a card's other screens show with it, never as tiles of their own", () => {
  const dir = project(files);
  const r = run(moodboard, dir, ["board.md", "--out", "b.html"]);
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(dir, "b.html"), "utf8");
  assert.equal(html.match(/<figure class="tile"/g).length, 2);
  assert.equal(html.match(/class="sib"/g).length, 2);
  assert.match(html, /<span>index<\/span>/);
  assert.match(html, /alt="Quiet &lt;b&gt;serif&lt;\/b&gt;: article"/);
});

test("drift: usage, and not checked without a browser", () => {
  const dir = project({ "id.md": "no block here" });
  assert.equal(run(drift, dir, []).status, 2);
  assert.match(run(drift, dir, ["file:///x.html", "--identity", "id.md"]).stderr, /no `json identity` block/);
  const r = run(drift, dir, ["file:///x.html"], { CHROME_PATH: "none" });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /not checked/);
});
