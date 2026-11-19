#!/usr/bin/env node
// The library's numbers, copied from the profiles, so the agent only writes
// what needs an eye. Everything measure.mjs read (the family's ranges, each
// reference's ground, ink, gradient and pattern, its largest type with face,
// size, weight, case and tracking, its body text, its loud colours) is filled
// in. What needs words is left as "WRITE: …": each arrangement and
// navigation, the type's kind, an accent's device, how the family treats
// pictures, edges and density, and every id. No dependencies.
//
//   node library.mjs design-exploration/<slug>/profiles.json --anchor kiln --donors dust,orbit,loop --out design-exploration/<slug>/library.json
//     Write the prefilled library. It refuses to overwrite one.
//   node library.mjs design-exploration/<slug>/library.json --check
//     List every WRITE: still in it, and entries with no id or no from. deal.mjs
//     refuses a library that still has one.
//
// One entry a reference in every list: merge twins by hand afterwards (one
// entry, both in from). A reference with only a picture gets the picture's
// ground and colours, and its type marked by: eye with the face left to write.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : args.splice(i, 2)[1] ?? "";
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const fail = (message, code = 1) => {
  console.error(`library: ${message}`);
  process.exit(code);
};
const anchor = flag("anchor");
const donors = flag("donors").split(",").map((x) => x.trim()).filter(Boolean);
const outArg = flag("out");
const check = has("check");
const [input] = args;
const usage = "usage: node library.mjs profiles.json --anchor <name> --donors a,b,c --out library.json   |   node library.mjs library.json --check";
if (!input || (!check && (!anchor || !outArg))) fail(usage, 2);
if (!existsSync(input)) fail(`nothing at ${input}`);

