#!/usr/bin/env node
// A picker: a wide pool of candidates from any source, as one page where the
// person marks each like or no. It hotlinks each listing's own thumbnail and
// saves nothing, so it is a view, not a capture. Their picks come back as
// text they copy into the chat. A liked tile opens a small note, "what you like
// in it, and why", kept with the mark and copied out beside that pick; no note
// is fine, and a no needs none.
//
// The TSV has one row per candidate: title, image, link, source, meta (a
// short line such as the designer and likes). Columns after the image may be
// empty. A line starting with # and holding no tab is a comment: a row always
// has a tab, since it needs an image, so a title that starts with # is still
// a row. Each row's id is the round letter and its row number among the rows
// (a1, a2…, b1… in round 2), so a pick maps to its line in the TSV. A row with
// source "seed" starts liked; its image may be a path in the project instead
// of a URL. A row it cannot show is skipped, and stderr says how many and why.
//
// --families families.json (from group.mjs) shows the tiles in groups, each
// headed by its name and size, the biggest first. A row in no group follows,
// last. Ids and marks are the same with or without it, and without it the
// page is one grid, as before.
//
//   node picker.mjs .longbeard/design/moodboard/candidates.tsv --out .longbeard/design/moodboard/picker.html
//   node picker.mjs .longbeard/design/moodboard/candidates.tsv --families .longbeard/design/moodboard/families.json --out .longbeard/design/moodboard/picker.html
//   node picker.mjs .longbeard/design/moodboard/candidates-2.tsv --round 2 --out .longbeard/design/moodboard/picker-2.html
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
};
const outArg = flag("out");
const roundArg = flag("round") || "1";
const familiesArg = flag("families");
const round = Number(roundArg);
const tsvArg = args[0];
if (!tsvArg || !outArg || args.length !== 1 || !Number.isInteger(round) || round < 1 || round > 26) {
  console.error(
    "usage: node picker.mjs .longbeard/design/<step>/candidates.tsv --out .longbeard/design/<step>/picker.html [--round 2] [--families families.json]",
  );
  process.exit(2);
}
const letter = String.fromCharCode(96 + round);

function projectRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return process.cwd();
  }
}

const root = projectRoot();
const resolvePath = (path) => (isAbsolute(path) ? path : resolve(root, path));
const tsvPath = resolvePath(tsvArg);
const outPath = resolvePath(outArg);
if (!existsSync(tsvPath)) {
  console.error(`picker: no candidates at ${tsvArg}`);
  process.exit(1);
}

// Every field is scraped text from someone else's page.
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const isUrl = (s) => /^https?:\/\//i.test(s);

// A local path in a src: each part encoded, so # ? % and spaces stay in the name.
const urlPath = (path) => path.split("/").map(encodeURIComponent).join("/");

let comments = 0;
const rows = readFileSync(tsvPath, "utf8")
  .split(/\r?\n/)
  .filter((l) => {
    if (!l.trim()) return false;
    if (l.trimStart().startsWith("#") && !l.includes("\t")) {
      comments++;
      return false;
    }
    return true;
  });

let groups = null;
if (familiesArg) {
  try {
    groups = JSON.parse(readFileSync(resolvePath(familiesArg), "utf8")).families;
    if (!Array.isArray(groups)) throw new Error("no families list");
  } catch (error) {
    console.error(`picker: cannot read families at ${familiesArg}: ${error.message}`);
    process.exit(1);
  }
}

