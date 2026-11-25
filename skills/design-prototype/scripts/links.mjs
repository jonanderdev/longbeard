#!/usr/bin/env node
// Scan a clickable prototype: every page in its folder, from its first page on, for
// links that break and pages with no way on, and for what it still stands in for.
// Node 22+, an installed Chrome, no dependencies.
//
//   node links.mjs "file://$PWD/.longbeard/design/prototype/home.html"
//
// Pages are rendered (links a script builds count). Links are followed from the first page, then
// every other page in the prototype's folder is opened too, so a page behind a state (an empty
// basket) is still scanned. A link elsewhere (a real site, mailto:) is listed, never followed. A form that submits to another page is a way on, and so is
// a button whose script navigates: each is clicked, and the page it lands on is followed. A query (?state=empty) or a hash is the same page, but the
// page is opened with the query it was first reached by, so state a prototype keeps in
// the address (a basket, a chosen slot) carries on as it does for a person.
//
// Says, one line each:
//   broken     a link to a page that is not there
//   nowhere    a link or button that goes nowhere: href "#", "", "javascript:…", or a
//              button outside a form with no onclick and no link around it
//   dead end   a page with no way on to another page of the prototype (a link, a form, a button)
// then the pages scanned.
// Exit 1 when anything is broken, nowhere, a dead end or unmarked; 0 when the scan is clean.
//
// It also lists what the page does not really have yet: every element marked data-standin="picture"
// or data-standin="fact" (a stand-in picture; a price, an hour, a number or a name the brief does not
// give), with data-standin-note for what is assumed. One line each, "stand-in", then a count, or "none
// marked". The list never fails the walk. A picture whose file sits in a credits.tsv beside it (a
// stand-in from pictures.mjs) with no mark is "unmarked", and does.
//   --width 1440, --wait 300 (ms per page), --json
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
const width = Number(flag("width", "1440"));
const wait = Number(flag("wait", "300"));
const json = has("json");
const [start] = args;
const usage = 'usage: node links.mjs "file:///…/prototype/home.html" [--width 1440] [--wait 300] [--json]';
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
let sessionId;
ws.onmessage = (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
  // A script's alert or confirm would hold the page; answer it so a click can go on.
  else if (msg.method === "Page.javascriptDialogOpening") ws.send(JSON.stringify({ id: ++nextId, method: "Page.handleJavaScriptDialog", params: { accept: true }, sessionId: msg.sessionId || sessionId }));
};
// Every call has a deadline: a page that never answers costs 20 s, never the walk.
const send = (method, params = {}, session) => new Promise((done) => {
  const id = ++nextId;
  const t = setTimeout(() => (pending.delete(id), done({ error: { message: `${method} timed out` } })), 20000);
  pending.set(id, (msg) => (clearTimeout(t), done(msg)));
  ws.send(JSON.stringify({ id, method, params, sessionId: session }));
});
const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
sessionId = att.sessionId;
const call = (method, params) => send(method, params, att.sessionId);
await call("Page.enable");
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "the page threw");
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });

