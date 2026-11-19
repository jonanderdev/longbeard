#!/usr/bin/env node
// Propose families from measured traits, so a big pool is sorted on numbers
// first and the eye only splits, merges and names. No dependencies.
//
//   node measure.mjs design-exploration/<slug>/refs --tsv > design-exploration/<slug>/traits.tsv
//   node families.mjs design-exploration/<slug>/traits.tsv
//   node families.mjs design-exploration/<slug>/traits.tsv --board design-exploration/<slug>/board.md --links links.tsv
//
// How many families comes from the pool, not from a fixed number: a family is
// split while any trait spreads wider than --spread (0.1 by default, on a 0–1
// scale), as long as both halves keep --min members (3). A family under six
// cannot be dealt from and is marked small. The traits compared: how light the
// ground is, how much is empty, how loud, how busy.
//
// It writes families.json beside the TSV: each family with its size, its
// ranges, and its members, most typical first. It prints one short line per
// family, which is all the agent needs to read. In families/ beside it, one
// label<TAB>shot list per family, for contact-sheet.mjs --contain. --board writes a board.md
// skeleton: one card per reference, in its family, most typical first, with
// its measured line, ready for the moodboard's --overview. --links is a TSV of
// ref<TAB>link for the cards' links.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const spread = Number(flag("spread", "0.1"));
const min = Number(flag("min", "3"));
const boardArg = flag("board", "");
const linksArg = flag("links", "");
const outArg = flag("out", "");
const [tsvArg] = args;
if (!tsvArg || args.length !== 1 || !(spread > 0 && spread < 1) || !(Number.isInteger(min) && min >= 1)) {
  console.error("usage: node families.mjs traits.tsv [--spread 0.1] [--min 3] [--board board.md] [--links links.tsv] [--out families.json]");
  process.exit(2);
}
const fail = (text) => {
  console.error(`families: ${text}`);
  process.exit(1);
};
if (!existsSync(tsvArg)) fail(`no traits at ${tsvArg}`);
const [head, ...rows] = readFileSync(tsvArg, "utf8").trim().split(/\r?\n/).map((l) => l.split("\t"));
const col = Object.fromEntries(head.map((name, i) => [name, i]));
for (const name of ["ref", "lum", "empty", "loud", "busy"]) if (!(name in col)) fail(`the TSV has no ${name} column: make it with measure.mjs --tsv`);
const refs = rows.map((r) => {
  const get = (name) => (name in col ? r[col[name]] : "");
  return {
    ref: get("ref"),
    raw: Object.fromEntries(head.map((name, i) => [name, r[i]])),
    // Lightness on a perceptual curve, so dark grounds are not crushed together.
    x: [Math.cbrt(Number(get("lum"))), Number(get("empty")) / 100, Number(get("loud")) / 100, Math.min(1, Number(get("busy")) / 20)],
  };
});
if (refs.length < 2) fail("fewer than two references to sort");
const traits = ["light", "empty", "loud", "busy"];

const mean = (group) => traits.map((_, k) => group.reduce((t, r) => t + r.x[k], 0) / group.length);
const sd = (group) => {
  const m = mean(group);
  return traits.map((_, k) => Math.sqrt(group.reduce((t, r) => t + (r.x[k] - m[k]) ** 2, 0) / group.length));
};
const dist = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));

// Two-means on one group, started from its two ends on its widest trait. Deterministic.
function split(group) {
  const k = sd(group).reduce((best, v, i, all) => (v > all[best] ? i : best), 0);
  const sorted = [...group].sort((a, b) => a.x[k] - b.x[k]);
  let centres = [sorted[0].x, sorted.at(-1).x];
  let halves = [[], []];
  for (let round = 0; round < 20; round++) {
    halves = [[], []];
    for (const r of group) halves[dist(r.x, centres[0]) <= dist(r.x, centres[1]) ? 0 : 1].push(r);
    if (!halves[0].length || !halves[1].length) break;
    const next = halves.map(mean);
    if (next.every((c, i) => dist(c, centres[i]) < 1e-9)) break;
    centres = next;
  }
  return halves;
}

const done = [];
const open = [refs];
while (open.length) {
  const group = open.pop();
  if (Math.max(...sd(group)) <= spread || group.length < 2 * min) {
    done.push(group);
    continue;
  }
  const [a, b] = split(group);
  if (a.length < min || b.length < min) done.push(group);
  else open.push(a, b);
}

