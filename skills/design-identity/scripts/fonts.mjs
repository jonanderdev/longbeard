#!/usr/bin/env node
// The face options of design-identity, from Google Fonts' own list, not the agent's memory: faces of
// the same kind as the one the chosen screen has, nearest in shape first. The kind is the list's
// (serif or sans, display or text, the weight in use, Latin); the shape is measured in one Chrome,
// each face set at the weight in use: how wide it runs, its x-height, how dark it sets, and its
// stroke contrast (thick over thin, from an "o"). A face from elsewhere is still measured, given
// its kind with --kind, and --kind also overrides the list's kind for a face Google files wrongly. Node 22+, an installed Chrome, no dependencies.
//
//   node fonts.mjs "Newsreader" --weight 300
//   node fonts.mjs "Inter" --body                      the body row: text faces with 400 and 700
//   node fonts.mjs "Their Face" --kind serif --css https://…/their-face.css
//                                                      a face not in Google's list, from its stylesheet
//   node fonts.mjs "Italiana" --kind serif              the list calls it a sans: say what it is
//
// Prints one row a face, nearest first: face, kind, width, x-height, dark, contrast (each the
// face's own, the chosen one's first), weights, axes, how widely it is used (its rank in Google's
// list, 1 the most used). The order is nearness, never taste: which to show, and why each is
// of the same kind, is still the agent's to say, and which to keep is theirs.
//   --css <url> (the chosen face's own stylesheet), --count 8 (rows), --json, --metadata <file> (Google's list, saved), --local (installed faces
//   only, no stylesheets: for tests)
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const weight = Number(flag("weight", "400"));
const count = Number(flag("count", "8"));
const kindArg = flag("kind").toLowerCase();
const metadataArg = flag("metadata");
const cssArg = flag("css");
const json = has("json");
const body = has("body");
const italic = has("italic");
const local = has("local");
const face = args.join(" ").trim();
const KINDS = { serif: ["Serif", "Serif"], slab: ["Serif", "Slab Serif"], sans: ["Sans Serif", "Sans Serif"], display: ["Display", null], handwriting: ["Handwriting", null], mono: ["Monospace", null] };
if (!face || !(weight >= 100 && weight <= 1000) || !(count >= 1 && count <= 40) || (kindArg && !KINDS[kindArg])) {
  console.error(`usage: node fonts.mjs "Face" [--weight 400] [--italic] [--body] [--kind ${Object.keys(KINDS).join("|")}] [--count 8] [--json]`);
  process.exit(2);
}

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const pf = process.env.PROGRAMFILES || "C:\\Program Files";
  return [
    join(pf, "Google/Chrome/Application/chrome.exe"),
    join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
    join(pf, "Microsoft/Edge/Application/msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((path) => path && existsSync(path));
}
const exe = findChrome();
if (!exe) {
  console.error("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), "fonts-chrome-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--force-color-profile=srgb", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
process.once("exit", () => {
  try {
    proc.kill("SIGKILL");
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
});
const fail = (text) => {
  console.error(`fonts: ${text}`);
  process.exit(1);
};
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
const send = (method, params = {}, sessionId) => new Promise((done) => (pending.set(++nextId, done), ws.send(JSON.stringify({ id: nextId, method, params, sessionId }))));
const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
const call = (method, params) => send(method, params, att.sessionId);
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "the page threw");
  return r.result.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const go = async (url) => {
  await call("Page.navigate", { url });
  for (let i = 0; i < 150 && (await evaluate("document.readyState").catch(() => "")) !== "complete"; i++) await sleep(200);
};

// Google's list, saved for a week. Read through the browser, which uses the network the way a page does.
const saved = metadataArg || join(tmpdir(), "longbeard-google-fonts.json");
let list;
if (existsSync(saved) && (metadataArg || Date.now() - statSync(saved).mtimeMs < 7 * 864e5)) list = readFileSync(saved, "utf8");
else {
  await go("https://fonts.google.com/metadata/fonts");
  list = await evaluate("document.body.innerText");
  if (!/familyMetadataList/.test(list || "")) fail("could not read Google Fonts' list (fonts.google.com/metadata/fonts): check the network");
  writeFileSync(saved, list);
}
const families = JSON.parse(list.replace(/^\)\]\}'\s*/, "")).familyMetadataList || [];

// The kind: the list's category and stroke, display or not, in Latin, with the weight in use.
const offers = (f, w, it) => (it ? `${w}i` : `${w}`) in f.fonts || (f.axes || []).some((a) => a.tag === "wght" && a.min <= w && a.max >= w && (!it || Object.keys(f.fonts).some((k) => k.endsWith("i"))));
const isDisplay = (f) => (f.classifications || []).includes("Display");
const chosen = families.find((f) => f.family.toLowerCase() === face.toLowerCase());
if (!chosen && !kindArg) fail(`${face} is not in Google Fonts' list: say its kind with --kind ${Object.keys(KINDS).join("|")}`);
// --kind wins over the list: Google files some faces under the wrong kind (Italiana is listed as a
// sans), and a row of the wrong kind is no row at all.
const [category, stroke] = kindArg ? KINDS[kindArg] : [chosen.category, chosen.stroke];
const display = kindArg ? kindArg === "display" : isDisplay(chosen);
const pool = families
  .filter((f) => f !== chosen && f.category === category && (!stroke || !f.stroke || f.stroke === stroke) && isDisplay(f) === display)
  // A small-caps twin is the same face; a slab in a serif's row is another kind. A slab is one Google
  // lists as a slab, or, where it lists no stroke, one named so.
  .filter((f) => !/ SC$/.test(f.family) && (f.stroke === "Slab Serif" || /slab/i.test(f.family)) === (stroke === "Slab Serif"))
  .filter((f) => (f.subsets || []).includes("latin") && !f.isNoto && !(f.classifications || []).includes("Symbols"))
  .filter((f) => (body ? offers(f, 400, false) && offers(f, 700, false) : offers(f, weight, italic)))
  .sort((a, b) => a.popularity - b.popularity);
if (!pool.length) fail(`no faces of ${face}'s kind (${category}${stroke ? `, ${stroke}` : ""}${display ? ", display" : ""}) offer weight ${body ? "400 and 700" : weight}`);
// Every face of the kind is measured (a stylesheet of the sample letters only is small), so the
// less known are in reach as much as the most used. Past 800 faces, the most used 800.
const candidates = pool.slice(0, 800);
const rank = new Map([...families].sort((a, b) => a.popularity - b.popularity).map((f, i) => [f.family, i + 1]));

// The shape of each face, set at the weight in use. A face is only measured once it is really
// there: set with two different fallbacks, it must measure the same in both.
await go("about:blank");
const shapes = await evaluate(`(async () => {
  const W = ${weight}, IT = ${italic}, LOCAL = ${local}, CSS = ${JSON.stringify(cssArg)}, SAMPLE = "Hamburgefonstivxo";
  const faces = ${JSON.stringify([face, ...candidates.map((f) => f.family)])};
  const c = Object.assign(document.createElement("canvas"), { width: 2400, height: 420 }).getContext("2d", { willReadFrequently: true });
  const font = (name, fb, size = 120) => (IT ? "italic " : "") + W + " " + size + "px \\"" + name + "\\", " + fb;
  const load = (name) => new Promise((done) => {
    if (LOCAL && !(name === faces[0] && CSS)) return done();
    const fam = encodeURIComponent(name).replace(/%20/g, "+");
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: name === faces[0] && CSS ? CSS : "https://fonts.googleapis.com/css2?family=" + fam + ":" + (IT ? "ital,wght@1," : "wght@") + W + "&text=" + SAMPLE + "&display=block" });
    const t = setTimeout(done, 8000);
    link.onload = link.onerror = () => (clearTimeout(t), done());
    document.head.appendChild(link);
  });
  await Promise.all(faces.map(load));
  await Promise.all(faces.map((n) => document.fonts.load(font(n, "serif"), SAMPLE).catch(() => [])));
  const ink = (n) => {
    c.clearRect(0, 0, 2400, 420);
    c.font = font(n, "serif");
    c.fillText(SAMPLE, 10, 200);
    const d = c.getImageData(0, 0, 2400, 420).data;
    let dark = 0;
    for (let i = 3; i < d.length; i += 4) dark += d[i] / 255;
    return dark;
  };
  // Contrast: an "o" at 300 px, its side stroke (across the middle row) over its top (down the middle).
  const contrast = (n) => {
    c.clearRect(0, 0, 2400, 420);
    c.font = font(n, "serif", 300);
    const m = c.measureText("o");
    c.fillText("o", 10, 380);
    const d = c.getImageData(0, 0, 2400, 420).data, a = (x, y) => d[(y * 2400 + x) * 4 + 3] > 127;
    const midY = Math.round(380 - m.actualBoundingBoxAscent / 2), midX = Math.round(10 + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - m.actualBoundingBoxLeft);
    const run = (get, from, to) => { let s = -1; for (let i = from; i < to; i++) { if (get(i) && s < 0) s = i; if (!get(i) && s >= 0) return i - s; } return 0; };
    const side = run((x) => a(x, midY), 0, 2400), top = run((y) => a(midX, y), 0, 420);
    return side && top ? side / top : null;
  };
  const out = {};
  for (const n of faces) {
    c.font = font(n, "monospace");
    const mono = c.measureText(SAMPLE).width;
    c.font = font(n, "serif");
    const m = c.measureText(SAMPLE);
    if (Math.abs(mono - m.width) > 0.5) continue;
    const x = (c.font = font(n, "serif"), c.measureText("x").actualBoundingBoxAscent);
    out[n] = { width: m.width / 120 / SAMPLE.length, xheight: x / 120, dark: ink(n) / (m.width * 120), contrast: contrast(n) };
  }
  return out;
})()`);
ws.close();

const mine = shapes[face];
if (!mine) fail(`${face} did not load${local ? " (--local: it must be installed)" : chosen ? "" : " (a face not in Google's list needs --css, its stylesheet)"}: check the name and the weight (${weight})`);
const ln = (a, b) => Math.abs(Math.log(a / b));
const far = (s) => ln(s.width, mine.width) / 0.12 + Math.abs(s.xheight - mine.xheight) / 0.05 + ln(s.dark, mine.dark) / 0.2 + (s.contrast && mine.contrast ? ln(s.contrast, mine.contrast) / 0.3 : 1);
const meta = new Map(families.map((f) => [f.family, f]));
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const row = (name, s) => {
  const f = meta.get(name);
  const ws = f ? Object.keys(f.fonts).filter((k) => !k.endsWith("i")).map(Number).sort((a, b) => a - b) : [];
  return {
    face: name,
    kind: [category, stroke !== category && stroke, display && "display"].filter(Boolean).join(", "),
    width: r2(s.width),
    xheight: r2(s.xheight),
    dark: r2(s.dark),
    contrast: r2(s.contrast),
    weights: ws.length ? (ws.length > 2 ? `${ws[0]}–${ws.at(-1)}` : ws.join(",")) : "",
    italic: f ? Object.keys(f.fonts).some((k) => k.endsWith("i")) : null,
    axes: f ? (f.axes || []).map((a) => a.tag).join(" ") : "",
    used: rank.get(name) || null,
    far: r2(far(s)),
  };
};
const rows = Object.entries(shapes)
  .filter(([n]) => n !== face)
  .map(([n, s]) => row(n, s))
  .sort((a, b) => a.far - b.far)
  .slice(0, count);
const missed = candidates.length - Object.keys(shapes).filter((n) => n !== face).length;
if (json) console.log(JSON.stringify({ chosen: row(face, mine), rows, measured: candidates.length - missed, missed }, null, 1));
else {
  const cols = ["face", "kind", "width", "xheight", "dark", "contrast", "weights", "italic", "axes", "used", "far"];
  console.log(cols.join("\t"));
  for (const r of [row(face, mine), ...rows]) console.log(cols.map((k) => r[k] ?? "").join("\t"));
  console.error(`fonts: ${candidates.length - missed} of ${pool.length} faces of this kind measured${missed ? `, ${missed} did not load` : ""}; nearest first, the chosen face on top`);
}
process.exit(0);
