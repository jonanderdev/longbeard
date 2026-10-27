#!/usr/bin/env node
// The adaptation, with this project's own words in it. Paper and night side
// by side, at reading size, on a page and on a phone. It is not the product
// and it is not a page build: no navigation, no feature, no layout invented
// here. Everything on it comes from Read this.
//
//   node proof.mjs .design/board.md --out .design/proof.html
//   node proof.mjs .design/board.md --out .design/proof.html \
//     --name "Your Project" --sample PROJECT.md --meta "Draft · 1,240 words · edited today"
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return "";
  const v = args[i + 1] ?? "";
  args.splice(i, 2);
  return v;
};

const outArg = flag("out");
const nameArg = flag("name");
const sampleArg = flag("sample");
const metaArg = flag("meta");
const boardArg = args[0];
if (!boardArg || !outArg || args.length !== 1) {
  console.error(
    'usage: node proof.mjs .design/board.md --out .design/proof.html [--name "Project"] [--sample README.md] [--meta "Draft · 1,240 words"]',
  );
  process.exit(2);
}

function projectRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

const root = projectRoot();
const resolvePath = (path) => (!path ? "" : isAbsolute(path) ? path : resolve(root, path));
const boardPath = resolvePath(boardArg);
const outPath = resolvePath(outArg);
if (!existsSync(boardPath)) {
  console.error(`proof: no board at ${boardArg}`);
  process.exit(1);
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function fieldsOf(text) {
  const fields = {};
  let key = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^- ([a-z][a-z /-]*):\s*(.*)$/i);
    if (m) {
      key = m[1].toLowerCase();
      fields[key] = m[2].trim();
      continue;
    }
    if (key && /^\s+\S/.test(line)) fields[key] = `${fields[key]} ${line.trim()}`.trim();
  }
  return fields;
}

