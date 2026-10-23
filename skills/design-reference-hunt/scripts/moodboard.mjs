#!/usr/bin/env node
// One moodboard for a chosen direction. The layout is this file.
// Reads a board that already has Read this. Does not invent a logo, a line, or a stat.
//
//   node moodboard.mjs .design/board.md --out .design/moodboard.html
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return "";
  const v = args[i + 1] ?? "";
  args.splice(i, 2);
  return v;
};

const outArg = flag("out");
const boardArg = args[0];
if (!boardArg || !outArg || args.length !== 1) {
  console.error("usage: node moodboard.mjs .design/board.md --out .design/moodboard.html");
  process.exit(2);
}

function projectRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

function resolvePath(path) {
  if (!path) return "";
  if (isAbsolute(path)) return path;
  return resolve(projectRoot(), path);
}

const boardPath = resolvePath(boardArg);
const outPath = resolvePath(outArg);
if (!existsSync(boardPath)) {
  console.error(`moodboard: no board at ${boardArg}`);
  process.exit(1);
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");

function fieldsOf(text) {
  const fields = {};
  let key = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^- ([a-z][a-z /]*):\s*(.*)$/i);
    if (m) {
      key = m[1].toLowerCase();
      fields[key] = m[2].trim();
      continue;
    }
    if (key && /^\s+\S/.test(line)) fields[key] = `${fields[key]} ${line.trim()}`.trim();
  }
  return fields;
}

function lum(hex) {
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q);
  return (y + 0.05) / (x + 0.05);
}

function expand(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  return `#${full.toLowerCase()}`;
}

