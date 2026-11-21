#!/usr/bin/env node
// Read a reference's real numbers, so the library records what is there and
// nothing is judged by eye. Prints JSON. Node 22+, an installed Chrome.
//
// An image: its most common colours and its loud ones, each with its share of
// the picture, and its traits: how light the ground is, how much of the
// picture is that ground (empty), and how much is loud colour. A screen shown
// on a plain grey or black surround (a presentation frame) is read inside the
// frame, and "frame" names the surround and the box that was read.
//   node measure.mjs .longbeard/design/moodboard/refs/name.jpg
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
// A live page also lists its motion and its finish, read from what the page states. "motion" is
// read before any animation is ended: each transition and animation (property, ms, delay, easing,
// once or loop, what it is on, how many times it is used), the twelve most used, with its trigger:
// load, scroll (animation-timeline), hover (a :hover rule that changes the property), or state
// when no readable rule says. "finish" is what shows on the first screen, each value with the
// share of the screen its elements cover: shadow, textShadow, filter, backdrop, blend and
// texture (an feTurbulence filter, or a small picture tiled over a quarter of the screen or
// more), six of each at most, with "finishMore" saying how many it left out. "motionMore" does the
// same for the motion. Motion a script makes is listed too, as kind "script": a Web Animation (its
// keyframed properties, time and easing as the page set them), and a value a script writes frame
// by frame, seen by watching for about 1.2 s: it has no time and no easing ("not seen", frames
// give no curve). The watch has two parts, at load and while the page is scrolled one screen in
// three steps (the scroll position is put back); a sticky or fixed thing is listed only when it
// changes its transform, opacity, clip-path or filter. A canvas or a video that is playing is
// listed with its cover of the first screen and nothing else. "unread" counts the stylesheets the
// page does not allow reading (another origin) and the canvases whose pixels it does not allow
// reading: nothing is guessed from them, so a hover rule in one reads as "state". Not read: a
// hover that is set up in script, a script that moves things only after a click, motion that has
// ended before the page was read, and texture inside a picture file. Neither is in --tsv; both
// are in the profile's page.
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
//   node measure.mjs .longbeard/design/moodboard/refs --tsv > .longbeard/design/<step>/traits.tsv
//   node measure.mjs refs/a.jpg refs/b.png https://example.com --jobs 4 --tsv
//
// --swatches: images only. The colours a picture is made of, for a palette
// drawn from the product's own subject (subject-colours.mjs reads it). Each
// picture is read at 240 px on its long side, the centre counting more than
// the corners (the subject is usually in the middle), and its pixels are
// grouped into ten colours in OKLab, the same way every time. Each colour has
// its hex, OKLCH lightness (0 to 1), chroma and hue, its share of the
// picture in %, heaviest first, and its edge: how much of it lies in the outer
// fifth of the picture on any side (0 to 1). A colour that is mostly edge is
// a backdrop, a cloth or a wall, not the subject. Prints [{ target, swatches }]
// as JSON.
//   node measure.mjs .longbeard/design/subject --swatches
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";

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
const swatches = has("swatches");
const allLines = has("lines");
const linksArg = flag("links", "");
const profilesArg = flag("profiles", "");
const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };
const isUrl = (t) => /^(https?|file):\/\//.test(t);
const usage = "usage: node measure.mjs <https://url | image | folder> … [--tsv | --links links.tsv --profiles profiles.json] [--jobs 4] [--wait ms] [--width 1440]";
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
    // A name may hold a dot (acme.com): only an image's own extension is taken off.
    if (name && /^https?:\/\//.test(link || "")) links.set(mime[extname(name).toLowerCase()] ? nameOf(name) : name, link);
  }
  for (const t of [...targets]) if (!isUrl(t) && links.has(nameOf(t)) && !targets.includes(links.get(nameOf(t)))) targets.push(links.get(nameOf(t)));
}
if (profilesArg && tsv) {
  console.error("measure: --profiles and --tsv are two outputs: pick one");
  process.exit(2);
}
if (swatches && (tsv || profilesArg || targets.some(isUrl))) {
  console.error("measure: --swatches reads images only, and prints JSON: no links, --tsv or --profiles");
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
  // CHROME_PATH=none: run as if no browser were installed (a quick test run).
  if (env === "none") return null;
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
const drop = () => {
  try {
    if (proc?.pid) process.kill(proc.pid, "SIGKILL");
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
};
process.once("exit", drop);
// An interrupt or a harness timeout must not leave Chrome or its profile behind.
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(sig, () => {
    drop();
    process.exit(code);
  });
}

// One browser for every reference. Each tab is a session on one socket.
// Several tabs work at once, so no tab may be slowed for not being in front: a picture decoding in a
// tab behind another would otherwise wait for ever.
proc = spawn(
  exe,
  ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", `--window-size=${width},${height}`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] },
);
proc.on("error", (e) => {
  console.error(`measure: could not start ${exe}: ${e.message}`);
  process.exit(1);
});
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
  proc.on("exit", (code) => {
    clearTimeout(t);
    fail(new Error(`Chrome exited ${code}`));
  });
});
const ws = new WebSocket(wsUrl);
await new Promise((done, fail) => {
  const t = setTimeout(() => fail(new Error("CDP socket did not open")), 10000);
  ws.onopen = () => {
    clearTimeout(t);
    done();
  };
  ws.onerror = () => {
    clearTimeout(t);
    fail(new Error("CDP socket failed"));
  };
});
let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
  // An alert, confirm or beforeunload prompt holds the page until it is answered.
  if (msg.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: false }, msg.sessionId).catch(() => {});
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
// If Chrome goes away, every call waiting on it fails now, not at its time limit.
ws.onclose = () => {
  for (const done of [...pending.values()]) done({ error: { message: "Chrome closed the connection" } });
  pending.clear();
};
// Every call has a time limit: a page that hangs fails its own reference, not the run.
const send = (method, params = {}, sessionId, timeoutMs = 30000) =>
  new Promise((done, fail) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      fail(new Error(`Chrome did not answer ${method} in ${timeoutMs / 1000} s`));
    }, timeoutMs);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      done(msg);
    });
    try {
      ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    } catch (e) {
      clearTimeout(timer);
      pending.delete(id);
      fail(e);
    }
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openTab() {
  const { result } = await send("Target.createTarget", { url: "about:blank" });
  const { result: attached } = await send("Target.attachToTarget", { targetId: result.targetId, flatten: true });
  const sid = attached.sessionId;
  const call = (method, params, timeoutMs) => send(method, params, sid, timeoutMs);
  const evaluate = async (expression) => {
    const reply = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, 60000);
    if (reply.error) throw new Error(reply.error.message);
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description || "the page threw");
    return reply.result.result.value;
  };
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await call("Page.enable");
  // A tab behind another is hidden and draws no frames, so a page's own frame loop would stand
  // still while it is watched: every tab is made to count as shown and focused.
  await call("Emulation.setFocusEmulationEnabled", { enabled: true });
  return { call, evaluate };
}

