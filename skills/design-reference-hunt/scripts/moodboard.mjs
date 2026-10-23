#!/usr/bin/env node
// A moodboard of the references that lead. The layout is this file.
// It shows what we saw. It does not paint a brand, a logo, a line, or a stat.
//
//   node moodboard.mjs .design/board.md --out .design/moodboard.html --leads "North Room" --also "Margin"
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
const leadsArg = flag("leads");
const alsoArg = flag("also");
const boardArg = args[0];
if (!boardArg || !outArg || args.length !== 1) {
  console.error('usage: node moodboard.mjs .design/board.md --out .design/moodboard.html --leads "Name" [--also "Name"]');
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
const read = readSlice ? fieldsOf(readSlice[1]) : {};
const leadsName = leadsArg || read.leads || read.primary || "";
if (!leadsName) {
  console.error("moodboard: name the leading card with --leads");
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

const primary = cards.find((c) => norm(c.name) === norm(leadsName));
if (!primary) {
  console.error(`moodboard: no card named ${leadsName}`);
  process.exit(1);
}
const alsoName = alsoArg || (read.also && !/^none$/i.test(read.also.trim()) ? read.also : "");
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

const colours = swatches(primary.colour || "").slice(0, 6);
const seenFaces = [];
for (const line of [primary.type, also && also.fit !== "form" ? also.type : ""]) {
  for (const face of facesOf(line || "")) {
    if (!seenFaces.some((f) => norm(f) === norm(face))) seenFaces.push(face);
  }
}
const faces = seenFaces.slice(0, 3);
const family = cssFamily(faces[0] || "");
const ink = "#1c1c1a";

const principle = (primary["worth taking"] || "").trim();
const primarySrc = shotSrc(primary.shot);
const alsoSrc = also ? shotSrc(also.shot) : "";
const pictures = imagery.slice(0, 3).flatMap((item) => {
  const src = shotSrc(item.shot);
  return src ? [{ src, caption: (item.shows || "").trim() }] : [];
});

const tiles = [];
if (faces.length) {
  const names = faces
    .map((face) => `<p class="face" style="font-family:${cssFamily(face)}">${esc(face)}</p>`)
    .join("");
  tiles.push(`<article class="tile type span-${colours.length ? 2 : 6}">
      <p class="kicker">Type we saw</p>
      <p class="aa">Aa</p>
      <div class="faces">${names}</div>
    </article>`);
}
if (colours.length) {
  const span = faces.length ? 4 : 6;
  const chips = colours
    .map((s) => {
      const edge = lum(s.hex) > 0.86 ? " chip-edge" : "";
      return `<div class="swatch"><div class="chip${edge}" style="background:${s.hex}"></div><p class="hex">${esc(s.hex)}</p>${s.label ? `<p class="role">${esc(s.label)}</p>` : ""}</div>`;
    })
    .join("");
  tiles.push(`<article class="tile colour span-${span}"><p class="kicker">Colour we saw</p><div class="swatches">${chips}</div></article>`);
}
if (primarySrc || principle) {
  const span = also && (alsoSrc || also["worth taking"]) ? 3 : 6;
  const shot = primarySrc ? `<img src="${esc(primarySrc)}" alt="Leading reference, top of the shot">` : "";
  tiles.push(`<article class="tile primary span-${span}${primarySrc ? " shot" : " no-shot"}">${shot}<div class="caption"><p class="kicker">Leads</p>${principle ? `<p class="control">${esc(principle)}</p>` : ""}</div></article>`);
}
if (also && (alsoSrc || also["worth taking"])) {
  const span = primarySrc || principle ? 3 : 6;
  const shot = alsoSrc ? `<img src="${esc(alsoSrc)}" alt="Also reference, top of the shot">` : "";
  const line = (also["worth taking"] || "").trim();
  tiles.push(`<article class="tile also span-${span}${alsoSrc ? " shot" : ""}">${shot}<div class="caption"><p class="kicker">Also</p>${line ? `<p class="control">${esc(line)}</p>` : ""}</div></article>`);
}
const pictureSpan = pictures.length === 1 ? 6 : pictures.length === 2 ? 3 : 2;
for (const pic of pictures) {
  const cap = pic.caption ? `<figcaption>${esc(pic.caption)}</figcaption>` : "";
  tiles.push(`<figure class="tile picture shot span-${pictureSpan}"><img src="${esc(pic.src)}" alt="${esc(pic.caption || "Imagery")}">${cap}</figure>`);
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
<title>Moodboard</title>
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
  .type {
    display: flex;
    flex-direction: column;
    min-height: 250px;
    background: #171717;
    color: #f6f5f2;
  }
  .type .kicker { color: rgba(255, 255, 255, 0.55); }
  .aa {
    margin: 22px 0 0;
    font-family: var(--display);
    font-size: 104px;
    line-height: 0.78;
    letter-spacing: -0.045em;
    font-weight: 500;
    color: #f6f5f2;
  }
  .faces { margin-top: 20px; }
  .face {
    margin: 0;
    font-family: var(--display);
    font-size: 22px;
    line-height: 1.2;
    letter-spacing: -0.03em;
    color: #f6f5f2;
  }
  .face + .face { margin-top: 2px; font-size: 16px; color: rgba(255, 255, 255, 0.62); }
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
  .shot { position: relative; background: #1a1a1a; }
  .shot img {
    display: block;
    width: 100%;
    height: 320px;
    object-fit: cover;
    object-position: top center;
    background: #eceae6;
  }
  .picture img { height: 250px; object-position: center; }
  .shot .caption, .picture figcaption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 64px 18px 16px;
    background: linear-gradient(to top, rgba(10, 10, 10, 0.78) 0%, rgba(10, 10, 10, 0.28) 52%, rgba(10, 10, 10, 0) 100%);
    color: #fff;
  }
  .shot .kicker { color: rgba(255, 255, 255, 0.72); }
  .shot .control { margin: 4px 0 0; font-size: 16px; line-height: 1.3; color: #fff; }
  .picture { margin: 0; }
  .picture figcaption {
    font-size: 14px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .primary.no-shot { min-height: 220px; background: var(--paper); }
  .primary.no-shot .caption { position: static; padding: 22px 24px; background: none; color: inherit; }
  .primary.no-shot .kicker { color: var(--muted); }
  .primary.no-shot .control {
    font-family: var(--display);
    font-size: 28px;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: #2a2a28;
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
  <h1>Moodboard</h1>
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
