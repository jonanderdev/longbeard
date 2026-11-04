#!/usr/bin/env node
// List the pins on a logged-out Pinterest search. Pins carry no link there, so
// each row gets its full-size image and a Google Lens link that looks it up.
// Headless Chrome; prints TSV: label\timageURL\tlensURL, which contact-sheet.mjs reads.
//
//   node pinterest-pins.mjs "receipt ui design" > pins.tsv
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const query = process.argv[2];
if (!query) {
  console.error('usage: node pinterest-pins.mjs "<form to search>"');
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

const chromePath = findChrome();
if (!chromePath) {
  console.error("No Chrome found. Set CHROME_PATH.");
  process.exit(1);
}
const profile = mkdtempSync(join(tmpdir(), "pins-"));
const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1440,1100", "about:blank"], {
  stdio: ["ignore", "ignore", "pipe"],
});
const wsUrl = await new Promise((done) => {
  let buffer = "";
  chrome.stderr.on("data", (d) => {
    buffer += d;
    const match = buffer.match(/ws:\/\/\S+/);
    if (match) done(match[0]);
  });
});
const socket = new WebSocket(wsUrl);
await new Promise((done) => (socket.onopen = done));
let id = 0;
const waiting = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  waiting.get(message.id)?.(message);
  waiting.delete(message.id);
};
const send = (method, params = {}, sessionId) =>
  new Promise((done) => {
    id += 1;
    waiting.set(id, done);
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: attached } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
const session = attached.sessionId;
await send("Page.navigate", { url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}` }, session);
await sleep(6000);
for (let i = 0; i < 4; i += 1) {
  await send("Runtime.evaluate", { expression: "scrollBy(0, 800)" }, session);
  await sleep(1000);
}
const reply = await send("Runtime.evaluate", {
  expression: `[...document.images].map((i) => i.src).filter((s) => /pinimg[.]com[/](236x|474x|736x|originals)/.test(s))`,
  returnByValue: true,
}, session);
chrome.kill("SIGKILL");
rmSync(profile, { recursive: true, force: true, maxRetries: 3 });

const label = query.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const images = [...new Set(reply.result?.result?.value ?? [])].map((src) => src.replace(/\/(236x|474x)\//, "/736x/"));
images.forEach((src, i) => console.log(`${label}-${i}\t${src}\thttps://lens.google.com/uploadbyurl?url=${encodeURIComponent(src)}`));
console.error(`${images.length} pins. 0 can mean a login wall: open the search and look.`);
process.exit(0);
