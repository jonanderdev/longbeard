import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const score = join(root, "eval/design/score.mjs");

// A small project as a good run would leave it.
const good = {
  "docs/brief.md": "# Hearth\n\n## Key screens\n- home: today\n- menu: every bake\n\n## Position\n- against: queues\n",
  "docs/design/design-brief.md": `# Design brief: Hearth

- takeaway: a real bakery, bread still there; order for pickup
- first seen on: desktop
- pace: full
- words: warm, honest, exact · never fussy
- personality: loud 2 · picture-led 4 · rich 2 · cool 1 · playful 2 · new 4 · dense 2
- feel: the shop at 7am
- never: glossy chain-store
- apart from: supermarket bakery counters · distance 4
- fixed: new brand; light only; no pictures yet; English
- accessibility: AA
- motion: subtle
- voice: plain and warm, "Back on Thursday."
- decides: only them
`,
  "answers.md": "- 10. Pace: full.\n",
  "docs/design/design-moodboard.md": "# Moodboard\n\nLong serif headlines on cream; one huge word as the picture.\n",
  "docs/design/design-direction.md": "# Direction\n\n- takeaway: …\n- five seconds: what it is 3 of 3, what to do 2 of 3, feel: warm, plain\n",
  "docs/design/design-identity.md": '# Identity\n\n```json identity\n{"display":{"face":"Fraunces"},"colours":[{"name":"flour","hex":"#f6f1e7"}]}\n```\n',
  "docs/design/design-identity.html": '<link href="https://fonts.googleapis.com/css2?family=Fraunces">',
  "DESIGN.md": `# Design

## Colour
| Token | Value | Use |
|---|---|---|
| color/bg | #f6f1e7 | ground |
| color/ink | #2c2824 | text |
| color/accent | #b0563a | buttons |

Contrast (scripts/contrast.mjs, at the level under Accessibility):
- color/ink on color/bg: 13.1:1 AAA
- color/accent on color/bg: 4.4:1 (control)

## Motion
- subtle: fades under 300 ms

## Accessibility
- Level: AA. Every contrast pair above meets it.
`,
  ".longbeard/design/direction/library.json": JSON.stringify({ references: [{ name: "a", slots: { small: 1 } }, { name: "b", slots: { small: 2 } }] }),
  ".longbeard/design/direction/screens.json": JSON.stringify({ screens: [{ n: 1, base: "a", moves: [{ what: "the face", from: "b" }], build: "full", state: "fixed" }, { n: 2, base: "b", moves: [{ what: "a palette", from: "subject" }], build: "quick", state: "built" }], chosen: 1 }),
  ".longbeard/design/direction/screens/1.html": '<body style="background:#f6f1e7;color:#2c2824;font:16px serif"><h1>Bread, still warm</h1><p>Order a loaf</p><script>document.title="ready"</script></body>',
  ".longbeard/design/direction/screens/2.html": '<body style="background:#f6f1e7;color:#2c2824;font:16px serif"><h1>Today\'s bread</h1><script>document.title="ready"</script></body>',
  ".longbeard/design/direction/prototype/first.html": '<body style="background:#f6f1e7;color:#2c2824"><h1>Bread, still warm</h1><script>document.title="ready"</script></body>',
  ".longbeard/design/prototype/home.html": '<body style="background:#f6f1e7;color:#2c2824"><a href="menu.html">Menu</a></body>',
  ".longbeard/design/prototype/menu.html": '<body style="background:#f6f1e7;color:#2c2824"><a href="home.html">Home</a></body>',
  "eval-log.md": "- design-brief: asked the round; used answers.md\n- design-direction: grid **uncovered**: took the suggestion\n",
};

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-score-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
const run = (dir) => spawnSync(process.execPath, [score, dir, "--json"], { encoding: "utf8" });
const byId = (out) => Object.fromEntries(JSON.parse(out).results.map((r) => [r.id, r]));

test("eval score: a good run passes every hard check", () => {
  const result = run(project(good));
  const results = byId(result.stdout);
  const failed = Object.values(results).filter((r) => r.status === "FAIL");
  assert.deepEqual(failed, [], JSON.stringify(failed));
  assert.equal(result.status, 0, result.stderr);
  assert.match(results["eval log: skills followed as written"].detail, /1 uncovered answer/);
});

test("eval score: a leaked source, a gap in the brief, a failing pair, a screen with no move and a dead link each fail", () => {
  const bad = {
    ...good,
    "docs/design/design-moodboard.md": "# Moodboard\n\nLike Halden Design Week's poster; see .longbeard/design/moodboard/refs/01-arch-poster.png\n",
    "docs/design/design-brief.md": good["docs/design/design-brief.md"].replace("- accessibility: AA\n", "").replace("playful 2 · ", ""),
    "DESIGN.md": good["DESIGN.md"].replace("| color/ink | #2c2824 |", "| color/ink | #b8b2a8 |"),
    ".longbeard/design/direction/screens.json": JSON.stringify({ screens: [{ n: 1, base: "a", moves: [] }], chosen: 1 }),
    ".longbeard/design/prototype/menu.html": '<a href="#">Order</a>',
  };
  const result = run(project(bad));
  assert.equal(result.status, 1);
  const results = byId(result.stdout);
  assert.equal(results["no source in the docs"].status, "FAIL");
  assert.match(results["no source in the docs"].detail, /Halden Design Week.*\.longbeard\/.*01-arch-poster|Halden Design Week/);
  assert.equal(results["design brief complete"].status, "FAIL");
  assert.match(results["design brief complete"].detail, /no accessibility.*personality lacks playful/);
  assert.equal(results["DESIGN.md: contrast pairs pass"].status, "FAIL");
  assert.equal(results["screens: a base and moves from the board"].status, "FAIL");
  if (results["prototype: links"].status !== "SKIP") {
    assert.equal(results["prototype: links"].status, "FAIL");
    assert.match(results["prototype: links"].detail, /nowhere menu|dead end menu/);
  }
});

