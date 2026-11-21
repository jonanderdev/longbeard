import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { blockKey, tokenName } from "../skills/design-prototype/scripts/tokens.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = join(root, "skills/design-prototype/scripts/tokens.mjs");

const body = `# Design

Figma: https://example.com/file. Figma is the truth for screens.

## Idea
A real bakery. Not "fresh & artisanal": a loaf, still warm.

## Colour
| Token | Value | Use |
|---|---|---|
| color/bg | #f6f1e7 | page ground |
| color/ink | #2c2824 | body text |
| color/accent | #b0563a | buttons |
| color/accent/hover | #8f4430 | pressed |

Contrast:
- color/ink on color/bg: 13.1:1 AAA

## Type
| Token | Face, weight | Size / line height | Tracking | Use |
|---|---|---|---|---|
| type/heading | Fraunces, 600 | 48 / 1.1 | -0.02em | titles |
| type/body | Public Sans, Regular | 18 / 28 | | body |

## Spacing
| Token | Value | Use |
|---|---|---|
| space/sm | 8 | inside |
| space/md | 16px | between |
| radius/md | 8 | cards |

## Motion
| Token | Duration | Easing | Use |
|---|---|---|---|
| motion/enter | 250ms | cubic-bezier(0.2, 0, 0, 1) | surfaces |

## Accessibility
- Level: AA.
`;

const themed = `# Design

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| color/bg | #f6f1e7 | #1b1916 | page ground |
| color/ink | #2c2824 | #efe8dc | body text |
| color/accent | #b0563a | #e08a6a | buttons |
| color/glow | — | #ffd9a0 | dark only |
`;

function project(text, name = "Hearth") {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-tokens-"));
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs/brief.md"), `# ${name}\n\nA brief.\n`);
  writeFileSync(join(dir, "DESIGN.md"), text);
  return dir;
}
const run = (dir, ...args) => spawnSync(process.execPath, [tokens, join(dir, "DESIGN.md"), ...args], { encoding: "utf8" });
const read = (dir) => readFileSync(join(dir, "DESIGN.md"), "utf8");
const frontOf = (text) => text.match(/^---\n([\s\S]*?)\n---\n/)[1];

test("tokens.mjs: a single theme gives flat colours, typed type fields, and primary pointing at the accent", () => {
  const dir = project(body);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  const front = frontOf(read(dir));
  assert.match(front, /^version: alpha\nname: Hearth\ncolors:\n  primary: "\{colors\.accent\}"\n  bg: "#f6f1e7"\n/);
  assert.match(front, /\n  accent-hover: "#8f4430"\n/);
  assert.match(front, /\n  heading:\n    fontFamily: Fraunces\n    fontSize: 48px\n    fontWeight: 600\n    lineHeight: 1.1\n    letterSpacing: -0\.02em\n/);
  assert.match(front, /\n  body:\n    fontFamily: Public Sans\n    fontSize: 18px\n    fontWeight: 400\n    lineHeight: 28px\n/);
  assert.match(front, /\nrounded:\n  md: 8px\nspacing:\n  sm: 8px\n  md: 16px\n/);
  assert.match(front, /\nmotion:\n  enter:\n    duration: 250ms\n    timingFunction: cubic-bezier\(0\.2, 0, 0, 1\)$/);
});

test("tokens.mjs: two themes group the colours by the column heads, and primary points into the first", () => {
  const dir = project(themed);
  assert.equal(run(dir).status, 0);
  const front = frontOf(read(dir));
  assert.match(front, /colors:\n  primary: "\{colors\.light\.accent\}"\n  light:\n    bg: "#f6f1e7"\n    ink: "#2c2824"\n    accent: "#b0563a"\n  dark:\n    bg: "#1b1916"\n    ink: "#efe8dc"\n    accent: "#e08a6a"\n    glow: "#ffd9a0"$/);
});

test("tokens.mjs: a color/primary row is used as it is, and ink leads when there is no accent", () => {
  let dir = project(body.replace("| color/accent | #b0563a | buttons |", "| color/primary | #112233 | buttons |"));
  assert.equal(run(dir).status, 0);
  assert.match(frontOf(read(dir)), /colors:\n  bg: "#f6f1e7"\n  ink: "#2c2824"\n  primary: "#112233"\n/);
  dir = project(body.replace("| color/accent | #b0563a | buttons |\n", "").replace("| color/accent/hover | #8f4430 | pressed |\n", ""));
  assert.equal(run(dir).status, 0);
  assert.match(frontOf(read(dir)), /colors:\n  primary: "\{colors\.ink\}"\n/);
});

