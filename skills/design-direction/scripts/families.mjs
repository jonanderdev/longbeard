#!/usr/bin/env node
// Propose families from measured traits, so a big pool is sorted on numbers
// first and the eye only splits, merges and names. No dependencies.
//
//   node measure.mjs design-exploration/<slug>/refs --tsv > design-exploration/<slug>/traits.tsv
//   node families.mjs design-exploration/<slug>/traits.tsv
//   node families.mjs design-exploration/<slug>/traits.tsv --board design-exploration/<slug>/board.md --links links.tsv
//   node families.mjs traits.tsv --links links.tsv --pages traits-pages.tsv
//
// How many families comes from the pool, not from a fixed number: a family is
// split while any trait spreads wider than --spread (0.1 by default on a 0–1
// scale, 0.2 when the pages' layout is in). A split that would leave fewer than --min (3) on one side sets those
// few aside as strays, for the eye to place, and the rest is split on. A
// family under six cannot be dealt from and is marked small. The traits
// compared: how light the ground is, how much is empty, how loud, how busy,
// and, when the live pages were measured (--pages, joined to the pictures by
// --links), how large the largest type is: what a person sees first from
// across a room, and what no picture measure can read.
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
const spreadArg = flag("spread", "");
const min = Number(flag("min", "3"));
const boardArg = flag("board", "");
const linksArg = flag("links", "");
const outArg = flag("out", "");
const pagesArg = flag("pages", "");
const [tsvArg] = args;
if (!tsvArg || args.length !== 1 || (spreadArg && !(Number(spreadArg) > 0 && Number(spreadArg) < 1)) || !(Number.isInteger(min) && min >= 1)) {
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
const links = new Map();
if (linksArg) {
  if (!existsSync(linksArg)) fail(`no links at ${linksArg}`);
  for (const l of readFileSync(linksArg, "utf8").split(/\r?\n/)) {
    const [ref, link] = l.split("\t");
    if (ref && link) links.set(ref.trim(), link.trim());
  }
}
const linkOf = (ref) => links.get(ref) || links.get(basename(ref)) || links.get(basename(ref, extname(ref)));
// The live pages' numbers, by link: display size, scale, pictures, margin, radius.
const pages = new Map();
if (pagesArg) {
  if (!existsSync(pagesArg)) fail(`no page traits at ${pagesArg}`);
  if (!linksArg) fail("--pages needs --links, to know which page belongs to which picture");
  const [pHead, ...pRows] = readFileSync(pagesArg, "utf8").trim().split(/\r?\n/).map((l) => l.split("\t"));
  for (const r of pRows) pages.set(r[0], Object.fromEntries(pHead.map((name, i) => [name, r[i]])));
}
const PAGE = ["display", "body", "scale", "pictures", "margin", "radius", "lettering", "gradient", "pattern", "align"];
const sizeOf = (display) => {
  const px = parseFloat(display);
  // 12 px reads as 0, 200 px and over as 1, on a log scale: 24 px to 48 px is as far as 48 px to 96 px.
  return px > 0 ? Math.max(0, Math.min(1, Math.log2(px / 12) / Math.log2(200 / 12))) : null;
};
const refs = rows.map((r) => {
  const get = (name) => (name in col ? r[col[name]] : "");
  const raw = Object.fromEntries(head.map((name, i) => [name, r[i]]));
  const page = pages.get(linkOf(get("ref")));
  if (page) for (const name of PAGE) if (page[name] !== undefined && page[name] !== "") raw[name] = page[name];
  return {
    ref: get("ref"),
    raw,
    // Lightness on a perceptual curve, so dark grounds are not crushed together.
    x: [Math.cbrt(Number(get("lum"))), Number(get("empty")) / 100, Number(get("loud")) / 100, Math.min(1, Number(get("busy")) / 20), sizeOf(raw.display)],
    // From the page, when it was measured: how much is pictures, how much is gradient, and whether the
    // largest type is centred. Layout is half of what makes two screens look alike.
    page: page ? [Number(page.pictures || 0) / 100, Number(page.gradient || 0) / 100, page.align === "centre" ? 0.6 : 0] : null,
  };
});
if (refs.length < 2) fail("fewer than two references to sort");
// Type size counts only when most references have it. A reference without it takes the middle value.
const sized = refs.filter((r) => r.x[4] !== null);
const useSize = sized.length >= refs.length / 2;
const middle = sized.length ? [...sized].sort((a, b) => a.x[4] - b.x[4])[Math.floor(sized.length / 2)].x[4] : 0;
for (const r of refs) r.x = useSize ? r.x.map((v, k) => (k === 4 && v === null ? middle : v)) : r.x.slice(0, 4);
// Layout counts on the same terms: when most references have a page, the rest take the middle.
const paged = refs.filter((r) => r.page);
const usePage = paged.length >= refs.length / 2;
if (usePage) {
  const mid = [0, 1, 2].map((k) => [...paged].map((r) => r.page[k]).sort((a, b) => a - b)[Math.floor(paged.length / 2)]);
  for (const r of refs) r.x.push(...(r.page || mid));
}
// With the page's layout in, there are more traits to spread on, so the default is wider:
// 0.1 split a varied pool of 65 into 14 families, 13 of them small; 0.2 gave 9, most of them one look.
const spread = spreadArg ? Number(spreadArg) : usePage ? 0.2 : 0.1;
const traits = [...(useSize ? ["light", "empty", "loud", "busy", "type size"] : ["light", "empty", "loud", "busy"]), ...(usePage ? ["pictures", "gradient", "centred"] : [])];

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
const strays = [];
const open = [refs];
while (open.length) {
  const group = open.pop();
  if (Math.max(...sd(group)) <= spread || group.length < 2 * min) {
    done.push(group);
    continue;
  }
  const [a, b] = split(group);
  if (a.length >= min && b.length >= min) open.push(a, b);
  else {
    // A few far from the rest are strays, not a family: set them aside and split the rest.
    const [few, rest] = a.length < min ? [a, b] : [b, a];
    strays.push(...few);
    open.push(rest);
  }
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
    const sizes = group.map((r) => parseFloat(r.raw.display)).filter((v) => v > 0);
    const ranges = {
      tone: tones.join(" and "),
      empty: `${range(group.map((r) => Number(r.raw.empty)), Math.round)}%`,
      loud: `${range(group.map((r) => Number(r.raw.loud)), Math.round)}%`,
      busy: range(group.map((r) => Number(r.raw.busy)), (v) => Math.round(v)),
      ...(sizes.length ? { type: `${range(sizes, Math.round)}px` } : {}),
      ...(usePage ? { pictures: `${range(group.map((r) => Number(r.raw.pictures || 0)), Math.round)}%`, gradient: `${range(group.map((r) => Number(r.raw.gradient || 0)), Math.round)}%`, align: [...new Set(group.map((r) => r.raw.align).filter(Boolean))].join(" and ") } : {}),
    };
    const wide = traits.filter((_, k) => sd(group)[k] > spread);
    return { id: `f${i + 1}`, size: group.length, small: group.length < 6, wide, ranges, members: members.map((r) => r.ref) };
  });

