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
  for (const name of ["design-brief", "design-moodboard", "design-identity", "design-direction", "design-prototype", "design-figma"]) assert.doesNotMatch(generated.stdout, new RegExp(`\\b${name}\\b`));
});

test("the design-only router has the Idea and Design stages, fits the word limit, and names only what it installs", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router", "--design"], { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  const router = generated.stdout;
  assert.match(router, /^\| Idea \|/m);
  assert.match(router, /^\| Design \| [^|]*\| design → figma-generate-library → figma-generate-design → design-check \|/m);
  for (const stage of ["Architecture", "Plan", "Build"]) assert.doesNotMatch(router, new RegExp(`^\\| ${stage} \\|`, "m"));
  const words = router.split(/[\s|]+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
  assert.ok(words.length < 200, `${words.length} words`);
  const beard = JSON.parse(readFileSync(join(root, "beard.json"), "utf8"));
  const { items, addons } = beard.shapes.design;
  const named = beard.items.flatMap((item) => (item.kit ? item.routes.map((route) => route.skill) : [item.name]));
  for (const name of named.filter((name) => !items.includes(name) && !addons.includes(name))) {
    assert.doesNotMatch(router, new RegExp(`\\b${name}\\b`), `${name} is not installed`);
  }
});

test("the whole-pipeline router still names every stage", () => {
  const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" });
  for (const stage of ["Idea", "Design", "Architecture", "Plan", "Build"]) assert.match(generated.stdout, new RegExp(`^\\| ${stage} \\|`, "m"));
});

test("a graphic is routed into Design, and its run ends at Figma", () => {
  for (const args of [[], ["--design"]]) {
    const generated = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router", ...args], { encoding: "utf8" });
    assert.match(generated.stdout, /^\| Design \| [^|]*graphic[^|]*no DESIGN\.md/m);
  }
  const full = spawnSync(process.execPath, [join(root, "bin/long-beard.js"), "router"], { encoding: "utf8" }).stdout;
  assert.match(full, /A graphic ends at Figma/);
  // One condition, not a new row.
  assert.equal([...full.matchAll(/^\| (Idea|Design|Architecture|Plan|Build) \|/gm)].length, 5);
});
