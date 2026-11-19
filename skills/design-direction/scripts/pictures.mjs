#!/usr/bin/env node
// A few clearly licensed pictures of the product's own subject, from Wikimedia Commons, to design
// with as stand-ins until the real ones come. It is not a bulk downloader: 4 by default, 12 at most.
// Only free licences are kept (CC0, public domain, CC BY, CC BY-SA); anything NC, ND, GFDL-only,
// fair use or unknown is left out. Node 22+, no dependencies.
//
//   node pictures.mjs "sourdough bread" --out .longbeard/design/pictures
//   node pictures.mjs "flour on a wooden bench" --out .longbeard/design/pictures --count 4 --min 1200 --orientation landscape
//
// Each picture is saved 1600 wide as <name>.jpg (or .png, .webp) in --out. A file already there is
// skipped, so running again adds, never duplicates. Each new one gets a row in <out>/credits.tsv:
// name, file, source, author, licence. The first two columns are what contact-sheet.mjs reads.
//   --count 4 (1 to 12), --min 1200 (the longer side, in pixels), --orientation landscape|portrait|square,
//   --api <url> (the Commons endpoint: for tests)
// Search the subject, not a mood: "sourdough loaf on a board", not "cosy".
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const fail = (text) => {
  console.error(`pictures: ${text}`);
  process.exit(2);
};
const api = flag("api", "https://commons.wikimedia.org/w/api.php");
const outArg = flag("out");
const count = Number(flag("count", "4"));
const min = Number(flag("min", "1200"));
const orientation = flag("orientation").toLowerCase();
const query = args.join(" ").trim();
if (!query || !outArg || !Number.isInteger(count) || count < 1 || count > 12 || !(min >= 0) || (orientation && !["landscape", "portrait", "square"].includes(orientation))) {
  console.error(`usage: node pictures.mjs "subject" --out <dir> [--count 4] [--min 1200] [--orientation landscape|portrait|square]`);
  process.exit(2);
}
const headers = { "User-Agent": "longbeard-pictures (https://github.com/jonanderdev/longbeard)" };

// The licence as a short name, or null when it is not one we can design with freely.
function licence(meta = {}) {
  const short = String(meta.LicenseShortName?.value ?? "").trim();
  const code = String(meta.License?.value ?? "").trim();
  const text = `${short} ${code}`;
  if (!text.trim()) return null;
  if (/\bNC\b|\bND\b|-nc\b|-nd\b|non-?commercial|no-?deriv|fair use/i.test(text)) return null;
  if (/\bcc0\b|cc-zero/i.test(text)) return "CC0";
  if (/public domain|^pd\b|^pd-|\bpd\b/i.test(short) || /^pd\b|^pd-/i.test(code)) return "Public domain";
  for (const s of [short, code]) {
    const m = s.match(/^cc[ -]by(?:[ -](sa))?(?:[ -](\d(?:\.\d)?))?/i);
    if (m) return `CC BY${m[1] ? "-SA" : ""}${m[2] ? ` ${m[2].includes(".") ? m[2] : `${m[2]}.0`}` : ""}`;
  }
  return null;
}
const plain = (html) => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const name = (title) => title.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim();
const slug = (title) => name(title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "picture";

const url = new URL(api);
for (const [k, v] of Object.entries({
  action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrsearch: `${query} filetype:bitmap`,
  gsrlimit: String(Math.min(count * 6, 50)), prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1600",
})) url.searchParams.set(k, v);

let data;
try {
  const res = await fetch(url, { headers });
  if (!res.ok) fail(`Commons answered ${res.status} for the search`);
  data = await res.json();
} catch (e) {
  fail(`could not reach Commons (${e.cause?.code ?? e.message})`);
}
if (data?.error) fail(`Commons said: ${data.error.info ?? data.error.code}`);
const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

const left = { licence: 0, "too small": 0, orientation: 0, type: 0 };
const passing = [];
for (const page of pages) {
  const info = page.imageinfo?.[0];
  if (!info || !["image/jpeg", "image/png", "image/webp"].includes(info.mime)) { left.type++; continue; }
  const { width: w = 0, height: h = 0 } = info;
  if (Math.max(w, h) < min) { left["too small"]++; continue; }
  const shape = w > h * 1.1 ? "landscape" : h > w * 1.1 ? "portrait" : "square";
  if (orientation && shape !== orientation) { left.orientation++; continue; }
  const lic = licence(info.extmetadata);
  if (!lic) { left.licence++; continue; }
  passing.push({ title: page.title, info, licence: lic, author: plain(info.extmetadata?.Artist?.value) || "unknown" });
}

const why = Object.entries(left).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
if (!passing.length) {
  console.error(`pictures: none of ${pages.length} found for "${query}" could be kept${why ? ` (left out: ${why})` : ""}. Try another query: search the subject, not a mood.`);
  process.exit(1);
}

mkdirSync(outArg, { recursive: true });
const credits = join(outArg, "credits.tsv");
const HEADER = "# name\tfile\tsource\tauthor\tlicence\n";
if (!existsSync(credits)) writeFileSync(credits, HEADER);
const listed = new Set(readFileSync(credits, "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")[1]));
const clean = (s) => String(s).replace(/[\t\r\n]+/g, " ").trim();

let kept = 0, already = 0, broken = 0;
for (const pic of passing) {
  if (kept >= count) break;
  const src = pic.info.thumburl || pic.info.url;
  let ext = extname(new URL(src).pathname).toLowerCase();
  if (ext === ".jpeg") ext = ".jpg";
  if (![".jpg", ".png", ".webp"].includes(ext)) ext = ".jpg";
  const file = `${slug(pic.title)}${ext}`;
  const path = join(outArg, file);
  if (existsSync(path)) { already++; continue; }
  let bytes;
  try {
    const res = await fetch(src, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`pictures: could not download ${pic.title} (${e.cause?.code ?? e.message})`);
    broken++;
    continue;
  }
  writeFileSync(path, bytes);
  if (!listed.has(path)) {
    appendFileSync(credits, [name(pic.title), path, pic.info.descriptionurl ?? "", pic.author, pic.licence].map(clean).join("\t") + "\n");
    listed.add(path);
  }
  kept++;
  console.log(`kept  ${path}  ${pic.licence}  ${pic.author}`);
}
if (broken && !kept && !already) fail(`no picture could be downloaded from Commons`);
const notes = [`${kept} kept in ${outArg}`];
if (already) notes.push(`${already} already there`);
notes.push(why ? `left out: ${why}` : "none left out");
if (broken) notes.push(`${broken} failed to download`);
console.log(`${notes.join("; ")}. Credits in ${credits}.`);
