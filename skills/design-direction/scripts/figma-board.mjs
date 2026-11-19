#!/usr/bin/env node
// A Figma moodboard, read once. get_metadata on a big board is a file of
// about 100K tokens: this reads it so the agent never does, lists its sections
// and cards, and says which of them changed since the board was last read, so
// only those are screenshotted and downloaded again. No dependencies.
//
//   node figma-board.mjs <metadata file> --board <fileKey>:<nodeId>
//     The sections and their cards, each section "new", "same" or "changed",
//     and the cards to read: new ones, and ones renamed or resized since.
//   node figma-board.mjs <metadata file> --board <fileKey>:<nodeId> --done cards.tsv
//     After reading: remember the board as it is now, and what became of each
//     card read. cards.tsv: card id<TAB>the file it was saved to, or "drop"<TAB>why.
//     A kept file is copied into the cache, so another exploration gets it back.
//   node figma-board.mjs <metadata file> --board <fileKey>:<nodeId> --reuse design-exploration/<slug>/refs
//     Copy the keeps of every unchanged card into refs, and list the unchanged
//     cards that were dropped before, with why.
//
// The cache is design-exploration/.cache/figma (or --cache dir). A card counts as
// unchanged when its id, name and size are the same. A picture swapped inside a
// card of the same name and size is not seen: --fresh reads every card again.
//
// The metadata file is what get_metadata returned, as saved: its XML, or the
// JSON list of text blocks it came in.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args.splice(i, 2)[1] ?? "";
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const fail = (message, code = 1) => {
  console.error(`figma-board: ${message}`);
  process.exit(code);
};
const boardArg = flag("board");
const doneArg = flag("done");
const reuseArg = flag("reuse");
const cacheArg = flag("cache");
const fresh = has("fresh");
const [input] = args;
if (!input || !/^[\w-]+:[\w:;-]+$/.test(boardArg) || (doneArg && reuseArg)) {
  fail("usage: node figma-board.mjs <metadata file> --board <fileKey>:<nodeId> [--done cards.tsv | --reuse refs-dir] [--cache dir] [--fresh]", 2);
}
if (!existsSync(input)) fail(`no metadata at ${input}`);

// What get_metadata returned: XML, or JSON holding it as text.
let xml = readFileSync(input, "utf8");
if (/^\s*[[{]/.test(xml)) {
  try {
    const texts = [];
    const walk = (v) => (typeof v === "string" ? texts.push(v) : v && typeof v === "object" && Object.values(v).forEach(walk));
    walk(JSON.parse(xml));
    xml = texts.filter((t) => t.includes("<")).join("\n");
  } catch {}
}
const unescape = (v) => v.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attrs = (text) => Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, unescape(v)]));

// Sections, and the cards directly inside each. A board with no sections is one section: the node itself.
const sections = [];
const stack = [];
const root = { id: boardArg.split(":").slice(1).join(":"), name: "(the whole node)", size: "", cards: [] };
for (const [, close, tag, rest, selfClose] of xml.matchAll(/<(\/?)([\w-]+)([^>]*?)(\/?)>/g)) {
  if (close) {
    stack.pop();
    continue;
  }
  const a = attrs(rest);
  const node = { tag, id: a.id || "", name: a.name || "", size: a.width && a.height ? `${Math.round(a.width)}x${Math.round(a.height)}` : "" };
  const parent = stack[stack.length - 1];
  if (tag === "section" && !stack.some((n) => n.tag === "section")) {
    node.cards = [];
    sections.push(node);
  } else if (parent?.cards && node.id) parent.cards.push({ id: node.id, name: node.name, size: node.size });
  else if (stack.length === 1 && node.id && !stack.some((n) => n.tag === "section")) root.cards.push({ id: node.id, name: node.name, size: node.size });
  if (!selfClose) stack.push(node);
}
if (!sections.length) {
  if (!root.cards.length) fail(`no sections or cards in ${input}: is it the output of get_metadata?`);
  sections.push(root);
}

const cacheDir = join(cacheArg || "design-exploration/.cache", "figma");
const key = boardArg.replace(/[^\w-]/g, "-");
const savedPath = join(cacheDir, `${key}.json`);
const saved = !fresh && existsSync(savedPath) ? JSON.parse(readFileSync(savedPath, "utf8")) : { cards: {} };
const same = (card) => {
  const was = saved.cards[card.id];
  return was && was.name === card.name && was.size === card.size;
};

