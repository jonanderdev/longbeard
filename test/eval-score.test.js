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
- motion: quiet · driven by time · character smooth on everything
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
- quiet, driven by time: fades under 300 ms

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
const run = (dir, ...more) => {
  const r = spawnSync(process.execPath, [score, dir, "--json", ...more], { encoding: "utf8" });
  assert.ok(r.stdout, `score gave no result: ${r.stderr}`);
  return r;
};
const byId = (out) => Object.fromEntries(JSON.parse(out).results.map((r) => [r.id, r]));
// Whether this machine can render pages: the checks that need Chrome are tested only where it can.
const hasChrome = process.env.CHROME_PATH !== "none" && [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].some((p) => p && existsSync(p));
const withBrowser = (dir) => (hasChrome ? run(dir) : run(dir, "--no-browser"));

test("eval score: a good run passes every hard check", () => {
  const result = withBrowser(project(good));
  const results = byId(result.stdout);
  const failed = Object.values(results).filter((r) => r.status === "FAIL" || r.status === "NOT RUN");
  assert.deepEqual(failed, [], JSON.stringify(failed));
  assert.equal(result.status, 0, result.stderr);
  assert.match(results["eval log: skills followed as written"].detail, /1 uncovered answer/);
});

// A run with a leaked source, a gap in the brief, a failing pair and a screen with no move.
const bad = {
  ...good,
  "docs/design/design-moodboard.md": "# Moodboard\n\nLike Halden Design Week's poster; see .longbeard/design/moodboard/refs/01-arch-poster.png\n",
  "docs/design/design-brief.md": good["docs/design/design-brief.md"].replace("- accessibility: AA\n", "").replace("playful 2 · ", ""),
  "DESIGN.md": good["DESIGN.md"].replace("| color/ink | #2c2824 |", "| color/ink | #b8b2a8 |"),
  ".longbeard/design/direction/screens.json": JSON.stringify({ screens: [{ n: 1, base: "a", moves: [] }], chosen: 1 }),
  ".longbeard/design/prototype/menu.html": '<a href="#">Order</a>',
};

