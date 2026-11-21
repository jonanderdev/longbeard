#!/usr/bin/env node
// Propose families from what is known about each reference, so a pool is
// sorted on the same terms for every keep and the eye only splits, merges,
// moves and names. No dependencies.
//
//   node families.mjs .longbeard/design/<step>/profiles.json --board .longbeard/design/<step>/board.md
//   node families.mjs traits.tsv [--links links.tsv --pages traits-pages.tsv]
//
// profiles.json (measure.mjs --profiles, tags from tag.mjs) is the full read of
// each reference. A TSV from measure.mjs --tsv, with its live pages joined by
// --links and --pages, is read the same way with what it has.
//
// How two references are compared. Each kind of trait gives a distance from 0
// (the same) to 1 (as far apart as it goes): a number by its difference, the
// 6 by 4 grid of where things sit by its average cell, a tag field by how much
// the two sets of words differ. The distance between two references is the
// larger of the weighted root mean square over the kinds both have, and 0.7
// of the widest gap on a primary trait (how empty, how loud, how big the type,
// where things sit, what the picture is, the layout), so one strong difference
// is never averaged away: a reference with no tags, or no live page,
// is compared on what it has, never placed in the middle. Tag every reference
// before sorting: an untagged one is close to anything its numbers match, and
// can join groups the tags would keep apart. It is named when it happens. The
// measured traits hold about two thirds of the weight and the tags one third,
// so the agent's eye steers the families without deciding them. The weights
// are in WEIGHTS below, in plain sight.
//
// How families form. Every reference starts alone; the two closest groups (by
// the average distance between their members) join, and joining stops when the
// closest two are more than --spread apart (0.52 by default, on the 0 to 1
// scale). How many families comes from the pool. What is still alone, or only
// in a pair, is a stray: a pair is named as the seed of a family. A family
// under six cannot be dealt from and is marked small. Two shots of one site
// (the same link: site.jpg and site-menu.jpg) are one reference, its first
// shot leading and the rest kept beside it as `also`.
//
// It writes families.json beside its input, one label<TAB>shot list per family
// in families/ (for contact-sheet.mjs --contain), prints one line per family
// with what its tags agree on, the pairs and each stray's nearest family, how
// many families a slightly lower and higher --spread would give, and the
// near-blank shots. --board writes a board.md skeleton: one card per
// reference in its family, most typical first, pairs as their own groups.
//
// --sliders "loud=2,picture=4,rich=3,cool=2" places each family on the
// sliders they answered in the first questions (playful and new are skipped:
// the eye judges those), 1 to 5: quiet (1) to loud (5), airy (1) to dense (5),
// type-led to picture-led, plain to rich, warm to cool. Each reference's place
// comes from what is already measured and tagged, never from the eye; a
// family's is its members' median. Each family's line then says whether it
// sits near what they asked or is off on a slider: a hint for the families
// board, never a cut. The whole pool is placed too: it is what they chose or
// liked, and where it sits far from what they said is worth one question.
//
// --only families/f3.tsv sorts one family's members alone, to split a bin: a
// family far bigger than the rest, where the pool's spread was too coarse. Pass
// a lower --spread with it. It writes to families/f3-split/ (families.json and
// one list per new family), so the pool's own families stay as they are.
// --only also takes names: --only "card-12,card-40,card-41".
//
// --assign families.json adds new references to families that already exist, for a library that
// grows: nothing already in a family moves. families.json is a previous run's output, or any
// { families: [{ id, members: [shot or name] }] }; its strays are passed over and it is never
// changed. Every reference in profiles.json in no family is new. Each is compared with each family
// by its average distance to the members (the linkage families join by) and joins the nearest when
// that is within --spread, with a confidence from 0 to 1: half how far inside the spread it sits,
// half how much nearer that family is than the next. The new references that join nothing are
// sorted among themselves: a group of --min or more is a seed, a proposed new family; the rest are
// strays, with their nearest family. Each lists its 5 nearest references already in a family. Shots
// of one site are not folded, and bins are not split. It writes assign.json beside the input (or
// --out). It needs profiles.json, and does not go with --only, --board or --sliders.
//
//   node families.mjs .longbeard/design/families/profiles.json --assign .longbeard/design/families/families.json
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
const slidersArg = flag("sliders", "");
const onlyArg = flag("only", "");
const assignArg = flag("assign", "");
const [input] = args;
const usage = "usage: node families.mjs profiles.json | traits.tsv [--only families/f3.tsv | name,name] [--spread 0.52] [--min 3] [--board board.md] [--links links.tsv] [--pages traits-pages.tsv] [--out families.json] [--sliders loud=2,picture=4,rich=3,cool=2]\n       node families.mjs profiles.json --assign families.json [--spread 0.52] [--min 3] [--out assign.json]";
if (!input || args.length !== 1 || (spreadArg && !(Number(spreadArg) > 0 && Number(spreadArg) < 1)) || !(Number.isInteger(min) && min >= 1)) {
  console.error(usage);
  process.exit(2);
}
const fail = (text) => {
  console.error(`families: ${text}`);
  process.exit(1);
};
if (!existsSync(input)) fail(`nothing at ${input}`);
if (assignArg) {
  const clash = [onlyArg && "--only", boardArg && "--board", slidersArg && "--sliders"].filter(Boolean);
  if (clash.length) fail(`--assign does not go with ${clash.join(", ")}: it only adds new references to the families there are`);
  if (!/\.json$/i.test(input)) fail("--assign needs profiles.json (measure.mjs --profiles), not a TSV");
  if (!existsSync(assignArg)) fail(`no families at ${assignArg}`);
}
const spread = spreadArg ? Number(spreadArg) : 0.52;

