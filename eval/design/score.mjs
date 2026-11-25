#!/usr/bin/env node
// Score a design run by what it left in the project, the way CONTRIBUTING.md says to
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
// One line per check: PASS, FAIL, SKIP or NOT RUN, hard or soft, and why. A score counts only the
// checks that ran: a check that crashed or could not run (no Chrome, a script with no result) is NOT RUN,
// never a pass and never demoted to soft, and a hard one fails the run like a hard FAIL. SKIP is
// only what was asked for (--no-browser) or has nothing to check. Exit 1 when a hard check fails or
// did not run.
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
// A short run renders offline with the fixture's faces (run.mjs --short): score it in the same Chrome.
if (existsSync(at(".longbeard/eval/chrome")) && process.env.CHROME_PATH !== "none") process.env.CHROME_PATH = at(".longbeard/eval/chrome");
// The fixture the project was built from (run.mjs --fixture records it), else the default one. The recorded
// path may be another checkout's: when it is not here, the same folder of this checkout's eval/design.
const fixtureFile = at(".longbeard/eval/fixture.txt");
const recorded = existsSync(fixtureFile) ? readFileSync(fixtureFile, "utf8").trim() : "";
const fixture = recorded ? (existsSync(recorded) ? recorded : join(here, recorded.split(/[\\/]+/).filter(Boolean).pop())) : join(here, "fixture");
// The names a committed doc must never carry: the fictional studios and people on the board, the sites the person loves, and the board pictures' own names.
let sources = [], boardNames = [], fixtureError = "";
try {
  sources = JSON.parse(readFileSync(join(existsSync(join(fixture, "sources.json")) ? fixture : join(here, "fixture"), "sources.json"), "utf8"));
  // A fixture whose pictures are fetched (board.json) names them there, fetched or not.
  const files = existsSync(join(fixture, "board.json")) ? JSON.parse(readFileSync(join(fixture, "board.json"), "utf8")).map((r) => r.file) : readdirSync(join(fixture, "board"));
  boardNames = files.filter((f) => f.endsWith(".jpg")).map((f) => f.replace(/\.jpg$/, ""));
} catch (e) {
  fixtureError = `the fixture ${recorded || fixture} could not be read: ${e.message}`;
}
const read = (...p) => (existsSync(at(...p)) ? readFileSync(at(...p), "utf8") : null);
// The scripts as installed in the project, so the run is judged with what it shipped; the repo's otherwise.
const script = (skill, name) => [at(".claude/skills", skill, "scripts", name), at(".agents/skills", skill, "scripts", name), join(repo, "skills", skill, "scripts", name)].find(existsSync);
const node = (file, list) => spawnSync(process.execPath, [file, ...list], { encoding: "utf8", cwd: dir });

