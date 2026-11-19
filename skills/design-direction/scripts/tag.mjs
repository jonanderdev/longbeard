#!/usr/bin/env node
// The agent's eye, written down in a fixed vocabulary, so what numbers cannot
// see (a photograph, a 3D render, chrome lettering) counts when families are
// sorted. Tags live in profiles.json beside the measurements. No dependencies.
//
//   node tag.mjs design-exploration/<slug>/profiles.json --sheets <scratch>/tag
//     Contact sheets of the references not yet tagged, 16 a sheet, 4 across, and
//     the vocabulary. Open each sheet, write one row per reference into a TSV.
//   node tag.mjs design-exploration/<slug>/profiles.json tags.tsv
//     Check every word against the vocabulary and merge the rows into the profiles.
//
// A row: name<TAB>picture<TAB>photo<TAB>type<TAB>weight<TAB>layout<TAB>colour<TAB>surface[<TAB>note]
// Two values in one field are joined with +, the main one first: photo+lettering.
// The note is optional, a few words of what is seen ("chrome 3D wordmark, pixel
// fill"): it is not sorted on, but it names families and reads into the library.
// A header row starting with "name" is skipped.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VOCABULARY = {
  picture: {
    photo: "a photograph",
    illustration: "drawn or painted, flat or textured",
    render: "3D: rendered objects, glass, clay, blobs",
    lettering: "the type itself is the picture",
    ui: "screens of a product, a device mock-up",
    product: "an object cut out on the ground, packshot",
    pattern: "a repeat: grid, dots, lines, tiles",
    collage: "cut-outs, stickers, layered scraps",
    none: "no picture: type and ground only",
  },
  photo: { colour: "colour photographs", mono: "black and white", duotone: "one or two tints", none: "no photographs" },
  type: { serif: "serif", sans: "sans serif", mono: "monospaced", display: "a display face: condensed, wide, decorative, rounded", script: "handwriting or script", mixed: "two kinds, both prominent" },
  weight: { thin: "thin or light", regular: "regular", bold: "bold", black: "black, heaviest" },
  layout: {
    centred: "one centred stack",
    left: "aligned left, ragged right",
    split: "two halves or columns",
    grid: "cards or tiles in a grid",
    "full-bleed": "one picture fills the screen",
    collage: "overlapping pieces at angles",
    scattered: "items floating apart",
    "edge-type": "type runs off the edges",
  },
  colour: { neutral: "black, white, greys", muted: "soft, dusty, low saturation", "one-accent": "neutral plus one loud colour", bright: "saturated grounds or shapes", multi: "many colours" },
  surface: { flat: "flat fills", grain: "grain, noise, paper", glossy: "shine, glass, reflections", "hand-drawn": "lines by hand", glow: "glows, soft gradients", chrome: "metal, chrome" },
};
export const FIELDS = Object.keys(VOCABULARY);

const fail = (text) => {
  console.error(`tag: ${text}`);
  process.exit(1);
};

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--sheets");
  const sheetsArg = at === -1 ? "" : (args.splice(at, 2)[1] ?? "");
  const [profilesArg, tagsArg] = args;
  if (!profilesArg || (!sheetsArg && !tagsArg) || (sheetsArg && tagsArg)) {
    console.error("usage: node tag.mjs profiles.json --sheets <dir>   |   node tag.mjs profiles.json tags.tsv");
    process.exit(2);
  }
  if (!existsSync(profilesArg)) fail(`no profiles at ${profilesArg}: make them with measure.mjs --profiles`);
  const store = JSON.parse(readFileSync(profilesArg, "utf8"));
  const refs = store.refs || {};

  if (sheetsArg) {
    const todo = Object.entries(refs).filter(([, p]) => !p.tags && p.shot && existsSync(p.shot));
    if (!todo.length) return console.log("every reference is tagged");
    mkdirSync(sheetsArg, { recursive: true });
    const lists = [];
    for (let i = 0; i < todo.length; i += 16) {
      const list = join(sheetsArg, `untagged-${String(i / 16 + 1).padStart(2, "0")}.tsv`);
      writeFileSync(list, `${todo.slice(i, i + 16).map(([name, p]) => `${name}\t${resolve(p.shot)}`).join("\n")}\n`);
      lists.push(list);
    }
    const sheet = join(dirname(fileURLToPath(import.meta.url)), "contact-sheet.mjs");
    for (const list of lists) {
      const r = spawnSync(process.execPath, [sheet, list, "--out", join(sheetsArg, list.replace(/^.*\/(untagged-\d+)\.tsv$/, "$1")), "--per", "16", "--cols", "4", "--contain"], { encoding: "utf8" });
      if (r.status !== 0) fail(r.stderr || "contact-sheet.mjs failed");
      process.stdout.write(r.stdout);
    }
    console.log(`\n${todo.length} to tag. One row each: name\t${FIELDS.join("\t")}\tnote (optional)`);
    for (const field of FIELDS) console.log(`${field}: ${Object.entries(VOCABULARY[field]).map(([w, what]) => `${w} (${what})`).join(", ")}`);
    return;
  }

  if (!existsSync(tagsArg)) fail(`no tags at ${tagsArg}`);
  const problems = [];
  let merged = 0;
  for (const [n, line] of readFileSync(tagsArg, "utf8").split(/\r?\n/).entries()) {
    if (!line.trim() || /^name\t/.test(line)) continue;
    const [name, ...values] = line.split("\t").map((x) => x.trim());
    if (!refs[name]) {
      problems.push(`line ${n + 1}: no reference called ${name}`);
      continue;
    }
    if (values.length !== FIELDS.length && values.length !== FIELDS.length + 1) {
      problems.push(`line ${n + 1}: ${name} has ${values.length} fields, not ${FIELDS.length} (${FIELDS.join(", ")}) and an optional note`);
      continue;
    }
    const note = values.length > FIELDS.length ? values[FIELDS.length] : "";
    const tags = {};
    for (const [k, field] of FIELDS.entries()) {
      const words = values[k].split("+").map((w) => w.trim()).filter(Boolean);
      const bad = words.filter((w) => !(w in VOCABULARY[field]));
      if (!words.length || bad.length) problems.push(`line ${n + 1}: ${name} ${field} "${values[k]}": use ${Object.keys(VOCABULARY[field]).join(", ")}`);
      tags[field] = words;
    }
    refs[name].tags = tags;
    if (note) refs[name].note = note;
    merged++;
  }
  if (problems.length) fail(`nothing merged:\n${problems.join("\n")}`);
  writeFileSync(profilesArg, `${JSON.stringify(store, null, 1)}\n`);
  const left = Object.values(refs).filter((p) => !p.tags).length;
  console.log(`tagged ${merged}, ${left} left untagged`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
