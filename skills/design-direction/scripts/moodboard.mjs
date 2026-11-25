#!/usr/bin/env node
// A moodboard of the references, built to be marked: every card with a shot
// or recorded frames, grouped by its topic (the family it looks like, or the
// one piece it is for), with Lead, Like and No, a note per tile, a "leave out"
// per tile, and a copy-out for the chat. The
// layout is this file. It shows what we saw. It does not paint a brand.
//
// A card's fields in board.md: link, shot, frames (a folder that
// capture.mjs --frames wrote, played on hover), topic (or part), pattern (or move), measured
// (its traits from measure.mjs, shown small under the pattern), why, like (the
// person's own words from the picker: what they like in it, and why; shown on
// the card, put in its note until they change it, and the card starts liked),
// avoid (their words: what they do not want from a reference they otherwise
// like; shown on the card and put in its leave-out box), also (one line per
// other screen of the same product, "<part>: <shot>", shown with the card).
//
// The pictures are the page: a masonry of shots at their own proportions, a
// small badge for a mark, and the notes of only the card they open, in a side
// panel. Keys: L lead, K like, N no, arrows to move, Esc to close.
//
// --topics .longbeard/design/families/board.md: each card takes its family from
// that board, matched by name, so the moodboard's own cards (with their like,
// avoid and move lines) are shown under the families that board names.
// A card in no family keeps its part. Every card stays.
//
// --one-lead: one Lead on the whole board, not one per group. The direction's
// board is grouped by family, and its lead is one reference across them all.
//
//   node moodboard.mjs .longbeard/design/moodboard/board.md --out .longbeard/design/moodboard/moodboard.html
//   node moodboard.mjs .longbeard/design/pricing/board.md --out .longbeard/design/pricing/moodboard.html
//
// --overview 6 shows each family as its first six tiles (families.mjs writes
// the most typical first), how many more it has, and its measured ranges from a
// "Families:" header line, with a note per family (two looks in one, belongs
// with another). It checks the sorting; it never chooses: every family stays on
// the board that is marked next.
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
const topicsAt = args.indexOf("--topics");
const topicsArg = topicsAt === -1 ? "" : (args.splice(topicsAt, 2)[1] ?? "");
const leadAt = args.indexOf("--one-lead");
const oneLead = leadAt !== -1;
if (oneLead) args.splice(leadAt, 1);
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
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === "also") (fields.also ||= []).push(m[2].trim());
    else fields[k] = m[2].trim();
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
const topicsMd = topicsArg ? (existsSync(resolvePath(topicsArg)) ? readFileSync(resolvePath(topicsArg), "utf8") : null) : "";
if (topicsMd === null) {
  console.error(`moodboard: no board at ${topicsArg}`);
  process.exit(1);
}
// name → family, from the sorted board.
const familyOf = new Map();
for (const chunk of topicsMd.split(/^### /m).slice(1)) {
  const nl = chunk.indexOf("\n");
  const name = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
  const topic = fieldsOf(nl === -1 ? "" : chunk.slice(nl + 1)).topic;
  if (topic && !familyOf.has(name)) familyOf.set(name, topic);
}
// Ranges per family, from board.md's header: "Families: f1 (light · empty 55–70%) — 42; f2 (…) — 18".
const ranges = new Map();
const familiesLine = (topicsMd || md).match(/^Families:\s*(.*)$/m)?.[1] || "";
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
    const shot = card.shot.trim();
    // A shot may be a picture's URL (an exported library's pins): the page loads it as it is.
    if (/^https?:\/\//i.test(shot)) poster = shot;
    else if (existsSync(resolvePath(shot))) poster = href(resolvePath(shot));
    else console.error(`moodboard: missing shot ${shot}`);
  }
  if (!poster && frames) poster = frames[frames.length - 1].src;
  if (!poster) continue;
  const id = `m${++n}`;
  const seenName = (names.get(card.name) ?? 0) + 1;
  names.set(card.name, seenName);
  const markKey = seenName > 1 ? `${card.name} #${seenName}` : card.name;
  const topic = topicOf(familyOf.get(card.name) || card.topic || card.part);
  // A seed shared in chat has no URL, so its name is not a link.
  const url = (card.link || "").trim().split(/\s+/)[0];
  const name = /^https?:\/\//i.test(url)
    ? `<a class="name" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(card.name)}</a>`
    : `<span class="name">${esc(card.name)}</span>`;
  const like = (card.like || "").trim();
  const avoid = (card.avoid || "").trim();
  const line = ((card.pattern || card.move) ? `<p class="line">${esc(card.pattern || card.move)}</p>` : "") + (card.measured ? `<p class="measured">${esc(card.measured)}</p>` : "") + (like ? `<p class="liked">You liked: ${esc(like)}</p>` : "") + (avoid ? `<p class="avoided">Leave out: ${esc(avoid)}</p>` : "");
  // Other screens of the same product: "<part>: <shot>", each shown small with the card.
  const also = (card.also || [])
    .map((line) => {
      const m = line.match(/^(.*?):\s*(\S.*)$/);
      const [part, shot] = m ? [m[1].trim(), m[2].trim()] : ["", line.trim()];
      const src = /^https?:\/\//i.test(shot) ? shot : existsSync(resolvePath(shot)) ? href(resolvePath(shot)) : "";
      if (!src) console.error(`moodboard: missing shot ${shot} (also, on ${card.name})`);
      return src ? `<a class="sib" href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(card.name)}: ${esc(part || "another screen")}" loading="lazy"><span>${esc(part || "screen")}</span></a>` : "";
    })
    .join("");
  const play = frames
    ? `<button type="button" class="play" aria-label="Play ${esc(card.name)}">Play</button><span class="clock"></span>`
    : "";
  const tile = `<figure class="tile" data-id="${id}" data-title="${esc(card.name)}" data-topic="${esc(topic.label)}" data-key="${esc(markKey)}"${like ? ` data-like="${esc(like)}"` : ""}${avoid ? ` data-avoid="${esc(avoid)}"` : ""}${
    frames ? ` data-frames="${esc(JSON.stringify(frames))}"` : ""
  }>
        <div class="frame" tabindex="0" role="button" aria-label="Open ${esc(card.name)}"><img src="${esc(poster)}" alt="${esc(card.name)}" loading="lazy"><span class="id">${id}</span><span class="badge" aria-hidden="true"></span>${play}</div>
        <figcaption>
          <button type="button" class="close" aria-label="Close">Close</button>
          <a class="big" href="${esc(poster)}" target="_blank" rel="noopener" aria-label="Open the shot of ${esc(card.name)} at full size"><img data-src="${esc(poster)}" alt=""></a>
          ${also ? `<div class="also" aria-label="Other screens of the same product">${also}</div>` : ""}
          ${name}${line}
          <div class="marks" role="group" aria-label="Mark ${esc(card.name)}">
            <button type="button" data-mark="lead" aria-pressed="false">Lead</button>
            <button type="button" data-mark="like" aria-pressed="false">Like</button>
            <button type="button" data-mark="no" aria-pressed="false">No</button>
          </div>
          <input class="why" type="text" placeholder="What you like in it, and why (optional)" aria-label="What you like in ${esc(card.name)}, and why">
          <input class="avoid" type="text" placeholder="Leave out: what you don't want from it (optional)" aria-label="What to leave out of ${esc(card.name)}">
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
    <div class="take"><input class="fam-note" type="text" data-family="${esc(key || label)}" placeholder="Note (optional): two looks in one, belongs with another…" aria-label="Note on ${esc(label)}">${more ? `<span class="more">+${more} more not shown</span>` : ""}</div>`
      : `<h2>${esc(label)} <span>${s.tiles.length}</span></h2>`;
    return `<section id="${slug(at)}">
    ${head}
    <div class="grid">
      ${shown.join("\n      ")}
    </div>
  </section>`;
  })
  .join("\n  ");

