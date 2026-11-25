#!/usr/bin/env node
// The hard rules a browser can measure, measured. Opens a page headless at a
// desktop and a phone width and prints findings in design-check's table, each
// tied to a rule in design-rules.md. Node 22+, an installed Chrome, no
// dependencies.
//
//   node rules.mjs "file://$PWD/.longbeard/design/prototype/home.html" --screen home
//   node rules.mjs http://localhost:3000/orders --screen orders --cookie "session=abc" --app
//
// Checks (all hard):
//   13 Responsive     nothing runs past the screen's edge at phone width (sideways scroll)
//   10 Accessibility  targets at least 24x24 CSS px, or 24 px of clear space around them
//                     (--app: 44x44 at phone width, no spacing exception; links inside a
//                     sentence are exempt, as WCAG 2.2 exempts them)
//   10 Accessibility  every input has a visible label (a placeholder or an aria-label alone is not one)
//   10 Accessibility  a focused control shows a change (outline, ring, fill, border). Real Tab
//                     presses; the 3:1 contrast of the indicator is NOT measured
//   11 Copy           no lorem ipsum, and no text that is only "Title", "Button", "User Name"...
//   5  Typography     text cut by its container, including an ellipsis. Text cut on purpose
//                     carries data-crop on the element (or one above it) and is skipped
//   5  Typography     text size: nothing under 12px; text a person acts on (links, buttons,
//                     labels, fields, navigation) at least 14px; body (running text of 60
//                     characters or more) at least 16px. Text marked data-board-size (on it or
//                     above it: the board shows it that small and the person kept it) is a
//                     warning with its measure, not a block
// Soft (reported, never blocking):
//   6  Colour         proportion on the first screen, text and pictures left out: the ground
//                     (the largest colour) under 50%, or the accent over 20% (--accent "#hex"
//                     names it; else the most saturated colour). A board that does otherwise wins
// Not checked, on purpose: overlap, collision, alignment, empty space, section height. They are
// the look's own moves. Not checked either: contrast (screen-contrast.mjs), states, hierarchy.
//
// Rounds and waivers (state in .longbeard/design/, --dir to move it):
//   rounds.json    per screen: a run on a changed page is a round. Fix after every run, then
//                  run again: two runs with no fix between are one round, and so is a first run
//                  of another state of the same screen (another url, same --screen). After
//                  --rounds (2: a check and one re-check) it says "rounds used up": stop fixing,
//                  report what is open.
//   waivers.json   --waive <id> --reason "why this finding is false", one finding at a time. The id
//                  is in the Where cell. A reason of fewer than three words is refused. Waived
//                  findings are still listed, with the reason.
//   --ship "their words"   the person ends the loop: the words are recorded, the open findings
//                  are reported, and runs on that page exit 0.
//
// Exit 0 no hard findings (or closed by the person), 1 hard findings open, 2 usage, 3 could not
// run. A check that could not run is "not checked", never passed. The first failure on a screen
// says what to do; the second says to report it as not checked and go on.
//   --widths 1440,390, --screen name, --app, --cookie "a=b; c=d", --wait 300 (ms), --timeout 120000
//   (ms for the whole run; every browser call also has its own 15 s limit), --rounds 2, --dir,
//   --accent "#hex" (the accent from DESIGN.md, for the proportion), --json
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const screenArg = flag("screen");
const widths = flag("widths", "1440,390").split(",").map((w) => Number(w.trim()));
const cookieArg = flag("cookie");
const wait = Number(flag("wait", "300"));
const totalMs = Number(flag("timeout", "120000"));
const limit = Number(flag("rounds", "2"));
const stateDir = flag("dir", ".longbeard/design");
const waiveId = flag("waive");
const reason = flag("reason");
const shipWords = flag("ship");
const app = has("app");
const json = has("json");
const accentArg = flag("accent");
const [url] = args;
const usage = 'usage: node rules.mjs "<file:// or http(s):// url>" [--screen name] [--widths 1440,390] [--app] [--cookie "a=b"] [--wait 300] [--timeout 120000] [--rounds 2] [--dir .longbeard/design] [--accent "#hex"] [--json]\n       node rules.mjs --screen name --waive <id> --reason "why this finding is false"\n       node rules.mjs --screen name --ship "the person\'s words"';
const recording = Boolean(waiveId || shipWords);
const usageOk = recording ? Boolean(screenArg || url) && args.length <= 1 : url && args.length === 1 && /^(https?|file):/.test(url);
if (!usageOk || widths.some((w) => !(w >= 200 && w <= 3840)) || !(wait >= 0 && wait <= 10000) || !(totalMs >= 5000) || !(limit >= 1) || (waiveId && shipWords) || (reason && !waiveId) || (accentArg && !/^#?[0-9a-f]{6}$/i.test(accentArg))) {
  console.error(usage);
  process.exit(2);
}
const screen = screenArg || url.split("#")[0];

// ---- state: rounds and waivers ----
const roundsFile = join(stateDir, "rounds.json");
const waiversFile = join(stateDir, "waivers.json");
const readJson = (file, empty) => {
  if (!existsSync(file)) return empty;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    console.error(`rules: ${file} could not be read; it was moved to ${file}.bad and started again`);
    renameSync(file, `${file}.bad`);
    return empty;
  }
};
const writeJson = (file, value) => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
};
const rounds = readJson(roundsFile, {});
const waivers = readJson(waiversFile, []);
const record = rounds[screen] || {};
const today = () => new Date().toISOString().slice(0, 10);

