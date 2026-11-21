#!/usr/bin/env node
// List Dribbble search/popular cards from a listing URL.
// Headless Chrome; prints TSV: id-slug\tlikes\tviews\tdesigner\timageURL\ttitle
// It reads the listing a browser renders, as a person's browser would. When the
// site answers with a verification page or a limit instead, it stops and says
// so. It never retries around that.
// Counts come from the card's own stat elements. A column it cannot read
// stays empty. It never guesses a count from the title. A title is one line:
// tabs and line breaks become spaces, so a title cannot split a row.
//
// Dribbble's "popular" order mixes likes with recency, so page order is not
// quality. Rows come out sorted by likes, most first, and a card under
// --min-likes (default 100) is dropped. A card whose likes cannot be read
// is kept, last.
//
// The default drop list holds only what is never a screen for any product:
// merch, CVs, worksheets, seasonal cards, stickers, mockups. A look (a poster,
// an illustration, a logo) or a kind of product (a dashboard, a chatbot, an
// editor) is a candidate for some brief, so it is never in the list. When the
// brief rules one out, pass it with --drop. What is dropped, and how many,
// goes to stderr, so the person can judge the pool.
//
//   node dribbble-cards.mjs "https://dribbble.com/search/shots/popular/product-design?q=text+editor+screen&timeframe=year" --scrolls 4
//   node dribbble-cards.mjs "<url>" --drop "poster,illustration" --keep "mockup"
//   node dribbble-cards.mjs "<url>" --min-likes 300 --scrolls 0
//   node dribbble-cards.mjs "<url>" --picker >> candidates.tsv   # rows for picker.mjs
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// What is never a screen, whatever the product. These sell the word, not the
// form. A word that names a look or a kind of product does not belong here.
export const OFF_TOPIC = [
  "t-shirt", "tshirt", "merch", "hoodie",
  "resume", "cv", "cover letter",
  "worksheet",
  "halloween", "christmas", "valentine",
  "sticker", "mockup",
];

export const words = (s) =>
  String(s || "")
    .toLowerCase()
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

// The words to drop: the default list less --keep, plus --drop.
export function dropList({ keep = "", drop = "" } = {}) {
  const kept = words(keep);
  return [...OFF_TOPIC.filter((w) => !kept.includes(w)), ...words(drop)];
}

// Whole words only, so "ai" does not swallow "detail" and "cv" does not
// swallow "cvs". A hyphen in a slug counts as a space.
export function offTopic(text, dropWords) {
  const hay = ` ${String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  return dropWords.find((word) => hay.includes(` ${word.replace(/[^a-z0-9]+/g, " ")} `)) || "";
}

// "15.7k" -> 15700. An unreadable count is NaN, never 0.
export function count(text) {
  const m = String(text || "").replace(/,/g, "").match(/^([\d.]+)([kKmM]?)$/);
  if (!m) return NaN;
  const n = Number(m[1]) * ({ k: 1e3, m: 1e6 }[m[2].toLowerCase()] || 1);
  return Number.isFinite(n) ? n : NaN;
}

// --scrolls 0 is a choice (the first screen only). Only a missing or unreadable value means 3.
export function scrollsOf(text) {
  const n = Number(text);
  return text === undefined || String(text).trim() === "" || !Number.isFinite(n) || n < 0 ? 3 : Math.floor(n);
}

// A field is one line of one column: a tab or a line break in a title would split the row.
export const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// A card is { idSlug, likes, views, designer, imageURL, title }.
export function cardRow(card) {
  return [card.idSlug, card.likes, card.views, card.designer, card.imageURL, card.title].map(oneLine).join("\t");
}

// picker.mjs's columns: title, thumbnail, shot page, source, meta.
export function pickerRow(card) {
  const meta = [oneLine(card.designer), card.likes && `${oneLine(card.likes)} likes`].filter(Boolean).join(" · ");
  return [
    oneLine(card.title),
    `${oneLine(card.imageURL)}?resize=400x300`,
    `https://dribbble.com/shots/${oneLine(card.idSlug)}`,
    "dribbble",
    meta,
  ].join("\t");
}

// The cards that stay, and each card cut with the word that cut it.
export function cutOffTopic(cards, dropWords) {
  const kept = [];
  const cut = [];
  for (const card of cards) {
    const word = offTopic(`${card.idSlug} ${card.title}`, dropWords);
    if (word) cut.push({ card, word });
    else kept.push(card);
  }
  return { kept, cut };
}

// Likes are the signal people valued a shot. Most first, and none under the
// floor. An unreadable count is kept, last, so a markup change shows as empty
// columns instead of an empty list.
export function rankByLikes(cards, minLikes) {
  const likes = (card) => count(card.likes);
  const strong = cards.filter((card) => !(likes(card) < minLikes));
  strong.sort((a, b) => (likes(b) || -1) - (likes(a) || -1));
  return { strong, weak: cards.length - strong.length };
}

// What a site shows instead of a listing: a check that you are a person, or a limit.
export const refused = (text) =>
  /verify (that )?you are (a )?human|are you (a )?human|captcha|just a moment|access denied|too many requests|rate limit|unusual traffic|temporarily blocked/i.test(
    String(text || ""),
  );

