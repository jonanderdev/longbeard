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
//
// Many at once, in one browser: images are read one after another in one
// page, live pages in up to --jobs tabs at a time. A folder means every image
// in it. --tsv prints one row of numbers per reference, with a header, which
// is what families.mjs reads and costs far fewer tokens than the JSON.
//   node measure.mjs design-exploration/<slug>/refs --tsv > design-exploration/<slug>/traits.tsv
//   node measure.mjs refs/a.jpg refs/b.png https://example.com --jobs 4 --tsv
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args.splice(i, 2)[1];
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const width = Math.round(Number(flag("width", "1440")));
const waitArg = flag("wait", "");
const jobs = Math.round(Number(flag("jobs", "4")));
const tsv = has("tsv");
const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };
const isUrl = (t) => /^https?:\/\//.test(t);
const usage = "usage: node measure.mjs <https://url | image | folder> … [--tsv] [--jobs 4] [--wait ms] [--width 1440]";
if (!args.length) {
  console.error(usage);
  process.exit(2);
}
const targets = [];
for (const arg of args) {
  if (isUrl(arg)) targets.push(arg);
  else if (existsSync(arg) && statSync(arg).isDirectory()) {
    for (const f of readdirSync(arg).sort()) if (mime[extname(f).toLowerCase()]) targets.push(join(arg, f));
  } else if (mime[extname(arg).toLowerCase()]) {
    if (!existsSync(arg)) {
      console.error(`measure: no file at ${arg}`);
      process.exit(1);
    }
    targets.push(arg);
  } else {
    console.error(usage);
    process.exit(2);
  }
}
if (!targets.length) {
  console.error("measure: no images or links to measure");
  process.exit(1);
}
const wait = waitArg === "" ? 6000 : Number(waitArg);
if (!Number.isFinite(wait) || wait < 0 || wait > 120000 || !Number.isFinite(width) || width < 200 || width > 3840 || !(jobs >= 1 && jobs <= 8)) {
  console.error("wait must be ms from 0 to 120000, width from 200 to 3840, jobs from 1 to 8");
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

// One browser for every reference. Each tab is a session on one socket.
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
const ws = new WebSocket(wsUrl);
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
const send = (method, params = {}, sessionId) =>
  new Promise((done) => {
    pending.set(++nextId, done);
    ws.send(JSON.stringify(sessionId ? { id: nextId, method, params, sessionId } : { id: nextId, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openTab() {
  const { result } = await send("Target.createTarget", { url: "about:blank" });
  const { result: attached } = await send("Target.attachToTarget", { targetId: result.targetId, flatten: true });
  const sid = attached.sessionId;
  const call = (method, params) => send(method, params, sid);
  const evaluate = async (expression) => {
    const reply = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (reply.error) throw new Error(reply.error.message);
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description || "the page threw");
    return reply.result.result.value;
  };
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await call("Page.enable");
  return { call, evaluate };
}

// Colours are binned sixteen steps a channel. "Loud" is saturated and at least 0.4% of the picture.
const readImage = (src) => `(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(src)};
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
  // Busy: how much changes from one pixel to the next, on the small copy. Flat
  // grounds and big shapes are low; small type, texture and photographs are high.
  let edges = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, g = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    const r = x + 1 < w ? i + 4 : i, b = y + 1 < h ? i + 4 * w : i;
    edges += Math.abs(g - (0.3 * d[r] + 0.59 * d[r + 1] + 0.11 * d[r + 2])) + Math.abs(g - (0.3 * d[b] + 0.59 * d[b + 1] + 0.11 * d[b + 2]));
  }
  const traits = {
    ground: hex(all[0]),
    tone: l > 0.6 ? "light" : l < 0.12 ? "dark" : "mid",
    empty: pct(all.filter(near).reduce((t, b) => t + b[0], 0)),
    loud: pct(all.filter((b) => sat(b) > 0.5).reduce((t, b) => t + b[0], 0)),
    busy: Math.round((10 * edges) / (2 * n * 2.55)) / 10,
    lum: Math.round(l * 1000) / 1000,
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


// An image is read in the tab as a data URL, so its pixels can be read back. No navigation per image.
async function measureImage(tab, path) {
  const src = `data:${mime[extname(path).toLowerCase()]};base64,${readFileSync(resolve(path)).toString("base64")}`;
  return tab.evaluate(readImage(src));
}
async function measurePage(tab, url) {
  await tab.call("Page.navigate", { url });
  for (let i = 0; i < 100 && (await tab.evaluate("document.readyState")) !== "complete"; i++) await sleep(200);
  await sleep(wait);
  return tab.evaluate(readPage);
}

const results = new Array(targets.length);
const images = targets.map((t, i) => [t, i]).filter(([t]) => !isUrl(t));
const pages = targets.map((t, i) => [t, i]).filter(([t]) => isUrl(t));
const run = async (queue, measure) => {
  const tab = await openTab();
  for (let item = queue.shift(); item; item = queue.shift()) {
    const [target, i] = item;
    try {
      results[i] = { target, ...(await measure(tab, target)) };
    } catch (error) {
      results[i] = { target, error: error.message };
    }
  }
};
const workers = [];
if (images.length) workers.push(run(images, measureImage));
for (let k = 0; k < Math.min(jobs, pages.length); k++) workers.push(run(pages, measurePage));
await Promise.all(workers);
ws.close();

const failed = results.filter((r) => r.error);
for (const r of failed) console.error(`measure: ${r.target}: ${r.error}`);
if (tsv) {
  const cols = ["tone", "lum", "empty", "loud", "busy", "ground", "display", "body", "scale", "pictures", "margin", "radius"];
  const lines = [["ref", ...cols].join("\t")];
  for (const r of results) if (!r.error) lines.push([r.target, ...cols.map((c) => r.traits?.[c] ?? "")].join("\t"));
  console.log(lines.join("\n"));
} else if (targets.length === 1) {
  if (failed.length) process.exit(1);
  const { target, ...one } = results[0];
  console.log(JSON.stringify(one, null, 1));
} else console.log(JSON.stringify(results, null, 1));
process.exit(failed.length === targets.length ? 1 : 0);
