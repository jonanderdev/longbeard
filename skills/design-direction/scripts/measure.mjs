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
// colour and box, plus the boxes of its pictures and panels, the gradients it
// uses as written, and its traits: the type scale (largest text over the most
// common size), how much of the first screen is pictures and how much is
// gradient, where the largest text sits (centre, left, right), the left
// margin, and the corner radius in use. Animations that end are read at their end. A page that
// is not the real site (an error status, a maintenance or bot-check page, nothing on it) is
// flagged with the reason, in "flag": families.mjs leaves its numbers out.
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
//
// Nothing is measured twice. Every result is kept in design-exploration/.cache
// (or --cache dir): a picture under the hash of its bytes, so the same picture
// in another exploration is free, and a live page under its link and width for
// --max-age days (14), since sites change. A change to this script starts the
// cache over. --fresh measures everything again. A flagged page is not kept.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
const linksArg = flag("links", "");
const profilesArg = flag("profiles", "");
const cacheArg = flag("cache", "");
const maxAge = Number(flag("max-age", "14"));
const fresh = has("fresh");
const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };
const isUrl = (t) => /^(https?|file):\/\//.test(t);
const usage = "usage: node measure.mjs <https://url | image | folder> … [--tsv | --links links.tsv --profiles profiles.json] [--jobs 4] [--wait ms] [--width 1440] [--cache dir] [--max-age days] [--fresh]";
if (!args.length) {
  console.error(usage);
  process.exit(2);
}
const targets = [];
// A frame stands for its folder: its profile is named after the folder, not the frame.
const names = new Map();
for (const arg of args) {
  if (isUrl(arg)) targets.push(arg);
  else if (existsSync(arg) && statSync(arg).isDirectory()) {
    for (const f of readdirSync(arg).sort()) {
      const path = join(arg, f);
      if (mime[extname(f).toLowerCase()]) targets.push(path);
      // A keep that only moves is a folder of frames (capture.mjs --frames): its middle frame stands for it.
      else if (statSync(path).isDirectory()) {
        const frames = readdirSync(path).filter((x) => mime[extname(x).toLowerCase()]).sort();
        if (!frames.length) continue;
        const shot = join(path, frames[Math.floor(frames.length / 2)]);
        names.set(shot, f);
        targets.push(shot);
      }
    }
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
// Profiles: each picture, its live page (from --links, name<TAB>link), into one JSON per exploration.
const nameOf = (path) => names.get(path) || basename(path, extname(path));
const links = new Map();
if (linksArg) {
  if (!existsSync(linksArg)) {
    console.error(`measure: no links at ${linksArg}`);
    process.exit(1);
  }
  for (const l of readFileSync(linksArg, "utf8").split(/\r?\n/)) {
    const [name, link] = l.split("\t").map((x) => (x || "").trim());
    if (name && /^https?:\/\//.test(link || "")) links.set(nameOf(name), link);
  }
  for (const t of [...targets]) if (!isUrl(t) && links.has(nameOf(t)) && !targets.includes(links.get(nameOf(t)))) targets.push(links.get(nameOf(t)));
}
if (profilesArg && tsv) {
  console.error("measure: --profiles and --tsv are two outputs: pick one");
  process.exit(2);
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

// The cache: what was measured, by the picture's bytes or the page's link, for this version of the script.
const inExploration = targets.map((t) => (isUrl(t) ? "" : resolve(t).match(/^(.*[\\/]design-exploration)[\\/]/)?.[1])).find(Boolean);
const cacheDir = cacheArg || (existsSync("design-exploration") ? "design-exploration/.cache" : inExploration ? join(inExploration, ".cache") : "");
// A local file:// page is work in progress, so it is always measured.
const cacheable = (t) => !t.startsWith("file:");
const version = createHash("sha256").update(readFileSync(fileURLToPath(import.meta.url))).digest("hex").slice(0, 12);
const keyOf = (t) => createHash("sha256").update(isUrl(t) ? `${version} page ${width} ${t}` : `${version} image ${createHash("sha256").update(readFileSync(t)).digest("hex")}`).digest("hex").slice(0, 32);
const cachePath = (t) => join(cacheDir, isUrl(t) ? "pages" : "images", `${keyOf(t)}.json`);
function fromCache(t) {
  if (!cacheDir || fresh || !cacheable(t)) return null;
  try {
    const hit = JSON.parse(readFileSync(cachePath(t), "utf8"));
    if (isUrl(t) && !(Date.now() - Date.parse(hit.at) < maxAge * 864e5)) return null;
    delete hit.at;
    return { target: t, ...hit };
  } catch {
    return null;
  }
}
function toCache(r) {
  if (!cacheDir || r.error || r.flag || !cacheable(r.target)) return;
  try {
    const { target, ...rest } = r;
    mkdirSync(dirname(cachePath(target)), { recursive: true });
    writeFileSync(cachePath(target), JSON.stringify({ at: new Date().toISOString(), ...rest }));
  } catch {}
}
const results = targets.map(fromCache);
const reused = results.filter(Boolean).length;
if (!Number.isFinite(maxAge) || maxAge < 0) {
  console.error("max-age must be days, 0 or more");
  process.exit(2);
}

let ws, send;
async function startChrome() {
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
  ws = new WebSocket(wsUrl);
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
  send = (method, params = {}, sessionId) =>
    new Promise((done) => {
      pending.set(++nextId, done);
      ws.send(JSON.stringify(sessionId ? { id: nextId, method, params, sessionId } : { id: nextId, method, params }));
    });
}
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
  // Only the first screen: a tall desktop capture (a full page) is cut to the 1440 by 900 it opens on.
  // A phone or portrait shot is narrower than 1000 px and is read whole.
  const sw = img.naturalWidth;
  const sh = sw >= 1000 && img.naturalHeight > sw * 0.75 ? Math.round((sw * 900) / 1440) : img.naturalHeight;
  const k = Math.min(1, 200 / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d");
  c.drawImage(img, 0, 0, sw, sh, 0, 0, w, h);
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
  // The figure: everything that is not the ground, read again at 400 px so texture survives.
  // What the picture is shows here: a photograph has many colours and fine texture, a flat
  // illustration few colours and hard edges, a 3D render many colours and soft surfaces,
  // chrome mostly grey with sharp highlights, lettering two colours and long hard edges.
  const k2 = Math.min(1, 400 / Math.max(sw, sh));
  const w2 = Math.max(1, Math.round(sw * k2)), h2 = Math.max(1, Math.round(sh * k2));
  const c2 = Object.assign(document.createElement("canvas"), { width: w2, height: h2 }).getContext("2d");
  c2.drawImage(img, 0, 0, sw, sh, 0, 0, w2, h2);
  const e = c2.getImageData(0, 0, w2, h2).data;
  const isFig = (i) => Math.max(Math.abs(e[i] - top[0]), Math.abs(e[i + 1] - top[1]), Math.abs(e[i + 2] - top[2])) > 24;
  const lumOf = (i) => 0.3 * e[i] + 0.59 * e[i + 1] + 0.11 * e[i + 2];
  const COLS = 6, ROWS = 4, grid = new Array(COLS * ROWS).fill(0), cell = new Array(COLS * ROWS).fill(0);
  const fbins = new Map();
  let F = 0, grey = 0, flat = 0, soft = 0, sharp = 0, tex = 0, srg = 0, syb = 0, srg2 = 0, syb2 = 0;
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const i = (y * w2 + x) * 4, g = Math.min(COLS - 1, Math.floor((x * COLS) / w2)) + COLS * Math.min(ROWS - 1, Math.floor((y * ROWS) / h2));
    cell[g]++;
    if (!isFig(i)) continue;
    F++; grid[g]++;
    const key = (e[i] >> 4) << 8 | (e[i + 1] >> 4) << 4 | (e[i + 2] >> 4);
    fbins.set(key, (fbins.get(key) || 0) + 1);
    const mx = Math.max(e[i], e[i + 1], e[i + 2]), mn = Math.min(e[i], e[i + 1], e[i + 2]);
    if (mx - mn < 0.12 * 255) grey++;
    const rg = e[i] - e[i + 1], yb = 0.5 * (e[i] + e[i + 1]) - e[i + 2];
    srg += rg; syb += yb; srg2 += rg * rg; syb2 += yb * yb;
    const r = x + 1 < w2 ? i + 4 : i, b = y + 1 < h2 ? i + 4 * w2 : i;
    const diff = Math.max(Math.abs(lumOf(i) - lumOf(r)), Math.abs(lumOf(i) - lumOf(b)));
    tex += diff;
    if (diff <= 2) flat++; else if (diff <= 10) soft++; else sharp++;
  }
  const share = (v) => (F ? Math.round((1000 * v) / F) / 10 : 0);
  const fsorted = [...fbins.entries()].sort((a, b) => b[1] - a[1]);
  let covered = 0, colours = 0;
  for (const [, count] of fsorted) { if (covered >= 0.9 * F) break; covered += count; colours++; }
  const mrg = F ? srg / F : 0, myb = F ? syb / F : 0;
  const colourful = F ? Math.sqrt(Math.max(0, srg2 / F - mrg * mrg) + Math.max(0, syb2 / F - myb * myb)) + 0.3 * Math.sqrt(mrg * mrg + myb * myb) : 0;
  const binHex = (key) => "#" + [(key >> 8) & 15, (key >> 4) & 15, key & 15].map((v) => (v * 17).toString(16).padStart(2, "0")).join("");
  const figure = {
    share: Math.round((1000 * F) / (w2 * h2)) / 10,
    colours,
    colourful: Math.round(colourful),
    grey: share(grey),
    flat: share(flat),
    soft: share(soft),
    sharp: share(sharp),
    texture: F ? Math.round((10 * tex) / F) / 10 : 0,
    palette: fsorted.slice(0, 5).map(([key, count]) => ({ colour: binHex(key), share: share(count) })),
    grid: grid.map((v, g) => Math.round((100 * v) / Math.max(1, cell[g]))),
  };
  const traits = {
    ground: hex(all[0]),
    tone: l > 0.6 ? "light" : l < 0.12 ? "dark" : "mid",
    empty: pct(all.filter(near).reduce((t, b) => t + b[0], 0)),
    loud: pct(all.filter((b) => sat(b) > 0.5).reduce((t, b) => t + b[0], 0)),
    busy: Math.round((10 * edges) / (2 * n * 2.55)) / 10,
    lum: Math.round(l * 1000) / 1000,
  };
  return { width: img.naturalWidth, height: img.naturalHeight, firstScreen: sh < img.naturalHeight, traits, figure, common: all.slice(0, 6).map(row), loud: all.filter((b) => sat(b) > 0.5 && b[0] / n > 0.004).slice(0, 4).map(row) };
})()`;

const readPage = `(() => {
  const W = innerWidth, H = innerHeight, box = (r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  const out = { screen: [W, H], ground: getComputedStyle(document.body).backgroundColor, root: getComputedStyle(document.documentElement).backgroundColor, text: [], boxes: [], icons: 0, solids: [] };
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    let r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // An element with no box of its own (display: contents, a headline split into word spans) is
    // still read by its words: their own box stands for it, and its parent says whether it shows.
    const boxless = r.width < 2 || r.height < 2;
    const ownText = boxless ? [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()) : [];
    if (ownText.length) {
      const range = document.createRange();
      range.setStartBefore(ownText[0]);
      range.setEndAfter(ownText.at(-1));
      r = range.getBoundingClientRect();
    }
    if (r.width < 2 || r.height < 2 || r.top > H || r.bottom < 0 || r.left > W || r.right < 0) continue;
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    // Hidden by an ancestor (an opacity of 0 on a wrapper, mid-reveal) is hidden too.
    const shown = boxless ? el.parentElement : el;
    if (shown?.checkVisibility && !shown.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (own && !seen.has(own.slice(0, 24) + cs.fontSize)) {
      seen.add(own.slice(0, 24) + cs.fontSize);
      // The text's own box, from a range over its words: a heading's block runs the full width even when
      // its words sit left, and its box would read as centred.
      const words = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      const range = document.createRange();
      range.setStartBefore(words[0]);
      range.setEndAfter(words.at(-1));
      const tr = range.getBoundingClientRect();
      out.text.push({ text: own.slice(0, 40), face: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(), size: cs.fontSize, weight: cs.fontWeight, style: cs.fontStyle, tracking: cs.letterSpacing, leading: cs.lineHeight, case: cs.textTransform, colour: cs.color, box: box(tr.width ? tr : r) });
    }
    // Icons: small pictures and drawings, a logo row, emoji, pictograms.
    const tag = el.tagName.toLowerCase();
    const small = r.width >= 12 && r.height >= 12 && r.width <= 72 && r.height <= 72;
    const mask = cs.maskImage || cs.webkitMaskImage || "none";
    const before = getComputedStyle(el, "::before").content;
    const glyph = (own.length > 0 && own.length <= 2 && !/[A-Za-z0-9]/.test(own)) || (before && before !== "none" && before !== "normal" && before.replace(/["']/g, "").length > 0 && before.replace(/["']/g, "").length <= 2);
    if (small && (tag === "img" || (tag === "svg" && !el.parentElement.closest("svg")) || /url\\(/.test(cs.backgroundImage) || mask !== "none" || glyph)) out.icons++;
    // Solid blocks: an opaque fill of its own colour, at least a fortieth of the screen. A band, a card, a shape.
    const alpha = (cs.backgroundColor.match(/rgba?[(]([^)]*)[)]/) || [, ""])[1].split(",").map(Number)[3];
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && !(alpha < 0.9) && r.width * r.height >= (W * H) / 40) out.solids.push({ fill: cs.backgroundColor, box: box(r), radius: cs.borderRadius });
    const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && r.width < W - 40;
    if ((/^(IMG|VIDEO|CANVAS|svg)$/.test(el.tagName) || cs.backgroundImage !== "none" || filled) && r.width > 30 && r.height > 2)
      out.boxes.push({ kind: el.tagName.toLowerCase(), fill: cs.backgroundColor, radius: cs.borderRadius, box: box(r), picture: /^(IMG|VIDEO|CANVAS)$/.test(el.tagName) || /url\\(/.test(cs.backgroundImage), gradient: /gradient\\(/.test(cs.backgroundImage) ? cs.backgroundImage.slice(0, 240) : "", size: cs.backgroundSize, repeat: cs.backgroundRepeat });
  }
  // Whether this is the real site: the answer's status, and how much it says. A maintenance page,
  // a bot check or an error page is not a reference, however it looks.
  out.status = performance.getEntriesByType("navigation")[0]?.responseStatus || 0;
  const said = (document.body.innerText || "").replace(/\\s+/g, " ").trim();
  out.words = said ? said.split(" ").length : 0;
  out.said = said.slice(0, 3000);
  out.fonts = [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "") + " " + f.weight + " " + f.style))];
  // Traits. The body size is the size most text is set in, by characters: a title split into one
  // element per letter is still a few characters, and a paragraph is many.
  const sizes = out.text.map((t) => parseFloat(t.size)).filter((x) => x > 0);
  const tally = new Map();
  for (const t of out.text) {
    const x = parseFloat(t.size);
    if (x > 0) tally.set(x, (tally.get(x) || 0) + t.text.length);
  }
  // One size alone (a hero whose only text is its headline) has no body to compare it with.
  const body = tally.size > 1 ? [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 0 : 0;
  // Lettering drawn as an SVG or an image (a wordmark, a title set as a picture) is display type too:
  // a box at least a quarter of the screen wide and at least three times as wide as it is tall.
  // Its height stands for its size: a cap height is about 0.7 of the size it was set at.
  const words = [];
  for (const el of document.querySelectorAll("svg, img")) {
    const r = el.getBoundingClientRect();
    // A line of lettering: a quarter of the screen wide or more, three times as wide as tall, and no
    // taller than about a third of the screen (the largest wordmarks seen were under 320 px of 900).
    if (r.bottom < 0 || r.top > H || r.width < W / 4 || r.height < 24 || r.height > H * 0.36 || r.width / r.height < 3) continue;
    if (el.closest("svg") !== el && el.tagName.toLowerCase() !== "img") continue;
    // Lettering is drawn: an SVG, or an image whose file is one. A wide photograph is a banner, not a word.
    if (el.tagName.toLowerCase() === "img" && !/\\.svg([?#]|$)|^data:image\\/svg/i.test(el.currentSrc || el.src || "")) continue;
    words.push(Math.round(r.height / 0.7));
  }
  const largestText = sizes.length ? Math.max(...sizes) : 0;
  const largestWord = words.length ? Math.max(...words) : 0;
  const largest = Math.max(largestText, largestWord);
  // Picture cover is counted on a coarse grid, so overlapping pictures count once.
  // Only real pictures: an image, a video, a canvas or a url() background, never a gradient or a panel.
  const cells = new Set();
  for (const b of out.boxes) {
    if (!b.picture) continue;
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) cells.add(gx + "," + gy);
  }
  // Gradients are recorded, never judged: how much of the first screen they cover, and the largest
  // ones as written, so a family that relies on one keeps it. Counted on the same grid as pictures.
  // A gradient counts only when it can be seen: its colours differ, and they are not all see-through.
  // Colours of any kind (rgb, hsl, oklch, lab, hex, transparent) are read the same way: painted on
  // one pixel and read back, so a modern colour function is never missed.
  const px = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
  const rgba = (token) => {
    px.clearRect(0, 0, 1, 1);
    px.fillStyle = "rgba(0, 0, 0, 0)";
    px.fillStyle = token;
    px.fillRect(0, 0, 1, 1);
    const d = px.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const visible = (css) => {
    const stops = [...css.matchAll(/(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\([^()]*\\)|#[0-9a-fA-F]{3,8}\\b|\\btransparent\\b/g)].map((m) => rgba(m[0]));
    const solid = stops.filter((c) => c[3] >= 0.15);
    if (solid.length < 1 || stops.length < 2) return false;
    if (solid.length < stops.length) return true;
    return stops.some((c) => stops.some((d) => Math.max(...[0, 1, 2].map((k) => Math.abs(c[k] - d[k]))) > 24));
  };
  // A pattern repeats: a repeating gradient, or a gradient tiled at a small size (a dot grid, fine
  // lines). A gradient with px stops that runs across its box once is a fade, not a pattern.
  const isPattern = (css, size = "", repeat = "") => /repeating-/.test(css) || (!/no-repeat/.test(repeat) && /\\d/.test(size) && size.split(/[ ,]+/).filter((v) => /px$/.test(v)).length > 0 && size.split(/[ ,]+/).filter((v) => /px$/.test(v)).every((v) => parseFloat(v) <= 64));
  for (const b of out.boxes) if (b.gradient && !visible(b.gradient)) b.gradient = "";
  for (const b of out.boxes) if (b.gradient && isPattern(b.gradient, b.size, b.repeat)) [b.pattern, b.gradient] = [b.gradient, ""];
  const pcells = new Set();
  for (const b of out.boxes) {
    if (!b.pattern) continue;
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) pcells.add(gx + "," + gy);
  }
  const gcells = new Set();
  for (const b of out.boxes) {
    if (!b.gradient) continue;
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) gcells.add(gx + "," + gy);
  }
  for (const layer of [document.documentElement, document.body]) {
    const bg = getComputedStyle(layer).backgroundImage;
    if (/gradient\\(/.test(bg) && visible(bg)) {
      const pattern = isPattern(bg, getComputedStyle(layer).backgroundSize, getComputedStyle(layer).backgroundRepeat);
      for (let gx = 0; gx < W / 20; gx++) for (let gy = 0; gy < H / 20; gy++) (pattern ? pcells : gcells).add(gx + "," + gy);
      out.boxes.push({ kind: layer.tagName.toLowerCase(), box: [0, 0, W, H], gradient: pattern ? "" : bg.slice(0, 240), pattern: pattern ? bg.slice(0, 240) : "" });
    }
  }
  out.patterns = out.boxes.filter((b) => b.pattern).slice(0, 3).map((b) => ({ css: b.pattern, box: b.box }));
  out.gradients = out.boxes.filter((b) => b.gradient).sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).slice(0, 3).map((b) => ({ css: b.gradient, box: b.box }));
  // Where the largest text sits across the screen: centred, left or right.
  const big = out.text.reduce((m, t) => (parseFloat(t.size) > parseFloat(m?.size || 0) ? t : m), null);
  const cx = big ? big.box[0] + big.box[2] / 2 : W / 2;
  const align = !big ? "" : Math.abs(cx - W / 2) < W * 0.08 ? "centre" : cx < W / 2 ? "left" : "right";
  // What the first screen is made of: how much is photographs and images, video, canvas (most
  // often WebGL: 3D and generative work) and SVG drawing. A picture's kind is half of what it looks like.
  const media = { image: new Set(), video: new Set(), canvas: new Set(), svg: new Set() };
  for (const b of out.boxes) {
    const kind = b.kind === "video" ? "video" : b.kind === "canvas" ? "canvas" : b.kind === "svg" ? "svg" : b.picture ? "image" : "";
    if (!kind) continue;
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) media[kind].add(gx + "," + gy);
  }
  // Blocks: how much of the screen is solid colour other than the ground.
  // A fill over most of the screen is the ground, whatever element carries it (a wrapper, a main).
  // With no ground set on body or html, the page's ground is the browser's white. And the fill that
  // covers the most of the screen, when it covers at least two fifths, is the ground in sections.
  const bare = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
  const grounds = new Set([out.ground, out.root, ...out.solids.filter((b) => b.box[2] * b.box[3] >= 0.85 * W * H).map((b) => b.fill)]);
  if (bare(out.ground) && bare(out.root)) grounds.add("rgb(255, 255, 255)");
  const byFill = new Map();
  for (const b of out.solids) {
    const cellsOf = byFill.get(b.fill) || new Set();
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) cellsOf.add(gx + "," + gy);
    byFill.set(b.fill, cellsOf);
  }
  const [topFill] = [...byFill].sort((a, b) => b[1].size - a[1].size);
  if (topFill && topFill[1].size >= 0.4 * Math.ceil(W / 20) * Math.ceil(H / 20)) grounds.add(topFill[0]);
  const bcells = new Set();
  for (const b of out.solids) {
    if (grounds.has(b.fill)) continue;
    const [x, y, w, h] = b.box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(W / 20, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(H / 20, Math.ceil((y + h) / 20)); gy++) bcells.add(gx + "," + gy);
  }
  out.blocks = Math.round((1000 * bcells.size) / (Math.ceil(W / 20) * Math.ceil(H / 20))) / 10;
  delete out.solids;
  out.media = Object.fromEntries(Object.entries(media).map(([k, v]) => [k, Math.round((1000 * v.size) / (Math.ceil(W / 20) * Math.ceil(H / 20))) / 10]));
  const radii = out.boxes.map((b) => b.radius).filter((r) => r && r !== "0px");
  const radius = radii.length ? [...radii.reduce((m, r) => m.set(r, (m.get(r) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0][0] : "0px";
  const lefts = out.text.map((t) => t.box[0]).filter((x) => x >= 0);
  out.traits = {
    display: largest + "px",
    body: body ? body + "px" : null,
    scale: body ? Math.round((10 * largest) / body) / 10 : null,
    pictures: Math.round((1000 * cells.size) / (Math.ceil(W / 20) * Math.ceil(H / 20))) / 10,
    margin: lefts.length ? Math.round((1000 * Math.min(...lefts)) / W) / 10 : null,
    radius: parseFloat(radius) > 999 ? "pill" : radius,
    lettering: largestWord > largestText ? "picture" : "text",
    gradient: Math.round((1000 * gcells.size) / (Math.ceil(W / 20) * Math.ceil(H / 20))) / 10,
    pattern: Math.round((1000 * pcells.size) / (Math.ceil(W / 20) * Math.ceil(H / 20))) / 10,
    icons: out.icons,
    blocks: out.blocks,
    align,
  };
  return out;
})()`;


// An image is read in the tab as a data URL, so its pixels can be read back. No navigation per image.
async function measureImage(tab, path) {
  const src = `data:${mime[extname(path).toLowerCase()]};base64,${readFileSync(resolve(path)).toString("base64")}`;
  return tab.evaluate(readImage(src));
}
// A page that is not the real site: an error status, a maintenance or bot-check page, or one that
// says nothing and shows nothing. It is flagged, never dropped here: the eye confirms it.
const NOT_THE_SITE = /\b(under maintenance|down for maintenance|scheduled maintenance|access denied|just a moment|checking your browser|verify you are (a )?human|are you a robot|attention required|enable javascript( and cookies)? to continue|page not found|404 not found|site (is )?(temporarily )?unavailable|domain (is )?for sale|this site can.t be reached)\b/i;
// Words a real page can say too (a product that is coming soon): they count only on a page that says little else.
const NOT_THE_SITE_IF_BARE = /\b(coming soon|launching soon|forbidden|under construction)\b/i;
function notTheSite({ status = 0, words = 0, said = "", pictures = 0 }) {
  if (status >= 400) return `HTTP ${status}`;
  const m = String(said).slice(0, 600).match(NOT_THE_SITE) || (words < 30 && String(said).match(NOT_THE_SITE_IF_BARE));
  if (m && words < 400) return `says "${m[0].toLowerCase()}"`;
  if (!words && !(pictures > 5)) return "no text and no pictures, even after a second wait";
  return "";
}

async function measurePage(tab, url) {
  await tab.call("Page.navigate", { url });
  for (let i = 0; i < 100 && (await tab.evaluate("document.readyState")) !== "complete"; i++) await sleep(200);
  await sleep(wait);
  // Animations that end (a headline that fades or slides in) are read as they end, never mid-way.
  // Ones that loop, and ones a script drives, are read as they are after the wait.
  await tab.evaluate(`(() => { for (const a of document.getAnimations()) { try { if (a.effect?.getComputedTiming().endTime !== Infinity) a.finish(); } catch {} } })()`);
  await sleep(300);
  let out = await tab.evaluate(readPage);
  // Nothing on it yet is often a loader: one more wait before it is called empty.
  if (!out.words && !(out.traits.pictures > 5)) {
    await sleep(Math.max(3000, wait / 2));
    out = await tab.evaluate(readPage);
  }
  out.flag = notTheSite({ status: out.status, words: out.words, said: out.said, pictures: out.traits.pictures });
  delete out.said;
  return out;
}

const images = targets.map((t, i) => [t, i]).filter(([t], i) => !isUrl(t) && !results[i]);
const pages = targets.map((t, i) => [t, i]).filter(([t], i) => isUrl(t) && !results[i]);
if (images.length || pages.length) await startChrome();
// Progress on stderr for a long run: what is being measured, then every tenth done.
const todo = images.length + pages.length;
let done = 0;
if (todo > 10) console.error(`measure: ${images.length} pictures and ${pages.length} pages to measure${pages.length ? `, about ${Math.max(1, Math.round((pages.length * (wait + 2000)) / Math.min(jobs, pages.length) / 60000))} min` : ""}`);
const run = async (queue, measure) => {
  const tab = await openTab();
  for (let item = queue.shift(); item; item = queue.shift()) {
    const [target, i] = item;
    try {
      results[i] = { target, ...(await measure(tab, target)) };
      toCache(results[i]);
      if (todo > 10 && ++done % 10 === 0 && done < todo) console.error(`measure: ${done} of ${todo}`);
    } catch (error) {
      results[i] = { target, error: error.message };
    }
  }
};
const workers = [];
if (images.length) workers.push(run(images, measureImage));
for (let k = 0; k < Math.min(jobs, pages.length); k++) workers.push(run(pages, measurePage));
await Promise.all(workers);
ws?.close();
if (reused) console.error(`measure: ${reused} of ${targets.length} from the cache, ${targets.length - reused} measured`);

const failed = results.filter((r) => r.error);
for (const r of failed) console.error(`measure: ${r.target}: ${r.error}`);
if (profilesArg) {
  // Measurements are replaced, everything else a profile holds (the agent's tags, notes) is kept.
  const store = existsSync(profilesArg) ? JSON.parse(readFileSync(profilesArg, "utf8")) : { refs: {} };
  store.refs ||= {};
  const byTarget = new Map(results.filter((r) => !r.error).map((r) => [r.target, r]));
  const pageOf = (r) => {
    const texts = [...r.text].sort((a, b) => parseFloat(b.size) - parseFloat(a.size)).slice(0, 8);
    return { url: r.target, flag: r.flag || "", status: r.status, traits: r.traits, media: r.media, fonts: r.fonts, gradients: r.gradients, patterns: r.patterns, ground: r.ground, texts };
  };
  for (const t of targets.filter((x) => !isUrl(x))) {
    const r = byTarget.get(t);
    if (!r) continue;
    const name = nameOf(t);
    const link = links.get(name);
    const page = link && byTarget.get(link);
    const old = store.refs[name] || {};
    store.refs[name] = { ...old, shot: t, link: link || old.link || null, image: { traits: r.traits, figure: r.figure, common: r.common, loud: r.loud }, page: page ? pageOf(page) : old.page || null };
  }
  writeFileSync(profilesArg, `${JSON.stringify(store, null, 1)}\n`);
  const n = Object.keys(store.refs).length;
  const withPage = Object.values(store.refs).filter((p) => p.page).length;
  const tagged = Object.values(store.refs).filter((p) => p.tags).length;
  console.log(`profiles: ${profilesArg}, ${n} references, ${withPage} with their page, ${tagged} tagged`);
} else if (tsv) {
  const cols = ["tone", "lum", "empty", "loud", "busy", "ground", "display", "body", "scale", "pictures", "margin", "radius", "lettering", "gradient", "pattern", "icons", "blocks", "align", "flag"];
  const lines = [["ref", ...cols].join("\t")];
  for (const r of results) if (!r.error) lines.push([r.target, ...cols.map((c) => (c === "flag" ? r.flag : r.traits?.[c]) ?? "")].join("\t"));
  console.log(lines.join("\n"));
} else if (targets.length === 1) {
  if (failed.length) process.exit(1);
  const { target, ...one } = results[0];
  console.log(JSON.stringify(one, null, 1));
} else console.log(JSON.stringify(results, null, 1));
process.exit(failed.length === targets.length ? 1 : 0);