function findChrome() {
  const env = process.env.CHROME_PATH;
  // CHROME_PATH=none: run as if no browser were installed (a quick test run).
  if (env === "none") return null;
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

// The listing as the browser renders it: an array of cards, as JSON text.
const READ_CARDS = `(() => {
  const cards = [];
  const seen = new Set();
  const tidy = (t) => (t || "").replace(/\\s+/g, "");
  const isCount = (t) => /^[\\d][\\d.,]*[kKmM]?$/.test(t);
  const hints = (el) =>
    ["aria-label", "title", "class", "data-type", "data-test"]
      .map((name) => el.getAttribute(name) || "")
      .join(" ");
  // A counter labelled as likes or views: its own text, or the one
  // descendant that is nothing but a count.
  const labelled = (li, word) => {
    const re = new RegExp(word, "i");
    for (const el of li.querySelectorAll("*")) {
      if (!re.test(hints(el))) continue;
      const own = tidy(el.textContent);
      if (isCount(own)) return own;
      for (const kid of el.querySelectorAll("*")) {
        const t = tidy(kid.textContent);
        if (isCount(t)) return t;
      }
    }
    return "";
  };
  // Fallback: leaf elements whose whole text is a count, in DOM order.
  // Dribbble prints likes first, then views. Free text is never read.
  const leafCounts = (li) => {
    const out = [];
    for (const el of li.querySelectorAll("*")) {
      if (el.children.length) continue;
      const t = tidy(el.textContent);
      if (isCount(t)) out.push(t);
    }
    return out;
  };
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
    let likes = labelled(li, "like");
    let views = labelled(li, "view");
    if (!likes && !views) {
      const counts = leafCounts(li);
      likes = counts[0] || "";
      views = counts[1] || "";
    }
    // The profile handle, from the card's own designer link.
    const who = li.querySelector('.user-information a[href^="/"]');
    const designer = who ? (who.getAttribute("href") || "").replace(/^\\/|[?#].*$/g, "") : "";
    const title = img.getAttribute("alt") || a.getAttribute("title") || idSlug;
    cards.push({ idSlug, likes, views, designer, imageURL, title });
  }
  return JSON.stringify(cards);
})()`;

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, def) => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return def;
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
  };
  const has = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return false;
    args.splice(i, 1);
    return true;
  };
  const url = args[0];
  const scrolls = scrollsOf(flag("scrolls", undefined));
  const noFilter = has("no-filter");
  const forPicker = has("picker");
  const minLikes = Math.max(0, Number(flag("min-likes", "100")) || 0);
  const dropWords = dropList({ keep: flag("keep", ""), drop: flag("drop", "") });
  if (!url || !/^https?:\/\/(www\.)?dribbble\.com\//i.test(url)) {
    console.error(
      'usage: node dribbble-cards.mjs "https://dribbble.com/search/..." [--scrolls 4] [--min-likes 100] [--drop "a,b"] [--keep "a,b"] [--no-filter] [--picker]',
    );
    process.exit(2);
  }

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

  const { result } = await page("Runtime.evaluate", { expression: READ_CARDS, returnByValue: true });
  let all = [];
  try {
    all = JSON.parse(result?.value || "[]");
  } catch {}
  if (!all.length) {
    const { result: shown } = await page("Runtime.evaluate", {
      expression: `(document.title + " " + ((document.body && document.body.innerText) || "").slice(0, 600))`,
      returnByValue: true,
    });
    if (refused(shown?.value)) {
      console.error(
        "0 cards: the site answered with a verification page or a limit. Stopped, and not retried. Say so under Sources: and go on without Dribbble.",
      );
    } else {
      console.error(
        "0 cards (an empty listing, or a page this script cannot read). Do not retry around it: say so under Sources: as `<query>: 0 cards`.",
      );
    }
    drop();
    process.exit(1);
  }

  const { kept, cut } = noFilter ? { kept: all, cut: [] } : cutOffTopic(all, dropWords);
  if (cut.length) {
    const reasons = new Map();
    for (const { word } of cut) reasons.set(word, (reasons.get(word) ?? 0) + 1);
    const top = [...reasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, n]) => `${word} ${n}`)
      .join(", ");
    // The noise rate belongs under the board's drops. A high one means the
    // query is wrong, not that there is more scrolling to do.
    console.error(
      `${kept.length} of ${all.length} cards kept, ${Math.round((cut.length / all.length) * 100)}% dropped by word (${top}); --keep "<word>" brings one back`,
    );
  }
  if (!kept.length) {
    console.error("every card was dropped by word: query the form, not the word (add \"ui\", \"screen\", or a category path), or --keep a word");
    drop();
    process.exit(1);
  }
  const { strong, weak } = rankByLikes(kept, minLikes);
  if (weak > 0) {
    console.error(`${weak} of ${kept.length} under ${minLikes} likes, dropped (lower it with --min-likes)`);
  }
  if (!strong.length) {
    console.error("every card was under the likes floor: try a broader form or timeframe before lowering it");
    drop();
    process.exit(1);
  }
  console.log(strong.map(forPicker ? pickerRow : cardRow).join("\n"));
  drop();
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
