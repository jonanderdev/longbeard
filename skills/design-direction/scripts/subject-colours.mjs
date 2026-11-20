#!/usr/bin/env node
// Colour proposals from the product's subject pictures: three or four photos
// of what the product is about (loaves, for a bakery). The pictures' raw
// colours are greys, shadows and backgrounds, so they are never used as
// found: each role is taken from the right colour and tuned by rule.
// Node 22+, an installed Chrome (measure.mjs reads the pictures). No
// dependencies.
//
//   node subject-colours.mjs .longbeard/design/subject
//   node subject-colours.mjs a.jpg b.jpg c.jpg --json
//   node subject-colours.mjs .longbeard/design/subject --sheet subject.html
//   node subject-colours.mjs --from swatches.json --exclude "#806c71"
//
// measure.mjs --swatches gives each picture's ten colours. They are pooled
// across pictures, near-twins merged, and noise dropped: under 2%, specular
// highlights, and black shadows (kept only to give a dark ground).
//
// A colour that lies mostly at the pictures' edges is the backdrop, not the
// subject (a blue wall, a striped cloth): edge over 0.55, or over 0.4 in one
// picture only. It is marked background and is never the signature or the
// accent. A colour found in two or more pictures is preferred to one in one.
// --exclude "#hex,#hex" drops colours near those (OKLab 0.06), for one you saw
// is not the subject: run again without it.
//
// - Signature: the heaviest colour with some chroma (the crust).
// - Light ground: the heaviest light colour, else the signature's hue, made an
//   off-white that keeps its hue. Dark ground: the same, made a near-black.
// - Ink: the other ground's hue, dark on light and light on dark, 4.5:1 or
//   darker (lighter) until it is.
// - Accent: the most colourful heavy colour whose hue stands off the ground,
//   else the signature; chroma raised, lightness 0.55 to 0.72, 3:1 on its
//   ground or left out (and said).
// - Signature ground: the signature at lightness 0.5 to 0.62 where one of the
//   two inks reads on it, or left out (and said).
//
// Prints three proposals (light, dark, signature) as a table: role, colour,
// the colour it came from (its share, in how many pictures), how it was tuned,
// its contrast. --json prints { signature, colours, proposals, library, notes }:
// colours are the pooled colours that survived the noise rules, and library
// holds one or two grounds in deal.mjs's format, from ["subject"], to add to
// library.json, and an accent only when the subject has a second hue of its own
// (a one-hue accent stays in the proposals, for design-identity to offer).
// The light ground is a quiet tint. The second may be the signature at full
// strength: deal.mjs deals it as a ground only when a reference has a ground
// that strong, and as an accent otherwise, and drops a ground of a tone no
// reference uses, so the subject's colours never push a board somewhere it is not.
//
// --sheet out.html writes a page: each proposal's colours as large swatches,
// and beside each, every picture with the pixels near its source colour lit
// and the rest dimmed, so the eye can check each colour is the subject.
// The pictures are written into the page (a browser will not let a page read
// the pixels of a file:// picture), so the page is about as large as they are.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fail = (text) => {
  console.error(`subject-colours: ${text}`);
  process.exit(2);
};
const usage = 'usage: node subject-colours.mjs <folder | image …> | --from swatches.json  [--json] [--exclude "#hex,#hex"] [--sheet out.html]';
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  const value = args[i + 1];
  if (!value || value.startsWith("--")) fail(`--${name} needs a value\n${usage}`);
  args.splice(i, 2);
  return value;
};
const json = args.includes("--json");
if (json) args.splice(args.indexOf("--json"), 1);
const fromArg = option("from");
const excludeArg = option("exclude");
const sheetArg = option("sheet");
if (args.some((a) => a.startsWith("--")) || (fromArg ? args.length : !args.length)) fail(usage);
const hex6 = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${[...s.slice(1)].map((c) => c + c).join("")}`;
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
};
const excluded = excludeArg ? excludeArg.split(",").map((v) => hex6(v) || fail(`--exclude takes hex colours, not ${v.trim()}`)) : [];

let measured;
let base = process.cwd();
if (fromArg) {
  if (!existsSync(fromArg)) fail(`no file at ${fromArg}`);
  try {
    measured = JSON.parse(readFileSync(fromArg, "utf8"));
  } catch {
    fail(`${fromArg} is not JSON`);
  }
  base = dirname(resolve(fromArg));
} else {
  // measure.mjs is copied beside this script.
  const measure = join(dirname(fileURLToPath(import.meta.url)), "measure.mjs");
  const run = spawnSync(process.execPath, [measure, ...args, "--swatches"], { encoding: "utf8", maxBuffer: 64 << 20 });
  if (run.stderr) process.stderr.write(run.stderr);
  if (!run.stdout.trim()) process.exit(run.status || 1);
  measured = JSON.parse(run.stdout);
}
if (!Array.isArray(measured)) fail("swatches JSON must be a list of { target, swatches }");
const pictures = measured.filter((m) => Array.isArray(m?.swatches) && m.swatches.length);
if (!pictures.length) fail("no picture had any swatches");

// sRGB, OKLab and OKLCH, both ways. Out of gamut, chroma is reduced until the colour fits.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
function labOf(hex) {
  const [r, g, b] = rgbOf(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function linOfLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const lchOfLab = ([L, a, b]) => ({ L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 });
const labOfLch = ({ L, C, h }) => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
const inGamut = (lin) => lin.every((c) => c >= -0.0001 && c <= 1.0001);
// The colour at this lightness and hue with as much of the chroma asked for as sRGB holds.
function fit({ L, C, h }) {
  L = Math.min(1, Math.max(0, L));
  if (!inGamut(linOfLab(labOfLch({ L, C, h })))) {
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(linOfLab(labOfLch({ L, C: mid, h })))) lo = mid;
      else hi = mid;
    }
    C = lo;
  }
  return { L, C, h };
}
const hexOf = (lch) => `#${linOfLab(labOfLch(fit(lch))).map((c) => Math.round(Math.min(1, Math.max(0, toGam(Math.min(1, Math.max(0, c))))) * 255).toString(16).padStart(2, "0")).join("")}`;
const lumOf = (hex) => {
  const [r, g, b] = rgbOf(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (x, y) => {
  const [a, b] = [lumOf(x), lumOf(y)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
};
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

// Pool every picture's swatches, each share counted as a share of all the pictures.
const pooled = [];
pictures.forEach((p, n) => {
  for (const s of p.swatches) if (hex6(s.hex) && s.share > 0) pooled.push({ lab: labOf(hex6(s.hex)), share: s.share / pictures.length, edge: Number.isFinite(s.edge) ? s.edge : 0, by: { [n]: s.share } });
});
pooled.sort((a, b) => b.share - a.share);
// Near-twins (OKLab distance under 0.05) are one colour, averaged by share.
const clusters = [];
for (const p of pooled) {
  const twin = clusters.find((c) => distance(c.lab, p.lab) < 0.05);
  if (!twin) {
    clusters.push({ ...p, lab: [...p.lab], by: { ...p.by } });
    continue;
  }
  const w = twin.share + p.share;
  twin.lab = twin.lab.map((v, i) => (v * twin.share + p.lab[i] * p.share) / w);
  twin.edge = (twin.edge * twin.share + p.edge * p.share) / w;
  twin.share = w;
  for (const [n, s] of Object.entries(p.by)) twin.by[n] = (twin.by[n] || 0) + s;
}
for (const c of clusters) {
  Object.assign(c, lchOfLab(c.lab), { hex: hexOf(lchOfLab(c.lab)) });
  c.pictures = Object.values(c.by).filter((s) => s >= 2).length;
  // A backdrop: mostly at the edges, or at the edges of the one picture it is in.
  c.background = c.edge > 0.55 || (c.pictures <= 1 && c.edge > 0.4);
}
clusters.sort((a, b) => b.share - a.share);
const notes = [];
const out = clusters.filter((c) => excluded.some((x) => distance(labOf(x), c.lab) < 0.06));
if (excluded.length) notes.push(`excluded: ${out.length ? out.map((c) => c.hex).join(", ") : "nothing was near those colours"}`);
const counted = clusters.filter((c) => c.share >= 2 && c.L <= 0.97 && !out.includes(c));
const kept = counted.filter((c) => c.L >= 0.12);
const dropped = clusters.length - out.length - kept.length;
if (dropped) notes.push(`${dropped} of ${clusters.length} colours dropped as noise, highlights or black shadow`);
const backdrop = kept.filter((c) => c.background);
if (backdrop.length) notes.push(`background, never the signature or accent: ${backdrop.map((c) => c.hex).join(", ")}`);
if (!kept.length) fail("every colour was noise: try other pictures");
const subject = kept.filter((c) => !c.background);
// Colours found in two or more pictures first, each group heaviest first.
const preferred = (list) => [...list.filter((c) => c.pictures >= 2), ...list.filter((c) => c.pictures < 2)];

const from = (c) => ({ hex: c.hex, share: r2(c.share), pictures: c.pictures, edge: r2(c.edge), ...(c.background ? { background: true } : {}) });
const colour = (role, lch, source, tuned) => ({ role, hex: hexOf(lch), ...fit(lch), from: source ? from(source) : null, tuned });

let signature = preferred(subject).find((c) => c.C >= 0.05);
if (!signature) {
  signature = preferred(subject)[0] || kept[0];
  notes.push(subject.length ? "no subject colour has much chroma: the signature is the heaviest, grey as it is" : "every colour looks like background: the signature is the heaviest of them");
}
// A ground keeps its source's hue. A near-grey source (chroma under 0.02: a wall, a table) has no
// hue worth keeping, so it takes the signature's, and the ground reads as the subject's off-white.
// A background colour seeds a ground only when no subject colour can.
function ground(test, list, L, maxC, word) {
  const source = preferred(list.filter((c) => !c.background)).find(test) || (subject.length ? null : list.find(test));
  const own = source && source.C >= 0.02;
  const h = own ? source.h : signature.h;
  const C = own ? Math.min(source.C, maxC) : Math.min(signature.C, maxC, 0.015);
  const said = source ? `${word}${source.background ? " from a background colour" : ""}, ${own ? "its hue kept" : "the signature's hue added"}${own && source.C > maxC ? ", chroma lowered" : ""}` : `the signature's hue ${word}`;
  return colour("ground", { L, C, h }, source || signature, said);
}
const light = ground((c) => c.L >= 0.82, kept, 0.96, 0.02, "made an off-white");
const dark = ground((c) => c.L <= 0.35, counted, 0.17, 0.03, "made a near-black");

// Ink in the other ground's hue, moved darker (on light) or lighter (on dark) until it reads 4.5:1.
function ink(on, hueOf, startL, step) {
  const C = Math.min(hueOf.C, step < 0 ? 0.03 : 0.02);
  let L = startL;
  while (contrast(hexOf({ L, C, h: hueOf.h }), on.hex) < 4.5 && L > 0 && L < 1) L = Math.min(1, Math.max(0, L + step));
  const moved = Math.abs(L - startL) > 0.001;
  return colour("ink", { L, C, h: hueOf.h }, null, `the ${step < 0 ? "dark" : "light"} ground's hue at L ${r2(L)}${moved ? `, ${step < 0 ? "darkened" : "lightened"} to read 4.5:1` : ""}`);
}
const darkInk = (on) => ink(on, dark, 0.2, -0.01);
const lightInk = (on) => ink(on, light, 0.95, 0.01);

// The accent: colourful, heavy, a hue apart from the ground, never background; chroma raised, 3:1 on the ground.
function accent(on, label) {
  const score = (c) => c.C * Math.sqrt(c.share);
  const fits = subject.filter((c) => c.C >= 0.08 && hueGap(c.h, on.h) >= 25);
  const pick = [...fits.filter((c) => c.pictures >= 2).sort((a, b) => score(b) - score(a)), ...fits.filter((c) => c.pictures < 2).sort((a, b) => score(b) - score(a))][0];
  const source = pick || signature;
  const C = Math.max(source.C, 0.13);
  const start = Math.min(0.72, Math.max(0.55, source.L));
  const ok = (L) => contrast(hexOf({ L, C, h: source.h }), on.hex) >= 3;
  let L = null;
  for (let d = 0; d <= 0.17 + 1e-9 && L === null; d += 0.005) for (const x of [start - d, start + d]) if (L === null && x >= 0.55 - 1e-9 && x <= 0.72 + 1e-9 && ok(x)) L = x;
  if (L === null) {
    notes.push(`${label}: no accent reaches 3:1 on this ground at lightness 0.55 to 0.72, so it has none`);
    return null;
  }
  const how = [];
  if (!pick) how.push("the signature (no subject colour stands off the ground's hue)");
  if (C > source.C + 0.001) how.push("chroma raised to read as an accent");
  if (Math.abs(L - start) > 0.001) how.push(`${L > start ? "lightened" : "darkened"} to reach 3:1 on the ground`);
  else if (Math.abs(L - source.L) > 0.01) how.push(`${L > source.L ? "lightened" : "darkened"} into the accent range`);
  const made = colour("accent", { L, C, h: source.h }, source, how.join(", ") || "as found");
  // An accent of the ground's own hue makes a one-hue palette: fine to offer, but not a second colour.
  made.ownHue = !pick;
  return made;
}

const proposal = (name, g, i) => {
  const a = accent(g, name);
  const rows = [g, i, ...(a ? [a] : [])];
  for (const r of rows) if (r.role !== "ground") r.contrast = r2(contrast(r.hex, g.hex));
  return { name, ground: g.hex, ink: i.hex, accent: a?.hex || null, ownHue: a ? a.ownHue : null, colours: rows };
};
const proposals = [proposal("light", light, darkInk(light)), proposal("dark", dark, lightInk(dark))];

// The signature itself as a ground, at a lightness where one of the inks reads.
{
  const own = Math.min(0.62, Math.max(0.5, signature.L));
  let best = null;
  for (let d = 0; d <= 0.12 + 1e-9 && !best; d += 0.005) {
    for (const L of [own - d, own + d]) {
      if (best || L < 0.5 - 1e-9 || L > 0.62 + 1e-9) continue;
      const g = colour("ground", { L, C: signature.C, h: signature.h }, signature, "");
      const inks = [darkInk(light), lightInk(dark)].filter((i) => contrast(i.hex, g.hex) >= 4.5);
      if (inks.length) best = { g, i: inks.sort((x, y) => contrast(y.hex, g.hex) - contrast(x.hex, g.hex))[0], L };
    }
  }
  if (!best) notes.push("signature: neither ink reaches 4.5:1 on the signature at lightness 0.5 to 0.62, so there is no signature ground");
  else {
    const { g, i, L } = best;
    g.tuned = Math.abs(L - signature.L) <= 0.01 ? "as found" : `${L > signature.L ? "lightened" : "darkened"} to carry ${i.L > 0.5 ? "light" : "dark"} text`;
    i.tuned = `the ${i.L > 0.5 ? "dark" : "light"} proposal's ink`;
    proposals.push(proposal("signature", g, i));
  }
}

// One or two grounds and an accent for the library: the light one, and the signature (else the dark).
const second = proposals.find((p) => p.name === "signature") || proposals.find((p) => p.name === "dark");
const grounds = [proposals[0], second].map((p) => ({ id: `subject-${p.name}`, ground: p.ground, panel: null, ink: p.ink, gradient: null, pattern: null, from: ["subject"] }));
// The library takes an accent only when the subject has a second hue of its own. One that is the
// signature with more chroma would make every subject screen one hue: then accents come from the
// references, and the one-hue palettes stay in the proposals for design-identity to offer.
const acc = proposals.find((p) => p.accent && !p.ownHue);
if (!acc && proposals.some((p) => p.accent)) notes.push("no second hue in the subject: the library takes no subject accent, so accents come from the references; the one-hue palettes are still proposed");
const library = { grounds, accents: acc ? [{ id: "subject-accent", colour: acc.accent, device: "the subject's own colour", from: ["subject"] }] : [] };

if (sheetArg) writeSheet(sheetArg);
if (json) {
  const clean = (c) => ({ role: c.role, hex: c.hex, L: r3(c.L), C: r3(c.C), h: Math.round(c.h), from: c.from, tuned: c.tuned, ...(c.contrast ? { contrast: c.contrast } : {}) });
  const listed = kept.map((c) => ({ ...from(c), L: r3(c.L), C: r3(c.C), h: Math.round(c.h), background: c.background }));
  console.log(JSON.stringify({ signature: from(signature), colours: listed, proposals: proposals.map((p) => ({ ...p, colours: p.colours.map(clean) })), library, notes }, null, 1));
} else {
  const source = (f) => (f ? `${f.hex} ${f.share}%, ${f.pictures} of ${pictures.length}${f.background ? ", background" : ""}` : "");
  const rows = [["proposal", "role", "colour", "from (share, pictures)", "how", "contrast"]];
  for (const p of proposals) for (const c of p.colours) rows.push([p.name, c.role, c.hex, source(c.from), c.tuned, c.contrast ? `${c.contrast}:1` : ""]);
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  console.log(`signature: ${signature.hex} (${r2(signature.share)}% of the pictures, in ${signature.pictures} of ${pictures.length})`);
  for (const r of rows) console.log(r.map((v, i) => v.padEnd(widths[i])).join("  ").trimEnd());
  for (const n of notes) console.log(`note: ${n}`);
  if (sheetArg) console.log(`sheet: ${sheetArg}`);
}

// The sheet: each colour, and where its source lives in every picture, worked out in the page.
function writeSheet(path) {
  const pics = pictures.map((p) => {
    const at = [resolve(p.target), resolve(base, p.target)].find((x) => existsSync(x)) || resolve(p.target);
    const type = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" }[extname(at).toLowerCase()];
    const url = existsSync(at) && type ? `data:${type};base64,${readFileSync(at).toString("base64")}` : pathToFileURL(at).href;
    return { name: at.split(/[\\/]/).pop(), url };
  });
  const data = { pictures: pics, proposals: proposals.map((p) => ({ name: p.name, colours: p.colours.map((c) => ({ role: c.role, hex: c.hex, from: c.from, tuned: c.tuned, contrast: c.contrast || null })) })), notes, signature: from(signature) };
  const esc = (s) => JSON.stringify(s).replace(/</g, "\\u003c");
  writeFileSync(
    path,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subject colours</title>
<style>
:root { --bg: #f6f5f2; --fg: #1d1c1a; --soft: #6b6862; --line: #dcd9d2; }
body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 32px 0 8px; text-transform: capitalize; }
.note { color: var(--soft); margin: 2px 0; }
.row { display: grid; grid-template-columns: 220px 1fr; gap: 16px; padding: 12px 0; border-top: 1px solid var(--line); align-items: start; }
.chip { height: 120px; border-radius: 6px; border: 1px solid var(--line); display: flex; align-items: end; padding: 8px; box-sizing: border-box; font-weight: 600; }
.meta { margin-top: 6px; } .meta span { display: block; color: var(--soft); }
.from { display: inline-block; width: 12px; height: 12px; border-radius: 2px; vertical-align: -2px; border: 1px solid var(--line); }
.pics { display: flex; flex-wrap: wrap; gap: 8px; } canvas { height: 150px; width: auto; border-radius: 4px; background: #000; }
@media (max-width: 600px) { .row { grid-template-columns: 1fr; } canvas { height: 100px; } }
</style></head><body>
<h1>Subject colours</h1>
<p class="note">Lit: the pixels near each colour's source (OKLab distance under 0.08). Dimmed: the rest. A source lit mostly outside the subject is background: run again with --exclude.</p>
<div id="notes"></div><div id="out"></div>
<script>
const DATA = ${esc(data)};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const LIN = Array.from({ length: 256 }, (_, i) => lin(i / 255));
function lab(r, g, b) {
  r = LIN[r]; g = LIN[g]; b = LIN[b];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const hexLab = (h) => lab(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
for (const n of DATA.notes) document.getElementById("notes").append(el("p", { className: "note", textContent: "Note: " + n }));
const images = DATA.pictures.map((p) => new Promise((done) => { const img = new Image(); img.onload = () => done(img); img.onerror = () => done(null); img.src = p.url; }));
Promise.all(images).then((imgs) => {
  const pixels = imgs.map((img) => {
    if (!img) return null;
    const k = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d");
    c.drawImage(img, 0, 0, w, h);
    try { const d = c.getImageData(0, 0, w, h); const L = new Float32Array(w * h * 3); for (let i = 0, j = 0; i < d.data.length; i += 4, j += 3) L.set(lab(d.data[i], d.data[i + 1], d.data[i + 2]), j); return { w, h, d, L }; }
    catch { return { w, h, img, blocked: true }; }
  });
  const out = document.getElementById("out");
  for (const p of DATA.proposals) {
    out.append(el("h2", { textContent: p.name }));
    const ground = p.colours.find((c) => c.role === "ground");
    for (const c of p.colours) {
      const chip = el("div", { className: "chip", textContent: c.role + " " + c.hex });
      chip.style.background = c.hex;
      chip.style.color = c.role === "ground" ? p.colours.find((x) => x.role === "ink").hex : ground.hex;
      const f = c.from;
      const fromLine = f ? el("span", {}, el("i", { className: "from", style: "background:" + f.hex }), " from " + f.hex + ", " + f.share + "% in " + f.pictures + " of " + DATA.pictures.length + (f.background ? ", background" : "") + ", edge " + f.edge) : el("span", { textContent: "derived, no source colour" });
      const meta = el("div", { className: "meta" }, fromLine, el("span", { textContent: c.tuned + (c.contrast ? " · " + c.contrast + ":1" : "") }));
      const pics = el("div", { className: "pics" });
      if (f) {
        const target = hexLab(f.hex);
        pixels.forEach((px, n) => {
          if (!px) { pics.append(el("span", { className: "note", textContent: DATA.pictures[n].name + ": not found" })); return; }
          const cv = el("canvas", { width: px.w, height: px.h, title: DATA.pictures[n].name });
          const ctx = cv.getContext("2d");
          if (px.blocked) { ctx.drawImage(px.img, 0, 0, px.w, px.h); pics.append(cv, el("span", { className: "note", textContent: "the browser will not let this page read the picture's pixels" })); return; }
          const o = new ImageData(new Uint8ClampedArray(px.d.data), px.w, px.h);
          for (let i = 0, j = 0; i < o.data.length; i += 4, j += 3) {
            const dist = Math.hypot(px.L[j] - target[0], px.L[j + 1] - target[1], px.L[j + 2] - target[2]);
            if (dist >= 0.08) { const g = 0.3 * o.data[i] + 0.59 * o.data[i + 1] + 0.11 * o.data[i + 2]; o.data[i] = o.data[i + 1] = o.data[i + 2] = 20 + g * 0.18; }
          }
          ctx.putImageData(o, 0, 0);
          pics.append(cv);
        });
      }
      out.append(el("div", { className: "row" }, el("div", {}, chip, meta), pics));
    }
  }
  document.body.dataset.ready = "1";
});
</script></body></html>
`,
  );
}