// The Long Beard beard, small and one ink: it marks the page as the tool's and adds no colour.
const LOGO = "iVBORw0KGgoAAAANSUhEUgAAACoAAABYBAMAAABxB3iiAAAAMFBMVEWfn59ubm7Z2dn+/v7+/v7////+/v4AAAACAgIXFxcnJyfp6enX19c3NzdXV1dGRkbPaZsJAAAAEHRSTlP///AgWZ/+AP////7/////SdcINAAABTtJREFUeNpdlWtUVFUUx3/3zB1AZhhu4AO1hVOCj8yYKLKHyaiEq5eOS9DoQ2IFPj6UtSyVamm1AC2ttFUIZo6GikU6mrrMVTFoargsxzFTU2kkKN/OyENgHrcPd5jBzrfzW/+77/7vc/Y+0kLCK1Cf2jfgSwNAjkB35vPjEzeWWgFED90/fFfDtktd5tu0P415O+uDxwZ7tZ1ubPj7uhGHUp8/uUITh+nxiv5/UNCQ/9clcyTuD8FBv26GDUXfb7iTHhpsbap5JnftXse4u5fNdPZQdyB+cckqtcm0ZMh6773hHAKDdo9eesRUDHvGLRhjfsOq/W3ajfsfeGoaoDv4Ys399SmgG4uzPKBL0hINfv/gAedlMzIoV84fbg6biUlvnhDSvA1OapzfY/zLiSfr+1llwP+6swfiLzndMRVBcFBthyNCeWStoiCz/8TWa/Oj1NBefAsRGFauKlFI90yxHyElT/dFA8RUMXCizynqq1o2Odi7CQD9tpXsmOJUhNRS0aTf9/YxO+ipOxCsnGo4qYj0jSHa5yUOOA15RYesZZdlQ7pLbjcA04ZeGCrtmrJT4XKFMyU+oOt88nxSZanx95yJY7aNGJtzzGANxJyRx9v2heo2Fbda/l1+rGqhKv3pi/UiwCgNCS1yGd6Mrbz1UtJsz1ZLBgIPsXaJOR+1SqXMaLArSsnmNlG3b5u0yIsv9Io0S3rVZc5+vTPXqHs6eVJocJ/WB4suX2gZuMA2uWlv17m/xK3OE+/J9zDLOMVMKOtgYHZheuo62TQst92+sfGPornzJ/VfYunz68qOoCxL5LW7PqwuP2yqJFixTO813jQEdN6RCbNaLq5+y/vV1h9S+pU5qUzJdki5a5Z1391McRXfVV9yAqOOZ7jJHHH1xaXDYopTj8ZdNBoMhcZ34/6ZIS24+nDS3wvaT6Wb6lz32pKq6+LiTrp1j5/1VWYdqE1f935trX/UECXO23g9UzD65mTdqZwsvg7s2anf/I5VBNPQjRWJvuSjqyosB48MzHk0w53S5otHgBSvCneD3VPyAfHPTvDGTQUB0gs205ZHEIvzXi0cdbDPxxr90TrBp3rMvLzL6TE36b1BJwJk5R8T+63Jc5f6vPZrenNfrQM8h9bTwuoLw3Z9vmE7n3hABmVHwgMmNeBuwd8unZ38aaqCAL3PgR9VBTV2PVbJBQLuaEVVpS2DIca2RHLgBQFtAuj65C3AQqxd67eA6yZGBa8CFOgfQo1Mgm4rMVZAP86OTQEB49VushatBGBtPokWkCGBbwsKeq719PzC63chQMIVbYAuPFdBIIWk+ihVbcoBKwKCRm+UpjlW3QABU/ytUZqtb9sOAlR6N5Z0U8tXzOL/S6DuXNhbrYYAgXzmdl2CFuE+J1ATafreEzExok3UTpPxAo5HaEYvrS5CzQ6NJsRDMEK9No1KQHKEWqRohHmaMzugRKkfAFPEW3RVfxboTTu0QfJV6czwCJOj0lsnpk6eBOH7EC3lmdcAVzjf1tAmAHlkYxngUzXqxKe56rQBP4f/pkrVMB2yy4CYsFbONAH5/FJeiN7RFj4huuKvQx0l5dA+TxLhHK5kB2x6J2k2wPRcWptGA5aQzb+CKkDqzi4MayfuQOEpAIxJq7eH34Dg0Zr3WzQfdd8c98drjmXPE2GI87fa5r7h12nAud2HLfuGQvf5BtejPTWTMzaWcNEONfk3cqL1Dc1JKXEt/2Jr6bnmXpWU+w6v6VxTxvKEvN71fbziSEzeYkOB+7aqy42Z7jNFaqNV2/4HUzT8HOE538sAAAAASUVORK5CYII=";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moodboard</title>
<style>
  /* Quiet chrome: the references are the only colour on the page. */
  :root { --canvas: #f3f2ef; --paper: #ffffff; --ink: #1c1c1a; --muted: #6f6c65; --line: #dedbd4; --soft: #e9e7e2; --panel: 380px; }
  * { box-sizing: border-box; }
  html { color-scheme: light; scroll-padding-top: 76px; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; -webkit-font-smoothing: antialiased; }
  main { max-width: 1680px; margin: 0 auto; padding: 0 28px 160px; }
  body[data-open] main { margin-right: calc(var(--panel) + 28px); }
  header { padding: 22px 2px 2px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .brand img { height: 44px; width: auto; display: block; }
  .brand span { font-size: 16px; font-weight: 600; }
  h1 { margin: 0; font-size: 16px; font-weight: 400; color: var(--muted); }
  h1::before { content: "/"; margin-right: 10px; color: var(--line); }
  .how { margin: 0 0 6px; max-width: 900px; font-size: 13px; line-height: 1.5; color: var(--muted); }
  .keys { white-space: nowrap; margin-left: 4px; }
  kbd { font: 11px ui-monospace, Menlo, monospace; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; background: var(--paper); color: var(--ink); }
  /* Only the jump bar sticks, on one line that scrolls sideways, so thirty families never eat the screen. */
  .sticky { position: sticky; top: 0; z-index: 2; background: var(--canvas); display: flex; align-items: center; gap: 12px; padding: 10px 2px; margin: 0 -2px; }
  nav { display: flex; flex-wrap: nowrap; gap: 8px; overflow-x: auto; flex: 1 1 auto; min-width: 0; scrollbar-width: thin; padding-bottom: 2px; }
  nav a { white-space: nowrap; flex: none; }
  nav a, .filters button { font-size: 13px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); text-decoration: none; cursor: pointer; font-family: inherit; }
  nav a span, h2 span { color: var(--muted); }
  .filters { display: flex; gap: 6px; flex: none; }
  .filters button[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
  section { margin-top: 26px; }
  section[hidden] { display: none; }
  h2 { margin: 0 0 12px 2px; font-size: 15px; font-weight: 600; }
  /* A masonry: every shot at its own proportions, a tall page cut at its top. */
  .grid { columns: 4 260px; column-gap: 14px; }
  .tile { margin: 0 0 14px; break-inside: avoid; display: block; }
  .tile[hidden] { display: none; }
  .frame { position: relative; border-radius: 6px; overflow: hidden; background: var(--soft); cursor: zoom-in; outline: 2px solid transparent; outline-offset: 2px; }
  .frame img { width: 100%; height: auto; max-height: 640px; object-fit: cover; object-position: top center; display: block; }
  .tile[aria-current="true"] .frame { outline-color: var(--ink); }
  .tile[data-state="no"] .frame img { opacity: 0.25; filter: grayscale(1); }
  .id, .clock, .play, .badge { position: absolute; font-size: 11px; line-height: 1.5; padding: 1px 7px; border-radius: 4px; }
  .id { top: 8px; left: 8px; font-family: ui-monospace, Menlo, monospace; background: rgba(255,255,255,0.88); color: var(--ink); pointer-events: none; }
  .badge { top: 8px; right: 8px; font-weight: 600; border-radius: 999px; pointer-events: none; }
  .badge:empty { display: none; }
  .tile[data-state="lead"] .badge { background: var(--ink); color: var(--paper); }
  .tile[data-state="like"] .badge { background: var(--paper); color: var(--ink); }
  .tile[data-state="no"] .badge { background: var(--soft); color: var(--muted); }
  .play { bottom: 8px; left: 8px; border: 0; cursor: pointer; font-family: inherit; font-weight: 600; background: rgba(0,0,0,0.65); color: #fff; }
  .clock { bottom: 8px; right: 8px; pointer-events: none; background: rgba(0,0,0,0.65); color: #fff; }
  .clock:empty { display: none; }
  /* The notes of the open card only, in a side panel. */
  figcaption { display: none; }
  .tile[aria-current="true"] figcaption { display: flex; flex-direction: column; gap: 10px; position: fixed; z-index: 4; top: 16px; right: 16px; bottom: 96px; width: var(--panel); overflow-y: auto; padding: 16px; background: var(--paper); border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08); }
  .big { display: block; border-radius: 4px; overflow: hidden; background: var(--soft); cursor: zoom-in; }
  .big img { width: 100%; max-height: 52vh; object-fit: contain; display: block; }
  .close { align-self: flex-end; font: inherit; font-size: 12px; color: var(--muted); background: none; border: 0; padding: 0; cursor: pointer; margin-bottom: -4px; }
  .also { display: flex; gap: 6px; overflow-x: auto; }
  .sib { flex: none; width: 76px; text-decoration: none; color: var(--muted); font-size: 11px; }
  .sib img { width: 76px; height: 54px; object-fit: cover; object-position: top; border-radius: 3px; display: block; border: 1px solid var(--line); }
  .name { font-size: 15px; font-weight: 600; line-height: 1.3; color: var(--ink); text-decoration: none; overflow-wrap: anywhere; }
  a.name:hover { text-decoration: underline; }
  .line { margin: -4px 0 0; font-size: 13px; line-height: 1.45; color: var(--muted); }
  .measured { margin: -6px 0 0; font-size: 11px; line-height: 1.4; color: var(--muted); font-variant-numeric: tabular-nums; }
  .liked, .avoided { margin: -4px 0 0; font-size: 13px; line-height: 1.45; color: var(--ink); }
  [data-overview] .liked, [data-overview] .avoided { display: none; }
  .marks { display: flex; gap: 6px; }
  .marks button { flex: 1; font: inherit; font-size: 13px; font-weight: 500; padding: 7px 0; border-radius: 6px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); cursor: pointer; }
  .marks button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--paper); }
  button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, .frame:focus-visible { outline: 2px solid #2f6fdb; outline-offset: 2px; }
  .why, .avoid { font: inherit; font-size: 13px; padding: 8px 9px; border: 1px solid var(--line); border-radius: 6px; width: 100%; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 3; background: var(--paper); border-top: 1px solid var(--line); }
  .bar-in { max-width: 1680px; margin: 0 auto; padding: 10px 28px; display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 12px; align-items: end; }
  .bar label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
  .bar textarea { width: 100%; font: 12px/1.4 ui-monospace, Menlo, monospace; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; resize: vertical; height: 46px; }
  #note { font-family: inherit; font-size: 13px; }
  #out { background: var(--canvas); }
  .side { display: flex; align-items: center; gap: 12px; }
  #count { font-size: 13px; color: var(--muted); white-space: nowrap; }
  [data-overview] .marks, [data-overview] .why, [data-overview] .avoid, [data-overview] .filters { display: none; }
  .ranges { margin: -6px 0 10px 2px; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .take { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 0 0 12px 2px; }
  .fam-note { flex: 1 1 260px; font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 6px; }
  .more { font-size: 13px; color: var(--muted); }
  #copy { font: inherit; font-size: 13px; font-weight: 600; padding: 9px 16px; border-radius: 6px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; white-space: nowrap; }
  @media (max-width: 900px) {
    body[data-open] main { margin-right: auto; }
    main { padding: 0 16px 220px; }
    .tile[aria-current="true"] figcaption { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-height: 72vh; border-radius: 12px 12px 0 0; }
    .bar-in { grid-template-columns: 1fr; padding: 10px 16px; } .sticky { flex-wrap: wrap; } nav { flex-basis: 100%; }
  }
</style>
</head>
<body${overview ? " data-overview" : ""}>
<main>
  <header>
    <div class="brand"><img src="data:image/png;base64,${LOGO}" alt="" width="21" height="44"><span>Long Beard</span><h1>${overview ? "Families" : "Moodboard"}</h1></div>
    ${overview ? `<p class="how">Each family shows its most typical ${overview}. Every family stays on your board; this only checks the sorting. Note a family that looks like two, or that belongs with another.</p>` : ""}
    <p class="how"${overview ? " hidden" : ""}>Open a picture to mark it: Lead what should set the tone (${oneLead ? "one on the whole board" : "one per group: a part, or a direction"}), Like what belongs, No what feels wrong. In each like, say what you like and why, and what to leave out of it. A tile in the wrong group gets the note "move to" and the group's name. <span class="keys"><kbd>L</kbd> lead <kbd>K</kbd> like <kbd>N</kbd> no <kbd>←</kbd><kbd>→</kbd> move <kbd>Esc</kbd> close</span></p>
  </header>
  <div class="sticky">
    <nav aria-label="Parts">${jump}</nav>
    <div class="filters" role="group" aria-label="Show">
      <button type="button" data-show="all" aria-pressed="true">All</button>
      <button type="button" data-show="open" aria-pressed="false">Not marked</button>
      <button type="button" data-show="marked" aria-pressed="false">Marked</button>
    </div>
  </div>
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
  const avoids = saved.avoids || {};
  const oneLead = ${oneLead};
  const read = (from, t) => (tag(t) in from ? from[tag(t)] : from[old(t)]) || "";
  note.value = saved.note || "";
  const has = (from, t) => tag(t) in from || old(t) in from;
  for (const t of tiles) {
    const mark = read(marks, t);
    // A like from the picker is already a like: it starts marked, until they change it.
    if (mark) t.dataset.state = mark;
    else if (t.dataset.like && !has(marks, t)) t.dataset.state = "like";
    // Their words from the picker fill the note until they change it; a note they cleared stays cleared.
    t.querySelector(".why").value = has(notes, t) ? read(notes, t) : t.dataset.like || "";
    t.querySelector(".avoid").value = has(avoids, t) ? read(avoids, t) : t.dataset.avoid || "";
  }
  let show = "all";
  const short = (s) => (s.length > 48 ? s.slice(0, 47) + "…" : s);
  const label = (t) => t.dataset.id + " " + short(t.dataset.title) + " (" + t.dataset.topic + ")";
  const list = (state) => tiles.filter((t) => t.dataset.state === state).map(label);
  const famNotes = [...document.querySelectorAll(".fam-note")];
  for (const i of famNotes) i.value = (saved.famNotes || {})[i.dataset.family] || "";
  function renderFamilies() {
    const lines = ["Family notes"];
    const written = famNotes.filter((i) => i.value.trim());
    for (const i of written) lines.push("- " + i.dataset.family + ": " + i.value.trim().replace(/\\s+/g, " "));
    if (!written.length) lines.push("none: the sorting holds");
    if (note.value.trim()) lines.push("note: " + note.value.trim().replace(/\\s+/g, " "));
    out.value = lines.join("\\n");
    count.textContent = famNotes.length + " families · " + written.length + " noted";
    const keep = {};
    for (const i of written) keep[i.dataset.family] = i.value;
    try { localStorage.setItem(key, JSON.stringify({ famNotes: keep, note: note.value })); } catch (e) {}
  }
  for (const i of famNotes) i.addEventListener("input", () => render());
  function render() {
    if (famNotes.length) return renderFamilies();
    const lines = ["Moodboard picks", "lead: " + (list("lead").join("; ") || "none"), "like: " + (list("like").join("; ") || "none"), "no: " + (list("no").join("; ") || "none")];
    const written = tiles.filter((t) => t.querySelector(".why").value.trim());
    if (written.length) {
      lines.push("notes:");
      for (const t of written) lines.push("- " + t.dataset.id + " " + short(t.dataset.title) + ": " + t.querySelector(".why").value.trim().replace(/\\s+/g, " "));
    }
    const left = tiles.filter((t) => t.querySelector(".avoid").value.trim());
    if (left.length) {
      lines.push("leave out:");
      for (const t of left) lines.push("- " + t.dataset.id + " " + short(t.dataset.title) + ": " + t.querySelector(".avoid").value.trim().replace(/\\s+/g, " "));
    }
    if (note.value.trim()) lines.push("note: " + note.value.trim().replace(/\\s+/g, " "));
    out.value = lines.join("\\n");
    const marked = tiles.filter((t) => t.dataset.state).length;
    count.textContent = list("lead").length + " lead · " + list("like").length + " like · " + list("no").length + " no · " + (tiles.length - marked) + " open";
    const keepMarks = {};
    const keepNotes = {};
    const keepAvoids = {};
    for (const t of tiles) {
      const s = t.dataset.state || "";
      for (const b of t.querySelectorAll(".marks button")) b.setAttribute("aria-pressed", b.dataset.mark === s ? "true" : "false");
      t.querySelector(".badge").textContent = s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
      t.hidden = !(show === "all" || (show === "open" ? !s : !!s));
      // A like from the picker that they unmarked is saved as unmarked, so it does not come back.
      if (s || t.dataset.like) keepMarks[tag(t)] = s;
      const w = t.querySelector(".why").value;
      if (w.trim() || t.dataset.like) keepNotes[tag(t)] = w;
      const a = t.querySelector(".avoid").value;
      if (a.trim() || t.dataset.avoid) keepAvoids[tag(t)] = a;
    }
    for (const sec of document.querySelectorAll("section")) sec.hidden = ![...sec.querySelectorAll(".tile")].some((t) => !t.hidden);
    try { localStorage.setItem(key, JSON.stringify({ marks: keepMarks, notes: keepNotes, avoids: keepAvoids, note: note.value })); } catch (e) {}
  }
  for (const t of tiles) {
    for (const b of t.querySelectorAll(".marks button")) {
      b.addEventListener("click", () => {
        const mark = b.dataset.mark;
        if (t.dataset.state === mark) delete t.dataset.state;
        else {
          // One lead per group (a piece), or on the whole board with --one-lead: a new lead turns the old one into a like.
          if (mark === "lead") for (const o of tiles) if (o !== t && (oneLead || o.dataset.topic === t.dataset.topic) && o.dataset.state === "lead") o.dataset.state = "like";
          t.dataset.state = mark;
        }
        render();
      });
    }
    t.querySelector(".why").addEventListener("input", render);
    t.querySelector(".avoid").addEventListener("input", render);
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
  // One card open at a time: its notes in the side panel, its shot loaded large only then.
  let current = null;
  const body = document.body;
  function open(t) {
    if (current) current.setAttribute("aria-current", "false");
    current = t || null;
    if (!current) {
      if (body) delete body.dataset.open;
      return;
    }
    current.setAttribute("aria-current", "true");
    const big = current.querySelector(".big img");
    if (big && big.dataset && big.dataset.src && !big.getAttribute("src")) big.setAttribute("src", big.dataset.src);
    if (body) body.dataset.open = "";
    if (current.scrollIntoView) current.scrollIntoView({ block: "nearest" });
  }
  for (const t of tiles) {
    t.querySelector(".frame").addEventListener("click", (e) => {
      if (e && e.target && e.target.closest && e.target.closest(".play")) return;
      open(current === t ? null : t);
    });
    t.querySelector(".close").addEventListener("click", () => open(null));
  }
  if (document.addEventListener) {
    document.addEventListener("keydown", (e) => {
      const typing = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if (e.key === "Escape") {
        if (typing) e.target.blur();
        open(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if ((k === "enter" || k === " ") && e.target && e.target.classList && e.target.classList.contains("frame")) {
        e.preventDefault();
        e.target.click();
        return;
      }
      if (k === "arrowright" || k === "arrowleft") {
        const shown = tiles.filter((t) => !t.hidden);
        if (!shown.length) return;
        const at = shown.indexOf(current);
        e.preventDefault();
        open(shown[at === -1 ? 0 : (at + (k === "arrowright" ? 1 : -1) + shown.length) % shown.length]);
        return;
      }
      const mark = { l: "lead", k: "like", n: "no" }[k];
      if (mark && current && body && !body.hasAttribute("data-overview")) {
        e.preventDefault();
        current.querySelector('.marks [data-mark="' + mark + '"]').click();
      }
    });
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
console.error(`moodboard: ${n} tiles in ${ordered.length} parts${cards.length > n ? `, ${cards.length - n} of ${cards.length} cards left out for a missing shot` : ""}`);
console.log(outArg);