test("eval score: a leaked source, a gap in the brief, a failing pair and a screen with no move each fail", () => {
  const result = run(project(bad), "--no-browser");
  assert.equal(result.status, 1);
  const results = byId(result.stdout);
  assert.equal(results["no source in the docs"].status, "FAIL");
  assert.match(results["no source in the docs"].detail, /Halden Design Week/);
  assert.match(results["no source in the docs"].detail, /\.longbeard\//);
  assert.equal(results["design brief complete"].status, "FAIL");
  assert.match(results["design brief complete"].detail, /no accessibility.*personality lacks playful/);
  assert.equal(results["DESIGN.md: contrast pairs pass"].status, "FAIL");
  assert.equal(results["screens: a base and moves from the board"].status, "FAIL");
  // Asked not to render, the rendering checks are skipped, not passed.
  assert.equal(results["prototype: links"].status, "SKIP");
});

test("eval score: a dead link fails the prototype", (t) => {
  if (!hasChrome) return t.skip("no Chrome installed");
  const results = byId(run(project(bad)).stdout);
  assert.equal(results["prototype: links"].status, "FAIL");
  assert.match(results["prototype: links"].detail, /nowhere menu/);
  assert.match(results["prototype: links"].detail, /dead end menu/);
});

// A checker installed in the project is the one the score runs, so a stub stands for a checker that crashes.
const stub = (skill, name, body) => ({ [`.claude/skills/${skill}/scripts/${name}`]: body });

test("eval score: a checker that crashes is not run: never a pass, never soft, and a hard one fails the run", () => {
  const crashing = project({
    ...good,
    ...stub("design-direction", "screen-contrast.mjs", 'throw new Error("boom");\n'),
    ...stub("design-prototype", "links.mjs", 'console.log("not a walk"); process.exit(0);\n'),
    ...stub("design-prototype", "contrast.mjs", "process.exit(3);\n"),
  });
  const result = run(crashing);
  const results = byId(result.stdout);
  const out = JSON.parse(result.stdout);
  for (const id of ["DESIGN.md: contrast pairs pass", "chosen screen: contrast where text sits", "prototype: contrast where text sits"]) {
    assert.equal(results[id].status, "NOT RUN", id);
    assert.equal(results[id].hard, true, id);
  }
  assert.match(results["chosen screen: contrast where text sits"].detail, /boom/);
  assert.equal(results["prototype: links"].status, "NOT RUN");
  assert.equal(results["prototype: links"].hard, true);
  // A check that did not run is not counted, and the run fails.
  const counted = out.results.filter((r) => r.status === "PASS" || r.status === "FAIL").length;
  assert.match(out.score, new RegExp(`/${counted}$`));
  assert.ok(out.notRun >= 4 && out.hardFails >= 4, JSON.stringify({ notRun: out.notRun, hardFails: out.hardFails }));
  assert.equal(result.status, 1);
  // The same checkers saying a text is under are a plain FAIL, with what they printed.
  const failing = project({ ...good, ...stub("design-direction", "screen-contrast.mjs", 'console.log("\\"Order\\"\\t2.1:1"); process.exit(1);\n') });
  const failed = byId(run(failing).stdout)["chosen screen: contrast where text sits"];
  assert.equal(failed.status, "FAIL");
  assert.match(failed.detail, /2\.1:1/);
});

test("eval score: without Chrome the rendering checks are not run, and the hard ones fail the run", () => {
  // CHROME_PATH names nothing and the stubs are absent: only the real checkers run, and none finds a browser when there is none.
  if (hasChrome) return;
  const result = run(project(good));
  assert.equal(result.status, 1);
  assert.equal(byId(result.stdout)["prototype: links"].status, "NOT RUN");
});

test("eval score: the fixture is found from any checkout, and a name that is also a plain word does not trip on plain usage", () => {
  const dir = project({
    ...good,
    // The second board's names, written by a run made from another checkout.
    ".longbeard/eval/fixture.txt": "/somewhere/else/longbeard/eval/design/fixture-2\n",
    "docs/design/design-moodboard.md": "# Moodboard\n\nA quiet serif face, a calma in the layout, still practice and studio field work, in the field; the studio is still.\n",
  });
  let results = byId(run(dir, "--no-browser").stdout);
  assert.equal(results["no source in the docs"].status, "PASS", results["no source in the docs"].detail);
  // The names as the board draws them still trip, on whole words only.
  writeFileSync(join(dir, "docs/design/design-moodboard.md"), "# Moodboard\n\nSet in Quiet Serif, as Halvora does; Calma's arch. Not Halvorak, nor Recalma.\n");
  results = byId(run(dir, "--no-browser").stdout);
  assert.equal(results["no source in the docs"].status, "FAIL");
  assert.match(results["no source in the docs"].detail, /Quiet Serif/);
  assert.match(results["no source in the docs"].detail, /Halvora(?!k)/);
  assert.match(results["no source in the docs"].detail, /Calma/);
  assert.doesNotMatch(results["no source in the docs"].detail, /Halvorak|Recalma/);
});

test("eval score: a fixture that cannot be found at all is a check not run, never a pass", () => {
  const dir = project({ ...good, ".longbeard/eval/fixture.txt": "/nowhere/at/all\n" });
  const check = byId(run(dir, "--no-browser").stdout)["no source in the docs"];
  assert.equal(check.status, "NOT RUN");
  assert.equal(check.hard, true);
});

test("eval score: a project with nothing in it fails, and says what is missing", () => {
  const result = run(project({ "docs/brief.md": "# x\n" }));
  assert.equal(result.status, 1);
  assert.match(byId(result.stdout).docs.detail, /missing: docs\/design\/design-brief\.md/);
});

test("eval score: a motion line must be none or a how-much pick, not the old one word", () => {
  for (const [motion, status] of [["none", "PASS"], ["leading · driven by scroll, cursor · character physics on scroll", "PASS"], ["subtle", "FAIL"], ["driven by time", "FAIL"]]) {
    const brief = good["docs/design/design-brief.md"].replace(/- motion: .*\n/, `- motion: ${motion}\n`);
    const results = byId(run(project({ ...good, "docs/design/design-brief.md": brief })).stdout);
    assert.equal(results["design brief complete"].status, status, motion);
  }
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

test("eval score: the tells read the colours a template screen keeps in LOOK, and the emoji tell ignores ©, ™, ® and arrows", () => {
  // Every colour lives in LOOK; the CSS names them as variables. A violet accent and a gradient between two hues are still there.
  const looked = '<style>body{background:var(--ground);color:var(--ink)}h1{background:linear-gradient(90deg,var(--accent),var(--panel))}</style><script>const LOOK={face:"Fraunces",body:"Fraunces",ground:"#f4f1ea",ink:"#141414",accent:"#7c3aed",more:{panel:"#ec4899"}};</script><h1>Today\'s bread</h1>';
  const marks = '<style>body{background:#f4f1ea}</style><p>© 2024 Hearth™ Bakehouse® → order now ↗ next ➡ back ↩ ✓ done</p>';
  const emoji = '<style>body{background:#f4f1ea}</style><p>Fresh from the oven 🍞</p><p>Order &#10024; now</p>';
  const check = byId(run(withScreens([looked, marks, emoji]), "--no-browser").stdout)["tells of a generic page"];
  assert.match(check.detail, /^2\/3 screens carry one/);
  assert.match(check.detail, /violet accent 1/);
  assert.match(check.detail, /gradient of two hues 1/);
  assert.match(check.detail, /emoji 1\b/);
  // The marks and arrows alone are no tell.
  assert.match(byId(run(withScreens([marks, plainScreen]), "--no-browser").stdout)["tells of a generic page"].detail, /^0\/2 screens carry one/);
});
