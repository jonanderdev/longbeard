#!/usr/bin/env node
// Contrast on the rendered screen, not on swatches. A colour pair can pass on
// its swatch and fail on the screen: a pale name that reads on the ground and
// runs off onto a photograph. This reads every piece of text where it sits.
// Node 22+, an installed Chrome, no dependencies.
//
//   node screen-contrast.mjs "file://$PWD/.longbeard/design/direction/prototype/grid.html?n=3" --wait-title ready
//
// How: the page is opened at --size (1440x900), scrolled once from top to
// bottom so what appears on scroll is there, and measured at its full height
// (up to --max-height, 10000). Every visible text is found with its boxes, its
// colour and its size. Then all text is made transparent and the page is shot,
// so what is under each box is the real background: a ground, a gradient, a
// photograph. Every pixel under each box is compared with the text's colour.
// A text fails when its 5th-percentile contrast is under the threshold (4.5:1,
// or 3:1 for large text: 24px, or 18.66px bold; 7:1 and 4.5:1 at --level AAA),
// so one stray pixel is not the verdict. The worst pixel is reported too.
//
// A text colour can be written in any notation (rgb, hsl, oklch, lab,
// color(display-p3 ...)): the page resolves it to the sRGB it is drawn as. A
// text whose colour cannot be read, or whose fill is a picture or gradient
// clipped to the letters, is not measured. It is listed as "not read", and is
// neither a pass nor a fail.
//
// Prints one line per failing text: the text, its box, its colour, the
// background where it is worst, the contrast (5th percentile and worst), and
// the threshold. Then one "not read" line per text it could not measure. The
// last line, on stderr, counts the texts and says how far down the page it looked.
//   --size 1440x900, --wait-title ready (wait for the page to set its title),
//   --level AA|AAA, --min 4.5, --large 3 (these two win over --level),
//   --max-height 10000 (the most of the page, in px, to look at),
//   --timeout 60 (seconds each browser call may take), --json
//
// Exit 0 when no text fails, 1 when a text fails, 2 for a bad command line,
// 3 when it could not run (no Chrome, the page would not open, a browser call
// timed out). Chrome is closed and its profile removed on every exit, and on
// SIGINT and SIGTERM.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
if (typeof WebSocket === "undefined") { console.error("Node 22+ is required."); process.exit(1); }

const FAILED = 1, USAGE = 2, COULD_NOT_RUN = 3;
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
const level = flag("level", "AA").toUpperCase();
const min = Number(flag("min", level === "AAA" ? "7" : "4.5"));
const large = Number(flag("large", level === "AAA" ? "4.5" : "3"));
const maxHeight = Number(flag("max-height", "10000"));
const limit = Number(flag("timeout", "60"));
const json = has("json");
const [url] = args;
const [W, H] = sizeArg.split("x").map(Number);
if (!url || args.length !== 1 || !/^(https?|file):/.test(url) || !(W > 0 && H > 0) || !(min > 1) || !(large > 1) || !(level === "AA" || level === "AAA") || !(maxHeight >= H) || !(limit > 0)) {
  console.error('usage: node screen-contrast.mjs "<file:// or https:// url>" [--size 1440x900] [--wait-title ready] [--level AA|AAA] [--min 4.5] [--large 3] [--max-height 10000] [--timeout 60] [--json]');
  process.exit(USAGE);
}

const fail = (text, code = COULD_NOT_RUN) => {
  console.error(`screen-contrast: ${text}`);
  process.exit(code);
};
function findChrome() {
  const env = process.env.CHROME_PATH;
  // CHROME_PATH=none: run as if no browser were installed (a quick test run).
  if (env === "none") return null;
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

// Whatever ends the run, Chrome goes with it and so does its profile folder.
const dir = mkdtempSync(join(tmpdir(), "screen-contrast-"));
let proc = null;
let finished = false;
process.once("exit", () => {
  try {
    proc?.kill("SIGKILL");
  } catch {}
  // Chrome's helpers can still be writing as it goes: remove again until the folder is gone.
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  } catch {}
});
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => fail(`stopped by ${signal}`));
process.on("unhandledRejection", (e) => fail(e?.message || String(e)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Run a step until it says yes or the time is up; the page may be slow, never stuck.
const until = async (ms, step) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(200)) if (await step().catch(() => false)) return true;
  return false;
};

