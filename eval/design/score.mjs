#!/usr/bin/env node
// Score a design run by what it left in the project, the way PRODUCT.md says to
// judge one: each doc there, the design brief complete, no source named in a
// committed doc, every screen built from the board, contrast at the brief's
// level, and a prototype a person can click through.
//
//   node eval/design/score.mjs <project> [--json] [--no-browser] [--plain <baseline>] [--other <run on another board>]
//
// --plain <baseline> (run.mjs --plain): the baseline's screens shuffled unlabelled among
// the round's, as one sheet for the owner to mark good, OK or bad (.longbeard/eval/blind/:
// sheet.png, and marks.md to fill in; the key apart, in key.json). Once marked, the marks are
// tallied by set, and the baseline's tells shown beside the round's. The same baseline
// shuffles into any later run's sheet, so rounds of different rules meet the same default.
// --other <run>: the same brief built from the other board. Its screens and this run's are
// measured alike (faces named, ground, ink, how empty, picture share, the headline's size):
// screens from two boards should be no more alike than screens of one.
// Every run: the screens' source is scanned for the common tells of generic generated pages.
//
// One line per check: PASS, FAIL or SKIP, hard or soft, and why. Exit 1 when a
// hard check fails. --no-browser skips the checks that render pages (Chrome).
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const args = process.argv.slice(2);
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const json = has("json");
const noBrowser = has("no-browser");
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
};
const plainArg = opt("plain");
const otherArg = opt("other");
const [projectArg] = args;
if (!projectArg || args.length !== 1) {
  console.error("usage: node eval/design/score.mjs <project> [--json] [--no-browser] [--plain <baseline>] [--other <run>]");
  process.exit(2);
}
const dir = resolve(projectArg);
if (!existsSync(dir)) {
  console.error(`score: no project at ${dir}`);
  process.exit(1);
}
const at = (...p) => join(dir, ...p);
// The fixture the project was built from (run.mjs --fixture records it), else the default one.
const fixtureFile = at(".longbeard/eval/fixture.txt");
const fixture = existsSync(fixtureFile) ? readFileSync(fixtureFile, "utf8").trim() : join(here, "fixture");
// The names a committed doc must never carry: the fictional studios and people on the board, the sites the person loves, and the board pictures' own names.
const sources = JSON.parse(readFileSync(join(existsSync(join(fixture, "sources.json")) ? fixture : join(here, "fixture"), "sources.json"), "utf8"));
const boardNames = readdirSync(join(fixture, "board")).filter((f) => f.endsWith(".jpg")).map((f) => f.replace(/\.jpg$/, ""));
const read = (...p) => (existsSync(at(...p)) ? readFileSync(at(...p), "utf8") : null);
// The scripts as installed in the project, so the run is judged with what it shipped; the repo's otherwise.
const script = (skill, name) => [at(".claude/skills", skill, "scripts", name), at(".agents/skills", skill, "scripts", name), join(repo, "skills", skill, "scripts", name)].find(existsSync);
const node = (file, list) => spawnSync(process.execPath, [file, ...list], { encoding: "utf8", cwd: dir });

const results = [];
const check = (id, hard, ok, detail = "") => results.push({ id, hard, status: ok === null ? "SKIP" : ok ? "PASS" : "FAIL", detail });

// ------------------------------------------------------------------ the docs
const brief = read("docs/design/design-brief.md");
const pace = /^- pace:\s*quick/m.test(brief || "") ? "quick" : "full";
const docs = ["docs/design/design-brief.md", "docs/design/design-moodboard.md", "docs/design/design-direction.md", "docs/design/design-identity.md", "docs/design/design-identity.html", "DESIGN.md"];
const missing = docs.filter((d) => !existsSync(at(d)));
check("docs", true, !missing.length, missing.length ? `missing: ${missing.join(", ")}` : `${docs.length} docs`);
if (pace === "quick") {
  const extra = ["docs/design/design-families.md", "docs/design/design-content.md"].filter((d) => existsSync(at(d)));
  check("quick: no optional skills", false, !extra.length, extra.join(", "));
}