const results = [];
// A first-round run (run.mjs --from or --short) stops at the first sheet: what comes after it is not its to have.
const firstRound = existsSync(at(".longbeard/eval/first-round.txt"));
const later = /^(screens: one chosen|chosen screen|prototype|identity|DESIGN\.md|still to supply)/i;
const skipLater = (id) => firstRound && later.test(id) && (results.push({ id, hard: false, status: "SKIP", detail: "a first-round run" }), true);
const check = (id, hard, ok, detail = "") => skipLater(id) || results.push({ id, hard, status: ok === null ? "SKIP" : ok ? "PASS" : "FAIL", detail });
// A check that could not run: not counted in the score, and a hard one fails the run.
const notRun = (id, hard, detail = "") => skipLater(id) || results.push({ id, hard, status: "NOT RUN", detail });
// What a spawned checker said: 0 is a pass; 1 is a fail only when it printed what failed (stdout), since a
// crash also exits 1 but says nothing there; any other exit, a signal or a missing script did not run.
const outcome = (r, hasFindings = (out) => out.trim().length > 0) => {
  if (!r || r.error || r.status === null || r.status === undefined) return { ran: false, why: (r?.error?.message || (r && `ended by ${r.signal || "a signal"}`) || "no script to run") };
  if (r.status === 0) return { ran: true, pass: true };
  if (r.status === 1 && hasFindings(r.stdout || "") && !/No Chrome/.test(r.stderr || "")) return { ran: true, pass: false };
  // Say why in one line: the error the checker named, else the last thing it said.
  const lines = (r.stderr || r.stdout || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return { ran: false, why: `exit ${r.status}: ${(lines.find((l) => /^(\w*Error\b|[\w-]+:\s)/.test(l)) || lines.at(-1) || "no output").slice(0, 160)}` };
};

// ------------------------------------------------------------------ the docs
const brief = read("docs/design/design-brief.md");
const pace = /^- pace:\s*quick/m.test(brief || "") ? "quick" : "full";
const docs = ["docs/design/design-brief.md", "docs/design/design-moodboard.md", ...(firstRound ? [] : ["docs/design/design-direction.md", "docs/design/design-identity.md", "docs/design/design-identity.html", "DESIGN.md"])];
const missing = docs.filter((d) => !existsSync(at(d)));
check("docs", true, !missing.length, missing.length ? `missing: ${missing.join(", ")}` : `${docs.length} docs`);
if (pace === "quick") {
  const extra = ["docs/design/design-content.md"].filter((d) => existsSync(at(d)));
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
  if (field("motion") && !/^(none|quiet|present|leading)\b/i.test(field("motion"))) problems.push(`motion is "${field("motion")}"`);
  check("design brief complete", true, !problems.length, problems.join("; "));
  const asked = read("answers.md")?.match(/^- 10\. Pace: (\w+)/m)?.[1];
  if (asked) check("design brief: their pace", false, asked === pace, `asked ${asked}, wrote ${pace}`);
} else check("design brief complete", true, false, "no design brief");
const level = /^- accessibility:\s*AAA/m.test(brief || "") ? "AAA" : "AA";

// ------------------------------------------------------------------ no source in a committed doc
const committed = [...(existsSync(at("docs/design")) ? readdirSync(at("docs/design")).map((f) => `docs/design/${f}`) : []), "DESIGN.md"].filter((f) => existsSync(at(f)));
const leaks = [];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A name is matched as written (case and all) and as a whole word, so a name that is also a plain word
// ("calma", "still practice") trips only on the name as the board draws it, never on ordinary use.
const nameIn = (name, text) => new RegExp(`(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`, "u").test(text);
for (const f of committed) {
  const text = read(f);
  for (const name of [...sources, ...boardNames]) if (nameIn(name, text)) leaks.push(`${f}: ${name}`);
  for (const path of [".longbeard/", "design-exploration/"]) if (text.includes(path)) leaks.push(`${f}: ${path}`);
  // A link is a source, except the stylesheets the identity board loads its faces from.
  for (const url of text.match(/https?:\/\/[^\s)"'<>]+/g) || []) if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) leaks.push(`${f}: ${url}`);
}
if (fixtureError) notRun("no source in the docs", true, fixtureError);
else check("no source in the docs", true, !leaks.length, leaks.slice(0, 6).join("; ") + (leaks.length > 6 ? ` … ${leaks.length} in all` : ""));

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
  const unstated = built.list.filter((sc) => !/^(built|failed)$/.test(sc.state || "") || (sc.state === "failed" && !sc.failure)).map((sc) => sc.n);
  check("screens: every screen has a recorded state", false, built.list.length ? !unstated.length : false, unstated.length ? `screens ${unstated.join(", ")} have no state, or a failure with no why` : "");
  check("screens: one chosen", true, built.chosen != null || existsSync(at(".longbeard/design/direction/prototype/first.html")), built.chosen != null ? `#${built.chosen}` : "no chosen screen");
}

// The time to the first sheet: from run.mjs --agent's start to the sheet it drew. Told, not scored.
{
  const started = Number(read(".longbeard/eval/started.txt"));
  const sheet = at(".longbeard/design/direction/grid/sheet.png");
  if (started && existsSync(sheet)) check("time to the first sheet", false, null, `${((statSync(sheet).mtimeMs - started) / 60000).toFixed(1)} min`);
}

// ------------------------------------------------------------------ the direction and identity docs
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
  // A colour the person liked and kept under the level is written `WARN liked, kept`: a soft warning, not a hard fail.
  const kept = [];
  for (const m of design.matchAll(/^-\s*`?([a-z][\w/-]*)`?\s+on\s+`?([a-z][\w/-]*)`?\s*:?(.*)$/gim)) {
    const [fg, bg] = [value.get(m[1]), value.get(m[2])];
    if (!fg || !bg) continue;
    if (/WARN\s+liked,\s*kept/i.test(m[3])) {
      kept.push(`${m[1]} on ${m[2]}`);
      continue;
    }
    const kind = /large/i.test(m[3]) ? ":large" : /mark|control|focus|icon|border|non-text|outline/i.test(`${m[1]} ${m[3]}`) ? ":mark" : "";
    pairs.push(`${fg} on ${bg}${kind}`);
  }
  if (kept.length) check("DESIGN.md: liked colours kept under the level", false, false, `warned, not failed: ${kept.join("; ")}`);
  const c = script("design-prototype", "contrast.mjs");
  if (!pairs.length) check("DESIGN.md: contrast pairs pass", true, false, "no contrast pair found on the colour tokens");
  else if (!c) notRun("DESIGN.md: contrast pairs pass", true, "no contrast.mjs to run");
  else {
    const r = node(c, [...pairs, "--level", level]);
    const o = outcome(r, (out) => /FAIL/.test(out));
    if (!o.ran) notRun("DESIGN.md: contrast pairs pass", true, o.why);
    else {
      const fails = r.stdout.split("\n").filter((l) => /FAIL/.test(l));
      check("DESIGN.md: contrast pairs pass", true, o.pass, o.pass ? `${pairs.length} pairs at ${level}` : fails.join("; "));
    }
  }
  // The token block at the top is a copy of the tables: tokens.mjs --check exits 0 when they agree, 1 (with what differs, or "no front matter") when not, and 2 when the tables cannot be read.
  const tk = script("design-prototype", "tokens.mjs") || script("design-check", "tokens.mjs");
  if (!tk) notRun("DESIGN.md: token block agrees with its tables", true, "no tokens.mjs to run");
  else {
    const r = node(tk, [at("DESIGN.md"), "--check"]);
    const o = outcome(r);
    const said = (r.stdout || "").trim().replace(`${at("DESIGN.md")}: `, "");
    if (!o.ran) notRun("DESIGN.md: token block agrees with its tables", true, o.why);
    else check("DESIGN.md: token block agrees with its tables", true, o.pass, o.pass ? said : said.split("\n").slice(0, 4).join("; "));
  }
}
// What links.mjs found on the prototype, for the Still to supply check below: { walk }, { skip }, or { why } when it did not run.
let walked = { why: "no prototype pages" };

// ------------------------------------------------------------------ rendered: the chosen screen and the prototype
// Rendering needs Chrome. --no-browser skips these on purpose; no Chrome, or a checker that crashed, is NOT RUN.
const min = level === "AAA" ? ["--min", "7", "--large", "4.5"] : [];
const sc = script("design-direction", "screen-contrast.mjs") || script("design-prototype", "screen-contrast.mjs");
// Runs a rendering check unless --no-browser (a skip, and nothing returned); the caller judges what it returns.
const browser = (id, hard, run) => {
  if (noBrowser) return void check(id, hard, null, "--no-browser");
  return run();
};
// screen-contrast.mjs: exit 0 passes, 1 means a text is under (it lists them on stdout), anything else did not run.
const contrastWhy = (page, extra = []) => {
  const r = node(sc, [pathToFileURL(page).href, ...extra, ...min]);
  return { o: outcome(r), r };
};
const first = at(".longbeard/design/direction/prototype/first.html");
if (existsSync(first)) {
  const got = browser("chosen screen: contrast where text sits", true, () => (sc ? contrastWhy(first, ["--wait-title", "ready"]) : { o: { ran: false, why: "no screen-contrast.mjs to run" } }));
  if (got) {
    if (!got.o.ran) notRun("chosen screen: contrast where text sits", true, got.o.why);
    else check("chosen screen: contrast where text sits", true, got.o.pass, got.o.pass ? "" : got.r.stdout.trim().split("\n").slice(0, 3).join("; "));
  }
} else check("chosen screen: contrast where text sits", true, false, "no .longbeard/design/direction/prototype/first.html");

const protoDir = at(".longbeard/design/prototype");
const protoPages = existsSync(protoDir) ? readdirSync(protoDir).filter((f) => f.endsWith(".html")) : [];
if (!protoPages.length) check("prototype: pages", true, false, "no pages in .longbeard/design/prototype/");
else {
  const start = ["home.html", "index.html"].find((f) => protoPages.includes(f)) || protoPages[0];
  const linksScript = script("design-prototype", "links.mjs");
  walked = { skip: true };
  const r = browser("prototype: links", true, () => (linksScript ? node(linksScript, [pathToFileURL(join(protoDir, start)).href, "--json"]) : { error: new Error("no links.mjs to run") }));
  if (r) {
    // links.mjs exits 0 or 1 with a walk on stdout; anything else, or no walk, did not run.
    let walk = null;
    try {
      walk = JSON.parse(r.stdout);
    } catch {}
    if (!walk || (r.status !== 0 && r.status !== 1) || !Array.isArray(walk.pages)) {
      walked = { why: (r.error?.message || r.stderr || "links.mjs gave no result").trim().slice(0, 200) };
      notRun("prototype: links", true, walked.why);
    } else {
      walked = { walk };
      const faults = [...walk.broken.map((b) => `broken ${b.from}→${b.to}`), ...walk.nowhere.map((n) => `nowhere ${n.page}: ${n.what}`), ...walk.deadEnds.map((d) => `dead end ${d}`)];
      check("prototype: links", true, !faults.length, faults.slice(0, 5).join("; ") || `${walk.pages.length} pages scanned`);
    }
  }
  const failing = [], didNot = [];
  let ran = 0;
  for (const p of protoPages) {
    const got = browser("prototype: contrast where text sits", true, () => (sc ? contrastWhy(join(protoDir, p)) : { o: { ran: false, why: "no screen-contrast.mjs to run" } }));
    if (!got) break;
    if (!got.o.ran) didNot.push(`${p}: ${got.o.why}`);
    else {
      ran++;
      if (!got.o.pass) failing.push(`${p}: ${got.r.stdout.trim().split("\n")[0]}`);
    }
  }
  // A page that failed is a fail; otherwise a page that did not run leaves the check not run, never passed on the others' word.
  if (failing.length) check("prototype: contrast where text sits", true, false, failing.slice(0, 4).join("; "));
  else if (didNot.length) notRun("prototype: contrast where text sits", true, `${didNot.length} of ${protoPages.length} pages did not run: ${didNot.slice(0, 2).join("; ")}`);
  else if (ran) check("prototype: contrast where text sits", true, true, `${ran} pages at ${level}`);
}

// A finished run lists its stand-ins: DESIGN.md has a Still to supply section, and where the prototype marks stand-ins it is not the "Nothing" line.
if (design) {
  const id = "DESIGN.md: still to supply lists the stand-ins";
  const section = design.match(/^## Still to supply[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1];
  const listed = (section || "").split("\n").map((l) => l.trim()).filter((l) => l && !/^[-*]?\s*"?nothing\b/i.test(l)).length;
  if (section === undefined) check(id, false, false, "no Still to supply section");
  else if (walked.walk) {
    const n = (walked.walk.standins || []).length;
    check(id, false, !n || listed > 0, n ? (listed ? `${n} stand-ins marked, ${listed} listed` : `${n} stand-ins marked in the prototype, the section says nothing`) : "none marked in the prototype");
  } else if (walked.skip) check(id, false, null, "--no-browser");
  else notRun(id, false, walked.why);
}

// ------------------------------------------------------------------ rendered: the round's screens (screens.mjs)
// Each screen of the first round: no tiny or clipped text, contrast where text sits, and no more text than its base carries and one more.
const gridIds = ["screens: no text under 12px", "screens: no clipped text", "screens: contrast on every screen", "screens: text within the base's slots"];
const gridHard = [true, true, true, false];
if (!built?.list.length) for (const [i, id] of gridIds.entries()) check(id, gridHard[i], null, "no screens");
else {
  const r = browser(gridIds[0], true, () => spawnSync(process.execPath, [join(here, "screens.mjs"), dir, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  if (!r) {
    for (const [i, id] of gridIds.entries()) if (i) check(id, gridHard[i], null, "--no-browser");
  } else {
    // screens.mjs exits 0 with its result; anything else, or output that is not a result, did not run.
    let out = null;
    try {
      out = JSON.parse(r.stdout);
    } catch {}
    if (r.status !== 0 || !out?.summary) for (const [i, id] of gridIds.entries()) notRun(id, gridHard[i], (r.error?.message || r.stderr || "screens.mjs gave no result").trim().slice(0, 200));
    else {
      const g = out.summary;
      const list = (xs) => xs.slice(0, 4).join("; ") + (xs.length > 4 ? ` … ${xs.length} in all` : "");
      const unread = g.notRead || [], contrastGone = g.contrastNotRun || [];
      // A finding is a fail; no finding on a screen that could not be read is not a pass.
      const judge = (i, found, say, notes) => {
        if (found.length) check(gridIds[i], gridHard[i], false, list(found));
        else if (notes.length) notRun(gridIds[i], gridHard[i], `${notes.length} screen${notes.length === 1 ? "" : "s"} did not run: ${list(notes)}`);
        else check(gridIds[i], gridHard[i], true, say);
      };
      judge(0, g.tiny, `smallest ${g.minText}px`, unread);
      judge(1, g.clipped, "", unread);
      // A colour they liked may stay under the level with its warning (grid.md): the screen's fault names it as
      // liked, with its ratio. That is a warning here too; any other text under the level is a fail.
      const faultOf = new Map(built.list.map((e) => [Number(e.n), String(e.fault || "")]));
      const liked = [], under = [];
      for (const sc of out.screens || []) for (const t of sc.contrast?.under || []) {
        const fault = faultOf.get(Number(sc.n)) || "";
        (/\bliked\b/i.test(fault) && fault.includes(`${t.ratio}:1`) ? liked : under).push(`${sc.n}: "${t.text}" ${t.ratio}:1`);
      }
      judge(2, out.screens?.some((sc) => sc.contrast?.under) ? under : g.contrast, `${g.screens} screens${liked.length ? `, ${liked.length} liked under the level` : ""}`, contrastGone);
      if (liked.length) check("screens: liked colours kept under the level", false, false, `warned, not failed: ${list(liked)}`);
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
const coloursIn = (text) => [...text.matchAll(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b|#[0-9a-f]{3}\b/gi)].map((m) => hexRgb(m[0])).concat([...text.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)].map((m) => [m[1], m[2], m[3]].map(Number))).filter(Boolean);
// The common tells of a generic generated page, read from the screen's own source. Each is a fact, not a verdict:
// a reference on the board may use one on purpose, and the owner judges.
// Emoji as a person sees them: drawn as a picture by default (Emoji_Presentation), or asked for with the
// emoji selector. Not ©, ® or ™, nor the arrows, which are text however a font draws them.
const hasEmoji = (text) => /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u.test(text.replace(/[\u00A9\u00AE\u2122\u203C\u2049\u2190-\u21FF\u27A1\u2900-\u297F\u2B05-\u2B07]\uFE0F?/g, " "));
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
  emoji: (_css, text) => hasEmoji(text),
  "stock marketing words": (_css, text) => /\b(?:elevate|seamless(?:ly)?|unlock|empower|delve|journey|discover the|experience the|crafted with (?:love|care)|welcome to|artisanal)\b/i.test(text),
};
// A screen built from the template keeps its colours in a LOOK object in script (ground, ink, accent, more: {…}),
// and its CSS refers to them as var(--ground) and the like. The object's text, found by its braces.
const lookOf = (page) => {
  const at = page.search(/\bLOOK\s*=\s*\{/);
  if (at < 0) return "";
  let depth = 0, quote = "";
  for (let i = page.indexOf("{", at); i < page.length; i++) {
    const c = page[i];
    if (quote) quote = c === quote && page[i - 1] !== "\\" ? "" : quote;
    else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{" && ++depth) continue;
    else if (c === "}" && !--depth) return page.slice(page.indexOf("{", at), i + 1);
  }
  return "";
};
const sourceOf = (html) => {
  const page = existsSync(html) ? readFileSync(html, "utf8") : "";
  let css = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n") + [...page.matchAll(/style="([^"]*)"/gi)].map((m) => `x{${m[1]}}`).join("\n");
  // The colours LOOK names, by role: put in the CSS where a variable stands, and listed once so a colour the CSS never
  // spells out (a violet accent set only there) is still read. A colour in LOOK is one the screen renders with.
  const named = new Map([...lookOf(page).matchAll(/["']?([\w-]+)["']?\s*:\s*["'](#[0-9a-f]{3,8}|rgba?\([^"']*\))["']/gi)].map((m) => [m[1], m[2]]));
  for (const [name, colour] of named) css = css.replaceAll(new RegExp(`var\\(\\s*--${escape(name)}\\s*\\)`, "g"), colour);
  if (named.size) css += `\nlook{colours:${[...named.values()].join(" ")}}`;
  const text = page.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&[a-z]+;/gi, " ");
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
  const measureScript = join(repo, "skills/design-moodboard/scripts/measure.mjs");
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
// The score counts what ran. A hard check that failed, or did not run, fails the run.
const counted = results.filter((r) => r.status === "PASS" || r.status === "FAIL");
const passed = counted.filter((r) => r.status === "PASS").length;
const notRan = results.filter((r) => r.status === "NOT RUN");
const hardFails = results.filter((r) => r.hard && (r.status === "FAIL" || r.status === "NOT RUN"));
const tail = `${hardFails.length ? `, ${hardFails.length} hard fail${hardFails.length > 1 ? "s" : ""} or not run` : ""}${notRan.length ? `, ${notRan.length} not run` : ""}`;
if (json) console.log(JSON.stringify({ pace, level, score: `${passed}/${counted.length}`, hardFails: hardFails.length, notRun: notRan.length, results }, null, 1));
else {
  for (const r of results) console.log(`${r.status.padEnd(8)}${(r.hard ? "hard" : "soft").padEnd(6)}${r.id}${r.detail ? `: ${r.detail}` : ""}`);
  console.log(`score: ${passed}/${counted.length} (pace ${pace}, ${level})${tail}`);
}
process.exit(hardFails.length ? 1 : 0);