if (waiveId) {
  const found = (record.found || []).find((f) => f.id === waiveId);
  if (!found) {
    console.error(`rules: no open finding ${waiveId} on ${screen}. Run the check, and use the id in the Where cell.`);
    process.exit(2);
  }
  if (reason.trim().split(/\s+/).filter(Boolean).length < 3) {
    console.error('rules: a waiver needs a reason in words: why this finding is false (--reason "…"). A hard rule is never waived, only a finding that is wrong.');
    process.exit(2);
  }
  if (waivers.some((w) => w.screen === screen && w.id === waiveId)) {
    console.error(`rules: ${waiveId} is already waived on ${screen}.`);
    process.exit(2);
  }
  waivers.push({ screen, id: waiveId, rule: found.rule, where: found.where, reason: reason.trim(), at: today() });
  writeJson(waiversFile, waivers);
  console.log(`waived ${waiveId} on ${screen}: ${reason.trim()}`);
  process.exit(0);
}
if (shipWords) {
  if (!shipWords.trim()) {
    console.error(usage);
    process.exit(2);
  }
  if (!record.found) {
    console.error(`rules: ${screen} has not been checked yet. Run it once, so the open findings are on record.`);
    process.exit(2);
  }
  record.closed = { words: shipWords.trim(), at: today(), open: record.found.filter((f) => (f.level || "hard") === "hard" && !waivers.some((w) => w.screen === screen && w.id === f.id)) };
  rounds[screen] = record;
  writeJson(roundsFile, rounds);
  console.log(`${screen} closed by the person: "${record.closed.words}". Open findings, to report as open:`);
  for (const f of record.closed.open) console.log(`- ${f.rule}: ${f.where} [${f.id}]`);
  process.exit(0);
}

