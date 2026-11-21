import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "beard.json"), "utf8"));
const items = manifest.items ?? manifest.skills ?? [];
const local = items.filter((item) => item.source === "local");

function frontmatterName(folder) {
  const text = readFileSync(join(root, "skills", folder, "SKILL.md"), "utf8");
  const head = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return head.match(/^name:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
}

test("every catalog name is lowercase letters, digits and hyphens", () => {
  for (const item of items) assert.match(item.name, /^[a-z0-9][a-z0-9-]*$/, `${item.name} in beard.json`);
});

test("every local catalog item has a SKILL.md in a folder of its name", () => {
  assert.ok(local.length > 0);
  for (const item of local) {
    assert.ok(existsSync(join(root, "skills", item.name, "SKILL.md")), `${item.name} is local in beard.json but skills/${item.name}/SKILL.md is missing`);
  }
});

test("every skill folder is a local catalog item, and its frontmatter name is its folder", () => {
  const listed = new Set(local.map((item) => item.name));
  for (const entry of readdirSync(join(root, "skills"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    assert.ok(listed.has(entry.name), `skills/${entry.name} is not a local item in beard.json`);
    assert.equal(frontmatterName(entry.name), entry.name, `skills/${entry.name}/SKILL.md names a different skill in its frontmatter`);
  }
});