// Every WRITE: left, and every entry missing an id or its references.
function unwritten(lib) {
  const left = [];
  const walk = (v, path) => {
    if (typeof v === "string" && v.startsWith("WRITE:")) left.push(`${path}: ${v.slice(6).trim()}`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(lib, "");
  for (const list of ["arrangements", "navigation", "type", "grounds", "accents"])
    for (const [i, e] of (lib[list] || []).entries()) if (!e.id || !Array.isArray(e.from) || !e.from.length) left.push(`${list}[${i}]: needs an id and from`);
  return left;
}

if (check) {
  const left = unwritten(JSON.parse(readFileSync(input, "utf8")));
  if (!left.length) {
    console.log("library: every field is written");
    process.exit(0);
  }
  console.log(`library: ${left.length} to write\n${left.join("\n")}`);
  process.exit(1);
}

if (existsSync(outArg)) fail(`${outArg} exists: write it elsewhere, or remove it first`);
const refs = JSON.parse(readFileSync(input, "utf8")).refs || {};
const names = [anchor, ...donors.filter((d) => d !== anchor)];
const missing = names.filter((n) => !refs[n]);
if (missing.length) fail(`no profile for ${missing.join(", ")}: the names are the card names in profiles.json`);

const hex = (c) => {
  if (!c) return null;
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  const m = String(c).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if (!m || (m[4] !== undefined && Number(m[4]) === 0)) return null;
  return `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("")}`;
};
const num = (v) => (v === null || v === undefined || v === "" ? null : parseFloat(v));
const range = (values, unit = "") => {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return undefined;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const r = (x) => Math.round(x * 10) / 10;
  return lo === hi ? `${r(lo)}${unit}` : `${r(lo)}–${r(hi)}${unit}`;
};
const shared = (values) => {
  const v = values.filter((x) => x !== null && x !== undefined && x !== "");
  return v.length && v.length === values.length && new Set(v).size === 1 ? v[0] : undefined;
};

const profiles = names.map((name) => ({ name, p: refs[name], page: refs[name].page && !refs[name].page.flag ? refs[name].page : null }));
const imageTraits = ({ p }) => p.image?.traits || {};
const pageTraits = ({ page }) => page?.traits || {};

const family = {
  tone: shared(profiles.map((x) => imageTraits(x).tone)),
  empty: range(profiles.map((x) => num(imageTraits(x).empty)), "%"),
  loud: range(profiles.map((x) => num(imageTraits(x).loud)), "%"),
  scale: range(profiles.map((x) => num(pageTraits(x).scale))),
  pictures: range(profiles.map((x) => num(pageTraits(x).pictures)), "%"),
  margin: range(profiles.map((x) => num(pageTraits(x).margin)), "%"),
  radius: shared(profiles.filter((x) => x.page).map((x) => pageTraits(x).radius)),
  images: "WRITE: how pictures are treated: crop, bleed, colour, grain",
  edges: "WRITE: rules, borders, or none",
  density: "WRITE: one sentence, how much sits on the first screen",
  from: names,
};
for (const k of Object.keys(family)) if (family[k] === undefined) delete family[k];

const lib = {
  anchor,
  family,
  arrangements: profiles.map(({ name }) => ({ id: "WRITE: a short plain word", what: "WRITE: one sentence: where the title, pictures and small text sit, and how they relate", from: [name] })),
  navigation: profiles.map(({ name }) => ({ id: "WRITE: a short plain word", what: "WRITE: one sentence: where the name and links sit, how many, what rides with them", from: [name] })),
  type: profiles.map(({ name, page }) => {
    const texts = page?.texts || [];
    const top = texts[0];
    const bodySize = page?.traits?.body;
    const body = bodySize && texts.find((t) => t.size === bodySize);
    if (!top)
      return { id: "WRITE: a short plain word", what: "WRITE: the kind of face, in plain words", face: "WRITE: the nearest face the product can use (fonts.mjs)", by: "eye", weight: "WRITE: as seen", case: "none", size: null, from: [name] };
    const entry = {
      id: "WRITE: a short plain word",
      what: "WRITE: the kind of face, in plain words",
      face: top.face,
      by: "page",
      weight: Number(top.weight) || top.weight,
      case: top.case || "none",
      tracking: top.tracking === "normal" ? "0" : top.tracking,
      size: top.size,
      from: [name],
    };
    if (top.style === "italic") entry.italic = true;
    if (bodySize) entry.body = { face: body?.face || "WRITE: the face its running text uses", size: bodySize, leading: body && body.leading !== "normal" ? body.leading : "WRITE: as seen" };
    return entry;
  }),
  grounds: profiles.map(({ name, p, page }) => {
    const top = page?.texts?.[0];
    const ink = hex(top?.colour) || (p.image?.common || []).map((c) => c.colour).find((c) => c && c !== p.image?.traits?.ground) || "WRITE: the ink colour";
    return {
      id: "WRITE: a short plain word",
      ground: hex(page?.ground) || p.image?.traits?.ground || "WRITE: the ground colour",
      panel: null,
      ink,
      gradient: page?.gradients?.[0]?.css || null,
      pattern: page?.patterns?.[0]?.css || null,
      from: [name],
    };
  }),
  accents: profiles.map(({ name, p }) => {
    const loud = p.image?.loud?.[0];
    return loud ? { id: "WRITE: a short plain word", colour: loud.colour, device: "WRITE: what carries it: a shape, the letters, a panel", from: [name] } : { id: "none", colour: null, device: "none", from: [name] };
  }),
};
writeFileSync(outArg, `${JSON.stringify(lib, null, 1)}\n`);
const left = unwritten(lib);
const byEye = profiles.filter((x) => !x.page).map((x) => x.name);
console.log(`library: ${outArg} from ${anchor} and ${names.length - 1} donors; ${left.length} fields to write${byEye.length ? `; picture only, type by eye: ${byEye.join(", ")}` : ""}`);
console.log("Write them with the references open, merge twins (one entry, both in from), then: node library.mjs <library.json> --check");
