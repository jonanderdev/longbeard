import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const colours = join(root, "skills/design-identity/scripts/colours.mjs");
const run = (args) => spawnSync(process.execPath, [colours, "--harmony", ...args], { encoding: "utf8" });

// OKLCH of a hex, to check what the script made without trusting it.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

test("colours --harmony: complementary, split-complementary and analogous accents from the primary, each on the ground at 3:1", () => {
  const out = run(["--primary", "#2b4c7e", "--ground", "#f1ede4", "--json"]);
  assert.equal(out.status, 0, out.stderr);
  const { rows } = JSON.parse(out.stdout);
  assert.deepEqual(rows.map((r) => r.label), ["complementary", "split-complementary", "split-complementary", "analogous", "analogous"]);
  const [, , H] = oklch("#2b4c7e");
  const gaps = rows.map((r) => Math.round(hueGap(oklch(r.colour)[2], H) / 10) * 10);
  assert.deepEqual(gaps, [180, 150, 150, 30, 30]);
  assert.ok(rows.every((r) => r.row === "accent" && r.contrast >= 3));
  // Never an option the agent ranks: no score, no order beyond the kind.
  assert.ok(rows.every((r) => !("score" in r) && !("best" in r)));
});

test("colours --harmony: a muted board gets muted accents, matched to its lightness and chroma", () => {
  // A quiet board: a dusty blue and a sage, both low chroma.
  const family = "#5b6b7d,#7d8a6e,#ebe4e0";
  const out = run(["--primary", "#5b6b7d", "--ground", "#f4f1ec", "--family", family, "--json"]);
  assert.equal(out.status, 0, out.stderr);
  const { rows } = JSON.parse(out.stdout);
  assert.ok(rows.length >= 3);
  const board = ["#5b6b7d", "#7d8a6e"].map(oklch);
  const maxC = Math.max(...board.map((c) => c[1]));
  const [minL, maxL] = [Math.min(...board.map((c) => c[0])), Math.max(...board.map((c) => c[0]))];
  for (const r of rows) {
    const [L, C] = oklch(r.colour);
    assert.ok(C <= maxC + 0.02, `${r.colour} is louder than the board (${C.toFixed(3)} > ${maxC.toFixed(3)})`);
    assert.ok(L >= minL - 0.03 && L <= maxL + 0.03, `${r.colour} is off the board's lightness`);
  }
  // A loud board's accents are loud: the same primary next to a vivid family.
  const loud = JSON.parse(run(["--primary", "#1f4fd8", "--ground", "#ffffff", "--family", "#1f4fd8,#e0102a", "--json"]).stdout).rows;
  assert.ok(loud.some((r) => oklch(r.colour)[1] > 0.12));
});

test("colours --harmony: an option under the contrast level is left out and named, AAA asks 4.5:1", () => {
  // A pale yellow board on white: every accent at its lightness fails 3:1, so none is offered.
  const pale = run(["--primary", "#f2d16b", "--ground", "#ffffff", "--json"]);
  assert.equal(pale.status, 0, pale.stderr);
  assert.deepEqual(JSON.parse(pale.stdout).rows, []);
  assert.match(pale.stderr, /left out .*complementary/);
  const aaa = JSON.parse(run(["--primary", "#2b4c7e", "--ground", "#f1ede4", "--level", "AAA", "--json"]).stdout).rows;
  assert.ok(aaa.every((r) => r.contrast >= 4.5));
  // No --ink needed; --primary and --ground are.
  assert.equal(run(["--ground", "#ffffff"]).status, 2);
  assert.equal(run(["--primary", "#2b4c7e"]).status, 2);
  // Plain output: one tab row per option.
  const plain = run(["--primary", "#2b4c7e", "--ground", "#f1ede4"]);
  assert.match(plain.stdout.split("\n")[0], /^accent\tcomplementary\t#[0-9a-f]{6}\t\d/);
});

test("design-direction ships colours.mjs for the accent options", () => {
  const r = spawnSync(process.execPath, [join(root, "skills/design-direction/scripts/colours.mjs"), "--harmony", "--primary", "#2b4c7e", "--ground", "#f1ede4", "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});
