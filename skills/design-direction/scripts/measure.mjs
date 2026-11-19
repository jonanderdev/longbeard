#!/usr/bin/env node
// Read a reference's real numbers, so the library records what is there and
// nothing is judged by eye. Prints JSON. Node 22+, an installed Chrome.
//
// An image: its most common colours and its loud ones, each with its share of
// the picture, and its traits: how light the ground is, how much of the
// picture is that ground (empty), and how much is loud colour.
//   node measure.mjs design-exploration/<slug>/refs/name.jpg
//
// A live page: its ground colour, the fonts it loaded, and every piece of text
// on the first screen with its face, size, weight, style, tracking, case,
// colour and box, plus the boxes of its pictures and panels, and its traits:
// the type scale (largest text over the most common size), how much of the
// first screen is pictures, the left margin, and the corner radius in use.
//
// Traits are what families are sorted by and what a family shares, so every
// keep is measured the same way before anyone judges it by eye.
//   node measure.mjs https://example.com
//   node measure.mjs https://example.com --wait 9000 --width 390
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args.splice(i, 2)[1];
};
const width = Math.round(Number(flag("width", "1440")));
const waitArg = flag("wait", "");
const target = args[0];
const isUrl = /^https?:\/\//.test(target || "");
const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };
if (!target || args.length !== 1 || (!isUrl && !mime[extname(target).toLowerCase()])) {
  console.error("usage: node measure.mjs <https://url | image.jpg|png|webp|gif|avif> [--wait ms] [--width 1440]");
  process.exit(2);
}
if (!isUrl && !existsSync(target)) {
  console.error(`measure: no file at ${target}`);
  process.exit(1);
}
const wait = waitArg === "" ? (isUrl ? 6000 : 0) : Number(waitArg);
if (!Number.isFinite(wait) || wait < 0 || wait > 120000 || !Number.isFinite(width) || width < 200 || width > 3840) {
  console.error("wait must be ms from 0 to 120000, width from 200 to 3840");
  process.exit(2);
}
const height = width < 768 ? 844 : 900;

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const local = process.env.LOCALAPPDATA || "";
  const pf = process.env.PROGRAMFILES || "C:\\Program Files";
  const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const candidates = [
    join(pf, "Google/Chrome/Application/chrome.exe"),
    join(pf86, "Google/Chrome/Application/chrome.exe"),
    join(local, "Google/Chrome/Application/chrome.exe"),
    join(pf, "Microsoft/Edge/Application/msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((path) => path && existsSync(path)) || null;
}

const exe = findChrome();
if (!exe) {
  console.error("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
  process.exit(1);
}
if (typeof WebSocket === "undefined") {
  console.error("Node 22+ is required.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "measure-chrome-"));
let proc;
process.once("exit", () => {
  try {
    if (proc?.pid) process.kill(proc.pid, "SIGKILL");
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
});

// An image is read inside a page of our own, as a data URL, so the canvas can be read back.
let address = target;
if (!isUrl) {
  const data = readFileSync(resolve(target)).toString("base64");
  const page = join(dir, "image.html");
  writeFileSync(page, `<!doctype html><img id="i" src="data:${mime[extname(target).toLowerCase()]};base64,${data}">`);
  address = `file://${page}`;
}

proc = spawn(
  exe,
  ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb", `--window-size=${width},${height}`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] },
);
let buf = "";
const wsUrl = await new Promise((done, fail) => {
  const t = setTimeout(() => fail(new Error("Chrome did not start")), 20000);
  proc.stderr.on("data", (d) => {
    buf += d.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) {
      clearTimeout(t);
      done(m[1]);
    }
  });
});
const port = new URL(wsUrl).port;
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((done, fail) => {
  ws.onopen = done;
  ws.onerror = () => fail(new Error("CDP socket failed"));
});
let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((done) => {
    pending.set(++nextId, done);
    ws.send(JSON.stringify({ id: nextId, method, params }));
  });
const evaluate = async (expression) => {
  const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description || "the page threw");
  return reply.result.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
await send("Page.enable");
await send("Page.navigate", { url: address });
for (let i = 0; i < 100 && (await evaluate("document.readyState")) !== "complete"; i++) await sleep(200);
await sleep(wait);

// Colours are binned sixteen steps a channel. "Loud" is saturated and at least 0.4% of the picture.
const readImage = `(async () => {
  const img = document.getElementById("i");
  await img.decode();
  const k = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d");
  c.drawImage(img, 0, 0, w, h);
  const d = c.getImageData(0, 0, w, h).data, bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const key = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
    const b = bins.get(key) || [0, 0, 0, 0];
    b[0]++; b[1] += d[i]; b[2] += d[i + 1]; b[3] += d[i + 2];
    bins.set(key, b);
  }
  const n = d.length / 4;
  const hex = (b) => "#" + [1, 2, 3].map((j) => Math.round(b[j] / b[0]).toString(16).padStart(2, "0")).join("");
  const sat = (b) => { const v = [1, 2, 3].map((j) => b[j] / b[0]); return (Math.max(...v) - Math.min(...v)) / 255; };
  const row = (b) => ({ colour: hex(b), share: Math.round((1000 * b[0]) / n) / 10 });
  const all = [...bins.values()].sort((a, b) => b[0] - a[0]);
  const avg = (b) => [1, 2, 3].map((j) => b[j] / b[0]);
  const lum = (v) => { const c = v.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const top = avg(all[0]);
  const near = (b) => avg(b).every((x, j) => Math.abs(x - top[j]) <= 24);
  const pct = (count) => Math.round((1000 * count) / n) / 10;
  const l = lum(top);
  const traits = {
    ground: hex(all[0]),
    tone: l > 0.6 ? "light" : l < 0.12 ? "dark" : "mid",
    empty: pct(all.filter(near).reduce((t, b) => t + b[0], 0)),
    loud: pct(all.filter((b) => sat(b) > 0.5).reduce((t, b) => t + b[0], 0)),
  };
  return { width: img.naturalWidth, height: img.naturalHeight, traits, common: all.slice(0, 6).map(row), loud: all.filter((b) => sat(b) > 0.5 && b[0] / n > 0.004).slice(0, 4).map(row) };
})()`;

const readPage = `(() => {
  const W = innerWidth, H = innerHeight, box = (r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  const out = { screen: [W, H], ground: getComputedStyle(document.body).backgroundColor, root: getComputedStyle(document.documentElement).backgroundColor, text: [], boxes: [] };
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.top > H || r.bottom < 0 || r.left > W || r.right < 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (own && !seen.has(own.slice(0, 24) + cs.fontSize)) {
      seen.add(own.slice(0, 24) + cs.fontSize);
      out.text.push({ text: own.slice(0, 40), face: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(), size: cs.fontSize, weight: cs.fontWeight, style: cs.fontStyle, tracking: cs.letterSpacing, leading: cs.lineHeight, case: cs.textTransform, colour: cs.color, box: box(r) });
    }
    const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && r.width < W - 40;
    if ((/^(IMG|VIDEO|CANVAS|svg)$/.test(el.tagName) || cs.backgroundImage !== "none" || filled) && r.width > 30)
      out.boxes.push({ kind: el.tagName.toLowerCase(), fill: cs.backgroundColor, radius: cs.borderRadius, box: box(r) });
  }
  out.fonts = [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "") + " " + f.weight + " " + f.style))];
  // Traits. The body size is the size most text is set in, by count of pieces.
  const sizes = out.text.map((t) => parseFloat(t.size)).filter((x) => x > 0);
  const tally = new Map();
  for (const x of sizes) tally.set(x, (tally.get(x) || 0) + 1);
  const body = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 0;
  const largest = sizes.length ? Math.max(...sizes) : 0;
  // Picture cover is counted on a coarse grid, so overlapping pictures count once.
  const cells = new Set();
  for (const b of out.boxes) {
    if (b.kind === "div" && b.fill !== "rgba(0, 0, 0, 0)") continue;
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) cells.add(gx + "," + gy);
  }
  const radii = out.boxes.map((b) => b.radius).filter((r) => r && r !== "0px");
  const radius = radii.length ? [...radii.reduce((m, r) => m.set(r, (m.get(r) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0][0] : "0px";
  const lefts = out.text.map((t) => t.box[0]).filter((x) => x >= 0);
  out.traits = {
    display: largest + "px",
    body: body + "px",
    scale: body ? Math.round((10 * largest) / body) / 10 : null,
    pictures: Math.round((1000 * cells.size) / (Math.ceil(W / 20) * Math.ceil(H / 20))) / 10,
    margin: lefts.length ? Math.round((1000 * Math.min(...lefts)) / W) / 10 : null,
    radius,
  };
  return out;
})()`;

let result;
try {
  result = await evaluate(isUrl ? readPage : readImage);
} catch (error) {
  console.error(`measure: ${error.message}`);
  process.exit(1);
}
console.log(JSON.stringify(result, null, 1));
ws.close();
process.exit(0);
