import { library } from "./lib.mjs";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
const DEAL = fileURLToPath(new URL("../../../../../skills/design/scripts/deal.mjs", import.meta.url));
const proj = (lib) => { const d = mkdtempSync(join(tmpdir(), "pr-40-deal-")); writeFileSync(`${d}/library.json`, JSON.stringify(lib)); return d; };
const run = (d, ...a) => spawnSync(process.execPath, [DEAL, "library.json", ...a], { cwd: d, encoding: "utf8" });
const rounds = (d) => existsSync(`${d}/deal.json`) ? JSON.parse(readFileSync(`${d}/deal.json`, "utf8")).rounds : [];
// A. Their own face and ground (step 1 of design: fixed, replaces the list, from ["theirs"])
{ const L = library(); L.type = [{ id: "their-face", from: ["theirs"] }]; L.grounds = [{ id: "their-ground", ground: "#ffffff", ink: "#000000", from: ["theirs"] }];
  const d = proj(L); const r = run(d, "--seed", "1"); console.log("A fixed face+ground:", r.status, r.stderr.trim().split("\n").slice(-1)[0]); }
// A2. own face added (not replacing) + own ground added: can they ever meet?
{ const L = library(); L.type.push({ id: "their-face", from: ["theirs"] }); L.grounds.push({ id: "their-ground", ground: "#fffaf0", ink: "#000", from: ["theirs"] });
  let met = 0; for (let s = 1; s <= 50; s++) { const d = proj(L); run(d, "--seed", String(s)); met += rounds(d)[0].recipes.filter(r => r.type === "their-face" && r.ground === "their-ground").length; } console.log("A2 their face with their ground in 50 deals:", met); }
// B. Step 5: pick a face and a ground, both "theirs", then mix
{ const L = library(); const d = proj(L); run(d, "--seed", "3"); run(d, "--mix", "1,ground=dark");
  L.type.push({ id: "picked-face", from: ["theirs"] }); L.grounds.push({ id: "picked-ground", ground: "#faf7f0", ink: "#111111", from: ["theirs"] }); writeFileSync(`${d}/library.json`, JSON.stringify(L));
  const r = run(d, "--mix", "1,type=picked-face,ground=picked-ground"); console.log("B step-5 mix warning:", r.stderr.trim()); }
// C. flag without a value
{ const d = proj(library()); run(d, "--seed", "1"); const r = run(d, "--vary"); console.log("C --vary with no value:", r.status, "kind of new round:", rounds(d).at(-1).kind); }
// D. "None" -> deal again: is the anchor dealt twice again?
{ const d = proj(library()); run(d, "--seed", "1"); run(d, "--seed", "2"); const r2 = rounds(d)[1].recipes.map(r => r.arrangement); console.log("D round 2 arrangements:", r2.join(" "), r2.filter(a => a === "arr-a").length, "anchor"); }
// E. 2-column sheet: anchor pair vertically adjacent (n and n+2) or same row
{ let vert = 0, row = 0, N = 200; for (let s = 1; s <= N; s++) { const d = proj(library()); run(d, "--seed", String(s)); const pos = rounds(d)[0].recipes.filter(r => r.arrangement === "arr-a").map(r => r.n - 1);
  if (pos.length === 2) { const [p, q] = pos; if (Math.abs(p - q) === 2) vert++; if (Math.floor(p / 2) === Math.floor(q / 2)) row++; } } console.log(`E 2-col sheet over ${N} seeds: stacked ${vert}, same row ${row}`); }
// F. Anchor's references own every type: anchor arrangement cannot be dealt
{ const L = library(); L.type = L.type.map(t => ({ ...t, from: [...t.from, "a"] })); const d = proj(L); const r = run(d, "--seed", "1"); const rs = rounds(d)[0]?.recipes || [];
  console.log("F anchor in every type:", r.status, "anchor screens:", rs.filter(x => x.arrangement === "arr-a").length, "| stderr:", r.stderr.trim().split("\n")[0]); }
// G. Tight library: pair repeats
{ const L = library(); L.type = [{ id: "t1", from: ["x"] }, { id: "t2", from: ["y"] }]; L.grounds = [{ id: "g1", ground: "#ffffff", ink: "#000000", from: ["z"] }, { id: "g2", ground: "#000000", ink: "#ffffff", from: ["w"] }];
  let worst = 0; for (let s = 1; s <= 30; s++) { const d = proj(L); run(d, "--seed", String(s)); const p = rounds(d)[0].recipes.map(r => r.type + r.ground); const c = {}; p.forEach(k => c[k] = (c[k] || 0) + 1); worst = Math.max(worst, ...Object.values(c)); }
  console.log("G tight library: most times one type+ground pair appears in a round of 8:", worst); }
// H. accent stand-off threshold: #f0f0f0 on white, 3-digit hex
{ const L = library(); L.accents = [{ id: "ghost", colour: "#ececec", from: ["q"] }, { id: "short", colour: "#fff", from: ["r"] }]; L.grounds = [{ id: "white", ground: "#ffffff", ink: "#000000", from: ["z"] }];
  L.type = [{ id: "t", from: ["y"] }]; const d = proj(L); run(d, "--seed", "1"); console.log("H accents dealt on white:", [...new Set(rounds(d)[0].recipes.map(r => r.accent))].join(",")); }
// I. --more with a big type list: no cap
{ const L = library(); for (let i = 0; i < 30; i++) L.type.push({ id: `extra${i}`, from: [`z${i}`] }); const d = proj(L); run(d, "--seed", "1"); run(d, "--more", "1:type"); console.log("I --more 1:type screens in one round:", rounds(d).at(-1).recipes.length); }
// J. two shots of one site as two references satisfy "three sources"
{ const L = library(); L.arrangements[1].from = ["site"]; L.type[0].from = ["site-menu"]; console.log("J: 'site' and 'site-menu' are different strings to the rule — no code links them (by reading)"); }
// K. Seed garbage
{ const d = proj(library()); run(d, "--seed", "abc"); console.log("K --seed abc gives seed", rounds(d)[0].seed); }
