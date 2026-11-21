#!/usr/bin/env node
// Cut a Figma board's cards out of the images they share, so each image is
// downloaded once, not once per card. Many boards crop every card from a
// larger upload: the card's fill has scaleMode CROP and an imageTransform
// [[a,0,tx],[0,d,ty]], which shows the region x from tx to tx+a and y from ty
// to ty+d of the image, as fractions. Node 22+, an installed Chrome, no
// dependencies.
//
//   node crops.mjs cards.json --list
//   node crops.mjs cards.json --sheets <dir> --out .longbeard/design/moodboard/refs
//
// cards.json is what use_figma read from the board, a list (or { "cards": [] }):
//   [{ "name": "<card name>", "hash": "<imageHash>", "transform": [[a,0,tx],[0,d,ty]],
//      "caption": "<optional>", "tags": ["<optional>"] }]
//
// --list prints each distinct image to download, one a line: hash<TAB>cards using it.
// --sheets is the folder of those downloads, each named <hash>.<png|jpg|jpeg|webp|gif>.
// Each download is checked: its SHA-1 must be its hash, or its cards are skipped and named.
// A missing sheet, or a transform that rotates or skews, skips its cards the same way.
// Each card is written at the sheet's own pixel size to <out>/<card-name>.png, and
// <out>/crops.tsv lists name, file, caption and tags (joined with +), for tag.mjs to seed
// from. Exit 1 when any card was skipped; the others are still written.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
if (typeof WebSocket === "undefined") { console.error("Node 22+ is required."); process.exit(1); }

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const list = has("list");
const sheetsArg = flag("sheets");
const outArg = flag("out");
const [input] = args;
const usage = "usage: node crops.mjs cards.json --list | node crops.mjs cards.json --sheets <dir> --out <refs dir>";
if (!input || args.length !== 1 || (!list && (!sheetsArg || !outArg))) {
  console.error(usage);
  process.exit(2);
}
const fail = (text) => {
  console.error(`crops: ${text}`);
  process.exit(1);
};
if (!existsSync(input)) fail(`nothing at ${input}`);
let cards;
try {
  const raw = JSON.parse(readFileSync(input, "utf8"));
  cards = Array.isArray(raw) ? raw : raw.cards;
} catch (e) {
  fail(`${input} is not JSON: ${e.message}`);
}
if (!Array.isArray(cards) || !cards.length) fail(`${input} holds no cards`);
for (const c of cards) if (!c.name || !c.hash) fail(`every card needs a name and a hash (${JSON.stringify(c).slice(0, 80)})`);

const byHash = new Map();
for (const c of cards) byHash.set(c.hash.toLowerCase(), [...(byHash.get(c.hash.toLowerCase()) || []), c]);
if (list) {
  for (const [hash, cs] of byHash) console.log(`${hash}\t${cs.length}`);
  console.error(`crops: ${byHash.size} images to download for ${cards.length} cards`);
  process.exit(0);
}
if (!existsSync(sheetsArg)) fail(`no sheets folder at ${sheetsArg}`);

// File-safe names, the card's own, so a crop keeps its name across board versions.
const used = new Set();
const fileName = (name) => {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "card";
  let n = base;
  for (let i = 2; used.has(n); i++) n = `${base}-${i}`;
  used.add(n);
  return n;
};

