#!/usr/bin/env node
// Full-page capture. Unsticks fixed/sticky chrome first so Chrome does not
// repeat the same fold. Node 22+. Uses an installed Chrome/Edge/Chromium.
//
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name.jpg
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name.jpg --review /tmp/name-review.jpg
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name.jpg --clip x,y,w,h
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name.jpg --clip-selector "main"
//   node capture.mjs <url> --out /tmp/mobile.png --width 390
//   node capture.mjs http://localhost:3000/app --out /tmp/app.png --cookie "session=abc; theme=dark" --strict
//
// A page that ends up at another address (a login, or a site's canonical
// www) is named on stderr. With --strict that is exit 1, so a 0 means the
// shot is of the page asked for.
//   node capture.mjs file:///abs/path/moodboard.html --out /tmp/moodboard.jpg
//   node capture.mjs file:///abs/path/shot.jpg --out .longbeard/design/moodboard/refs/name.jpg --clip x,y,w,h
//
// Before the shot it waits out loaders: until no loader covers the screen and
// the screen is not one flat colour and the network is quiet, for at most --wait ms (15 s on the web,
// 2 s for files and localhost). If a full page comes back blank at the top
// where the screen was not (a canvas that redraws only what is on screen),
// it keeps the screen it saw as the shot, the full page beside it as
// <name>-full.jpg, and says so.
//
// Motion: --frames N writes N screen-sized frames, --every ms apart (500), to
// the folder --out names: 01-00000ms.jpg, 02-00500ms.jpg… Without --scroll they
// start as the page opens, so the loader and the intro are in them. With
// --scroll they start once it has loaded, and each frame scrolls half a
// screen by the wheel, so scroll-driven motion plays.
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name-intro --frames 12
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name-scroll --frames 12 --every 400 --scroll
//
// --click "css" clicks that element once the page has loaded, as a person
// would. Alone it keeps the screen after the click (an open menu). With
// --frames the first frame is before the click and the rest record what the
// click does (a menu opening, a page transition).
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name-menu.jpg --click "button[aria-label*=menu i]"
//   node capture.mjs <url> --out .longbeard/design/moodboard/refs/name-menu-open --frames 10 --every 150 --click "header button"
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  // A flag that needs a value and has none is a usage error, not a plain shot.
  if (v === undefined || /^--[a-z]/.test(v)) {
    console.error(`--${name} needs a value`);
    process.exit(2);
  }
  args.splice(i, 2);
  return v;
};
const url = args[0];
const outArg = flag("out", "") || "";
const reviewArg = flag("review", "") || "";
const clipArg = flag("clip", "") || "";
const clipSelector = flag("clip-selector", "") || "";
// Sent with every request to the page's own origin, as a logged-in browser would.
const cookieArg = flag("cookie", "") || "";
const bool = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i !== -1) args.splice(i, 1);
  return i !== -1;
};
const strict = bool("strict");
const scrollFrames = bool("scroll");
const framesArg = flag("frames", "") || "";
// Clicks this element once the page has loaded: a menu button, a link, a tab.
const clickArg = flag("click", "") || "";
const everyArg = flag("every", "") || "";
const waitArg = flag("wait", "") || "";
// Below 768 the page gets a phone viewport: mobile layout, 2x pixels.
const width = Math.round(Number(flag("width", "1440")));
if (!url || !/^(https?|file):\/\//.test(url) || !outArg) {
  console.error(
    'usage: node capture.mjs <https://url | file:///path> --out .longbeard/design/moodboard/refs/name.jpg [--review /tmp/name-review.jpg] [--clip x,y,w,h | --clip-selector "css"] [--width 390] [--cookie "name=value; …"] [--strict] [--wait ms] [--click "css"] [--frames N [--every ms] [--scroll]]',
  );
  process.exit(2);
}
if (!Number.isFinite(width) || width < 200 || width > 3840) {
  console.error("width must be a number from 200 to 3840");
  process.exit(2);
}
const frames = framesArg ? Number(framesArg) : 0;
const every = everyArg ? Number(everyArg) : 500;
if (framesArg && (!Number.isInteger(frames) || frames < 2 || frames > 60)) {
  console.error("frames must be a whole number from 2 to 60");
  process.exit(2);
}
if (!Number.isInteger(every) || every < 100 || every > 10000) {
  console.error("every must be a whole number of ms from 100 to 10000");
  process.exit(2);
}
if ((everyArg || scrollFrames) && !frames) {
  console.error("--every and --scroll go with --frames");
  process.exit(2);
}
if (clickArg && scrollFrames) {
  console.error("pass --click or --scroll, not both");
  process.exit(2);
}
if ((frames || clickArg) && (reviewArg || clipArg || clipSelector)) {
  console.error("--frames and --click take whole screens: drop --review, --clip and --clip-selector");
  process.exit(2);
}
// A local page has no loader worth waiting for, so a sparse screen costs little.
// A full page stops at 14000 px; our own files (a picker, a moodboard) run to 30000 px a part,
// and a longer one is kept in parts (see below).
const tallest = /^file:/.test(url) ? 30000 : 14000;
const local = /^file:/.test(url) || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
const maxWait = waitArg ? Number(waitArg) : local ? 2000 : 15000;
if (!Number.isFinite(maxWait) || maxWait < 0 || maxWait > 120000) {
  console.error("wait must be ms from 0 to 120000");
  process.exit(2);
}
const mobile = width < 768;
const height = mobile ? 844 : 900;
if (clipArg && clipSelector) {
  console.error("pass --clip or --clip-selector, not both");
  process.exit(2);
}