// ------------------------------------------------------------------ read the references
const readTsv = (path) => {
  const [head, ...rows] = readFileSync(path, "utf8").trim().split(/\r?\n/).map((l) => l.split("\t"));
  return rows.map((r) => Object.fromEntries(head.map((name, i) => [name, r[i]])));
};
const links = new Map();
if (linksArg) {
  if (!existsSync(linksArg)) fail(`no links at ${linksArg}`);
  for (const l of readFileSync(linksArg, "utf8").split(/\r?\n/)) {
    const [name, link] = l.split("\t");
    if (name && link) links.set(name.trim(), link.trim());
  }
}
const nameOfShot = (shot) => basename(shot, extname(shot));
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

let refs;
if (/\.json$/i.test(input)) {
  const store = JSON.parse(readFileSync(input, "utf8")).refs || {};
  // A profile with no shot or no read of its picture cannot be compared: it is named, never dropped quietly.
  const readable = ([, p]) => p && p.shot && p.image?.traits;
  const unread = Object.entries(store).filter((e) => !readable(e)).map(([name]) => name);
  if (unread.length) console.error(`families: left out, no picture read in ${input} (measure them again): ${unread.join(", ")}`);
  refs = Object.entries(store)
    .filter(readable)
    .map(([name, p]) => ({ name, shot: p.shot, link: p.link || null, image: p.image.traits, figure: p.image.figure || null, page: p.page?.flag ? null : p.page?.traits || null, media: p.page?.flag ? null : p.page?.media || null, flag: p.page?.flag || "", tags: p.tags || null }));
} else {
  const pages = new Map();
  if (pagesArg) {
    if (!linksArg) fail("--pages needs --links, to know which page belongs to which picture");
    if (!existsSync(pagesArg)) fail(`no page traits at ${pagesArg}`);
    for (const row of readTsv(pagesArg)) pages.set(row.ref, row);
  }
  refs = readTsv(input).map((row) => {
    for (const k of ["ref", "lum", "empty", "loud", "busy"]) if (!(k in row)) fail(`the TSV has no ${k} column: make it with measure.mjs --tsv`);
    const name = row.name || nameOfShot(row.ref);
    const link = links.get(name) || links.get(basename(row.ref)) || links.get(row.ref) || null;
    const page = link ? pages.get(link) || null : null;
    return { name, shot: row.ref, link, image: row, figure: null, page: page?.flag ? null : page, media: null, flag: page?.flag || "", tags: null };
  });
}
let onlyLabel = "";
if (onlyArg) {
  const names = existsSync(onlyArg)
    ? readFileSync(onlyArg, "utf8").split(/\r?\n/).map((l) => l.split("\t")[0].trim()).filter(Boolean)
    : onlyArg.split(",").map((x) => x.trim()).filter(Boolean);
  const wanted = new Set(names);
  const missing = names.filter((n) => !refs.some((r) => r.name === n));
  if (missing.length) fail(`--only names ${missing.length} not in ${input}: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}`);
  refs = refs.filter((r) => wanted.has(r.name));
  onlyLabel = existsSync(onlyArg) ? basename(onlyArg, extname(onlyArg)) : "only";
}
if (refs.length < 2) fail("fewer than two references to sort");

