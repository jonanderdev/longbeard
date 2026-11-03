import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// design and design-check each ship a copy, so neither reads the other's folder.
test("each design skill ships the same design-rules.md", () => {
  const source = readFileSync(join(root, "rules/design-rules.md"), "utf8");
  for (const skill of ["design", "design-check"]) {
    const copy = readFileSync(join(root, "skills", skill, "references/design-rules.md"), "utf8");
    assert.equal(copy, source, `skills/${skill} drifted from rules/design-rules.md. Edit rules/, then run npm run rules.`);
  }
});