async function main() {
  proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  proc.on("exit", () => finished || fail("Chrome exited before the check was done"));
  let buf = "";
  const wsUrl = await new Promise((done, no) => {
    const t = setTimeout(() => no(new Error("Chrome did not start")), 20000);
    proc.stderr.on("data", (d) => {
      const m = (buf += d).match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) done(m[1], clearTimeout(t));
    });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((done, no) => {
    const t = setTimeout(() => no(new Error("Chrome did not accept the connection")), 20000);
    ws.onopen = () => done(clearTimeout(t));
    ws.onerror = () => no(new Error("Chrome did not accept the connection"));
  });
  ws.onclose = () => finished || fail("Chrome closed the connection");
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
  };
  // Every call has a time limit: a page that hangs ends the run, it does not hang it.
  const send = (method, params = {}, sessionId) =>
    new Promise((done, no) => {
      const id = ++nextId;
      const timer = setTimeout(() => (pending.delete(id), no(new Error(`${method} did not answer within ${limit} s`))), limit * 1000);
      pending.set(id, (msg) => done((clearTimeout(timer), msg)));
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const { result: target } = await send("Target.createTarget", { url: "about:blank" });
  const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const call = (method, params) => send(method, params, att.sessionId);
  const evaluate = async (expression) => {
    const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "the page threw");
    return r.result?.result?.value;
  };

  await call("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 });
  const nav = await call("Page.navigate", { url });
  if (nav.result?.errorText) fail(`could not open ${url}: ${nav.result.errorText}`);
  if (waitTitle) {
    if (!(await until(20000, async () => (await evaluate("document.title")) === waitTitle))) fail(`the page did not set its title to "${waitTitle}" within 20 s`);
  } else {
    await until(20000, async () => (await evaluate("document.readyState")) === "complete");
    await sleep(500);
  }
  await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true").catch(() => true);

  // Scroll down the page once, so what shows itself on scroll is showing, then back to the top.
  const total = await evaluate("Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)");
  const looked = Math.min(total, maxHeight);
  for (let y = H; y < looked; y += H) {
    await evaluate(`window.scrollTo(0, ${y})`);
    await sleep(120);
  }
  await evaluate("window.scrollTo(0, 0)");
  await sleep(300);

  // Every visible text: its element, its boxes down the page, its colour and size.
  const texts = await evaluate(`(() => {
  const W = ${W}, H = ${looked};
  // Any notation Chrome knows, as the sRGB it is drawn as: [r, g, b, alpha], or null when it cannot be read.
  // A colour the canvas will not take leaves its fill as it was, so two different starts tell the two apart.
  const cv = Object.assign(document.createElement("canvas"), { width: 1, height: 1 });
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const over = (css, ground) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = ground;
    cx.fillRect(0, 0, 1, 1);
    cx.fillStyle = css;
    cx.fillRect(0, 0, 1, 1);
    return cx.getImageData(0, 0, 1, 1).data;
  };
  const parse = (css) => {
    if (!css) return null;
    cx.fillStyle = "#010203";
    cx.fillStyle = css;
    const a = cx.fillStyle;
    cx.fillStyle = "#fdfcfb";
    cx.fillStyle = css;
    if (a !== cx.fillStyle) return null;
    const dark = over(css, "#000000"), light = over(css, "#ffffff");
    const alpha = 1 - (light[0] - dark[0] + light[1] - dark[1] + light[2] - dark[2]) / 765;
    if (alpha < 0.004) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => Math.min(255, Math.round(dark[i] / alpha))).concat(Math.min(1, Math.round(alpha * 255) / 255));
  };
  const seen = (el) => {
    for (let up = el; up && up.nodeType === 1; up = up.parentElement) {
      const s = getComputedStyle(up);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  // A picture or gradient clipped to the letters is the text's fill; its pixels are not read here.
  const clipped = (el) => {
    for (let up = el; up && up.nodeType === 1; up = up.parentElement) {
      const s = getComputedStyle(up);
      if ((s.webkitBackgroundClip === "text" || s.backgroundClip === "text") && s.backgroundImage !== "none") return true;
    }
    return false;
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
      .map((r) => ({ x: Math.max(0, Math.floor(r.left + scrollX)), y: Math.max(0, Math.floor(r.top + scrollY)), r: Math.min(W, Math.ceil(r.right + scrollX)), b: Math.min(H, Math.ceil(r.bottom + scrollY)) }))
      .filter((b) => b.r - b.x >= 1 && b.b - b.y >= 1);
    if (!boxes.length) continue;
    if (!byEl.has(el)) {
      const s = getComputedStyle(el);
      const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
      const own = parse(s.color), fill = parse(s.webkitTextFillColor || s.color), edge = parse(s.webkitTextStrokeColor);
      const stroke = parseFloat(s.webkitTextStrokeWidth) || 0;
      let colour = own, outline = false, unread = null;
      if (!own || !fill) unread = "its colour is written in a way Chrome did not resolve: " + (!own ? s.color : s.webkitTextFillColor);
      else {
        // Text drawn only as an outline (a stroke, the fill clear): its stroke is what is read.
        outline = stroke > 0 && fill[3] < 0.1;
        if (outline) {
          colour = edge;
          if (!edge) unread = "its outline colour is written in a way Chrome did not resolve: " + s.webkitTextStrokeColor;
        } else if (fill[3] < own[3]) colour = fill;
        if (!unread && !outline && colour[3] < 0.1 && clipped(el)) unread = "its fill is a picture or gradient clipped to the letters";
      }
      // A faded container fades its text too: every opacity from the element up multiplies in.
      if (colour) for (let up = el; up && up.nodeType === 1; up = up.parentElement) colour[3] *= Number(getComputedStyle(up).opacity);
      byEl.set(el, { text: "", boxes: [], colour, unread, size, weight, outline, large: size >= 24 || (size >= 18.66 && weight >= 700) });
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
  const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: looked > H, clip: { x: 0, y: 0, width: W, height: looked, scale: 1 } });
  if (!shot.result?.data) fail(`could not take the screenshot${shot.error ? `: ${shot.error.message}` : ""}`);

  // Read the shot's pixels in a blank page, and measure each text against what is under it.
  const measured = texts.filter((t) => !t.unread);
  await call("Page.navigate", { url: "about:blank" });
  await sleep(200);
  const results = await evaluate(`(async () => {
  const texts = ${JSON.stringify(measured)};
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
  finished = true;
  ws.close();

  const hex = (rgb) => `#${rgb.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  // Rounded down, so a ratio just under its threshold never prints as the threshold.
  const r2 = (v) => (v == null ? null : Math.floor(v * 100) / 100);
  const boxOf = (t) => {
    const x = Math.min(...t.boxes.map((b) => b.x)), y = Math.min(...t.boxes.map((b) => b.y));
    return [x, y, Math.max(...t.boxes.map((b) => b.r)) - x, Math.max(...t.boxes.map((b) => b.b)) - y];
  };
  const said = (t) => (t.text.length > 40 ? `${t.text.slice(0, 39)}…` : t.text);
  const rows = results.map((t) => {
    const need = t.large ? large : min;
    return {
      text: said(t),
      box: boxOf(t),
      colour: hex(t.colour) + (t.colour[3] < 1 ? ` at ${Math.round(t.colour[3] * 100)}%` : "") + (t.outline ? " (outline)" : ""),
      size: t.size,
      large: t.large,
      background: t.worstBg ? hex(t.worstBg) : null,
      p5: r2(t.p5),
      worst: r2(t.worst),
      need,
      pass: t.p5 == null || t.p5 >= need,
    };
  });
  const unread = texts.filter((t) => t.unread).map((t) => ({ text: said(t), box: boxOf(t), reason: t.unread }));
  const failing = rows.filter((r) => !r.pass);
  const reach = looked >= total ? `all ${total} px of the page` : `the top ${looked} of ${total} px; the rest is not checked (--max-height)`;
  if (json) console.log(JSON.stringify({ texts: rows, failing: failing.length, unread, page: { height: total, looked, whole: looked >= total } }, null, 1));
  else {
    for (const r of failing) console.log([`"${r.text}"`, `box ${r.box.join(",")}`, `text ${r.colour}`, `worst on ${r.background}`, `${r.p5}:1 (worst ${r.worst}:1)`, `needs ${r.need}:1${r.large ? " (large)" : ""}`].join("\t"));
    for (const u of unread) console.log([`not read: "${u.text}"`, `box ${u.box.join(",")}`, u.reason].join("\t"));
  }
  console.error(`screen-contrast: ${rows.length} texts, ${failing.length} under, ${unread.length} not read; looked at ${reach}`);
  process.exit(failing.length ? FAILED : 0);
}
main().catch((e) => fail(e.message));
