#!/usr/bin/env node
// A moodboard of the references, built to be marked: every card with a shot
// or recorded frames, grouped by its topic (the family it looks like, or the
// one piece it is for), with Lead, Like and No, a note per tile, and a
// copy-out for the chat. The
// layout is this file. It shows what we saw. It does not paint a brand.
//
// A card's fields in board.md: link, shot, frames (a folder that
// capture.mjs --frames wrote, played on hover), topic (or part), pattern (or move), measured
// (its traits from measure.mjs, shown small under the pattern), why.
//
//   node moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/moodboard/moodboard.html
//   node moodboard.mjs .longbeard/design/pricing/board.md --out .longbeard/design/pricing/moodboard.html
//
// A big pool is chosen in two steps. --overview 6 shows each family as its
// first six tiles (families.mjs writes the most typical first), how many more
// it has, and its measured ranges from a "Families:" header line, with one
// Take button and a note per family. The copy-out lists the families taken.
// Then a board of only those families is marked as usual.
//   node moodboard.mjs .longbeard/design/moodboard/board.md --overview 6 --out .longbeard/design/families/families.html
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const outArg = outAt === -1 ? "" : (args.splice(outAt, 2)[1] ?? "");
const overAt = args.indexOf("--overview");
const overview = overAt === -1 ? 0 : Number(args.splice(overAt, 2)[1]);
if (overAt !== -1 && !(Number.isInteger(overview) && overview >= 1 && overview <= 24)) {
  console.error("moodboard: --overview takes how many tiles to show per family, 1 to 24");
  process.exit(2);
}
const boardArg = args[0];
if (!boardArg || !outArg || args.length !== 1) {
  console.error("usage: node moodboard.mjs .longbeard/design/<step>/board.md --out .longbeard/design/<step>/moodboard.html");
  process.exit(2);
}

function projectRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return process.cwd();
  }
}

const root = projectRoot();
const resolvePath = (path) => (isAbsolute(path) ? path : resolve(root, path));
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
// A local path in a src or href: each part encoded, so # ? % and spaces stay in the name.
const href = (abs) => {
  const src = relative(dirname(outPath), abs)
    .split("\\")
    .join("/")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return src.startsWith(".") ? src : `./${src}`;
};

function fieldsOf(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^- ([a-z][a-z /-]*):\s*(.*)$/i);
    if (m) fields[m[1].toLowerCase()] = m[2].trim();
  }
  return fields;
}

// The parts of a site, in the order a visitor meets them. A topic not here
// (an app's key screen, say) keeps the order it first appears in on the board.
const TOPICS = [
  ["Home", /^(home|homepage|landing|hero)$/],
  // "menu" is left out: for a restaurant or a bakery it is the list of dishes, not the navigation.
  ["Navigation", /^(nav|navigation|nav menu|header)$/],
  ["Index", /^(index|listing|list|work|archive|grid|catalogue|catalog)$/],
  ["Case study", /^(case[ -]?stud(y|ies)|project|work detail)$/],
  ["Article", /^(article|editorial|reading|long[ -]?read|story)$/],
  ["Blog", /^(blog|journal|news|notes)$/],
  ["Photography", /^(photo|photos|photography|imagery|image|pictures)$/],
  ["Motion", /^(motion|animation|transition|transitions|interaction)$/],
];
function topicOf(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return { key: "", label: "Other", rank: 1e6 };
  const at = TOPICS.findIndex(([, re]) => re.test(t));
  if (at !== -1) return { key: t, label: TOPICS[at][0], rank: at };
  return { key: t, label: t.charAt(0).toUpperCase() + t.slice(1), rank: 1000 };
}

// Frames from capture.mjs --frames: 01-00000ms.jpg, 02-00500ms.jpg…
function framesOf(folder) {
  const abs = resolvePath(folder.trim().replace(/\/$/, ""));
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return null;
  const files = readdirSync(abs)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  if (!files.length) return null;
  return files.map((f, i) => ({ src: href(join(abs, f)), ms: Number(f.match(/(\d+)ms\./)?.[1] ?? i * 500) }));
}

