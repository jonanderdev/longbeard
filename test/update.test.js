import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
function setup(items, flags = [], env = {}, options = {}) {
  // Options: a lock shape and manifest keys, or a function run on the project before update.
  const { shape, manifest = {} } = typeof options === "function" ? {} : options;
  const before = typeof options === "function" ? options : () => {};
  const dir = mkdtempSync(join(tmpdir(), "longbeard-update-"));
  const pkg = join(dir, "pkg");
  cpSync(join(root, "bin"), join(pkg, "bin"), { recursive: true });
  cpSync(join(root, "package.json"), join(pkg, "package.json"));
  write(join(pkg, "beard.json"), JSON.stringify({ agents: ["claude-code"], ...manifest, items }));
  write(join(pkg, "skills/keep/SKILL.md"), "---\nname: keep\n---\n");
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const project = join(dir, "project");
  const later = new Date(Date.now() + 3600_000).toISOString();
  const lock = { version: 1, ...(shape ? { shape } : {}), skills: {} };
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
  before({ pkg, project, dir });
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
  const { shape } = JSON.parse(readFileSync(join(project, "beard-lock.json"), "utf8"));
  const router = readFileSync(join(project, "AGENTS.md"), "utf8");
  return { calls, removed, kept: Object.keys(lock).sort(), shape, router };
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

// A design-only lock: the catalog has a skill inside the shape, one outside it, and a stage the shape leaves out.
const shaped = {
  manifest: {
    stages: [
      { name: "Idea", when: "No brief", skills: ["keep"], writes: "docs/brief.md" },
      { name: "Build", when: "Tickets", skills: ["outside"], writes: "a PR" },
    ],
    shapes: { design: { label: "Design only", items: ["keep", "inside"], stages: { Idea: ["keep"] } } },
  },
};
const shapedCatalog = [
  { name: "keep", source: "local", author: "Long Beard", why: "Stays." },
  { name: "inside", source: "https://github.com/example/inside", author: "Example", when: "Inside the shape" },
  { name: "outside", source: "https://github.com/example/outside", author: "Example", when: "Outside the shape" },
];

test("update keeps to a design-only lock: it adds what the shape lists, not the rest, and keeps the router to its stages", { skip: process.platform === "win32" }, () => {
  const { calls, shape, router } = outcome(setup(shapedCatalog, [], {}, { ...shaped, shape: "design" }));
  assert.match(calls, /add https:\/\/github.com\/example\/inside .*--skill inside/, calls);
  assert.doesNotMatch(calls, /outside/, calls);
  assert.equal(shape, "design");
  assert.match(router, /^\| Idea \|/m);
  assert.doesNotMatch(router, /Build|outside/);
});

test("update --full widens a design-only install, and a lock with no shape is the whole pipeline", { skip: process.platform === "win32" }, () => {
  const full = outcome(setup(shapedCatalog, ["--full"], {}, { ...shaped, shape: "design" }));
  assert.match(full.calls, /--skill outside/, full.calls);
  assert.equal(full.shape, undefined);
  assert.match(full.router, /^\| Build \|/m);
  const plain = outcome(setup(shapedCatalog, [], {}, shaped));
  assert.match(plain.calls, /--skill outside/, plain.calls);
  assert.equal(plain.shape, undefined);
});

test("update refuses --design, which is for init", { skip: process.platform === "win32" }, () => {
  const { result } = setup(shapedCatalog, ["--design"], {}, { ...shaped, shape: "design" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /update keeps the shape init chose/);
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

// The package has moved on from the version the lock recorded. The project's
// copy of "keep" is a plain folder, or a link to wherever `target` says.
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const skip = { skip: process.platform === "win32" };

function behind(target) {
  return setup(catalog, [], {}, ({ pkg, project, dir }) => {
    write(join(pkg, "skills/keep/SKILL.md"), "---\nname: keep\n---\nnew\n");
    const lockFile = join(project, "beard-lock.json");
    const lock = JSON.parse(readFileSync(lockFile, "utf8"));
    lock.skills.keep.version = "0.0.1";
    writeFileSync(lockFile, JSON.stringify(lock));
    if (!target) return;
    const folder = join(project, ".claude/skills/keep");
    rmSync(folder, { recursive: true });
    symlinkSync(target({ pkg, dir }), folder);
  });
}

const keepLock = ({ project }) => JSON.parse(readFileSync(join(project, "beard-lock.json"), "utf8")).skills.keep;

test("update copies a stale local skill and records the new version", skip, () => {
  const run = behind();
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.match(readFileSync(join(run.project, ".claude/skills/keep/SKILL.md"), "utf8"), /new/);
  assert.equal(keepLock(run).version, version);
});

test("update leaves a link to somewhere else alone, and does not record the skill as current", skip, () => {
  const run = behind(({ dir }) => {
    write(join(dir, "elsewhere/SKILL.md"), "---\nname: keep\n---\nold\n");
    return join(dir, "elsewhere");
  });
  assert.equal(run.result.status, 0, run.result.stderr);
  const folder = join(run.project, ".claude/skills/keep");
  assert.ok(lstatSync(folder).isSymbolicLink(), "the link was replaced");
  assert.match(readFileSync(join(folder, "SKILL.md"), "utf8"), /old/);
  assert.equal(keepLock(run).version, "0.0.1");
  assert.match(run.result.stdout, /keep left as it is: .* is a link to /);
  assert.match(run.result.stdout, /0 refreshed/);
});

test("update counts a link into this package as current", skip, () => {
  const run = behind(({ pkg }) => join(pkg, "skills/keep"));
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.ok(lstatSync(join(run.project, ".claude/skills/keep")).isSymbolicLink(), "the link was replaced");
  assert.equal(keepLock(run).version, version);
  assert.match(run.result.stdout, /linked to this package/);
});

test("a name that is not lowercase letters, digits and hyphens stops the run before any command", skip, () => {
  const cases = [
    ["beard.json", "pkg/beard.json", (data) => data.items.push({ name: "x & calc", source: "local", author: "a", why: "w" })],
    ["beard-lock.json", "project/beard-lock.json", (data) => (data.skills["../up"] = data.skills.keep)],
    ["beard.local.json", "project/beard.local.json", (data) => data.omit.push("Bad_Name")],
  ];
  for (const [where, file, change] of cases) {
    const run = setup(catalog, [], {}, ({ dir }) => {
      const path = join(dir, file);
      const data = JSON.parse(readFileSync(path, "utf8"));
      change(data);
      writeFileSync(path, JSON.stringify(data));
    });
    assert.notEqual(run.result.status, 0, where);
    assert.ok(run.result.stderr.includes(`${where} has "`) && run.result.stderr.includes("is not a skill name"), run.result.stderr);
    assert.equal(existsSync(run.log), false, `${where}: a command ran`);
  }
});
