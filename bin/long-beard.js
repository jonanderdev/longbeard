#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const curatedFile = join(root, "beard.json");
const SKILLS_CLI = "skills@1.7.2";
const START = "<!-- longbeard:start -->";
const END = "<!-- longbeard:end -->";
const START_OLD = "<!-- long-beard:start -->";
const END_OLD = "<!-- long-beard:end -->";

const help = `Long Beard

Drop this into a project so the agents you already use produce better work.
The catalog is beard.json. The command is longbeard, via npx in the project.

  npm install --save-dev @jonandev/longbeard
  npx longbeard init
  npx longbeard update
  npx longbeard list
  npx longbeard --version

  npx longbeard init [--global] [--all] [--yes] [--agent cursor]
  npx longbeard update [--global] [--all] [--force] [--yes]
  npx longbeard add <source> --skill <name> --author <name> --why <text> [--when text]
  npx longbeard remove <name>

init installs missing skills from beard.json. A skill already present for an agent is left there.
update installs anything new, refreshes only items in beard-lock.json, and rewrites the AGENTS.md block.
A kit skill is copied from the installed package when its version moved, and the line says which versions.
Install the package first (npm install -D @jonandev/longbeard@latest); update does not fetch it.
add in a project writes beard.local.json (an extra, not a second kit). remove omits a kit skill here.
--agent skips the agent list and installs for that tool. Repeat it.
--force replaces local edits of skills this command installed.
--yes skips prompts and uses the catalog agents (cursor, claude-code).
This does not install marketplace plugins or replace Cursor or Claude commands.
`;

const color = Boolean(process.stdout.isTTY);
function paint(code, text) {
  return color ? `\x1b[${code}m${text}\x1b[0m` : text;
}
const bold = (text) => paint("1", text);
const dim = (text) => paint("2", text);
const green = (text) => paint("32", text);
const yellow = (text) => paint("33", text);
const cyan = (text) => paint("36", text);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function say(text = "") {
  console.log(text && !text.startsWith(" ") ? `  ${text}` : text);
}

function heading(title, flags, agents) {
  const where = flags.global ? "this machine" : "this project";
  say();
  say(bold("Long Beard"));
  say(dim(`${title} · ${where} · ${agents.join(", ")}`));
  say();
}

function nameWidth(groups) {
  const names = groups.flat().map((skill) => skill.name);
  if (names.length === 0) return 16;
  return Math.max(16, ...names.map((name) => name.length));
}

function rows(label, paintLabel, skills, note, width) {
  if (skills.length === 0) return;
  say(paintLabel(label));
  for (const skill of skills) {
    const extra = [skill.author, skill.note, skill.why].filter(Boolean);
    const rest = extra.length > 0 ? dim(`  ${extra.join(" · ")}`) : "";
    say(`  ${skill.name.padEnd(width)}${rest}`);
  }
  if (note) say(`  ${dim(note)}`);
  say();
}

function plan(kind, flags, agents, classified) {
  heading(kind, flags, agents);
  const refresh = kind === "update" ? (flags.force ? [...classified.ours, ...classified.edited] : classified.ours) : [];
  const heldEdits = kind === "update" && !flags.force ? classified.edited : [];
  const already = kind === "update" ? classified.theirs : [...classified.theirs, ...classified.ours, ...classified.edited];
  const width = nameWidth([already, heldEdits, refresh, classified.missing, classified.later ?? []]);
  rows("already there", yellow, already, "Present for that agent. Not copied again.", width);
  rows("your edits", yellow, heldEdits, "Changed after this command installed them. Pass --force to replace them.", width);
  rows("refresh", cyan, refresh, "In beard-lock.json. Pull the author's current files.", width);
  rows("install", green, classified.missing, "", width);
  rows("later", dim, classified.later ?? [], "In the catalog. This version only installs skills.", width);
  if (classified.writes.length > 0) {
    say(cyan("will write"));
    for (const file of classified.writes) say(`  ${file}`);
    say();
  }
  if (classified.missing.length === 0 && refresh.length === 0 && heldEdits.length === 0) {
    say(dim("Nothing new to install."));
    say();
  }
}