// ---- could not run: the first time blocks with what to do, the second lets go ----
let finished = false;
function couldNot(why) {
  if (finished) return;
  finished = true;
  const failed = (record.failed || 0) + 1;
  try {
    rounds[screen] = { ...record, failed };
    writeJson(roundsFile, rounds);
  } catch {}
  console.error(`rules: could not run: ${why}`);
  console.log(`not checked: ${screen} (${why}).`);
  console.log(failed === 1 ? "Fix what stops it (the address, the login with --cookie, Chrome via CHROME_PATH) and run it once more. Until it runs, this screen is not checked." : "It could not run twice. Report this screen as not checked, never as passed, and go on.");
  process.exit(3);
}
const watchdog = setTimeout(() => couldNot(`the whole run took more than ${Math.round(totalMs / 1000)} s`), totalMs);

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
if (!exe) couldNot("No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.");
const dir = mkdtempSync(join(tmpdir(), "rules-"));
const proc = spawn(exe, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
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
ws.onclose = () => {
  for (const [id, done] of pending) done({ id, error: { message: "Chrome closed" } });
  pending.clear();
};
// Every browser call has a time limit.
const send = (method, params = {}, sessionId, ms = 15000) =>
  new Promise((done, no) => {
    const id = ++nextId;
    const t = setTimeout(() => (pending.delete(id), no(new Error(`${method} took more than ${ms / 1000} s`))), ms);
    pending.set(id, (m) => (clearTimeout(t), m.error ? no(new Error(`${method}: ${m.error.message}`)) : done(m)));
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- what runs inside the page ----
// Each function is sent to the page as text, so it may use nothing outside itself.

// Fingerprint of the page as built: the rendered markup without scripts, and every stylesheet.
function pageFingerprint() {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll("script").forEach((s) => s.remove());
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      css += [...sheet.cssRules].map((r) => r.cssText).join("");
    } catch {}
  }
  return clone.outerHTML + css;
}

// The static checks. Returns { found: [{ rule, check, path, desc, detail }], notChecked: [{ check, why }] }.
function staticChecks(opt) {
  const found = [];
  const notChecked = [];
  const vw = opt.width;
  const phone = vw <= 480;
  const visible = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true });
  const path = (el) => {
    if (el.id && document.querySelectorAll(`[id="${el.id.replace(/"/g, '\\"')}"]`).length === 1) return `#${el.id}`;
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [n];
      parts.unshift(`${n.tagName.toLowerCase()}${same.length > 1 ? `:nth-of-type(${same.indexOf(n) + 1})` : ""}`);
    }
    return parts.join(">");
  };
  const words = (el, n = 30) => {
    const t = (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ");
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
  };
  const desc = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join("") : "";
    const w = words(el);
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}${w ? ` "${w}"` : ""}`;
  };
  const add = (rule, check, el, detail) => found.push({ rule, check, path: path(el), desc: desc(el), detail });
  const marked = (el) => !!el.closest("[data-crop]");
  const run = (check, fn) => {
    try {
      fn();
    } catch (e) {
      notChecked.push({ check, why: String(e && e.message ? e.message : e).slice(0, 80) });
    }
  };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !(el instanceof SVGElement && el.tagName !== "svg") && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|HEAD|META|LINK)$/.test(el.tagName));
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  // 13: nothing runs past the screen's edge at phone width.
  if (phone)
    run("13 sideways", () => {
      const root = document.scrollingElement;
      // A page whose root or body clips sideways does not scroll sideways: it cuts instead.
      const hx = getComputedStyle(document.documentElement).overflowX, bx = getComputedStyle(document.body).overflowX;
      const holds = hx === "hidden" || hx === "clip" || (hx === "visible" && (bx === "hidden" || bx === "clip"));
      const scrolls = !holds && root.scrollWidth > root.clientWidth + 1;
      const fixedAbove = (el) => {
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return true;
        return false;
      };
      const contained = (el) => {
        for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (s.overflowX !== "visible") return true;
        }
        return false;
      };
      const over = [];
      for (const el of all) {
        if (!visible(el) || marked(el) || fixedAbove(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || (r.right <= vw + 1 && r.left >= -1)) continue;
        const wholly = r.left >= vw || r.right <= 0;
        // A page that holds still cuts what runs past the edge. Only words and controls count then.
        if (!scrolls && (wholly || !(ownText(el) || el.matches("a, button, input, select, textarea, img")))) continue;
        if (contained(el)) continue;
        over.push({ el, by: Math.round(Math.max(r.right - vw, -r.left)) });
      }
      const outer = over.filter((o) => !over.some((p) => p.el !== o.el && p.el.contains(o.el)));
      for (const o of outer.slice(0, 6)) add("13 Responsive", "sideways", o.el, `runs ${o.by}px past the screen's edge${scrolls ? ", so the page scrolls sideways" : ", and is cut"}`);
      if (scrolls && !outer.length) add("13 Responsive", "sideways", document.body, `the page is ${root.scrollWidth - root.clientWidth}px wider than the screen`);
    });

  // 10: targets.
  const min = opt.app && phone ? 44 : 24;
  run("10 targets", () => {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=switch], [onclick]';
    const targets = [];
    for (const el of document.body.querySelectorAll(sel)) {
      if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
      if (visible(el) && el.getBoundingClientRect().width >= 1) {
        const r = el.getBoundingClientRect();
        // A checkbox or radio drawn by its label: the label is what a finger meets.
        if (el.matches("input[type=checkbox], input[type=radio]") && (r.width < 6 || r.height < 6 || Number(getComputedStyle(el).opacity) === 0) && el.labels?.[0] && visible(el.labels[0])) targets.push(el.labels[0]);
        else targets.push(el);
      } else if (el.matches("input[type=checkbox], input[type=radio]") && el.labels?.[0] && visible(el.labels[0])) targets.push(el.labels[0]);
    }
    const set = [...new Set(targets)].filter((el) => !targets.some((o) => o !== el && o.contains(el) && o.matches("a, button, label")));
    const boxes = set.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const small = (b) => b.r.width < 24 || b.r.height < 24;
    for (const b of boxes) {
      const { el, r } = b;
      if (r.width >= min && r.height >= min) continue;
      const p = el.parentElement;
      const inline = getComputedStyle(el).display === "inline" && p && p.textContent.replace(el.textContent, "").trim().length > 0;
      if (inline) continue;
      if (min === 24) {
        // The spacing exception: a 24px circle on its centre touches no other target.
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const clear = boxes.every((o) => {
          if (o === b || o.el.contains(el) || el.contains(o.el)) return true;
          if (small(o)) return Math.hypot(cx - (o.r.left + o.r.width / 2), cy - (o.r.top + o.r.height / 2)) >= 24;
          const dx = Math.max(o.r.left - cx, 0, cx - o.r.right), dy = Math.max(o.r.top - cy, 0, cy - o.r.bottom);
          return Math.hypot(dx, dy) >= 12;
        });
        if (clear && r.width >= 1 && r.height >= 1 && small(b)) continue;
      }
      add(min === 44 ? "10 Accessibility, apps list" : "10 Accessibility", "target", el, `${Math.round(r.width)}×${Math.round(r.height)}px, needs ${min}×${min}${min === 24 ? " or 24px of clear space around it" : " for touch"}`);
    }
  });

  // 10: every input has a visible label.
  run("10 labels", () => {
    const shown = (l) => {
      if (!l || !visible(l)) return false;
      const r = l.getBoundingClientRect();
      return r.width > 3 && r.height > 3 && (l.innerText || "").trim().length > 0;
    };
    const sel = "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), select, textarea";
    for (const el of document.body.querySelectorAll(sel)) {
      const custom = el.matches("input[type=checkbox], input[type=radio]");
      if (!visible(el) && !(custom && el.labels?.length)) continue;
      const labelled = [...(el.labels || [])].some(shown) || (el.getAttribute("aria-labelledby") || "").split(/\s+/).some((id) => shown(document.getElementById(id)));
      if (labelled) continue;
      const how = el.getAttribute("placeholder") ? "only a placeholder" : el.getAttribute("aria-label") || el.title ? "only a hidden name (aria-label or title), none you can see" : "no label";
      add("10 Accessibility", "label", el, `input with ${how}`);
    }
  });

  // 11: placeholder copy.
  run("11 copy", () => {
    const stock = new Set(["title", "button", "user name", "heading", "subheading", "subtitle", "placeholder", "your text here", "body text", "sample text", "text here"]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      const t = n.textContent.trim().replace(/\s+/g, " ");
      if (!t || !el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || !visible(el)) continue;
      const lorem = /lorem ipsum|dolor sit amet|consectetur adipiscing/i.test(t);
      // A field's own name ("Title" on a label or a column) is a label, not placeholder copy.
      const stockWord = stock.has(t.toLowerCase()) && !el.closest("label, legend, th, option, dt, summary");
      if (lorem || stockWord) add("11 Copy", "placeholder", el, `"${t.length > 40 ? `${t.slice(0, 39)}…` : t}" is ${lorem ? "lorem ipsum" : "placeholder copy"}`);
    }
    for (const el of document.body.querySelectorAll("[placeholder], img[alt]")) {
      const t = el.getAttribute("placeholder") || el.getAttribute("alt") || "";
      if (/lorem ipsum|dolor sit amet/i.test(t) && visible(el)) add("11 Copy", "placeholder", el, "lorem ipsum in its placeholder or alt");
    }
  });

  // 5: text cut by its container. Text cut on purpose carries data-crop.
  run("5 clipped", () => {
    const cuts = (v) => v === "hidden" || v === "clip";
    const done = new Set();
    for (const el of all) {
      if (!ownText(el) || el instanceof SVGElement) continue;
      if (!visible(el) || marked(el)) continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 2 || box.height <= 2) continue; // visually hidden text, read by screen readers
      const s = getComputedStyle(el);
      let how = "";
      // The element's own box is smaller than its text.
      if (s.display !== "inline") {
        if (cuts(s.overflowX) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) how = `${el.scrollWidth - el.clientWidth}px of its text is cut at the side${s.textOverflow === "ellipsis" ? " (an ellipsis)" : ""}`;
        else if (cuts(s.overflowY) && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) how = `${el.scrollHeight - el.clientHeight}px of its text is cut below${s.webkitLineClamp && s.webkitLineClamp !== "none" ? " (a line clamp)" : ""}`;
      }
      // Or a box above it is: some of the text shows, some does not.
      if (!how) {
        const rects = [];
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || !n.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          rects.push(...[...range.getClientRects()].filter((r) => r.width >= 1 && r.height >= 1));
        }
        for (let a = el; a && a !== document.body && a !== document.documentElement && !how; a = a.parentElement) {
          const as = getComputedStyle(a);
          const ab = a.getBoundingClientRect();
          const clip = { l: ab.left + a.clientLeft, t: ab.top + a.clientTop };
          clip.r = clip.l + a.clientWidth;
          clip.b = clip.t + a.clientHeight;
          const axes = [cuts(as.overflowX) ? "x" : "", cuts(as.overflowY) ? "y" : ""].filter(Boolean);
          if (!axes.length) continue;
          const part = (r, x) => (x ? [Math.min(r.right, clip.r) - Math.max(r.left, clip.l), r.width] : [Math.min(r.bottom, clip.b) - Math.max(r.top, clip.t), r.height]);
          let shows = false, cut = false;
          for (const r of rects) {
            for (const x of [true, false]) {
              if (!axes.includes(x ? "x" : "y")) continue;
              const [inside, whole] = part(r, x);
              if (inside > 0.5) shows = true;
              if (inside < whole - 1) cut = true;
            }
          }
          if (shows && cut) how = "some of its text is cut by the box around it";
        }
      }
      if (how && !done.has(el)) (done.add(el), add("5 Typography", "clipped", el, how));
    }
  });

  // 5: text size. Nothing under 12px; what a person acts on 14px; body 16px.
  run("5 size", () => {
    const act = 'a, button, label, input, select, textarea, summary, legend, nav, [role=button], [role=link], [role=tab], [role=menuitem], [role=option]';
    const done = new Set();
    const size = (el) => parseFloat(getComputedStyle(el).fontSize);
    const judge = (el, text) => {
      if (done.has(el)) return;
      done.add(el);
      const px = size(el);
      const acts = !!el.closest(act);
      const block = el.closest("p, li, dd, blockquote");
      const body = !acts && block && !el.closest("figcaption, small, footer, aside, sup, sub") && (block.innerText || "").trim().length >= 60;
      const [floor, role] = acts ? [14, "text a person acts on"] : body ? [16, "body text"] : [12, "text"];
      if (px >= floor - 0.05) return;
      const board = !!el.closest("[data-board-size]");
      found.push({ rule: "5 Typography", check: "size", level: board ? "warn" : "hard", path: path(el), desc: desc(el), detail: `${Math.round(px * 10) / 10}px ${role}, floor ${floor}px${board ? " (data-board-size: the board's size, kept)" : ""}` });
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent.trim() || el instanceof SVGElement || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName) || !visible(el)) continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 2 || box.height <= 2) continue; // visually hidden text, read by screen readers
      judge(el);
    }
    for (const el of document.body.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]), select, textarea")) if (visible(el)) judge(el);
  });

  return { found, notChecked };
}

