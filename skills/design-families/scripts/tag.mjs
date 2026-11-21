#!/usr/bin/env node
// The agent's eye, written down in one fixed vocabulary of two layers, so what
// numbers cannot see (a photograph, a 3D render, chrome lettering) counts when
// families are sorted, and a brief can pick references by what they are for.
// Tags live in profiles.json beside the measurements. No dependencies.
//
//   node tag.mjs .longbeard/design/<step>/profiles.json --sheets <scratch>/tag
//     Contact sheets of the references not yet tagged, 16 a sheet, 4 across, and
//     both layers' words. Open each sheet, write one row per reference into a TSV.
//   node tag.mjs .longbeard/design/<step>/profiles.json tags.tsv
//     Check every word against its field and merge the rows into the profiles.
//
// Two layers. The look (VOCABULARY: picture, photo, type, weight, layout,
// colour, surface, scale, motion) is how a reference looks, and families.mjs
// sorts on it; it is stored in profile.tags. The about layer (ABOUT: format,
// domain, mood, hue, density, subject) is what a reference is and is for, and
// what the picture shows: it is stored in profile.about and checked like the
// look, but never sorted on.
//
// A row, as before: name<TAB>picture<TAB>photo<TAB>type<TAB>weight<TAB>layout<TAB>colour<TAB>surface<TAB>scale[<TAB>note]
// Or a header row first, naming its columns in any order, so motion and the
// about fields can be given: name<TAB>picture<TAB>…<TAB>scale<TAB>motion<TAB>format<TAB>domain<TAB>note
// The eight look fields above are required; motion, the about fields and the
// note are optional, and an empty cell means not given. A header without a
// note column still takes one extra cell at the end of a row as the note.
// Two values in one field are joined with +, the main one first: photo+lettering.
// The note is a few words of what is seen ("chrome 3D wordmark, pixel fill"):
// it is not sorted on, but it names families and reads into the library.
//
// A tag line: both layers as one flat line of words, the way people keep a
// reference's tags by hand, easy to edit and to search:
//   photo serif weight:bold split muted grain large kinetic · web-hero fashion calm red airy portrait
// parseTagLine and formatTagLine read and write it, so every tool reads a line
// the same way. Words split on whitespace and ·. A word belongs to its field
// when it is in exactly one field across both layers; a word in two or more
// (none, ui, collage, mono, duotone, bold, editorial today: AMBIGUOUS) is
// written field:word, as type:mono or mood:editorial, and bare it is refused.
// Two words for one field are both written, the main one first. none is left
// out of a line, and a line without picture, photo or motion reads them as none.
// A header may name one more column, line, holding a tag line for the fields
// the cells leave empty; the eight look fields are then required from the two
// together, and an unknown or ambiguous word in it refuses the merge.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VOCABULARY = {
  picture: {
    photo: "a photograph",
    illustration: "drawn or painted scenes, characters, objects",
    render: "3D: rendered objects, glass, clay, blobs",
    lettering: "the type itself is the picture",
    ui: "screens of a product, a device mock-up",
    product: "an object cut out on the ground, packshot",
    pattern: "a repeat: grid, dots, lines, tiles",
    icon: "small symbols: icons, logos, emoji, pictograms",
    shape: "solid flat shapes or colour blocks, no drawing in them",
    collage: "cut-outs, stickers, layered scraps",
    none: "no picture: type and ground only",
  },
  photo: { colour: "colour photographs", mono: "black and white", duotone: "one or two tints", none: "no photographs" },
  type: { serif: "serif", sans: "sans serif", mono: "monospaced", display: "a display face: wide, decorative, rounded", condensed: "narrow display", outline: "outlined letters", script: "handwriting or script", mixed: "two kinds, both prominent" },
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
  colour: { neutral: "black, white, greys", muted: "soft, dusty, low saturation", "one-accent": "neutral plus one loud colour", bright: "saturated grounds or shapes", multi: "many colours", pastel: "pale, soft tints", dark: "dark-mode grounds", duotone: "two colours only" },
  surface: { flat: "flat fills", grain: "grain, noise, paper", glossy: "shine, glass, reflections", "hand-drawn": "lines by hand", glow: "glows, soft gradients", chrome: "metal, chrome" },
  // How big the largest type is. A live page measures it; a picture alone (a Figma board, a folder) only has this.
  scale: { quiet: "the largest type is near the body size", heading: "a clear headline, well under a third of the width", large: "the headline dominates the screen", huge: "type fills the screen or runs off it" },
  // Optional: what moves, for a gif, a video or a live page. Not given on a still is not given, not none.
  motion: { none: "nothing moves", kinetic: "type or shapes moving", "blur-grain": "blur, grain, light leaks", ui: "interface transitions", repetition: "looping or repeated elements" },
};
// What a reference is and is for: stored in profile.about and checked, never sorted on.
const words = (list) => Object.fromEntries(list.split(" ").map((w) => [w, w.replace(/-/g, " ")]));
export const ABOUT = {
  format: words("web-hero web-page web-section app-screens dashboard poster editorial cover logo-mark packaging social-post brand-system type-specimen palette pattern-icons merch-stickers deck-slides print-collateral"),
  domain: words("portfolio fashion art-museum food-drink film tech-saas finance travel-outdoors education music-events beauty-wellness interiors-architecture sport-cycling agency-studio"),
  mood: words("cinematic nostalgic calm playful luxe raw editorial minimal tech bold"),
  hue: words("red orange lime yellow blue pink purple green teal brown-ochre"),
  density: { airy: "much room", balanced: "room and matter even", dense: "packed" },
  // What the picture shows.
  subject: words("portrait close-crop landscape still-life classical-art cutout type-only"),
};
// Every look field; the first eight are required in every row, and are the old row's columns in order.
export const FIELDS = Object.keys(VOCABULARY);
export const REQUIRED = FIELDS.filter((f) => f !== "motion");
const OPTIONAL = ["motion"];
const ABOUT_FIELDS = Object.keys(ABOUT);
const vocabOf = (field) => VOCABULARY[field] || ABOUT[field];

