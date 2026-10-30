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
- colour: #24231f body text
${extra}`;

function board(cards) {
  const files = { ".design/board.md": `# Board\n\n${cards.join("\n")}` };
  for (const text of cards) files[text.match(/- shot: (.*)/)[1]] = "jpg";
  return files;
}

test("moodboard: one tile per card with a shot, linked to its source", () => {
  const seed = card("Seed").replace(/- url: .*/, "- url: none (shared in chat)");
  const product = card("A product page").replace("slot: screen", "slot: product");
  const dir = project(board([card("Ledger, ruled & plain"), seed, product]));
  run("moodboard.mjs", dir, [".design/board.md", "--out", ".design/moodboard.html"]);
  const html = readFileSync(join(dir, ".design/moodboard.html"), "utf8");
  assert.equal(html.match(/class="tile"/g)?.length, 2);
  assert.match(html, /<a class="frame" href="https:\/\/example\.com\/Ledger/);
  assert.match(html, /<div class="frame"><img src="\.\/refs\/4\.jpg" alt="Seed"/);
  assert.match(html, /class="name">Ledger, ruled &amp; plain</);
  assert.doesNotMatch(html, /A product page/);
});

test("moodboard: a missing shot is named and skipped", () => {
  const files = board([card("Kept")]);
  files[".design/board.md"] += `\n${card("Gone").replace(/shot: .*/, "shot: .design/refs/gone.jpg")}`;
  const dir = project(files);
  const result = run("moodboard.mjs", dir, [".design/board.md", "--out", "m.html"]);
  assert.match(result.stderr, /missing shot \.design\/refs\/gone\.jpg/);
  assert.equal(readFileSync(join(dir, "m.html"), "utf8").match(/class="tile"/g)?.length, 1);
});