// Colour proportion of the first screen, from a shot with the text hidden. Pictures are left out.
// Returns { shares: [{ hex, share, chroma }], ground, accent } in shares of the pixels counted.
async function colourProportion(opt) {
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (el.matches("img, video, canvas, picture, iframe, svg image, object, embed") || /url\(/.test(s.backgroundImage)) {
      const r = el.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1) out.push(r);
    }
  }
  const img = new Image();
  img.src = `data:image/png;base64,${opt.png}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lab = (r, gr, b) => {
    const [R, G, B] = [lin(r), lin(gr), lin(b)];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s2 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2];
  };
  const buckets = new Map();
  let total = 0;
  const step = 2;
  for (let y = 0; y < c.height; y += step)
    for (let x = 0; x < c.width; x += step) {
      if (out.some((r) => x >= r.left && x < r.right && y >= r.top && y < r.bottom)) continue;
      const i = (y * c.width + x) * 4;
      const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
      const b = buckets.get(key) || { n: 0, r: px[i], g: px[i + 1], b: px[i + 2] };
      b.n++;
      buckets.set(key, b);
      total++;
    }
  if (!total) return { shares: [], ground: null, accent: null };
  // Near colours are one colour: a bucket joins the biggest cluster within a small distance.
  const clusters = [];
  for (const b of [...buckets.values()].sort((a, z) => z.n - a.n)) {
    const L = lab(b.r, b.g, b.b);
    const near = clusters.find((k) => Math.hypot(k.lab[0] - L[0], k.lab[1] - L[1], k.lab[2] - L[2]) < 0.06);
    if (near) near.n += b.n;
    else clusters.push({ n: b.n, lab: L, rgb: [b.r, b.g, b.b] });
  }
  const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  const shares = clusters.sort((a, z) => z.n - a.n).map((k) => ({ hex: hex(k.rgb), share: k.n / total, chroma: Math.hypot(k.lab[1], k.lab[2]), lab: k.lab }));
  const ground = shares[0];
  let accent = null;
  if (opt.accent) {
    const h = opt.accent.replace("#", "");
    const A = lab(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
    const near = shares.filter((k) => Math.hypot(k.lab[0] - A[0], k.lab[1] - A[1], k.lab[2] - A[2]) < 0.06);
    accent = { hex: `#${h.toLowerCase()}`, share: near.reduce((a, k) => a + k.share, 0), named: true };
  } else {
    // Unnamed, the accent is the most saturated colour other than the ground.
    const pick = shares.slice(1).filter((k) => k.chroma >= 0.1 && k.share >= 0.005).sort((a, z) => z.chroma - a.chroma)[0];
    if (pick) accent = { hex: pick.hex, share: pick.share, named: false };
  }
  return { shares: shares.slice(0, 4).map(({ hex: h, share }) => ({ hex: h, share })), ground: { hex: ground.hex, share: ground.share }, accent };
}

