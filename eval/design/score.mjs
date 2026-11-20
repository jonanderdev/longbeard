#!/usr/bin/env node
// Score a design run by what it left in the project, the way PRODUCT.md says to
// judge one: each doc there, the design brief complete, no source named in a
// committed doc, every dealt screen from three references, contrast at the
// brief's level, and a prototype a person can click through.
//
//   node eval/design/score.mjs <project> [--json] [--no-browser]
//
// One line per check: PASS, FAIL or SKIP, hard or soft, and why. Exit 1 when a
// hard check fails. --no-browser skips the checks that render pages (Chrome).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
const [projectArg] = args;
if (!projectArg || args.length !== 1) {
  console.error("usage: node eval/design/score.mjs <project> [--json] [--no-browser]");
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

// ------------------------------------------------------------------ the deal
const lib = (() => {
  try {
    return JSON.parse(read(".longbeard/design/direction/library.json") || "null");
  } catch {
    return null;
  }
})();
const deal = (() => {
  try {
    return JSON.parse(read(".longbeard/design/direction/deal.json") || "null");
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
if (built) {
  const board = new Set([...(lib?.references || []).map((r) => r.name), ...boardNames]);
  // A source may carry a note after its name ("04-still-life (turned)", "subject (the brief: light only)").
  const known = (from) => [...board, "subject", "theirs"].some((name) => String(from || "").trim().startsWith(name));
  const bad = built.list.filter((sc) => !known(sc.base) || !(sc.moves || []).length || (sc.moves || []).some((m) => !known(m.from))).map((sc) => sc.n);
  check("screens: a base and moves from the board", true, built.list.length ? !bad.length : false, bad.length ? `screens ${bad.join(", ")} name no base, no move, or a source not on the board` : `${built.list.length} screens`);
  const bases = new Set(built.list.map((sc) => sc.base));
  const missed = (lib?.references || []).map((r) => r.name).filter((n) => !bases.has(n));
  check("screens: every reference a base", false, !missed.length, missed.join(", "));
  check("deal: a screen chosen", true, built.chosen != null || existsSync(at(".longbeard/design/direction/prototype/first.html")), built.chosen != null ? `#${built.chosen}` : "no chosen screen");
} else if (!lib || !deal) check("deal: three sources a screen", true, false, `no ${!lib ? "library.json" : "deal.json"} in .longbeard/design/direction/`);
else {
  const lists = { arrangement: "arrangements", type: "type", ground: "grounds" };
  const notRefs = new Set(["theirs", "identity", "subject"]);
  const refsOf = (list, id) => {
    const e = (lib[list] || []).find((x) => x.id === id);
    return e ? (e.from || []).filter((r) => !notRefs.has(r)) : null;
  };
  const noFrom = Object.values({ ...lists, n: "navigation", a: "accents" }).flatMap((list) => (lib[list] || []).filter((e) => !Array.isArray(e.from) || !e.from.length).map((e) => `${list}/${e.id}`));
  check("library: every entry has its references", true, !noFrom.length, noFrom.join(", "));
  const bad = [];
  let judged = 0, unknown = 0;
  for (const round of deal.rounds || []) {
    if (round.kind !== "deal") continue; // a mix may break the rule on their word, with a warning
    for (const r of round.recipes) {
      // The sources deal.mjs recorded when it dealt; else the library as it is now.
      let a = r.sources?.arrangement, t = r.sources?.type, g = r.sources?.ground;
      if (!a || !t || !g) {
        a = refsOf("arrangements", r.arrangement);
        t = refsOf("type", r.type);
        g = refsOf("grounds", r.ground);
        if (!a || !t || !g) {
          unknown++; // an entry the identity later replaced, dealt before sources were recorded
          continue;
        }
        for (const z of Object.values(r.zones || {})) if (z !== "none") a.push(...(refsOf("arrangements", z) || []));
      }
      judged++;
      if (a.some((x) => t.includes(x) || g.includes(x)) || t.some((x) => g.includes(x))) bad.push(`round ${round.round} #${r.n}`);
    }
  }
  check("deal: three sources a screen", true, judged ? !bad.length : null, bad.length ? `from fewer than three: ${bad.join(", ")}` : `${judged} screens${unknown ? `, ${unknown} not judged (entries since replaced)` : ""}`);
  check("deal: a screen chosen", true, Boolean(deal.chosen), deal.chosen ? `round ${deal.chosen.round} #${deal.chosen.n}` : "no --choose");
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

// ------------------------------------------------------------------ rendered: the dealt screens (screens.mjs)
// Each screen of the first dealt round: no tiny or clipped text, contrast where text sits, no more
// text than its reference carries and one more, a ground of a tone the references use; and measured
// against its references, with the odd-one-out rate when the judges have run (odd-one-out.mjs).
// A run of this flow, or one from before it (design-exploration/<slug>/), which screens.mjs reads too.
const gridPage = [at(".longbeard/design/direction/screens.json"), at(".longbeard/design/direction/prototype/grid.html"), ...(existsSync(at("design-exploration")) ? readdirSync(at("design-exploration")).map((d) => at("design-exploration", d, "prototype/grid.html")) : [])].find(existsSync);
const gridIds = ["grid: no text under 12px", "grid: no clipped text", "grid: contrast on every screen", "grid: text within the reference's slots", "grid: grounds in the board's tones", "grid: measured against the references", "grid: odd one out"];
if (!gridPage) for (const id of gridIds) check(id, id.includes("12px") || id.includes("clipped") || id.includes("contrast"), null, "no grid page or deal");
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
      check(gridIds[4], false, !g.offBoard.length, list(g.offBoard));
      const rates = ["arrangement", "type", "role", "colour"].filter((k) => g[k]);
      const say = rates.map((k) => `${k} ${g[k].within}/${g[k].of}`).join(" · ");
      check(gridIds[5], false, rates.length ? rates.every((k) => g[k].within * 2 >= g[k].of) : null, say || "nothing measured");
      // Picked as least finished at chance (1 in 6) or less: the screens hold up beside the references.
      const odd = g.oddOneOut;
      check(gridIds[6], false, odd ? odd.rate <= 1 / 6 + 1e-9 : null, odd ? `${odd.picked}/${odd.judged} picks were a dealt screen (chance ${(odd.judged / 6).toFixed(1)})` : "not judged: run odd-one-out.mjs");
    }
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
