import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// A run's direction folder by hand: two references, a dealt round of two screens, and a grid page
// that draws screen 1 well and screen 2 with a tiny label, a clipped line and too many blocks.
function project() {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-screens-"));
  const d = join(dir, ".longbeard/design/direction");
  mkdirSync(join(d, "prototype"), { recursive: true });
  const lib = {
    arrangements: [{ id: "one", from: ["a"] }, { id: "two", from: ["b"] }],
    type: [{ id: "t", from: ["b"] }, { id: "u", from: ["a"] }],
    grounds: [{ id: "paper", ground: "#f4f1ea", ink: "#111111", from: ["c"] }, { id: "night", ground: "#101010", ink: "#f0f0f0", from: ["subject"] }],
  };
  writeFileSync(join(d, "library.json"), JSON.stringify(lib));
  const recipes = [{ n: 1, arrangement: "one", type: "t", ground: "paper", accent: "none" }, { n: 2, arrangement: "two", type: "u", ground: "night", accent: "none" }];
  writeFileSync(join(d, "deal.json"), JSON.stringify({ rounds: [{ round: 1, kind: "deal", recipes }] }));
  writeFileSync(join(d, "prototype/grid.html"), `<!doctype html><style>body{margin:0;font:16px system-ui}#screen{position:relative;width:1440px;height:900px;overflow:hidden}nav a{font-size:13px;margin:8px}</style>
<div id="screen"></div><script>
const n = new URLSearchParams(location.search).get("n");
document.getElementById("screen").innerHTML = n === "1"
  ? '<nav><a>Today</a><a>Order</a></nav><h1 style="font-size:96px">Bread is here.</h1><p>Order a loaf for pickup.</p>'
  : '<nav><a>Today</a></nav><h1 style="font-size:96px">Bread</h1><p style="font-size:8px">tiny</p><p>one</p><p>two</p><p>three</p><div style="width:60px;overflow:hidden;white-space:nowrap">a line too long for its box</div>';
document.body.style.background = n === "1" ? "#f4f1ea" : "#101010";
document.body.style.color = n === "1" ? "#111" : "#f0f0f0";
document.title = "ready";
</script>`);
  return dir;
}

test("screens: each dealt screen's smallest text, clipped text, blocks and ground tone", (t) => {
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
  // Blocks outside the navigation: the headline and the line on 1; six on 2.
  assert.equal(one.dom.blocks, 2);
  assert.equal(two.dom.blocks, 6);
  // The board's tones are its references' grounds: light only, so the subject's dark ground is off it.
  assert.deepEqual([one.toneOnBoard, two.toneOnBoard], [true, false]);
  assert.deepEqual(summary.offBoard, ["2 (dark)"]);
});

test("odd-one-out --tally: the rate is the share of judges who picked the dealt screen", () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-odd-"));
  const out = mkdtempSync(join(tmpdir(), "longbeard-odd-out-"));
  const folders = {};
  const answers = { "1-1": "pick: a\nthe text overflows", "1-2": "pick: b\nuneven margins", "2-1": "pick: c\nfine", "2-2": "no answer" };
  for (const [name, text] of Object.entries(answers)) {
    mkdirSync(join(out, name), { recursive: true });
    writeFileSync(join(out, name, "answer.txt"), text);
    folders[name] = { n: Number(name[0]), judge: Number(name[2]), letters: { a: "screen", b: "01-arch-poster", c: "02-name-grid", d: "03", e: "04", f: "05" } };
  }
  mkdirSync(join(dir, ".longbeard/eval"), { recursive: true });
  writeFileSync(join(dir, ".longbeard/eval/odd-key.json"), JSON.stringify({ out, judges: 2, folders }));
  const r = spawnSync(process.execPath, [join(root, "eval/design/odd-one-out.mjs"), dir, "--tally"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(readFileSync(join(dir, "eval-odd-one-out.json"), "utf8"));
  assert.deepEqual([result.picked, result.judged], [1, 3]);
  assert.equal(result.rate, 0.333);
  assert.equal(result.reasons[0].why, "the text overflows");
  assert.equal(spawnSync(process.execPath, [join(root, "eval/design/odd-one-out.mjs"), dir], { encoding: "utf8" }).status, 2);
});
