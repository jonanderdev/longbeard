#!/usr/bin/env node
// The dealt screens of a design run, checked one by one and measured against
// the references they took their pieces from. score.mjs runs it; it also runs
// on its own, on any run's grid, old or new, since it reads only what a run
// leaves: library.json, deal.json, prototype/grid.html and the board.
//
//   node eval/design/screens.mjs <project> [--json] [--size 1440x900]
//
// For each screen of the first dealt round, rendered at --size:
// - the smallest text on it, in px;
// - text that is clipped or runs out of the screen or its box (display type
//   cropped on purpose, 48px and up, is not counted);
// - its text blocks outside the navigation, against what its arrangement's
//   reference carries (the reference's measured small blocks, its headline,
//   and one more);
// - contrast where text sits (screen-contrast.mjs);
// - whether its ground's tone is one the references' grounds have.
// And measured (measure.mjs on the screen and on its references):
// - arrangement: empty share within 15 points of the arrangement's reference;
// - type: the display's size within ×/÷1.5 of the type reference's, and its
//   weight within 200; role: the display's size within ×/÷1.5 of the
//   arrangement reference's (the type takes the arrangement's role);
// - colour: the ground within 24 of the ground reference's, the ink within 48.
// Plus the odd-one-out rate, when eval-odd-one-out.json is there (odd-one-out.mjs).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const json = has("json");
const [W, H] = flag("size", "1440x900").split("x").map(Number);
const [projectArg] = args;
if (!projectArg || args.length !== 1 || !(W > 0 && H > 0)) {
  console.error("usage: node eval/design/screens.mjs <project> [--json] [--size 1440x900]");
  process.exit(2);
}
const dir = resolve(projectArg);
const at = (...p) => join(dir, ...p);
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};
const fail = (text) => {
  console.error(`screens: ${text}`);
  process.exit(1);
};
// A run of this flow, or one from before it (design-exploration/<slug>/).
// Three layouts: screens built from references (screens.json, screens/<n>.html), a dealt grid
// (deal.json, prototype/grid.html?n=), and a dealt grid from before the design-* split (design-exploration/<slug>/).
const base = [at(".longbeard/design/direction"), ...(existsSync(at("design-exploration")) ? readdirSync(at("design-exploration")).map((d) => at("design-exploration", d)) : [])].find((d) => existsSync(join(d, "screens.json")) || existsSync(join(d, "deal.json")));
if (!base) fail("no screens.json or deal.json in .longbeard/design/direction/ or design-exploration/*/");
const lib = readJson(join(base, "library.json")) || fail("no library.json beside them");
const built = readJson(join(base, "screens.json"));
const builtList = built ? (Array.isArray(built) ? built : built.screens || []) : null;
// A built screen's pieces: its base, unless a move borrowed the face or the palette from another reference.
const borrowed = (sc, pattern) => (sc.moves || []).find((m) => pattern.test(m.what || ""))?.from;
const round = builtList
  ? { recipes: builtList.map((sc) => ({ n: sc.n, arrangement: sc.base, type: borrowed(sc, /face|type/i) || sc.base, ground: borrowed(sc, /palette|colou?r/i) || sc.base, accent: "", sources: { arrangement: [sc.base], type: [borrowed(sc, /face|type/i) || sc.base], ground: [borrowed(sc, /palette|colou?r/i) || sc.base] } })) }
  : (readJson(join(base, "deal.json")).rounds || []).find((r) => r.kind === "deal") || fail("no dealt round");
const grid = builtList ? null : join(base, "prototype/grid.html");
if (grid && !existsSync(grid)) fail(`no grid page at ${grid}`);
const pageOf = (n) => (builtList ? join(base, "screens", `${n}.html`) : grid);
const script = (skill, name) => [at(".claude/skills", skill, "scripts", name), join(repo, "skills", skill, "scripts", name)].find(existsSync);
// Measured with this repo's measure.mjs, so every run is read the same way.
const measure = join(repo, "skills/design-families/scripts/measure.mjs");
const contrastScript = join(repo, "skills/design-direction/scripts/screen-contrast.mjs");
const notRefs = new Set(["theirs", "identity", "subject"]);
const refsOf = (list, id) => ((lib[list] || []).find((x) => x.id === id)?.from || []).filter((r) => !notRefs.has(r));

