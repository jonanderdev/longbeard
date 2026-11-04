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

test("the router stays under 200 words", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" });
  // Table pipes and separators are not words.
  const words = generated.stdout.split(/[\s|]+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
  assert.ok(words.length < 200, `${words.length} words`);
});