const md = readFileSync(boardPath, "utf8");
// Ranges per family, from board.md's header: "Families: f1 (light · empty 55–70%) — 42; f2 (…) — 18".
const ranges = new Map();
const familiesLine = md.match(/^Families:\s*(.*)$/m)?.[1] || "";
for (const part of familiesLine.split(";")) {
  const m = part.trim().match(/^(.+?)\s*\((.+)\)/);
  if (m) ranges.set(m[1].trim().toLowerCase(), m[2].trim());
}
const cards = md
  .split(/^### /m)
  .slice(1)
  .map((chunk) => {
    const nl = chunk.indexOf("\n");
    const name = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    return { name, ...fieldsOf((nl === -1 ? "" : chunk.slice(nl + 1)).split(/^## /m)[0]) };
  });

const sections = new Map();
let n = 0;
// A mark is saved under the card's name, so adding or dropping a card never
// moves a mark onto another. Two cards with one name tell apart by order.
const names = new Map();
for (const card of cards) {
  const frames = card.frames ? framesOf(card.frames) : null;
  if (card.frames && !frames) console.error(`moodboard: no frames in ${card.frames.trim()}`);
  let poster = "";
  if (card.shot) {
    const abs = resolvePath(card.shot.trim());
    if (existsSync(abs)) poster = href(abs);
    else console.error(`moodboard: missing shot ${card.shot.trim()}`);
  }
  if (!poster && frames) poster = frames[frames.length - 1].src;
  if (!poster) continue;
  const id = `m${++n}`;
  const seenName = (names.get(card.name) ?? 0) + 1;
  names.set(card.name, seenName);
  const markKey = seenName > 1 ? `${card.name} #${seenName}` : card.name;
  const topic = topicOf(card.topic || card.part);
  // A seed shared in chat has no URL, so its name is not a link.
  const url = (card.link || "").trim().split(/\s+/)[0];
  const name = /^https?:\/\//i.test(url)
    ? `<a class="name" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(card.name)}</a>`
    : `<span class="name">${esc(card.name)}</span>`;
  const line = ((card.pattern || card.move) ? `<p class="line">${esc(card.pattern || card.move)}</p>` : "") + (card.measured ? `<p class="measured">${esc(card.measured)}</p>` : "");
  const play = frames
    ? `<button type="button" class="play" aria-label="Play ${esc(card.name)}">Play</button><span class="clock"></span>`
    : "";
  const tile = `<figure class="tile" data-id="${id}" data-title="${esc(card.name)}" data-topic="${esc(topic.label)}" data-key="${esc(markKey)}"${
    frames ? ` data-frames="${esc(JSON.stringify(frames))}"` : ""
  }>
        <div class="frame"><a class="open" href="${esc(poster)}" target="_blank" rel="noopener" aria-label="Open the shot of ${esc(card.name)}"><img src="${esc(poster)}" alt="${esc(card.name)}" loading="lazy"></a><span class="id">${id}</span>${play}</div>
        <figcaption>
          ${name}${line}
          <div class="marks" role="group" aria-label="Mark ${esc(card.name)}">
            <button type="button" data-mark="lead" aria-pressed="false">Lead</button>
            <button type="button" data-mark="like" aria-pressed="false">Like</button>
            <button type="button" data-mark="no" aria-pressed="false">No</button>
          </div>
          <input class="why" type="text" placeholder="Note (optional)" aria-label="Note on ${esc(card.name)}">
        </figcaption>
      </figure>`;
  // In the overview each family is its own section, named by its id as written (f1, not F1), so the
  // copy-out names the list on disk (families/f1.tsv) and the board's Families: line finds its ranges.
  const at = overview ? topic.key : topic.label;
  if (!sections.has(at)) sections.set(at, { label: topic.label, key: topic.key, rank: topic.rank, order: sections.size, tiles: [] });
  sections.get(at).tiles.push(tile);
}

if (!n) {
  console.error("moodboard: no card on the board has a shot or frames");
  process.exit(1);
}

const ordered = [...sections.entries()].sort(([, a], [, b]) => a.rank - b.rank || a.order - b.order);
const slug = (s) => `t-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const jump = ordered
  .map(([at, s]) => `<a href="#${slug(at)}">${esc(s.label)} <span>${s.tiles.length}</span></a>`)
  .join("");
const body = ordered
  .map(([at, s]) => {
    const { label, key } = s;
    const shown = overview ? s.tiles.slice(0, overview) : s.tiles;
    const more = s.tiles.length - shown.length;
    const head = overview
      ? `<h2>${esc(label)} <span>${s.tiles.length}</span></h2>
    ${ranges.has(key) ? `<p class="ranges">${esc(ranges.get(key))}</p>` : ""}
    <div class="take"><button type="button" class="fam" data-family="${esc(key || label)}" aria-pressed="false">Take this family</button><input class="fam-note" type="text" data-family="${esc(key || label)}" placeholder="Note (optional): two looks in one, belongs with another…" aria-label="Note on ${esc(label)}">${more ? `<span class="more">+${more} more not shown</span>` : ""}</div>`
      : `<h2>${esc(label)} <span>${s.tiles.length}</span></h2>`;
    return `<section id="${slug(at)}">
    ${head}
    <div class="grid">
      ${shown.join("\n      ")}
    </div>
  </section>`;
  })
  .join("\n  ");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moodboard</title>
<style>
  :root { --canvas: #e4e4e2; --paper: #ffffff; --ink: #1c1c1a; --muted: #6f6f6a; --line: #c8c8c4; --lead: #8a5a00; --like: #1f7a3a; --no: #b3261e; }
  * { box-sizing: border-box; }
  html { color-scheme: light; scroll-padding-top: 64px; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 1400px; margin: 0 auto; padding: 0 24px 300px; }
  header { position: sticky; top: 0; z-index: 2; background: var(--canvas); padding: 20px 2px 12px; }
  h1 { margin: 0 0 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
  .how { margin: 0 0 12px; font-size: 14px; color: var(--muted); }
  nav { display: flex; flex-wrap: wrap; gap: 8px; }
  nav a, .filters button { font-size: 13px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); text-decoration: none; cursor: pointer; font-family: inherit; }
  nav a span, h2 span { color: var(--muted); }
  .filters { display: flex; gap: 8px; margin-top: 8px; }
  .filters button[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
  section { margin-top: 28px; }
  section[hidden] { display: none; }
  h2 { margin: 0 0 12px 2px; font-size: 18px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
  .tile { margin: 0; display: flex; flex-direction: column; background: var(--paper); border-radius: 18px; overflow: hidden; outline: 3px solid transparent; outline-offset: -3px; }
  .tile[hidden] { display: none; }
  .tile[data-state="lead"] { outline-color: var(--lead); }
  .tile[data-state="like"] { outline-color: var(--like); }
  .tile[data-state="no"] .frame img { opacity: 0.3; filter: grayscale(1); }
  /* A tall page shows its top, where a person starts; the picture opens in full. */
  .frame { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #141414; }
  .frame .open { position: absolute; inset: 0; display: block; }
  .frame img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
  .id, .clock, .play { position: absolute; font-size: 11px; font-weight: 600; padding: 3px 7px; border-radius: 6px; background: rgba(0,0,0,0.65); color: #fff; }
  .id { top: 8px; left: 8px; pointer-events: none; }
  .play { bottom: 8px; left: 8px; border: 0; cursor: pointer; font-family: inherit; }
  .clock { bottom: 8px; right: 8px; pointer-events: none; }
  .clock:empty { display: none; }
  figcaption { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 14px; }
  .name { font-size: 15px; line-height: 1.3; color: var(--ink); text-decoration: none; overflow-wrap: anywhere; }
  a.name:hover { text-decoration: underline; }
  .line { margin: -4px 0 0; font-size: 13px; line-height: 1.4; color: var(--muted); }
  .measured { margin: -6px 0 0; font-size: 11px; line-height: 1.4; color: var(--muted); font-variant-numeric: tabular-nums; }
  .marks { display: flex; gap: 6px; margin-top: auto; }
  .marks button { flex: 1; font: inherit; font-size: 13px; font-weight: 600; padding: 7px 0; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); cursor: pointer; }
  .marks button[data-mark="lead"][aria-pressed="true"] { background: var(--lead); border-color: var(--lead); color: #fff; }
  .marks button[data-mark="like"][aria-pressed="true"] { background: var(--like); border-color: var(--like); color: #fff; }
  .marks button[data-mark="no"][aria-pressed="true"] { background: var(--no); border-color: var(--no); color: #fff; }
  button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid #2f6fdb; outline-offset: 2px; }
  .why { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; width: 100%; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 3; background: var(--paper); border-top: 1px solid var(--line); box-shadow: 0 -6px 24px rgba(0,0,0,0.08); }
  .bar-in { max-width: 1400px; margin: 0 auto; padding: 14px 24px 16px; display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 14px; align-items: start; }
  .bar label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .bar textarea { width: 100%; font: 13px/1.4 ui-monospace, Menlo, monospace; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; resize: vertical; height: 96px; }
  #note { font-family: inherit; font-size: 14px; }
  #out { background: #f6f6f4; }
  .side { display: flex; flex-direction: column; gap: 8px; padding-top: 22px; min-width: 150px; }
  #count { font-size: 13px; color: var(--muted); }
  [data-overview] .marks, [data-overview] .why, [data-overview] .filters { display: none; }
  .ranges { margin: -6px 0 10px 2px; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .take { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 0 0 12px 2px; }
  .fam { font: inherit; font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); cursor: pointer; }
  .fam[aria-pressed="true"] { background: var(--like); border-color: var(--like); color: #fff; }
  .fam-note { flex: 1 1 260px; font: inherit; font-size: 14px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; }
  .more { font-size: 13px; color: var(--muted); }
  #copy { font: inherit; font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: 10px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; }
  @media (max-width: 800px) { .bar-in { grid-template-columns: 1fr; } .side { padding-top: 0; } main { padding-bottom: 480px; } header { position: static; } }
</style>
</head>
<body${overview ? " data-overview" : ""}>
<main>
  <header>
    <h1>${overview ? "Families" : "Moodboard"}</h1>
    ${overview ? `<p class="how">Each family shows its most typical ${overview}. Take the ones you want to see in full, any number. Note a family that looks like two, or that belongs with another.</p>` : ""}
    <p class="how"${overview ? " hidden" : ""}>Lead what should set the tone for its group (one per group: a part, or a direction), Like what belongs, No what feels wrong. Add a note where you have one; a tile in the wrong group gets the note "move to" and the group's name. The picture opens the shot, the name opens the source, and Play runs recorded motion.</p>
    <nav aria-label="Parts">${jump}</nav>
    <div class="filters" role="group" aria-label="Show">
      <button type="button" data-show="all" aria-pressed="true">All</button>
      <button type="button" data-show="open" aria-pressed="false">Not marked</button>
      <button type="button" data-show="marked" aria-pressed="false">Marked</button>
    </div>
  </header>
  ${body}
</main>
<div class="bar">
  <div class="bar-in">
    <div><label for="note">Overall, in your words (optional)</label><textarea id="note" placeholder="What the board says, what is missing, what to leave behind"></textarea></div>
    <div><label for="out">Copy this into the chat</label><textarea id="out" readonly></textarea></div>
    <div class="side"><span id="count"></span><button type="button" id="copy">Copy picks</button></div>
  </div>
</div>
<script>
(() => {
  const key = "longbeard-moodboard:" + location.pathname;
  const tiles = [...document.querySelectorAll(".tile")];
  const note = document.getElementById("note");
  const out = document.getElementById("out");
  const count = document.getElementById("count");
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { saved = {}; }
  // Saved under the card's name, so a card added or dropped and the board
  // rebuilt never moves a mark. A mark an earlier board saved under a running
  // number and the name is still read.
  const tag = (t) => t.dataset.key;
  const old = (t) => t.dataset.id + "|" + t.dataset.title;
  const marks = saved.marks || {};
  const notes = saved.notes || {};
  const read = (from, t) => (tag(t) in from ? from[tag(t)] : from[old(t)]) || "";
  note.value = saved.note || "";
  for (const t of tiles) {
    const mark = read(marks, t);
    if (mark) t.dataset.state = mark;
    t.querySelector(".why").value = read(notes, t);
  }
  let show = "all";
  const short = (s) => (s.length > 48 ? s.slice(0, 47) + "…" : s);
  const label = (t) => t.dataset.id + " " + short(t.dataset.title) + " (" + t.dataset.topic + ")";
  const list = (state) => tiles.filter((t) => t.dataset.state === state).map(label);
  const fams = [...document.querySelectorAll(".fam")];
  const famNotes = [...document.querySelectorAll(".fam-note")];
  if (fams.length) {
    const taken = new Set(saved.taken || []);
    for (const b of fams) if (taken.has(b.dataset.family)) b.setAttribute("aria-pressed", "true");
    for (const i of famNotes) i.value = (saved.famNotes || {})[i.dataset.family] || "";
  }
  function renderFamilies() {
    const taken = fams.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.family);
    const lines = ["Family picks", "take: " + (taken.join("; ") || "none")];
    const written = famNotes.filter((i) => i.value.trim());
    if (written.length) {
      lines.push("notes:");
      for (const i of written) lines.push("- " + i.dataset.family + ": " + i.value.trim().replace(/\\s+/g, " "));
    }
    if (note.value.trim()) lines.push("note: " + note.value.trim().replace(/\\s+/g, " "));
    out.value = lines.join("\\n");
    count.textContent = taken.length + " of " + fams.length + " families taken";
    const keep = {};
    for (const i of written) keep[i.dataset.family] = i.value;
    try { localStorage.setItem(key, JSON.stringify({ taken, famNotes: keep, note: note.value })); } catch (e) {}
  }
  for (const b of fams) b.addEventListener("click", () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); render(); });
  for (const i of famNotes) i.addEventListener("input", () => render());
  function render() {
    if (fams.length) return renderFamilies();
    const lines = ["Moodboard picks", "lead: " + (list("lead").join("; ") || "none"), "like: " + (list("like").join("; ") || "none"), "no: " + (list("no").join("; ") || "none")];
    const written = tiles.filter((t) => t.querySelector(".why").value.trim());
    if (written.length) {
      lines.push("notes:");
      for (const t of written) lines.push("- " + t.dataset.id + " " + short(t.dataset.title) + ": " + t.querySelector(".why").value.trim().replace(/\\s+/g, " "));
    }
    if (note.value.trim()) lines.push("note: " + note.value.trim().replace(/\\s+/g, " "));
    out.value = lines.join("\\n");
    const marked = tiles.filter((t) => t.dataset.state).length;
    count.textContent = list("lead").length + " lead · " + list("like").length + " like · " + list("no").length + " no · " + (tiles.length - marked) + " open";
    const keepMarks = {};
    const keepNotes = {};
    for (const t of tiles) {
      const s = t.dataset.state || "";
      for (const b of t.querySelectorAll(".marks button")) b.setAttribute("aria-pressed", b.dataset.mark === s ? "true" : "false");
      t.hidden = !(show === "all" || (show === "open" ? !s : !!s));
      if (s) keepMarks[tag(t)] = s;
      const w = t.querySelector(".why").value;
      if (w.trim()) keepNotes[tag(t)] = w;
    }
    for (const sec of document.querySelectorAll("section")) sec.hidden = ![...sec.querySelectorAll(".tile")].some((t) => !t.hidden);
    try { localStorage.setItem(key, JSON.stringify({ marks: keepMarks, notes: keepNotes, note: note.value })); } catch (e) {}
  }
  for (const t of tiles) {
    for (const b of t.querySelectorAll(".marks button")) {
      b.addEventListener("click", () => {
        const mark = b.dataset.mark;
        if (t.dataset.state === mark) delete t.dataset.state;
        else {
          // One lead per group (a family, or a piece): a new lead turns the old one into a like.
          if (mark === "lead") for (const o of tiles) if (o !== t && o.dataset.topic === t.dataset.topic && o.dataset.state === "lead") o.dataset.state = "like";
          t.dataset.state = mark;
        }
        render();
      });
    }
    t.querySelector(".why").addEventListener("input", render);
  }
  for (const b of document.querySelectorAll(".filters button")) {
    b.addEventListener("click", () => {
      show = b.dataset.show;
      for (const o of document.querySelectorAll(".filters button")) o.setAttribute("aria-pressed", o === b ? "true" : "false");
      render();
    });
  }
  note.addEventListener("input", render);
  // Recorded frames play at the times they were taken, on hover or on Play.
  for (const t of tiles) {
    if (!t.dataset.frames) continue;
    const frames = JSON.parse(t.dataset.frames);
    const img = t.querySelector(".frame img");
    const clock = t.querySelector(".clock");
    const button = t.querySelector(".play");
    const poster = img.getAttribute("src");
    let timer = 0;
    let playing = false;
    for (const f of frames) new Image().src = f.src;
    const stop = () => {
      clearTimeout(timer);
      playing = false;
      img.src = poster;
      clock.textContent = "";
      button.textContent = "Play";
    };
    const step = (i) => {
      img.src = frames[i].src;
      clock.textContent = (frames[i].ms / 1000).toFixed(1) + " s";
      const next = (i + 1) % frames.length;
      const wait = next ? Math.max(80, frames[next].ms - frames[i].ms) : 1200;
      timer = setTimeout(() => step(next), wait);
    };
    const start = () => {
      if (playing) return;
      playing = true;
      button.textContent = "Stop";
      step(0);
    };
    button.addEventListener("click", () => (playing ? stop() : start()));
    // Hover plays only for people who have not asked for less motion; Play always works.
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      t.querySelector(".frame").addEventListener("mouseenter", start);
      t.querySelector(".frame").addEventListener("mouseleave", stop);
    }
  }
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
console.error(`moodboard: ${n} tiles in ${ordered.length} parts`);
console.log(outArg);