function finish(lines) {
  for (const line of lines) say(line);
  say();
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const flags = {
    global: false,
    all: false,
    force: false,
    yes: false,
    optional: false,
    agents: [],
    skill: [],
    why: "",
    when: "",
    author: "",
    license: "",
  };
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--global" || arg === "-g") flags.global = true;
    else if (arg === "--all") flags.all = true;
    else if (arg === "--force") flags.force = true;
    else if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg === "--optional") flags.optional = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg === "--version" || arg === "-V") flags.version = true;
    else if (arg === "--agent" || arg === "-a") flags.agents.push(take(argv, ++i, arg));
    else if (arg === "--skill" || arg === "-s") flags.skill.push(take(argv, ++i, arg));
    else if (arg === "--why") flags.why = take(argv, ++i, arg);
    else if (arg === "--when") flags.when = take(argv, ++i, arg);
    else if (arg === "--author") flags.author = take(argv, ++i, arg);
    else if (arg === "--license") flags.license = take(argv, ++i, arg);
    else if (arg.startsWith("-")) fail(`Unknown flag: ${arg}\n\n${help}`);
    else positionals.push(arg);
  }
  return { command: positionals[0] || "help", rest: positionals.slice(1), flags };
}

function take(argv, index, flag) {
  if (index >= argv.length || argv[index].startsWith("-")) fail(`${flag} needs a value`);
  return argv[index];
}

function inRepository() {
  return resolve(process.cwd()) === resolve(root);
}

function extraFile(flags, forWrite = false) {
  if (flags.global) {
    const next = join(homedir(), ".longbeard", "beard.local.json");
    if (forWrite) return next;
    const prev = join(homedir(), ".long-beard", "extra.json");
    return existsSync(next) || !existsSync(prev) ? next : prev;
  }
  const next = join(process.cwd(), "beard.local.json");
  if (forWrite) return next;
  const prev = join(process.cwd(), "long-beard.json");
  return existsSync(next) || !existsSync(prev) ? next : prev;
}

function lockFile(flags, forWrite = false) {
  if (flags.global) {
    const next = join(homedir(), ".longbeard", "beard-lock.json");
    if (forWrite) return next;
    const prev = join(homedir(), ".long-beard", "beard-lock.json");
    return existsSync(next) || !existsSync(prev) ? next : prev;
  }
  return join(process.cwd(), "beard-lock.json");
}

function curated() {
  return readJson(curatedFile);
}

function catalog(manifest) {
  return manifest.items ?? manifest.skills ?? [];
}

function kind(item) {
  return item.kind || "skill";
}

function extraState(flags) {
  if (inRepository() && !flags.global) return { items: [], omit: [] };
  const file = extraFile(flags);
  if (!existsSync(file)) return { items: [], omit: [] };
  const data = readJson(file);
  return { items: data.items ?? data.skills ?? [], omit: data.omit ?? [] };
}

function writeExtra(flags, state) {
  writeJson(extraFile(flags, true), {
    omit: state.omit ?? [],
    items: state.items ?? [],
  });
}

function chosen(flags) {
  const manifest = curated();
  const extra = extraState(flags);
  const omitted = new Set(extra.omit);
  const shared = catalog(manifest).filter((item) => (flags.all || !item.optional) && !omitted.has(item.name));
  const seen = new Set(shared.map((item) => item.name));
  const extras = extra.items.filter((item) => !seen.has(item.name) && !omitted.has(item.name));
  const items = [...shared, ...extras];
  return {
    manifest,
    extra,
    items,
    skills: items.filter((item) => kind(item) === "skill"),
    later: items.filter((item) => kind(item) !== "skill"),
  };
}

const agentNames = {
  cursor: "Cursor",
  "claude-code": "Claude Code",
  codex: "Codex",
  "github-copilot": "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
};

function knownAgents() {
  return Object.keys(agentDirs);
}

function agentsFromLock(lock) {
  return [...new Set(Object.values(lock?.skills ?? {}).flatMap((entry) => entry.agents ?? []))];
}

const stdinPause = new Int32Array(new SharedArrayBuffer(4));

function readStdin(buf) {
  for (;;) {
    try {
      return readSync(0, buf, 0, buf.length, null);
    } catch (error) {
      if (error?.code !== "EAGAIN" && error?.code !== "EWOULDBLOCK") throw error;
      Atomics.wait(stdinPause, 0, 0, 50);
    }
  }
}

function readKey() {
  const buf = Buffer.alloc(8);
  const n = readStdin(buf);
  if (n <= 0) return "enter";
  const code = buf[0];
  if (code === 3) return "ctrl-c";
  if (code === 13 || code === 10) return "enter";
  if (code === 32) return "space";
  if (code === 27 && buf[1] === 91) {
    if (buf[2] === 65) return "up";
    if (buf[2] === 66) return "down";
  }
  if (code === 107) return "up";
  if (code === 106) return "down";
  return "";
}

