import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scripts = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-direction/scripts");

// A project outside any git tree, so the scripts resolve paths against it.
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-direction-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function run(script, dir, args) {
  const result = spawnSync(process.execPath, [join(scripts, script), ...args], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

const card = (name, extra = "") => `### ${name}
- link: https://example.com/${encodeURIComponent(name)}
- shot: design-exploration/identity/refs/${name.length}.jpg
- pattern: ${name}
- why: fits
${extra}`;

function board(cards) {
  const files = { "design-exploration/identity/board.md": `# Board\n\n${cards.join("\n")}` };
  for (const text of cards) files[text.match(/- shot: (.*)/)[1]] = "jpg";
  return files;
}

test("moodboard: one tile per card with a shot, its name linked to its source", () => {
  const seed = card("Seed").replace(/- link: .*/, "- link: none (shared in chat)");
  const dir = project(board([card("Ledger, ruled & plain"), seed]));
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "design-exploration/identity/moodboard.html"]);
  const html = readFileSync(join(dir, "design-exploration/identity/moodboard.html"), "utf8");
  assert.equal(html.match(/<figure class="tile"/g)?.length, 2);
  assert.match(html, /<a class="name" href="https:\/\/example\.com\/Ledger/);
  assert.match(html, /<span class="name">Seed<\/span>/);
  assert.match(html, /<img src="\.\/refs\/4\.jpg" alt="Seed"/);
  assert.match(html, /class="line">Seed</);
  assert.equal(html.match(/<button type="button" data-mark="lead"/g)?.length, 2);
  assert.equal(html.match(/class="why"/g)?.length, 2);
});

test("moodboard: a card's measured traits show small under its pattern", () => {
  const dir = project(board([card("Quiet", "- measured: light · empty 64% · loud 2%\n"), card("Loud")]));
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  const html = readFileSync(join(dir, "m.html"), "utf8");
  assert.equal(html.match(/<p class="measured">/g)?.length, 1);
  assert.match(html, /<p class="measured">light · empty 64% · loud 2%<\/p>/);
});

test("moodboard: tiles group by topic, parts of a site first, then others, then Other", () => {
  const dir = project(
    board([
      card("Aa", "- topic: Pricing"),
      card("Bbb", "- topic: nav"),
      card("Cccc"),
      card("Ddddd", "- topic: home"),
    ]),
  );
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  const html = readFileSync(join(dir, "m.html"), "utf8");
  const parts = [...html.matchAll(/<h2>([^<]+) <span>/g)].map((m) => m[1]);
  assert.deepEqual(parts, ["Home", "Navigation", "Pricing", "Other"]);
  assert.match(html, /data-id="m2" data-title="Bbb" data-topic="Navigation"/);
});

test("moodboard: a card with recorded frames plays them, and needs no shot", () => {
  const files = {
    "design-exploration/identity/board.md": `### Intro\n- link: https://example.com\n- frames: design-exploration/identity/refs/intro/\n- topic: motion\n`,
    "design-exploration/identity/refs/intro/01-00000ms.jpg": "jpg",
    "design-exploration/identity/refs/intro/02-00480ms.jpg": "jpg",
  };
  const dir = project(files);
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "design-exploration/identity/moodboard.html"]);
  const html = readFileSync(join(dir, "design-exploration/identity/moodboard.html"), "utf8");
  assert.match(html, /<img src="\.\/refs\/intro\/02-00480ms\.jpg"/);
  assert.match(html, /data-frames="\[\{&quot;src&quot;:&quot;\.\/refs\/intro\/01-00000ms\.jpg&quot;,&quot;ms&quot;:0\}/);
  assert.match(html, /&quot;ms&quot;:480/);
  assert.match(html, /class="play"/);
});

