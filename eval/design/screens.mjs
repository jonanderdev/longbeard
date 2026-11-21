#!/usr/bin/env node
// The first round's screens of a design run, each rendered and checked. score.mjs runs it; it
// also runs on its own on any run that left screens.json and screens/<n>.html.
//
//   node eval/design/screens.mjs <project> [--json] [--size 1440x900]
//
// For each screen, rendered at --size:
// - the smallest text on it, in px;
// - text that is clipped or runs out of the screen or its box (display type
//   cropped on purpose, 48px and up, is not counted);
// - its text blocks outside the navigation, against what its base reference
//   carries (library.json's slots: the headline, the small slots, and one more);
// - contrast where text sits (screen-contrast.mjs).
// A check that did not run on a screen (a page not read, a contrast run that crashed) is
// listed under notRead and contrastNotRun in the summary: never counted as a pass.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const base = at(".longbeard/design/direction");
const built = readJson(join(base, "screens.json")) || fail("no screens.json in .longbeard/design/direction/");
const list = Array.isArray(built) ? built : built.screens || [];
const lib = readJson(join(base, "library.json")) || {};
const reading = (name) => (lib.references || []).find((r) => r.name === name);
const contrastScript = join(repo, "skills/design-direction/scripts/screen-contrast.mjs");

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
    // Clipped: off the screen's top or bottom, or out of a box that hides its overflow. Big display type cropped on purpose is a device.
    // Text set on a curve or turned (a seal's ring, rotated labels) has boxes that run past its own: not clipped.
    const turned = (() => { for (let up = el; up && up !== screen; up = up.parentElement) if (/matrix|rotate/.test(getComputedStyle(up).transform) || up.closest("svg")) return true; return false; })();
    if (size < 48 && !turned) {
      // Text that runs off the screen's left or right edge (a band of words looping past both sides) is a device, not clipped:
      // only a cut inside the screen counts, by a box whose edge lies within it, or off its top or bottom.
      let out = rects.some((r) => r.top < -1 || r.bottom > H + 1);
      for (let up = el; up && up !== document.body && !out; up = up.parentElement) {
        const s = getComputedStyle(up);
        if (s.overflow === "visible" && s.overflowX === "visible" && s.overflowY === "visible") continue;
        const b = up.getBoundingClientRect();
        const left = b.left > 1, right = b.right < W - 1;
        out = rects.some((r) => (left && r.left < b.left - 1) || (right && r.right > b.right + 1) || r.top < b.top - 1 || r.bottom > b.bottom + 1);
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
for (const sc of list) {
  const url = `${pathToFileURL(join(base, "screens", `${sc.n}.html`)).href}${W !== 1440 || H !== 900 ? `?size=${W}x${H}` : ""}`;
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
  if (shot.result?.data) writeFileSync(join(shotsDir, `${sc.n}.png`), Buffer.from(shot.result.data, "base64"));
  // What the base carries: its headline, its small slots, and at most one more.
  const slots = reading(sc.base)?.slots;
  const capacity = Number.isInteger(slots?.small) ? slots.small + 2 : null;
  screens.push({ n: sc.n, base: sc.base, url, dom, capacity });
}
ws.close();

// Contrast where text sits, each screen in its own run of screen-contrast.mjs. It exits 0 when every text passes and
// 1 when one fails, both with a result; any other exit, a timeout or output that is not a result means the check did
// not run on that screen, and the screen is never counted as passing.
for (const s of screens) {
  const c = spawnSync(process.execPath, [contrastScript, s.url, "--wait-title", "ready", "--size", `${W}x${H}`, "--json"], { encoding: "utf8", timeout: 90000, maxBuffer: 64 * 1024 * 1024 });
  let out = null;
  try {
    out = JSON.parse(c.stdout);
  } catch {}
  if ((c.status === 0 || c.status === 1) && out && Array.isArray(out.texts) && Number.isInteger(out.failing)) s.contrast = { failing: out.failing, worst: out.texts.filter((t) => !t.pass).slice(0, 3).map((t) => `"${t.text}" ${t.p5}:1`) };
  else s.contrast = { failing: null, worst: [], error: (c.error?.message || c.stderr || `exit ${c.status}`).trim().slice(0, 200) };
}

// A screen whose page was not read counts as not run for the checks that read it.
const read = (s) => s.dom.title !== "not read";
const summary = {
  screens: screens.length,
  minText: Math.min(...screens.map((s) => s.dom.minText ?? Infinity)),
  tiny: screens.filter((s) => s.dom.minText != null && s.dom.minText < 12).map((s) => `${s.n} (${s.dom.minText}px "${s.dom.minSample}")`),
  clipped: screens.filter((s) => s.dom.clipped.length).map((s) => `${s.n}: ${s.dom.clipped.slice(0, 2).join(" | ")}`),
  contrast: screens.filter((s) => s.contrast.failing).map((s) => `${s.n}: ${s.contrast.worst.join(", ")}`),
  overSlots: screens.filter((s) => s.capacity != null && s.dom.blocks > s.capacity).map((s) => `${s.n} (${s.dom.blocks} blocks, its base carries ${s.capacity - 1})`),
  blocks: screens.map((s) => s.dom.blocks),
  // The checks that could not run, by screen: not run is never a pass.
  notRead: screens.filter((s) => !read(s)).map((s) => String(s.n)),
  contrastNotRun: screens.filter((s) => s.contrast.failing === null).map((s) => `${s.n}: ${s.contrast.error || "no result"}`),
};
if (json) console.log(JSON.stringify({ summary, screens }, null, 1));
else {
  console.log("n  min px  clipped  blocks/cap  contrast");
  for (const s of screens) console.log([String(s.n).padEnd(3), String(s.dom.minText).padEnd(8), String(s.dom.clipped.length).padEnd(9), `${s.dom.blocks}/${s.capacity ?? "?"}`.padEnd(12), String(s.contrast.failing ?? "not run")].join(""));
}
// Chrome's pipe would keep the process open.
process.exit(0);
