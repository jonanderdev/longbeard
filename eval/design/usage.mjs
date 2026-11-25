#!/usr/bin/env node
// What a run cost: tokens and time, in total and per skill, from Claude Code's transcripts.
//
//   node eval/design/usage.mjs <run folder>                  finds ~/.claude/projects/<the folder, encoded>
//   node eval/design/usage.mjs --transcripts <folder>        a transcripts folder named directly
//   add --json for one object
//
// Every assistant message is counted once (by its id, the line with the largest output when a message is
// written on several lines), helpers' transcripts (subagents/) included.
// A message belongs to the skill most recently loaded (Skill tool, or reading its SKILL.md) before it in the main transcript; a helper's
// messages to the skill loaded when the helper started. Before any skill: "(none)".
// Tokens: input (fresh), cache writes, cache reads, output. "Weighted" prices cache reads at a tenth
// and cache writes at 1.25 of fresh input, so runs can be compared by one number.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const t = args.indexOf("--transcripts");
const run = args.find((a, i) => !a.startsWith("--") && (t === -1 || i !== t + 1));
const dir = t !== -1 ? resolve(args[t + 1]) : run ? join(homedir(), ".claude/projects", resolve(run).replace(/[^A-Za-z0-9]/g, "-")) : "";
if (!dir || !existsSync(dir)) {
  console.error("usage: node eval/design/usage.mjs <run folder> | --transcripts <folder> [--json]");
  process.exit(2);
}

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith(".jsonl") ? [join(d, f)] : []));
const files = walk(dir);
const lines = (f) => readFileSync(f, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const main = files.filter((f) => !f.includes("/subagents/"));
const helpers = files.filter((f) => f.includes("/subagents/"));

// The skill timeline, from the main transcript's Skill calls.
const timeline = [];
for (const f of main) for (const e of lines(f)) for (const c of e.message?.content ?? []) {
  if (c?.type !== "tool_use") continue;
  // A skill is loaded with the Skill tool, or by reading its SKILL.md (Read, or cat in the shell).
  const read = c.name === "Read" && String(c.input?.file_path ?? "").match(/skills\/([\w-]+)\/SKILL\.md$/)?.[1];
  const cat = c.name === "Bash" && String(c.input?.command ?? "").match(/(?:skills\/([\w-]+)\/SKILL\.md|skills\/([\w-]+) && cat SKILL\.md)/);
  const skill = c.name === "Skill" ? c.input?.skill : read || (cat && (cat[1] || cat[2]));
  if (skill) timeline.push([Date.parse(e.timestamp), skill]);
}
timeline.sort((a, b) => a[0] - b[0]);
const skillAt = (ms) => timeline.filter(([at]) => at <= ms).pop()?.[1] ?? "(none)";

// Each message id once: its skill and the usage of its line with the largest output.
const msgs = new Map();
const keep = (id, skill, u) => {
  const had = msgs.get(id);
  if (!had || (u.output_tokens ?? 0) > (had.u.output_tokens ?? 0)) msgs.set(id, { skill: had?.skill ?? skill, u });
};
const by = new Map();
let first = Infinity;
let last = 0;
const add = (skill, u) => {
  const s = by.get(skill) ?? { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, messages: 0 };
  s.input += u.input_tokens ?? 0;
  s.cacheWrite += u.cache_creation_input_tokens ?? 0;
  s.cacheRead += u.cache_read_input_tokens ?? 0;
  s.output += u.output_tokens ?? 0;
  s.messages += 1;
  by.set(skill, s);
};
for (const f of main) for (const e of lines(f)) {
  const ms = Date.parse(e.timestamp);
  if (ms) { first = Math.min(first, ms); last = Math.max(last, ms); }
  const id = e.message?.id;
  if (e.type !== "assistant" || !e.message?.usage || !id) continue;
  keep(id, skillAt(ms), e.message.usage);
}
for (const f of helpers) {
  const es = lines(f);
  const start = Date.parse(es.find((e) => e.timestamp)?.timestamp ?? "");
  const skill = `${skillAt(start)} (helpers)`;
  for (const e of es) {
    const ms = Date.parse(e.timestamp);
    if (ms) last = Math.max(last, ms);
    const id = e.message?.id;
    if (e.type !== "assistant" || !e.message?.usage || !id) continue;
    keep(id, skill, e.message.usage);
  }
}
for (const { skill, u } of msgs.values()) add(skill, u);

const weighted = (s) => Math.round(s.input + s.output + s.cacheRead * 0.1 + s.cacheWrite * 1.25);
const total = [...by.values()].reduce((a, s) => ({ input: a.input + s.input, cacheWrite: a.cacheWrite + s.cacheWrite, cacheRead: a.cacheRead + s.cacheRead, output: a.output + s.output, messages: a.messages + s.messages }), { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, messages: 0 });
const minutes = Number.isFinite(first) ? Math.round((last - first) / 60000) : 0;
const rows = [...by.entries()].map(([skill, s]) => ({ skill, ...s, weighted: weighted(s) })).sort((a, b) => b.weighted - a.weighted);
if (json) {
  console.log(JSON.stringify({ transcripts: dir, minutes, helpers: helpers.length, total: { ...total, weighted: weighted(total) }, bySkill: rows }, null, 1));
} else {
  const k = (n) => `${(n / 1000).toFixed(0)}k`;
  console.log(`${dir}\n${minutes} min, ${helpers.length} helpers, ${total.messages} messages`);
  console.log(`total: weighted ${k(weighted(total))} · input ${k(total.input)} · cache write ${k(total.cacheWrite)} · cache read ${k(total.cacheRead)} · output ${k(total.output)}`);
  for (const r of rows) console.log(`  ${r.skill.padEnd(36)} weighted ${k(r.weighted).padStart(6)} · output ${k(r.output).padStart(5)} · ${r.messages} messages`);
}
