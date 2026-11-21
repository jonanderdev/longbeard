import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