test("eval score: a project with nothing in it fails, and says what is missing", () => {
  const result = run(project({ "docs/brief.md": "# x\n" }));
  assert.equal(result.status, 1);
  assert.match(byId(result.stdout).docs.detail, /missing: docs\/design\/design-brief\.md/);
});

// A round of two built screens, and a baseline of two, each with a capture.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
function withScreens(pages) {
  const dir = project({ ...good, ".longbeard/design/direction/screens.json": JSON.stringify(pages.map((_, i) => ({ n: i + 1, base: "a", moves: [{ what: "a palette", from: "b" }] }))) });
  pages.forEach((page, i) => {
    mkdirSync(join(dir, ".longbeard/design/direction/screens"), { recursive: true });
    mkdirSync(join(dir, ".longbeard/design/direction/grid"), { recursive: true });
    writeFileSync(join(dir, `.longbeard/design/direction/screens/${i + 1}.html`), page);
    writeFileSync(join(dir, `.longbeard/design/direction/grid/${i + 1}.png`), png);
  });
  return dir;
}
const generic = '<style>h1{background:linear-gradient(90deg,#7c3aed,#ec4899);-webkit-background-clip:text;background-clip:text}.card{border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.1)}</style><script>const LOOK={face:"Inter",body:"Inter"}</script><h1>Elevate your mornings ✨</h1>';
const plainScreen = '<style>body{font-family:"Fraunces",serif;background:#f6f1e7}</style><h1>Today\'s bread is still here.</h1>';

test("eval score: the tells of a generic page are found in a screen's source, and a plain screen has none", () => {
  const dir = withScreens([generic, plainScreen]);
  const check = byId(spawnSync(process.execPath, [score, dir, "--json", "--no-browser"], { encoding: "utf8" }).stdout)["tells of a generic page"];
  assert.equal(check.status, "FAIL");
  assert.match(check.detail, /^1\/2 screens carry one/);
  for (const tell of ["gradient text", "gradient of two hues", "rounded card with shadow", "soft drop shadow", "default face", "violet accent", "emoji", "stock marketing words"]) assert.match(check.detail, new RegExp(tell));
});

test("eval score: --plain shuffles the baseline into one unlabelled sheet, holds its tells until the marks are in, then tallies the marks by set", () => {
  const dir = withScreens([plainScreen, plainScreen]);
  const base = mkdtempSync(join(tmpdir(), "longbeard-plain-"));
  mkdirSync(join(base, "screens"));
  for (const n of [1, 2]) writeFileSync(join(base, `screens/${n}.html`), generic), writeFileSync(join(base, `screens/${n}.png`), png);
  const scoreIt = () => byId(spawnSync(process.execPath, [score, dir, "--json", "--no-browser", "--plain", base], { encoding: "utf8" }).stdout);
  let results = scoreIt();
  const key = JSON.parse(readFileSync(join(dir, ".longbeard/eval/blind/key.json"), "utf8"));
  assert.deepEqual(key.map((k) => k.tile), ["01", "02", "03", "04"]);
  assert.deepEqual(key.map((k) => k.set).sort(), ["baseline", "baseline", "round", "round"]);
  for (const k of key) assert.ok(existsSync(join(dir, `.longbeard/eval/blind/${k.tile}.png`)));
  assert.doesNotMatch(readFileSync(join(dir, ".longbeard/eval/blind/sheet.html"), "utf8"), /\bbaseline\b|\bround\b|screens\//);
  assert.equal(results["blind: the owner's marks"].status, "SKIP");
  assert.match(results["tells of a generic page"].detail, /held until the marks are in/);
  // The owner marks the baseline good and the round bad: the key decides which is which.
  const marks = key.map((k) => `- ${k.tile}: ${k.set === "baseline" ? "good" : "bad"}`).join("\n");
  writeFileSync(join(dir, ".longbeard/eval/blind/marks.md"), `# Marks\n\n${marks}\n`);
  results = scoreIt();
  assert.equal(results["blind: the owner's marks"].status, "FAIL");
  assert.equal(results["blind: the owner's marks"].detail, "round 0 good · 0 OK · 2 bad; baseline 2 good · 0 OK · 0 bad");
  assert.match(results["tells of a generic page"].detail, /round: 0\/2 .*baseline: 2\/2/);
  // The same key on a second scoring: the sheet is shuffled once.
  assert.deepEqual(JSON.parse(readFileSync(join(dir, ".longbeard/eval/blind/key.json"), "utf8")), key);
});
