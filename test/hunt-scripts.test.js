import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scripts = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-reference-hunt/scripts");

// A project outside any git tree, so the scripts resolve paths against it.
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-hunt-"));
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
- slot: screen
- fit: same-job
- url: https://example.com/${encodeURIComponent(name)}
- shot: .design/refs/${name.length}.jpg
- tagline: ${name}
- colour: #faf8f3 page, #24231f body text, #4a4844 side panel
${extra}`;

function board(cards, readThis = "") {
  const files = { ".design/board.md": `# Board\n\n${readThis}\n\n${cards.join("\n")}` };
  for (const text of cards) files[text.match(/- shot: (.*)/)[1]] = "jpg";
  return files;
}

test("moodboard: --also takes card names with commas, repeated or joined by |", () => {
  const names = ["Ledger, ruled and plain", "Tide table — two columns, dusk", "Plain"];
  const dir = project(board(names.map((n) => card(n))));
  for (const also of [["--also", names[0], "--also", names[1]], ["--also", `${names[0]}|${names[1]}`]]) {
    const result = run("moodboard.mjs", dir, [".design/board.md", "--out", "m.html", "--leads", "Plain", ...also]);
    assert.doesNotMatch(result.stderr, /no card named/);
    const html = readFileSync(join(dir, "m.html"), "utf8");
    assert.equal(html.match(/class="kicker">Also</g)?.length, 2);
  }
});

test("moodboard: no colour tile before the pick; the lead's page colour first after it", () => {
  const dir = project(board([card("Lead", "- colour: #4a4844 side panel, #faf8f3 page, #24231f body text"), card("Other one")]));
  run("moodboard.mjs", dir, [".design/board.md", "--out", "m.html"]);
  assert.doesNotMatch(readFileSync(join(dir, "m.html"), "utf8"), /Colour we saw/);
  run("moodboard.mjs", dir, [".design/board.md", "--out", "m.html", "--leads", "Lead"]);
  const hexes = [...readFileSync(join(dir, "m.html"), "utf8").matchAll(/class="hex">(#\w+)/g)].map((m) => m[1]);
  assert.equal(hexes[0], "#faf8f3");
});

test("moodboard: seeds take at most half the tiles, and fill what the search leaves", () => {
  const seeds = ["Seed a", "Seed bb", "Seed ccc", "Seed dddd"].map((n) => card(n).replace("fit: same-job", "fit: seed"));
  const found = ["Found eeeee", "Found ffffff"].map((n) => card(n));
  const dir = project(board([...seeds, ...found]));
  const result = run("moodboard.mjs", dir, [".design/board.md", "--out", "m.html", "--count", "4"]);
  let html = readFileSync(join(dir, "m.html"), "utf8");
  assert.equal(html.match(/class="name">Seed/g)?.length, 2);
  assert.equal(html.match(/class="name">Found/g)?.length, 2);
  assert.match(result.stderr, /2 seeds held back/);
  run("moodboard.mjs", dir, [".design/board.md", "--out", "m.html", "--count", "6"]);
  html = readFileSync(join(dir, "m.html"), "utf8");
  assert.equal(html.match(/class="name">Seed/g)?.length, 4);
});

const wrapped = `# Sample

<div align="center">
  <p>A centred block of HTML that is long enough to pass the length test if it were joined, which it must not be.</p>
</div>

This sample is a small tool for people who do long work slowly. It keeps every
draft on your own machine, and it opens where you left off without asking anything first.
`;

test("proof: joins a hard-wrapped paragraph, skips HTML, names the file only", () => {
  const read = `## Read this
- leads: Plain
- colour: #ffffff page, #000000 text, #646462 secondary captions, #9a9a96 dimmed lines, #c4c2bc list marker
- faces: Source Serif 4
- behaviour: rows slide in from the left when a list opens`;
  const dir = project({ ".design/board.md": read, "notes/PROJECT.md": wrapped });
  run("proof.mjs", dir, [".design/board.md", "--out", "p.html", "--sample", "notes/PROJECT.md"]);
  const html = readFileSync(join(dir, "p.html"), "utf8");
  assert.match(html, /It keeps every draft on your own machine/);
  assert.match(html, /class="body dim">This sample is a small tool/);
  assert.doesNotMatch(html, /centred block/);
  assert.match(html, /Text from <code>PROJECT\.md<\/code>/);
  for (const role of ["secondary", "dimmed", "mark"]) assert.match(html, new RegExp(`<li class="\\w+">${role} `));
  assert.match(html, /Behaviour, not shown here/);
  assert.doesNotMatch(html, /fewer|with one\?/);
  // No night labels: night is the palette inverted, not a copy of paper.
  const grounds = [...html.matchAll(/--ground:(#\w+)/g)].map((m) => m[1]);
  assert.deepEqual(grounds, ["#ffffff", "#000000"]);
});

test("proof: a grey-only palette gets no invented accent", () => {
  const read = `## Read this
- colour: #ffffff, #000000, #7c7c7c
- faces: Source Serif 4, Inter`;
  const dir = project({ ".design/board.md": read, "README.md": wrapped });
  run("proof.mjs", dir, [".design/board.md", "--out", "p.html"]);
  const html = readFileSync(join(dir, "p.html"), "utf8");
  assert.doesNotMatch(html, /accent|<li class="\w+">mark /);
  assert.match(html, /Can this be done with one\?/);
});
