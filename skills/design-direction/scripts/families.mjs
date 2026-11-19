#!/usr/bin/env node
// Propose families from measured traits, so a big pool is sorted on numbers
// first and the eye only splits, merges and names. No dependencies.
//
//   node measure.mjs design-exploration/<slug>/refs --tsv > design-exploration/<slug>/traits.tsv
//   node families.mjs design-exploration/<slug>/traits.tsv
//   node families.mjs design-exploration/<slug>/traits.tsv --board design-exploration/<slug>/board.md --links links.tsv
//   node families.mjs traits.tsv --links links.tsv --pages traits-pages.tsv
//   node families.mjs design-exploration/<slug>/profiles.json --board design-exploration/<slug>/board.md
//
// profiles.json (measure.mjs --profiles, tags from tag.mjs) is the full read of
// each reference, and what families should be sorted on: besides the numbers
// above, what its picture is (measured: colours, colourfulness, grey, soft and
// hard surfaces; tagged: photo, render, lettering…), where things sit (a 6 by 4
// grid of how full each part of the screen is), what the page is made of
// (video, canvas), and the agent's tags for type, layout, colour and surface.
// Each kind of trait counts once, weighted by how much it shows from across a
// room, and a family is split while its members sit far apart overall
// (--spread is then how far apart, on average, two groups may be and still join: 2 by default).
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
const fromProfiles = /\.json$/i.test(tsvArg || "");
if (!tsvArg || args.length !== 1 || (spreadArg && !(Number(spreadArg) > 0 && Number(spreadArg) < 5)) || !(Number.isInteger(min) && min >= 1)) {
  console.error("usage: node families.mjs traits.tsv [--spread 0.1] [--min 3] [--board board.md] [--links links.tsv] [--out families.json]");
  process.exit(2);
}
const fail = (text) => {
  console.error(`families: ${text}`);
  process.exit(1);
};
if (!existsSync(tsvArg)) fail(`no traits at ${tsvArg}`);
// From profiles, the TSV the rest of this reads is built in memory, and the extra layers kept beside it.
const profiles = fromProfiles ? JSON.parse(readFileSync(tsvArg, "utf8")).refs || {} : null;
const IMAGE = ["tone", "lum", "empty", "loud", "busy", "ground"];
const [head, ...rows] = fromProfiles
  ? [["ref", ...IMAGE], ...Object.values(profiles).filter((p) => p.image && p.shot).map((p) => [p.shot, ...IMAGE.map((k) => p.image.traits[k])])]
  : readFileSync(tsvArg, "utf8").trim().split(/\r?\n/).map((l) => l.split("\t"));
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
const profileOf = new Map();
if (fromProfiles) {
  for (const [name, p] of Object.entries(profiles)) {
    if (!p.shot) continue;
    profileOf.set(p.shot, { name, ...p });
    if (p.link) links.set(p.shot, p.link);
    if (p.page) pages.set(p.link, Object.fromEntries(Object.entries(p.page.traits || {}).map(([k, v]) => [k, String(v)])));
  }
}
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
const spread = spreadArg ? Number(spreadArg) : fromProfiles ? 2 : usePage ? 0.2 : 0.1;
// The profile's layers, each a block of numbers counted as one trait, weighted by how much it shows.
const TAGW = { picture: 1, layout: 0.9, type: 0.6, colour: 0.6, surface: 0.6, photo: 0.4, weight: 0.3 };
const VOCAB = fromProfiles ? (await import("./tag.mjs")).VOCABULARY : null;
const blocks = [];
const block = (name, size) => blocks.push({ name, at: blocks.reduce((t, b) => t + b.size, 0), size });
const traits = [...(useSize ? ["light", "empty", "loud", "busy", "type size"] : ["light", "empty", "loud", "busy"]), ...(usePage ? ["pictures", "gradient", "centred"] : [])];