if (doneArg) {
  if (!existsSync(doneArg)) fail(`no cards at ${doneArg}`);
  const now = new Map(sections.flatMap((s) => s.cards.map((c) => [c.id, { ...c, section: s.id }])));
  const problems = [];
  const read = new Map();
  for (const [n, line] of readFileSync(doneArg, "utf8").split(/\r?\n/).entries()) {
    if (!line.trim() || /^(card|id)\t/.test(line)) continue;
    const [id, where = "", why = ""] = line.split("\t").map((x) => x.trim());
    if (!now.has(id)) problems.push(`line ${n + 1}: no card ${id} on this board`);
    else if (where !== "drop" && !existsSync(where)) problems.push(`line ${n + 1}: ${id}: no file at ${where}`);
    else read.set(id, { where, why });
  }
  if (problems.length) fail(`nothing saved:\n${problems.join("\n")}`);
  mkdirSync(join(cacheDir, key), { recursive: true });
  const cards = {};
  for (const [id, card] of now) {
    const verdict = read.get(id);
    if (verdict) {
      let kept = null;
      if (verdict.where !== "drop") {
        kept = join(cacheDir, key, `${id.replace(/[^\w-]/g, "-")}-${basename(verdict.where)}`);
        copyFileSync(verdict.where, kept);
      }
      cards[id] = { ...card, kept, file: verdict.where === "drop" ? null : basename(verdict.where), why: verdict.why };
    } else if (same(card)) cards[id] = { ...saved.cards[id], section: card.section };
  }
  writeFileSync(savedPath, `${JSON.stringify({ board: boardArg, at: new Date().toISOString(), cards }, null, 1)}\n`);
  const all = Object.values(cards);
  console.log(`saved ${boardArg}: ${all.length} cards known, ${all.filter((c) => c.kept).length} kept, ${all.filter((c) => !c.kept).length} dropped; ${now.size - all.length} not read yet`);
  process.exit(0);
}

if (reuseArg) {
  mkdirSync(reuseArg, { recursive: true });
  let copied = 0;
  const dropped = [];
  for (const card of sections.flatMap((s) => s.cards)) {
    if (!same(card)) continue;
    const was = saved.cards[card.id];
    if (was.kept && existsSync(was.kept)) {
      const to = join(reuseArg, was.file || `${card.id.replace(/[^\w-]/g, "-")}${extname(was.kept)}`);
      if (!existsSync(to)) copyFileSync(was.kept, to);
      copied++;
    } else if (!was.kept) dropped.push(`${card.id}\t${card.name}\t${was.why || ""}`);
  }
  console.log(`reused ${copied} keeps into ${reuseArg}`);
  if (dropped.length) console.log(`dropped before, unchanged (${dropped.length}):\n${dropped.join("\n")}`);
  process.exit(0);
}

const total = sections.reduce((n, s) => n + s.cards.length, 0);
const toRead = [];
console.log(`board ${boardArg}: ${sections.length} sections, ${total} cards${saved.at ? `; last read ${saved.at.slice(0, 10)}` : "; not read before"}`);
console.log("section\tname\tsize\tcards\tsince last read");
for (const s of sections) {
  const changed = s.cards.filter((c) => !same(c));
  const gone = Object.values(saved.cards).filter((c) => c.section === s.id && !s.cards.some((x) => x.id === c.id)).length;
  const known = s.cards.length - changed.length;
  const state = !known ? "new" : changed.length || gone ? `changed: ${changed.length} new or edited, ${gone} gone` : "same";
  console.log(`${s.id}\t${s.name}\t${s.size}\t${s.cards.length}\t${state}`);
  for (const c of changed) toRead.push({ ...c, section: s.id });
}
if (!toRead.length) console.log("\nnothing to read: every card is as it was. --reuse copies the keeps back.");
else {
  console.log(`\nto read: ${toRead.length} cards in ${new Set(toRead.map((c) => c.section)).size} sections`);
  console.log("card\tname\tsize\tsection");
  for (const c of toRead) console.log(`${c.id}\t${c.name}\t${c.size}\t${c.section}`);
}