function pickAgents(options, selected) {
  const on = new Set(selected);
  let index = 0;
  const height = options.length + 1;
  const paintList = (first) => {
    if (!first) process.stdout.write(`\x1b[${height}A`);
    process.stdout.write(`  Which agents?  ${dim("space toggle · enter continue")}\x1b[K\n`);
    for (let i = 0; i < options.length; i += 1) {
      const name = options[i];
      const arrow = i === index ? "❯" : " ";
      const mark = on.has(name) ? "x" : " ";
      const label = (agentNames[name] ?? name).padEnd(16);
      const path = flagsPath(name);
      process.stdout.write(`  ${arrow} [${mark}] ${label}  ${dim(path)}\x1b[K\n`);
    }
  };
  function flagsPath(name) {
    return agentDirs[name].project;
  }
  process.stdin.setRawMode(true);
  paintList(true);
  try {
    while (true) {
      const key = readKey();
      if (key === "ctrl-c") fail("Aborted.");
      if (key === "enter") {
        if (on.size === 0) continue;
        return options.filter((name) => on.has(name));
      }
      if (key === "space") {
        const name = options[index];
        if (on.has(name)) on.delete(name);
        else on.add(name);
      } else if (key === "up") index = (index + options.length - 1) % options.length;
      else if (key === "down") index = (index + 1) % options.length;
      paintList(false);
    }
  } finally {
    process.stdin.setRawMode(false);
    say();
  }
}

function chooseAgents(manifest, flags, { pick, lock } = {}) {
  const known = knownAgents();
  if (flags.agents.length) {
    const bad = flags.agents.filter((name) => !known.includes(name));
    if (bad.length) fail(`Unknown agent: ${bad.join(", ")}. Known: ${known.join(", ")}`);
    const listed = [...new Set(flags.agents)];
    if (pick) return listed;
    return [...new Set([...agentsFromLock(lock).filter((name) => known.includes(name)), ...listed])];
  }
  if (!pick) {
    const locked = agentsFromLock(lock).filter((name) => known.includes(name));
    if (locked.length) return locked;
  }
  const fallback = (manifest.agents ?? []).filter((name) => known.includes(name));
  const start = fallback.length ? fallback : ["cursor"];
  if (!pick || flags.yes || !process.stdin.isTTY) return start;
  return pickAgents(known, start);
}

function sourcePath(skill) {
  if (skill.source !== "local") return skill.source;
  return join(root, "skills");
}