// ------------------------------------------------------------------ the design brief
if (brief) {
  const field = (name) => brief.match(new RegExp(`^- ${name}:\\s*(.+)$`, "m"))?.[1]?.trim() || "";
  const need = ["takeaway", "first seen on", "pace", "words", "personality", "feel", "never", "apart from", "fixed", "accessibility", "motion", "voice", "decides"];
  const empty = need.filter((f) => !field(f));
  const scales = ["loud", "picture-led", "rich", "cool", "playful", "new", "dense"].filter((s) => !new RegExp(`\\b${s}\\s+[1-5]\\b`).test(field("personality")));
  const problems = [...empty.map((f) => `no ${f}`), ...(scales.length && !empty.includes("personality") ? [`personality lacks ${scales.join(", ")}`] : [])];
  if (field("apart from") && !/distance\s+[1-5]/.test(field("apart from"))) problems.push("apart from has no distance");
  if (field("accessibility") && !/^AAA?\b/.test(field("accessibility"))) problems.push(`accessibility is "${field("accessibility")}"`);
  check("design brief complete", true, !problems.length, problems.join("; "));
  const asked = read("answers.md")?.match(/^- 10\. Pace: (\w+)/m)?.[1];
  if (asked) check("design brief: their pace", false, asked === pace, `asked ${asked}, wrote ${pace}`);
} else check("design brief complete", true, false, "no design brief");
const level = /^- accessibility:\s*AAA/m.test(brief || "") ? "AAA" : "AA";

