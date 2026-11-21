#!/usr/bin/env node
// Walk a clickable prototype from its first page, the way a person can: every
// link followed, every page reached counted in clicks from the start. It finds
// what makes a flow break before anyone tries it. Node 22+, an installed
// Chrome, no dependencies.
//
//   node links.mjs "file://$PWD/.longbeard/design/prototype/home.html" --expect menu,product,basket,checkout
//
// Pages are rendered (links a script builds count), and only pages in the
// prototype's folder are walked; a link elsewhere (a real site, mailto:) is
// listed, never followed. A query (?state=empty) or a hash is the same page, but the
// page is opened with the query it was first reached by, so state a prototype keeps in
// the address (a basket, a chosen slot) carries on as it does for a person.
//
// Says, one line each:
//   broken     a link to a page that is not there
//   nowhere    a link or button that goes nowhere: href "#", "", "javascript:…", or a
//              button outside a form with no onclick and no link around it
//   dead end   a page with no link to any other page of the prototype
//   unreached  a page named in --expect that no click reaches
// then each page reached, with its clicks from the start.
// Exit 1 when anything is broken, nowhere, a dead end, unreached or unmarked; 0 when the walk is clean.
//
// It also lists what the page does not really have yet: every element marked data-standin="picture"
// or data-standin="fact" (a stand-in picture; a price, an hour, a number or a name the brief does not
// give), with data-standin-note for what is assumed. One line each, "stand-in", then a count, or "none
// marked". The list never fails the walk. A picture whose file sits in a credits.tsv beside it (a
// stand-in from pictures.mjs) with no mark is "unmarked", and does.
//   --expect a,b (page names, without .html), --width 1440, --wait 300 (ms per page), --json
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
if (typeof WebSocket === "undefined") { console.error("Node 22+ is required."); process.exit(1); }

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const expect = flag("expect").split(",").map((x) => x.trim().replace(/\.html?$/i, "")).filter(Boolean);
const width = Number(flag("width", "1440"));
const wait = Number(flag("wait", "300"));
const json = has("json");
const [start] = args;
const usage = 'usage: node links.mjs "file:///…/prototype/home.html" [--expect menu,basket] [--width 1440] [--wait 300] [--json]';
if (!start || args.length !== 1 || !/^file:/.test(start) || !(width >= 200 && width <= 3840) || !(wait >= 0 && wait <= 10000)) {
  console.error(usage);
  process.exit(2);
}
const startPath = fileURLToPath(start.split(/[?#]/)[0]);
if (!existsSync(startPath)) {
  console.error(`links: no page at ${startPath}`);
  process.exit(1);
}
const root = dirname(startPath);
const pageName = (path) => basename(path, extname(path));
const inside = (path) => path === root || path.startsWith(root + "/") || path.startsWith(root + "\\");

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
if (!exe) {
  console.error("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), "links-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
process.once("exit", () => {
  try {
    proc.kill("SIGKILL");
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
});
const fail = (text) => {
  console.error(`links: ${text}`);
  process.exit(1);
};
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
const call = (method, params) => send(method, params, att.sessionId);
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "the page threw");
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });

// Every link and button on the rendered page: where it goes, and its words.
const readPage = `(() => {
  const words = (el) => (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  const links = [...document.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), url: a.href, words: words(a) }));
  // Buttons that may do nothing; whether a script listens on them is asked of DevTools below.
  window.__links = [...document.querySelectorAll("button, [role=button]")]
    .filter((b) => !b.closest("a, form") && !b.onclick && !b.getAttribute("onclick") && !b.getAttribute("popovertarget") && !b.getAttribute("commandfor") && !b.disabled);
  return { links, buttons: window.__links.map((b) => ({ words: words(b) })) };
})()`;
// A button does something when a click listener sits on it or on anything above it (a menu wired
// on its parent, a handler on document).
async function listened(i) {
  const chain = await call("Runtime.evaluate", { expression: `(() => { const a = []; for (let n = window.__links[${i}]; n; n = n.parentNode) a.push(n); a.push(window); return a; })()` });
  const arrayId = chain.result?.result?.objectId;
  if (!arrayId) return true;
  const props = await call("Runtime.getProperties", { objectId: arrayId, ownProperties: true });
  for (const p of props.result?.result || []) {
    if (!/^\d+$/.test(p.name) || !p.value?.objectId) continue;
    const l = await call("DOMDebugger.getEventListeners", { objectId: p.value.objectId });
    if ((l.result?.listeners || []).some((x) => /^(click|pointerdown|pointerup|mousedown|mouseup|touchstart|touchend)$/.test(x.type))) return true;
  }
  return false;
}

// ---- Stand-ins: what a page shows that the product does not really have yet. ----
// Read on every page the walk reaches. Marked in the markup: data-standin="picture" or "fact",
// optional data-standin-note. Not part of the link checks above or below.
const standins = [], unmarked = [];
const readStandins = `(() => {
  const text = (el) => (el.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  const marked = [...document.querySelectorAll("[data-standin]")].map((el) => {
    const img = el.matches("img") ? el : el.querySelector("img");
    return { kind: (el.getAttribute("data-standin") || "").trim() || "unspecified", note: (el.getAttribute("data-standin-note") || "").trim(), words: img ? "" : text(el), alt: img ? (img.getAttribute("alt") || "").trim() : "", src: img ? img.src : "" };
  });
  const imgs = [...document.querySelectorAll("img")].map((i) => ({ src: i.src, alt: (i.getAttribute("alt") || "").trim(), marked: !!i.closest("[data-standin]") }));
  return { marked, imgs };
})()`;
const creditsOf = new Map();
const credited = (file) => {
  const dir = dirname(file);
  if (!creditsOf.has(dir)) {
    const list = join(dir, "credits.tsv");
    const rows = existsSync(list) ? readFileSync(list, "utf8").split("\n").filter((l) => l && !l.startsWith("#")) : [];
    creditsOf.set(dir, new Set(rows.map((l) => basename(l.split("\t")[1] || ""))));
  }
  return creditsOf.get(dir).has(basename(file));
};
const fileOf = (url) => (/^file:/.test(url || "") ? fileURLToPath(url.split(/[?#]/)[0]) : "");
async function collectStandins(page) {
  const { marked, imgs } = await evaluate(readStandins).catch(() => ({ marked: [], imgs: [] }));
  const seen = new Set();
  for (const m of marked) {
    const file = fileOf(m.src);
    const what = [m.alt || (file && basename(file)) || m.words || "(nothing to show)"].concat(m.alt && file ? [`(${basename(file)})`] : []).join(" ");
    const key = `${m.kind}|${what}`;
    if (seen.has(key)) continue;
    seen.add(key);
    standins.push({ page, kind: m.kind, what, note: m.note });
  }
  for (const i of imgs) {
    const file = fileOf(i.src);
    if (file && !i.marked && credited(file) && !unmarked.some((u) => u.page === page && u.file === basename(file))) unmarked.push({ page, file: basename(file) });
  }
}
// ---- end of stand-ins ----

const depth = new Map([[startPath, 0]]);
const firstUrl = new Map([[startPath, start.split("#")[0]]]);
const queue = [startPath];
const broken = [], nowhere = [], deadEnds = [], outside = new Set();
while (queue.length) {
  const path = queue.shift();
  const nav = await call("Page.navigate", { url: firstUrl.get(path) || pathToFileURL(path).href });
  if (nav.result?.errorText) {
    broken.push({ from: "(start)", to: path });
    continue;
  }
  for (let i = 0; i < 50 && (await evaluate("document.readyState").catch(() => "")) !== "complete"; i++) await sleep(100);
  await sleep(wait);
  const { links, buttons } = await evaluate(readPage).catch(() => ({ links: [], buttons: [] }));
  const name = pageName(path);
  await collectStandins(name);
  let out = 0;
  for (const l of links) {
    const href = (l.href ?? "").trim();
    if (!href || href === "#" || /^javascript:/i.test(href)) {
      nowhere.push({ page: name, what: `link "${l.words || href || "(no words)"}"`, href: href || "(empty)" });
      continue;
    }
    if (href.startsWith("#")) continue; // a jump within the page
    if (!/^file:/.test(l.url)) {
      outside.add(l.url);
      continue;
    }
    const to = fileURLToPath(l.url.split(/[?#]/)[0]);
    if (!inside(to)) {
      outside.add(l.url);
      continue;
    }
    if (!existsSync(to)) {
      broken.push({ from: name, to: href, words: l.words });
      continue;
    }
    if (to !== path) out++;
    if (!depth.has(to)) {
      depth.set(to, depth.get(path) + 1);
      firstUrl.set(to, l.url.split("#")[0]);
      queue.push(to);
    }
  }
  for (const [i, b] of buttons.entries()) if (!(await listened(i))) nowhere.push({ page: name, what: `button "${b.words || "(no words)"}"`, href: "no action" });
  if (!out) deadEnds.push(name);
}
const reached = new Set([...depth.keys()].map(pageName));
const unreached = expect.filter((e) => !reached.has(e));
const pages = [...depth.entries()].sort((a, b) => a[1] - b[1]).map(([p, d]) => ({ page: pageName(p), clicks: d }));

if (json) console.log(JSON.stringify({ pages, broken, nowhere, deadEnds, unreached, standins, unmarked, outside: [...outside] }, null, 1));
else {
  for (const b of broken) console.log(`broken     ${b.from} → ${b.to}${b.words ? ` ("${b.words}")` : ""}`);
  for (const n of nowhere) console.log(`nowhere    ${n.page}: ${n.what} (${n.href})`);
  for (const d of deadEnds) console.log(`dead end   ${d}: no link to another page`);
  for (const u of unreached) console.log(`unreached  ${u}: no click from ${pageName(startPath)} reaches it`);
  for (const u of unmarked) console.log(`unmarked   ${u.page}: picture ${u.file} is a stand-in (credits.tsv) and has no data-standin`);
  for (const s of standins) console.log(`stand-in   ${s.page}: ${s.kind} ${s.kind === "fact" ? `"${s.what}"` : s.what}${s.note ? ` (${s.note})` : ""}`);
  console.log(standins.length ? `stand-ins: ${standins.length} (${[...new Set(standins.map((s) => s.kind))].map((k) => `${standins.filter((s) => s.kind === k).length} ${k}`).join(", ")}), what they still need to supply` : "stand-ins: none marked");
  console.log(`pages: ${pages.map((p) => `${p.page} ${p.clicks}`).join(", ")}${outside.size ? ` · ${outside.size} link${outside.size > 1 ? "s" : ""} out of the prototype, not followed` : ""}`);
}
process.exit(broken.length || nowhere.length || deadEnds.length || unreached.length || unmarked.length ? 1 : 0);