const pct = (v) => Math.round(v * 100);
const range = (values, fmt) => {
  const s = [...values].sort((a, b) => a - b);
  // The middle 80% on a big family, so one stray does not set the range.
  const lo = s.length >= 10 ? s[Math.floor(s.length * 0.1)] : s[0];
  const hi = s.length >= 10 ? s[Math.ceil(s.length * 0.9) - 1] : s.at(-1);
  return fmt(lo) === fmt(hi) ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
};
const tone = (l) => (l > 0.6 ? "light" : l < 0.12 ? "dark" : "mid");
const families = done
  .sort((a, b) => b.length - a.length)
  .map((group, i) => {
    const m = mean(group);
    const members = [...group].sort((a, b) => dist(a.x, m) - dist(b.x, m));
    const tones = [...new Set(group.map((r) => tone(Number(r.raw.lum))))];
    const ranges = {
      tone: tones.join(" and "),
      empty: `${range(group.map((r) => Number(r.raw.empty)), Math.round)}%`,
      loud: `${range(group.map((r) => Number(r.raw.loud)), Math.round)}%`,
      busy: range(group.map((r) => Number(r.raw.busy)), (v) => Math.round(v)),
    };
    const wide = traits.filter((_, k) => sd(group)[k] > spread);
    return { id: `f${i + 1}`, size: group.length, small: group.length < 6, wide, ranges, members: members.map((r) => r.ref) };
  });

const outPath = outArg ? resolve(outArg) : join(dirname(resolve(tsvArg)), "families.json");
writeFileSync(outPath, `${JSON.stringify({ spread, families }, null, 2)}\n`);
const sheetsDir = join(dirname(outPath), "families");
mkdirSync(sheetsDir, { recursive: true });
for (const f of families) writeFileSync(join(sheetsDir, `${f.id}.tsv`), `${f.members.map((r) => `${basename(r, extname(r))}\t${resolve(r)}`).join("\n")}\n`);

const line = (f) => `${f.ranges.tone} · empty ${f.ranges.empty} · loud ${f.ranges.loud} · busy ${f.ranges.busy}`;
console.log(`${refs.length} references, ${families.length} families (${families.filter((f) => f.small).length} small), spread ${spread}`);
for (const f of families) {
  const notes = [f.small ? "small" : "", f.wide.length ? `wide on ${f.wide.join(", ")}` : ""].filter(Boolean).join(", ");
  console.log(`${f.id}  ${String(f.size).padStart(4)}  ${line(f)}${notes ? `  [${notes}]` : ""}  typical: ${f.members.slice(0, 6).map((r) => basename(r)).join(", ")}`);
}

if (boardArg) {
  const boardPath = resolve(boardArg);
  if (existsSync(boardPath)) fail(`${boardArg} exists: write the skeleton elsewhere or remove it first`);
  const links = new Map();
  if (linksArg) {
    if (!existsSync(linksArg)) fail(`no links at ${linksArg}`);
    for (const l of readFileSync(linksArg, "utf8").split(/\r?\n/)) {
      const [ref, link] = l.split("\t");
      if (ref && link) links.set(ref.trim(), link.trim());
    }
  }
  const byRef = new Map(refs.map((r) => [r.ref, r]));
  const measured = (r) => {
    const v = r.raw;
    const page = [v.scale && `scale ${v.scale}`, v.pictures && `pictures ${v.pictures}%`, v.margin && `margin ${v.margin}%`, v.radius && `radius ${v.radius}`].filter(Boolean);
    return [v.tone || tone(Number(v.lum)), `empty ${Math.round(Number(v.empty))}%`, `loud ${Math.round(Number(v.loud))}%`, `busy ${Math.round(Number(v.busy))}`, ...page].join(" · ");
  };
  const cards = families.flatMap((f) =>
    f.members.map((ref) => {
      const shot = relative(process.cwd(), resolve(ref)).split("\\").join("/");
      return `### ${basename(ref, extname(ref))}
- link: ${links.get(ref) || links.get(basename(ref)) || "none (shared in chat)"}
- topic: ${f.id}
- shot: ${shot}
- measured: ${measured(byRef.get(ref))}
`;
    }),
  );
  const header = `Families: ${families.map((f) => `${f.id} (${line(f)}) — ${f.size}`).join("; ")}\n`;
  writeFileSync(boardPath, `${header}\n${cards.join("\n")}`);
  console.log(`board: ${boardArg}, ${cards.length} cards`);
}
