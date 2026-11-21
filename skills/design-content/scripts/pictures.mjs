#!/usr/bin/env node
// A few clearly licensed pictures of the product's own subject, from Wikimedia Commons, to design
// with as stand-ins until the real ones come. It is not a bulk downloader: 4 by default, 12 at most.
// Only licences that hold in every country are kept: CC0, CC BY and CC BY-SA (any version), and
// public domain marked as worldwide (read from the file's templates, as the source's own licence
// name does not tell the two kinds apart). Public domain in one country only ("PD-US", "PD-Russia"),
// NC, ND, GFDL-only, fair use, unknown, and anything the source flags as restricted or non-free
// is left out. A licence that asks for credit needs an author to credit: with none, the picture
// is left out too. Node 22+, no dependencies.
//
//   node pictures.mjs "sourdough bread" --out .longbeard/design/pictures
//   node pictures.mjs "flour on a wooden bench" --out .longbeard/design/pictures --count 4 --min 1200 --orientation landscape
//
// Each picture is saved 1600 wide as <name>.jpg (or .png, .webp) in --out. A picture already
// credited there is skipped, so running again adds, never duplicates. Each new one gets a row in <out>/credits.tsv:
// name, file, source, author, licence, licence link, a ready credit line, share-alike (yes or no). The
// first two columns are what contact-sheet.mjs reads; a credits.tsv from before the last three columns
// stays readable, its rows just stop at the licence.
//   --count 4 (1 to 12), --min 1200 (the longer side, in pixels), --orientation landscape|portrait|square,
//   --timeout 30 (seconds to wait for each request), --api <url> (the Commons endpoint: for tests)
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
const timeout = Number(flag("timeout", "30"));
const query = args.join(" ").trim();
if (!query || !outArg || !Number.isInteger(count) || count < 1 || count > 12 || !(min >= 0) || !(timeout > 0) || (orientation && !["landscape", "portrait", "square"].includes(orientation))) {
  console.error(`usage: node pictures.mjs "subject" --out <dir> [--count 4] [--min 1200] [--orientation landscape|portrait|square] [--timeout 30]`);
  process.exit(2);
}
const headers = { "User-Agent": "longbeard-pictures (https://github.com/jonanderdev/longbeard)" };