test("moodboard: its page script parses", () => {
  const dir = project(board([card("Kept")]));
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  const js = readFileSync(join(dir, "m.html"), "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
});

test("moodboard: a missing shot is named and skipped", () => {
  const files = board([card("Kept")]);
  files["design-exploration/identity/board.md"] += `\n${card("Gone").replace(/shot: .*/, "shot: design-exploration/identity/refs/gone.jpg")}`;
  const dir = project(files);
  const result = run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  assert.match(result.stderr, /missing shot design-exploration\/identity\/refs\/gone\.jpg/);
  assert.equal(readFileSync(join(dir, "m.html"), "utf8").match(/<figure class="tile"/g)?.length, 1);
});

const candidates = (rows) => ({ "design-exploration/identity/candidates.tsv": rows.join("\n") });
const pick = (dir, extra = []) =>
  run("picker.mjs", dir, ["design-exploration/identity/candidates.tsv", "--out", "design-exploration/identity/picker.html", ...extra]);
const pickerHtml = (dir) => readFileSync(join(dir, "design-exploration/identity/picker.html"), "utf8");

test("picker: one tile per row from any source, ids by row number, linked to the source", () => {
  const dir = project(
    candidates([
      "# comment, not a row",
      "Ledger app\thttps://cdn.dribbble.com/a.png?resize=400x300\thttps://dribbble.com/shots/1-ledger\tdribbble\tana · 300 likes",
      "Field notes\thttps://assets.awwwards.com/b.jpg\thttps://www.awwwards.com/sites/field\tawwwards",
      "No link\thttps://cdn.recent.design/c.webp\t\trecent",
    ]),
  );
  pick(dir);
  const html = pickerHtml(dir);
  assert.equal(html.match(/<figure class="tile"/g)?.length, 3);
  assert.match(html, /data-id="a1" data-title="Ledger app"/);
  assert.match(html, /data-id="a3" data-title="No link"/);
  assert.match(html, /<a class="name" href="https:\/\/www\.awwwards\.com\/sites\/field"/);
  assert.match(html, /<span class="name" title="No link">No link<\/span>/);
  assert.match(html, /<span class="src">recent<\/span>/);
  assert.match(html, /<span class="meta">ana · 300 likes<\/span>/);
});

test("picker: scraped text is escaped, and only http links become links", () => {
  const dir = project(
    candidates(['<script>alert(1)</script>"x\thttps://cdn.example.com/a.jpg\tjavascript:alert(1)\tawwwards']),
  );
  pick(dir);
  const html = pickerHtml(dir);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;&quot;x/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test("picker: a seed starts liked and may use a project file; round 2 uses b ids", () => {
  const files = candidates([
    "Their screenshot\tdesign-exploration/identity/refs/seed.jpg\t\tseed",
    "Gone\tdesign-exploration/identity/refs/missing.jpg\t\tseed",
    "Shot\thttps://cdn.example.com/a.jpg\thttps://example.com/a\tdribbble",
  ]);
  files["design-exploration/identity/refs/seed.jpg"] = "jpg";
  const dir = project(files);
  const result = pick(dir, ["--round", "2"]);
  const html = pickerHtml(dir);
  assert.match(html, /data-id="b1" data-title="Their screenshot" data-seed="1"/);
  assert.match(html, /<img src="\.\/refs\/seed\.jpg"/);
  assert.match(result.stderr, /b2 has no image/);
  assert.match(html, /data-id="b3"/);
  assert.match(html, /Pick, round 2/);
});

test("picker: its page script parses", () => {
  const dir = project(candidates(["Shot\thttps://cdn.example.com/a.jpg\thttps://example.com/a\tdribbble"]));
  pick(dir);
  const js = pickerHtml(dir).match(/<script>([\s\S]*?)<\/script>/)[1];
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
});

test("picker: wrong usage exits 2", () => {
  const dir = project({});
  const result = spawnSync(process.execPath, [join(scripts, "picker.mjs"), "x.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 2);
});

test("families: splits on measured traits, keeps groups of at least --min, and writes a board skeleton", () => {
  const head = "ref\ttone\tlum\tempty\tloud\tbusy\tground\tdisplay\tbody\tscale\tpictures\tmargin\tradius";
  const row = (name, lum, empty, loud, busy) => `refs/${name}.jpg\t\t${lum}\t${empty}\t${loud}\t${busy}\t#000000\t\t\t\t\t\t`;
  const rows = [];
  for (let i = 0; i < 8; i++) rows.push(row(`paper${i}`, 0.85, 80 + i, 1, 2));
  for (let i = 0; i < 7; i++) rows.push(row(`night${i}`, 0.01, 85 + i, 2, 1));
  for (let i = 0; i < 6; i++) rows.push(row(`poster${i}`, 0.5, 20 + i, 60, 12));
  rows.push(row("odd", 0.5, 50, 30, 8));
  const dir = project({ "traits.tsv": [head, ...rows].join("\n") });
  const result = run("families.mjs", dir, ["traits.tsv", "--board", "board.md"]);
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  const groups = families.map((f) => f.members.map((m) => m.replace(/^refs\/|\d*\.jpg$/g, "")).sort().join(","));
  assert.ok(groups.some((g) => /^(paper,?)+$/.test(g)), result.stdout);
  assert.ok(groups.some((g) => /^(night,?)+$/.test(g)), result.stdout);
  assert.ok(families.filter((f) => !f.stray).every((f) => f.size >= 3));
  // The one far from every group is set aside for the eye, not forced into a family.
  assert.deepEqual(families.find((f) => f.stray)?.members, ["refs/odd.jpg"]);
  assert.match(result.stdout, /22 references, \d+ families/);
  const board = readFileSync(join(dir, "board.md"), "utf8");
  assert.match(board, /^Families: f1 \(/);
  assert.equal(board.match(/^### /gm).length, 22);
  assert.match(board, /- measured: light · empty 8\d% · loud 1% · busy 2/);
  assert.match(readFileSync(join(dir, "families/f1.tsv"), "utf8"), /\t\/.+\.jpg/);
  // A skeleton never overwrites a board.
  const again = spawnSync(process.execPath, [join(scripts, "families.mjs"), "traits.tsv", "--board", "board.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(again.status, 1);
});

test("moodboard --overview: a few tiles per family, its ranges, and one Take per family", () => {
  const cards = [];
  for (let i = 0; i < 9; i++) cards.push(card(`Paper ${i}`, "- topic: f1\n"));
  for (let i = 0; i < 3; i++) cards.push(card(`Night ${i}`, "- topic: f2\n"));
  const files = board(cards);
  files["design-exploration/identity/board.md"] = files["design-exploration/identity/board.md"].replace("# Board", "Families: f1 (light · empty 80–88%) — 9; f2 (dark) — 3");
  const dir = project(files);
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--overview", "6", "--out", "f.html"]);
  const html = readFileSync(join(dir, "f.html"), "utf8");
  assert.match(html, /<body data-overview>/);
  assert.equal(html.match(/<figure class="tile"/g).length, 9);
  assert.equal(html.match(/class="fam"/g).length, 2);
  assert.match(html, /<p class="ranges">light · empty 80–88%<\/p>/);
  assert.match(html, /\+3 more not shown/);
});