// Colours are binned sixteen steps a channel. "Loud" is saturated and at least 0.4% of the picture.
// The type in a picture, read from its pixels, for a reference that is only an image. Letters are
// marks on the ground that are two-tone (ink, ground and the blend between), not too full of their
// box, and set in lines. Photographs are many-toned or fill their box, so they are left out; text
// set on a photograph is lost with it. Each line gives its size against the screen, its stroke (the
// weight), its stroke contrast, its width, its x-height and its case, and its ink. Runs in the page.
// d: RGBA pixels, w × h, ground: [r, g, b]. Sizes are px of this read; the caller scales them.
// With an ink instead (a colour set over a photograph, where there is no ground to blend with),
// the letters are the marks of that colour.
function readType(d, w, h, ground, inkOnly) {
  const n = w * h, far = new Float32Array(n), label = new Int32Array(n).fill(-1);
  const base = inkOnly || ground;
  for (let i = 0; i < n; i++) {
    const dist = Math.max(Math.abs(d[4 * i] - base[0]), Math.abs(d[4 * i + 1] - base[1]), Math.abs(d[4 * i + 2] - base[2]));
    // Ink mode: near the ink is a mark (far is high); ground mode: far from the ground is.
    far[i] = inkOnly ? (dist < 40 ? 255 - dist : 0) : dist;
  }
  // Marks: 8-connected runs of pixels well off the ground.
  const comps = [], stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (label[s] >= 0 || far[s] <= 40) continue;
    const id = comps.length;
    let top = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, count = 0;
    stack[top++] = s;
    label[s] = id;
    while (top) {
      const p = stack[--top], x = p % w, y = (p - x) / w;
      count++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const q = Y * w + X;
        if (label[q] < 0 && far[q] > 40) (label[q] = id), (stack[top++] = q);
      }
    }
    comps.push({ id, x0, y0, x1, y1, count });
  }
  // Pictures: big marks that fill their box. On a ground, nothing inside one is a letter (light
  // spots in a photograph make letter-sized shapes); an ink set over one is read in ink mode.
  const pictures = inkOnly ? [] : comps.filter((c) => (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1) > 0.02 * n && c.count > 0.5 * (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1));
  // And photographs that break into many marks: cells of 12 px that are nearly all off the ground
  // and hold many colours. Type is two-tone: its cells are part ground, or one flat colour inside a stroke.
  const S = 12, cw = Math.ceil(w / S), ch = Math.ceil(h / S), photo = new Uint8Array(cw * ch), pictured = new Uint8Array(cw * ch);
  if (!inkOnly) for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    let off = 0, all = 0;
    const bins = new Set();
    for (let y = cy * S; y < Math.min(h, cy * S + S); y++) for (let x = cx * S; x < Math.min(w, cx * S + S); x++) {
      const i = y * w + x;
      all++;
      if (far[i] > 40) off++, bins.add(((d[4 * i] >> 5) << 6) | ((d[4 * i + 1] >> 5) << 3) | (d[4 * i + 2] >> 5));
    }
    photo[cy * cw + cx] = off > 0.9 * all && bins.size >= 6 ? 1 : 0;
    // For the share, a looser cut: a flat-toned stretch of photograph (a sweater, a sky) still counts.
    pictured[cy * cw + cx] = off > 0.9 * all && bins.size >= 3 ? 1 : 0;
  }
  const onPhoto = (c) => {
    let on = 0, all = 0;
    for (let cy = Math.floor(c.y0 / S); cy <= Math.floor(c.y1 / S); cy++) for (let cx = Math.floor(c.x0 / S); cx <= Math.floor(c.x1 / S); cx++) all++, (on += photo[cy * cw + cx]);
    return on > 0.3 * all;
  };
  const pictureIds = new Set(pictures.map((p) => p.id));
  // Inside a picture: most of the ring just outside the mark's box is that picture's pixels.
  const inPicture = (c) => {
    if (!inkOnly && onPhoto(c)) return true;
    // A letter on a ground has ground around it: most of the ring just outside its box.
    if (!inkOnly) {
      let bare = 0, all = 0;
      const X0 = Math.max(0, c.x0 - 2), X1 = Math.min(w - 1, c.x1 + 2), Y0 = Math.max(0, c.y0 - 2), Y1 = Math.min(h - 1, c.y1 + 2);
      for (let x = X0; x <= X1; x++) for (const y of [Y0, Y1]) all++, (bare += far[y * w + x] <= 40);
      for (let y = Y0; y <= Y1; y++) for (const x of [X0, X1]) all++, (bare += far[y * w + x] <= 40);
      if (bare < 0.6 * all) return true;
    }
    if (!pictureIds.size || pictureIds.has(c.id)) return false;
    let on = 0, all = 0;
    const X0 = Math.max(0, c.x0 - 2), X1 = Math.min(w - 1, c.x1 + 2), Y0 = Math.max(0, c.y0 - 2), Y1 = Math.min(h - 1, c.y1 + 2);
    for (let x = X0; x <= X1; x++) for (const y of [Y0, Y1]) all++, (on += pictureIds.has(label[y * w + x]));
    for (let y = Y0; y <= Y1; y++) for (const x of [X0, X1]) all++, (on += pictureIds.has(label[y * w + x]));
    return on > 0.5 * all;
  };
  // A letter: two-tone, not a solid block, a sensible shape. Its core colour is its ink.
  const letters = [];
  for (const c of comps) {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, fill = c.count / (bw * bh);
    if (bh < 5 || bh > 0.45 * h || c.count < 8 || fill > 0.8 || bw / bh > 6 || bh / bw > 12 || inPicture(c)) continue;
    const px = [];
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (label[y * w + x] === c.id) px.push(y * w + x);
    let ink, tOf;
    if (inkOnly) {
      ink = inkOnly;
      tOf = () => 1;
    } else {
      px.sort((a, b) => far[b] - far[a]);
      const core = px.slice(0, Math.max(1, Math.ceil(px.length * 0.3)));
      ink = [0, 1, 2].map((j) => core.reduce((t, p) => t + d[4 * p + j], 0) / core.length);
      const seg = ink.map((v, j) => v - ground[j]), len2 = seg.reduce((t, v) => t + v * v, 0) || 1;
      let onSeg = 0;
      tOf = (p) => Math.max(0, Math.min(1, [0, 1, 2].reduce((t, j) => t + (d[4 * p + j] - ground[j]) * seg[j], 0) / len2));
      for (const p of px) {
        const t = tOf(p);
        const off = Math.max(...[0, 1, 2].map((j) => Math.abs(d[4 * p + j] - (ground[j] + t * seg[j]))));
        if (off < 34) onSeg++;
      }
      if (onSeg / px.length < 0.8) continue;
    }
    // Strokes: runs of ink (past half way from ground to ink) across and down the letter.
    const across = [], down = [];
    const inked = (x, y) => label[y * w + x] === c.id && tOf(y * w + x) >= 0.5;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0, run = 0; x <= c.x1 + 1; x++) {
      if (x <= c.x1 && inked(x, y)) run++;
      else if (run) across.push(run), (run = 0);
    }
    for (let x = c.x0; x <= c.x1; x++) for (let y = c.y0, run = 0; y <= c.y1 + 1; y++) {
      if (y <= c.y1 && inked(x, y)) run++;
      else if (run) down.push(run), (run = 0);
    }
    // In ink mode, a letter has strokes of one steady width: hair, fur and texture do not.
    if (inkOnly) {
      const q = (xs, f) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * f)] || 0;
      if (q(across, 0.5) < Math.max(3, 0.03 * bh)) continue;
    }
    let area = 0;
    for (const p of px) area += tOf(p);
    letters.push({ ...c, bw, bh, ink, across, down, area });
  }
  // Lines: letters side by side that share most of their height.
  letters.sort((a, b) => a.x0 - b.x0);
  const parent = letters.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < letters.length; i++) for (let j = i + 1; j < letters.length; j++) {
    const a = letters[i], b = letters[j], big = Math.max(a.bh, b.bh);
    if (b.x0 - a.x1 > 1.4 * big) continue;
    const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    // Short letters (x, o) sit inside a tall one's height; a line holds both.
    if (overlap < 0.45 * Math.min(a.bh, b.bh) || Math.min(a.bh, b.bh) < 0.3 * big) continue;
    if (Math.abs(a.y1 - b.y1) > 0.35 * big && Math.abs(a.y0 - b.y0) > 0.35 * big) continue;
    parent[root(j)] = root(i);
  }
  const groups = new Map();
  letters.forEach((l, i) => groups.set(root(i), [...(groups.get(root(i)) || []), l]));
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const quart = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length * q)] : 0; };
  const hex = (v) => "#" + v.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
  const lines = [];
  for (const ls of groups.values()) {
    // Two letters make a line only when they are big and of one height (SO over LA); three always.
    if (ls.length < 2 || (ls.length === 2 && (Math.min(ls[0].bh, ls[1].bh) < 0.85 * Math.max(ls[0].bh, ls[1].bh) || ls[0].bh < 0.1 * h))) continue;
    const hs = ls.map((l) => l.bh);
    const cap = quart(hs, 0.8);
    const shortOnes = hs.filter((x) => x < 0.82 * cap);
    const caps = shortOnes.length < 0.25 * ls.length;
    const xh = caps ? cap : median(shortOnes);
    // The em: caps are about 0.7 of it; with lowercase, the x-height about 0.5 and the caps 0.7.
    const em = cap / 0.7;
    const x0 = Math.min(...ls.map((l) => l.x0)), x1 = Math.max(...ls.map((l) => l.x1));
    const y0 = Math.min(...ls.map((l) => l.y0)), y1 = Math.max(...ls.map((l) => l.y1));
    const stem = median(ls.flatMap((l) => l.across));
    const thin = quart(ls.flatMap((l) => l.down), 0.25);
    // Words: gaps between letters wider than a third of the em.
    let words = 1;
    for (let i = 1; i < ls.length; i++) if (ls[i].x0 - Math.max(...ls.slice(0, i).map((l) => l.x1)) > 0.22 * em) words++;
    const ink = [0, 1, 2].map((j) => median(ls.map((l) => l.ink[j])));
    // Text stands off its ground; marks under 2.5:1 on it are a photograph's greys, not type.
    if (!inkOnly) {
      const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const [hi, lo] = [L(ink), L(ground)].sort((a, b) => b - a);
      if ((hi + 0.05) / (lo + 0.05) < 2.5) continue;
    }
    lines.push({
      box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], letters: ls.length, words, cap, em,
      stroke: stem / em, contrast: thin ? stem / thin : null, width: (x1 - x0 + 1) / ls.length / em,
      xheight: caps ? null : xh / em, case: caps ? "uppercase" : "mixed",
      dark: ls.reduce((t, l) => t + l.area, 0) / ((x1 - x0 + 1) * em), ink: hex(ink), pass: inkOnly ? "ink" : "ground",
    });
  }
  // How much of the picture is photograph, read on the main ground: its share of cells.
  lines.photo = inkOnly ? null : Math.round((1000 * pictured.reduce((t, v) => t + v, 0)) / pictured.length) / 10;
  return lines;
}