// ------------------------------------------------------------------ the sliders they answered
// Each 1 to 5, from what is measured and tagged. null where nothing says.
const SLIDERS = {
  loud: ["quiet", "loud"],
  picture: ["type-led", "picture-led"],
  rich: ["plain", "rich"],
  cool: ["warm", "cool"],
  dense: ["airy", "dense"],
};
// playful and new, also on the design brief, are not read from a picture: the eye judges those.
const UNMEASURED = new Set(["playful", "new"]);
const asked = {};
for (const part of slidersArg.split(",").map((x) => x.trim()).filter(Boolean)) {
  const [key, value] = part.split("=").map((x) => x.trim());
  if (UNMEASURED.has(key)) continue;
  if (!SLIDERS[key] || !(Number(value) >= 1 && Number(value) <= 5)) fail(`--sliders ${part}: use ${Object.keys(SLIDERS).join(", ")}, each 1 to 5 (${Object.entries(SLIDERS).map(([k, [a, b]]) => `${k}: 1 ${a}, 5 ${b}`).join("; ")})`);
  asked[key] = Number(value);
}
const mean = (xs) => (xs.filter((x) => x !== null).length ? xs.filter((x) => x !== null).reduce((t, x) => t + x, 0) / xs.filter((x) => x !== null).length : null);
const to5 = (x) => 1 + 4 * Math.min(1, Math.max(0, x));
// Hue in degrees and chroma (how far the colour is from grey, 0 to 1). Not HSL saturation, which
// reads an off-white as strongly coloured: a ground of #f1ede4 has a chroma of 0.05, not 0.3.
const hueChroma = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16) / 255);
  if ([r, g, b].some(Number.isNaN)) return null;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return [0, 0];
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d];
};
const PICTURE_PLACE = { none: 0, lettering: 0, ui: 0.5, icon: 0.5, shape: 0.5, pattern: 0.5, photo: 1, render: 1, illustration: 1, collage: 1, product: 1 };
const COLOUR_PLACE = { neutral: 0, muted: 0.25, "one-accent": 0.4, bright: 0.75, multi: 1 };
function placeOf(r) {
  const empty = num(r.image.empty), loud = num(r.image.loud);
  const pic = r.tags?.picture?.[0], col = r.tags?.colour?.[0];
  // Warm or cool: the ground and the figure's palette, each colour by its share and its chroma.
  const swatches = [[r.image.ground, empty ?? 0], ...(r.figure?.palette || []).map((c) => [c.colour, ((100 - (empty ?? 0)) * c.share) / 100])];
  let warm = 0, cool = 0, all = 0;
  for (const [hex, share] of swatches) {
    const hs = hex && hueChroma(hex);
    if (!hs) continue;
    const w = share * hs[1];
    all += share;
    if (hs[0] < 75 || hs[0] >= 330) warm += w;
    else if (hs[0] >= 150 && hs[0] < 270) cool += w;
  }
  return {
    loud: empty === null ? null : to5(0.45 * (1 - empty / 100) + 0.55 * Math.min(1, (loud ?? 0) / 25)),
    picture: mean([pic in PICTURE_PLACE ? to5(PICTURE_PLACE[pic]) : null, r.page && has(r.page.pictures) ? to5(num(r.page.pictures) / 60) : null]),
    rich: mean([col in COLOUR_PLACE ? to5(COLOUR_PLACE[col]) : null, r.figure?.colours ? to5(Math.log(Math.max(1, r.figure.colours)) / Math.log(200)) : null]),
    cool: all ? 3 + 2 * Math.max(-1, Math.min(1, (cool - warm) / (all * 0.25))) : null,
    // Dense: how little of the first screen is empty. 80% empty is airy (1), 20% is dense (5).
    dense: empty === null ? null : to5((80 - empty) / 60),
  };
}

// Two shots of one site are one reference: the shortest name leads, the others ride along.
// Not with --assign: there each shot is placed on its own.
const byLink = new Map();
if (!assignArg) for (const r of refs) if (r.link) byLink.set(r.link, [...(byLink.get(r.link) || []), r]);
const also = new Map();
for (const group of byLink.values()) {
  if (group.length < 2) continue;
  const [lead, ...rest] = [...group].sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name));
  also.set(lead.name, rest.map((r) => r.name));
  for (const r of rest) r.folded = true;
}
const folded = refs.filter((r) => r.folded).length;
refs = refs.filter((r) => !r.folded);

