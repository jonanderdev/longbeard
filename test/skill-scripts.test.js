import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skills = join(root, "skills");

const textFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "scripts" || entry.name === "node_modules" ? [] : textFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });

// A skill that names a script to run has to ship it. A skill with a scripts/ folder is read for every
// script it names. A skill without one (design-brief names scripts only to say who reads what) is read
// only where it points into a scripts/ folder, "<skill>/scripts/x.mjs" or "scripts/x.mjs".
test("every script a skill names is in that skill's scripts folder", () => {
  const missing = [];
  for (const name of readdirSync(skills)) {
    const dir = join(skills, name);
    if (!statSync(dir).isDirectory()) continue;
    const hasFolder = existsSync(join(dir, "scripts"));
    for (const file of textFiles(dir)) {
      const text = readFileSync(file, "utf8");
      const pointed = [...text.matchAll(/scripts\/([\w.-]+\.mjs)/g)].map((m) => m[1]);
      const bare = hasFolder ? [...text.matchAll(/(?<![\w./-])([\w-]+\.mjs)\b/g)].map((m) => m[1]) : [];
      for (const script of new Set([...pointed, ...bare])) {
        if (!existsSync(join(dir, "scripts", script))) missing.push(`${file.slice(root.length + 1)} names ${script}, which skills/${name}/scripts does not hold`);
      }
    }
  }
  assert.deepEqual(missing, [], `${missing.join("\n")}\nShip it: add it to scripts/share.mjs and run npm run share, or stop naming it.`);
});
