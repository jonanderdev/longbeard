import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("AGENTS.md is the router init writes", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  const shipped = readFileSync(join(root, "AGENTS.md"), "utf8");
  assert.equal(shipped, generated.stdout, "AGENTS.md drifted from bin/long-beard.js. Edit the generator, then run npm run router.");
});

test("a project with a DESIGN.md is not sent to Design", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" });
  assert.match(generated.stdout, /^\| Design \| [^|]*no DESIGN\.md/m);
});

test("the router stays under 200 words", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" });
  // Table pipes and separators are not words.
  const words = generated.stdout.split(/[\s|]+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
  assert.ok(words.length < 200, `${words.length} words`);
});

test("the design family is reached through design, not a router line each", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" });
  assert.match(generated.stdout, /^\| Design \| [^|]*\| design → /m);
  for (const name of ["design-brief", "design-moodboard", "design-identity", "design-direction", "design-screens", "design-figma"]) assert.doesNotMatch(generated.stdout, new RegExp(`\\b${name}\\b`));
});