// Public domain is not one thing. Commons gives nearly every such file the same short name, "Public
// domain", whether it is so everywhere or only in one country (a US government photograph, a work
// old enough in the US alone), so the name cannot tell them apart; the templates on the file page
// can. A public-domain file is kept only when its page carries a template that says it holds
// everywhere: the worldwide public-domain mark, or the author's own dedication. The search asks for
// just these, so a page's list is short, and a page that shows none is left out.
const WORLDWIDE_PD_TEMPLATES = ["Cc-pd-mark-footer", "PD-self", "PD-author"];
const WORLDWIDE_PD = /^(public domain|public domain mark|pdm|pd|pd-self|pd-old|pd-old-100(-expired)?|pd-author)$/i;
// The licence as { name, link, shareAlike, credit } (credit: the licence asks for one), or
// { reason } when the picture is not one we can design with freely. templates: the names of the
// worldwide public-domain templates found on the file's page.
function licence(meta = {}, templates = []) {
  const val = (k) => String(meta[k]?.value ?? "").trim();
  const short = val("LicenseShortName"), code = val("License"), terms = val("UsageTerms"), link = val("LicenseUrl");
  const text = `${short} ${code}`;
  if (!text.trim()) return { reason: "licence" };
  if (val("NonFree") && !/^(false|0|no)$/i.test(val("NonFree"))) return { reason: "restricted" };
  if (val("Restrictions")) return { reason: "restricted" };
  if (/\bNC\b|\bND\b|-nc\b|-nd\b|non-?commercial|no-?deriv|fair use/i.test(`${text} ${terms}`)) return { reason: "licence" };
  if (/\bcc0\b|cc-zero/i.test(text)) {
    return { name: "CC0", link: link || "https://creativecommons.org/publicdomain/zero/1.0/", shareAlike: false, credit: false };
  }
  for (const s of [short, code]) {
    const m = s.match(/^cc[ -]by(?:[ -](sa))?(?:[ -](\d(?:\.\d)?))?(?:[ -]([a-z]{2,3})(?![a-z]))?/i);
    if (m) {
      const version = m[2] ? (m[2].includes(".") ? m[2] : `${m[2]}.0`) : "";
      return {
        // A ported licence keeps its country: "CC BY-SA 3.0 de".
        name: `CC BY${m[1] ? "-SA" : ""}${version ? ` ${version}` : ""}${version && m[3] ? ` ${m[3].toLowerCase()}` : ""}`,
        link: link || (version ? `https://creativecommons.org/licenses/${m[1] ? "by-sa" : "by"}/${version}/` : ""),
        shareAlike: Boolean(m[1]), credit: true,
      };
    }
  }
  if (WORLDWIDE_PD.test(short) || (!short && WORLDWIDE_PD.test(code))) {
    // The terms must not narrow it to a place or a condition, and the page must say it holds everywhere.
    if (/\b(only|united states|u\.?s\.?a?\b|russia|country|countries|jurisdiction|if|except|unless)\b/i.test(terms)) return { reason: "licence" };
    if (!templates.length) return { reason: "licence" };
    return { name: "Public domain", link: /^https?:/i.test(link) ? link : "", shareAlike: false, credit: val("AttributionRequired") === "true" };
  }
  return { reason: "licence" };
}
const plain = (html) => String(html ?? "").replace(/<(\w+)[^>]*display:\s*none[^>]*>.*?<\/\1>/gis, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
// An author we can credit: a name, not "unknown" or an empty field.
const usable = (author) => author && !/^(unknown|anonymous|anon|not specified|not known|n\/a|none|\?+|-+)( (author|artist|photographer|creator|source))?\.?$/i.test(author);
const name = (title) => title.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim();
const slug = (title) => name(title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "picture";

const url = new URL(api);
for (const [k, v] of Object.entries({
  action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrsearch: `${query} filetype:bitmap`,
  gsrlimit: String(Math.min(count * 6, 50)), prop: "imageinfo|templates", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1600",
  tlnamespace: "10", tllimit: "500", tltemplates: WORLDWIDE_PD_TEMPLATES.map((t) => `Template:${t}`).join("|"),
})) url.searchParams.set(k, v);

let data;
try {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout * 1000) });
  if (!res.ok) fail(`Commons answered ${res.status} for the search`);
  data = await res.json();
} catch (e) {
  fail(e.name === "TimeoutError" ? `Commons did not answer the search within ${timeout}s` : `could not reach Commons (${e.cause?.code ?? e.message})`);
}
if (data?.error) fail(`Commons said: ${data.error.info ?? data.error.code}`);
const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

const left = { licence: 0, restricted: 0, "no author": 0, "too small": 0, orientation: 0, type: 0 };
const passing = [];
for (const page of pages) {
  const info = page.imageinfo?.[0];
  if (!info || !["image/jpeg", "image/png", "image/webp"].includes(info.mime)) { left.type++; continue; }
  const { width: w = 0, height: h = 0 } = info;
  if (Math.max(w, h) < min) { left["too small"]++; continue; }
  const shape = w > h * 1.1 ? "landscape" : h > w * 1.1 ? "portrait" : "square";
  if (orientation && shape !== orientation) { left.orientation++; continue; }
  const marks = (page.templates ?? []).map((t) => String(t.title ?? "").replace(/^Template:/i, "")).filter((t) => WORLDWIDE_PD_TEMPLATES.includes(t));
  const lic = licence(info.extmetadata, marks);
  if (lic.reason) { left[lic.reason]++; continue; }
  const author = plain(info.extmetadata?.Artist?.value).slice(0, 200).trim();
  if (lic.credit && !usable(author)) {
    // A licence that asks for credit cannot be met without a name to give it to.
    console.log(`left out  ${name(page.title)}: ${lic.name} asks for credit and no author is given`);
    left["no author"]++;
    continue;
  }
  passing.push({ title: page.title, info, licence: lic, author: usable(author) ? author : "unknown" });
}