// Every word, and the fields across both layers that hold it.
const FIELDS_OF = new Map();
for (const [field, vocab] of [...Object.entries(VOCABULARY), ...Object.entries(ABOUT)])
  for (const word of Object.keys(vocab)) FIELDS_OF.set(word, [...(FIELDS_OF.get(word) || []), field]);
// The words a tag line must write as field:word.
export const AMBIGUOUS = [...FIELDS_OF].filter(([, fields]) => fields.length > 1).map(([word]) => word);
// A line that does not name these reads them as none.
const NONE_WHEN_MISSING = ["picture", "photo", "motion"];

// One flat line of words → { tags, about, unknown, ambiguous }. Nothing is dropped:
// a word that is not assigned is in unknown or ambiguous, as it was written.
export function parseTagLine(line) {
  const tags = {};
  const about = {};
  const unknown = [];
  const ambiguous = [];
  const add = (field, word) => {
    const layer = field in VOCABULARY ? tags : about;
    if (!(layer[field] ||= []).includes(word)) layer[field].push(word);
  };
  for (const token of String(line || "").toLowerCase().split(/[\s·]+/).filter(Boolean)) {
    const colon = token.indexOf(":");
    if (colon !== -1) {
      const [field, word] = [token.slice(0, colon), token.slice(colon + 1)];
      if (vocabOf(field) && Object.hasOwn(vocabOf(field), word)) add(field, word);
      else if (!unknown.includes(token)) unknown.push(token);
      continue;
    }
    const fields = FIELDS_OF.get(token) || [];
    if (fields.length === 1) add(fields[0], token);
    else if (fields.length > 1) ambiguous.includes(token) || ambiguous.push(token);
    else unknown.includes(token) || unknown.push(token);
  }
  for (const field of NONE_WHEN_MISSING) if (!tags[field]) tags[field] = ["none"];
  // In field order, as formatTagLine writes them.
  const ordered = (layer, order) => Object.fromEntries(order.filter((f) => layer[f]).map((f) => [f, layer[f]]));
  return { tags: ordered(tags, FIELDS), about: ordered(about, ABOUT_FIELDS), unknown, ambiguous };
}