// ------------------------------------------------------------------ what is compared, and how much it counts
// Each kind of trait: how to read it from a reference (null when it does not have it), how far two
// readings are on 0 to 1, and its weight. Measured traits first; the agent's tags last.
const VOCAB = (await import("./tag.mjs")).VOCABULARY;
const clamp = (v) => Math.max(0, Math.min(1, v));
const scalar = (read, weight) => ({ read, weight, dist: (a, b) => Math.abs(a - b) });
const sizeOf = (display) => {
  const px = parseFloat(display);
  // 12 px reads as 0, 200 px and over as 1, on a log scale: 24 to 48 px is as far as 48 to 96 px.
  return px > 0 ? clamp(Math.log2(px / 12) / Math.log2(200 / 12)) : null;
};
const tagField = (field, weight) => ({
  read: (r) => {
    const words = r.tags?.[field];
    if (!words || !words.length) return null;
    // The main word counts twice the second: a distribution over the field's words.
    const w = words.map((_, i) => (i === 0 ? 2 : 1));
    const total = w.reduce((t, v) => t + v, 0);
    return Object.fromEntries(words.map((word, i) => [word, w[i] / total]));
  },
  weight,
  // How much the two sets of words differ: 0 the same, 1 nothing shared.
  dist: (a, b) => 0.5 * [...new Set([...Object.keys(a), ...Object.keys(b)])].reduce((t, k) => t + Math.abs((a[k] || 0) - (b[k] || 0)), 0),
});
const has = (v) => v !== undefined && v !== null && v !== "";
const WEIGHTS = {
  // From the picture: what a person sees from across a room.
  light: scalar((r) => clamp(Math.cbrt(num(r.image.lum) ?? 0.5)), 0.5),
  empty: scalar((r) => clamp((num(r.image.empty) ?? 50) / 100), 1),
  loud: scalar((r) => clamp(Math.sqrt((num(r.image.loud) ?? 0) / 100)), 1),
  busy: scalar((r) => clamp((num(r.image.busy) ?? 0) / 20), 0.7),
  // What the picture is made of, read on the figure (everything but the ground).
  colours: scalar((r) => (r.figure ? clamp(Math.log2(r.figure.colours + 1) / 9) : null), 0.6),
  colourful: scalar((r) => (r.figure ? clamp(r.figure.colourful / 150) : null), 0.6),
  grey: scalar((r) => (r.figure ? r.figure.grey / 100 : null), 0.5),
  soft: scalar((r) => (r.figure ? r.figure.soft / 100 : null), 0.6),
  sharp: scalar((r) => (r.figure ? r.figure.sharp / 100 : null), 0.6),
  where: { read: (r) => (r.figure?.grid?.length === 24 ? r.figure.grid.map((v) => v / 100) : null), weight: 1, dist: (a, b) => a.reduce((t, v, i) => t + Math.abs(v - b[i]), 0) / a.length },
  // From the live page, when there is one.
  "type size": scalar((r) => (r.page ? sizeOf(r.page.display) : null), 1),
  pictures: scalar((r) => (r.page && has(r.page.pictures) ? clamp(num(r.page.pictures) / 100) : null), 0.7),
  gradient: scalar((r) => (r.page && has(r.page.gradient) ? clamp(num(r.page.gradient) / 100) : null), 0.5),
  centred: scalar((r) => (r.page?.align ? (r.page.align === "centre" ? 1 : 0) : null), 0.5),
  "solid blocks": scalar((r) => (r.page && has(r.page.blocks) ? clamp(num(r.page.blocks) / 60) : null), 0.5),
  icons: scalar((r) => (r.page && has(r.page.icons) ? clamp(Math.log2(num(r.page.icons) + 1) / 5) : null), 0.4),
  "video or canvas": scalar((r) => (r.media ? clamp(((r.media.video || 0) + (r.media.canvas || 0)) / 100) : null), 0.5),
  // The agent's eye, in the fixed vocabulary: about a third of the weight in all.
  picture: tagField("picture", 1.5),
  layout: tagField("layout", 1),
  scale: tagField("scale", 0.8),
  type: tagField("type", 0.5),
  colour: tagField("colour", 0.5),
  surface: tagField("surface", 0.5),
  photo: tagField("photo", 0.3),
  weight: tagField("weight", 0.2),
};
for (const field of Object.keys(VOCAB)) if (!WEIGHTS[field]) WEIGHTS[field] = tagField(field, 0.3);
const kinds = Object.entries(WEIGHTS).filter(([, k]) => refs.some((r) => k.read(r) !== null));
for (const r of refs) r.v = kinds.map(([, k]) => k.read(r));

// What a person sees first from across a room. Two screens far apart on any one of these do not look
// alike, however much else agrees: an empty page and a loud poster with the same tags; a photograph
// and a drawing; small type and type that fills the screen. Light or dark is left out on purpose:
// the same look on both grounds is one family.
const PRIMARY = new Set(["empty", "loud", "type size", "where", "picture", "layout"]);
const n = refs.length;
const pairDist = (a, b) => {
  let total = 0, weight = 0, strongest = 0;
  for (const [i, [name, k]] of kinds.entries()) {
    const x = a.v[i], y = b.v[i];
    if (x === null || y === null) continue;
    const d = k.dist(x, y);
    total += k.weight * d * d;
    weight += k.weight;
    if (PRIMARY.has(name)) strongest = Math.max(strongest, d);
  }
  // The larger of the whole mix (a root mean square, so a kind far apart is not averaged away) and
  // the widest gap on a primary trait, at 0.7.
  return weight ? Math.max(Math.sqrt(total / weight), 0.7 * strongest) : 1;
};
const D = refs.map((a) => refs.map((b) => pairDist(a, b)));

// ------------------------------------------------------------------ join, closest first
// Over the whole pool, or over some of it (to split a bin).
function cluster(cut, among = refs.map((_, i) => i)) {
  const m = among.length;
  const groups = among.map((i) => ({ members: [i], alive: true }));
  const link = among.map((a) => among.map((b) => D[a][b]));
  for (;;) {
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < m; i++) {
      if (!groups[i].alive) continue;
      for (let j = i + 1; j < m; j++) if (groups[j].alive && link[i][j] < best) [best, bi, bj] = [link[i][j], i, j];
    }
    if (bi < 0 || best > cut) break;
    const [gi, gj] = [groups[bi], groups[bj]];
    for (let k = 0; k < m; k++) {
      if (!groups[k].alive || k === bi || k === bj) continue;
      link[bi][k] = link[k][bi] = (gi.members.length * link[bi][k] + gj.members.length * link[bj][k]) / (gi.members.length + gj.members.length);
    }
    gi.members.push(...gj.members);
    gj.alive = false;
  }
  return groups.filter((g) => g.alive).map((g) => g.members);
}

