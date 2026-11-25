#!/usr/bin/env node
// A blind comparison of finished runs, every key screen side by side, for the owner to judge.
//
//   node eval/design/compare.mjs --out ../lb-compare ../lb-refs ../lb-full ../lb-quick
//   … --query lb-full:basket=bake=country   a run's screen in a given state, where its default is empty
//
// Each run is a design flow run (its .longbeard/design/prototype/<screen>.html) or a baseline
// built with run.mjs --refs (its screens/<screen>.html). The key screens are the brief's. Every
// run gets a letter at random, the same letter on every screen, so a set can be judged as one
// product too. Writes, in --out: shots/<letter>-<screen>.jpg (the first 1440 by 900, and the
// full page as <letter>-<screen>-full.jpg), index.html (one row per screen, then one row per
// letter), key.json (which letter is which run: do not open before judging) and picks.md.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const capture = join(repo, "skills/design-direction/scripts/capture.mjs");
const args = process.argv.slice(2);
const at = args.indexOf("--out");
const out = at === -1 ? "" : resolve(args.splice(at, 2)[1] ?? "");
// --query <run folder name>:<screen>=<query>: open that run's screen in a given state (a full basket, say),
// where its default is empty. Repeat it.
const queries = new Map();
for (let i = args.indexOf("--query"); i !== -1; i = args.indexOf("--query")) {
  const m = (args.splice(i, 2)[1] ?? "").match(/^([^:]+):(\w+)=(.*)$/);
  if (m) queries.set(`${m[1]}:${m[2]}`, m[3]);
}
const runs = args.map((a) => resolve(a));
if (!out || runs.length < 2 || runs.some((r) => !existsSync(r))) {
  console.error("usage: node eval/design/compare.mjs --out <folder> <run> <run> [<run> …]");
  process.exit(2);
}

// The key screens, from the first run's brief.
const briefOf = (r) => [join(r, "docs/brief.md")].find(existsSync);
const brief = readFileSync(briefOf(runs[0]) ?? join(here, "fixture/docs/brief.md"), "utf8");
const keys = (brief.match(/## Key screens\n([\s\S]*?)\n## /)?.[1] ?? "").match(/^- (\w+):/gm)?.map((l) => l.slice(2, -1)) ?? [];
if (!keys.length) {
  console.error("compare: no key screens in the brief");
  process.exit(1);
}

// A run's page for a screen: the exact name first, else a file whose name starts with it.
function page(run, key) {
  for (const d of [join(run, ".longbeard/design/prototype"), join(run, "screens")]) {
    if (!existsSync(d)) continue;
    const files = readdirSync(d).filter((f) => f.endsWith(".html"));
    const hit = files.find((f) => f === `${key}.html`) ?? files.find((f) => f.startsWith(key));
    if (hit) return join(d, hit);
  }
  return "";
}

const letters = "ABCDEFGH".split("").slice(0, runs.length);
const order = [...runs].sort(() => Math.random() - 0.5);
const key = order.map((run, i) => ({ letter: letters[i], run, name: basename(run) }));
mkdirSync(join(out, "shots"), { recursive: true });
const shots = {};
for (const { letter, run } of key) {
  for (const k of keys) {
    const p = page(run, k);
    if (!p) {
      console.error(`compare: ${basename(run)} has no ${k} screen`);
      continue;
    }
    const q = queries.get(`${basename(run)}:${k}`);
    const url = pathToFileURL(p).href + (q ? `?${q}` : "");
    const fold = join(out, "shots", `${letter}-${k}.jpg`);
    const full = join(out, "shots", `${letter}-${k}-full.jpg`);
    const a = spawnSync(process.execPath, [capture, url, "--out", fold, "--clip", "0,0,1440,900"], { encoding: "utf8" });
    const b = spawnSync(process.execPath, [capture, url, "--out", full], { encoding: "utf8" });
    if (a.status || b.status) console.error(`compare: capture of ${letter} ${k} failed: ${(a.stderr || b.stderr).trim()}`);
    else shots[`${letter}-${k}`] = true;
  }
}

const tile = (l, k) => shots[`${l}-${k}`]
  ? `<figure><a href="shots/${l}-${k}-full.jpg"><img src="shots/${l}-${k}.jpg" alt="${l}, ${k}" loading="lazy"></a><figcaption>${l}</figcaption></figure>`
  : `<figure class="none"><div>no ${k}</div><figcaption>${l}</figcaption></figure>`;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blind comparison</title>
<style>
:root{--bg:#f6f4ef;--ink:#1c1b19;--soft:#6b675f;--line:#dcd7cc}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#171614;--ink:#eeeae2;--soft:#a39e94;--line:#34312c}}
:root[data-theme=dark]{--bg:#171614;--ink:#eeeae2;--soft:#a39e94;--line:#34312c}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
main{max-width:1600px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:40px 0 12px;text-transform:capitalize}
p{color:var(--soft);margin:0 0 8px;max-width:70ch}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:16px}
figure{margin:0}img{width:100%;display:block;border:1px solid var(--line);border-radius:4px}
figcaption{font-weight:600;margin-top:6px}
.none div{aspect-ratio:1440/900;border:1px dashed var(--line);display:grid;place-items:center;color:var(--soft)}
.set{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
</style></head><body><main>
<h1>Blind comparison</h1>
<p>Each letter is one run: the same letter on every screen. Judge each screen as a visitor would meet it, then each letter's set as one product. Click a screen for the full page. Note your picks in picks.md or in a reply: for each screen the best letter, and for each set good, OK or bad.</p>
${keys.map((k) => `<h2>${k}</h2><div class="row">${letters.map((l) => tile(l, k)).join("")}</div>`).join("\n")}
<h2>Each set as one product</h2>
${letters.map((l) => `<h2 style="text-transform:none">${l}</h2><div class="row set">${keys.map((k) => tile(l, k)).join("")}</div>`).join("\n")}
</main></body></html>
`;
writeFileSync(join(out, "index.html"), html);
writeFileSync(join(out, "key.json"), `${JSON.stringify(key, null, 1)}\n`);
writeFileSync(join(out, "picks.md"), `# Picks\n\nBest letter for each screen, then good, OK or bad for each set.\n\n${keys.map((k) => `- ${k}:`).join("\n")}\n\n${letters.map((l) => `- set ${l}:`).join("\n")}\n`);
console.log(`${Object.keys(shots).length} shots of ${keys.length} screens from ${runs.length} runs: ${join(out, "index.html")} (key.json says which letter is which)`);
