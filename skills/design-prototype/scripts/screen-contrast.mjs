#!/usr/bin/env node
// Contrast on the rendered screen, not on swatches. A colour pair can pass on
// its swatch and fail on the screen: a pale name that reads on the ground and
// runs off onto a photograph. This reads every piece of text where it sits.
// Node 22+, an installed Chrome, no dependencies.
//
//   node screen-contrast.mjs "file://$PWD/.longbeard/design/direction/prototype/grid.html?n=3" --wait-title ready
//
// How: the page is opened at --size (1440x900). Every visible text is found
// with its boxes, its colour and its size. Then all text is made transparent
// and the screen is shot, so what is under each box is the real background:
// a ground, a gradient, a photograph. Every pixel under each box is compared
// with the text's colour. A text fails when its 5th-percentile contrast is
// under the threshold (4.5:1, or 3:1 for large text: 24px, or 18.66px bold),
// so one stray pixel is not the verdict. The worst pixel is reported too.
//
// Prints one line per failing text: the text, its box, its colour, the
// background where it is worst, the contrast (5th percentile and worst), and
// the threshold. Exit 1 when any text fails, 0 when all pass.
//   --size 1440x900, --wait-title ready (wait for the page to set its title),
//   --min 4.5, --large 3, --json
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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
const sizeArg = flag("size", "1440x900");
const waitTitle = flag("wait-title");
const min = Number(flag("min", "4.5"));
const large = Number(flag("large", "3"));
const json = has("json");
const [url] = args;
const [W, H] = sizeArg.split("x").map(Number);
if (!url || args.length !== 1 || !/^(https?|file):/.test(url) || !(W > 0 && H > 0) || !(min > 1) || !(large > 1)) {
  console.error('usage: node screen-contrast.mjs "<file:// or https:// url>" [--size 1440x900] [--wait-title ready] [--min 4.5] [--large 3] [--json]');
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
const dir = mkdtempSync(join(tmpdir(), "screen-contrast-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
process.once("exit", () => {
  try {
    proc.kill("SIGKILL");
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
});
const fail = (text) => {
  console.error(`screen-contrast: ${text}`);
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
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await call("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 });
const nav = await call("Page.navigate", { url });
if (nav.result?.errorText) fail(`could not open ${url}: ${nav.result.errorText}`);
if (waitTitle) {
  let ok = false;
  for (let i = 0; i < 100 && !ok; i++) {
    ok = (await evaluate("document.title").catch(() => "")) === waitTitle;
    if (!ok) await sleep(200);
  }
  if (!ok) fail(`the page did not set its title to "${waitTitle}" within 20 s`);
} else {
  for (let i = 0; i < 100 && (await evaluate("document.readyState").catch(() => "")) !== "complete"; i++) await sleep(200);
  await sleep(500);
}
await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true").catch(() => true);

// Every visible text: its element, its boxes inside the screen, its colour and size.
const texts = await evaluate(`(() => {
  const W = ${W}, H = ${H};
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
  };
  const seen = (el) => {
    for (let up = el; up && up.nodeType === 1; up = up.parentElement) {
      const s = getComputedStyle(up);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const byEl = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || !seen(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const boxes = [...range.getClientRects()]
      .map((r) => ({ x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), r: Math.min(W, Math.ceil(r.right)), b: Math.min(H, Math.ceil(r.bottom)) }))
      .filter((b) => b.r - b.x >= 1 && b.b - b.y >= 1);
    if (!boxes.length) continue;
    if (!byEl.has(el)) {
      const s = getComputedStyle(el);
      const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
      let colour = parse(s.color) || [0, 0, 0, 1];
      // Text drawn only as an outline (a stroke, the fill clear): its stroke is what is read.
      const fill = parse(s.webkitTextFillColor || "") || colour;
      const stroke = parseFloat(s.webkitTextStrokeWidth) || 0;
      const outline = stroke > 0 && fill[3] < 0.1;
      if (outline) colour = parse(s.webkitTextStrokeColor) || colour;
      else if (fill[3] < colour[3]) colour = fill;
      // A faded container fades its text too: every opacity from the element up multiplies in.
      for (let up = el; up && up.nodeType === 1; up = up.parentElement) colour[3] *= Number(getComputedStyle(up).opacity);
      byEl.set(el, { text: "", boxes: [], colour, size, weight, outline, large: size >= 24 || (size >= 18.66 && weight >= 700) });
    }
    const t = byEl.get(el);
    t.text += (t.text ? " " : "") + n.textContent.trim().replace(/\\s+/g, " ");
    t.boxes.push(...boxes);
  }
  return [...byEl.values()];
})()`);

// Hide every text, so the shot is what lies under it.
await evaluate(`(() => {
  const s = document.createElement("style");
  s.textContent = "* { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; -webkit-text-fill-color: transparent !important; caret-color: transparent !important; text-decoration-color: transparent !important; }";
  document.head.appendChild(s);
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
})()`);
const shot = await call("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
if (!shot.result?.data) fail("could not take the screenshot");

// Read the shot's pixels in a blank page, and measure each text against what is under it.
await call("Page.navigate", { url: "about:blank" });
await sleep(200);
const results = await evaluate(`(async () => {
  const texts = ${JSON.stringify(texts)};
  const img = new Image();
  img.src = "data:image/png;base64,${shot.result.data}";
  await img.decode();
  const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  return texts.map((t) => {
    const [tr, tg, tb, ta] = t.colour;
    const area = t.boxes.reduce((s, b) => s + (b.r - b.x) * (b.b - b.y), 0);
    const stride = Math.max(1, Math.floor(Math.sqrt(area / 20000)));
    const ks = [];
    let worst = Infinity, worstBg = null;
    for (const b of t.boxes) for (let y = b.y; y < b.b; y += stride) for (let x = b.x; x < b.r; x += stride) {
      const i = (y * img.width + x) * 4;
      const br = d[i], bg = d[i + 1], bb = d[i + 2];
      // The text's alpha over the pixel under it.
      const fr = tr * ta + br * (1 - ta), fg = tg * ta + bg * (1 - ta), fb = tb * ta + bb * (1 - ta);
      const l1 = lum(fr, fg, fb), l2 = lum(br, bg, bb);
      const k = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      ks.push(k);
      if (k < worst) (worst = k), (worstBg = [br, bg, bb]);
    }
    ks.sort((a, b) => a - b);
    const p5 = ks.length ? ks[Math.floor(ks.length * 0.05)] : null;
    return { ...t, p5, worst: ks.length ? worst : null, worstBg };
  });
})()`);
ws.close();

const hex = (rgb) => `#${rgb.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const rows = results.map((t) => {
  const need = t.large ? large : min;
  const x = Math.min(...t.boxes.map((b) => b.x)), y = Math.min(...t.boxes.map((b) => b.y));
  const r = Math.max(...t.boxes.map((b) => b.r)), b = Math.max(...t.boxes.map((b) => b.b));
  return {
    text: t.text.length > 40 ? `${t.text.slice(0, 39)}…` : t.text,
    box: [x, y, r - x, b - y],
    colour: hex(t.colour) + (t.colour[3] < 1 ? ` at ${Math.round(t.colour[3] * 100)}%` : "") + (t.outline ? " (outline)" : ""),
    size: t.size,
    large: t.large,
    background: t.worstBg ? hex(t.worstBg) : null,
    p5: r1(t.p5),
    worst: r1(t.worst),
    need,
    pass: t.p5 == null || t.p5 >= need,
  };
});
const failing = rows.filter((r) => !r.pass);
if (json) console.log(JSON.stringify({ texts: rows, failing: failing.length }, null, 1));
else for (const r of failing) console.log([`"${r.text}"`, `box ${r.box.join(",")}`, `text ${r.colour}`, `worst on ${r.background}`, `${r.p5}:1 (worst ${r.worst}:1)`, `needs ${r.need}:1${r.large ? " (large)" : ""}`].join("\t"));
console.error(`screen-contrast: ${rows.length} texts, ${failing.length} under`);
process.exit(failing.length ? 1 : 0);