// ------------------------------------------------------------------ --assign: add new references to the families there are
if (assignArg) {
  let prior;
  try {
    prior = JSON.parse(readFileSync(assignArg, "utf8"));
  } catch {
    fail(`${assignArg} is not JSON`);
  }
  // A member is named by its shot or its name.
  const indexOf = new Map();
  refs.forEach((r, i) => indexOf.set(r.name, i));
  refs.forEach((r, i) => indexOf.set(r.shot, i));
  const placed = new Set(), missing = [], fams = [];
  for (const f of prior?.families || []) {
    if (f.stray) continue;
    const members = [];
    for (const m of f.members || []) {
      const i = indexOf.get(m);
      if (i === undefined) missing.push(m);
      else if (!placed.has(i)) placed.add(i), members.push(i);
    }
    // Other shots of a site a full sort folded in are in the family too, though not compared.
    for (const names of Object.values(f.also || {})) for (const m of names) if (indexOf.has(m)) placed.add(indexOf.get(m));
    if (members.length) fams.push({ id: String(f.id), members });
  }
  if (!fams.length) fail(`${assignArg} has no family whose members are in ${input}`);
  const r2 = (x) => Math.round(x * 100) / 100;
  const inFamily = fams.flatMap((f) => f.members);
  const fresh = refs.map((_, i) => i).filter((i) => !placed.has(i));
  const read = (i) => {
    const ranked = fams.map((f) => ({ family: f.id, distance: f.members.reduce((t, j) => t + D[i][j], 0) / f.members.length })).sort((a, b) => a.distance - b.distance);
    const [first, second] = ranked;
    const nearest = [...inFamily].sort((a, b) => D[i][a] - D[i][b]).slice(0, 5).map((j) => ({ name: refs[j].name, distance: r2(D[i][j]) }));
    return { first, d2: second ? second.distance : null, second: second ? { family: second.family, distance: r2(second.distance) } : null, nearest };
  };
  const assigned = [], left = [], lines = [];
  for (const i of fresh) {
    const { first, d2, second, nearest } = read(i);
    if (first.distance > spread) {
      left.push(i);
      continue;
    }
    // Half how far inside the spread it sits, half how much nearer this family is than the next (all of it with one family).
    const d1 = first.distance;
    const margin = d2 === null ? 1 : d2 > 0 ? (d2 - d1) / d2 : 0;
    const confidence = r2(Math.max(0, Math.min(1, 0.5 * (1 - d1 / spread) + 0.5 * margin)));
    assigned.push({ name: refs[i].name, shot: refs[i].shot, family: first.family, distance: r2(d1), confidence, second, nearest_family: first.family, nearest });
    lines.push(`${refs[i].name} → ${first.family}  distance ${r2(d1)}  confidence ${confidence}${second ? `  (next ${second.family} ${second.distance})` : ""}  near ${nearest.map((x) => x.name).join(", ")}`);
  }
  // What joins nothing is sorted among itself: a group of --min or more is a seed, the rest strays.
  const rest = left.length >= 2 ? cluster(spread, left) : left.map((i) => [i]);
  const seeds = [], strayRows = [];
  for (const g of rest.filter((g) => g.length >= min).sort((a, b) => b.length - a.length)) {
    const meanIn = (i) => g.filter((j) => j !== i).reduce((t, j) => t + D[i][j], 0) / (g.length - 1);
    const ordered = [...g].sort((a, b) => meanIn(a) - meanIn(b));
    const seed = { size: g.length, radius: r2(ordered.reduce((t, i) => t + meanIn(i), 0) / g.length), members: ordered.map((i) => refs[i].name) };
    seeds.push(seed);
    for (const i of ordered) {
      const { first } = read(i);
      lines.push(`${refs[i].name} → new family ${seeds.length} (${seed.size}, radius ${seed.radius})  nearest ${first.family} ${r2(first.distance)}`);
    }
  }
  for (const i of rest.filter((g) => g.length < min).flat()) {
    const { first, second, nearest } = read(i);
    strayRows.push({ name: refs[i].name, shot: refs[i].shot, nearest_family: first.family, distance: r2(first.distance), second, nearest });
    lines.push(`${refs[i].name} → stray  nearest ${first.family} ${r2(first.distance)}  near ${nearest.map((x) => x.name).join(", ")}`);
  }
  const outPath = outArg ? resolve(outArg) : join(dirname(resolve(input)), "assign.json");
  if (outPath === resolve(assignArg)) fail(`--out ${outArg} is the families file: write the assignment elsewhere`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ spread, families: fams.map((f) => ({ id: f.id, size: f.members.length })), assigned, seeds, strays: strayRows }, null, 2)}\n`);
  console.log(`${fresh.length} new of ${n} references: ${assigned.length} join a family, ${seeds.length} new families proposed (${seeds.reduce((t, s) => t + s.size, 0)} references), ${strayRows.length} strays, spread ${spread}`);
  if (missing.length) console.log(`members of ${assignArg} not in ${input}, passed over: ${missing.join(", ")}`);
  for (const l of lines) console.log(l);
  console.log(`assign: ${relative(process.cwd(), outPath) || outPath}`);
  process.exit(0);
}

const groups = cluster(spread);
// A bin: one family of 20 or more holding far more than its share: over three times the median of
// the other families, or over two fifths of the pool. On a
// pool of pictures only, one spread can make a few huge bins beside many strays, and lowering it
// for the whole pool only adds strays. So a bin alone is sorted again at a lower spread, step by
// step, until it splits into two or more families with most of it still in one; it is said.
const splits = [];
const isBin = (g, all) => {
  if (g.length < 20) return false;
  const others = all.filter((x) => x !== g && x.length >= min).map((x) => x.length).sort((a, b) => a - b);
  const med = others.length ? others[others.length >> 1] : 0;
  return g.length > 0.4 * n || (others.length >= 2 && g.length > 3 * med);
};
for (let pass = 0; pass < 6; pass++) {
  const bin = groups.find((g) => !g.tried && isBin(g, groups));
  if (!bin) break;
  bin.tried = true;
  for (let cut = spread - 0.02; cut >= Math.max(0.16, spread / 2) - 1e-9; cut -= 0.02) {
    const sub = cluster(cut, bin);
    const fams = sub.filter((g) => g.length >= min);
    const loose = sub.filter((g) => g.length < min).flat().length;
    if (fams.length >= 2 && Math.max(...fams.map((g) => g.length)) < 0.75 * bin.length && loose <= 0.3 * bin.length) {
      groups.splice(groups.indexOf(bin), 1, ...sub);
      splits.push(`a bin of ${bin.length} at ${Math.round(cut * 100) / 100} into ${fams.length} families${loose ? ` and ${loose} strays` : ""}`);
      break;
    }
  }
}
const done = groups.filter((g) => g.length >= min).sort((a, b) => b.length - a.length);
const strayGroups = groups.filter((g) => g.length < min);
const strays = strayGroups.flat();
const pairs = strayGroups.filter((g) => g.length === 2);
// How sensitive the cut is: what a little lower and higher would give.
// With the largest family's size, so a count that holds steady while one bin swallows the pool shows.
const countAt = (cut) => {
  const fams = cluster(cut).filter((g) => g.length >= min);
  return `${fams.length}${fams.length ? `, largest ${Math.max(...fams.map((g) => g.length))}` : ""}`;
};
const nearby = [Math.max(0.05, spread - 0.04), spread + 0.04].map((cut) => `${Math.round(cut * 100) / 100} → ${countAt(cut)}`);

// ------------------------------------------------------------------ describe each family
const meanTo = (i, group) => group.filter((j) => j !== i).reduce((t, j) => t + D[i][j], 0) / Math.max(1, group.length - 1);
const range = (values, fmt) => {
  const s = values.filter((v) => v !== null && !Number.isNaN(v)).sort((a, b) => a - b);
  if (!s.length) return "";
  const lo = s.length >= 10 ? s[Math.floor(s.length * 0.1)] : s[0];
  const hi = s.length >= 10 ? s[Math.ceil(s.length * 0.9) - 1] : s.at(-1);
  return fmt(lo) === fmt(hi) ? `${fmt(lo)}` : `${fmt(lo)}–${fmt(hi)}`;
};
const tone = (l) => (l > 0.6 ? "light" : l < 0.12 ? "dark" : "mid");
const describe = (group) => {
  const rs = group.map((i) => refs[i]);
  const tags = {};
  for (const field of ["picture", "layout", "scale", "type", "colour", "surface"]) {
    const counts = new Map();
    for (const r of rs) for (const w of (r.tags?.[field] || []).slice(0, 1)) counts.set(w, (counts.get(w) || 0) + 1);
    const [top] = [...counts].sort((x, y) => y[1] - x[1]);
    if (top) tags[field] = `${top[0]}${top[1] < rs.length ? ` ${top[1]}/${rs.length}` : ""}`;
  }
  const sized = rs.filter((r) => r.page && parseFloat(r.page.display) > 0);
  return {
    tags,
    tone: [...new Set(rs.map((r) => tone(num(r.image.lum) ?? 0.5)))].join(" and "),
    empty: `${range(rs.map((r) => num(r.image.empty)), Math.round)}%`,
    loud: `${range(rs.map((r) => num(r.image.loud)), Math.round)}%`,
    busy: range(rs.map((r) => num(r.image.busy)), Math.round),
    ...(sized.length ? { type: `${range(sized.map((r) => parseFloat(r.page.display)), Math.round)}px` } : {}),
    ...(rs.some((r) => r.page?.align) ? { align: [...new Set(rs.map((r) => r.page?.align).filter(Boolean))].join(" and ") } : {}),
  };
};
// The kinds of trait a family spreads widest on: where the eye should look first.
const wideOn = (group) =>
  kinds
    .map(([name, k], ki) => {
      const vals = group.map((i) => refs[i].v[ki]).filter((v) => v !== null);
      let total = 0, count = 0;
      for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) (total += k.dist(vals[a], vals[b])), count++;
      return [name, count ? total / count : 0];
    })
    .filter(([, d]) => d > 0.45)
    .map(([name]) => name);

// Where a family sits on each slider they answered (its members' median), and how far that is from
// what they asked: off by 1.5 or more on a slider is said, as a hint.
const median = (xs) => {
  const v = xs.filter((x) => x !== null).sort((a, b) => a - b);
  return v.length ? (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2 : null;
};
function sliderFit(group) {
  if (!Object.keys(asked).length) return {};
  const at = {}, off = [];
  for (const key of Object.keys(asked)) {
    const m = median(group.map((i) => placeOf(refs[i])[key]));
    if (m === null) continue;
    at[key] = Math.round(m * 10) / 10;
    if (Math.abs(m - asked[key]) >= 1.5) off.push(`${SLIDERS[key][m > asked[key] ? 1 : 0]} (${at[key]}, asked ${asked[key]})`);
  }
  return { sliders: at, fit: off.length ? `off on ${off.join(", ")}` : Object.keys(at).length ? "near what they asked" : "" };
}

const families = done.map((group, f) => {
  const ordered = [...group].sort((a, b) => meanTo(a, group) - meanTo(b, group));
  const radius = ordered.reduce((t, i) => t + meanTo(i, group), 0) / ordered.length;
  const alsoOf = Object.fromEntries(ordered.filter((i) => also.has(refs[i].name)).map((i) => [refs[i].shot, also.get(refs[i].name)]));
  return { id: `f${f + 1}`, size: group.length, small: group.length < 6, radius: Math.round(radius * 100) / 100, wide: wideOn(group), ranges: describe(group), ...sliderFit(group), members: ordered.map((i) => refs[i].shot), ...(Object.keys(alsoOf).length ? { also: alsoOf } : {}) };
});
if (strays.length) {
  const nearest = Object.fromEntries(
    strays.map((i) => {
      const best = done.map((g, f) => [f, g.reduce((t, j) => t + D[i][j], 0) / g.length]).sort((a, b) => a[1] - b[1])[0];
      return [refs[i].shot, best ? `f${best[0] + 1}` : null];
    }),
  );
  families.push({ id: "strays", size: strays.length, small: true, stray: true, wide: [], ranges: { tags: {}, tone: [...new Set(strays.map((i) => tone(num(refs[i].image.lum) ?? 0.5)))].join(" and ") }, pairs: pairs.map((g) => g.map((i) => refs[i].shot)), nearest, members: strays.map((i) => refs[i].shot) });
}

const outPath = outArg ? resolve(outArg) : onlyLabel ? join(dirname(resolve(input)), "families", `${onlyLabel}-split`, "families.json") : join(dirname(resolve(input)), "families.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ spread, kinds: kinds.map(([name, k]) => ({ name, weight: k.weight })), families }, null, 2)}\n`);
const sheetsDir = onlyLabel ? dirname(outPath) : join(dirname(outPath), "families");
mkdirSync(sheetsDir, { recursive: true });
// The first column is the reference's name (a motion reference's folder, not its frame), so --only finds it.
const nameOfRef = new Map(refs.map((r) => [r.shot, r.name]));
const refName = (shot) => nameOfRef.get(shot) ?? nameOfShot(shot);
for (const f of families) writeFileSync(join(sheetsDir, `${f.id}.tsv`), `${f.members.map((s) => `${refName(s)}\t${resolve(s)}`).join("\n")}\n`);

