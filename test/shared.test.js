import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { shared } from "../scripts/share.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("every skill ships the same copy of a shared file", () => {
  for (const [source, targets] of shared) {
    const text = readFileSync(join(root, source), "utf8");
    const name = source.split("/").pop();
    for (const target of targets) {
      const copy = readFileSync(join(root, "skills", target, name), "utf8");
      assert.equal(copy, text, `skills/${target}/${name} drifted from ${source}. Edit the source, then run npm run share.`);
    }
  }
});