const skipped = [];
const skip = (c, why) => skipped.push(`${c.name}: ${why}`);
const files = readdirSync(sheetsArg);
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
const jobs = [];
for (const [hash, cs] of byHash) {
  const file = files.find((f) => f.toLowerCase().startsWith(`${hash}.`) && MIME[extname(f).toLowerCase()]);
  if (!file) {
    for (const c of cs) skip(c, `no sheet ${hash} in ${sheetsArg}`);
    continue;
  }
  const bytes = readFileSync(join(sheetsArg, file));
  const sha = createHash("sha1").update(bytes).digest("hex");
  if (sha !== hash) {
    console.error(`crops: ${file} does not match its hash (its SHA-1 is ${sha}): its ${cs.length} cards skipped`);
    for (const c of cs) skip(c, `sheet ${file} does not match its hash`);
    continue;
  }
  const regions = [];
  for (const c of cs) {
    const t = c.transform || [[1, 0, 0], [0, 1, 0]];
    const ok = Array.isArray(t) && t.length === 2 && t.every((r) => Array.isArray(r) && r.length === 3 && r.every(Number.isFinite));
    if (!ok) {
      skip(c, "transform is not [[a,0,tx],[0,d,ty]]");
      continue;
    }
    const [[a, b, tx], [cc, d, ty]] = t;
    if (Math.abs(b) > 1e-9 || Math.abs(cc) > 1e-9) {
      skip(c, "transform rotates or skews");
      continue;
    }
    if (!(a > 0 && d > 0)) {
      skip(c, "transform has no area");
      continue;
    }
    regions.push({ card: c, file: fileName(c.name), a, d, tx, ty });
  }
  if (regions.length) jobs.push({ hash, mime: MIME[extname(file).toLowerCase()], data: bytes.toString("base64"), regions });
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

const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const rows = [];
let written = 0;
if (jobs.length) {
  const exe = findChrome();
  if (!exe) fail("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
  const dir = mkdtempSync(join(tmpdir(), "crops-chrome-"));
  const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--force-color-profile=srgb", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const drop = () => {
    try {
      proc.kill("SIGKILL");
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
  proc.on("error", (e) => fail(`could not start ${exe}: ${e.message}`));
  let buf = "";
  const wsUrl = await new Promise((done, no) => {
    const t = setTimeout(() => no(new Error("Chrome did not start")), 20000);
    proc.stderr.on("data", (d) => {
      const m = (buf += d).match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) done(m[1], clearTimeout(t));
    });
    proc.on("exit", (code) => no(new Error(`Chrome exited ${code}`)));
  }).catch((e) => fail(e.message));
  const ws = new WebSocket(wsUrl);
  await new Promise((done, no) => {
    const t = setTimeout(() => no(new Error("CDP socket did not open")), 10000);
    ws.onopen = () => done(clearTimeout(t));
    ws.onerror = () => no(new Error("CDP socket failed"));
  }).catch((e) => fail(e.message));
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
  };
  // If Chrome goes away, every call waiting on it fails now, not at its time limit.
  ws.onclose = () => {
    for (const done of [...pending.values()]) done({ error: { message: "Chrome closed the connection" } });
    pending.clear();
  };
  // Every call has a time limit, so a sheet that hangs the page skips its own cards.
  const send = (method, params = {}, sessionId, timeoutMs = 60000) =>
    new Promise((done, no) => {
      const id = ++nextId;
      const timer = setTimeout(() => (pending.delete(id), no(new Error(`Chrome did not answer ${method} in ${timeoutMs / 1000} s`))), timeoutMs);
      pending.set(id, (msg) => done((clearTimeout(timer), msg)));
      try {
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      } catch (e) {
        clearTimeout(timer);
        pending.delete(id);
        no(e);
      }
    });
  const { result: target } = await send("Target.createTarget", { url: "about:blank" }).catch((e) => fail(e.message));
  const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }).catch((e) => fail(e.message));
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, att.sessionId);
    if (r.error) throw new Error(r.error.message);
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "the page threw");
    return r.result.result.value;
  };
  // One sheet at a time, so a board of large sheets never holds them all in memory.
  for (const job of jobs) {
    const regions = job.regions.map(({ a, d, tx, ty }) => ({ a, d, tx, ty }));
    let crops;
    try {
      crops = await evaluate(`(async () => {
        const img = new Image();
        img.src = "data:${job.mime};base64,${job.data}";
        await img.decode();
        const W = img.naturalWidth, H = img.naturalHeight;
        return ${JSON.stringify(regions)}.map(({ a, d, tx, ty }) => {
          // A region that starts before the sheet loses that part of its width and height too.
          const x0 = Math.round(tx * W), y0 = Math.round(ty * H);
          const x = Math.max(0, x0), y = Math.max(0, y0);
          const w = Math.min(W, x0 + Math.round(a * W)) - x, h = Math.min(H, y0 + Math.round(d * H)) - y;
          if (w < 1 || h < 1) return null;
          const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
          c.getContext("2d").drawImage(img, x, y, w, h, 0, 0, w, h);
          return c.toDataURL("image/png").split(",")[1];
        });
      })()`);
    } catch (e) {
      for (const r of job.regions) skip(r.card, `sheet ${job.hash} did not decode (${String(e.message).split("\n")[0]})`);
      continue;
    }
    job.regions.forEach((r, i) => {
      if (!crops[i]) return skip(r.card, "region falls outside its sheet");
      const path = join(out, `${r.file}.png`);
      writeFileSync(path, Buffer.from(crops[i], "base64"));
      rows.push([r.card.name, path, (r.card.caption || "").replace(/[\t\n]+/g, " "), (r.card.tags || []).join("+")].join("\t"));
      written++;
    });
  }
  ws.close();
}

writeFileSync(join(out, "crops.tsv"), `name\tfile\tcaption\ttags\n${rows.map((r) => `${r}\n`).join("")}`);
for (const s of skipped) console.error(`crops: skipped ${s}`);
console.error(`crops: ${written} cards from ${jobs.length} sheets, ${skipped.length} skipped`);
process.exit(skipped.length ? 1 : 0);
