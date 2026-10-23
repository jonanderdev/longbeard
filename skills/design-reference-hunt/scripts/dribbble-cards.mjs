#!/usr/bin/env node
// List Dribbble search/popular cards from a listing URL.
// Headless Chrome; prints TSV: id-slug\tviews\timageURL\ttitle
//
//   node dribbble-cards.mjs "https://dribbble.com/search/shots/popular/product-design?q=writing+app&timeframe=year" --scrolls 4
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const url = args[0];
const scrolls = Math.max(0, Number(flag("scrolls", "3")) || 3);
if (!url || !/^https?:\/\/(www\.)?dribbble\.com\//i.test(url)) {
  console.error(
    'usage: node dribbble-cards.mjs "https://dribbble.com/search/..." [--scrolls 4]',
  );
  process.exit(2);
}

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

const dir = mkdtempSync(join(tmpdir(), "hunt-dribbble-"));
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
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

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
  ws.onopen = res;
  ws.onerror = () => rej(new Error("CDP socket failed"));
});
let nextId = 1;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject: bad } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) bad(new Error(msg.error.message));
    else ok(msg.result);
  }
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
await page("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await page("Page.navigate", { url }, 40000);
await sleep(3000);

for (let i = 0; i < scrolls; i++) {
  await page("Runtime.evaluate", {
    expression: "window.scrollBy(0, Math.round(window.innerHeight * 0.9))",
    returnByValue: true,
  });
  await sleep(900);
}

const { result } = await page("Runtime.evaluate", {
  expression: `(() => {
    const rows = [];
    const seen = new Set();
    for (const li of document.querySelectorAll("li")) {
      const a = li.querySelector('a[href*="/shots/"]');
      if (!a) continue;
      const m = (a.getAttribute("href") || "").match(/\\/shots\\/([^/?#]+)/);
      if (!m) continue;
      const idSlug = m[1];
      if (seen.has(idSlug)) continue;
      const img = li.querySelector("img");
      if (!img) continue;
      const raw = img.getAttribute("data-src") || img.currentSrc || img.src || "";
      const imageURL = raw.replace(/\\?.*$/, "");
      if (!imageURL) continue;
      seen.add(idSlug);
      const text = (li.innerText || "").replace(/\\s+/g, " ");
      const vm = text.match(/([\\d.]+\\s*[kKmM]?)\\s*views?/i) || text.match(/([\\d.]+\\s*[kKmM]?)/);
      const views = vm ? vm[1].replace(/\\s+/g, "") : "";
      const title = (img.getAttribute("alt") || a.getAttribute("title") || idSlug).replace(/\\t/g, " ").trim();
      rows.push([idSlug, views, imageURL, title].join("\\t"));
    }
    return rows.join("\\n");
  })()`,
  returnByValue: true,
});

const tsv = result?.value || "";
if (!tsv.trim()) {
  console.error("0 cards (empty listing or rate limit — retry once after a pause)");
  drop();
  process.exit(1);
}
console.log(tsv);
drop();
process.exit(0);