// The type reading, said against the screen: the largest line (the display) and the size most of
// the small text is set in (the body), each as a share of the screen's height and as px at 1440
// wide; the weight, from the stroke; how many text blocks there are, and how many words and lines
// the headline holds, which is how much text the composition is made to carry.
// passes: the lines read on each ground and each ink; a line two passes found is kept once.
function typeOf(passes, w, h) {
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const lines = [];
  const overlap = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  for (const l of passes.flat().sort((a, b) => b.letters - a.letters)) {
    if (!lines.some((m) => overlap(l.box, m.box) > 0.5 * Math.min(l.box[2] * l.box[3], m.box[2] * m.box[3]))) lines.push(l);
  }
  // Blocks: lines of one size stacked close, the way a paragraph or a two-line headline is set.
  lines.sort((a, b) => a.box[1] - b.box[1]);
  const blocks = [];
  for (const l of lines) {
    const b = blocks.find((k) => {
      const last = k.lines.at(-1);
      const gap = l.box[1] - (last.box[1] + last.box[3]);
      // A line of x-height letters reads smaller than one with capitals: 0.4 keeps a paragraph whole.
      const same = Math.abs(Math.log(l.em / last.em)) < 0.4;
      const beside = Math.min(l.box[0] + l.box[2], last.box[0] + last.box[2]) - Math.max(l.box[0], last.box[0]) > -0.5 * l.em;
      return same && beside && gap < 1.2 * l.em && gap > -0.2 * l.em;
    });
    if (b) b.lines.push(l);
    else blocks.push({ lines: [l] });
  }
  const blockList = blocks.map((b) => ({ lines: b.lines.length, em: median(b.lines.map((l) => l.em)), words: b.lines.reduce((t, l) => t + l.words, 0), box: [Math.min(...b.lines.map((l) => l.box[0])), b.lines[0].box[1], Math.max(...b.lines.map((l) => l.box[0] + l.box[2])) - Math.min(...b.lines.map((l) => l.box[0])), b.lines.at(-1).box[1] + b.lines.at(-1).box[3] - b.lines[0].box[1]] }));
  return summary(lines, blockList, w, h);
}
function summary(lines, blocks, w, h) {
  if (!lines.length) return { lines: 0, blocks: 0, note: "no lines of type found: text set on a photograph, rotated or in a script face is not read" };
  // Stroke over em to a CSS weight, fitted on faces set at known weights: a 300 reads 0.05 to 0.07,
  // a 400 0.08 to 0.095, a 700 0.13 to 0.15, a 900 0.19 and up. Lines under 40 px of this read have
  // strokes of two or three pixels, thickened by antialiasing, so their weight is not given.
  const weightOf = (l) => (l.em < 40 ? null : [[0.045, 100], [0.052, 200], [0.075, 300], [0.1, 400], [0.118, 500], [0.132, 600], [0.165, 700], [0.185, 800], [9, 900]].find(([s]) => l.stroke < s)[1]);
  const r = (v, k = 100) => (v == null ? null : Math.round(v * k) / k);
  const show = (l) => ({ size: r(l.em / h, 1000), px1440: Math.round((l.em * 1440) / w), weight: weightOf(l), stroke: r(l.stroke, 1000), contrast: r(l.contrast), width: r(l.width), xheight: r(l.xheight), case: l.case, dark: r(l.dark), ink: l.ink, box: l.box.map((v, i) => Math.round((1000 * v) / (i % 2 ? h : w)) / 1000), letters: l.letters, pass: l.pass });
  const display = lines.reduce((a, b) => (b.em > a.em ? b : a));
  // The body: of the lines under 0.6 of the display, the size that holds the most letters.
  const small = lines.filter((l) => l.em < 0.6 * display.em);
  let body = null, most = 0;
  for (const l of small) {
    const near = small.filter((m) => Math.abs(Math.log(m.em / l.em)) < 0.15).reduce((t, m) => t + m.letters, 0);
    if (near > most) (most = near), (body = l);
  }
  const inks = {};
  // Big letters give the truest colour: small ones never reach their ink for antialiasing.
  for (const l of lines) inks[l.ink] = (inks[l.ink] || 0) + l.letters * l.em * l.em;
  const head = blocks.find((b) => b.em >= 0.9 * display.em) || blocks[0];
  return {
    lines: ALL_LINES ? lines.map(show) : lines.length,
    display: show(display),
    body: body ? show(body) : null,
    scale: body ? r(display.em / body.em, 10) : null,
    ink: Object.entries(inks).sort((a, b) => b[1] - a[1])[0][0],
    headline: { words: head.words, lines: head.lines },
    blocks: blocks.length,
    small: blocks.filter((b) => b.em < 0.6 * display.em).length,
  };
}
const readImage = (src) => `(async () => {
  const ALL_LINES = ${allLines};
  // The load event, not decode(): decode() waits on the tab's rendering, which stops for a tab behind
  // another, so a picture read while a page is measured in a second tab never answered.
  const img = new Image();
  await new Promise((done, fail) => {
    img.onload = done;
    img.onerror = () => fail(new Error("The source image cannot be decoded."));
    img.src = ${JSON.stringify(src)};
  });
  // Transparent pixels are read as on white, the ground a cut-out sits on, never as black.
  const paint = (ctx, cw, ch) => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch); };
  // Only the first screen: a tall desktop capture (a full page) is cut to the 1440 by 900 it opens on.
  // A desktop capture is 1300 px wide or more; from 1000 to 1300 only a near-landscape shot is one.
  // A retina phone (1170 by 2532) or a portrait poster (1080 by 1350) is read whole. A framed
  // presentation shot is found on the whole picture first, so a cut never takes its bottom margin.
  let sw = img.naturalWidth, sh = img.naturalHeight;
  const fullPage = sh > sw * 0.75 && (sw >= 1300 || (sw >= 1000 && sh <= sw * 1.2));
  // A presentation shot: the screen on a plain grey or black surround (a Dribbble frame, a device
  // on a backdrop). Its ground, tone and empty would describe the surround, so the screen inside
  // is what is read. A surround is one low-colour tone on all four sides, and the screen inside is
  // a solid rectangle: its edge rows differ from the surround almost everywhere. A centred logo on
  // an empty page has sparse edges and is never taken for a frame.
  let sx = 0, sy = 0, frame = null;
  {
    const fk = Math.min(1, 300 / Math.max(sw, sh));
    const fw = Math.max(1, Math.round(sw * fk)), fh = Math.max(1, Math.round(sh * fk));
    const fc = Object.assign(document.createElement("canvas"), { width: fw, height: fh }).getContext("2d");
    paint(fc, fw, fh);
    fc.drawImage(img, 0, 0, sw, sh, 0, 0, fw, fh);
    const p = fc.getImageData(0, 0, fw, fh).data, at = (x, y) => (y * fw + x) * 4;
    const ref = [p[0], p[1], p[2]];
    const same = (i) => Math.abs(p[i] - ref[0]) <= 12 && Math.abs(p[i + 1] - ref[1]) <= 12 && Math.abs(p[i + 2] - ref[2]) <= 12;
    const corners = [at(fw - 1, 0), at(0, fh - 1), at(fw - 1, fh - 1)].every(same);
    const lowColour = Math.max(...ref) - Math.min(...ref) <= 24;
    const rowSame = (y) => { let n = 0; for (let x = 0; x < fw; x++) n += same(at(x, y)); return n / fw; };
    const colSame = (x) => { let n = 0; for (let y = 0; y < fh; y++) n += same(at(x, y)); return n / fh; };
    if (corners && lowColour) {
      let t = 0, b = fh - 1, l = 0, r = fw - 1;
      while (t < fh / 2 && rowSame(t) > 0.98) t++;
      while (b > fh / 2 && rowSame(b) > 0.98) b--;
      while (l < fw / 2 && colSame(l) > 0.98) l++;
      while (r > fw / 2 && colSame(r) > 0.98) r--;
      const iw = r - l + 1, ih = b - t + 1;
      const edge = (xs, ys) => { let n = 0, m = 0; for (const y of ys) for (const x of xs) { m++; n += !same(at(x, y)); } return m ? n / m : 0; };
      const span = (a, z) => Array.from({ length: Math.max(0, z - a + 1) }, (_, i) => a + i);
      const solid = Math.min(edge(span(l, r), [t]), edge(span(l, r), [b]), edge([l], span(t, b)), edge([r], span(t, b)));
      const margins = [t / fh, (fh - 1 - b) / fh, l / fw, (fw - 1 - r) / fw];
      if (margins.every((m) => m >= 0.03) && iw * ih >= 0.25 * fw * fh && iw * ih <= 0.95 * fw * fh && solid >= 0.85) {
        sx = Math.round(l / fk); sy = Math.round(t / fk); sw = Math.round(iw / fk); sh = Math.round(ih / fk);
        frame = { colour: "#" + ref.map((v) => v.toString(16).padStart(2, "0")).join(""), box: [sx, sy, sw, sh] };
      }
    }
  }
  if (!frame && fullPage) sh = Math.round((sw * 900) / 1440);
  const k = Math.min(1, 200 / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d");
  paint(c, w, h);
  c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
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
  paint(c2, w2, h2);
  c2.drawImage(img, sx, sy, sw, sh, 0, 0, w2, h2);
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
  // The type, read at up to 2000 px on the long side so a body line keeps strokes to measure.
  const k3 = Math.min(1, 2000 / Math.max(sw, sh));
  const w3 = Math.max(1, Math.round(sw * k3)), h3 = Math.max(1, Math.round(sh * k3));
  const c3 = Object.assign(document.createElement("canvas"), { width: w3, height: h3 }).getContext("2d", { willReadFrequently: true });
  paint(c3, w3, h3);
  c3.drawImage(img, sx, sy, sw, sh, 0, 0, w3, h3);
  // Read against each main colour (the ground, a card, a panel) and each loud colour as an ink.
  const px3 = c3.getImageData(0, 0, w3, h3).data;
  const readType = ${readType.toString()};
  const differ = (a, b) => Math.max(...a.map((v, j) => Math.abs(v - b[j]))) > 40;
  const grounds = [];
  // A card or a panel is flat: its pixels' neighbours are its colour too. A colour common in a
  // photograph (a sweater, a sky) is not, and is never read as a ground.
  const flatGround = (g) => {
    const near = (i) => Math.max(Math.abs(d[i] - g[0]), Math.abs(d[i + 1] - g[1]), Math.abs(d[i + 2] - g[2])) <= 12;
    let on = 0, same = 0;
    for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) {
      const i = (y * w + x) * 4;
      if (!near(i)) continue;
      on++;
      same += near(i + 4) && near(i + 4 * w);
    }
    return on && same / on >= 0.85;
  };
  for (const b of all) if (b[0] / n >= 0.06 && grounds.length < 3 && grounds.every((g) => differ(g, avg(b))) && (!grounds.length || flatGround(avg(b)))) grounds.push(avg(b).map(Math.round));
  // A loud ground can be an ink too: lime panels and lime letters over a photograph.
  const inks = [];
  for (const b of all) if (sat(b) > 0.4 && b[0] / n > 0.004 && inks.length < 2 && inks.every((k) => differ(k, avg(b)))) inks.push(avg(b).map(Math.round));
  const onGrounds = grounds.map((g) => readType(px3, w3, h3, g));
  const type = typeOf([...onGrounds, ...inks.map((k) => readType(px3, w3, h3, null, k))], w3, h3);
  if (type.ink) traits.ink = type.ink;
  if (onGrounds[0]) traits.pictures = onGrounds[0].photo;
  return { width: img.naturalWidth, height: img.naturalHeight, firstScreen: !frame && sh < img.naturalHeight, ...(frame ? { frame } : {}), traits, type, figure, common: all.slice(0, 6).map(row), loud: all.filter((b) => sat(b) > 0.5 && b[0] / n > 0.004).slice(0, 4).map(row) };
  ${typeOf.toString()}
  ${summary.toString()}
})()`;