for (const name of traits) block(name, 1);
if (fromProfiles) {
  const figured = refs.filter((r) => profileOf.get(r.ref)?.image?.figure);
  const tagged = refs.filter((r) => profileOf.get(r.ref)?.tags);
  if (figured.length >= refs.length / 2) {
    for (const name of ["colours", "colourful", "grey", "soft", "sharp"]) block(name, 1);
    block("where", 24);
  }
  if (refs.some((r) => profileOf.get(r.ref)?.page?.media)) block("video or canvas", 1);
  if (refs.some((r) => profileOf.get(r.ref)?.page?.traits?.icons !== undefined)) {
    block("icons", 1);
    block("solid blocks", 1);
  }
  if (tagged.length >= refs.length / 2) for (const field of Object.keys(TAGW)) block(field, Object.keys(VOCAB[field]).length);
  for (const r of refs) {
    const p = profileOf.get(r.ref) || {};
    const f = p.image?.figure;
    // Light or dark counts half: the same look on a dark and a light ground is one family, and the
    // library deals its grounds. What the picture is and where things sit decide the family.
    r.x[0] *= 0.5;
    if (blocks.some((b) => b.name === "colours"))
      r.x.push(...(f ? [0.7 * Math.min(1, Math.log2(f.colours + 1) / 9), 0.7 * Math.min(1, f.colourful / 150), 0.7 * (f.grey / 100), 0.7 * (f.soft / 100), 0.7 * (f.sharp / 100)] : [0.35, 0.35, 0.35, 0.35, 0.35]), ...(f ? f.grid.map((v) => 0.2 * (v / 100)) : new Array(24).fill(0.1)));
    if (blocks.some((b) => b.name === "video or canvas")) r.x.push(Math.min(1, ((p.page?.media?.video || 0) + (p.page?.media?.canvas || 0)) / 100));
    if (blocks.some((b) => b.name === "icons")) {
      const t = p.page?.traits;
      // Icons on a log scale: none, a few, a row, a wall of them. Solid blocks by how much they cover.
      r.x.push(t ? Math.min(1, Math.log2((t.icons || 0) + 1) / 5) : 0.3, t ? Math.min(1, (t.blocks || 0) / 60) : 0.1);
    }
    if (blocks.some((b) => b.name === "picture"))
      for (const [field, w] of Object.entries(TAGW)) {
        const words = Object.keys(VOCAB[field]);
        const given = p.tags?.[field] || [];
        // The main value counts twice the second; an untagged reference sits in the middle of the field.
        const weights = given.map((_, i) => (i === 0 ? 2 : 1));
        const total = weights.reduce((t, v) => t + v, 0);
        r.x.push(...words.map((word) => (given.length ? (w * (weights[given.indexOf(word)] || 0)) / total : w / words.length)));
      }
  }
}
const dims = blocks.reduce((t, b) => t + b.size, 0);
const mean = (group) => Array.from({ length: dims }, (_, k) => group.reduce((t, r) => t + r.x[k], 0) / group.length);
// The spread of each trait: for a block of numbers, how far its members sit from their centre in it.
const sd = (group) => {
  const m = mean(group);
  return blocks.map((b) => Math.sqrt(group.reduce((t, r) => t + Array.from({ length: b.size }, (_, j) => (r.x[b.at + j] - m[b.at + j]) ** 2).reduce((u, v) => u + v, 0), 0) / group.length));
};
const radius = (group) => Math.sqrt(sd(group).reduce((t, v) => t + v * v, 0));
const tooWide = (group) => (fromProfiles ? radius(group) > spread : Math.max(...sd(group)) > spread);
const dist = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));