const why = Object.entries(left).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
if (!passing.length) {
  console.error(`pictures: none of ${pages.length} found for "${query}" could be kept${why ? ` (left out: ${why})` : ""}. Try another query: search the subject, not a mood.`);
  process.exit(1);
}

mkdirSync(outArg, { recursive: true });
const credits = join(outArg, "credits.tsv");
const HEADER = "# name\tfile\tsource\tauthor\tlicence\tlicence link\tcredit line\tshare-alike\n";
const OLD_HEADER = "# name\tfile\tsource\tauthor\tlicence\n";
if (!existsSync(credits)) writeFileSync(credits, HEADER);
else {
  // A file from before the licence link: the new header over the old rows, which stay as they were.
  const text = readFileSync(credits, "utf8");
  if (text.startsWith(OLD_HEADER)) writeFileSync(credits, HEADER + text.slice(OLD_HEADER.length));
}
// Rows already credited: which files are taken, and which Commons pictures are already here. A
// picture is known by its source page (its name when there is none), never by its file name: two
// titles can cut down to the same name.
const rows = readFileSync(credits, "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));
const listed = new Set(rows.map((r) => r[1]));
const known = new Map(rows.map((r) => [r[2] || `name:${r[0]}`, r[1]]));
const clean = (s) => String(s).replace(/[\t\r\n]+/g, " ").trim();

let kept = 0, already = 0, broken = 0, shareAlike = 0;
for (const pic of passing) {
  if (kept >= count) break;
  const src = pic.info.thumburl || pic.info.url;
  let ext = extname(new URL(src).pathname).toLowerCase();
  if (ext === ".jpeg") ext = ".jpg";
  if (![".jpg", ".png", ".webp"].includes(ext)) ext = ".jpg";
  const key = clean(pic.info.descriptionurl ?? "") || `name:${clean(name(pic.title))}`;
  if (known.has(key) && existsSync(known.get(key))) { already++; continue; }
  // A name another picture (or a file of yours) already holds gets -2, -3 …
  let path = join(outArg, `${slug(pic.title)}${ext}`);
  for (let i = 2; existsSync(path) || listed.has(path); i++) path = join(outArg, `${slug(pic.title)}-${i}${ext}`);
  let bytes;
  try {
    const res = await fetch(src, { headers, signal: AbortSignal.timeout(timeout * 1000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`pictures: could not download ${pic.title} (${e.name === "TimeoutError" ? `no answer within ${timeout}s` : e.cause?.code ?? e.message}); skipped`);
    broken++;
    continue;
  }
  writeFileSync(path, bytes);
  const lic = pic.licence;
  const line = `"${clean(name(pic.title))}"${pic.author === "unknown" ? "" : ` by ${clean(pic.author)}`}, ${lic.name}${lic.link ? `, ${lic.link}` : ""}`;
  appendFileSync(credits, [name(pic.title), path, pic.info.descriptionurl ?? "", pic.author, lic.name, lic.link, line, lic.shareAlike ? "yes" : "no"].map(clean).join("\t") + "\n");
  if (lic.shareAlike) shareAlike++;
  listed.add(path);
  known.set(key, path);
  kept++;
  console.log(`kept  ${path}  ${lic.name}  ${pic.author}`);
}
if (broken && !kept && !already) fail(`no picture could be downloaded from Commons`);
const notes = [`${kept} kept in ${outArg}`];
if (already) notes.push(`${already} already there`);
notes.push(why ? `left out: ${why}` : "none left out");
if (broken) notes.push(`${broken} failed to download`);
console.log(`${notes.join("; ")}. Credits in ${credits}.`);
if (shareAlike) console.log(`share-alike: a cropped or toned version of ${shareAlike === 1 ? "the share-alike picture" : "a share-alike picture"} must carry the same licence. The credit lines are in ${credits}.`);