test("tokens.mjs: the prose below the front matter is untouched byte for byte, and a second run changes nothing", () => {
  const dir = project(body);
  run(dir);
  const once = read(dir);
  assert.ok(once.endsWith(body), "the original text must follow the block unchanged");
  const r = run(dir);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /already agrees/);
  assert.equal(read(dir), once);
  // A table changed after a block exists: the block is refreshed and the prose stays as the person wrote it.
  const edited = once.replace("| color/ink | #2c2824 |", "| color/ink | #111111 |");
  writeFileSync(join(dir, "DESIGN.md"), edited);
  assert.equal(run(dir).status, 0);
  const after = read(dir);
  assert.match(frontOf(after), /ink: "#111111"/);
  assert.equal(after.slice(after.indexOf("\n---\n", 4) + 5), edited.slice(edited.indexOf("\n---\n", 4) + 5));
});

test("tokens.mjs --check: exit 1 when a table and the block disagree, 0 when they agree, 1 when there is no block", () => {
  const dir = project(body);
  let r = run(dir, "--check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no front matter/);
  run(dir);
  r = run(dir, "--check");
  assert.equal(r.status, 0, r.stdout);
  // The table is changed by hand; the block is not.
  writeFileSync(join(dir, "DESIGN.md"), read(dir).replace("| space/md | 16px |", "| space/md | 20px |"));
  r = run(dir, "--check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /spacing\.md: table 20px, front matter 16px/);
  // The block is changed by hand; the tables are not.
  run(dir);
  writeFileSync(join(dir, "DESIGN.md"), read(dir).replace('accent: "#b0563a"', 'accent: "#000000"'));
  r = run(dir, "--check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /colors\.accent: table #b0563a, front matter #000000/);
  // A token only in the block.
  run(dir);
  writeFileSync(join(dir, "DESIGN.md"), read(dir).replace("rounded:\n", "rounded:\n  lg: 12px\n"));
  r = run(dir, "--check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /rounded\.lg: in the front matter, not in the tables/);
});

test("tokens.mjs: keys it does not make are kept, and the name is kept once set", () => {
  const dir = project(body);
  run(dir);
  const front = frontOf(read(dir));
  writeFileSync(join(dir, "DESIGN.md"), read(dir).replace(front, `${front.replace("name: Hearth", "name: Hearth Bakery")}\ndescription: A bakery.\ncomponents:\n  button:\n    rounded: "{rounded.md}"`));
  assert.equal(run(dir, "--name", "Other").status, 0);
  const after = frontOf(read(dir));
  assert.match(after, /^version: alpha\nname: Hearth Bakery\ndescription: A bakery\.\ncolors:/);
  assert.match(after, /\ncomponents:\n  button:\n    rounded: "\{rounded\.md\}"$/);
  assert.equal(run(dir, "--check").status, 0);
});

test("tokens.mjs: a table that cannot be read exits 2 and names the row", () => {
  let dir = project(body.replace("| color/ink | #2c2824 |", "| color/ink | dark grey |"));
  let r = run(dir);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /color\/ink: "dark grey" is not a colour/);
  dir = project(body.replace("| color/bg | #f6f1e7 | page ground |", "| color/ink | #f6f1e7 | page ground |"));
  r = run(dir);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /color\/ink is in the tables twice/);
  dir = project("# Design\n\nNo tokens yet.\n");
  assert.equal(run(dir).status, 2);
});

test("tokens.mjs: the name comes from the brief when nothing else gives it", () => {
  const dir = project(themed, "Oven & Co");
  run(dir);
  assert.match(frontOf(read(dir)), /^version: alpha\nname: Oven & Co\n/);
});

test("tokens.mjs: names map both ways", () => {
  assert.deepEqual(blockKey("color/ink"), { group: "colors", key: "ink" });
  assert.deepEqual(blockKey("color/accent/hover"), { group: "colors", key: "accent-hover" });
  assert.deepEqual(blockKey("type/heading"), { group: "typography", key: "heading" });
  assert.deepEqual(blockKey("space/md"), { group: "spacing", key: "md" });
  assert.deepEqual(blockKey("radius/md"), { group: "rounded", key: "md" });
  assert.deepEqual(blockKey("motion/enter"), { group: "motion", key: "enter" });
  assert.equal(blockKey("shadow/soft"), null);
  for (const t of ["color/ink", "type/heading", "space/md", "radius/md", "motion/enter"]) {
    const { group, key } = blockKey(t);
    assert.equal(tokenName(`${group}.${key}`), t);
  }
  assert.equal(tokenName("colors.dark.ink"), "color/ink");
});