// ------------------------------------------------------------------ say it
const tagLine = (f) => (Object.keys(f.ranges.tags || {}).length ? `${Object.values(f.ranges.tags).join(" · ")} | ` : "");
const line = (f) => (f.stray ? "far from every family: place each by eye" : `${tagLine(f)}${f.ranges.tone} · empty ${f.ranges.empty} · loud ${f.ranges.loud} · busy ${f.ranges.busy}${f.ranges.type ? ` · type ${f.ranges.type}` : ""}${f.ranges.align ? ` · ${f.ranges.align}` : ""}`);
const real = families.filter((f) => !f.stray);
console.log(`${n} references${folded ? ` (${folded} more shots of the same sites folded in)` : ""}, ${real.length} families (${real.filter((f) => f.small).length} small), ${strays.length} strays, spread ${spread} (${nearby.join(", ")})`);
console.log(`compared on: ${kinds.map(([name]) => name).join(", ")}`);
if (splits.length) console.log(`split on their own, too big for one look: ${splits.join("; ")}. Check each on its sheet: the eye still merges what is one look`);
const bins = done.filter((g) => isBin(g, done));
if (bins.length) console.log(`still far bigger than the other families, likely a bin: ${bins.map((g) => g.length).join(", ")}. Split it by eye, or sort it alone with --only families/<id>.tsv --spread <lower>`);
if (Object.keys(asked).length) {
  console.log(`sliders asked: ${Object.entries(asked).map(([k, v]) => `${SLIDERS[k][0]}–${SLIDERS[k][1]} ${v}`).join(", ")} (a hint for each family, never a cut)`);
  // The pool is what they chose or liked: where it sits against what they said.
  const pool = sliderFit(refs.map((_, i) => i));
  console.log(`what they chose sits at: ${Object.entries(pool.sliders).map(([k, v]) => `${k} ${v}`).join(", ")}${pool.fit.startsWith("off") ? `; ${pool.fit.replace("off on", "away from what they said on")}: ask which should lead` : "; close to what they said"}`);
}
const untagged = refs.filter((r) => !r.tags);
if (untagged.length && untagged.length < n) console.log(`untagged, compared on their numbers only, and able to join groups the tags would keep apart: ${untagged.map((r) => r.name).join(", ")}. Tag them (tag.mjs) and sort again`);
const blank = refs.filter((r) => num(r.image.empty) >= 99 && num(r.image.busy) < 0.5);
if (blank.length) console.log(`near blank, check each on its sheet: ${blank.map((r) => r.name).join(", ")}`);
// A live page that is not the real site (an error, maintenance, a bot check) is left out: that
// reference is sorted on its picture alone, and the picture may be the same wrong page.
const flagged = refs.filter((r) => r.flag);
if (flagged.length) console.log(`pages that may not be the real site, sorted on their picture only; check each on its sheet and drop it if the picture is that page too: ${flagged.map((r) => `${r.name} (${r.flag})`).join(", ")}`);
const stray = families.find((f) => f.stray);
if (stray?.pairs.length) console.log(`pairs, each a family seed: ${stray.pairs.map((p) => p.map(refName).join("+")).join(", ")}`);
if (stray) console.log(`nearest family of each stray: ${stray.members.map((s) => `${refName(s)}→${stray.nearest[s] || "none"}`).join(", ")}`);
for (const f of families) {
  const notes = [f.small ? "small" : "", f.wide.length ? `wide on ${f.wide.join(", ")}` : ""].filter(Boolean).join(", ");
  console.log(`${f.id}  ${String(f.size).padStart(4)}  ${line(f)}${notes ? `  [${notes}]` : ""}${f.fit ? `  {${f.fit}}` : ""}  typical: ${f.members.slice(0, 6).map(refName).join(", ")}`);
}

