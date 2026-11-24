#!/usr/bin/env node
// What the key screens use, measured across all of them, so the set can be
// checked as one design. Opens each page headless at 1440 and reads every
// visible element's computed style: faces, colours (text, fills, borders),
// type sizes, corner radii and spacing steps. Node 22+, an installed Chrome,
// no dependencies.
//
//   node drift.mjs "file://$PWD/.longbeard/design/prototype/home.html" "file://$PWD/.longbeard/design/prototype/menu.html" --identity docs/design/design-identity.md
//
// With --identity (the design-identity doc and its `json identity` block),
// every face and colour a screen uses that the identity does not have is
// listed as off, with the screens that use it. Without it, only the counts.
// Sizes, radii and spacing steps are counted, each with the screens that use
// it, and a value only one screen uses is marked "one screen": a likely drift,
// or a device the look needs. It never judges the look: it says what is there.
//
// Pictures, SVG drawings and anything marked data-standin are skipped. A
// colour within 3 of an identity colour on every channel is that colour; a
// colour drawn at an opacity counts as its colour.
//
// Exit 0 nothing off the identity, 1 a face or colour off it, 2 usage, 3 could not run.
//   --width 1440, --wait 300 (ms), --json
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const identityArg = flag("identity");
const width = Number(flag("width", "1440"));
const wait = Number(flag("wait", "300"));
const json = has("json");
const urls = args.map((a) => (/^(https?|file):/.test(a) ? a : existsSync(a) ? pathToFileURL(resolve(a)).href : a));
if (!urls.length || urls.some((u) => !/^(https?|file):/.test(u)) || !(width >= 200 && width <= 3840) || !(wait >= 0 && wait <= 10000)) {
  console.error('usage: node drift.mjs "<url or file>" … [--identity docs/design/design-identity.md] [--width 1440] [--wait 300] [--json]');
  process.exit(2);
}

// ---- the identity ----
const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "-apple-system", "blinkmacsystemfont", "emoji", "math"]);
const hexOf = (s) => {
  const m = String(s || "").trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${h.toLowerCase()}`;
};
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
let identity = null;
if (identityArg) {
  if (!existsSync(identityArg)) {
    console.error(`drift: no identity at ${identityArg}`);
    process.exit(2);
  }
  const block = readFileSync(identityArg, "utf8").match(/```json identity\s*\n([\s\S]*?)```/);
  if (!block) {
    console.error(`drift: ${identityArg} has no \`json identity\` block`);
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(block[1]);
  } catch (e) {
    console.error(`drift: the json identity block in ${identityArg} could not be read: ${e.message}`);
    process.exit(2);
  }
  const faces = [parsed.display?.face, parsed.body?.face, ...(parsed.faces || []).map((f) => f.face || f)].filter(Boolean).map((f) => String(f).toLowerCase());
  const colours = (parsed.colours || []).map((c) => ({ name: c.name || "", hex: hexOf(c.hex) })).filter((c) => c.hex);
  identity = { faces: new Set(faces), colours };
}
const near = (hex) => identity?.colours.find((c) => rgbOf(c.hex).every((v, i) => Math.abs(v - rgbOf(hex)[i]) <= 3));

// ---- the browser ----
let finished = false;
function couldNot(why) {
  if (finished) return;
  finished = true;
  console.error(`drift: could not run: ${why}`);
  console.log("not checked: drift (" + why + "). Report it as not checked, never as passed.");
  process.exit(3);
}
const watchdog = setTimeout(() => couldNot("the run took more than 120 s"), 120000);
function findChrome() {
  const env = process.env.CHROME_PATH;
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
if (!exe) couldNot("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
const dir = mkdtempSync(join(tmpdir(), "drift-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
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
  const t = setTimeout(() => no(new Error("Chrome did not start within 20 s")), 20000);
  proc.on("error", (e) => no(e));
  proc.stderr.on("data", (d) => {
    const m = (buf += d).match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) done(m[1], clearTimeout(t));
  });
}).catch((e) => couldNot(e.message));
const ws = new WebSocket(wsUrl);
await new Promise((done, no) => {
  const t = setTimeout(() => no(new Error("Chrome did not answer within 10 s")), 10000);
  ws.onopen = () => done(clearTimeout(t));
  ws.onerror = () => no(new Error("could not connect to Chrome"));
}).catch((e) => couldNot(e.message));
let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
};
const send = (method, params = {}, sessionId, ms = 15000) =>
  new Promise((done, no) => {
    const id = ++nextId;
    const t = setTimeout(() => (pending.delete(id), no(new Error(`${method} took more than ${ms / 1000} s`))), ms);
    pending.set(id, (m) => (clearTimeout(t), m.error ? no(new Error(`${method}: ${m.error.message}`)) : done(m)));
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sent to the page as text: it may use nothing outside itself.
function readPage() {
  const out = { faces: [], colours: [], sizes: [], radii: [], steps: [] };
  const toHex = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (!(a > 0)) return null;
    return { hex: "#" + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""), a: Math.round(a * 100) / 100 };
  };
  const px = (v) => Math.round(parseFloat(v) * 2) / 2;
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg, picture, video, canvas, [data-standin], script, style, noscript, template")) continue;
    if (el.tagName === "IMG") continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      out.faces.push(cs.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, ""));
      out.sizes.push(px(cs.fontSize));
      const c = toHex(cs.color);
      if (c) out.colours.push({ ...c, as: "text" });
    }
    const bg = toHex(cs.backgroundColor);
    if (bg) out.colours.push({ ...bg, as: "fill" });
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none") {
        const b = toHex(cs[`border${side}Color`]);
        if (b) out.colours.push({ ...b, as: "border" });
        break;
      }
    }
    const radius = px(cs.borderTopLeftRadius);
    if (radius > 0 && radius < 9999) out.radii.push(radius >= r.height / 2 - 1 && radius >= r.width / 2 - 1 ? "round" : radius >= r.height / 2 - 1 ? "pill" : radius);
    for (const v of [cs.rowGap, cs.columnGap, cs.paddingTop, cs.paddingLeft, cs.marginTop, cs.marginBottom]) {
      const n = px(v);
      if (n > 0) out.steps.push(n);
    }
  }
  return out;
}