// Every link, form and button on the rendered page: where it goes, and its words.
const readPage = `(() => {
  const words = (el) => (el.innerText || el.value || el.getAttribute("aria-label") || el.title || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  const links = [...document.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), url: a.href, words: words(a) }));
  // A form whose action names a page submits there: a way on, like a link. One with no action, "#" or
  // script as its action is left to its buttons below.
  const real = (v) => { const t = (v || "").trim(); return Boolean(t) && t !== "#" && !/^javascript:/i.test(t); };
  const forms = [...document.forms].filter((f) => real(f.getAttribute("action"))).map((f) => ({ href: f.getAttribute("action").trim(), url: new URL(f.getAttribute("action").trim(), document.baseURI).href, words: words(f.querySelector("button, input[type=submit], input[type=image]") || f) || "form" }));
  // Controls that may do something. Whether a script listens on them is asked of DevTools below, and
  // a click shows where they lead. A control in a form that already names its page is that form's.
  window.__controls = [...document.querySelectorAll("button, [role=button], input[type=button], input[type=submit], input[type=image]")]
    .filter((b) => !b.closest("a") && !b.disabled && !b.getAttribute("popovertarget") && !b.getAttribute("commandfor") && !(b.form && real(b.form.getAttribute("action"))))
    .slice(0, 40);
  return { links, forms, buttons: window.__controls.map((b) => ({ words: words(b), inForm: Boolean(b.form || b.closest("form")), inline: Boolean(b.onclick || b.getAttribute("onclick")) })) };
})()`;
// A button does something when a click listener sits on it or on anything above it (a menu wired
// on its parent, a handler on document).
async function listened(i) {
  const chain = await call("Runtime.evaluate", { expression: `(() => { const a = []; for (let n = window.__controls[${i}]; n; n = n.parentNode) a.push(n); a.push(window); return a; })()` });
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
// Open a page and wait for it to settle.
async function open(url) {
  const nav = await call("Page.navigate", { url });
  if (nav.result?.errorText || nav.error) return false;
  await settle();
  return true;
}
async function settle() {
  for (let i = 0; i < 50 && (await evaluate("document.readyState").catch(() => "")) !== "complete"; i++) await sleep(100);
  await sleep(wait);
}
// Click the i-th control on a fresh copy of the page and say where the browser is afterwards: a
// script that navigates ends on another page, a form with a script on it likewise.
async function clickThrough(url, i) {
  if (!(await open(url))) return "";
  await evaluate(readPage).catch(() => null);
  // A required field would stop the submit before the script sees it; the walk is of the way on, not the validation.
  await evaluate("for (const f of document.forms) f.noValidate = true").catch(() => null);
  await evaluate(`window.__controls && window.__controls[${i}] && window.__controls[${i}].click()`).catch(() => null);
  await sleep(wait);
  await settle();
  return (await evaluate("location.href").catch(() => "")) || "";
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

const seen = new Set([startPath]);
const firstUrl = new Map([[startPath, start.split("#")[0]]]);
const queue = [startPath];
const broken = [], nowhere = [], deadEnds = [], outside = new Set();
// When the links run out, every page in the folder not reached yet is opened by itself.
const rest = () => readdirSync(dirname(startPath)).filter((f) => /\.html?$/i.test(f)).sort().map((f) => join(dirname(startPath), f)).filter((p) => !seen.has(p));
while (queue.length || (queue.push(...rest().slice(0, 1)), queue.length)) {
  const path = queue.shift();
  seen.add(path);
  const pageUrl = firstUrl.get(path) || pathToFileURL(path).href;
  if (!(await open(pageUrl))) {
    broken.push({ from: "(start)", to: path });
    continue;
  }
  const { links, forms, buttons } = await evaluate(readPage).catch(() => ({ links: [], forms: [], buttons: [] }));
  const name = pageName(path);
  await collectStandins(name);
  let out = 0;
  // A way on to url: out of the prototype, to a page that is not there, to this page, or to another to walk.
  const take = (href, url, words) => {
    if (!/^file:/.test(url)) return void outside.add(url);
    const to = fileURLToPath(url.split(/[?#]/)[0]);
    if (!inside(to)) return void outside.add(url);
    if (!existsSync(to)) return void broken.push({ from: name, to: href, words });
    if (to !== path) out++;
    if (!seen.has(to)) {
      seen.add(to);
      firstUrl.set(to, url.split("#")[0]);
      queue.push(to);
    }
  };
  for (const l of links) {
    const href = (l.href ?? "").trim();
    if (!href || href === "#" || /^javascript:/i.test(href)) {
      nowhere.push({ page: name, what: `link "${l.words || href || "(no words)"}"`, href: href || "(empty)" });
      continue;
    }
    if (href.startsWith("#")) continue; // a jump within the page
    take(href, l.url, l.words);
  }
  for (const f of forms) take(f.href, f.url, f.words);
  // Ask which controls are wired before any click: a click leaves the page.
  const wired = [];
  for (const [i, b] of buttons.entries()) wired.push(b.inForm || b.inline || (await listened(i)));
  for (const [i, b] of buttons.entries()) {
    if (!wired[i]) {
      nowhere.push({ page: name, what: `button "${b.words || "(no words)"}"`, href: "no action" });
      continue;
    }
    // Wired: click it and see whether the browser goes to another page.
    const after = await clickThrough(pageUrl, i);
    if (!after || !/^file:/.test(after) || fileURLToPath(after.split(/[?#]/)[0]) === path) {
      if (after && !/^(file:|about:|chrome-error:)/.test(after)) outside.add(after);
      continue;
    }
    take(after, after, b.words);
  }
  if (!out) deadEnds.push(name);
}
const pages = [...seen].map((p) => ({ page: pageName(p) }));

if (json) console.log(JSON.stringify({ pages, broken, nowhere, deadEnds, standins, unmarked, outside: [...outside] }, null, 1));
else {
  for (const b of broken) console.log(`broken     ${b.from} → ${b.to}${b.words ? ` ("${b.words}")` : ""}`);
  for (const n of nowhere) console.log(`nowhere    ${n.page}: ${n.what} (${n.href})`);
  for (const d of deadEnds) console.log(`dead end   ${d}: no link to another page`);
  for (const u of unmarked) console.log(`unmarked   ${u.page}: picture ${u.file} is a stand-in (credits.tsv) and has no data-standin`);
  for (const s of standins) console.log(`stand-in   ${s.page}: ${s.kind} ${s.kind === "fact" ? `"${s.what}"` : s.what}${s.note ? ` (${s.note})` : ""}`);
  console.log(standins.length ? `stand-ins: ${standins.length} (${[...new Set(standins.map((s) => s.kind))].map((k) => `${standins.filter((s) => s.kind === k).length} ${k}`).join(", ")}), what they still need to supply` : "stand-ins: none marked");
  console.log(`pages: ${pages.map((p) => p.page).join(", ")}${outside.size ? ` · ${outside.size} link${outside.size > 1 ? "s" : ""} out of the prototype, not followed` : ""}`);
}
process.exit(broken.length || nowhere.length || deadEnds.length || unmarked.length ? 1 : 0);