const md = readFileSync(boardPath, "utf8");
const readSlice = md.match(/## Read this\s*\n([\s\S]*?)(?=\n## |\n### |\n- kind:|$)/);
if (!readSlice) {
  console.error("proof: the board has no Read this. Write the adaptation first.");
  process.exit(1);
}
const read = fieldsOf(readSlice[1]);
if (!read.colour) {
  console.error("proof: Read this has no colour line.");
  process.exit(1);
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const verdict = (r, large) => (r >= 7 && !large ? "AAA" : r >= (large ? 3 : 4.5) ? "AA" : "FAIL");
const expand = (hex) => {
  const h = hex.replace("#", "");
  return `#${(h.length === 3 ? h.replace(/./g, (c) => c + c) : h).toLowerCase()}`;
};

// Each hex keeps the words that follow it, so a role can say "night ground".
function swatches(line) {
  const found = [];
  const re = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?:\s*(?:→|->)\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3}))?/g;
  let m;
  while ((m = re.exec(line))) found.push({ index: m.index, end: re.lastIndex, hex: expand(m[2] || m[1]) });
  const out = [];
  for (let i = 0; i < found.length; i++) {
    const end = i + 1 < found.length ? found[i + 1].index : line.length;
    const label = line
      .slice(found[i].end, end)
      .replace(/^[\s,;:–\-."']+|[\s,;:–\-."']+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!out.some((s) => s.hex === found[i].hex)) out.push({ hex: found[i].hex, label });
  }
  return out;
}

const colours = swatches(read.colour);
if (!colours.length) {
  console.error("proof: no hexes on the colour line.");
  process.exit(1);
}

const nightish = (s) => /night|dark|dusk|lamp|evening/i.test(s.label);
const night = colours.filter(nightish);
const dayPool = colours.filter((s) => !nightish(s));

// A role comes from the words after the hex. Ground and text fall back to the
// lightest and darkest; the others are only shown when a label names them,
// so a grey-only palette gets no invented accent.
const roles = {
  mark: /accent|mark|dot|rule|highlight/i,
  dim: /\bdim|faded|earlier/i,
  secondary: /secondary|meta|muted|caption|quiet|label/i,
  text: /text|ink|body/i,
  ground: /page|ground|background|paper|canvas/i,
};
const roleOf = (s) => Object.keys(roles).find((role) => roles[role].test(s.label)) || "";

// With no colours labelled for this side, labels belong to the other side:
// night inverts the palette by lightness, as it always did.
function theme(pool, dark) {
  const list = pool.length ? pool : colours;
  const sorted = [...list].sort((a, b) => lum(b.hex) - lum(a.hex));
  const named = (role) => (pool.length ? list.find((s) => roleOf(s) === role) : undefined);
  const ground = named("ground") || (dark ? sorted[sorted.length - 1] : sorted[0]);
  const text = named("text") || (dark ? sorted[0] : sorted[sorted.length - 1]);
  return { ground, text, secondary: named("secondary"), dim: named("dim"), mark: named("mark") || colours.find((s) => roleOf(s) === "mark"), all: list };
}

const day = theme(dayPool, false);
const dusk = theme(night, true);

function isFaceName(name) {
  const words = name.split(/\s+/);
  return (
    /^[\p{L}\p{N}][\p{L}\p{N} .'’&-]*$/u.test(name) &&
    words.length <= 4 &&
    !/^(body|headline|display|serif|sans|sans-serif|mono|monospace|text|titles?|labels?|small caps)$/i.test(name)
  );
}

const faces = (read.faces || read.type || "")
  .split(/,|\s+and\s+|\s+&\s+|\s+\+\s+|\s+with\s+/i)
  .map((s) => s.replace(/\s+for\s+.*/i, "").replace(/^(a pairing of|pairing of|the)\s+/i, "").trim())
  .filter(isFaceName)
  .slice(0, 3);

const serifFallback = "'Iowan Old Style', Palatino, 'Palatino Linotype', Georgia, serif";
const sansFallback = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const isSans = (name) =>
  /sans|grotesk|grotesque|gothic|america|aeonik|inter|helvetica|neue|haas|sohne|söhne|geist|satoshi|switzer|untitled|plex sans|mono/i.test(
    name,
  );
const family = (name) => (!name ? serifFallback : `'${name.replace(/['"\\<>;{}]/g, "")}', ${isSans(name) ? sansFallback : serifFallback}`);
const fontsHref = () => {
  const list = faces
    .filter((n) => /^[A-Za-z0-9][A-Za-z0-9 ]*$/.test(n))
    .map((n) => `family=${n.trim().replace(/\s+/g, "+")}`);
  return list.length ? `https://fonts.googleapis.com/css2?${list.join("&")}&display=swap` : "";
};
const bodyFace = family(faces.find((f) => !isSans(f)) || faces[0] || "");
const metaFace = family(faces.find((f) => isSans(f)) || faces[1] || faces[0] || "");

// The words are this project's, so the direction is judged on real text.
const projectName = nameArg || basename(root);
// A paragraph is the lines between blank lines, so a file wrapped at 80 or 105
// columns still has one. Headings, lists, quotes, tables, and HTML are not prose.
function sampleText() {
  const files = sampleArg ? [sampleArg] : ["PRODUCT.md", "PROJECT.md", "README.md"];
  for (const file of files) {
    const path = resolvePath(file);
    if (!existsSync(path)) continue;
    const para = readFileSync(path, "utf8")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .split(/\r?\n\s*\r?\n/)
      .map((block) => block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
      .filter((lines) => lines.length && !lines.some((l) => /^([#>\-*|!<]|\d+\.\s)/.test(l)))
      .map((lines) => lines.join(" "))
      .find((text) => text.length > 120);
    if (para) return { text: para.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""), from: basename(file) };
  }
  return {
    text:
      "No paragraph was found in this repository, so this placeholder stands in. Replace it with --sample <file> and look again: the direction is only proved by the project's own words at reading size.",
    from: "placeholder",
  };
}
const sample = sampleText();
const meta = metaArg || "Draft · 1,240 words · edited today";
const gaps = (read.gaps || "").trim();
const ownable = (read.ownable || "").trim();
const control = (read.control || "").trim();
const behaviour = (read.behaviour || read.behavior || "").trim();
const [firstSentence, ...restSentences] = sample.text.split(/(?<=[.!?])\s+/);

function panel(name, t, large) {
  const pairs = [
    { label: "body", s: t.text, large: false },
    t.secondary && { label: "secondary", s: t.secondary, large: false },
    t.dim && { label: "dimmed", s: t.dim, large: false },
    t.mark && { label: "mark", s: t.mark, large: true },
  ].filter(Boolean);
  const checks = pairs
    .map((p) => {
      const r = ratio(p.s.hex, t.ground.hex);
      const v = verdict(r, p.large);
      return `<li class="${v === "FAIL" ? "fail" : "pass"}">${esc(p.label)} ${r.toFixed(2)}:1 ${v}</li>`;
    })
    .join("");
  // Every hex on this side of the colour line, with its label, so a grey that
  // only carries metadata is still seen.
  const chips = t.all
    .map((s) => `<li><span class="chip" style="background:${esc(s.hex)}"></span>${esc(s.hex)}${s.label ? ` ${esc(s.label)}` : ""}</li>`)
    .join("");
  const dimmed = t.dim && restSentences.length;
  const style = [
    `--ground:${t.ground.hex}`,
    `--text:${t.text.hex}`,
    `--secondary:${(t.secondary || t.text).hex}`,
    `--dim:${(t.dim || t.text).hex}`,
    `--mark:${(t.mark || t.text).hex}`,
  ].join(";");
  return `<section class="panel${large ? " wide" : " phone"}" style="${esc(style)}">
    <header class="panel-head"><p class="kicker">${esc(name)}</p><ul class="checks">${checks}</ul></header>
    <div class="page">
      <p class="eyebrow">${t.mark ? '<span class="dot"></span>' : ""}${esc(projectName)}</p>
      <h2 class="piece">${esc(sample.from === "placeholder" ? projectName : `${projectName}, in its own words`)}</h2>
      <p class="meta">${esc(meta)}</p>
      ${dimmed ? `<p class="body dim">${esc(firstSentence)}</p><p class="body">${esc(restSentences.join(" "))}</p>` : `<p class="body">${esc(sample.text)}</p>`}
      <div class="row"><span class="row-title">An earlier draft</span><span class="row-meta">${esc(meta)}</span></div>
      <div class="row"><span class="row-title">The first page</span><span class="row-meta">${esc(meta)}</span></div>
      ${control ? `<p class="control">${esc(control)}</p>` : ""}
    </div>
    <ul class="chips">${chips}</ul>
  </section>`;
}

const fonts = fontsHref();
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proof</title>
${fonts ? `<link rel="stylesheet" href="${esc(fonts)}">\n` : ""}<style>
  :root {
    --body: ${bodyFace};
    --meta: ${metaFace};
    --ui: "Helvetica Neue", Helvetica, Arial, sans-serif;
    --canvas: #e4e4e2;
    --muted: #6f6f6a;
  }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body { margin: 0; background: var(--canvas); color: #1c1c1a; font-family: var(--ui); -webkit-font-smoothing: antialiased; }
  .sheet { max-width: 1200px; margin: 0 auto; padding: 52px 28px 80px; }
  h1 { margin: 0 0 6px 2px; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
  .lead { margin: 0 0 24px 2px; max-width: 70ch; font-size: 14px; line-height: 1.5; color: var(--muted); }
  .grid { display: grid; grid-template-columns: 1fr 390px; gap: 22px; align-items: start; }
  .panel { border-radius: 22px; overflow: hidden; background: var(--ground); color: var(--text); }
  .panel-head { display: flex; justify-content: space-between; gap: 16px; padding: 18px 24px; background: rgba(127, 127, 127, 0.14); }
  .kicker { margin: 0; font-family: var(--ui); font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.7; }
  .checks { display: flex; gap: 14px; margin: 0; padding: 0; list-style: none; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; opacity: 0.8; }
  .checks .fail { font-weight: 700; text-decoration: underline; }
  .page { padding: 34px 32px 38px; }
  .eyebrow, .meta, .row-meta { font-family: var(--meta); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--secondary); }
  .eyebrow { display: flex; align-items: center; gap: 8px; margin: 0 0 22px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--mark); }
  .body.dim { color: var(--dim); margin-bottom: 14px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 0; padding: 14px 24px 18px; list-style: none; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: var(--secondary); border-top: 1px solid rgba(127, 127, 127, 0.25); }
  .chips li { display: flex; align-items: center; gap: 6px; }
  .chip { width: 14px; height: 14px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(127, 127, 127, 0.4); }
  .piece { margin: 0; font-family: var(--body); font-size: 34px; line-height: 1.12; letter-spacing: -0.02em; font-weight: 500; }
  .meta { margin: 10px 0 24px; }
  .body { margin: 0; max-width: 66ch; font-family: var(--body); font-size: 17px; line-height: 1.62; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-top: 18px; padding-top: 14px; border-top: 1px solid currentColor; opacity: 0.85; }
  .row:first-of-type { margin-top: 34px; }
  .row-title { font-family: var(--body); font-size: 17px; }
  .control { margin: 30px 0 0; font-family: var(--meta); font-size: 14px; color: var(--mark); }
  .phone .page { padding: 26px 22px 30px; }
  .phone .row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .phone .piece { font-size: 26px; }
  .phone .body { font-size: 17px; }
  .notes { margin-top: 26px; display: grid; gap: 10px; }
  .note { margin: 0; max-width: 80ch; font-size: 14px; line-height: 1.5; color: #3a3a38; }
  .note b { font-weight: 600; }
  @media (max-width: 900px) {
    .sheet { padding: 28px 16px 48px; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<main class="sheet">
  <h1>Proof</h1>
  <p class="lead">The adaptation with ${esc(projectName)}'s own words in it, at reading size. Paper on the left, night on the right, the phone column at 390px. Text from <code>${esc(sample.from)}</code>. This is not the product: no navigation, no feature, nothing invented here.</p>
  <div class="grid">
    ${panel("Paper", day, true)}
    ${panel("Night", dusk, false)}
  </div>
  <div class="notes">
    <p class="note"><b>Faces:</b> ${faces.length ? esc(faces.join(", ")) : "none named in Read this"}.${faces.length > 2 ? " Three families. Can this be done with fewer?" : faces.length === 2 ? " Can this be done with one?" : ""}</p>
    ${ownable ? `<p class="note"><b>Ownable:</b> ${esc(ownable)}</p>` : ""}
    ${behaviour ? `<p class="note"><b>Behaviour, not shown here:</b> ${esc(behaviour)}</p>` : ""}
    ${gaps ? `<p class="note"><b>Not covered by a reference:</b> ${esc(gaps)}</p>` : ""}
  </div>
</main>
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(outArg);