// Swatches: the whole picture at 240 px on its long side, its pixels handed back as base64 RGBA.
const readPixels = (src) => `(async () => {
  // The load event, not decode(): decode() waits on the tab's rendering, which stops for a tab behind
  // another, so a picture read while a page is measured in a second tab never answered.
  const img = new Image();
  await new Promise((done, fail) => {
    img.onload = done;
    img.onerror = () => fail(new Error("The source image cannot be decoded."));
    img.src = ${JSON.stringify(src)};
  });
  const k = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d");
  c.drawImage(img, 0, 0, w, h);
  const d = c.getImageData(0, 0, w, h).data;
  let s = "";
  for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
  return { width: img.naturalWidth, height: img.naturalHeight, w, h, data: btoa(s) };
})()`;

// sRGB to OKLab and back, for the swatches.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function labOf(r8, g8, b8) {
  const [r, g, b] = [r8, g8, b8].map((v) => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function hexOfLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGam(Math.min(1, Math.max(0, c))))) * 255).toString(16).padStart(2, "0")).join("")}`;
}
// Ten colours by k-means in OKLab. Pixels are first pooled into 32 steps a channel. The first
// centre is the heaviest pool; each next one the pool farthest from every centre so far, among
// pools of at least 0.05% of the weight, so a stray pixel never takes a centre. Twelve rounds.
async function measureSwatches(tab, path) {
  const src = `data:${mime[extname(path).toLowerCase()]};base64,${readFileSync(resolve(path)).toString("base64")}`;
  const { width: W, height: H, w, h, data } = await tab.evaluate(readPixels(src));
  const d = Buffer.from(data, "base64");
  const pools = new Map();
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128) continue;
    // 1 at the centre, 0.3 at the corners.
    const r = Math.hypot((x - cx) / Math.max(1, cx), (y - cy) / Math.max(1, cy)) / Math.SQRT2;
    const weight = 1 - 0.7 * r;
    const key = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3);
    const p = pools.get(key) || { w: 0, r: 0, g: 0, b: 0, e: 0 };
    p.w += weight; p.r += weight * d[i]; p.g += weight * d[i + 1]; p.b += weight * d[i + 2];
    if (x < 0.2 * w || x >= 0.8 * w || y < 0.2 * h || y >= 0.8 * h) p.e += weight;
    pools.set(key, p);
  }
  const points = [...pools.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => ({ w: p.w, e: p.e, lab: labOf(p.r / p.w, p.g / p.w, p.b / p.w) }));
  if (!points.length) return { width: W, height: H, swatches: [] };
  const total = points.reduce((t, p) => t + p.w, 0);
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let heaviest = points[0];
  for (const p of points) if (p.w > heaviest.w) heaviest = p;
  const centres = [heaviest.lab];
  const seeds = points.filter((p) => p.w >= 0.0005 * total);
  const near = seeds.map((p) => dist(p.lab, heaviest.lab));
  while (centres.length < Math.min(10, seeds.length)) {
    let best = -1;
    for (let i = 0; i < seeds.length; i++) if (best === -1 || near[i] > near[best]) best = i;
    if (near[best] <= 0) break;
    centres.push(seeds[best].lab);
    for (let i = 0; i < seeds.length; i++) near[i] = Math.min(near[i], dist(seeds[i].lab, seeds[best].lab));
  }
  let groups = [];
  for (let round = 0; round < 12; round++) {
    groups = centres.map(() => ({ w: 0, L: 0, a: 0, b: 0, e: 0 }));
    for (const p of points) {
      let best = 0;
      for (let c = 1; c < centres.length; c++) if (dist(p.lab, centres[c]) < dist(p.lab, centres[best])) best = c;
      const g = groups[best];
      g.w += p.w; g.e += p.e; g.L += p.w * p.lab[0]; g.a += p.w * p.lab[1]; g.b += p.w * p.lab[2];
    }
    for (let c = 0; c < centres.length; c++) if (groups[c].w) centres[c] = [groups[c].L / groups[c].w, groups[c].a / groups[c].w, groups[c].b / groups[c].w];
  }
  const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
  const out = centres.map((lab, c) => ({ lab, w: groups[c].w, e: groups[c].e })).filter((g) => g.w > 0).sort((a, b) => b.w - a.w);
  return {
    width: W,
    height: H,
    swatches: out.map(({ lab: [L, a, b], w: weight, e }) => ({ hex: hexOfLab([L, a, b]), L: round(L, 3), C: round(Math.hypot(a, b), 3), h: round(((Math.atan2(b, a) * 180) / Math.PI + 360) % 360, 1), share: round((100 * weight) / total, 1), edge: round(e / weight, 2) })),
  };
}

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

// Motion: each transition and animation a page declares on an element that has a box, read from
// computed style, so one that has already ended (a fill-mode fade) is still seen. It is read before
// animations are ended, so a running one gives its keyframes' properties. Then what a script does
// (watchFrames, below). Runs in the page (it is sent as text, so it holds nothing from this file).
// Stylesheets the page does not allow reading are counted in "unread" and never guessed at: a hover
// is named only from rules that were read.
async function readMotion() {
  const W = innerWidth, LIMIT = 6000, CAP = 12;
  // A list of CSS values, split at the commas that are not inside brackets or quotes.
  const split = (v) => {
    const parts = [];
    let depth = 0, quote = "", at = 0;
    for (let i = 0; i < v.length; i++) {
      const c = v[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (c === "," && depth === 0) (parts.push(v.slice(at, i).trim()), (at = i + 1));
    }
    parts.push(v.slice(at).trim());
    return parts.filter(Boolean);
  };
  const ms = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(/ms$/.test(v) ? n : n * 1000) : null;
  };
  // What the stylesheets say: hover rules (by the selector of what they change) and keyframes.
  let unread = 0;
  const hovers = [], keyframes = new Map(), seen = new Set();
  const walk = (rules, parent) => {
    for (const r of rules) {
      if (typeof CSSImportRule !== "undefined" && r instanceof CSSImportRule) {
        if (r.styleSheet) readSheet(r.styleSheet);
        else unread++;
      } else if (typeof CSSKeyframesRule !== "undefined" && r instanceof CSSKeyframesRule) {
        const props = keyframes.get(r.name) || new Set();
        for (const k of r.cssRules) for (let i = 0; i < (k.style?.length || 0); i++) if (!/^animation-/.test(k.style[i])) props.add(k.style[i]);
        keyframes.set(r.name, props);
      } else if (typeof CSSMediaRule !== "undefined" && r instanceof CSSMediaRule) {
        if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, parent);
      } else if (typeof CSSStyleRule !== "undefined" && r instanceof CSSStyleRule) {
        let sel = r.selectorText;
        if (parent) sel = sel.includes("&") ? sel.replace(/&/g, ":is(" + parent + ")") : ":is(" + parent + ") " + sel;
        if (sel.includes(":hover") && hovers.length < 4000) {
          const props = new Set();
          for (let i = 0; i < r.style.length; i++) if (!/^(transition|animation)/.test(r.style[i])) props.add(r.style[i]);
          for (const s of split(sel)) {
            if (!s.includes(":hover") || /:not\([^)]*:hover/.test(s)) continue;
            // The selector of what is hovered, without the hover: ".card:hover .title" is read as ".card .title".
            hovers.push({ sel: s.replace(/(^|[\s>+~(])(:hover)/g, "$1*").replace(/:hover/g, ""), props });
          }
        }
        if (r.cssRules?.length) walk(r.cssRules, sel);
      } else if (r.cssRules) walk(r.cssRules, parent);
    }
  };
  const readSheet = (sheet) => {
    if (seen.has(sheet) || sheet.disabled) return;
    seen.add(sheet);
    if (sheet.media?.mediaText && !matchMedia(sheet.media.mediaText).matches) return;
    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch {}
    if (!rules) return void unread++;
    walk(rules, "");
  };
  for (const sheet of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) readSheet(sheet);
  // What is running now: a keyframes' properties are read from the animation itself, which works
  // even when its stylesheet could not be read.
  const running = new Map(), scripted = [];
  const keysOf = (a) => {
    const props = new Set();
    try {
      for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!["offset", "computedOffset", "easing", "composite"].includes(p)) props.add(p);
    } catch {}
    return props;
  };
  const isTransition = (a) => typeof CSSTransition !== "undefined" && a instanceof CSSTransition;
  const isCss = (a) => isTransition(a) || (typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation);
  for (const a of document.getAnimations()) {
    const target = a.effect?.target;
    if (!target) continue;
    // One a script made (element.animate) is in no style sheet: it is listed from its own timing, below.
    if (!isCss(a)) {
      if (a.playState !== "idle") scripted.push(a);
      continue;
    }
    if (a.effect.pseudoElement) continue;
    const here = running.get(target) || { names: new Map(), moves: new Set() };
    running.set(target, here);
    if (isTransition(a)) here.moves.add(a.transitionProperty);
    else here.names.set(a.animationName, keysOf(a));
  }
  const dash = (p) => p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  const words = (t) => {
    const w = (t || "").trim().replace(/\s+/g, " ").split(" ").slice(0, 3).join(" ");
    return w.length > 24 ? w.slice(0, 24) : w;
  };
  // What a thing is, in a few words and no class names: its tag or role, and for a button or a link a few of its words.
  const describe = (el) => {
    const tag = el.tagName.toLowerCase(), role = el.getAttribute("role");
    const say = (t) => (words(t) ? ` "${words(t)}"` : "");
    if (tag === "h1") return "the headline";
    if (/^h[2-6]$/.test(tag)) return "a heading";
    if (tag === "button" || role === "button") return "a button" + say(el.textContent);
    if (tag === "a") return (el.closest("nav") ? "a nav link" : "a link") + say(el.textContent);
    if (tag === "img" || tag === "picture") return "a picture";
    if (tag === "video" || tag === "canvas") return "a " + tag;
    if (/^(svg|path|circle|rect)$/.test(tag)) return el.closest("a, button") || el.getBoundingClientRect().width <= 72 ? "an icon" : "a drawing";
    if (/^(input|select|textarea)$/.test(tag)) return "a field";
    if (/^(nav|header|footer|main)$/.test(tag)) return "the " + (tag === "nav" ? "navigation" : tag);
    if (tag === "body" || tag === "html") return "the page";
    if (tag === "li") return "a list item";
    if (tag === "p") return "a paragraph";
    if (/^(span|em|strong)$/.test(tag)) return "a run of text";
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const looks = cs.boxShadow !== "none" || cs.borderTopWidth !== "0px" || cs.backgroundColor !== "rgba(0, 0, 0, 0)";
    const kin = [...(el.parentElement?.children || [])].filter((s) => s.tagName === el.tagName && Math.abs(s.getBoundingClientRect().width - r.width) < 0.2 * r.width).length;
    if (looks && kin >= 2 && r.width >= 100 && r.width <= 0.6 * W) return "a card";
    return r.width >= 0.5 * W && r.height >= 200 ? "a section" : "a block";
  };
  // What a hover changes on this element: the properties of every readable hover rule that reaches it.
  const hoverProps = (el) => {
    const props = new Set();
    for (const h of hovers) {
      try {
        if (el.matches(h.sel)) for (const p of h.props) props.add(p);
      } catch {}
    }
    return props;
  };
  const found = new Map();
  const note = (item, on) => {
    const sig = [item.kind, item.name || "", item.property, item.ms, item.delay, item.easing, item.iteration, item.trigger].join("|");
    const old = found.get(sig);
    if (old) old.uses++;
    else found.set(sig, { ...item, on, uses: 1 });
  };
  const cycle = (list, i) => list[i % list.length];
  const read = (el, pseudo) => {
    const cs = pseudo ? getComputedStyle(el, pseudo) : getComputedStyle(el);
    if (pseudo && (cs.display === "none" || cs.content === "none" || cs.content === "normal")) return;
    const tp = split(cs.transitionProperty), ad = split(cs.animationName);
    const moves = tp.length && !(tp.length === 1 && tp[0] === "none") && split(cs.transitionDuration).some((d) => ms(d) > 0);
    const animates = ad.length && !(ad.length === 1 && ad[0] === "none");
    if (!moves && !animates) return;
    // A thing that cannot be seen is left out. A fade-in starts at no opacity, so an animation keeps its element.
    if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true })) return;
    const box = el.getBoundingClientRect();
    if (!pseudo && box.width < 2 && box.height < 2) return;
    const on = describe(el) + (pseudo ? " (" + pseudo + ")" : "");
    if (moves && (pseudo || (Number(cs.opacity) > 0 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true })))) {
      const durs = split(cs.transitionDuration), delays = split(cs.transitionDelay), eases = split(cs.transitionTimingFunction);
      let hover = null;
      tp.forEach((property, i) => {
        const ends = ms(cycle(durs, i));
        if (property === "none" || !(ends > 0)) return;
        const now = running.get(el)?.moves;
        let trigger = "state";
        if (!pseudo && now && (now.has(property) || property === "all")) trigger = "load";
        else if (!pseudo) {
          hover ||= hoverProps(el);
          if ([...hover].some((p) => property === "all" || p === property || p.startsWith(property + "-"))) trigger = "hover";
        }
        note({ kind: "transition", property, ms: ends, delay: ms(cycle(delays, i)), easing: cycle(eases, i), iteration: "once", trigger }, on);
      });
    }
    if (animates) {
      const durs = split(cs.animationDuration), delays = split(cs.animationDelay), eases = split(cs.animationTimingFunction), counts = split(cs.animationIterationCount), lines = split(cs.animationTimeline || "auto");
      ad.forEach((name, i) => {
        const line = cycle(lines, i), ends = ms(cycle(durs, i));
        if (name === "none" || line === "none") return;
        const scroll = line !== "auto";
        if (!scroll && !(ends > 0)) return;
        const count = cycle(counts, i);
        const props = running.get(el)?.names.get(name) || keyframes.get(name);
        note(
          { kind: "animation", name, property: props?.size ? [...props].map(dash).join(", ") : null, ms: scroll ? null : ends, delay: ms(cycle(delays, i)), easing: cycle(eases, i), iteration: count === "infinite" ? "loop" : count === "1" ? "once" : count + " times", trigger: scroll ? "scroll" : "load" },
          on,
        );
      });
    }
  };
  let n = 0;
  for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
    if (++n > LIMIT) break;
    read(el, "");
    read(el, "::before");
    read(el, "::after");
  }
  // Animations a script made with element.animate: the properties its keyframes set, and its timing as set.
  for (const a of scripted.slice(0, LIMIT)) {
    const el = a.effect.target, pseudo = a.effect.pseudoElement || "";
    if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true })) continue;
    let t;
    try {
      t = a.effect.getTiming();
    } catch {
      continue;
    }
    const line = typeof ScrollTimeline !== "undefined" && a.timeline instanceof ScrollTimeline;
    const props = keysOf(a);
    note(
      {
        kind: "script",
        property: props.size ? [...props].map(dash).join(", ") : null,
        ms: !line && typeof t.duration === "number" ? Math.round(t.duration) : null,
        delay: Math.round(t.delay) || 0,
        easing: t.easing,
        iteration: t.iterations === Infinity ? "loop" : t.iterations === 1 ? "once" : t.iterations + " times",
        trigger: line ? "scroll" : "load",
      },
      describe(el) + (pseudo ? " (" + pseudo + ")" : ""),
    );
  }

  // Motion a script makes by writing values frame by frame (a loop on the page's own frames, a
  // library, a scroll listener) leaves nothing to read, so it is watched: a bounded set of the
  // visible elements is sampled four times over 600 ms, then again as the page is scrolled one
  // screen in three steps, and an element whose value changes between samples with no transition
  // or animation running on that property is listed. Frames give no curve, so its time and easing
  // are null ("not seen"). Reduced motion is not emulated: the page behaves as it does for anyone.
  // The watch is held to about two seconds, and the scroll position is put back.
  const watchFrames = async () => {
    const T0 = performance.now(), BUDGET = 1900, H = innerHeight;
    const late = () => performance.now() - T0 > BUDGET;
    // The next frame, or 120 ms on, whichever comes first, so a tab that draws no frames still moves on.
    const frame = () =>
      new Promise((done) => {
        const timer = setTimeout(done, 120);
        requestAnimationFrame(() => (clearTimeout(timer), done()));
      });
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (at) => {
      const left = T0 + at - performance.now();
      if (left > 0) await pause(left);
      await frame();
    };
    const tracked = [], pinned = [];
    let scanned = 0;
    for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
      if (++scanned > LIMIT) break;
      if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true })) continue;
      const b = el.getBoundingClientRect();
      if (b.width < 2 && b.height < 2) continue;
      tracked.push(el);
      pinned.push(/^(fixed|sticky)$/.test(getComputedStyle(el).position));
    }
    // What a rule or a Web Animation already moves is not the script's: its properties, per element.
    const LAYOUT = /^(width|height|inline-size|block-size|top|left|right|bottom|inset|margin|padding|border|font|flex|grid|gap|line-height|letter-spacing|min-|max-)/;
    const covered = new Map();
    let layoutMoves = false;
    const coverOf = (el) => covered.get(el) || covered.set(el, new Set()).get(el);
    const addProp = (el, p) => {
      coverOf(el).add(p);
      if (LAYOUT.test(p)) layoutMoves = true;
    };
    const addAnimation = (a) => {
      const el = a.effect?.target;
      if (!el || a.effect.pseudoElement) return;
      for (const p of isTransition(a) ? [a.transitionProperty] : [...keysOf(a)].map(dash)) addProp(el, p);
    };
    // A transition or animation that starts and ends between two samples is still seen as it starts.
    const onRun = (e) => {
      try {
        if (e.pseudoElement) return;
        for (const a of e.target.getAnimations()) addAnimation(a);
        if (e.propertyName) addProp(e.target, e.propertyName);
      } catch {}
    };
    document.addEventListener("transitionrun", onRun, true);
    document.addEventListener("animationstart", onRun, true);
    // A picture loads into its box, which is not motion: the box of one is left out.
    const boxOf = (el) => {
      if (/^(IMG|VIDEO|IFRAME|CANVAS|PICTURE|OBJECT|EMBED)$/.test(el.tagName)) return "";
      if (el instanceof HTMLElement) return el.offsetWidth + "," + el.offsetHeight + "," + el.offsetLeft + "," + el.offsetTop;
      try {
        const b = el.getBBox();
        return [b.width, b.height, b.x, b.y].map(Math.round).join(",");
      } catch {
        return "";
      }
    };
    const KEYS = ["transform", "opacity", "translate", "rotate", "scale", "clip-path", "filter", "top", "left", "box"];
    const take = () => {
      for (const a of document.getAnimations()) addAnimation(a);
      return tracked.map((el) => {
        if (!el.isConnected) return null;
        const cs = getComputedStyle(el), placed = cs.position !== "static";
        return [cs.transform, cs.opacity, cs.translate, cs.rotate, cs.scale, cs.clipPath, cs.filter, placed ? cs.top : "", placed ? cs.left : "", boxOf(el)];
      });
    };
    const isCovered = (el, key) => {
      const set = covered.get(el);
      if (!set) return false;
      return key === "box" ? [...set].some((p) => LAYOUT.test(p)) : set.has(key);
    };
    // How much of the first screen a box covers, in tenths of a percent.
    const coverOfScreen = (el) => {
      const b = el.getBoundingClientRect();
      const share = (Math.max(0, Math.min(b.right, W) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, H) - Math.max(b.top, 0))) / (W * H);
      return Math.round(1000 * share) / 10;
    };
    // A canvas is read small: its pixels, drawn into a 32 px square.
    const canvases = [...document.querySelectorAll("canvas")].filter((c) => c.width > 0 && c.height > 0 && c.checkVisibility?.({ visibilityProperty: true })).slice(0, 8);
    const grab = (c) => {
      try {
        // A fresh square each time: one that has drawn an unreadable canvas stays unreadable.
        const scratch = document.createElement("canvas");
        scratch.width = scratch.height = 32;
        const sctx = scratch.getContext("2d", { willReadFrequently: true });
        sctx.drawImage(c, 0, 0, 32, 32);
        return sctx.getImageData(0, 0, 32, 32).data.join();
      } catch {
        return null;
      }
    };
    // What is found is grouped by what it is, so a hundred things one loop moves are one line.
    const groups = new Map();
    const emit = (item, el) => {
      const sig = JSON.stringify(item);
      const old = groups.get(sig);
      if (old) old.uses++;
      else groups.set(sig, { item, el, uses: 1 });
    };
    const script = (property, iteration, trigger) => ({ kind: "script", property, ms: null, delay: null, easing: null, iteration, trigger });
    const startX = scrollX, startY = scrollY;
    try {
      const load = [], pixels = [];
      const covers = canvases.map(coverOfScreen);
      for (const at of [0, 200, 400, 600]) {
        await until(at);
        load.push(take());
        pixels.push(canvases.map(grab));
      }
      const looping = new Set();
      tracked.forEach((el, i) => {
        const rows = load.map((s) => s[i]);
        if (rows.some((r) => !r)) return;
        KEYS.forEach((key, k) => {
          if (rows.every((r) => r[k] === rows[0][k]) || isCovered(el, key)) return;
          if (key === "box" && layoutMoves) return;
          const loop = rows[3][k] !== rows[2][k];
          if (loop) looping.add(i + ":" + k);
          emit(script(key, loop ? "loop" : "once", "load"), el);
        });
      });
      // A canvas whose pixels differ between samples is playing; one the page does not let be read is counted, not guessed.
      canvases.forEach((c, j) => {
        const seen = pixels.map((p) => p[j]);
        if (seen.some((p) => p === null)) return void unread++;
        if (seen.some((p) => p !== seen[0])) emit({ kind: "canvas", cover: covers[j] }, c);
      });
      for (const v of document.querySelectorAll("video")) {
        if (v.paused || v.ended || v.readyState < 2 || !v.checkVisibility?.({ visibilityProperty: true })) continue;
        const b = v.getBoundingClientRect();
        if (b.width >= 2 && b.height >= 2) emit({ kind: "video", cover: coverOfScreen(v) }, v);
      }
      // Scrolled one screen in three steps. A sample taken before the first step, apart from the last
      // one of the load, shows what changes with time alone, which is not the scroll's.
      const run = Math.min(H, document.documentElement.scrollHeight - H - startY);
      if (!late() && run >= 40) {
        await pause(150);
        await frame();
        const still = take(), steps = [];
        for (const part of [1 / 3, 2 / 3, 1]) {
          if (late()) break;
          scrollTo({ left: startX, top: startY + run * part, behavior: "instant" });
          await pause(100);
          await frame();
          steps.push(take());
        }
        // A thing fixed or sticky changes its place by design: only what it does besides counts.
        const OWN = ["transform", "opacity", "translate", "rotate", "scale", "clip-path", "filter"];
        tracked.forEach((el, i) => {
          const was = load[3][i], base = still[i];
          if (!was || !base) return;
          KEYS.forEach((key, k) => {
            if (was[k] !== base[k] || looping.has(i + ":" + k) || isCovered(el, key)) return;
            if ((pinned[i] && !OWN.includes(key)) || (key === "box" && layoutMoves)) return;
            if (steps.some((s) => s[i] && s[i][k] !== base[k])) emit(script(key, "once", "scroll"), el);
          });
        });
      }
    } finally {
      scrollTo({ left: startX, top: startY, behavior: "instant" });
      document.removeEventListener("transitionrun", onRun, true);
      document.removeEventListener("animationstart", onRun, true);
    }
    for (const { item, el, uses } of groups.values()) found.set("w|" + JSON.stringify(item), { ...item, on: describe(el), uses });
  };
  // A watch that fails leaves what was read from the style sheets as it is.
  try {
    await watchFrames();
  } catch {}
  const all = [...found.values()].sort((a, b) => b.uses - a.uses);
  return { items: all.slice(0, CAP), more: Math.max(0, all.length - CAP), unread };
}

// Finish: shadows, filters, blend modes and textures of what shows on the first screen, each with
// the share of the screen its elements cover (counted on the same 20 px grid as the pictures, so
// overlaps count once). A pseudo-element is read only where its box can be worked out (positioned
// absolutely or fixed). A noise or a tiled picture is a texture: an SVG filter made of feTurbulence,
// or a small picture repeated over a quarter of the screen or more. Runs in the page.
async function readFinish() {
  const W = innerWidth, H = innerHeight, LIMIT = 6000, CAP = 6;
  const CW = Math.ceil(W / 20), CH = Math.ceil(H / 20);
  const split = (v) => {
    const parts = [];
    let depth = 0, quote = "", at = 0;
    for (let i = 0; i < v.length; i++) {
      const c = v[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (c === "," && depth === 0) (parts.push(v.slice(at, i).trim()), (at = i + 1));
    }
    parts.push(v.slice(at).trim());
    return parts.filter(Boolean);
  };
  const kinds = { shadow: new Map(), textShadow: new Map(), filter: new Map(), backdrop: new Map(), blend: new Map(), texture: new Map() };
  const mark = (kind, css, box, extra = {}) => {
    const g = kinds[kind].get(css) || { css, ...extra, cells: new Set(), uses: 0 };
    const [x, y, w, h] = box;
    for (let gx = Math.max(0, Math.floor(x / 20)); gx < Math.min(CW, Math.ceil((x + w) / 20)); gx++)
      for (let gy = Math.max(0, Math.floor(y / 20)); gy < Math.min(CH, Math.ceil((y + h) / 20)); gy++) g.cells.add(gx + "," + gy);
    g.uses++;
    kinds[kind].set(css, g);
  };
  const turbulent = (text) => /feTurbulence/i.test(text);
  const unpack = (data) => {
    try {
      return /;base64,/.test(data) ? atob(data.slice(data.indexOf(",") + 1)) : decodeURIComponent(data.slice(data.indexOf(",") + 1));
    } catch {
      return "";
    }
  };
  // A picture's address, short, and with no page words in it.
  const plain = (url) => (url.startsWith("data:") ? "url(data:" + url.slice(5, url.search(/[;,]/)) + ", " + url.length + " characters)" : "url(" + url.split(/[?#]/)[0].split("/").pop() + ")");
  const tiles = [];
  // What a box carries on its own: shadow, filter, backdrop filter, blend modes.
  const finish = (cs, box) => {
    if (cs.boxShadow !== "none") mark("shadow", cs.boxShadow, box);
    if (cs.filter !== "none") {
      const id = cs.filter.match(/url\(["']?[^"')]*#([^"')]+)/)?.[1];
      const shape = id && document.getElementById(id);
      if (shape && turbulent(shape.outerHTML)) mark("texture", "filter: url(#" + id + ")", box, { kind: "feTurbulence" });
      else mark("filter", cs.filter, box);
    }
    if (cs.backdropFilter && cs.backdropFilter !== "none") mark("backdrop", cs.backdropFilter, box);
    if (cs.mixBlendMode !== "normal") mark("blend", "mix-blend-mode: " + cs.mixBlendMode, box);
    if (cs.backgroundImage !== "none" && split(cs.backgroundBlendMode).some((m) => m !== "normal")) mark("blend", "background-blend-mode: " + cs.backgroundBlendMode, box);
  };
  // What its background pictures make: noise drawn as an SVG, or a small tile repeated over a wide box.
  const layers = (cs, box) => {
    const repeats = split(cs.backgroundRepeat), sizes = split(cs.backgroundSize);
    split(cs.backgroundImage).forEach((layer, i) => {
      const url = layer.match(/^url\((["']?)([\s\S]*)\1\)$/)?.[2];
      if (!url) return;
      const src = url.replace(/\\(.)/g, "$1");
      if (src.startsWith("data:") && turbulent(unpack(src))) return mark("texture", "background-image: " + plain(src), box, { kind: "feTurbulence" });
      if (/^no-repeat( no-repeat)?$/.test(repeats[i % repeats.length]) || box[2] * box[3] < 0.25 * W * H) return;
      tiles.push({ src, box, size: sizes[i % sizes.length], css: "background-image: " + plain(src) });
    });
  };
  // The first screen only, as the rest of the page is read: a box that is in it, that shows.
  const onScreen = (r) => r.width >= 2 && r.height >= 2 && r.top < H && r.bottom > 0 && r.left < W && r.right > 0;
  const shows = (el, cs) => cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0 && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
  const bare = (cs) => cs.backgroundImage === "none" && cs.backgroundColor === "rgba(0, 0, 0, 0)";
  const root = getComputedStyle(document.documentElement);
  let n = 0;
  for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
    if (++n > LIMIT) break;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (onScreen(r) && shows(el, cs)) {
      const box = [r.left, r.top, r.width, r.height];
      finish(cs, box);
      // The body's own background paints the whole canvas when the root has none.
      if (el !== document.body) layers(cs, box);
      else layers(cs, bare(root) ? [0, 0, W, H] : box);
      if (cs.textShadow !== "none") {
        const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
        if (own.length) {
          const range = document.createRange();
          range.setStartBefore(own[0]);
          range.setEndAfter(own.at(-1));
          const t = range.getBoundingClientRect();
          if (t.width >= 2) mark("textShadow", cs.textShadow, [t.left, t.top, t.width, t.height]);
        }
      }
    }
    // A pseudo-element has no box to ask for: where it is placed, its computed offsets and size are its box.
    for (const pseudo of ["::before", "::after"]) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.display === "none" || ps.content === "none" || ps.content === "normal" || !/^(absolute|fixed)$/.test(ps.position) || Number(ps.opacity) === 0 || ps.visibility === "hidden") continue;
      const [left, top, w, h] = [ps.left, ps.top, ps.width, ps.height].map(parseFloat);
      if (![left, top, w, h].every(Number.isFinite) || !shows(el, cs)) continue;
      let ox = 0, oy = 0;
      if (ps.position === "absolute") {
        const home = cs.position !== "static" ? el : el.offsetParent;
        if (home && getComputedStyle(home).position !== "static") {
          const hr = home.getBoundingClientRect();
          [ox, oy] = [hr.left + home.clientLeft, hr.top + home.clientTop];
        }
      }
      const box = [ox + left, oy + top, w, h];
      if (!onScreen({ left: box[0], right: box[0] + w, top: box[1], bottom: box[1] + h, width: w, height: h })) continue;
      finish(ps, box);
      layers(ps, box);
    }
  }
  // The canvas takes the background of the root, or of the body when the root has none: a tile there covers the screen.
  layers(root, [0, 0, W, H]);
  // A tile is small if its size is given in px, or its picture is: asked of the page, with a time limit.
  const natural = new Map();
  await Promise.all(
    [...new Set(tiles.map((t) => t.src))].slice(0, 8).map(
      (src) =>
        new Promise((done) => {
          const img = new Image();
          const timer = setTimeout(done, 1200);
          img.onload = img.onerror = () => (clearTimeout(timer), natural.set(src, [img.naturalWidth, img.naturalHeight]), done());
          img.src = src;
        }),
    ),
  );
  for (const t of tiles) {
    const px = t.size.split(/\s+/).filter((v) => /px$/.test(v)).map(parseFloat);
    const [nw, nh] = natural.get(t.src) || [0, 0];
    const wide = px.length ? Math.max(...px) : Math.max(nw, nh);
    if (!(wide > 0 && wide <= 256)) continue;
    mark("texture", t.css, t.box, { kind: "tile", size: px.length ? t.size : nw + "x" + nh });
  }
  const out = {};
  let more = 0;
  for (const [kind, map] of Object.entries(kinds)) {
    more += Math.max(0, map.size - CAP);
    out[kind] = [...map.values()]
      .map(({ css, kind: how, size, cells, uses }) => ({ css, ...(how ? { kind: how } : {}), ...(size ? { size } : {}), cover: Math.round((1000 * cells.size) / (CW * CH)) / 10, uses }))
      .sort((a, b) => b.cover - a.cover || b.uses - a.uses)
      .slice(0, CAP);
  }
  return { kinds: out, more };
}
// A reading that fails (a page that blocks it) leaves its key null, never fails the page's other numbers.
async function readOr(tab, fn) {
  try {
    return await tab.evaluate(`(${fn})()`);
  } catch {
    return null;
  }
}

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
  await tab.call("Page.navigate", { url }, 40000);
  for (let i = 0; i < 100 && (await tab.evaluate("document.readyState")) !== "complete"; i++) await sleep(200);
  await sleep(wait);
  // The motion is read first, while its animations still run: what ends is ended just below.
  let motion = await readOr(tab, readMotion);
  // Animations that end (a headline that fades or slides in) are read as they end, never mid-way.
  // Ones that loop, and ones a script drives, are read as they are after the wait.
  await tab.evaluate(`(() => { for (const a of document.getAnimations()) { try { if (a.effect?.getComputedTiming().endTime !== Infinity) a.finish(); } catch {} } })()`);
  await sleep(300);
  let out = await tab.evaluate(readPage);
  // Nothing on it yet is often a loader: one more wait before it is called empty.
  if (!out.words && !(out.traits.pictures > 5)) {
    await sleep(Math.max(3000, wait / 2));
    out = await tab.evaluate(readPage);
    motion = (await readOr(tab, readMotion)) || motion;
  }
  out.motion = motion ? motion.items : null;
  out.motionMore = motion ? motion.more : null;
  out.unread = motion ? motion.unread : null;
  const finish = await readOr(tab, readFinish);
  out.finish = finish ? finish.kinds : null;
  out.finishMore = finish ? finish.more : null;
  out.flag = notTheSite({ status: out.status, words: out.words, said: out.said, pictures: out.traits.pictures });
  delete out.said;
  return out;
}

const results = new Array(targets.length);
const images = targets.map((t, i) => [t, i]).filter(([t]) => !isUrl(t));
const pages = targets.map((t, i) => [t, i]).filter(([t]) => isUrl(t));
const run = async (queue, measure) => {
  let tab;
  try {
    tab = await openTab();
  } catch (error) {
    for (let item = queue.shift(); item; item = queue.shift()) results[item[1]] = { target: item[0], error: error.message };
    return;
  }
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
if (images.length) workers.push(run(images, swatches ? measureSwatches : measureImage));
for (let k = 0; k < Math.min(jobs, pages.length); k++) workers.push(run(pages, measurePage));
await Promise.all(workers);
ws.close();

const failed = results.filter((r) => r.error);
for (const r of failed) console.error(`measure: ${r.target}: ${r.error}`);
if (swatches) {
  console.log(JSON.stringify(results.map((r) => (r.error ? { target: r.target, error: r.error } : { target: r.target, swatches: r.swatches })), null, 1));
} else if (profilesArg) {
  // Measurements are replaced, everything else a profile holds (the agent's tags, notes) is kept.
  const store = existsSync(profilesArg) ? JSON.parse(readFileSync(profilesArg, "utf8")) : { refs: {} };
  store.refs ||= {};
  const byTarget = new Map(results.filter((r) => !r.error).map((r) => [r.target, r]));
  const pageOf = (r) => {
    const texts = [...r.text].sort((a, b) => parseFloat(b.size) - parseFloat(a.size)).slice(0, 8);
    return { url: r.target, flag: r.flag || "", status: r.status, traits: r.traits, media: r.media, fonts: r.fonts, gradients: r.gradients, patterns: r.patterns, ground: r.ground, texts, motion: r.motion, motionMore: r.motionMore, finish: r.finish, finishMore: r.finishMore, unread: r.unread };
  };
  for (const t of targets.filter((x) => !isUrl(x))) {
    const r = byTarget.get(t);
    if (!r) continue;
    const name = nameOf(t);
    const link = links.get(name);
    const page = link && byTarget.get(link);
    const old = store.refs[name] || {};
    store.refs[name] = { ...old, shot: t, link: link || old.link || null, image: { traits: r.traits, figure: r.figure, common: r.common, loud: r.loud, ...(r.frame ? { frame: r.frame } : {}) }, page: page ? pageOf(page) : old.page || null };
  }
  mkdirSync(dirname(resolve(profilesArg)), { recursive: true });
  writeFileSync(profilesArg, `${JSON.stringify(store, null, 1)}\n`);
  const n = Object.keys(store.refs).length;
  const withPage = Object.values(store.refs).filter((p) => p.page).length;
  const tagged = Object.values(store.refs).filter((p) => p.tags).length;
  console.log(`profiles: ${profilesArg}, ${n} references, ${withPage} with their page, ${tagged} tagged`);
} else if (tsv) {
  const cols = ["tone", "lum", "empty", "loud", "busy", "ground", "display", "body", "scale", "pictures", "margin", "radius", "lettering", "gradient", "pattern", "icons", "blocks", "align", "flag"];
  // name: the reference's name, which for a folder of frames is the folder, not the frame in ref.
  const lines = [["ref", ...cols, "name"].join("\t")];
  for (const r of results) if (!r.error) lines.push([r.target, ...cols.map((c) => (c === "flag" ? r.flag : r.traits?.[c]) ?? ""), isUrl(r.target) ? "" : nameOf(r.target)].join("\t"));
  console.log(lines.join("\n"));
} else if (targets.length === 1) {
  if (failed.length) process.exit(1);
  const { target, ...one } = results[0];
  console.log(JSON.stringify(one, null, 1));
} else console.log(JSON.stringify(results, null, 1));
// What was measured is printed or written above; a non-zero exit says some input was not.
process.exit(failed.length ? 1 : 0);