function swatches(colour) {
  const found = [];
  const re = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?:\s*(?:→|->)\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3}))?/g;
  let m;
  while ((m = re.exec(colour))) found.push({ index: m.index, end: re.lastIndex, hex: expand(m[2] || m[1]) });
  const out = [];
  for (let i = 0; i < found.length; i++) {
    const end = i + 1 < found.length ? found[i + 1].index : colour.length;
    const label = colour
      .slice(found[i].end, end)
      .replace(/^[\s,;:–\-."']+|[\s,;:–\-."']+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!out.some((s) => s.hex === found[i].hex)) out.push({ hex: found[i].hex, label });
  }
  return out.slice(0, 8);
}

function facesOf(typeLine) {
  return typeLine
    .split(/,|\s+and\s+|\s+&\s+|\s+\+\s+/i)
    .map((s) => s.replace(/\s+for\s+.*/i, "").replace(/^(a pairing of|pairing of|the)\s+/i, "").trim())
    .filter(Boolean)
    .slice(0, 2);
}

function isSans(name) {
  return /sans|grotesk|grotesque|gothic|america|aeonik|inter|helvetica|neue|haas|sohne|söhne|geist|satoshi|switzer|untitled/i.test(
    name,
  );
}

function cssFamily(name) {
  if (!name) return '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif';
  const safe = name.replace(/["\\<>]/g, "").slice(0, 80);
  const fallback = isSans(name)
    ? '"Helvetica Neue", Helvetica, Arial, sans-serif'
    : '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif';
  return `"${safe}", ${fallback}`;
}

function webPath(fromFile, absTarget) {
  let rel = relative(dirname(fromFile), absTarget).split("\\").join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function shotSrc(shot) {
  if (!shot) return "";
  const abs = resolvePath(shot.trim());
  if (!existsSync(abs)) {
    console.error(`moodboard: missing shot ${shot.trim()}`);
    return "";
  }
  return webPath(outPath, abs);
}

const md = readFileSync(boardPath, "utf8");
const readSlice = md.match(/## Read this\s*\n([\s\S]*?)(?=\n## |\n### |\n- kind:|$)/);
if (!readSlice) {
  console.error("moodboard: Read this is not on the board yet");
  process.exit(1);
}
const read = fieldsOf(readSlice[1]);
if (!read.primary) {
  console.error("moodboard: Read this has no primary");
  process.exit(1);
}

const cards = [];
const chunks = md.split(/^### /m).slice(1);
for (const chunk of chunks) {
  const nl = chunk.indexOf("\n");
  const name = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
  const body = nl === -1 ? "" : chunk.slice(nl + 1);
  const cut = body.search(/^- kind:/m);
  cards.push({ name, ...fieldsOf((cut === -1 ? body : body.slice(0, cut)).split(/^## /m)[0]) });
}

const primary = cards.find((c) => norm(c.name) === norm(read.primary));
if (!primary) {
  console.error(`moodboard: no card named ${read.primary}`);
  process.exit(1);
}
const alsoName = read.also && !/^none$/i.test(read.also.trim()) ? read.also : "";
const also = alsoName ? cards.find((c) => norm(c.name) === norm(alsoName)) : null;
if (alsoName && !also) console.error(`moodboard: no card named ${alsoName}`);

const imagery = [];
{
  let inCard = false;
  let cur = null;
  const push = () => {
    if (cur?.kind === "imagery" && cur.shot) imagery.push(cur);
    cur = null;
  };
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith("### ")) {
      inCard = true;
      push();
      continue;
    }
    if (line.startsWith("## ")) {
      inCard = false;
      push();
      continue;
    }
    const m = line.match(/^- ([a-z][a-z /]*):\s*(.*)$/i);
    if (m && m[1].toLowerCase() === "kind") {
      inCard = false;
      push();
      cur = { kind: m[2].trim().toLowerCase() };
      continue;
    }
    if (inCard) continue;
    if (cur && m) cur[m[1].toLowerCase()] = m[2].trim();
    else if (cur && line.trim() === "") push();
  }
  push();
}
if (imagery.length > 3) console.error(`moodboard: showing 3 of ${imagery.length} imagery`);

const colours = swatches(primary.colour || "");
const faces = facesOf(read.type || primary.type || "");
const family = cssFamily(faces[0] || "");
const paper = "#ffffff";
const inkDefault = "#1c1c1a";
const inkSwatch = colours.find((s) => /text|ink|body|headline|type/i.test(s.label));
const groundSwatch = colours.find((s) => /ground|background|canvas|page|surface/i.test(s.label));
const ink = inkSwatch && contrast(inkSwatch.hex, paper) >= 3 ? inkSwatch.hex : inkDefault;
let principleBg = paper;
let principleFg = inkDefault;
if (groundSwatch && inkSwatch && contrast(inkSwatch.hex, groundSwatch.hex) >= 3) {
  principleBg = groundSwatch.hex;
  principleFg = inkSwatch.hex;
}

const principle = (primary["worth taking"] || "").trim();
const leave = (read.leave || "").trim();
const control = (read.control || "").trim();
const typeLine = (read.type || "").trim();
const primarySrc = shotSrc(primary.shot);
const alsoSrc = also ? shotSrc(also.shot) : "";
const pictures = imagery.slice(0, 3).flatMap((item) => {
  const src = shotSrc(item.shot);
  return src ? [{ src, caption: (item.shows || "").trim() }] : [];
});

const tiles = [];
if (faces.length || typeLine) {
  const names = faces
    .map((face) => `<p class="face" style="font-family:${cssFamily(face)}">${esc(face)}</p>`)
    .join("");
  tiles.push(`<article class="tile type span-${colours.length ? 2 : 6}">
      <p class="kicker">Type</p>
      <p class="aa">Aa</p>
      <div class="faces">${names || `<p class="face">${esc(typeLine)}</p>`}</div>
    </article>`);
}
if (colours.length) {
  const span = faces.length || typeLine ? 4 : 6;
  const chips = colours
    .map((s) => {
      const edge = lum(s.hex) > 0.86 ? " chip-edge" : "";
      return `<div class="swatch"><div class="chip${edge}" style="background:${s.hex}"></div><p class="hex">${esc(s.hex)}</p>${s.label ? `<p class="role">${esc(s.label)}</p>` : ""}</div>`;
    })
    .join("");
  tiles.push(`<article class="tile colour span-${span}"><p class="kicker">Colour</p><div class="swatches">${chips}</div></article>`);
}
if (principle) {
  const span = primarySrc || control ? 3 : 6;
  const long = principle.length > 140 ? " long" : "";
  tiles.push(`<article class="tile principle span-${span}" style="background:${principleBg};color:${principleFg}"><p class="kicker">Worth taking</p><p class="statement${long}">${esc(principle)}</p></article>`);
}
if (primarySrc || control) {
  const span = principle ? 3 : 6;
  const shot = primarySrc ? `<img src="${esc(primarySrc)}" alt="Primary reference, top of the shot">` : "";
  const caption = control ? `<div class="caption"><p class="kicker">Control</p><p class="control">${esc(control)}</p></div>` : "";
  const bare = primarySrc && !control ? " shot-only" : primarySrc ? "" : " no-shot";
  tiles.push(`<article class="tile primary span-${span}${bare}">${shot}${caption}</article>`);
}
const pictureSpan = pictures.length === 1 ? 6 : pictures.length === 2 ? 3 : 2;
for (const pic of pictures) {
  const cap = pic.caption ? `<figcaption>${esc(pic.caption)}</figcaption>` : "";
  tiles.push(`<figure class="tile picture span-${pictureSpan}"><img src="${esc(pic.src)}" alt="${esc(pic.caption || "Imagery")}">${cap}</figure>`);
}
if (also && (alsoSrc || also["worth taking"])) {
  const span = leave ? 3 : 6;
  const shot = alsoSrc ? `<img src="${esc(alsoSrc)}" alt="Also reference, top of the shot">` : "";
  const line = (also["worth taking"] || "").trim();
  tiles.push(`<article class="tile also span-${span}">${shot}<div class="caption"><p class="kicker">Also</p>${line ? `<p class="control">${esc(line)}</p>` : ""}</div></article>`);
}
if (leave) {
  const span = also && (alsoSrc || also["worth taking"]) ? 3 : 6;
  tiles.push(`<article class="tile leave span-${span}"><p class="kicker">Leave</p><p class="quiet">${esc(leave)}</p></article>`);
}

if (!tiles.length) {
  console.error("moodboard: nothing on the board to show");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction</title>
<style>
  :root {
    --display: ${family};
    --ink: ${ink};
    --paper: #ffffff;
    --canvas: #e4e4e2;
    --muted: #6f6f6a;
    --ui: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--ui);
    -webkit-font-smoothing: antialiased;
  }
  .sheet { max-width: 1080px; margin: 0 auto; padding: 52px 28px 80px; }
  h1 {
    margin: 0 0 16px 2px;
    font-family: var(--ui);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; align-items: stretch; }
  .tile { background: var(--paper); border-radius: 22px; overflow: hidden; min-width: 0; }
  .span-2 { grid-column: span 2; }
  .span-3 { grid-column: span 3; }
  .span-4 { grid-column: span 4; }
  .span-6 { grid-column: span 6; }
  .kicker {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .type, .colour, .principle, .leave { padding: 22px 24px 20px; }
  .type { display: flex; flex-direction: column; min-height: 250px; }
  .aa {
    margin: 18px 0 0;
    font-family: var(--display);
    font-size: 104px;
    line-height: 0.78;
    letter-spacing: -0.045em;
    font-weight: 500;
    color: var(--ink);
  }
  .faces { margin-top: auto; padding-top: 28px; }
  .face {
    margin: 0;
    font-family: var(--display);
    font-size: 22px;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  .face + .face { margin-top: 2px; font-size: 16px; color: var(--muted); }
  .colour { display: flex; flex-direction: column; min-height: 250px; }
  .swatches {
    margin-top: auto;
    padding-top: 22px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 10px 12px;
  }
  .chip { height: 92px; border-radius: 14px; }
  .chip-edge { box-shadow: inset 0 0 0 1px rgba(28, 28, 26, 0.14); }
  .hex {
    margin: 8px 0 0;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 11px;
    letter-spacing: 0.02em;
    color: #3c3c39;
  }
  .role {
    margin: 2px 0 0;
    font-size: 12px;
    line-height: 1.3;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .principle { display: flex; flex-direction: column; min-height: 320px; }
  .principle .kicker { color: color-mix(in srgb, currentColor 58%, transparent); }
  .statement {
    margin: auto 0 0;
    max-width: 16ch;
    font-family: var(--display);
    font-size: 40px;
    line-height: 1.05;
    letter-spacing: -0.035em;
    font-weight: 500;
  }
  .statement.long { font-size: 28px; line-height: 1.15; max-width: 22ch; }
  .primary, .also { display: flex; flex-direction: column; background: var(--paper); }
  .primary { min-height: 320px; }
  .primary img, .also img, .picture img { display: block; width: 100%; object-fit: cover; background: #eceae6; }
  .primary img { flex: 1 1 auto; min-height: 200px; height: 220px; object-position: top center; }
  .also img { height: 200px; object-position: top center; }
  .picture img { height: 232px; object-position: center; }
  .caption { padding: 16px 18px 18px; }
  .control { margin: 8px 0 0; font-size: 15px; line-height: 1.4; color: #2a2a28; }
  .primary.shot-only img { height: 320px; }
  .primary.no-shot { min-height: 220px; }
  .primary.no-shot .caption { padding: 22px 24px; }
  .primary.no-shot .control {
    font-family: var(--display);
    font-size: 28px;
    line-height: 1.15;
    letter-spacing: -0.03em;
  }
  .picture { margin: 0; display: flex; flex-direction: column; }
  .picture figcaption {
    padding: 10px 14px 12px;
    font-size: 12px;
    line-height: 1.35;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .leave { display: flex; flex-direction: column; justify-content: center; gap: 12px; min-height: 180px; }
  .quiet { margin: 0; max-width: 28em; font-size: 20px; line-height: 1.35; letter-spacing: -0.02em; color: #3a3a38; }
  @media (max-width: 800px) {
    .sheet { padding: 28px 16px 48px; }
    .tile, .span-2, .span-3, .span-4, .span-6 { grid-column: 1 / -1; }
    .aa { font-size: 84px; }
    .statement { font-size: 32px; }
  }
</style>
</head>
<body>
<main class="sheet">
  <h1>Direction</h1>
  <div class="grid">
    ${tiles.join("\n    ")}
  </div>
</main>
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(outArg);