// The focus check. Called once to take the baseline, then after each Tab.
function focusBaseline() {
  const sig = (el) => {
    const s = getComputedStyle(el);
    const pseudo = ["::before", "::after"].map((p) => {
      const q = getComputedStyle(el, p);
      return [q.content, q.backgroundColor, q.borderTopColor, q.borderTopWidth, q.boxShadow, q.outlineStyle, q.outlineWidth, q.opacity, q.transform].join("/");
    });
    return [s.outlineStyle === "none" ? "none" : [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset].join(" "), s.boxShadow, s.borderTopColor, s.borderTopWidth, s.borderBottomColor, s.borderBottomWidth, s.borderLeftColor, s.borderRightColor, s.backgroundColor, s.backgroundImage, s.color, s.textDecorationLine, s.textDecorationColor, s.filter, s.transform, s.opacity, ...pseudo].join("|");
  };
  const style = document.createElement("style");
  style.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; }";
  document.head.appendChild(style);
  const visible = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true });
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex^="-"]), [contenteditable=true]';
  const tabbable = [...document.body.querySelectorAll(sel)].filter((el) => !el.disabled && visible(el) && el.getBoundingClientRect().width >= 1 && !(el.tabIndex < 0));
  const base = new Map();
  // What may show the focus: the control, three boxes above it, its neighbours, its labels.
  const near = (el) => {
    const set = [el, el.previousElementSibling, el.nextElementSibling, ...(el.labels || [])];
    for (let n = el.parentElement, i = 0; n && i < 3; n = n.parentElement, i++) set.push(n);
    return set.filter(Boolean);
  };
  for (const el of tabbable) for (const x of near(el)) if (!base.has(x)) base.set(x, sig(x));
  window.__rules = { sig, base, near, tabbable: new Set(tabbable), seen: new Set(), bare: [] };
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  window.scrollTo(0, 0);
  return tabbable.length;
}
function focusStep() {
  const R = window.__rules;
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement || R.seen.has(el)) return { done: true };
  R.seen.add(el);
  if (!R.tabbable.has(el)) return { done: false };
  const shows = R.near(el).some((x) => R.base.has(x) && R.base.get(x) !== R.sig(x));
  if (!shows) {
    const path = (e) => {
      if (e.id && document.querySelectorAll(`[id="${e.id.replace(/"/g, '\\"')}"]`).length === 1) return `#${e.id}`;
      const parts = [];
      for (let n = e; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
        const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [n];
        parts.unshift(`${n.tagName.toLowerCase()}${same.length > 1 ? `:nth-of-type(${same.indexOf(n) + 1})` : ""}`);
      }
      return parts.join(">");
    };
    const t = (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ");
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join("") : "";
    return { done: false, bare: { path: path(el), desc: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}${t ? ` "${t.length > 30 ? `${t.slice(0, 29)}…` : t}"` : ""}` } };
  }
  return { done: false };
}

// ---- the run ----
const FIX = {
  sideways: "Let it wrap or shrink to the screen's width, or put a wide table or strip in its own scrolling box. If it bleeds off the edge on purpose, mark it data-crop.",
  target: "Make it at least 24×24 px (44×44 on touch in an app), or leave 24px of clear space around it.",
  label: "Put a visible label beside the field. A placeholder, aria-label or title is not one.",
  focus: "Give it a visible :focus-visible style with 3:1 contrast against what is around it (an outline or ring). Never outline: none alone.",
  placeholder: "Write the real copy, in the product's voice.",
  clipped: "Let the box grow or the text wrap, so no word is cut. If the cut is the look, mark that element data-crop.",
  size: "Scale the step up, keeping the reference's proportions between sizes. If the board shows it this small and the person kept it, mark it data-board-size.",
  proportion: "Let the ground dominate, the primary support and the accent stay small (about 60/30/10). If the board clearly does otherwise, keep it and say so in a note.",
};
const RULE_OF = { focus: "10 Accessibility" };
const found = new Map();
const notChecked = [];
const proportions = [];
const checkedAt = new Map();
const evaluate = async (expression, call) => {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description?.split("\n")[0] || "the page threw");
  return r.result?.result?.value;
};
let fingerprint = "";
try {
  const { result: target } = await send("Target.createTarget", { url: "about:blank" });
  const { result: att } = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const call = (method, params, ms) => send(method, params, att.sessionId, ms);
  await call("Page.enable");
  await call("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
  if (cookieArg && /^https?:/.test(url)) {
    const cookies = cookieArg.split(";").map((p) => p.trim()).filter(Boolean).map((p) => ({ name: p.slice(0, p.indexOf("=")), value: p.slice(p.indexOf("=") + 1), url: new URL(url).origin }));
    if (cookies.some((c) => !c.name)) {
      console.error('cookie must be "name=value; name=value"');
      process.exit(2);
    }
    await call("Network.setCookies", { cookies });
  }
  const record1 = (item, w, check) => {
    const key = `${item.rule || RULE_OF[check] || ""}|${check}|${item.path}`;
    if (!found.has(key)) found.set(key, { rule: item.rule || RULE_OF[check], check, level: item.level || "hard", path: item.path, desc: item.desc, detail: item.detail || "", widths: [] });
    const f = found.get(key);
    if (!f.widths.includes(w)) f.widths.push(w);
  };
  for (const w of widths) {
    await call("Emulation.setDeviceMetricsOverride", { width: w, height: w < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: false });
    const nav = await call("Page.navigate", { url });
    if (nav.result?.errorText) throw new Error(`could not open ${url}: ${nav.result.errorText}`);
    for (let i = 0; i < 100 && (await evaluate("document.readyState", call).catch(() => "")) !== "complete"; i++) await sleep(200);
    await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true", call).catch(() => true);
    await sleep(wait);
    const landed = await evaluate("location.href", call);
    const where = (href) => {
      const u = new URL(href);
      return `${u.origin}${u.pathname.replace(/\/$/, "")}`;
    };
    if (where(landed) !== where(url)) throw new Error(`the page landed on ${landed}, not ${url}.${/^https?:/.test(landed) ? " Behind a login? Pass --cookie." : ""}`);
    if (!fingerprint) fingerprint = createHash("sha1").update(await evaluate(`(${pageFingerprint})()`, call)).digest("hex");
    const out = await evaluate(`(${staticChecks})(${JSON.stringify({ app, width: w })})`, call);
    for (const f of out.found) record1(f, w, f.check);
    for (const n of out.notChecked) notChecked.push({ check: n.check, width: w, why: n.why });
    // Focus, with real Tab presses so that :focus-visible applies.
    try {
      const n = await evaluate(`(${focusBaseline})()`, call);
      for (let i = 0; i < Math.min(n + 2, 70); i++) {
        for (const type of ["rawKeyDown", "keyUp"]) await call("Input.dispatchKeyEvent", { type, key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        const step = await evaluate(`(${focusStep})()`, call);
        if (step.bare) record1({ path: step.bare.path, desc: step.bare.desc, detail: "takes focus and shows no change" }, w, "focus");
        if (step.done) break;
      }
    } catch (e) {
      notChecked.push({ check: "10 focus", width: w, why: String(e.message).slice(0, 80) });
    }
    // Colour proportion, last: it hides the text. The first screen only, as a person meets it.
    try {
      await evaluate(`(() => {
  window.scrollTo(0, 0);
  if (document.activeElement) document.activeElement.blur();
  const s = document.createElement("style");
  s.textContent = "* { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; caret-color: transparent !important; outline: none !important; }";
  document.head.appendChild(s);
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
})()`, call);
      const shot = await call("Page.captureScreenshot", { format: "png" });
      const p = await evaluate(`(${colourProportion})(${JSON.stringify({ png: shot.result.data, accent: accentArg })})`, call);
      proportions.push({ width: w, ...p });
      const pct = (x) => `${Math.round(x * 100)}%`;
      if (p.ground && p.ground.share < 0.5) record1({ rule: "6 Colour", level: "soft", path: "ground", desc: "first screen", detail: `the ground (${p.ground.hex}) covers ${pct(p.ground.share)}; it should dominate (about 60%)` }, w, "proportion");
      if (p.accent && p.accent.share > 0.2) record1({ rule: "6 Colour", level: "soft", path: "accent", desc: "first screen", detail: `the accent (${p.accent.hex}${p.accent.named ? "" : ", read as the most saturated colour"}) covers ${pct(p.accent.share)}; it should stay small (about 10%)` }, w, "proportion");
    } catch (e) {
      notChecked.push({ check: "6 proportion", width: w, why: String(e.message).slice(0, 80) });
    }
    checkedAt.set(w, true);
  }
  ws.close();
} catch (e) {
  couldNot(e.message);
}
clearTimeout(watchdog);
finished = true;

// ---- the verdict ----
const id = (f) => createHash("sha1").update(`${f.rule}|${f.check}|${f.path}`).digest("hex").slice(0, 6);
const rows = [...found.values()].map((f) => ({ ...f, id: id(f), where: `${f.desc}: ${f.detail} (at ${f.widths.sort((a, b) => b - a).join(", ")})` }));
const waived = rows.filter((f) => waivers.some((w) => w.screen === screen && w.id === f.id));
// Hard findings block. Warnings (the board's own small text) and soft ones are reported only.
const open = rows.filter((f) => !waived.includes(f) && f.level === "hard");
const reported = rows.filter((f) => !waived.includes(f) && f.level !== "hard");

// A run on a changed page is a round; the same page again is the same round. Each url of a screen
// (a state: ?menu=open) keeps its own fingerprint, so the first look at another state is part of
// the round it is in, not a new one: only a change since that url's last run counts.
const key = url ? url.split("#")[0] : "";
const fps = record.fps || (record.fp ? { [key]: record.fp } : {});
const used = record.round || 0;
const seen = Object.hasOwn(fps, key);
const changed = seen && fps[key] !== fingerprint;
const round = !used ? 1 : changed && used < limit ? used + 1 : used;
const beyond = changed && used >= limit;
const closed = changed ? null : record.closed || null;
rounds[screen] = { round, fps: { ...fps, [key]: fingerprint }, at: today(), failed: 0, found: rows.map((f) => ({ id: f.id, rule: f.rule, level: f.level, where: f.where })), ...(closed ? { closed } : {}) };
writeJson(roundsFile, rounds);

const widthNote = widths.join(" and ");
const checks = [["13 sideways", "13 sideways scroll (phone width)"], ["10 targets", `10 targets (${app ? "44 on phone, 24 otherwise" : "24"})`], ["10 labels", "10 visible labels"], ["10 focus", "10 focus shown (not its contrast)"], ["11 copy", "11 placeholder copy"], ["5 clipped", "5 clipped text (data-crop skipped)"], ["5 size", "5 text size (12 / 14 / 16)"], ["6 proportion", "6 colour proportion (soft)"]];
if (!widths.some((w) => w <= 480)) notChecked.push({ check: "13 sideways", width: widths.join(","), why: "no phone width (480 or less) in --widths" });
const done = checks.filter(([key]) => !notChecked.some((n) => n.check === key)).map(([, label]) => label);
if (json) {
  console.log(JSON.stringify({ screen, round, limit, roundsUsedUp: round >= limit && open.length > 0, closed, open, reported, waived, proportions, notChecked, checked: done }, null, 1));
} else {
  console.log(`rules: ${screen} at ${widthNote}, round ${round} of ${limit}${beyond ? " (this page changed after the last round: not counted)" : changed || !used ? "" : seen ? " (the page has not changed since the last run)" : " (another state of this screen: same round)"}`);
  if (closed) console.log(`closed by the person on ${closed.at}: "${closed.words}". Do not fix more. Report what is open.`);
  if (open.length) {
    console.log("| Rule | Hard/soft | Where | Fix |\n|---|---|---|---|");
    // A long page can fail one check dozens of times. Ten rows of each are shown, the rest counted: --json has all.
    const shown = {};
    for (const f of open) {
      shown[f.check] = (shown[f.check] || 0) + 1;
      if (shown[f.check] <= 10) console.log(`| ${f.rule} | hard | ${f.where.replace(/\|/g, "/")} [${f.id}] | ${FIX[f.check]} |`);
    }
    for (const [check, n] of Object.entries(shown)) if (n > 10) console.log(`(${n - 10} more ${check} findings with the same fix, not listed: fix these, run again, or use --json for all)`);
  } else console.log(`passes: ${done.join("; ")}`);
  if (reported.length) {
    console.log("reported, not blocking:\n| Rule | Hard/soft | Where | Fix |\n|---|---|---|---|");
    for (const f of reported.slice(0, 20)) console.log(`| ${f.rule} | ${f.level} | ${f.where.replace(/\|/g, "/")} [${f.id}] | ${FIX[f.check]} |`);
    if (reported.length > 20) console.log(`(${reported.length - 20} more, not listed: --json has all)`);
  }
  for (const p of proportions) if (p.ground) console.log(`colour proportion at ${p.width}: ground ${p.ground.hex} ${Math.round(p.ground.share * 100)}%${p.shares.slice(1).map((k) => `, ${k.hex} ${Math.round(k.share * 100)}%`).join("")}${p.accent ? `; accent ${p.accent.hex} ${Math.round(p.accent.share * 100)}%` : ""}`);
  if (waived.length) {
    console.log(`waived (${waived.length}), listed so the person sees them:`);
    for (const f of waived) console.log(`- ${f.rule}: ${f.where} [${f.id}]: ${waivers.find((w) => w.screen === screen && w.id === f.id).reason}`);
  }
  for (const n of notChecked) console.log(`not checked: ${n.check} at ${n.width} (${n.why})`);
  if (open.length && !closed && round >= limit) console.log("rounds used up: stop fixing. Report the findings above as open.");
  else if (open.length && !closed) console.log(`${open.length} hard finding${open.length > 1 ? "s" : ""} open. Fix them (or waive one that is false: --waive <id> --reason "…"), then run again.`);
}
process.exit(open.length && !closed ? 1 : notChecked.length ? 3 : 0);