// A relative path is relative to the folder the command runs in.
function resolveOut(path) {
  return path ? resolve(path) : "";
}

const out = resolveOut(outArg);
const reviewOut = resolveOut(reviewArg);

// A page that is not there would otherwise be a black shot that looks like a result.
if (/^file:/.test(url)) {
  let file = "";
  try {
    file = fileURLToPath(url.replace(/[?#].*$/, ""));
  } catch {}
  if (!file || !existsSync(file)) {
    console.error(`no such file: ${file || url}`);
    process.exit(1);
  }
}

function parseClip(s) {
  if (!s) return null;
  const parts = s.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    console.error("clip must be x,y,w,h (non-negative numbers)");
    process.exit(2);
  }
  const [x, y, w, h] = parts;
  if (w < 1 || h < 1) {
    console.error("clip width and height must be >= 1");
    process.exit(2);
  }
  return { x, y, width: w, height: h, scale: 1 };
}

const clip = parseClip(clipArg);

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const exe = findChrome();
if (!exe) {
  console.error("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
  process.exit(1);
}
if (typeof WebSocket === "undefined") {
  console.error("Node 22+ is required.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "hunt-chrome-"));
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

proc = spawn(
  exe,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${dir}`,
    "--no-first-run",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-color-profile=srgb",
    // Without a GPU, Chrome no longer falls back to software WebGL on its own.
    "--enable-unsafe-swiftshader",
    `--window-size=${width},${height}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
proc.on("error", (e) => {
  console.error(`could not start ${exe}: ${e.message}`);
  process.exit(1);
});

let buf = "";
const wsUrl = await new Promise((resolveWs, reject) => {
  const t = setTimeout(() => reject(new Error("Chrome did not start")), 20000);
  proc.stderr.on("data", (d) => {
    buf += d.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) {
      clearTimeout(t);
      resolveWs(m[1]);
    }
  });
  proc.on("exit", (code) => {
    clearTimeout(t);
    reject(new Error(`Chrome exited ${code}`));
  });
});

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("CDP socket did not open")), 10000);
  ws.onopen = () => {
    clearTimeout(t);
    res();
  };
  ws.onerror = () => {
    clearTimeout(t);
    rej(new Error("CDP socket failed"));
  };
});
let nextId = 1;
const pending = new Map();
// Requests in flight, so the wait can tell a loader still fetching its assets.
// A request open for over 10 s is a stream or a poll, not a load.
const inflight = new Map();
let lastNetwork = Date.now();
ws.onmessage = (ev) => {
  const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
  // A hot-reload stream or a socket stays open by design, so it is not a load.
  if (msg.method === "Network.requestWillBeSent" && !/^(EventSource|WebSocket)$/.test(msg.params.type || "")) {
    inflight.set(msg.params.requestId, Date.now());
    lastNetwork = Date.now();
  } else if (msg.method === "Network.loadingFinished" || msg.method === "Network.loadingFailed") {
    inflight.delete(msg.params.requestId);
    lastNetwork = Date.now();
  }
  // An alert, confirm or beforeunload prompt holds the page until it is answered.
  if (msg.method === "Page.javascriptDialogOpening") {
    send("Page.handleJavaScriptDialog", { accept: false }, msg.sessionId).catch(() => {});
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject: bad } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) bad(new Error(msg.error.message));
    else ok(msg.result);
  }
};
// If Chrome goes away, every call waiting on it fails now, not at its time limit.
ws.onclose = () => {
  for (const { reject: bad } of [...pending.values()]) bad(new Error("Chrome closed the connection"));
};
const send = (method, params = {}, sessionId, timeoutMs = 30000) => {
  const id = nextId++;
  return new Promise((resolveSend, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolveSend(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
};

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const page = (method, params, timeoutMs) => send(method, params, sessionId, timeoutMs);

await page("Page.enable");
await page("Runtime.enable");
await page("Network.enable");
await page("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: mobile ? 2 : 1,
  mobile,
});
// Chrome centres an image file and shrinks it to the window. A page that holds
// it at full size from 0,0 makes --clip x,y,w,h the image's own pixels.
let target = url;
if (/^file:\/\/.*\.(png|jpe?g|webp|gif)$/i.test(url)) {
  target = `file://${join(dir, "image.html")}`;
  writeFileSync(join(dir, "image.html"), `<!doctype html><body style="margin:0;background:#000"><img src="${url.replace(/"/g, "%22")}" style="display:block">`);
}
if (cookieArg && /^https?:/.test(url)) {
  const cookies = cookieArg
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const at = pair.indexOf("=");
      return { name: pair.slice(0, at), value: pair.slice(at + 1), url: new URL(url).origin };
    });
  if (cookies.some((cookie) => !cookie.name)) {
    console.error('cookie must be "name=value; name=value"');
    drop();
    process.exit(2);
  }
  await page("Network.setCookies", { cookies });
}
const evalValue = async (expression, timeoutMs) =>
  (await page("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, timeoutMs)).result?.value;

// Share of a PNG's pixels in its most common colour, so 1 is one flat colour.
// Chrome writes 8-bit RGB or RGBA, not interlaced; anything else counts as not flat.
function flatShare(png) {
  if (png.readUInt32BE(12) !== 0x49484452) return 0;
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const depth = png[24];
  const type = png[25];
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (depth !== 8 || !bpp || png[28] !== 0) return 0;
  const chunks = [];
  for (let at = 8; at < png.length; ) {
    const len = png.readUInt32BE(at);
    const kind = png.toString("latin1", at + 4, at + 8);
    if (kind === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + len));
    at += len + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = w * bpp;
  let prev = Buffer.alloc(stride);
  const counts = new Map();
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = (line[i] + add) & 255;
    }
    for (let i = 0; i < stride; i += bpp) {
      const key = ((line[i] >> 3) << 10) | ((line[i + 1] >> 3) << 5) | (line[i + 2] >> 3);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    prev = line;
  }
  return Math.max(...counts.values()) / (w * h);
}

// How flat the screen is: a small PNG of what a person sees right now, or of
// the top of the full page once it has been laid out for the full shot.
const FLAT = 0.985;
const screenFlat = async (beyond = false) => {
  const { data } = await page(
    "Page.captureScreenshot",
    { format: "png", clip: { x: 0, y: 0, width, height, scale: 0.25 }, captureBeyondViewport: beyond },
    20000,
  );
  return flatShare(Buffer.from(data, "base64"));
};

// A loader is a fixed or absolute layer named like one that covers most of
// the screen, or a visible count to 100%. A canvas or a video is the page.
const loaderCheck = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const named = /(^|[-_\\s])(pre-?)?load(er|ing)?([-_\\s]|$)|preload|intro|splash|curtain/i;
  for (const el of document.body ? document.body.querySelectorAll("*") : []) {
    if (el.tagName === "CANVAS" || el.tagName === "VIDEO") continue;
    const label = ((typeof el.className === "string" ? el.className : "") + " " + el.id).trim();
    const count = el.childElementCount === 0 && /^\\s*\\d{1,3}\\s*%\\s*$/.test(el.textContent || "");
    if (!count && !named.test(label)) continue;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05) continue;
    if (!count && s.position !== "fixed" && s.position !== "absolute") continue;
    const r = el.getBoundingClientRect();
    const seen = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (count ? seen > 0 : seen >= vw * vh * 0.6) return (label || el.tagName).slice(0, 60);
  }
  return "";
})()`;

// Waits for the load event and fonts, then until two checks in a row see no
// loader, a screen that is not one flat colour (or has stayed flat with the
// network quiet for 2.5 s), and no request for a second.
// Returns why it gave up.
async function settle() {
  const start = Date.now();
  const left = () => Math.max(0, maxWait - (Date.now() - start));
  await evalValue(
    `new Promise((done) => {
      const t = setTimeout(done, ${Math.max(1500, Math.min(maxWait, 20000))});
      const fonts = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { clearTimeout(t); done(); });
      if (document.readyState === "complete") fonts(); else addEventListener("load", fonts, { once: true });
    })`,
    25000,
  ).catch(() => {});
  const busy = () => {
    for (const [id, at] of inflight) if (Date.now() - at > 10000) inflight.delete(id);
    return inflight.size > 0 || Date.now() - lastNetwork < 1000;
  };
  let good = 0;
  let fetched = false;
  let flatSince = 0;
  for (;;) {
    const loader = await evalValue(loaderCheck).catch(() => "");
    const flat = loader ? 1 : await screenFlat().catch(() => 0);
    const fetching = busy();
    fetched ||= fetching;
    // A flat screen with nothing left to fetch for 2.5 s is a sparse page, not a loader.
    flatSince = flat >= FLAT && !loader && !fetching ? flatSince || Date.now() : 0;
    const sparse = flatSince && Date.now() - flatSince >= 2500;
    good = !loader && !fetching && (flat < FLAT || sparse) ? good + 1 : 0;
    if (good >= 2) break;
    if (!left()) {
      return loader
        ? `a loader still covers the screen (${loader})`
        : flat >= FLAT
          ? "the screen is still one flat colour"
          : "the page is still fetching";
    }
    await sleep(Math.min(500, left()));
  }
  // A loader that waited on its assets usually plays a reveal once they land.
  if (fetched && !local) await sleep(Math.min(1500, left()));
  return "";
}

// Clicks a consent button, which can be any element, or else strips a short
// privacy notice. Rejecting comes first: a script has no use for tracking,
// and accepting can start scripts that redraw the page.
// A local page is a state someone set up on purpose, so it is left as it is, and
// so is a record of motion (--frames): nothing there is cleaned up.
const dismissConsent = () =>
  local ? Promise.resolve(false) : evalValue(`(() => {
    // The common consent tools first, by their own ids: reject, then accept.
    const known = [
      "#onetrust-reject-all-handler", "#CybotCookiebotDialogBodyButtonDecline", "#didomi-notice-disagree-button",
      ".cky-btn-reject", "#cmplz-deny, .cmplz-deny", "[data-cookiefirst-action=reject]", ".iubenda-cs-reject-btn",
      "#onetrust-accept-btn-handler", "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll", "#didomi-notice-agree-button",
      ".cky-btn-accept", ".cmplz-accept", "[data-cookiefirst-action=accept]", ".iubenda-cs-accept-btn",
    ];
    for (const sel of known) {
      const el = document.querySelector(sel);
      if (el && el.getClientRects().length) {
        el.click();
        return true;
      }
    }
    const accept = /^(accept( all)?( cookies)?|accept (and|&) (close|continue)|agree|i agree|ok|okay|got it|allow( all)?( cookies)?|i understand|acepto|aceptar( todas?| todo| cookies)?|aceptar y (cerrar|continuar)|onartu( guztiak)?|accepter( tout)?|tout accepter|j'accepte|alle akzeptieren|akzeptieren|accetta( tutti)?|accetto|aceitar( todos)?)$/i;
    const reject = /^(reject( all)?( cookies)?|decline( all)?|deny|only (essential|necessary)( cookies)?|rechazar( todas?| todo| cookies)?|denegar|ukatu( guztiak)?|refuser( tout)?|tout refuser|continuer sans accepter|alle ablehnen|ablehnen|rifiuta( tutti)?|rejeitar( todos)?)$/i;
    const clickable = [...document.querySelectorAll("button, [role=button], a, input[type=button], input[type=submit], [onclick], div, span")]
      .filter((el) => el.childElementCount <= 2 && el.getClientRects().length);
    // Only inside something that looks like a notice about cookies or privacy: a
    // dialog, a layer fixed or sticky over the page, or one named like a banner.
    // Never the page itself, so a short page that mentions privacy is not a notice.
    const about = /cookie|consent|privacy|gdpr|datenschutz|privacidad|consentimiento|confidentialit|privacit/i;
    const named = /cookie|consent|gdpr|privacy|banner|notice|popup|modal|dialog/i;
    const notice = (el) => {
      for (let up = el, i = 0; up && up !== document.body && up !== document.documentElement && i < 8; up = up.parentElement, i++) {
        const t = up.innerText || "";
        if (t.length >= 1500 || !about.test(t)) continue;
        const pos = getComputedStyle(up).position;
        const label = (typeof up.className === "string" ? up.className : "") + " " + up.id;
        if (up.tagName === "DIALOG" || /^(dialog|alertdialog)$/.test(up.getAttribute("role") || "") ||
            up.getAttribute("aria-modal") === "true" || pos === "fixed" || pos === "sticky" || named.test(label)) return true;
      }
      return false;
    };
    const text = (el) => (el.innerText || el.value || el.textContent || "").trim().replace(/\\s+/g, " ");
    const pick = (re) => clickable.find((el) => text(el).length < 40 && re.test(text(el)) && notice(el));
    const hit = pick(reject) || pick(accept);
    if (hit) {
      hit.click();
      return true;
    }
    // No button: strip a short privacy notice that floats over the page (e.g.
    // Google Fonts "×" banner). Only a fixed or sticky layer with no canvas or
    // video, because a wrapper whose only text is the notice can hold the page.
    const privacy = /uses cookies|uses essential cookies|privacy and google fonts|cookie settings/i;
    for (const el of [...document.querySelectorAll("div, section, aside, dialog")]) {
      const t = (el.innerText || el.textContent || "").trim();
      const pos = getComputedStyle(el).position;
      if (t.length > 0 && t.length < 300 && privacy.test(t) && el.children.length < 12 &&
          (pos === "fixed" || pos === "sticky") && !el.querySelector("canvas, video")) {
        el.remove();
      }
    }
    return false;
  })()`).catch(() => false);

// A real press and release in the middle of the element, as a person would click.
async function clickOn(selector) {
  const box = await evalValue(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  })()`);
  if (!box) {
    console.error(`no visible element matches ${selector}`);
    drop();
    process.exit(1);
  }
  const at = { x: Math.round(box.x), y: Math.round(box.y), button: "left", clickCount: 1 };
  await page("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y });
  await page("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
  await page("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
}

const navigateStarted = Date.now();
// A page that cannot be reached comes back as Chrome's own error page, which would be saved as if
// it were the site: say so and stop.
const nav = await page("Page.navigate", { url: target }, 40000);
if (nav?.errorText && nav.errorText !== "net::ERR_ABORTED") {
  console.error(`could not reach ${target}: ${nav.errorText}`);
  drop();
  process.exit(1);
}

if (frames) {
  // The frames are the record of motion, so nothing is paused, unstuck or cleaned up.
  const folder = out.replace(/\.(png|jpe?g|webp)$/i, "");
  mkdirSync(folder, { recursive: true });
  let t0 = navigateStarted;
  if (scrollFrames || clickArg) {
    const why = await settle();
    if (why) console.error(`waited ${maxWait} ms: ${why}`);
    await sleep(600);
    t0 = Date.now();
  }
  for (let i = 0; i < frames; i++) {
    const due = t0 + i * every;
    if (Date.now() < due) await sleep(due - Date.now());
    if (scrollFrames && i > 0) {
      await page("Input.dispatchMouseEvent", { type: "mouseWheel", x: Math.round(width / 2), y: Math.round(height / 2), deltaX: 0, deltaY: Math.round(height / 2) });
    }
    // While the page is still swapping in, Chrome refuses a shot for a moment.
    let data = "";
    for (let tries = 0; !data && tries < 10; tries++) {
      data = await page("Page.captureScreenshot", { format: "jpeg", quality: 70 }, 20000).then((r) => r.data, () => "");
      if (!data) await sleep(150);
    }
    if (!data) continue;
    const at = Date.now() - t0;
    const file = join(folder, `${String(i + 1).padStart(2, "0")}-${String(at).padStart(5, "0")}ms.jpg`);
    writeFileSync(file, Buffer.from(data, "base64"));
    // The first frame is the page before the click; the rest are what it does.
    if (clickArg && i === 0) await clickOn(clickArg);
  }
  console.log(folder);
  drop();
  process.exit(0);
}

const waited = await settle();
if (waited) console.error(`waited ${maxWait} ms: ${waited}`);

const beforeHref = await evalValue("location.href");
// A consent click can make a page redraw from black, so the wait runs again.
if (await dismissConsent()) {
  await sleep(800);
  const again = await settle();
  if (again) console.error(`after the consent click, waited ${maxWait} ms: ${again}`);
} else await sleep(800);
const afterHref = await evalValue("location.href");

if (afterHref !== beforeHref) {
  console.error(`navigated away: ${afterHref}`);
  drop();
  process.exit(1);
}

// After a click the page is a new state, often an overlay: the screen is the shot.
if (clickArg) {
  await clickOn(clickArg);
  await sleep(1500);
  const format = /\.png$/i.test(out) ? "png" : /\.webp$/i.test(out) ? "webp" : "jpeg";
  const { data } = await page("Page.captureScreenshot", { format, ...(format === "png" ? {} : { quality: 70 }) }, 20000);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(out);
  drop();
  process.exit(0);
}

// The screen as a person first sees it, kept in case the full page loses it.
const firstFormat = /\.png$/i.test(out) ? "png" : /\.webp$/i.test(out) ? "webp" : "jpeg";
const firstScreen = (
  await page("Page.captureScreenshot", { format: firstFormat, ...(firstFormat === "png" ? {} : { quality: 70 }) }, 20000)
).data;
const firstFlat = await screenFlat().catch(() => 1);

await page(
  "Runtime.evaluate",
  {
    expression: `(() => new Promise((done) => {
    (async () => {
      for (const img of document.images) {
        if (img.loading === "lazy") img.loading = "eager";
      }
      const dwell = (ms) => new Promise((r) => setTimeout(r, ms));
      const step = Math.max(480, Math.round(window.innerHeight * 0.65));
      const limit = Math.min(
        Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
        ${tallest}
      );
      let y = 0;
      while (y < limit) {
        y = Math.min(limit, y + step);
        window.scrollTo(0, y);
        await dwell(600);
      }
      await Promise.race([
        Promise.all([...document.images].map((img) => img.decode().catch(() => {}))),
        dwell(8000),
      ]);
      window.scrollTo(0, 0);
      await dwell(700);
      done();
    })().catch(() => done());
  }))()`,
    awaitPromise: true,
    returnByValue: true,
  },
  90000,
);

await page("Runtime.evaluate", {
  expression: `(() => {
    const style = document.createElement("style");
    style.textContent = \`
      html, body { height: auto !important; max-height: none !important; overflow: visible !important; }
      * { animation-play-state: paused !important; transition: none !important; scroll-behavior: auto !important; }
    \`;
    document.head.appendChild(style);
    for (const el of document.querySelectorAll("*")) {
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") {
        el.style.setProperty("position", "relative", "important");
        el.style.setProperty("top", "auto", "important");
        el.style.setProperty("bottom", "auto", "important");
      }
    }
  })()`,
  awaitPromise: true,
  returnByValue: true,
});
await sleep(400);

// A redirect can land late (an app checks the session after it loads), so
// the address is checked last, right before the shot.
if (target === url) {
  const landed = (await page("Runtime.evaluate", { expression: "location.href", returnByValue: true })).result.value;
  const where = (href) => {
    const u = new URL(href);
    return `${u.origin}${u.pathname.replace(/\/$/, "")}`;
  };
  if (where(landed) !== where(url)) {
    console.error(`landed on ${landed}, not ${url}.${/^https?:/.test(landed) ? " Behind a login? Pass --cookie." : " Check the address."}`);
    if (strict) {
      drop();
      process.exit(1);
    }
  }
}

// --clip-selector takes the element's box in document coordinates, measured
// after the unstick pass so the numbers match what the capture sees.
let selected = null;
if (clipSelector) {
  const { result } = await page("Runtime.evaluate", {
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(clipSelector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.round(r.left + window.scrollX)),
        y: Math.max(0, Math.round(r.top + window.scrollY)),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    })()`,
    returnByValue: true,
  });
  selected = result?.value || null;
  if (!selected) {
    console.error(`no element matches ${clipSelector}`);
    drop();
    process.exit(1);
  }
  if (selected.width < 1 || selected.height < 1) {
    console.error(`${clipSelector} has no box (width ${selected.width}, height ${selected.height})`);
    drop();
    process.exit(1);
  }
}

const metrics = await page("Page.getLayoutMetrics");
const size = metrics.cssContentSize || metrics.contentSize;
const fullWidth = Math.max(1, Math.ceil(size.width || width));
const fullHeight = Math.max(1, Math.min(Math.ceil(size.height || height), tallest));
const clipBox = clip || (selected ? { ...selected, scale: 1 } : null);
const shotClip = clipBox
  ? {
      x: Math.min(clipBox.x, fullWidth - 1),
      y: Math.min(clipBox.y, fullHeight - 1),
      width: Math.min(clipBox.width, fullWidth - Math.min(clipBox.x, fullWidth - 1)),
      height: Math.min(clipBox.height, fullHeight - Math.min(clipBox.y, fullHeight - 1)),
      scale: 1,
    }
  : { x: 0, y: 0, width: fullWidth, height: fullHeight, scale: 1 };

// The file is what its name says, so a reader that trusts the extension is right.
const format = /\.png$/i.test(out) ? "png" : /\.webp$/i.test(out) ? "webp" : "jpeg";
let { data } = await page(
  "Page.captureScreenshot",
  {
    format,
    ...(format === "png" ? {} : { quality: 70 }),
    captureBeyondViewport: true,
    clip: shotClip,
  },
  60000,
);

// A canvas that draws only what is on screen goes blank when the page is laid
// out full length. Then the screen seen first is the honest shot, and the
// full page is kept beside it for what lies below.
let fullOut = "";
if (!clipBox && firstFlat < FLAT && (await screenFlat(true).catch(() => 0)) >= FLAT) {
  if (fullHeight > height * 1.2) {
    fullOut = out.replace(/(\.[a-z]+)?$/i, (ext) => `-full${ext || ".jpg"}`);
    mkdirSync(dirname(fullOut), { recursive: true });
    writeFileSync(fullOut, Buffer.from(data, "base64"));
  }
  data = firstScreen;
  console.error(
    `the full page came back blank at the top (a canvas that draws only what is on screen): kept the first screen${fullOut ? `, and the full page as ${fullOut}` : ""}`,
  );
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(data, "base64"));
console.log(out);

// A local page longer than one shot (a families board of hundreds) is kept whole, in parts:
// <out>-2, <out>-3 … each up to the same height, so nothing below the first part is lost.
const realHeight = Math.ceil(size.height || height);
if (clipBox && (shotClip.height < clipBox.height || shotClip.width < clipBox.width)) {
  console.error(`the clip reaches past the page (${fullWidth}x${realHeight} px): kept ${shotClip.width}x${shotClip.height} px of ${clipBox.width}x${clipBox.height}`);
} else if (!clipBox && !/^file:/.test(url) && realHeight > fullHeight) {
  console.error(`the page is ${realHeight} px, over the ${tallest} px limit: kept the first ${fullHeight} px`);
}
if (!clipBox && /^file:/.test(url) && realHeight > fullHeight) {
  const parts = Math.min(10, Math.ceil(realHeight / tallest));
  for (let i = 1; i < parts; i++) {
    const y = i * tallest;
    const { data: part } = await page("Page.captureScreenshot", { format, ...(format === "png" ? {} : { quality: 70 }), captureBeyondViewport: true, clip: { x: 0, y, width: fullWidth, height: Math.min(tallest, realHeight - y), scale: 1 } }, 60000);
    const partOut = out.replace(/(\.[a-z]+)?$/i, (ext) => `-${i + 1}${ext || ".jpg"}`);
    writeFileSync(partOut, Buffer.from(part, "base64"));
    console.log(partOut);
  }
  if (realHeight > parts * tallest) console.error(`the page is ${realHeight} px: kept the first ${parts * tallest} px in ${parts} parts`);
}

if (reviewOut) {
  // Side-by-side columns ~2800 px tall so a tall capture stays readable.
  // Real capture stays the single tall file; review is scratch only.
  const reviewHtml = `<!doctype html><meta charset=utf-8>
<canvas id=c></canvas>
<script>
const src = "data:image/${format};base64,${data}";
const img = new Image();
img.onload = () => {
  const colH = 2800;
  const gap = 20;
  const cols = Math.max(1, Math.ceil(img.height / colH));
  const c = document.getElementById("c");
  c.width = cols * img.width + (cols - 1) * gap;
  c.height = Math.min(colH, img.height);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < cols; i++) {
    const sy = i * colH;
    const sh = Math.min(colH, img.height - sy);
    ctx.drawImage(img, 0, sy, img.width, sh, i * (img.width + gap), 0, img.width, sh);
  }
  document.title = "ready";
};
img.src = src;
</script>`;
  const reviewPage = join(dir, "review.html");
  writeFileSync(reviewPage, reviewHtml);
  await page("Page.navigate", { url: `file://${reviewPage}` }, 20000);
  await sleep(400);
  for (let i = 0; i < 40; i++) {
    const title = (
      await page("Runtime.evaluate", { expression: "document.title", returnByValue: true })
    ).result.value;
    if (title === "ready") break;
    await sleep(100);
  }
  const { result: sizeResult } = await page("Runtime.evaluate", {
    expression: `(() => {
      const c = document.getElementById("c");
      return { w: c.width, h: c.height };
    })()`,
    returnByValue: true,
  });
  const { data: reviewData } = await page(
    "Page.captureScreenshot",
    {
      format: /\.png$/i.test(reviewOut) ? "png" : "jpeg",
      quality: 75,
      clip: { x: 0, y: 0, width: sizeResult.value.w, height: sizeResult.value.h, scale: 1 },
      captureBeyondViewport: true,
    },
    60000,
  );
  mkdirSync(dirname(reviewOut), { recursive: true });
  writeFileSync(reviewOut, Buffer.from(reviewData, "base64"));
  console.log(reviewOut);
}

drop();
process.exit(0);