const tiles = [];
const tileById = new Map();
const seenImages = new Set();
const skipped = new Map();
const skip = (why) => skipped.set(why, (skipped.get(why) ?? 0) + 1);
rows.forEach((line, i) => {
  const id = `${letter}${i + 1}`;
  const [title = "", image = "", link = "", source = "", meta = ""] = line.split("\t").map((c) => c.trim());
  let src = image;
  if (!isUrl(image)) {
    const abs = image ? resolvePath(image) : "";
    if (!abs || !existsSync(abs)) {
      console.error(`picker: ${id} has no image (${image || "empty"}), skipped`);
      skip("no image");
      return;
    }
    src = urlPath(relative(dirname(outPath), abs).split("\\").join("/"));
    if (!src.startsWith(".")) src = `./${src}`;
  }
  if (seenImages.has(src)) {
    console.error(`picker: ${id} repeats an earlier image, skipped`);
    skip("repeats an earlier image");
    return;
  }
  seenImages.add(src);
  const name = title || id;
  const seed = source.toLowerCase() === "seed";
  const caption =
    (isUrl(link)
      ? `<a class="name" href="${esc(link)}" title="${esc(name)}" target="_blank" rel="noopener noreferrer">${esc(name)}</a>`
      : `<span class="name" title="${esc(name)}">${esc(name)}</span>`) +
    (meta ? `<span class="meta">${esc(meta)}</span>` : "");
  const tile = `<figure class="tile" data-id="${esc(id)}" data-title="${esc(name)}"${seed ? ' data-seed="1"' : ""}>
      <button type="button" class="frame" aria-pressed="false" aria-label="${esc(`${id} ${name}: mark like, no, or clear`)}">
        <img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">
        <span class="id">${esc(id)}</span>${source ? `<span class="src">${esc(source)}</span>` : ""}
        <span class="mark"></span>
      </button>
      <figcaption>${caption}</figcaption>
      <input class="why" type="text" placeholder="What you like in it, and why (optional)" aria-label="${esc(`${id} ${name}: what you like in it, and why`)}">
    </figure>`;
  tiles.push(tile);
  tileById.set(id, tile);
});

if (!tiles.length) {
  console.error("picker: no row has an image");
  process.exit(1);
}

// Without groups, one grid. With them, a section per family, each tile once.
const grid = (list) => `<div class="grid">
    ${list.join("\n    ")}
  </div>`;
let body = grid(tiles);
if (groups) {
  const placed = new Set();
  const sections = [];
  const section = (title, ids, stray) => {
    const own = ids.filter((id) => tileById.has(id) && !placed.has(id));
    own.forEach((id) => placed.add(id));
    if (own.length) sections.push(`<section class="group"${stray ? ' data-stray="1"' : ""}>
    <h2>${esc(title)} <span class="n">${own.length}</span> <span class="liked"></span></h2>
    ${grid(own.map((id) => tileById.get(id)))}
  </section>`);
  };
  let k = 0;
  for (const g of groups) {
    if (g.stray) section("Unlike the rest", g.members || [], true);
    else section(String(g.name || "").trim() || `Group ${++k}`, g.members || [], false);
  }
  const rest = [...tileById.keys()].filter((id) => !placed.has(id));
  if (rest.length) {
    section("Not grouped", rest, true);
    console.error(`picker: ${rest.length} rows are in no group`);
  }
  body = sections.join("\n  ");
}