// The references' pictures, by card name, wherever a run keeps them.
const picDirs = [at("moodboard"), at(".longbeard/design/moodboard/refs"), at(".longbeard/design/moodboard"), ...(existsSync(at("design-exploration")) ? readdirSync(at("design-exploration")).map((d) => at("design-exploration", d, "refs")) : [])].filter(existsSync);
const picture = (name) => {
  for (const d of picDirs) {
    const f = readdirSync(d).find((x) => x.replace(/\.(jpe?g|png|webp)$/i, "") === name);
    if (f) return join(d, f);
  }
  return null;
};

// ------------------------------------------------------------------ Chrome
function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(existsSync);
}
const exe = findChrome();
if (!exe) fail("No Chrome found. Install one or set CHROME_PATH.");
const profile = mkdtempSync(join(tmpdir(), "eval-screens-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
process.once("exit", () => {
  try {
    proc.kill("SIGKILL");
  } catch {}
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
});
let buf = "";
const wsUrl = await new Promise((done, no) => {
  const t = setTimeout(() => no(new Error("Chrome did not start")), 20000);
  proc.stderr.on("data", (d) => {
    const m = (buf += d).match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) done(m[1], clearTimeout(t));
  });
}).catch((e) => fail(e.message));
const ws = new WebSocket(wsUrl);
await new Promise((done) => (ws.onopen = done));
let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
};
// Every call has a deadline: a page that never answers costs 20 s, never the run.
const send = (method, params = {}, sessionId) => new Promise((done) => {
  const id = ++nextId;
  const t = setTimeout(() => (pending.delete(id), done({ error: { message: `${method} timed out` } })), 20000);
  pending.set(id, (msg) => (clearTimeout(t), done(msg)));
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
const call = (method, params) => send(method, params, att.sessionId);
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 });

// What a screen holds, read from the page itself: works on any grid page, old or new.
const inspect = `(() => {
  const W = ${W}, H = ${H};
  const screen = document.querySelector("#screen, .screen") || document.body;
  const seen = (el) => { for (let up = el; up && up.nodeType === 1; up = up.parentElement) { const s = getComputedStyle(up); if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false; } return true; };
  let min = Infinity, minText = "";
  const clipped = [], blocks = new Set();
  const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim();
    const el = n.parentElement;
    if (!text || !el || /^(SCRIPT|STYLE)$/.test(el.tagName) || el.closest(".must-missing") || !seen(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1);
    if (!rects.length) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    const inside = rects.some((r) => r.right > 0 && r.left < W && r.bottom > 0 && r.top < H);
    if (!inside) continue;
    if (size < min) (min = size), (minText = text.slice(0, 40));
    // Clipped: out of the screen, or out of a box that hides its overflow. Big display type cropped on purpose is a device.
    if (size < 48) {
      let out = rects.some((r) => r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1);
      for (let up = el; up && up !== document.body && !out; up = up.parentElement) {
        const s = getComputedStyle(up);
        if (s.overflow === "visible" && s.overflowX === "visible" && s.overflowY === "visible") continue;
        const b = up.getBoundingClientRect();
        out = rects.some((r) => r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1);
      }
      if (out) clipped.push(text.slice(0, 40));
    }
    if (el.closest("nav, header nav")) continue;
    let box = el;
    while (box !== screen && getComputedStyle(box).display === "inline") box = box.parentElement;
    blocks.add(box);
  }
  return { minText: Number.isFinite(min) ? Math.round(min * 10) / 10 : null, minSample: minText, clipped, blocks: blocks.size, title: document.title };
})()`;

