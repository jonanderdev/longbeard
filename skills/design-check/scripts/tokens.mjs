#!/usr/bin/env node
// Writes the token block at the top of DESIGN.md from the token tables below it, or checks that the two agree.
//
//   node tokens.mjs [DESIGN.md] [--name <product name>]    write or refresh the front matter
//   node tokens.mjs [DESIGN.md] --check                    exit 1 when the front matter and the tables disagree
//
// Exit 0: written, or agrees. Exit 1: --check found a disagreement or no front matter. Exit 2: could not read the tables.
//
// The tables are the source a person reads and edits; the front matter is a generated copy, so a tool that reads the
// published DESIGN.md format (https://github.com/google-labs-code/design.md, spec in docs/spec.md, version "alpha")
// can take the design without Long Beard. Nothing else in the file is touched: text after the closing --- is kept byte
// for byte, and front-matter keys this script does not make (description, components, omitted) are kept as they are.
// Anyone who wants to can check the result with that format's own linter: npx @google/design.md lint DESIGN.md.
// It is not required and nothing here depends on it.
//
// The names, both ways. A token in a table is group/name; the block uses the published format's group names.
//
//   table row            block key
//   color/ink            colors.ink                (colors.<theme>.ink when the table has a column per theme)
//   type/heading         typography.heading
//   space/md             spacing.md
//   radius/md            rounded.md
//   motion/enter         motion.enter
//
// Back: colors→color, typography→type, spacing→space, rounded→radius, motion→motion; the rest of the key is the
// token's name. A second slash in a name (color/accent/hover) becomes a hyphen in the block (colors.accent-hover).
//
// What each table holds. A table is found by its rows (a Token cell that starts with one of the groups above), not
// by its heading. Columns are found by their header, so extra columns and any order are fine.
//   Colour: Token, one column of values or one per theme (the header names the theme: Light, Dark), Use.
//           A blank or dash cell means the token does not exist in that theme.
//   Type:   Token, "Face, weight" (Fraunces, 600 or Fraunces, Semibold), "Size / line height" (48 / 1.1 or 18 / 28),
//           optional Tracking, Use. A bare size is px. A bare line height under 4 is a multiplier, 4 and over is px.
//           A bare tracking is em. Italic is not a field in the format, so it stays in the prose.
//   Space and radius: Token, Value (a bare number is px), Use.
//   Motion: Token, Duration (250ms; a bare number is ms), Easing, optional Delay, Use.
//
// primary. The format expects a colour named primary. Ours stay as they are, and the block gets one more key at the
// top level: primary, a reference to the colour this design leads with. That is color/primary if the table has one,
// else color/accent, else color/ink. With themes it points into the first theme's column.
//
// Name. Kept from the existing front matter; else --name; else the first heading of docs/brief.md; else the folder's name.
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const groupOf = { color: "colors", type: "typography", space: "spacing", radius: "rounded", motion: "motion" };
export const prefixOf = Object.fromEntries(Object.entries(groupOf).map(([a, b]) => [b, a]));
const generated = ["version", "name", "colors", "typography", "rounded", "spacing", "motion"];
const groupOrder = ["colors", "typography", "rounded", "spacing", "motion"];

