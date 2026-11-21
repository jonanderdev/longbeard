import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

const catalog = [
  { name: "keep", source: "local", author: "Long Beard", why: "Stays." },
  { name: "ticked", source: "https://github.com/example/ticked", author: "Example", when: "Web work", why: "On unless you say no.", optional: true, preselected: true },
  { name: "plain", source: "https://github.com/example/plain", author: "Example", why: "Only when asked.", optional: true, hint: "asked" },
];

// A copy of the package with its own catalog, an empty project, and an npx
// that only logs what it was asked to do. Nothing here is a terminal, so init
// cannot ask and falls back to the ticked add-ons.
function setup(manifest = { agents: ["claude-code"], items: catalog }) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-init-"));
  const pkg = join(dir, "pkg");
  cpSync(join(root, "bin"), join(pkg, "bin"), { recursive: true });
  cpSync(join(root, "package.json"), join(pkg, "package.json"));
  write(join(pkg, "beard.json"), JSON.stringify(manifest));
  write(join(pkg, "skills/keep/SKILL.md"), "---\nname: keep\n---\n");
  const project = join(dir, "project");
  mkdirSync(project, { recursive: true });
  const log = join(dir, "npx.log");
  const fake = join(dir, "fake-bin");
  write(join(fake, "npx"), `#!/bin/sh\necho "$@" >> "${log}"\n`);
  chmodSync(join(fake, "npx"), 0o755);
  const run = (...flags) => {
    const command = flags[0] === "update" ? flags.shift() : "init";
    const result = spawnSync(process.execPath, [join(pkg, "bin/long-beard.js"), command, ...flags], {
      cwd: project,
      encoding: "utf8",
      env: { ...process.env, HOME: dir, PATH: `${fake}:${process.env.PATH}`, NO_COLOR: "1" },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const calls = existsSync(log) ? readFileSync(log, "utf8") : "";
    writeFileSync(log, "");
    const lock = JSON.parse(readFileSync(join(project, "beard-lock.json"), "utf8"));
    return {
      calls,
      router: readFileSync(join(project, "AGENTS.md"), "utf8"),
      taken: Object.keys(lock.skills).sort(),
      shape: lock.shape,
    };
  };
  return run;
}

const skip = { skip: process.platform === "win32" };

test("a first init takes the ticked add-on and leaves the others", skip, () => {
  const { calls, router, taken } = setup()("--yes");
  assert.match(calls, /add https:\/\/github.com\/example\/ticked .*--skill ticked/, calls);
  assert.doesNotMatch(calls, /--skill plain/, calls);
  assert.deepEqual(taken, ["keep", "ticked"]);
  assert.match(router, /^- Web work: ticked\. On unless you say no\.$/m);
  assert.match(router, /^Add-ons, offered once when needed .*: plain \(asked\)\./m);
});

test("init --no-addons takes none, and the router does not offer the ticked one again", skip, () => {
  const { calls, router, taken } = setup()("--yes", "--no-addons");
  assert.doesNotMatch(calls, /--skill ticked/, calls);
  assert.deepEqual(taken, ["keep"]);
  assert.doesNotMatch(router, /ticked/);
  assert.match(router, /plain \(asked\)/);
});

test("init --skill is the answer: only the named add-on comes", skip, () => {
  const { calls, taken } = setup()("--yes", "--skill", "plain");
  assert.match(calls, /--skill plain/, calls);
  assert.doesNotMatch(calls, /--skill ticked/, calls);
  assert.deepEqual(taken, ["keep", "plain"]);
});

test("a second init does not bring back an add-on that was turned down", skip, () => {
  const run = setup();
  run("--yes", "--no-addons");
  const { calls, taken } = run("--yes");
  assert.doesNotMatch(calls, /--skill ticked/, calls);
  assert.deepEqual(taken, ["keep"]);
});

// A small catalog with a design shape: stages, a via item, a figma skill, a helper and an add-on of each kind.
const shaped = {
  agents: ["claude-code"],
  stages: [
    { name: "Idea", when: "No brief", skills: ["idea"], writes: "docs/brief.md" },
    { name: "Design", when: "A brief with UI", skills: ["design"], writes: "DESIGN.md" },
    { name: "Build", when: "Tickets", skills: ["build", "design-check"], writes: "a PR" },
  ],
  shapes: {
    design: {
      label: "Design only",
      items: ["idea", "design", "design-check", "figma-use"],
      addons: ["jury"],
      stages: { Idea: ["idea"], Design: ["design", "design-check"] },
      notes: ["Nothing here builds code."],
    },
  },
  items: [
    { name: "idea", source: "local", author: "Long Beard" },
    { name: "design", source: "local", author: "Long Beard" },
    { name: "design-sub", source: "local", author: "Long Beard", via: "design" },
    { name: "design-check", source: "local", author: "Long Beard" },
    { name: "figma-use", source: "https://github.com/example/figma", author: "Figma", when: "Before any use_figma call" },
    { name: "build", source: "local", author: "Long Beard" },
    { name: "tickets", source: "https://github.com/example/tickets", author: "Example", when: "Tickets to write" },
    { name: "jury", source: "https://github.com/example/jury", author: "Example", when: "A review you asked for", optional: true, hint: "scored" },
    { name: "motion", source: "https://github.com/example/motion", author: "Example", when: "Motion", optional: true, preselected: true },
  ],
};

test("init --design installs the shape's items and their via children only, with a router of its stages", skip, () => {
  const { calls, router, taken, shape } = setup(shaped)("--yes", "--design");
  assert.deepEqual(taken, ["design", "design-check", "design-sub", "figma-use", "idea"]);
  assert.equal(shape, "design");
  assert.doesNotMatch(calls, /--skill (build|tickets|motion|jury)/, calls);
  assert.match(router, /^\| Design \| .* \| design → design-check \|/m);
  assert.doesNotMatch(router, /\| Build|\bbuild\b|tickets|motion/);
  assert.match(router, /^Nothing here builds code\.$/m);
  assert.match(router, /^- Before any use_figma call: figma-use$/m);
  assert.match(router, /^Add-ons, offered once when needed .*: jury \(scored\)\.$/m);
});

test("a design-only add-on is taken by name, and a second init keeps the shape", skip, () => {
  const run = setup(shaped);
  run("--yes", "--design");
  const next = run("--yes", "--skill", "jury");
  assert.equal(next.shape, "design");
  assert.deepEqual(next.taken, ["design", "design-check", "design-sub", "figma-use", "idea", "jury"]);
  assert.doesNotMatch(next.calls, /--skill (build|tickets|motion)/, next.calls);
});

test("init --full grows a design-only install, and the ticked add-ons are asked once more", skip, () => {
  const run = setup(shaped);
  run("--yes", "--design");
  const full = run("--yes", "--full");
  assert.equal(full.shape, undefined);
  assert.deepEqual(full.taken, ["build", "design", "design-check", "design-sub", "figma-use", "idea", "motion", "tickets"]);
  assert.match(full.router, /^\| Build \|/m);
  assert.doesNotMatch(full.router, /Nothing here builds code/);
  assert.match(full.router, /^\| Build \| .* \| build → design-check \|/m);
});

test("the real catalog's design install is the family, design-check, the Figma skills and idea, and its router names nothing else", skip, () => {
  const real = JSON.parse(readFileSync(join(root, "beard.json"), "utf8"));
  const { calls, router, taken } = setup(real)("--yes", "--design");
  const family = real.items.filter((item) => item.name.startsWith("design")).map((item) => item.name);
  assert.deepEqual(taken, [...family, "figma-generate-design", "figma-generate-library", "figma-use", "idea"].sort());
  assert.doesNotMatch(calls, /figma-design-to-code|modern-web-guidance/, calls);
  const words = router.split(/[\s|]+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
  assert.ok(words.length < 200, `${words.length} words`);
  const missing = real.items.flatMap((item) => (item.kit ? item.routes.map((route) => route.skill) : [item.name]));
  for (const name of missing.filter((name) => !taken.includes(name) && name !== "jury")) {
    assert.ok(!router.includes(name), `${name} is not installed, and the router names it`);
  }
  for (const stage of ["Architecture", "Plan", "Build"]) assert.doesNotMatch(router, new RegExp(`\\| ${stage} \\|`));
});

test("init --design stops on a whole-pipeline project, and refuses --full beside it", skip, () => {
  const run = setup(shaped);
  run("--yes");
  assert.throws(() => run("--yes", "--design"), /whole pipeline already/);
  assert.throws(() => run("--yes", "--design", "--full"), /opposites/);
});