const groupCss = `  .group { margin: 0 0 32px; }
  .group h2 { margin: 0 0 12px 2px; font-size: 15px; font-weight: 600; }
  .group h2 .n, .group h2 .liked { font-size: 12px; font-weight: 500; color: var(--muted); margin-left: 6px; }
  .group[hidden] { display: none; }
`;
const groupJs = `    for (const g of document.querySelectorAll(".group")) {
      const own = [...g.querySelectorAll(".tile")];
      g.hidden = own.every((t) => t.hidden);
      const n = own.filter((t) => t.dataset.state === "like").length;
      g.querySelector(".liked").textContent = n ? "· " + n + " liked" : "";
    }
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pick, round ${round}</title>
<style>
  :root { --canvas: #e4e4e2; --paper: #ffffff; --ink: #1c1c1a; --muted: #6f6f6a; --like: #1f7a3a; --no: #b3261e; }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 1400px; margin: 0 auto; padding: 40px 24px 300px; }
  h1 { margin: 0 0 6px 2px; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
  .how { margin: 0 0 20px 2px; font-size: 14px; color: var(--muted); }
  .filters { margin: 0 0 18px 2px; display: flex; gap: 8px; }
  .filters button { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 999px; border: 1px solid #c8c8c4; background: var(--paper); color: var(--ink); cursor: pointer; }
  .filters button[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
${groups ? groupCss : ""}  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .tile { margin: 0; display: flex; flex-direction: column; background: var(--paper); border-radius: 16px; overflow: hidden; outline: 3px solid transparent; outline-offset: -3px; }
  .tile[data-state="like"] { outline-color: var(--like); }
  .tile[data-state="no"] .frame img { opacity: 0.3; filter: grayscale(1); }
  .tile[hidden] { display: none; }
  .why { display: none; margin: 0 12px 12px; font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #c8c8c4; border-radius: 8px; }
  .tile[data-state="like"] .why { display: block; }
  .why:focus-visible { outline: 3px solid #2f6fdb; outline-offset: 2px; }
  .frame { position: relative; display: block; width: 100%; aspect-ratio: 4 / 3; padding: 0; border: 0; overflow: hidden; background: #141414; cursor: pointer; }
  .frame:focus-visible { outline: 3px solid #2f6fdb; outline-offset: -3px; }
  .frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .id, .src, .mark { position: absolute; font-size: 11px; font-weight: 600; padding: 3px 7px; border-radius: 6px; background: rgba(0,0,0,0.65); color: #fff; }
  .id { top: 8px; left: 8px; }
  .src { top: 8px; right: 8px; font-weight: 500; }
  .mark { bottom: 8px; left: 8px; display: none; font-size: 12px; }
  .tile[data-state="like"] .mark { display: block; background: var(--like); }
  .tile[data-state="like"] .mark::after { content: "Like"; }
  .tile[data-state="no"] .mark { display: block; background: var(--no); }
  .tile[data-state="no"] .mark::after { content: "No"; }
  figcaption { padding: 10px 12px 12px; font-size: 13px; line-height: 1.35; }
  /* A scraped title can carry a whole tag list: two lines, the rest on hover. */
  .name { color: var(--ink); text-decoration: none; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { display: block; margin-top: 3px; font-size: 12px; color: var(--muted); }
  a.name:hover { text-decoration: underline; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--paper); border-top: 1px solid #c8c8c4; box-shadow: 0 -6px 24px rgba(0,0,0,0.08); }
  .bar-in { max-width: 1400px; margin: 0 auto; padding: 14px 24px 16px; display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 14px; align-items: start; }
  .bar label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .bar textarea { width: 100%; font: 13px/1.4 ui-monospace, Menlo, monospace; padding: 8px 10px; border: 1px solid #c8c8c4; border-radius: 8px; resize: vertical; }
  #note { height: 96px; font-family: inherit; font-size: 14px; }
  #out { height: 96px; background: #f6f6f4; }
  .side { display: flex; flex-direction: column; gap: 8px; padding-top: 22px; min-width: 150px; }
  #count { font-size: 13px; color: var(--muted); }
  #copy { font: inherit; font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: 10px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; }
  @media (max-width: 800px) { .bar-in { grid-template-columns: 1fr; } .side { padding-top: 0; } main { padding-bottom: 480px; } }
</style>
</head>
<body>
<main>
  <h1>Pick, round ${round}</h1>
  <p class="how">Click a picture: once for like, twice for no, three times to clear. A liked picture opens a note: say what you like in it, and why, if you can. Leave anything you have no view on. The name opens the source.</p>
  <div class="filters" role="group" aria-label="Show">
    <button type="button" data-show="all" aria-pressed="true">All</button>
    <button type="button" data-show="open" aria-pressed="false">Not marked</button>
    <button type="button" data-show="like" aria-pressed="false">Likes</button>
    <button type="button" data-show="no" aria-pressed="false">Noes</button>
  </div>
  ${body}
</main>
<div class="bar">
  <div class="bar-in">
    <div><label for="note">Why, in your words (optional)</label><textarea id="note" placeholder="What the likes share, what put you off the noes"></textarea></div>
    <div><label for="out">Copy this into the chat</label><textarea id="out" readonly></textarea></div>
    <div class="side"><span id="count"></span><button type="button" id="copy">Copy picks</button></div>
  </div>
</div>
<script>
(() => {
  const key = "longbeard-picker:" + location.pathname + ":${letter}";
  const tiles = [...document.querySelectorAll(".tile")];
  const note = document.getElementById("note");
  const out = document.getElementById("out");
  const count = document.getElementById("count");
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { saved = {}; }
  const states = saved.states || {};
  const whys = saved.whys || {};
  note.value = saved.note || "";
  // A mark is saved with its title, so a row dropped and the page rebuilt
  // never moves a mark onto another picture. A cleared seed stays cleared.
  const tag = (t) => t.dataset.id + "|" + t.dataset.title;
  for (const t of tiles) {
    const s = tag(t) in states ? states[tag(t)] : t.dataset.seed ? "like" : "";
    if (s) t.dataset.state = s;
    t.querySelector(".why").value = whys[tag(t)] || "";
  }
  let show = "all";
  const short = (s) => (s.length > 48 ? s.slice(0, 47) + "…" : s);
  const why = (t) => t.querySelector(".why").value.trim().replace(/\\s+/g, " ");
  const list = (state) => tiles.filter((t) => t.dataset.state === state).map((t) => t.dataset.id + " " + short(t.dataset.title));
  function render() {
    const like = list("like");
    const no = list("no");
    const said = tiles.filter((t) => t.dataset.state === "like" && why(t));
    const lines = ["Picks, round ${round} (${letter})", "like: " + (like.join("; ") || "none")];
    if (said.length) {
      lines.push("like, in their words:");
      for (const t of said) lines.push("- " + t.dataset.id + " " + short(t.dataset.title) + ": " + why(t));
    }
    lines.push("no: " + (no.join("; ") || "none"));
    if (note.value.trim()) lines.push("note: " + note.value.trim().replace(/\\s+/g, " "));
    out.value = lines.join("\\n");
    count.textContent = like.length + " like · " + no.length + " no · " + tiles.length + " shown";
    for (const t of tiles) {
      const s = t.dataset.state || "";
      t.querySelector(".frame").setAttribute("aria-pressed", s ? "true" : "false");
      t.hidden = !(show === "all" || (show === "open" ? !s : s === show));
    }
${groups ? groupJs : ""}    const keep = {};
    for (const t of tiles) if (t.dataset.state || t.dataset.seed) keep[tag(t)] = t.dataset.state || "";
    const keepWhys = {};
    for (const t of tiles) if (why(t)) keepWhys[tag(t)] = t.querySelector(".why").value;
    try { localStorage.setItem(key, JSON.stringify({ states: keep, whys: keepWhys, note: note.value })); } catch (e) {}
  }
  const next = { "": "like", like: "no", no: "" };
  for (const t of tiles) {
    t.querySelector(".frame").addEventListener("click", () => {
      const s = next[t.dataset.state || ""];
      if (s) t.dataset.state = s; else delete t.dataset.state;
      render();
    });
  }
  for (const b of document.querySelectorAll(".filters button")) {
    b.addEventListener("click", () => {
      show = b.dataset.show;
      for (const o of document.querySelectorAll(".filters button")) o.setAttribute("aria-pressed", o === b ? "true" : "false");
      render();
    });
  }
  note.addEventListener("input", render);
  for (const t of tiles) t.querySelector(".why").addEventListener("input", render);
  // The text box is the real path: the clipboard API can be refused on a file:// page.
  document.getElementById("copy").addEventListener("click", async (e) => {
    out.focus();
    out.select();
    let ok = false;
    try { await navigator.clipboard.writeText(out.value); ok = true; } catch (err) {}
    if (!ok) { try { ok = document.execCommand("copy"); } catch (err) {} }
    e.target.textContent = ok ? "Copied" : "Selected, press Cmd/Ctrl+C";
    setTimeout(() => { e.target.textContent = "Copy picks"; }, 1800);
  });
  render();
})();
</script>
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.error(`picker: ${tiles.length} of ${rows.length} rows, ids ${letter}1–${letter}${rows.length}`);
if (skipped.size) {
  const why = [...skipped].map(([reason, n]) => `${n} ${reason}`).join(", ");
  console.error(`picker: ${rows.length - tiles.length} rows skipped: ${why}`);
}
if (comments) console.error(`picker: ${comments} comment line${comments === 1 ? "" : "s"} ignored`);
console.log(outArg);