// color/accent/hover -> { group: "colors", key: "accent-hover" }
export const blockKey = (token) => {
  const m = /^(color|type|space|radius|motion)\/([\w/-]+)$/.exec(token);
  return m ? { group: groupOf[m[1]], key: m[2].replace(/\//g, "-") } : null;
};
// colors.ink -> color/ink; colors.light.ink -> color/ink (in the light theme)
export const tokenName = (path) => {
  const [group, ...rest] = path.split(".");
  if (!prefixOf[group] || !rest.length) return null;
  return `${prefixOf[group]}/${rest[rest.length - 1]}`;
};

const weights = { thin: 100, hairline: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };

class Fail extends Error {}
const warnings = [];

const unwrap = (cell) => cell.trim().replace(/^`+|`+$/g, "").replace(/^\*+|\*+$/g, "").trim();
const blank = (cell) => /^(|-|—|–|n\/a)$/i.test(unwrap(cell));
const slug = (text) => unwrap(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function tables(text) {
  const out = [];
  let fence = false;
  let current = null;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence || !/^\s*\|/.test(line)) { current = null; continue; }
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (!current) { current = { header: cells, rows: [], sawRule: false }; out.push(current); continue; }
    if (!current.sawRule && cells.every((c) => /^:?-{2,}:?$/.test(c))) { current.sawRule = true; continue; }
    current.rows.push(cells);
  }
  return out.filter((t) => t.sawRule);
}

const colourValue = (v) => /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^(?:rgba?|hsla?|hwb|oklch|oklab|lch|lab|color-mix)\(.+\)$/i.test(v) || v.toLowerCase() === "transparent";

function dimension(value, bare, what) {
  const v = value.trim();
  if (/^-?\d*\.?\d+$/.test(v)) return `${v}${bare}`;
  if (/^-?\d*\.?\d+(px|em|rem)$/.test(v)) return v;
  warnings.push(`${what}: "${v}" is not px, em or rem; written as it stands`);
  return v;
}

function readTables(text) {
  const tokens = []; // { token, group, key, value } where value is a scalar, an object, or { theme: scalar }
  const seen = new Map();
  const themes = [];
  for (const t of tables(text)) {
    const head = t.header.map(unwrap);
    const col = (re) => head.findIndex((h, i) => i > 0 && re.test(h));
    const tokenCol = 0;
    const use = head.findIndex((h, i) => i > 0 && /^use$/i.test(h));
    const face = col(/face|font/i);
    const size = col(/size/i);
    const track = col(/track|letter/i);
    const dur = col(/duration|time/i);
    const ease = col(/eas|curve|timing/i);
    const delay = col(/delay/i);
    const others = head.map((h, i) => i).filter((i) => i > 0 && i !== use && ![face, size, track, dur, ease, delay].includes(i));
    // A colour table's value columns are the ones that hold a colour (a column of notes does not).
    const colourRows = t.rows.filter((r) => blockKey(unwrap(r[0] || ""))?.group === "colors");
    const valueCols = colourRows.length ? others.filter((i) => colourRows.some((r) => colourValue(unwrap(r[i] || "")))) : others;
    for (const row of t.rows) {
      const token = unwrap(row[tokenCol] || "");
      const bk = blockKey(token);
      if (!bk) continue;
      const at = `${token}`;
      if (seen.has(`${bk.group}.${bk.key}`)) throw new Fail(`${at} is in the tables twice (or collides with ${seen.get(`${bk.group}.${bk.key}`)} once its slashes are hyphens)`);
      seen.set(`${bk.group}.${bk.key}`, token);
      let value;
      if (bk.group === "colors") {
        const cols = valueCols.filter((i) => i < row.length);
        const named = cols.length > 1;
        const got = {};
        for (const i of cols) {
          if (blank(row[i] || "")) continue;
          const v = unwrap(row[i]);
          if (!colourValue(v)) throw new Fail(`${at}: "${v}" is not a colour (a hex, or a css colour function)`);
          const theme = named ? slug(head[i]) : "";
          if (named && !themes.includes(theme)) themes.push(theme);
          got[theme] = v;
        }
        if (!Object.keys(got).length) throw new Fail(`${at} has no colour in any column`);
        value = got;
      } else if (bk.group === "typography") {
        if (face < 0) throw new Fail(`${at}: the type table needs a "Face, weight" column`);
        const cell = unwrap(row[face] || "");
        const m = /^(.*?)[,\s]+((?:\d{3}|[A-Za-z-]+)(?:\s+italic)?)$/i.exec(cell);
        let family = cell, weight;
        if (m) {
          const w = m[2].replace(/\s+italic$/i, "").toLowerCase().replace(/-/g, "");
          if (/^\d{3}$/.test(w)) { family = m[1]; weight = Number(w); }
          else if (weights[w]) { family = m[1]; weight = weights[w]; }
        }
        family = family.replace(/^["']|["']$/g, "").trim();
        if (!family) throw new Fail(`${at}: no face`);
        value = { fontFamily: family };
        const [sz, lh] = size >= 0 ? unwrap(row[size] || "").split("/").map((s) => s.trim()) : [];
        if (sz) value.fontSize = dimension(sz, "px", `${at} size`);
        if (weight) value.fontWeight = weight;
        if (lh) value.lineHeight = /^\d*\.?\d+$/.test(lh) ? (Number(lh) >= 4 ? `${lh}px` : Number(lh)) : dimension(lh, "px", `${at} line height`);
        const tr = track >= 0 ? unwrap(row[track] || "") : "";
        if (tr && !blank(tr)) value.letterSpacing = dimension(tr, "em", `${at} tracking`);
        if (!value.fontSize) throw new Fail(`${at}: no size (the "Size / line height" column is empty)`);
      } else if (bk.group === "motion") {
        const d = dur >= 0 ? unwrap(row[dur] || "") : "";
        if (!d) throw new Fail(`${at}: the motion table needs a Duration column`);
        const ms = (s) => (/^\d*\.?\d+$/.test(s) ? `${s}ms` : /^(\d*\.?\d+)s$/.test(s) ? `${Math.round(parseFloat(s) * 1000)}ms` : s);
        value = { duration: ms(d) };
        if (delay >= 0 && !blank(row[delay] || "")) value.delay = ms(unwrap(row[delay]));
        if (ease >= 0 && !blank(row[ease] || "")) value.timingFunction = unwrap(row[ease]);
      } else {
        const i = valueCols[0];
        const v = i === undefined ? "" : unwrap(row[i] || "");
        if (!v) throw new Fail(`${at} has no value`);
        value = dimension(v, "px", at);
      }
      tokens.push({ token, ...bk, value });
    }
  }
  return { tokens, themes };
}

// The tokens as a flat list of [dotted path, scalar], in file order, and the same as YAML lines.
export function build(text) {
  const { tokens, themes } = readTables(text);
  if (!tokens.length) throw new Fail("no token table found: expected rows such as color/ink, type/body, space/md");
  const flat = [];
  const tree = {};
  const put = (path, value) => {
    flat.push([path.join("."), value]);
    let o = tree;
    for (const k of path.slice(0, -1)) o = o[k] ||= {};
    o[path[path.length - 1]] = value;
  };
  const colours = tokens.filter((t) => t.group === "colors");
  if (colours.length) {
    const names = new Set(colours.map((t) => t.key));
    const lead = ["primary", "accent", "ink"].find((n) => names.has(n));
    const first = themes[0] || "";
    if (!lead) warnings.push("no color/primary, color/accent or color/ink: the block has no primary");
    else if (!(lead === "primary" && !themes.length)) {
      if (colours.find((t) => t.key === lead).value[first] === undefined) throw new Fail(`color/${lead} has no value in the ${first} column, so primary cannot point at it`);
      put(["colors", "primary"], `{colors.${first ? `${first}.` : ""}${lead}}`);
    }
    for (const t of colours) {
      for (const [theme, v] of Object.entries(t.value)) put(theme ? ["colors", theme, t.key] : ["colors", t.key], v);
    }
  }
  for (const g of groupOrder.slice(1)) {
    for (const t of tokens.filter((x) => x.group === g)) {
      if (typeof t.value === "object") for (const [k, v] of Object.entries(t.value)) put([g, t.key, k], v);
      else put([g, t.key], t.value);
    }
  }
  return { tree, flat, count: tokens.length };
}

const plain = /^-?[A-Za-z0-9_./()%][^:#]*$/;
export const scalar = (v) => {
  if (typeof v === "number") return String(v);
  const s = String(v);
  return plain.test(s) && !/^(true|false|null|yes|no|on|off|~)$/i.test(s) && !/\s$/.test(s) && !/^\d+$/.test(s) ? s : JSON.stringify(s);
};
const key = (k) => (/^[A-Za-z_][\w-]*$/.test(k) ? k : JSON.stringify(k));

export function emit(tree, indent = 1) {
  const pad = "  ".repeat(indent);
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === "object" ? [`${pad}${key(k)}:`, ...emit(v, indent + 1)] : [`${pad}${key(k)}: ${scalar(v)}`]));
}

// The front matter a file has now: its text, its top-level blocks, and where the body starts.
export function split(text) {
  const m = /^---[ \t]*\r?\n([\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { front: null, body: text, blocks: [] };
  const lines = (m[1] || "").split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  const blocks = [];
  for (const line of lines) {
    const k = /^([A-Za-z_][\w-]*):/.exec(line);
    if (k || !blocks.length) blocks.push({ key: k ? k[1] : null, lines: [line] });
    else blocks[blocks.length - 1].lines.push(line);
  }
  return { front: m[0], body: text.slice(m[0].length), blocks };
}

const unquote = (s) => { s = s.trim(); return /^(".*"|'.*')$/.test(s) ? (s[0] === '"' ? safeJson(s) : s.slice(1, -1)) : s.replace(/\s+#.*$/, ""); };
const safeJson = (s) => { try { return JSON.parse(s); } catch { return s.slice(1, -1); } };

// A flat path -> text map of the generated groups in a front matter's blocks.
export function flatten(blocks) {
  const out = new Map();
  for (const b of blocks) {
    if (!groupOrder.includes(b.key)) continue;
    const stack = [];
    for (const line of b.lines) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const m = /^(\s*)("[^"]*"|'[^']*'|[^\s:][^:]*?)\s*:\s*(.*)$/.exec(line);
      if (!m) continue;
      const depth = m[1].length / 2;
      stack.length = depth;
      stack[depth] = unquote(m[2]);
      if (m[3].trim()) out.set(stack.slice(0, depth + 1).join("."), String(unquote(m[3])));
    }
  }
  return out;
}

export function nameOf(blocks, file, given) {
  const existing = blocks.find((b) => b.key === "name")?.lines[0].replace(/^name:\s*/, "");
  if (existing && unquote(existing)) return unquote(existing);
  if (given) return given;
  const brief = resolve(dirname(file), "docs/brief.md");
  const h = existsSync(brief) && /^#\s+(.+)$/m.exec(readFileSync(brief, "utf8"));
  if (h) return h[1].trim();
  return basename(dirname(resolve(file)));
}

// The whole file as it should be, and what the tables hold.
export function render(text, file, given) {
  const { front, body, blocks } = split(text);
  const { tree, flat, count } = build(text);
  const lines = ["version: alpha", `name: ${scalar(nameOf(blocks, file, given))}`];
  const keep = blocks.filter((b) => b.key && !generated.includes(b.key));
  const description = keep.find((b) => b.key === "description");
  if (description) lines.push(...description.lines);
  for (const g of groupOrder) if (tree[g]) lines.push(`${g}:`, ...emit(tree[g]));
  for (const b of keep) if (b !== description) lines.push(...b.lines);
  const head = `---\n${lines.join("\n")}\n---\n`;
  return { out: front ? head + body : `${head}\n${body}`, flat, count, front, blocks };
}

function main(argv) {
  const args = argv.slice(2);
  const check = args.includes("--check");
  const n = args.indexOf("--name");
  const given = n >= 0 ? args[n + 1] : undefined;
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--name") || "DESIGN.md";
  if (!existsSync(file)) { console.error(`${file}: not found`); return 2; }
  const text = readFileSync(file, "utf8");
  let r;
  try { r = render(text, file, given); } catch (e) { if (e instanceof Fail) { console.error(`${file}: ${e.message}`); return 2; } throw e; }
  for (const w of warnings) console.error(`${file}: ${w}`);
  if (check) {
    if (!r.front) { console.log(`${file}: no front matter. Run tokens.mjs to write it from the tables.`); return 1; }
    const have = flatten(r.blocks);
    const want = new Map(r.flat.map(([k, v]) => [k, String(v)]));
    const bad = [];
    for (const [k, v] of want) if (!have.has(k)) bad.push(`${k}: in the table (${v}), not in the front matter`);
    else if (have.get(k) !== v) bad.push(`${k}: table ${v}, front matter ${have.get(k)}`);
    for (const k of have.keys()) if (!want.has(k)) bad.push(`${k}: in the front matter, not in the tables`);
    if (!r.blocks.some((b) => b.key === "name")) bad.push("name: not in the front matter");
    if (bad.length) { console.log(`${file}: tokens disagree with the tables (${bad.length}). Run tokens.mjs to rewrite the front matter.\n${bad.map((b) => `- ${b}`).join("\n")}`); return 1; }
    console.log(`${file}: front matter agrees with the tables (${r.count} tokens)`);
    return 0;
  }
  if (r.out === text) console.log(`${file}: front matter already agrees (${r.count} tokens)`);
  else { writeFileSync(file, r.out); console.log(`${file}: front matter ${r.front ? "refreshed" : "written"} from the tables (${r.count} tokens)`); }
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) process.exitCode = main(process.argv);