// Two-means on one group, started from its two ends on its widest trait. Deterministic.
function split(group) {
  // Start from the two members farthest apart: the one farthest from the centre, and the one farthest from it.
  const m0 = mean(group);
  const a = group.reduce((best, r) => (dist(r.x, m0) > dist(best.x, m0) ? r : best), group[0]);
  const b = group.reduce((best, r) => (dist(r.x, a.x) > dist(best.x, a.x) ? r : best), group[0]);
  let centres = [a.x, b.x];
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
const pairs = [];
const open = fromProfiles ? [] : [refs];
if (fromProfiles) {
  // Bottom up: every reference alone, then the two closest groups joined (by the average distance
  // between their members) until the closest two are farther apart than --spread. What is still
  // alone, or only in a pair, is a stray: no family is built around it.
  const n = refs.length;
  const D = refs.map((a) => refs.map((b) => dist(a.x, b.x)));
  let groups = refs.map((r, i) => ({ members: [i], alive: true }));
  const link = groups.map((_, i) => groups.map((__, j) => D[i][j]));
  for (;;) {
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < n; i++) {
      if (!groups[i].alive) continue;
      for (let j = i + 1; j < n; j++) if (groups[j].alive && link[i][j] < best) [best, bi, bj] = [link[i][j], i, j];
    }
    if (bi < 0 || best > spread) break;
    const [gi, gj] = [groups[bi], groups[bj]];
    for (let k = 0; k < n; k++) {
      if (!groups[k].alive || k === bi || k === bj) continue;
      link[bi][k] = link[k][bi] = (gi.members.length * link[bi][k] + gj.members.length * link[bj][k]) / (gi.members.length + gj.members.length);
    }
    gi.members.push(...gj.members);
    gj.alive = false;
  }
  for (const g of groups.filter((x) => x.alive)) {
    if (g.members.length >= min) done.push(g.members.map((i) => refs[i]));
    else {
      // A pair is the seed of a family the pool is too thin for: say so, so the eye looks at the two together.
      if (g.members.length === 2) pairs.push(g.members.map((i) => refs[i].ref));
      strays.push(...g.members.map((i) => refs[i]));
    }
  }
}
while (open.length) {
  const group = open.pop();
  if (!tooWide(group) || group.length < 2 * min) {
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
    const spreads = sd(group);
    const wide = fromProfiles ? blocks.filter((b, k) => spreads[k] > 0.25).map((b) => b.name) : traits.filter((_, k) => spreads[k] > spread);
    // What the eye tagged, as the family's majority: the start of its name.
    if (fromProfiles) {
      ranges.tags = {};
      for (const field of ["picture", "layout", "type", "colour", "surface"]) {
        const counts = new Map();
        for (const r of group) for (const w of (profileOf.get(r.ref)?.tags?.[field] || []).slice(0, 1)) counts.set(w, (counts.get(w) || 0) + 1);
        const [top] = [...counts].sort((x, y) => y[1] - x[1]);
        if (top) ranges.tags[field] = `${top[0]}${top[1] < group.length ? ` ${top[1]}/${group.length}` : ""}`;
      }
    }
    return { id: `f${i + 1}`, size: group.length, small: group.length < 6, radius: Math.round(100 * radius(group)) / 100, wide, ranges, members: members.map((r) => r.ref) };
  });

const outPath = outArg ? resolve(outArg) : join(dirname(resolve(tsvArg)), "families.json");
// Each stray with the family it sits nearest, as a hint for the eye, never a placement.
const centres = families.map((f) => ({ id: f.id, m: mean(done.find((g) => g.length === f.size && g.every((r) => f.members.includes(r.ref))) || []) }));
const nearest = Object.fromEntries(
  strays.map((r) => {
    const best = centres.filter((c) => c.m.length).reduce((b, c) => (!b || dist(r.x, c.m) < dist(r.x, b.m) ? c : b), null);
    return [r.ref, best ? best.id : null];
  }),
);
if (strays.length) families.push({ id: "strays", size: strays.length, small: true, wide: [], stray: true, pairs, nearest, ranges: { tone: [...new Set(strays.map((r) => tone(Number(r.raw.lum))))].join(" and "), empty: "", loud: "", busy: "" }, members: strays.map((r) => r.ref) });
writeFileSync(outPath, `${JSON.stringify({ spread, traits: blocks.map((b) => b.name), families }, null, 2)}\n`);
const sheetsDir = join(dirname(outPath), "families");
mkdirSync(sheetsDir, { recursive: true });
for (const f of families) writeFileSync(join(sheetsDir, `${f.id}.tsv`), `${f.members.map((r) => `${basename(r, extname(r))}\t${resolve(r)}`).join("\n")}\n`);