const shotsDir = at(".longbeard/eval/screens");
mkdirSync(shotsDir, { recursive: true });
const screens = [];
for (const r of round.recipes) {
  const size = W !== 1440 || H !== 900 ? `size=${W}x${H}` : "";
  const url = builtList ? `${pathToFileURL(pageOf(r.n)).href}${size ? `?${size}` : ""}` : `${pathToFileURL(grid).href}?n=${r.n}${size ? `&${size}` : ""}`;
  await call("Page.navigate", { url });
  let ok = false;
  for (let i = 0; i < 150 && !ok; i++) {
    ok = (await evaluate("document.title").catch(() => "")) === "ready";
    if (!ok) await sleep(200);
  }
  if (!ok) await sleep(1500);
  await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true");
  const dom = (await evaluate(inspect)) || { minText: null, minSample: "", clipped: [], blocks: 0, title: "not read" };
  const shot = await call("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  const png = join(shotsDir, `${r.n}.png`);
  if (shot.result?.data) writeFileSync(png, Buffer.from(shot.result.data, "base64"));
  else console.error(`screens: no capture of ${r.n}: ${shot.error?.message || "unknown"}`);
  screens.push({ n: r.n, recipe: r, url, png, dom });
}
ws.close();

// Contrast where text sits, each screen in its own run of screen-contrast.mjs.
for (const s of screens) {
  const c = spawnSync(process.execPath, [contrastScript, s.url, "--wait-title", "ready", "--size", `${W}x${H}`, "--json"], { encoding: "utf8", timeout: 90000 });
  try {
    const out = JSON.parse(c.stdout);
    s.contrast = { failing: out.failing, texts: out.texts.length, worst: out.texts.filter((t) => !t.pass).slice(0, 3).map((t) => `"${t.text}" ${t.p5}:1`) };
  } catch {
    s.contrast = { failing: null, error: (c.stderr || "").trim().slice(0, 200) };
  }
}

// Measured: every screen and every reference a screen took a piece from, in one measure.mjs run.
const names = new Set();
for (const s of screens) {
  const src = s.recipe.sources || { arrangement: refsOf("arrangements", s.recipe.arrangement), type: refsOf("type", s.recipe.type), ground: refsOf("grounds", s.recipe.ground) };
  s.sources = src;
  for (const list of ["arrangement", "type", "ground"]) for (const n of src[list] || []) names.add(n);
}
const refPics = Object.fromEntries([...names].map((n) => [n, picture(n)]).filter(([, p]) => p));
const m = spawnSync(process.execPath, [measure, ...screens.map((s) => s.png).filter(existsSync), ...Object.values(refPics)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
let measured = [];
try {
  measured = JSON.parse(m.stdout);
  if (!Array.isArray(measured)) measured = [measured];
} catch {}
const byPath = new Map(measured.map((x) => [resolve(x.target), x]));
const of = (path) => (path ? byPath.get(resolve(path)) : null);
const refOf = (names) => (names || []).map((n) => of(refPics[n])).find(Boolean) || null;
const rgb = (hex) => (/^#[0-9a-f]{6}$/i.test(hex || "") ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : null);
const dist = (a, b) => (rgb(a) && rgb(b) ? Math.max(...rgb(a).map((v, i) => Math.abs(v - rgb(b)[i]))) : null);
const within = (a, b, k) => (a && b ? a / b <= k && b / a <= k : null);

// The board's tones: the references' own grounds.
const lum = (hex) => {
  const v = rgb(hex).map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const tone = (g) => {
  const hex = g?.panel || g?.ground;
  if (!rgb(hex)) return "mid";
  const l = lum(hex);
  return l > 0.55 ? "light" : l < 0.08 ? "dark" : "mid";
};
// Built screens: the references' own palettes; dealt ones: the grounds that come from a reference.
const boardTones = new Set(lib.references ? lib.references.map((r) => tone({ ground: r.palette?.ground })) : (lib.grounds || []).filter((g) => (g.from || []).some((r) => !notRefs.has(r))).map(tone));

for (const s of screens) {
  const me = of(s.png);
  const arr = refOf(s.sources.arrangement), typ = refOf(s.sources.type), grd = refOf(s.sources.ground);
  const d = me?.type?.display, ta = typ?.type?.display, aa = arr?.type?.display;
  s.measured = {
    empty: me?.traits?.empty ?? null,
    refEmpty: arr?.traits?.empty ?? null,
    arrangement: me && arr ? Math.abs(me.traits.empty - arr.traits.empty) <= 15 : null,
    display: d ? { px: d.px1440, weight: d.weight } : null,
    typeRef: ta ? { px: ta.px1440, weight: ta.weight } : null,
    type: d && ta ? within(d.px1440, ta.px1440, 1.5) && (d.weight == null || ta.weight == null || Math.abs(d.weight - ta.weight) <= 200) : null,
    role: d && aa ? within(d.px1440, aa.px1440, 1.5) : null,
    ground: me?.traits?.ground ?? null,
    refGround: grd?.traits?.ground ?? null,
    // The ground within 24 of a colour in the ground reference's palette (its common and loud colours), the ink within 48 of its ink.
    colour: me && grd ? [...(grd.common || []), ...(grd.loud || [])].some((c) => dist(me.traits.ground, c.colour) <= 24) && (!me.traits.ink || !grd.traits.ink || dist(me.traits.ink, grd.traits.ink) <= 48) : null,
  };
  // What the arrangement's reference carries: its measured text blocks, and one more.
  const blocks = Number.isInteger(arr?.type?.blocks) ? arr.type.blocks : null;
  s.capacity = blocks == null ? null : blocks + 1;
  // A built screen's ground is what it shows, measured; a dealt one's is its library entry.
  const g = builtList ? (me?.traits?.ground ? { ground: me.traits.ground } : null) : (lib.grounds || []).find((x) => x.id === s.recipe.ground);
  s.tone = g ? tone(g) : null;
  s.toneOnBoard = g ? boardTones.has(s.tone) : null;
}

const odd = readJson(at("eval-odd-one-out.json"));
const rate = (key) => {
  const judged = screens.filter((s) => s.measured[key] !== null);
  return judged.length ? { within: judged.filter((s) => s.measured[key]).length, of: judged.length } : null;
};
const summary = {
  base: base.replace(dir + "/", ""),
  screens: screens.length,
  minText: Math.min(...screens.map((s) => s.dom.minText ?? Infinity)),
  tiny: screens.filter((s) => s.dom.minText != null && s.dom.minText < 12).map((s) => `${s.n} (${s.dom.minText}px "${s.dom.minSample}")`),
  clipped: screens.filter((s) => s.dom.clipped.length).map((s) => `${s.n}: ${s.dom.clipped.slice(0, 2).join(" | ")}`),
  contrast: screens.filter((s) => s.contrast.failing).map((s) => `${s.n}: ${s.contrast.worst.join(", ")}`),
  overSlots: screens.filter((s) => s.capacity != null && s.dom.blocks > s.capacity).map((s) => `${s.n} (${s.dom.blocks} blocks, its reference ${s.capacity - 1})`),
  blocks: screens.map((s) => s.dom.blocks),
  offBoard: screens.filter((s) => s.toneOnBoard === false).map((s) => `${s.n} (${s.tone})`),
  arrangement: rate("arrangement"),
  type: rate("type"),
  role: rate("role"),
  colour: rate("colour"),
  oddOneOut: odd ? { picked: odd.picked, judged: odd.judged, rate: odd.rate } : null,
};
if (json) console.log(JSON.stringify({ summary, screens: screens.map(({ n, recipe, dom, contrast, measured, capacity, tone, toneOnBoard }) => ({ n, recipe: { arrangement: recipe.arrangement, type: recipe.type, ground: recipe.ground, accent: recipe.accent }, dom, contrast, measured, capacity, tone, toneOnBoard })) }, null, 1));
else {
  console.log("n  min px  clipped  blocks/cap  contrast  tone      empty(ref)  display px/w (type ref)  ground (ref)");
  for (const s of screens) {
    const mm = s.measured;
    console.log([String(s.n).padEnd(3), String(s.dom.minText).padEnd(8), String(s.dom.clipped.length).padEnd(9), `${s.dom.blocks}/${s.capacity ?? "?"}`.padEnd(12), String(s.contrast.failing ?? "?").padEnd(10), `${s.tone}${s.toneOnBoard === false ? "!" : ""}`.padEnd(10), `${mm.empty}(${mm.refEmpty})`.padEnd(12), `${mm.display ? `${mm.display.px}/${mm.display.weight}` : "-"} (${mm.typeRef ? `${mm.typeRef.px}/${mm.typeRef.weight}` : "-"})`.padEnd(25), `${mm.ground} (${mm.refGround})`].join(""));
  }
  const r = (x) => (x ? `${x.within}/${x.of}` : "-");
  console.log(`within the references: arrangement ${r(summary.arrangement)} · type ${r(summary.type)} · role ${r(summary.role)} · colour ${r(summary.colour)}${odd ? ` · odd one out ${odd.picked}/${odd.judged}` : ""}`);
}
// Chrome's pipe would keep the process open.
process.exit(0);