function runSkills(args) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["--yes", SKILLS_CLI, ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) fail(`Could not run npx. ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const agentDirs = {
  cursor: { project: ".agents/skills", home: ".cursor/skills" },
  "claude-code": { project: ".claude/skills", home: ".claude/skills" },
  codex: { project: ".agents/skills", home: ".agents/skills" },
  "github-copilot": { project: ".agents/skills", home: ".copilot/skills" },
  "gemini-cli": { project: ".agents/skills", home: ".gemini/skills" },
};

function childDirs(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(dir, entry.name));
  } catch {
    return [];
  }
}

function pluginHas(name) {
  for (const base of [join(homedir(), ".claude", "plugins"), join(process.cwd(), ".claude", "plugins")]) {
    for (const plugin of childDirs(base)) {
      if (existsSync(join(plugin, "skills", name, "SKILL.md"))) return true;
      for (const nested of childDirs(plugin)) {
        if (existsSync(join(nested, "skills", name, "SKILL.md"))) return true;
      }
    }
  }
  return false;
}

function agentDir(agent, global) {
  const dirs = agentDirs[agent];
  if (!dirs) fail(`Unknown agent: ${agent}. Known: ${Object.keys(agentDirs).join(", ")}.`);
  return global ? join(homedir(), dirs.home) : join(process.cwd(), dirs.project);
}

function agentHas(name, agent, global) {
  if (existsSync(join(agentDir(agent, global), name, "SKILL.md"))) return true;
  return agent === "claude-code" && pluginHas(name);
}

function readLock(flags) {
  const file = lockFile(flags);
  if (!existsSync(file)) return { version: 1, skills: {} };
  try {
    const data = readJson(file);
    return { version: 1, skills: data.skills ?? {} };
  } catch {
    return { version: 1, skills: {} };
  }
}

function writeLock(flags, lock) {
  writeJson(lockFile(flags, true), { version: 1, skills: lock.skills });
}

function packageVersion() {
  try {
    return readJson(join(root, "package.json")).version ?? "";
  } catch {
    return "";
  }
}

function recordInstall(lock, skill, agents, global) {
  const prev = lock.skills[skill.name] ?? { agents: [] };
  const all = [...new Set([...prev.agents, ...agents])];
  const folder = skillFolders(skill.name, all, global)[0];
  lock.skills[skill.name] = {
    source: skill.source,
    author: skill.author,
    agents: all,
    installedAt: new Date().toISOString(),
    ...(skill.source === "local" ? { version: packageVersion() } : {}),
    ...(folder ? { hash: folderHash(folder) } : {}),
  };
}

// A clone or a checkout rewrites every mtime, so an edit is a change of content.
function folderHash(dir) {
  const hash = createHash("sha256");
  const walk = (at) => {
    for (const name of readdirSync(at).sort()) {
      if (name === ".DS_Store") continue;
      const file = join(at, name);
      if (statSync(file).isDirectory()) walk(file);
      else hash.update(`${relative(dir, file)}\0`).update(readFileSync(file));
    }
  };
  walk(dir);
  return hash.digest("hex");
}

// The skills CLI can only update what it can fetch. A kit skill lives in this
// package, so update copies it here instead of reporting "up to date" over a
// stale file.
function copyLocalSkill(name, agents, global) {
  const from = join(root, "skills", name);
  if (!existsSync(join(from, "SKILL.md"))) return false;
  let copied = false;
  for (const dir of new Set(agents.map((agent) => agentDir(agent, global)))) {
    const to = join(dir, name);
    if (existsSync(to)) {
      // A link already points at this package. Replacing it would pin a copy.
      if (lstatSync(to).isSymbolicLink()) continue;
      rmSync(to, { recursive: true, force: true });
    }
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
    copied = true;
  }
  return copied;
}

function skillFolders(name, agents, global) {
  const folders = [];
  const seen = new Set();
  for (const agent of agents) {
    const folder = join(agentDir(agent, global), name);
    if (seen.has(folder)) continue;
    seen.add(folder);
    if (existsSync(join(folder, "SKILL.md"))) folders.push(folder);
  }
  return folders;
}

function locallyEdited(name, entry, agents, global) {
  const folders = skillFolders(name, entry?.agents ?? agents, global);
  if (entry?.hash) return folders.some((folder) => folderHash(folder) !== entry.hash);
  // Locks written before 0.6.1 have no hash. The next update records one.
  const installed = Date.parse(entry?.installedAt ?? "");
  if (Number.isNaN(installed)) return false;
  return folders.some((folder) => statSync(join(folder, "SKILL.md")).mtimeMs > installed + 2000);
}

function generateRouter(items) {
  const lines = items.filter((item) => kind(item) === "skill").map((item) => {
    const when = item.when?.trim() || item.name;
    const why = item.why?.trim();
    return why ? `- ${when}: ${item.name}. ${why}` : `- ${when}: ${item.name}`;
  });
  return `# Long Beard

The project's own code, conventions, and DESIGN.md win.

Load only what the task needs. Leave the rest unread.

A marketing site is the page a person lands on to understand or choose. An application is the tool they come back to. Official look wins: DESIGN.md, then Figma, then the board. Hunt finds references and proposes an adaptation; it does not code the page. Open the moodboard before they pick, say what we take, change, and leave, then ask to write or update DESIGN.md as its own message — once more, first, if they move on without answering — only on yes. Code the page only when they asked to build. Direction-only stops after the next-step offer. A site hunts live pages; an application hunts screen shots. With a direction already, hunt only the piece.

${lines.join("\n")}

A normal change can be ponytail and a short premortem. That is still a small set.

Write so a person can use the reply in one read. End with what you did not check.
`;
}

// AGENTS.md in this repository is this output, without the optional skills.
// `npm run router` rewrites it; `npm test` fails when the two drift.
function kitRouter() {
  return generateRouter(catalog(curated()).filter((item) => !item.optional));
}

function pointerWrites(flags, agents) {
  if (flags.global) {
    const home = join(homedir(), ".longbeard");
    const dirs = [...new Set(agents.map((agent) => agentDir(agent, true)))];
    return [join(home, "AGENTS.md"), join(home, "beard-lock.json"), ...dirs];
  }
  return ["AGENTS.md", "beard-lock.json"];
}

function classify(skills, agents, flags) {
  const lock = readLock(flags);
  const missing = [];
  const ours = [];
  const edited = [];
  const theirs = [];
  for (const skill of skills) {
    const present = agents.filter((agent) => agentHas(skill.name, agent, flags.global));
    const need = agents.filter((agent) => !agentHas(skill.name, agent, flags.global));
    const oursAlready = Boolean(lock.skills[skill.name]);
    if (oursAlready) {
      if (locallyEdited(skill.name, lock.skills[skill.name], agents, flags.global)) edited.push(skill);
      else ours.push(skill);
      if (need.length > 0) missing.push({ ...skill, agentsNeed: need, note: `missing on ${need.join(", ")}` });
    } else if (need.length === 0) {
      theirs.push({ ...skill, note: `already on ${present.join(", ")}` });
    } else {
      missing.push({
        ...skill,
        agentsNeed: need,
        note: present.length > 0 ? `already on ${present.join(", ")}` : "",
      });
    }
  }
  return { missing, ours, edited, theirs, writes: pointerWrites(flags, agents), lock };
}

function confirmWrite(flags, writes) {
  if (writes.length === 0 || flags.yes || !process.stdin.isTTY) return;
  say(dim("Proceed? [Y/n]"));
  const buf = Buffer.alloc(80);
  const n = readStdin(buf);
  const line = buf.toString("utf8", 0, n).trim().toLowerCase();
  if (line && line !== "y" && line !== "yes") fail("Aborted.");
}

function installSkills(skills, { global, agents }) {
  if (skills.length === 0) return;
  const groups = new Map();
  for (const skill of skills) {
    const source = sourcePath(skill);
    const need = skill.agentsNeed ?? agents;
    const key = `${source}::${need.join(",")}`;
    const group = groups.get(key) ?? { source, agents: need, names: [] };
    group.names.push(skill.name);
    groups.set(key, group);
  }
  for (const { source, agents: target, names } of groups.values()) {
    const args = ["add", source, "-y"];
    for (const name of names) args.push("--skill", name);
    if (global) args.push("--global");
    for (const agent of target) args.push("--agent", agent);
    runSkills(args);
  }
}

function upsertBlock(file, block) {
  const wrapped = `${START}\n${block.trim()}\n${END}\n`;
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, wrapped);
    return;
  }
  const current = readFileSync(file, "utf8");
  for (const [open, close] of [[START, END], [START_OLD, END_OLD]]) {
    const start = current.indexOf(open);
    const end = current.indexOf(close);
    if (start !== -1 && end > start) {
      const next = `${current.slice(0, start)}${wrapped}${current.slice(end + close.length).replace(/^\n/, "")}`;
      writeFileSync(file, next.endsWith("\n") ? next : `${next}\n`);
      return;
    }
  }
  writeFileSync(file, `${current.endsWith("\n") ? current : `${current}\n`}\n${wrapped}`);
}

function writePointers(flags, skills) {
  const text = generateRouter(skills);
  if (flags.global) {
    const dir = join(homedir(), ".longbeard");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "AGENTS.md"), text.endsWith("\n") ? text : `${text}\n`);
    return;
  }
  upsertBlock(join(process.cwd(), "AGENTS.md"), text);
}

function requireProject(flags) {
  if (!flags.global && inRepository()) fail("Run this in the project you want Long Beard in.");
}

function entry(name, source, flags) {
  return {
    kind: "skill",
    name,
    author: flags.author,
    license: flags.license || "see repository",
    source,
    ...(flags.optional ? { optional: true } : {}),
    ...(flags.when ? { when: flags.when } : {}),
    why: flags.why,
  };
}

function setCatalog(manifest, items) {
  manifest.items = items;
  delete manifest.skills;
}

function remember(lock, flags, skills, agents) {
  for (const skill of skills) recordInstall(lock, skill, skill.agentsNeed ?? agents, flags.global);
  writeLock(flags, lock);
}

function init(flags) {
  requireProject(flags);
  const { manifest, skills, items, later } = chosen(flags);
  const agents = chooseAgents(manifest, flags, { pick: true, lock: readLock(flags) });
  const classified = classify(skills, agents, flags);
  classified.later = later;
  plan("init", flags, agents, classified);
  confirmWrite(flags, classified.writes);
  if (classified.missing.length > 0) say(dim("Installing…"));
  installSkills(classified.missing, { global: flags.global, agents });
  remember(classified.lock, flags, classified.missing, agents);
  writePointers(flags, items);
  finish([
    green("Done."),
    `${classified.missing.length} installed, ${classified.theirs.length + classified.ours.length + classified.edited.length} already there.`,
    flags.global ? "Skills are available in every project on this machine. A copy of the note is in ~/.longbeard/AGENTS.md." : "Wrote the AGENTS.md block and beard-lock.json.",
  ]);
}

function update(flags) {
  requireProject(flags);
  const { manifest, skills, items, later } = chosen(flags);
  const agents = chooseAgents(manifest, flags, { pick: false, lock: readLock(flags) });
  const classified = classify(skills, agents, flags);
  classified.later = later;
  plan("update", flags, agents, classified);
  confirmWrite(flags, classified.writes);
  const refresh = flags.force ? [...classified.ours, ...classified.edited] : classified.ours;
  if (classified.missing.length > 0) say(dim("Installing…"));
  installSkills(classified.missing, { global: flags.global, agents });
  remember(classified.lock, flags, classified.missing, agents);
  const here = packageVersion();
  const local = refresh.filter((skill) => skill.source === "local");
  const theirs = refresh.filter((skill) => skill.source !== "local");
  const stale = flags.force
    ? local
    : local.filter((skill) => (classified.lock.skills[skill.name]?.version ?? "") !== here);
  let copied = 0;
  if (stale.length > 0 || theirs.length > 0) say(dim("Refreshing…"));
  for (const skill of stale) {
    const was = classified.lock.skills[skill.name]?.version || "unknown";
    if (!copyLocalSkill(skill.name, skill.agentsNeed ?? agents, flags.global)) continue;
    copied += 1;
    say(was === here ? `  ${skill.name} ${here}, replaced` : `  ${skill.name} ${was} → ${here}`);
  }
  for (const skill of local) {
    if (stale.includes(skill)) continue;
    say(dim(`  ${skill.name} ${here}, already there`));
  }
  if (theirs.length > 0) {
    const args = ["update", ...theirs.map((skill) => skill.name), "-y"];
    if (flags.global) args.push("--global");
    else args.push("--project");
    runSkills(args);
  }
  if (refresh.length > 0) remember(readLock(flags), flags, refresh, agents);
  writePointers(flags, items);
  const held = flags.force ? classified.theirs.length : classified.theirs.length + classified.edited.length;
  finish([
    green("Done."),
    `${classified.missing.length} installed, ${copied + theirs.length} refreshed, ${held} left as they are.`,
    `This is Long Beard ${here}. Run npm install -D @jonandev/longbeard@latest first if a newer one is out.`,
    flags.global ? "Rewrote ~/.longbeard/AGENTS.md." : "Rewrote the AGENTS.md block.",
  ]);
}

function add(flags, rest) {
  const source = rest[0];
  if (!source || flags.skill.length === 0 || !flags.author || !flags.why) {
    fail(`add needs a source, --skill, --author, and --why.\n\n${help}`);
  }
  if (inRepository() && !flags.global) {
    const manifest = curated();
    const items = catalog(manifest);
    for (const name of flags.skill) {
      if (items.some((item) => item.name === name)) fail(`${name} is already in the catalog.`);
      items.push(entry(name, source, flags));
    }
    setCatalog(manifest, items);
    writeJson(curatedFile, manifest);
    writeFileSync(join(root, "AGENTS.md"), kitRouter());
    heading("add", flags, curated().agents);
    rows("catalog", green, flags.skill.map((name) => entry(name, source, flags)), "", 16);
    finish([green("Done."), "Wrote beard.json and AGENTS.md. Commit them and push. Projects pick this up on update."]);
    return;
  }
  const extra = extraState(flags);
  const manifest = curated();
  for (const name of flags.skill) {
    if (extra.omit.includes(name)) {
      fail(`${name} is omitted here. Delete it from omit in ${extraFile(flags)} and run update.`);
    }
    if (catalog(manifest).some((item) => item.name === name) || extra.items.some((item) => item.name === name)) {
      fail(`${name} is already in the catalog.`);
    }
    extra.items.push(entry(name, source, flags));
  }
  writeExtra(flags, extra);
  const toInstall = flags.skill.map((name) => ({ name, source, author: flags.author, why: flags.why, when: flags.when }));
  const agents = chooseAgents(manifest, flags, { pick: false, lock: readLock(flags) });
  const classified = classify(toInstall, agents, flags);
  plan("add", flags, agents, classified);
  if (classified.missing.length > 0) say(dim("Installing…"));
  installSkills(classified.missing, { global: flags.global, agents });
  remember(classified.lock, flags, classified.missing, agents);
  writePointers(flags, chosen(flags).items);
  finish([
    green("Done."),
    `On this ${flags.global ? "machine" : "project"} catalog: ${flags.skill.join(", ")}.`,
  ]);
}

function remove(flags, rest) {
  const names = rest;
  if (names.length === 0) fail(`remove needs a skill name.\n\n${help}`);
  if (inRepository() && !flags.global) {
    const manifest = curated();
    const items = catalog(manifest);
    const known = new Set(items.map((item) => item.name));
    for (const name of names) {
      if (!known.has(name)) fail(`${name} is not in the catalog.`);
    }
    setCatalog(manifest, items.filter((item) => !names.includes(item.name)));
    writeJson(curatedFile, manifest);
    writeFileSync(join(root, "AGENTS.md"), kitRouter());
    heading("remove", flags, curated().agents);
    rows("catalog", yellow, names.map((name) => ({ name })), "", 16);
    finish([green("Done."), "Wrote beard.json and AGENTS.md. Commit them and push."]);
    return;
  }
  const { manifest, extra } = chosen(flags);
  const shared = new Set(catalog(manifest).map((item) => item.name));
  const extraNames = new Set(extra.items.map((item) => item.name));
  for (const name of names) {
    if (!shared.has(name) && !extraNames.has(name) && !extra.omit.includes(name)) {
      fail(`${name} is not on this ${flags.global ? "machine" : "project"} catalog.`);
    }
  }
  extra.items = extra.items.filter((item) => !names.includes(item.name));
  for (const name of names) {
    if (shared.has(name) && !extra.omit.includes(name)) extra.omit.push(name);
  }
  writeExtra(flags, extra);
  const lock = readLock(flags);
  const ours = names.filter((name) => lock.skills[name]);
  const agents = chooseAgents(manifest, flags, { pick: false, lock });
  heading("remove", flags, agents);
  rows("remove", yellow, names.map((name) => ({ name })), shared.has(names[0]) ? "Omitted here. Still in the shared catalog." : "This project only.", 16);
  if (ours.length > 0) {
    say(dim("Removing…"));
    const args = ["remove", ...ours, "-y"];
    if (flags.global) args.push("--global");
    for (const agent of agents) args.push("--agent", agent);
    runSkills(args);
    for (const name of ours) delete lock.skills[name];
    writeLock(flags, lock);
  }
  const next = chosen(flags);
  writePointers(flags, next.items);
  finish([
    green("Done."),
    `Removed ${names.join(", ")} from this ${flags.global ? "machine" : "project"}.`,
  ]);
}

function printSkill(skill, width, extra) {
  const mark = extra.omit?.includes(skill.name) ? yellow("omitted ") : skill.optional ? dim("optional") : green("kept    ");
  const credit = [skill.author, skill.license].filter(Boolean).join(", ");
  say(`${mark}  ${skill.name.padEnd(width)}  ${dim(credit)}`);
  if (skill.why) say(`        ${skill.why}`);
}

function list(flags) {
  const shared = catalog(curated());
  const extra = extraState(flags);
  const width = nameWidth([shared, extra.items]);
  say();
  say(bold("Long Beard"));
  say(dim("Catalog · beard.json"));
  say();
  for (const item of shared) printSkill(item, width, extra);
  if (extra.items.length > 0) {
    say();
    say(dim(flags.global ? "This machine" : "This project"));
    say();
    for (const item of extra.items) printSkill(item, width, extra);
  }
  say();
}

const { command, rest, flags } = parseArgs(process.argv.slice(2));
if (flags.version) console.log(readJson(join(root, "package.json")).version);
else if (flags.help || command === "help") console.log(help);
else if (command === "init") init(flags);
else if (command === "add") add(flags, rest);
else if (command === "remove") remove(flags, rest);
else if (command === "update") update(flags);
else if (command === "list") list(flags);
else if (command === "router") process.stdout.write(kitRouter());
else fail(`Unknown command: ${command}\n\n${help}`);