// ------------------------------------------------------------------ no source in a committed doc
const committed = [...(existsSync(at("docs/design")) ? readdirSync(at("docs/design")).map((f) => `docs/design/${f}`) : []), "DESIGN.md"].filter((f) => existsSync(at(f)));
const leaks = [];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const f of committed) {
  const text = read(f);
  for (const name of [...sources, ...boardNames]) if (new RegExp(`\\b${escape(name)}\\b`, "i").test(text)) leaks.push(`${f}: ${name}`);
  for (const path of [".longbeard/", "design-exploration/"]) if (text.includes(path)) leaks.push(`${f}: ${path}`);
  // A link is a source, except the stylesheets the identity board loads its faces from.
  for (const url of text.match(/https?:\/\/[^\s)"'<>]+/g) || []) if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) leaks.push(`${f}: ${url}`);
}
check("no source in the docs", true, !leaks.length, leaks.slice(0, 6).join("; ") + (leaks.length > 6 ? ` … ${leaks.length} in all` : ""));

// ------------------------------------------------------------------ the screens
const lib = (() => {
  try {
    return JSON.parse(read(".longbeard/design/direction/library.json") || "null");
  } catch {
    return null;
  }
})();
// Screens built from references: each names its base and its moves, all of them on the board.
const built = (() => {
  try {
    const j = JSON.parse(read(".longbeard/design/direction/screens.json") || "null");
    return j ? { list: Array.isArray(j) ? j : j.screens || [], chosen: Array.isArray(j) ? null : j.chosen ?? null } : null;
  } catch {
    return null;
  }
})();
if (!built) check("screens: a base and moves from the board", true, false, "no .longbeard/design/direction/screens.json");
else {
  const board = new Set([...(lib?.references || []).map((r) => r.name), ...boardNames]);
  // A source may carry a note after its name ("04-still-life (turned)", "subject (the brief: light only)").
  const known = (from) => [...board, "subject", "theirs"].some((name) => String(from || "").trim().startsWith(name));
  const bad = built.list.filter((sc) => !known(sc.base) || !(sc.moves || []).length || (sc.moves || []).some((m) => !known(m.from))).map((sc) => sc.n);
  check("screens: a base and moves from the board", true, built.list.length ? !bad.length : false, bad.length ? `screens ${bad.join(", ")} name no base, no move, or a source not on the board` : `${built.list.length} screens`);
  const bases = new Set(built.list.map((sc) => sc.base));
  const missed = (lib?.references || []).map((r) => r.name).filter((n) => !bases.has(n));
  check("screens: every reference a base", false, !missed.length, missed.join(", "));
  const unstated = built.list.filter((sc) => !/^(built|critiqued|fixed|failed)$/.test(sc.state || "") || !/^(quick|full)$/.test(sc.build || "") || (sc.state === "failed" && !sc.failure)).map((sc) => sc.n);
  check("screens: every screen has a recorded state", false, built.list.length ? !unstated.length : false, unstated.length ? `screens ${unstated.join(", ")} have no state, no build, or a failure with no why` : "");
  check("screens: one chosen", true, built.chosen != null || existsSync(at(".longbeard/design/direction/prototype/first.html")), built.chosen != null ? `#${built.chosen}` : "no chosen screen");
}

// The time to the first sheet: from run.mjs --agent's start to the sheet it drew. Told, not scored.
{
  const started = Number(read(".longbeard/eval/started.txt"));
  const sheet = at(".longbeard/design/direction/grid/sheet.png");
  if (started && existsSync(sheet)) check("time to the first sheet", false, null, `${((statSync(sheet).mtimeMs - started) / 60000).toFixed(1)} min`);
}

// ------------------------------------------------------------------ the direction and identity docs
const direction = read("docs/design/design-direction.md");
if (direction) {
  const five = direction.match(/^- five seconds:\s*(.+)$/m)?.[1] || "";
  check("five-second check run", false, Boolean(five) && !/not run/i.test(five), five || "no five seconds line");
}
const identity = read("docs/design/design-identity.md");
if (identity) {
  const block = identity.match(/```json identity\s*\n([\s\S]*?)```/)?.[1];
  let ok = false;
  try {
    ok = Boolean(block && JSON.parse(block));
  } catch {}
  check("identity: its json block", true, ok, block ? (ok ? "" : "does not parse") : "no ```json identity block");
}

// ------------------------------------------------------------------ DESIGN.md
const design = read("DESIGN.md");
if (design) {
  const acc = design.match(/^## Accessibility[\s\S]*?Level:\s*(AAA?)/m)?.[1];
  check("DESIGN.md: accessibility level", true, acc === level, acc ? `${acc}, brief ${level}` : "no Accessibility level");
  check("DESIGN.md: motion", false, /^## Motion/m.test(design), "");
  // Each contrast line names two tokens; their values come from the colour table.
  const value = new Map([...design.matchAll(/^\|\s*`?([a-z][\w/-]*)`?\s*\|\s*(#[0-9a-f]{3,6})\b/gim)].map((m) => [m[1], m[2]]));
  const pairs = [];
  for (const m of design.matchAll(/^-\s*`?([a-z][\w/-]*)`?\s+on\s+`?([a-z][\w/-]*)`?\s*:?(.*)$/gim)) {
    const [fg, bg] = [value.get(m[1]), value.get(m[2])];
    if (!fg || !bg) continue;
    const kind = /large/i.test(m[3]) ? ":large" : /mark|control|focus|icon|border|non-text|outline/i.test(`${m[1]} ${m[3]}`) ? ":mark" : "";
    pairs.push(`${fg} on ${bg}${kind}`);
  }
  const c = script("design-prototype", "contrast.mjs");
  if (!pairs.length) check("DESIGN.md: contrast pairs pass", true, false, "no contrast pair found on the colour tokens");
  else {
    const r = node(c, [...pairs, "--level", level]);
    const fails = r.stdout.split("\n").filter((l) => /FAIL/.test(l));
    check("DESIGN.md: contrast pairs pass", true, r.status === 0, r.status === 0 ? `${pairs.length} pairs at ${level}` : fails.join("; ") || r.stderr.trim());
  }
}

// ------------------------------------------------------------------ rendered: the chosen screen and the prototype
const min = level === "AAA" ? ["--min", "7", "--large", "4.5"] : [];
const sc = script("design-direction", "screen-contrast.mjs") || script("design-prototype", "screen-contrast.mjs");
const browser = (id, hard, run) => {
  // A skipped render returns nothing, so the caller writes no check of its own.
  if (noBrowser) return void check(id, hard, null, "--no-browser");
  const r = run();
  if (/No Chrome/.test(r.stderr)) return void check(id, hard, null, "no Chrome");
  return r;
};
const first = at(".longbeard/design/direction/prototype/first.html");
if (existsSync(first)) {
  const r = browser("chosen screen: contrast where text sits", true, () => node(sc, [pathToFileURL(first).href, "--wait-title", "ready", ...min]));
  if (r) check("chosen screen: contrast where text sits", true, r.status === 0, r.status === 0 ? "" : r.stdout.trim().split("\n").slice(0, 3).join("; ") || r.stderr.trim());
} else check("chosen screen: contrast where text sits", true, false, "no .longbeard/design/direction/prototype/first.html");

const protoDir = at(".longbeard/design/prototype");
const protoPages = existsSync(protoDir) ? readdirSync(protoDir).filter((f) => f.endsWith(".html")) : [];
if (!protoPages.length) check("prototype: pages", true, false, "no pages in .longbeard/design/prototype/");
else {
  const start = ["home.html", "index.html"].find((f) => protoPages.includes(f)) || protoPages[0];
  const keys = [...(read("docs/brief.md") || "").replace(/^[\s\S]*?## Key screens\s*\n/, "").split(/\n## /)[0].matchAll(/^- ([a-z][\w-]*):/gm)].map((m) => m[1]);
  const r = browser("prototype: links", true, () => node(script("design-prototype", "links.mjs"), [pathToFileURL(join(protoDir, start)).href, "--json", ...(keys.length ? ["--expect", keys.join(",")] : [])]));
  if (r) {
    let walk = null;
    try {
      walk = JSON.parse(r.stdout);
    } catch {}
    if (!walk) check("prototype: links", true, false, r.stderr.trim() || "links.mjs gave no result");
    else {
      const faults = [...walk.broken.map((b) => `broken ${b.from}→${b.to}`), ...walk.nowhere.map((n) => `nowhere ${n.page}: ${n.what}`), ...walk.deadEnds.map((d) => `dead end ${d}`)];
      check("prototype: links", true, !faults.length, faults.slice(0, 5).join("; ") || `${walk.pages.length} pages from ${start}`);
      check("prototype: every key screen reached", false, !walk.unreached.length, walk.unreached.length ? `unreached: ${walk.unreached.join(", ")}` : `${keys.length} key screens`);
    }
  }
  const failing = [];
  let ran = 0;
  for (const p of protoPages) {
    const r = browser("prototype: contrast where text sits", true, () => node(sc, [pathToFileURL(join(protoDir, p)).href, ...min]));
    if (!r) break;
    ran++;
    if (r.status !== 0) failing.push(`${p}: ${r.stdout.trim().split("\n")[0] || r.stderr.trim()}`);
  }
  if (ran) check("prototype: contrast where text sits", true, !failing.length, failing.slice(0, 4).join("; ") || `${ran} pages at ${level}`);
}

// ------------------------------------------------------------------ rendered: the round's screens (screens.mjs)
// Each screen of the first round: no tiny or clipped text, contrast where text sits, and no more text than its base carries and one more.
const gridIds = ["screens: no text under 12px", "screens: no clipped text", "screens: contrast on every screen", "screens: text within the base's slots"];
if (!built?.list.length) for (const id of gridIds) check(id, !id.includes("slots"), null, "no screens");
else {
  const r = browser(gridIds[0], true, () => spawnSync(process.execPath, [join(here, "screens.mjs"), dir, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  if (!r) for (const id of gridIds.slice(1)) check(id, false, null, results.at(-1).detail);
  if (r) {
    let out = null;
    try {
      out = JSON.parse(r.stdout);
    } catch {}
    if (!out) for (const id of gridIds) check(id, false, false, (r.stderr || "screens.mjs gave no result").trim().slice(0, 200));
    else {
      const g = out.summary;
      const list = (xs) => xs.slice(0, 4).join("; ") + (xs.length > 4 ? ` … ${xs.length} in all` : "");
      check(gridIds[0], true, !g.tiny.length, g.tiny.length ? list(g.tiny) : `smallest ${g.minText}px`);
      check(gridIds[1], true, !g.clipped.length, list(g.clipped));
      check(gridIds[2], true, !g.contrast.length, g.contrast.length ? list(g.contrast) : `${g.screens} screens`);
      check(gridIds[3], false, !g.overSlots.length, g.overSlots.length ? list(g.overSlots) : `blocks ${g.blocks.join(", ")}`);
    }
  }
}

// ------------------------------------------------------------------ against the default: tells, the blind sheet, sameness
// A set of screens: this run's round (screens.json), a baseline's (run.mjs --plain) or another board's run.
const screensOf = (root) => {
  const r = resolve(root);
  const plainDir = join(r, "screens");
  if (existsSync(join(r, ".longbeard/design/direction/screens.json"))) {
    let list = [];
    try {
      const j = JSON.parse(readFileSync(join(r, ".longbeard/design/direction/screens.json"), "utf8"));
      list = (Array.isArray(j) ? j : j.screens || []).map((sc) => sc.n);
    } catch {}
    return list.map((n) => ({
      n,
      html: join(r, ".longbeard/design/direction/screens", `${n}.html`),
      png: [join(r, ".longbeard/design/direction/grid", `${n}.png`), join(r, ".longbeard/eval/screens", `${n}.png`)].find(existsSync) || null,
    }));
  }
  if (!existsSync(plainDir)) return [];
  return readdirSync(plainDir)
    .filter((f) => /^\d+\.html$/.test(f))
    .map((f) => Number(f.replace(".html", "")))
    .sort((a, b) => a - b)
    .map((n) => ({ n, html: join(plainDir, `${n}.html`), png: existsSync(join(plainDir, `${n}.png`)) ? join(plainDir, `${n}.png`) : null }));
};
const hexRgb = (hex) => {
  const h = String(hex || "").replace("#", "");
  const f = h.length === 3 ? h.replace(/./g, "$&$&") : h;
  return /^[0-9a-f]{6}$/i.test(f) ? [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) : null;
};
// Hue (0-360) and saturation (0-1) of a colour, for the tells that are about colour.
const hueSat = ([r, g, b]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  if (!d) return { h: 0, s: 0 };
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(max + min - 1)) };
};
const coloursIn = (text) => [...text.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map((m) => hexRgb(m[0])).concat([...text.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)].map((m) => [m[1], m[2], m[3]].map(Number))).filter(Boolean);
// The common tells of a generic generated page, read from the screen's own source. Each is a fact, not a verdict:
// a reference on the board may use one on purpose, and the owner judges.
const TELLS = {
  "gradient text": (css) => /background-clip\s*:\s*text/i.test(css) && /gradient\(/i.test(css),
  "gradient of two hues": (css) =>
    [...css.matchAll(/(?:linear|radial|conic)-gradient\(([^;{}]*)\)/gi)].some((m) => {
      const hs = coloursIn(m[1]).map(hueSat).filter((c) => c.s > 0.35);
      return hs.some((a) => hs.some((b) => Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) > 40));
    }),
  "frosted glass": (css) => /backdrop-filter\s*:\s*(?!none)/i.test(css),
  "soft drop shadow": (css) => [...css.matchAll(/box-shadow\s*:([^;}]*)/gi)].some((m) => !/none/.test(m[1]) && /\b\d+(?:px)?\s+\d+(?:px)?\s+(?:[1-9]\d|\d{3,})px/.test(m[1])),
  "pill shape": (css) => /border-radius\s*:\s*(?:9{3,}|[1-9]\d{3,})px|border-radius\s*:\s*(?:100|50)vh/i.test(css),
  "rounded card with shadow": (css) =>
    css.split("}").some((rule) => /border-radius\s*:\s*(?:[89]|[12]\d|3[0-2])px/i.test(rule) && /box-shadow\s*:\s*(?!none)/i.test(rule)),
  "default face": (css, _text, page) =>
    [...css.matchAll(/font-family\s*:\s*([^;}]+)/gi), ...css.matchAll(/--[\w-]*(?:font|face)[\w-]*\s*:\s*([^;}]+)/gi), ...page.matchAll(/\b(?:face|body)\s*:\s*("[^"]+")/g)].some((m) => /^\s*["']?(?:Inter|Roboto|Open Sans|Poppins|Montserrat|Lato|system-ui|-apple-system|Arial|Helvetica)\b/i.test(m[1])),
  "violet accent": (css) => coloursIn(css).map(hueSat).some((c) => c.s > 0.4 && c.h >= 245 && c.h <= 290),
  "tracked caps label": (css) =>
    css.split("}").some((rule) => /text-transform\s*:\s*uppercase/i.test(rule) && /letter-spacing\s*:\s*(?:0?\.(?:1[2-9]|[2-9])\d*em|[2-9](?:\.\d+)?px)/i.test(rule)),
  emoji: (_css, text) => /\p{Extended_Pictographic}/u.test(text),
  "stock marketing words": (_css, text) => /\b(?:elevate|seamless(?:ly)?|unlock|empower|delve|journey|discover the|experience the|crafted with (?:love|care)|welcome to|artisanal)\b/i.test(text),
};
const sourceOf = (html) => {
  const page = existsSync(html) ? readFileSync(html, "utf8") : "";
  const css = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n") + [...page.matchAll(/style="([^"]*)"/gi)].map((m) => `x{${m[1]}}`).join("\n");
  const text = page.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return { page, css, text };
};
const tellsOf = (sc) => {
  const { css, text, page } = sourceOf(sc.html);
  return Object.entries(TELLS).filter(([, test]) => test(css, text, page)).map(([name]) => name);
};
const tallyTells = (set) => {
  const per = set.map((sc) => tellsOf(sc));
  const count = {};
  for (const list of per) for (const t of list) count[t] = (count[t] || 0) + 1;
  return { screens: set.length, withAny: per.filter((l) => l.length).length, count };
};
const sayTells = (t) => `${t.withAny}/${t.screens} screens carry one${Object.keys(t.count).length ? ` (${Object.entries(t.count).map(([k, v]) => `${k} ${v}`).join(", ")})` : ""}`;

const round = screensOf(dir);
const mine = round.length ? tallyTells(round) : null;
const plainSet = plainArg ? screensOf(plainArg) : [];
if (plainArg && !plainSet.length) check("blind: the baseline's screens", false, false, `no screens/<n>.html in ${plainArg}`);

// The blind sheet: the round and the baseline, shuffled, numbered only. Made once; the key and the marks stay with it.
// A mark is its first word; "OK-ish" is OK, and anything after it is the owner's note.
const blind = at(".longbeard/eval/blind");
let marked = null;
if (plainSet.length && round.length) {
  let key = null;
  try {
    key = JSON.parse(readFileSync(join(blind, "key.json"), "utf8"));
  } catch {}
  if (!key) {
    const items = [...round.map((sc) => ({ set: "round", n: sc.n, png: sc.png })), ...plainSet.map((sc) => ({ set: "baseline", n: sc.n, png: sc.png }))].filter((x) => x.png);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    mkdirSync(blind, { recursive: true });
    key = items.map((x, i) => ({ tile: String(i + 1).padStart(2, "0"), set: x.set, n: x.n, from: x.png }));
    for (const k of key) copyFileSync(k.from, join(blind, `${k.tile}.png`));
    writeFileSync(join(blind, "key.json"), `${JSON.stringify(key, null, 1)}\n`);
    writeFileSync(join(blind, "marks.md"), `# Marks\n\nOne word after each number: good, OK or bad. Judge each as the product's first screen, as a visitor would meet it.\n\n${key.map((k) => `- ${Number(k.tile)}:`).join("\n")}\n`);
    const sheet = script("design-direction", "sheet.mjs");
    spawnSync(process.execPath, [sheet, join(blind, "sheet.html"), "--cols", "4", ...key.map((k) => join(blind, `${k.tile}.png`))], { encoding: "utf8" });
    if (!noBrowser) spawnSync(process.execPath, [script("design-direction", "capture.mjs"), pathToFileURL(join(blind, "sheet.html")).href, "--out", join(blind, "sheet.png")], { encoding: "utf8" });
  }
  const marks = new Map([...(read(".longbeard/eval/blind/marks.md") || "").matchAll(/^- (\d+):\s*(good|ok\w*|bad)\b/gim)].map((m) => [m[1].padStart(2, "0"), m[2].toLowerCase().startsWith("ok") ? "ok" : m[2].toLowerCase()]));
  if (marks.size < key.length) check("blind: the owner's marks", false, null, `${marks.size}/${key.length} marked: fill in ${join(blind, "marks.md")} beside sheet.png`);
  else {
    marked = {};
    for (const k of key) {
      const set = (marked[k.set] ||= { good: 0, ok: 0, bad: 0, of: 0 });
      set[marks.get(k.tile)]++;
      set.of++;
    }
    const share = (s, w) => (s ? s[w] / s.of : 0);
    const say = (name) => (marked[name] ? `${name} ${marked[name].good} good · ${marked[name].ok} OK · ${marked[name].bad} bad` : `${name} none`);
    const ahead = share(marked.round, "good") >= share(marked.baseline, "good") && share(marked.round, "bad") <= share(marked.baseline, "bad");
    check("blind: the owner's marks", false, ahead, `${say("round")}; ${say("baseline")}`);
  }
}
// The tells: the round's always; the baseline's only once the marks are in, so nothing hints which tiles are which.
if (mine) {
  if (marked && plainSet.length) {
    const theirs = tallyTells(plainSet);
    check("tells of a generic page", false, mine.withAny / mine.screens <= theirs.withAny / theirs.screens, `round: ${sayTells(mine)}; baseline: ${sayTells(theirs)}`);
  } else check("tells of a generic page", false, mine.withAny === 0, `${sayTells(mine)}${plainSet.length ? "; the baseline's held until the marks are in" : ""}`);
}

// Sameness: the same brief from two boards, measured alike. Each pair's distance is the mean of what both have measured.
if (otherArg && round.length) {
  const other = screensOf(otherArg);
  const sets = { a: round, b: other, plain: plainSet };
  const all = Object.values(sets).flat().filter((sc) => sc.png);
  const measureScript = join(repo, "skills/design-families/scripts/measure.mjs");
  const m = noBrowser ? null : spawnSync(process.execPath, [measureScript, ...all.map((sc) => sc.png)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 600000 });
  let measured = [];
  try {
    measured = [JSON.parse(m?.stdout || "null")].flat().filter(Boolean);
  } catch {}
  if (!other.length) check("sameness across boards", false, false, `no screens in ${otherArg}`);
  else if (!measured.length) check("sameness across boards", false, null, noBrowser ? "--no-browser" : (m?.stderr || "measure.mjs gave nothing").trim().slice(0, 200));
  else {
    const byPng = new Map(measured.map((x, i) => [resolve(x.target || all[i].png), x]));
    const generic = /^(serif|sans-serif|monospace|cursive|system-ui|inherit|initial|var\(.*)$/i;
    const facesOf = (sc) => {
      const { page } = sourceOf(sc.html);
      // A built screen names its faces in LOOK (face, body); a plain page in its font links and CSS.
      const names = [
        ...[...page.matchAll(/\b(?:face|body)\s*:\s*"([^"]+)"/g)].map((x) => x[1]),
        ...[...page.matchAll(/family=([^&"':]+)/g)].map((x) => decodeURIComponent(x[1].replace(/\+/g, " ")).trim()),
        ...[...page.matchAll(/font-family\s*:\s*([^;}"]+)/gi), ...page.matchAll(/--[\w-]*(?:font|face)[\w-]*\s*:\s*([^;}]+)/gi)].flatMap((x) => x[1].split(",")).map((f) => f.trim().replace(/^["']|["']$/g, "")),
      ];
      return new Set(names.filter((f) => f && !generic.test(f) && !/[${}()]/.test(f)).map((f) => f.toLowerCase()));
    };
    const feat = (sc) => {
      const x = byPng.get(resolve(sc.png)) || measured[all.indexOf(sc)];
      return x && { ground: hexRgb(x.traits?.ground), ink: hexRgb(x.traits?.ink), empty: x.traits?.empty, figure: x.figure?.share, size: x.type?.display?.px1440, faces: facesOf(sc) };
    };
    const rgbGap = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) / 441.7;
    // How unlike two screens are, 0 to 1: the mean of what both have measured.
    const gap = (p, q) => {
      const parts = [
        p.ground && q.ground && rgbGap(p.ground, q.ground),
        p.ink && q.ink && rgbGap(p.ink, q.ink),
        p.empty != null && q.empty != null && Math.abs(p.empty - q.empty) / 100,
        p.figure != null && q.figure != null && Math.abs(p.figure - q.figure) / 100,
        p.size && q.size && Math.min(1, Math.abs(Math.log(p.size / q.size)) / Math.log(4)),
        p.faces.size && q.faces.size && 1 - [...p.faces].filter((f) => q.faces.has(f)).length / new Set([...p.faces, ...q.faces]).size,
      ].filter((v) => typeof v === "number");
      return parts.length ? parts.reduce((s, v) => s + v, 0) / parts.length : null;
    };
    const F = Object.fromEntries(Object.entries(sets).map(([k, list]) => [k, list.filter((sc) => sc.png).map((sc) => ({ sc, f: feat(sc) })).filter((x) => x.f)]));
    const like = (xs, ys, same) => {
      const out = [];
      xs.forEach((x, i) => ys.forEach((y, j) => (!same || j > i) && out.push({ x: x.sc, y: y.sc, s: 1 - gap(x.f, y.f) })));
      return out.filter((p) => Number.isFinite(p.s));
    };
    const mean = (ps) => (ps.length ? ps.reduce((s, p) => s + p.s, 0) / ps.length : null);
    const withinA = like(F.a, F.a, true), withinB = like(F.b, F.b, true), cross = like(F.a, F.b, false), withinPlain = like(F.plain, F.plain, true);
    const shared = [...new Set(F.a.flatMap((x) => [...x.f.faces]))].filter((f) => F.b.some((y) => y.f.faces.has(f)));
    const closest = [...cross].sort((p, q) => q.s - p.s).slice(0, 3);
    // The closest pairs, side by side, for the owner to look at: the number is a measure, the eye decides.
    const out = at(".longbeard/eval/sameness");
    mkdirSync(out, { recursive: true });
    spawnSync(process.execPath, [script("design-direction", "sheet.mjs"), join(out, "closest.html"), "--cols", "2", ...closest.flatMap((p) => [p.x.png, p.y.png])], { encoding: "utf8" });
    const f2 = (v) => (v == null ? "–" : v.toFixed(2));
    writeFileSync(join(out, "sameness.json"), `${JSON.stringify({ withinA: mean(withinA), withinB: mean(withinB), cross: mean(cross), withinBaseline: mean(withinPlain), sharedFaces: shared, closest: closest.map((p) => ({ a: p.x.n, b: p.y.n, similarity: p.s })) }, null, 1)}\n`);
    const ok = mean(cross) <= Math.min(mean(withinA), mean(withinB));
    check("sameness across boards", false, ok, `alike, 0–1: within this board ${f2(mean(withinA))}, within the other ${f2(mean(withinB))}, across ${f2(mean(cross))}${withinPlain.length ? `, the baseline within itself ${f2(mean(withinPlain))}` : ""}; closest across: ${closest.map((p) => `${p.x.n}~${p.y.n} ${f2(p.s)}`).join(", ")}; faces on both boards: ${shared.join(", ") || "none"}`);
  }
}

// ------------------------------------------------------------------ the run's own log
const log = read("eval-log.md");
if (log === null) check("eval log", false, false, "no eval-log.md");
else {
  const uncovered = (log.match(/\*\*uncovered\*\*/gi) || []).length;
  const stuck = log.split("\n").filter((l) => /could not follow|couldn't follow|unclear/i.test(l));
  check("eval log: skills followed as written", false, !stuck.length, stuck.length ? stuck.slice(0, 3).map((l) => l.trim()).join(" | ") : `${uncovered} uncovered answer${uncovered === 1 ? "" : "s"}`);
}

// ------------------------------------------------------------------ say it
const counted = results.filter((r) => r.status !== "SKIP");
const passed = counted.filter((r) => r.status === "PASS").length;
const hardFails = results.filter((r) => r.hard && r.status === "FAIL");
if (json) console.log(JSON.stringify({ pace, level, score: `${passed}/${counted.length}`, hardFails: hardFails.length, results }, null, 1));
else {
  for (const r of results) console.log(`${r.status.padEnd(5)}${(r.hard ? "hard" : "soft").padEnd(6)}${r.id}${r.detail ? `: ${r.detail}` : ""}`);
  console.log(`score: ${passed}/${counted.length} (pace ${pace}, ${level})${hardFails.length ? `, ${hardFails.length} hard fail${hardFails.length > 1 ? "s" : ""}` : ""}`);
}
process.exit(hardFails.length ? 1 : 0);