const outPath = outArg ? resolve(outArg) : join(dirname(resolve(tsvArg)), "families.json");
if (strays.length) families.push({ id: "strays", size: strays.length, small: true, wide: [], stray: true, ranges: { tone: [...new Set(strays.map((r) => tone(Number(r.raw.lum))))].join(" and "), empty: "", loud: "", busy: "" }, members: strays.map((r) => r.ref) });
writeFileSync(outPath, `${JSON.stringify({ spread, traits, families }, null, 2)}\n`);
const sheetsDir = join(dirname(outPath), "families");
mkdirSync(sheetsDir, { recursive: true });
for (const f of families) writeFileSync(join(sheetsDir, `${f.id}.tsv`), `${f.members.map((r) => `${basename(r, extname(r))}\t${resolve(r)}`).join("\n")}\n`);

const line = (f) => (f.stray ? "far from every family: place each by eye" : `${f.ranges.tone} · empty ${f.ranges.empty} · loud ${f.ranges.loud} · busy ${f.ranges.busy}${f.ranges.type ? ` · type ${f.ranges.type}` : ""}${f.ranges.pictures ? ` · pictures ${f.ranges.pictures} · gradient ${f.ranges.gradient} · ${f.ranges.align || "no type"}` : ""}`);
const real = families.filter((f) => !f.stray);
console.log(`${refs.length} references, ${real.length} families (${real.filter((f) => f.small).length} small)${strays.length ? `, ${strays.length} strays` : ""}, spread ${spread}, on ${traits.join(", ")}`);
// Near blank: almost all one colour and almost nothing changing. Usually a capture that caught a loader.
const blank = refs.filter((r) => Number(r.raw.empty) >= 99 && Number(r.raw.busy) < 0.5);
if (blank.length) console.log(`near blank, check each on its sheet: ${blank.map((r) => basename(r.ref)).join(", ")}`);
for (const f of families) {
  const notes = [f.small ? "small" : "", f.wide.length ? `wide on ${f.wide.join(", ")}` : ""].filter(Boolean).join(", ");
  console.log(`${f.id}  ${String(f.size).padStart(4)}  ${line(f)}${notes ? `  [${notes}]` : ""}  typical: ${f.members.slice(0, 6).map((r) => basename(r)).join(", ")}`);
}

if (boardArg) {
  const boardPath = resolve(boardArg);
  if (existsSync(boardPath)) fail(`${boardArg} exists: write the skeleton elsewhere or remove it first`);
  const byRef = new Map(refs.map((r) => [r.ref, r]));
  const measured = (r) => {
    const v = r.raw;
    const page = [v.display && `type ${Math.round(parseFloat(v.display))}px`, v.align, v.gradient && Number(v.gradient) > 0 && `gradient ${Math.round(Number(v.gradient))}%`, v.scale && `scale ${v.scale}`, v.pictures && `pictures ${v.pictures}%`, v.margin && `margin ${v.margin}%`, v.radius && `radius ${v.radius}`].filter(Boolean);
    return [v.tone || tone(Number(v.lum)), `empty ${Math.round(Number(v.empty))}%`, `loud ${Math.round(Number(v.loud))}%`, `busy ${Math.round(Number(v.busy))}`, ...page].join(" · ");
  };
  const cards = families.flatMap((f) =>
    f.members.map((ref) => {
      const shot = relative(process.cwd(), resolve(ref)).split("\\").join("/");
      return `### ${basename(ref, extname(ref))}
- link: ${linkOf(ref) || "none (shared in chat)"}
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