const target = await send("Target.createTarget", { url: "about:blank" }).catch((e) => couldNot(e.message));
const { sessionId } = (await send("Target.attachToTarget", { targetId: target.result.targetId, flatten: true }).catch((e) => couldNot(e.message))).result;
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);

const screens = [];
for (const url of urls) {
  const name = decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || url).replace(/\.html?$/, "") + (url.includes("?") ? "?" + url.split("?")[1] : "");
  try {
    const loaded = new Promise((done) => {
      const prev = ws.onmessage;
      ws.onmessage = (ev) => {
        prev(ev);
        const msg = JSON.parse(String(ev.data));
        if (msg.method === "Page.loadEventFired" && msg.sessionId === sessionId) (ws.onmessage = prev), done();
      };
    });
    await send("Page.navigate", { url }, sessionId);
    await Promise.race([loaded, sleep(15000)]);
    await send("Runtime.evaluate", { expression: "document.fonts ? document.fonts.ready.then(() => true) : true", awaitPromise: true }, sessionId).catch(() => {});
    await sleep(wait);
    const res = await send("Runtime.evaluate", { expression: `(${readPage})()`, returnByValue: true }, sessionId);
    if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.text);
    screens.push({ name, ...res.result.result.value });
  } catch (e) {
    screens.push({ name, failed: e.message });
  }
}
clearTimeout(watchdog);
finished = true;

// ---- the report ----
const tally = (key, norm = (v) => v) => {
  const map = new Map();
  for (const s of screens) {
    if (s.failed) continue;
    for (const v of s[key]) {
      const k = norm(v);
      if (k == null) continue;
      if (!map.has(k)) map.set(k, new Set());
      map.get(k).add(s.name);
    }
  }
  return [...map.entries()].map(([value, on]) => ({ value, screens: [...on] }));
};
const read = screens.filter((s) => !s.failed);
const faces = tally("faces", (f) => (GENERIC.has(f.toLowerCase()) ? null : f));
const colours = tally("colours", (c) => {
  const same = near(c.hex);
  return same ? `${same.hex}${same.name ? ` ${same.name}` : ""}` : c.hex;
});
const sizes = tally("sizes").sort((a, b) => a.value - b.value);
const radii = tally("radii").sort((a, b) => String(a.value).localeCompare(String(b.value), undefined, { numeric: true }));
const steps = tally("steps").sort((a, b) => a.value - b.value);
const offFaces = identity ? faces.filter((f) => !identity.faces.has(String(f.value).toLowerCase())) : [];
const offColours = identity ? colours.filter((c) => !near(String(c.value).split(" ")[0])) : [];
const report = { screens: screens.map((s) => (s.failed ? { name: s.name, failed: s.failed } : { name: s.name })), identity: Boolean(identity), offFaces, offColours, faces, colours, sizes, radii, steps };

if (json) console.log(JSON.stringify(report, null, 1));
else {
  const one = (r) => (read.length > 1 && r.screens.length === 1 ? ` (one screen: ${r.screens[0]})` : "");
  const line = (label, list, unit = "") => `${label} ${list.length}: ${list.map((r) => `${r.value}${typeof r.value === "number" ? unit : ""}${one(r)}`).join(", ") || "none"}`;
  console.log(`Drift across ${read.length} screen${read.length === 1 ? "" : "s"} at ${width}px${identity ? `, against ${identityArg}` : ""}`);
  for (const s of screens.filter((s) => s.failed)) console.log(`not checked: ${s.name} (${s.failed})`);
  if (identity) {
    console.log(offFaces.length || offColours.length ? "Off the identity:" : "Off the identity: nothing");
    for (const f of offFaces) console.log(`- face ${f.value}: ${f.screens.join(", ")}`);
    for (const c of offColours) console.log(`- colour ${c.value}: ${c.screens.join(", ")}`);
  }
  console.log(line("Faces", faces));
  console.log(line("Colours", colours));
  console.log(line("Type sizes", sizes, "px"));
  console.log(line("Radii", radii, "px"));
  console.log(line("Spacing steps", steps, "px"));
}
process.exit(screens.some((s) => s.failed) && !read.length ? 3 : offFaces.length || offColours.length ? 1 : 0);