const tagLine = (f) => (f.ranges.tags && Object.keys(f.ranges.tags).length ? `${Object.values(f.ranges.tags).join(" · ")} | ` : "");
const line = (f) => (f.stray ? "far from every family: place each by eye" : `${tagLine(f)}${f.ranges.tone} · empty ${f.ranges.empty} · loud ${f.ranges.loud} · busy ${f.ranges.busy}${f.ranges.type ? ` · type ${f.ranges.type}` : ""}${f.ranges.pictures ? ` · pictures ${f.ranges.pictures} · gradient ${f.ranges.gradient} · ${f.ranges.align || "no type"}` : ""}`);
const real = families.filter((f) => !f.stray);
console.log(`${refs.length} references (radius ${Math.round(100 * radius(refs)) / 100}), ${real.length} families (${real.filter((f) => f.small).length} small)${strays.length ? `, ${strays.length} strays` : ""}, spread ${spread}, on ${blocks.map((b) => b.name).join(", ")}`);
// Near blank: almost all one colour and almost nothing changing. Usually a capture that caught a loader.
const blank = refs.filter((r) => Number(r.raw.empty) >= 99 && Number(r.raw.busy) < 0.5);
if (blank.length) console.log(`near blank, check each on its sheet: ${blank.map((r) => basename(r.ref)).join(", ")}`);
for (const f of families.filter((x) => x.stray)) {
  if (f.pairs.length) console.log(`pairs, each a family seed: ${f.pairs.map((p) => p.map((r) => basename(r, extname(r))).join("+")).join(", ")}`);
  console.log(`nearest family of each stray: ${f.members.map((r) => `${basename(r, extname(r))}→${f.nearest[r] || "none"}`).join(", ")}`);
}
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
    const t = profileOf.get(r.ref)?.tags;
    const tags = t ? [Object.values(t).map((w) => w.join("+")).filter((w) => w !== "none").join(" · ")] : [];
    return [...tags, v.tone || tone(Number(v.lum)), `empty ${Math.round(Number(v.empty))}%`, `loud ${Math.round(Number(v.loud))}%`, `busy ${Math.round(Number(v.busy))}`, ...page].join(" · ");
  };
  // Each pair of strays is its own group on the board, so it can be taken as the seed of a family.
  const pairOf = new Map();
  for (const [i, pair] of (families.find((f) => f.stray)?.pairs || []).entries()) for (const ref of pair) pairOf.set(ref, `Pair ${i + 1}`);
  const ordered = families.flatMap((f) => (f.stray ? [...f.members].sort((a, b) => (pairOf.has(a) ? 0 : 1) - (pairOf.has(b) ? 0 : 1) || String(pairOf.get(a)).localeCompare(String(pairOf.get(b)), undefined, { numeric: true })).map((ref) => [f, ref]) : f.members.map((ref) => [f, ref])));
  const cards = ordered.map(([f, ref]) => {
      const shot = relative(process.cwd(), resolve(ref)).split("\\").join("/");
      return `### ${basename(ref, extname(ref))}
- link: ${linkOf(ref) || "none (shared in chat)"}
- topic: ${pairOf.get(ref) || f.id}
- shot: ${shot}
- measured: ${measured(byRef.get(ref))}
`;
  });
  const header = `Families: ${families.map((f) => `${f.id} (${line(f)}) — ${f.size}`).join("; ")}\n`;
  writeFileSync(boardPath, `${header}\n${cards.join("\n")}`);
  console.log(`board: ${boardArg}, ${cards.length} cards`);
}