// ------------------------------------------------------------------ the board skeleton
if (boardArg) {
  const boardPath = resolve(boardArg);
  if (existsSync(boardPath)) fail(`${boardArg} exists: write the skeleton elsewhere or remove it first`);
  const byShot = new Map(refs.map((r) => [r.shot, r]));
  const measured = (r) => {
    const p = r.page || {};
    const page = [parseFloat(p.display) > 0 && `type ${Math.round(parseFloat(p.display))}px`, p.align, num(p.gradient) > 0 && `gradient ${Math.round(num(p.gradient))}%`, p.scale && `scale ${p.scale}`, has(p.pictures) && `pictures ${p.pictures}%`].filter(Boolean);
    const tags = r.tags ? [Object.values(r.tags).map((w) => w.join("+")).filter((w) => w !== "none").join(" · ")] : [];
    return [...tags, tone(num(r.image.lum) ?? 0.5), `empty ${Math.round(num(r.image.empty))}%`, `loud ${Math.round(num(r.image.loud))}%`, `busy ${Math.round(num(r.image.busy))}`, ...page].join(" · ");
  };
  // Each pair of strays is its own group on the board, so it can be taken as the seed of a family.
  const pairOf = new Map();
  for (const [i, pair] of (stray?.pairs || []).entries()) for (const s of pair) pairOf.set(s, `Pair ${i + 1}`);
  const ordered = families.flatMap((f) => (f.stray ? [...f.members].sort((a, b) => (pairOf.has(a) ? 0 : 1) - (pairOf.has(b) ? 0 : 1) || String(pairOf.get(a)).localeCompare(String(pairOf.get(b)), undefined, { numeric: true })).map((s) => [f, s]) : f.members.map((s) => [f, s])));
  const cards = ordered.map(([f, s]) => {
    const r = byShot.get(s);
    const shot = relative(process.cwd(), resolve(s)).split("\\").join("/");
    const more = also.get(r.name);
    return `### ${r.name}
- link: ${r.link || "none (shared in chat)"}
- topic: ${pairOf.get(s) || f.id}
- shot: ${shot}
- measured: ${measured(r)}
${more ? `- also: ${more.join(", ")}\n` : ""}`;
  });
  writeFileSync(boardPath, `Families: ${families.map((f) => `${f.id} (${line(f)}) — ${f.size}`).join("; ")}\n\n${cards.join("\n")}`);
  console.log(`board: ${boardArg}, ${cards.length} cards`);
}