// { tags, about } → the line: look fields in VOCABULARY order, " · ", about fields in
// ABOUT order. none is left out; a word in two fields gets its field: prefix.
export function formatTagLine({ tags = {}, about = {} } = {}) {
  const part = (layer, order) =>
    order
      .flatMap((field) =>
        (layer[field] || []).filter((word) => word !== "none").map((word) => {
          if (!Object.hasOwn(vocabOf(field), word)) throw new Error(`tag: ${field} "${word}" is not in the vocabulary: use ${Object.keys(vocabOf(field)).join(", ")}`);
          return AMBIGUOUS.includes(word) ? `${field}:${word}` : word;
        }),
      )
      .join(" ");
  return [part(tags, FIELDS), part(about, ABOUT_FIELDS)].filter(Boolean).join(" · ");
}

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
      const r = spawnSync(process.execPath, [sheet, list, "--out", join(sheetsArg, basename(list, ".tsv")), "--per", "16", "--cols", "4", "--contain"], { encoding: "utf8" });
      if (r.status !== 0) fail(r.stderr || "contact-sheet.mjs failed");
      process.stdout.write(r.stdout);
    }
    console.log(`\n${todo.length} to tag. A header row, then one row each: name\t${[...FIELDS, ...ABOUT_FIELDS].join("\t")}\tnote`);
    console.log(`Required: ${REQUIRED.join(", ")}. Optional, an empty cell when not seen: ${[...OPTIONAL, ...ABOUT_FIELDS].join(", ")}, note.`);
    console.log("\nThe look (sorted on):");
    for (const field of FIELDS) console.log(`${field}: ${Object.entries(VOCABULARY[field]).map(([w, what]) => `${w} (${what})`).join(", ")}`);
    console.log("\nWhat it is and is for (stored, never sorted on):");
    for (const field of ABOUT_FIELDS) console.log(`${field}: ${Object.keys(ABOUT[field]).join(", ")}`);
    console.log(`\nOr a line column, one tag line for both layers (look · about). Write ${AMBIGUOUS.join(", ")} as field:word; leave none out.`);
    return;
  }

  if (!existsSync(tagsArg)) fail(`no tags at ${tagsArg}`);
  const problems = [];
  let merged = 0;
  // Columns: the old row's order until a header row names them.
  let columns = null;
  for (const [n, line] of readFileSync(tagsArg, "utf8").split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const cells = line.split("\t").map((x) => x.trim());
    if (cells[0] === "name") {
      columns = cells.slice(1);
      const known = new Set([...FIELDS, ...ABOUT_FIELDS, "note", "line"]);
      const unknown = columns.filter((c) => !known.has(c));
      // With a line column, the look fields the header leaves out come from the line.
      const missing = columns.includes("line") ? [] : REQUIRED.filter((f) => !columns.includes(f));
      const twice = columns.filter((c, i) => columns.indexOf(c) !== i);
      if (unknown.length) problems.push(`line ${n + 1}: header names ${unknown.join(", ")}: use ${[...FIELDS, ...ABOUT_FIELDS].join(", ")}, note, line`);
      if (missing.length) problems.push(`line ${n + 1}: header has no ${missing.join(", ")}: every row needs ${REQUIRED.join(", ")}`);
      if (twice.length) problems.push(`line ${n + 1}: header names ${[...new Set(twice)].join(", ")} twice`);
      continue;
    }
    const [name, ...values] = cells;
    if (!refs[name]) {
      problems.push(`line ${n + 1}: no reference called ${name}`);
      continue;
    }
    let row;
    if (!columns) {
      if (values.length !== REQUIRED.length && values.length !== REQUIRED.length + 1) {
        problems.push(`line ${n + 1}: ${name} has ${values.length} fields, not ${REQUIRED.length} (${REQUIRED.join(", ")}) and an optional note; a header row can name motion and the about fields`);
        continue;
      }
      row = Object.fromEntries(REQUIRED.map((f, k) => [f, values[k]]));
      row.note = values[REQUIRED.length] || "";
    } else {
      // A header without a note column takes one extra cell as the note; cells left off the end are empty.
      const width = columns.length + (columns.includes("note") ? 0 : 1);
      if (values.length > width) {
        problems.push(`line ${n + 1}: ${name} has ${values.length} fields, the header names ${columns.length}`);
        continue;
      }
      row = Object.fromEntries(columns.map((c, k) => [c, values[k] || ""]));
      if (!columns.includes("note")) row.note = values[columns.length] || "";
    }
    if (row.line) {
      // The line fills the fields its cells leave empty, read as every tool reads one.
      const parsed = parseTagLine(row.line);
      if (parsed.unknown.length) problems.push(`line ${n + 1}: ${name} line: ${parsed.unknown.map((w) => `"${w}"`).join(", ")} in no field`);
      if (parsed.ambiguous.length) problems.push(`line ${n + 1}: ${name} line: ${parsed.ambiguous.map((w) => `"${w}" is in ${FIELDS_OF.get(w).join(", ")}: write ${FIELDS_OF.get(w).map((f) => `${f}:${w}`).join(" or ")}`).join("; ")}`);
      const tokens = row.line.toLowerCase().split(/[\s·]+/);
      for (const [field, given] of Object.entries({ ...parsed.tags, ...parsed.about })) {
        // A none the line only reads for a missing field gives way to a filled cell.
        const defaulted = given.join() === "none" && !tokens.includes(`${field}:none`);
        if (!row[field]) row[field] = given.join("+");
        else if (!defaulted) problems.push(`line ${n + 1}: ${name} ${field} is in its cell and in the line: give it once`);
      }
    }
    const read = (field) => {
      const given = (row[field] || "").split("+").map((w) => w.trim()).filter(Boolean);
      const bad = given.filter((w) => !(w in vocabOf(field)));
      if (bad.length || (!given.length && REQUIRED.includes(field))) problems.push(`line ${n + 1}: ${name} ${field} "${row[field] || ""}": use ${Object.keys(vocabOf(field)).join(", ")}`);
      return given;
    };
    const tags = {};
    for (const field of FIELDS) {
      const given = read(field);
      if (given.length) tags[field] = given;
    }
    const about = {};
    for (const field of ABOUT_FIELDS) {
      const given = read(field);
      if (given.length) about[field] = given;
    }
    // Merged over what was there: a field not given keeps its words.
    refs[name].tags = { ...(refs[name].tags || {}), ...tags };
    if (Object.keys(about).length) refs[name].about = { ...(refs[name].about || {}), ...about };
    if (row.note) refs[name].note = row.note;
    merged++;
  }
  if (problems.length) fail(`nothing merged:\n${problems.join("\n")}`);
  writeFileSync(profilesArg, `${JSON.stringify(store, null, 1)}\n`);
  const left = Object.values(refs).filter((p) => !p.tags).length;
  console.log(`tagged ${merged}, ${left} left untagged`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
