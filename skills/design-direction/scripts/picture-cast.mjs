#!/usr/bin/env node
// A picture's colour, checked before it goes on a screen: a cast (a pink or
// green tint over what should be neutral), blown highlights, crushed
// shadows. A picture with a strong cast is replaced or corrected, unless its
// reference tones its pictures on purpose (a sepia, a duotone): then it is
// reported as toned, not as a fault. Node 22+, an installed Chrome, no
// dependencies.
//
//   node picture-cast.mjs .longbeard/design/subject/loaf.jpg pictures/*.jpg
//   node picture-cast.mjs .longbeard/design/direction/grid/3.png
//
// How: each picture is drawn at most 512 px wide and read in OKLab. The cast
// is the mean tint of its near-neutral mid-tones (chroma under 0.045,
// lightness 0.25 to 0.9): what should be grey, white or stone shows the tint
// the whole picture has, while the subject's own colour (a brown crust, a
// red dress) is left out. With too few neutrals (under 3%), the mid-tones'
// mean tint is reported, marked "from mid-tones": the subject's own colour
// is in it, so it is never a fault on its own: look at the picture.
//
// Prints JSON, one entry per picture: { file, cast: "none|warm|red|magenta|
// cool|green", strength (OKLab distance from neutral, x100), toned (most of
// the picture in one hue at low chroma: a sepia, a duotone, black and
// white), mono, blown (share of pixels near white), crushed (share near
// black), from: "neutrals|mid-tones", fault }. fault is true for a cast of
// strength 3 or more, read from neutrals, on a picture that is not toned, or blown or crushed
// over 8%. Exit 0; 2 on a usage error.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
if (typeof WebSocket === "undefined") { console.error("Node 22+ is required."); process.exit(1); }

const fail = (text, code = 1) => {
  console.error(`picture-cast: ${text}`);
  process.exit(code);
};
const kinds = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };
const args = process.argv.slice(2);
if (!args.length || args.some((a) => a.startsWith("--"))) fail("usage: node picture-cast.mjs <image | folder> …", 2);
const files = [];
for (const a of args) {
  if (!existsSync(a)) fail(`no file at ${a}`, 2);
  if (statSync(a).isDirectory()) files.push(...readdirSync(a).filter((f) => kinds[extname(f).toLowerCase()]).sort().map((f) => join(a, f)));
  else if (kinds[extname(a).toLowerCase()]) files.push(a);
  else fail(`${a} is not a picture (jpg, png, webp, gif, avif)`, 2);
}
if (!files.length) fail("no pictures found", 2);

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
if (!exe) fail("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
const dir = mkdtempSync(join(tmpdir(), "picture-cast-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--force-color-profile=srgb", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
process.once("exit", () => {
  try {
    proc.kill("SIGKILL");
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true });
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
const send = (method, params = {}, sessionId) => new Promise((done) => (pending.set(++nextId, done), ws.send(JSON.stringify({ id: nextId, method, params, sessionId }))));
const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, att.sessionId);
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "the page threw");
  return r.result?.result?.value;
};

// Read in the page: the picture's pixels in OKLab, and the counts the verdict needs.
const read = (src) => `(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(src)};
  await img.decode();
  const k = Math.min(1, 512 / img.width);
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const g = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  let n = 0, blown = 0, crushed = 0, nn = 0, na = 0, nb = 0, mn = 0, ma = 0, mb = 0, chromaSum = 0;
  const hues = new Array(36).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    n++;
    const r = lin(d[i]), gg = lin(d[i + 1]), b = lin(d[i + 2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) blown++;
    if (d[i] < 10 && d[i + 1] < 10 && d[i + 2] < 10) crushed++;
    const C = Math.hypot(A, B);
    chromaSum += C;
    if (C > 0.015) hues[Math.floor((((Math.atan2(B, A) * 180) / Math.PI + 360) % 360) / 10)] += 1;
    if (L < 0.25 || L > 0.9) continue;
    mn++, (ma += A), (mb += B);
    if (C < 0.045) nn++, (na += A), (nb += B);
  }
  return { n, blown, crushed, nn, na, nb, mn, ma, mb, chroma: chromaSum / Math.max(1, n), hues };
})()`;

const results = [];
for (const file of files) {
  const src = `data:${kinds[extname(file).toLowerCase()]};base64,${readFileSync(file).toString("base64")}`;
  let r;
  try {
    r = await evaluate(read(src));
  } catch (e) {
    results.push({ file, error: `could not read: ${e.message.split("\n")[0]}` });
    continue;
  }
  const fromNeutrals = r.nn >= r.n * 0.03;
  const [a, b] = fromNeutrals ? [r.na / r.nn, r.nb / r.nn] : r.mn ? [r.ma / r.mn, r.mb / r.mn] : [0, 0];
  const strength = Math.round(Math.hypot(a, b) * 1000) / 10;
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const name = strength < 1.2 ? "none" : hue < 40 ? "red" : hue < 100 ? "warm" : hue < 190 ? "green" : hue < 290 ? "cool" : hue < 340 ? "magenta" : "red";
  // Toned: the tinted pixels sit in one 60° band of hue, at low chroma (a sepia, a duotone), or there is no chroma at all.
  const tinted = r.hues.reduce((s, v) => s + v, 0);
  let band = 0;
  for (let i = 0; i < 36; i++) band = Math.max(band, [0, 1, 2, 3, 4, 5].reduce((s, j) => s + r.hues[(i + j) % 36], 0));
  const mono = r.chroma < 0.012;
  const toned = mono || (tinted > r.n * 0.3 && band >= tinted * 0.9 && r.chroma < 0.06);
  const share = (v) => Math.round((v / Math.max(1, r.n)) * 1000) / 10;
  const blown = share(r.blown), crushed = share(r.crushed);
  results.push({
    file,
    cast: name,
    strength,
    toned,
    mono,
    blown,
    crushed,
    from: fromNeutrals ? "neutrals" : "mid-tones",
    fault: (fromNeutrals && strength >= 3 && !toned) || blown > 8 || crushed > 8,
  });
}
ws.close();
console.log(JSON.stringify(results, null, 1));
process.exit(0);
