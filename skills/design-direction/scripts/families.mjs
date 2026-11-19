#!/usr/bin/env node
// Propose families from what is known about each reference, so a pool is
// sorted on the same terms for every keep and the eye only splits, merges,
// moves and names. No dependencies.
//
//   node families.mjs design-exploration/<slug>/profiles.json --board design-exploration/<slug>/board.md
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
const [input] = args;
const usage = "usage: node families.mjs profiles.json | traits.tsv [--spread 0.52] [--min 3] [--board board.md] [--links links.tsv] [--pages traits-pages.tsv] [--out families.json]";
if (!input || args.length !== 1 || (spreadArg && !(Number(spreadArg) > 0 && Number(spreadArg) < 1)) || !(Number.isInteger(min) && min >= 1)) {
  console.error(usage);
  process.exit(2);
}
const fail = (text) => {
  console.error(`families: ${text}`);
  process.exit(1);
};
if (!existsSync(input)) fail(`nothing at ${input}`);
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
  refs = Object.entries(store)
    .filter(([, p]) => p.shot && p.image)
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
    const name = nameOfShot(row.ref);
    const link = links.get(name) || links.get(basename(row.ref)) || links.get(row.ref) || null;
    const page = link ? pages.get(link) || null : null;
    return { name, shot: row.ref, link, image: row, figure: null, page: page?.flag ? null : page, media: null, flag: page?.flag || "", tags: null };
  });
}
if (refs.length < 2) fail("fewer than two references to sort");

// Two shots of one site are one reference: the shortest name leads, the others ride along.
const byLink = new Map();
for (const r of refs) if (r.link) byLink.set(r.link, [...(byLink.get(r.link) || []), r]);
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
function cluster(cut) {
  const groups = refs.map((r, i) => ({ members: [i], alive: true }));
  const link = D.map((row) => [...row]);
  for (;;) {
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < n; i++) {
      if (!groups[i].alive) continue;
      for (let j = i + 1; j < n; j++) if (groups[j].alive && link[i][j] < best) [best, bi, bj] = [link[i][j], i, j];
    }
    if (bi < 0 || best > cut) break;
    const [gi, gj] = [groups[bi], groups[bj]];
    for (let k = 0; k < n; k++) {
      if (!groups[k].alive || k === bi || k === bj) continue;
      link[bi][k] = link[k][bi] = (gi.members.length * link[bi][k] + gj.members.length * link[bj][k]) / (gi.members.length + gj.members.length);
    }
    gi.members.push(...gj.members);
    gj.alive = false;
  }
  return groups.filter((g) => g.alive).map((g) => g.members);
}
const groups = cluster(spread);
const done = groups.filter((g) => g.length >= min).sort((a, b) => b.length - a.length);
const strayGroups = groups.filter((g) => g.length < min);
const strays = strayGroups.flat();
const pairs = strayGroups.filter((g) => g.length === 2);
// How sensitive the cut is: what a little lower and higher would give.
const countAt = (cut) => cluster(cut).filter((g) => g.length >= min).length;
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

const families = done.map((group, f) => {
  const ordered = [...group].sort((a, b) => meanTo(a, group) - meanTo(b, group));
  const radius = ordered.reduce((t, i) => t + meanTo(i, group), 0) / ordered.length;
  const alsoOf = Object.fromEntries(ordered.filter((i) => also.has(refs[i].name)).map((i) => [refs[i].shot, also.get(refs[i].name)]));
  return { id: `f${f + 1}`, size: group.length, small: group.length < 6, radius: Math.round(radius * 100) / 100, wide: wideOn(group), ranges: describe(group), members: ordered.map((i) => refs[i].shot), ...(Object.keys(alsoOf).length ? { also: alsoOf } : {}) };
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

const outPath = outArg ? resolve(outArg) : join(dirname(resolve(input)), "families.json");
writeFileSync(outPath, `${JSON.stringify({ spread, kinds: kinds.map(([name, k]) => ({ name, weight: k.weight })), families }, null, 2)}\n`);
const sheetsDir = join(dirname(outPath), "families");
mkdirSync(sheetsDir, { recursive: true });
for (const f of families) writeFileSync(join(sheetsDir, `${f.id}.tsv`), `${f.members.map((s) => `${nameOfShot(s)}\t${resolve(s)}`).join("\n")}\n`);

// ------------------------------------------------------------------ say it
const tagLine = (f) => (Object.keys(f.ranges.tags || {}).length ? `${Object.values(f.ranges.tags).join(" · ")} | ` : "");
const line = (f) => (f.stray ? "far from every family: place each by eye" : `${tagLine(f)}${f.ranges.tone} · empty ${f.ranges.empty} · loud ${f.ranges.loud} · busy ${f.ranges.busy}${f.ranges.type ? ` · type ${f.ranges.type}` : ""}${f.ranges.align ? ` · ${f.ranges.align}` : ""}`);
const real = families.filter((f) => !f.stray);
console.log(`${n} references${folded ? ` (${folded} more shots of the same sites folded in)` : ""}, ${real.length} families (${real.filter((f) => f.small).length} small), ${strays.length} strays, spread ${spread} (${nearby.join(", ")})`);
console.log(`compared on: ${kinds.map(([name]) => name).join(", ")}`);
const untagged = refs.filter((r) => !r.tags);
if (untagged.length && untagged.length < n) console.log(`untagged, compared on their numbers only, and able to join groups the tags would keep apart: ${untagged.map((r) => r.name).join(", ")}. Tag them (tag.mjs) and sort again`);
const blank = refs.filter((r) => num(r.image.empty) >= 99 && num(r.image.busy) < 0.5);
if (blank.length) console.log(`near blank, check each on its sheet: ${blank.map((r) => r.name).join(", ")}`);
// A live page that is not the real site (an error, maintenance, a bot check) is left out: that
// reference is sorted on its picture alone, and the picture may be the same wrong page.
const flagged = refs.filter((r) => r.flag);
if (flagged.length) console.log(`pages that may not be the real site, sorted on their picture only; check each on its sheet and drop it if the picture is that page too: ${flagged.map((r) => `${r.name} (${r.flag})`).join(", ")}`);
const stray = families.find((f) => f.stray);
if (stray?.pairs.length) console.log(`pairs, each a family seed: ${stray.pairs.map((p) => p.map(nameOfShot).join("+")).join(", ")}`);
if (stray) console.log(`nearest family of each stray: ${stray.members.map((s) => `${nameOfShot(s)}→${stray.nearest[s] || "none"}`).join(", ")}`);
for (const f of families) {
  const notes = [f.small ? "small" : "", f.wide.length ? `wide on ${f.wide.join(", ")}` : ""].filter(Boolean).join(", ");
  console.log(`${f.id}  ${String(f.size).padStart(4)}  ${line(f)}${notes ? `  [${notes}]` : ""}  typical: ${f.members.slice(0, 6).map(nameOfShot).join(", ")}`);
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
