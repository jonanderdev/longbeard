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

// A copy of the package with its own catalog, a project that installed more
// than that catalog lists, and an npx that only logs what it was asked to do.
function setup(items, flags = [], env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-update-"));
  const pkg = join(dir, "pkg");
  cpSync(join(root, "bin"), join(pkg, "bin"), { recursive: true });
  cpSync(join(root, "package.json"), join(pkg, "package.json"));
  write(join(pkg, "beard.json"), JSON.stringify({ agents: ["claude-code"], items }));
  write(join(pkg, "skills/keep/SKILL.md"), "---\nname: keep\n---\n");
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const project = join(dir, "project");
  const later = new Date(Date.now() + 3600_000).toISOString();
  const lock = { version: 1, skills: {} };
  for (const [name, installedAt] of [
    ["keep", later],
    ["gone", later],
    ["gone-edited", "2000-01-01T00:00:00.000Z"],
    ["add-on", later],
    ["omitted", later],
  ]) {
    write(join(project, ".claude/skills", name, "SKILL.md"), `---\nname: ${name}\n---\n`);
    lock.skills[name] = { source: "local", author: "Long Beard", agents: ["claude-code"], installedAt, version };
  }
  write(join(project, "beard-lock.json"), JSON.stringify(lock));
  write(join(project, "beard.local.json"), JSON.stringify({ omit: ["omitted"], items: [] }));
  const log = join(dir, "npx.log");
  const fake = join(dir, "fake-bin");
  write(join(fake, "npx"), `#!/bin/sh\necho "$@" >> "${log}"\n`);
  chmodSync(join(fake, "npx"), 0o755);
  const result = spawnSync(process.execPath, [join(pkg, "bin/long-beard.js"), "update", "--yes", ...flags], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, HOME: dir, PATH: `${fake}:${process.env.PATH}`, NO_COLOR: "1", ...env },
  });
  return { result, project, log };
}

const catalog = [
  { name: "keep", source: "local", author: "Long Beard", why: "Stays." },
  { name: "add-on", source: "local", author: "Long Beard", why: "Only with --all.", optional: true },
];

function outcome({ result, project, log }) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const calls = existsSync(log) ? readFileSync(log, "utf8") : "";
  const removed = calls.split("\n").filter((line) => line.includes(" remove "));
  const lock = JSON.parse(readFileSync(join(project, "beard-lock.json"), "utf8")).skills;
  return { calls, removed, kept: Object.keys(lock).sort() };
}

test("update removes a skill the catalog dropped, unless edited, optional, or omitted", { skip: process.platform === "win32" }, () => {
  const { calls, removed, kept } = outcome(setup(catalog));
  assert.equal(removed.length, 1, calls);
  assert.match(removed[0], / remove gone -y/);
  assert.deepEqual(kept, ["add-on", "gone-edited", "keep", "omitted"]);
});

test("update --force also removes a dropped skill you edited", { skip: process.platform === "win32" }, () => {
  const { calls, removed, kept } = outcome(setup(catalog, ["--force"]));
  assert.equal(removed.length, 1, calls);
  assert.match(removed[0], / remove gone gone-edited -y/);
  assert.deepEqual(kept, ["add-on", "keep", "omitted"]);
});

test("update --skill takes one add-on, and refuses a name that is not one", { skip: process.platform === "win32" }, () => {
  const more = [...catalog, { name: "motion", source: "https://github.com/example/motion", author: "Example", why: "Moves.", optional: true }];
  const { calls } = outcome(setup(more, ["--skill", "motion"]));
  assert.match(calls, /add https:\/\/github.com\/example\/motion .*--skill motion/, calls);
  const { result } = setup(more, ["--skill", "keep"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /keep is not an add-on/);
});

test("update names why it could not list a kit", { skip: process.platform === "win32" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-offline-"));
  const offline = join(dir, "offline.mjs");
  write(
    offline,
    'globalThis.fetch = async () => { throw new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }) }); };\n',
  );
  const kit = [...catalog, { name: "some-kit", kit: true, source: "https://github.com/example/kit", author: "Example" }];
  const { result } = setup(kit, [], { NODE_OPTIONS: `--import=${offline}` });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not list the some-kit kit from GitHub: ENOTFOUND reaching https:\/\/raw\.githubusercontent\.com\/example\/kit\//);
});
