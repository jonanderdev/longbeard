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
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-init-"));
  const pkg = join(dir, "pkg");
  cpSync(join(root, "bin"), join(pkg, "bin"), { recursive: true });
  cpSync(join(root, "package.json"), join(pkg, "package.json"));
  write(join(pkg, "beard.json"), JSON.stringify({ agents: ["claude-code"], items: catalog }));
  write(join(pkg, "skills/keep/SKILL.md"), "---\nname: keep\n---\n");
  const project = join(dir, "project");
  mkdirSync(project, { recursive: true });
  const log = join(dir, "npx.log");
  const fake = join(dir, "fake-bin");
  write(join(fake, "npx"), `#!/bin/sh\necho "$@" >> "${log}"\n`);
  chmodSync(join(fake, "npx"), 0o755);
  const run = (...flags) => {
    const result = spawnSync(process.execPath, [join(pkg, "bin/long-beard.js"), "init", ...flags], {
      cwd: project,
      encoding: "utf8",
      env: { ...process.env, HOME: dir, PATH: `${fake}:${process.env.PATH}`, NO_COLOR: "1" },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const calls = existsSync(log) ? readFileSync(log, "utf8") : "";
    writeFileSync(log, "");
    return {
      calls,
      router: readFileSync(join(project, "AGENTS.md"), "utf8"),
      taken: Object.keys(JSON.parse(readFileSync(join(project, "beard-lock.json"), "utf8")).skills).sort(),
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
