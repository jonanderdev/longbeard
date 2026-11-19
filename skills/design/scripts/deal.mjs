#!/usr/bin/env node
// Deal first-screen recipes from a library, so the agent never chooses a
// combination by taste. A recipe is one entry from each list: arrangement,
// navigation, type, ground, accent. No dependencies.
//
//   node deal.mjs design-exploration/<slug>/library.json
//   node deal.mjs design-exploration/<slug>/library.json --count 8 --seed 7
//   node deal.mjs design-exploration/<slug>/library.json --vary 4,7,8
//
// It writes deal.json beside the library: every round dealt so far, newest
// last, each with its seed. It also writes deal.js, the same rounds with the
// library as window.DEAL, because a page opened as a file cannot fetch JSON.
//
// The rules, in order:
// - Three sources. A recipe's arrangement, type and ground come from three
//   different references, so no reference supplies a whole screen.
// - Navigation and accent come from another reference than the arrangement's
//   when the library has one.
// - The anchor's arrangement is dealt twice. No other arrangement repeats in
//   a round, and arrangements dealt in earlier rounds come last.
// - An accent that does not stand off the surface it sits on is passed over.
// - Navigation, type, ground and accent are used as evenly as the library allows.
// - No recipe is dealt twice, in any round.
//
// --vary takes recipe numbers from the last dealt round. Each gets a row: the
// pick, then one variation per list, changing only that list's entry.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
};
const countArg = flag("count");
const seedArg = flag("seed");
const varyArg = flag("vary");
const outArg = flag("out");
const libArg = args[0];
const usage = "usage: node deal.mjs design-exploration/<slug>/library.json [--count 8] [--seed N] [--vary 4,7,8] [--out deal.json]";
if (!libArg || args.length !== 1) {
  console.error(usage);
  process.exit(2);
}
const fail = (text) => {
  console.error(`deal: ${text}`);
  process.exit(1);
};
const libPath = resolve(libArg);
if (!existsSync(libPath)) fail(`no library at ${libArg}`);
const lib = JSON.parse(readFileSync(libPath, "utf8"));
const outPath = outArg ? resolve(outArg) : join(dirname(libPath), "deal.json");

const lists = ["arrangements", "navigation", "type", "grounds", "accents"];
const field = { arrangements: "arrangement", navigation: "navigation", type: "type", grounds: "ground", accents: "accent" };
for (const list of lists) {
  if (!Array.isArray(lib[list]) || !lib[list].length) fail(`the library has no ${list}`);
  const ids = new Set();
  for (const entry of lib[list]) {
    if (!entry.id || !Array.isArray(entry.from) || !entry.from.length) fail(`every entry in ${list} needs an id and a from list of references`);
    if (ids.has(entry.id)) fail(`${list} has two entries called ${entry.id}`);
    ids.add(entry.id);
  }
}
const count = countArg ? Number(countArg) : 8;
if (!Number.isInteger(count) || count < 2 || count > 16) fail("count must be a whole number from 2 to 16");
const seed = seedArg ? Number(seedArg) >>> 0 : (Date.now() ^ (process.pid << 8)) >>> 0;

let state = seed;
const random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffle = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// WCAG relative luminance, and the contrast ratio between two colours.
const luminance = (hex) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
// The surface an accent sits on: the panel when the design has one, else the ground.
const standsOff = (accent, ground) => {
  const surface = ground.panel || ground.ground;
  return !isHex(accent.colour) || !isHex(surface) || contrast(accent.colour, surface) >= 1.15;
};

const saved = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : { rounds: [] };
const rounds = saved.rounds || [];
const key = (r) => lists.map((list) => r[field[list]]).join("|");
const dealt = new Set(rounds.flatMap((round) => round.recipes.map(key)));
const entry = (list, id) => lib[list].find((x) => x.id === id) || fail(`${list} has no entry called ${id}`);
const overlaps = (item, taken) => item.from.some((ref) => taken.has(ref));

// The least used entry that passes, in a shuffled order so ties fall differently each time.
function pick(list, used, passes) {
  const pool = shuffle(lib[list]).filter(passes);
  pool.sort((a, b) => (used[list][a.id] || 0) - (used[list][b.id] || 0));
  return pool[0] || null;
}
const note = (list, item, used) => {
  used[list][item.id] = (used[list][item.id] || 0) + 1;
  return item;
};

function recipeFor(arrangement, used) {
  const sources = new Set(arrangement.from);
  const type = pick("type", used, (x) => !overlaps(x, sources));
  if (!type) return null;
  const withType = new Set([...sources, ...type.from]);
  const ground = pick("grounds", used, (x) => !overlaps(x, withType));
  if (!ground) return null;
  const navigation = pick("navigation", used, (x) => !overlaps(x, sources)) || pick("navigation", used, () => true);
  const accent = pick("accents", used, (x) => !overlaps(x, sources) && standsOff(x, ground)) || pick("accents", used, (x) => standsOff(x, ground)) || pick("accents", used, () => true);
  const recipe = { arrangement: arrangement.id, navigation: navigation.id, type: type.id, ground: ground.id, accent: accent.id };
  if (dealt.has(key(recipe))) return null;
  note("navigation", navigation, used);
  note("type", type, used);
  note("grounds", ground, used);
  note("accents", accent, used);
  dealt.add(key(recipe));
  return recipe;
}

const recipes = [];
const used = { navigation: {}, type: {}, grounds: {}, accents: {} };

if (varyArg) {
  const last = [...rounds].reverse().find((round) => round.kind === "deal");
  if (!last) fail("nothing dealt yet: deal a round before --vary");
  const picks = varyArg.split(",").map((x) => Number(x.trim()));
  for (const list of ["navigation", "type", "grounds", "accents"]) for (const r of last.recipes) used[list][r[field[list]]] = 1;
  for (const n of picks) {
    const base = last.recipes.find((r) => r.n === n);
    if (!base) fail(`round ${last.round} has no recipe ${n}`);
    const { arrangement, navigation, type, ground, accent } = base;
    const row = [{ arrangement, navigation, type, ground, accent, of: n, change: "the pick" }];
    const arr = entry("arrangements", arrangement);
    for (const list of ["navigation", "type", "grounds", "accents"]) {
      const name = field[list];
      const fixed = new Set(arr.from);
      // Type and ground still come from different references than the arrangement and than each other.
      if (list === "type") entry("grounds", ground).from.forEach((ref) => fixed.add(ref));
      if (list === "grounds") entry("type", type).from.forEach((ref) => fixed.add(ref));
      const groundNow = entry("grounds", ground);
      const fits = (x) => {
        if (x.id === base[name]) return false;
        if ((list === "type" || list === "grounds") && overlaps(x, fixed)) return false;
        if (list === "accents" && !standsOff(x, groundNow)) return false;
        if (list === "grounds" && !standsOff(entry("accents", accent), x)) return false;
        return !dealt.has(key({ ...base, [name]: x.id }));
      };
      const other = pick(list, used, fits);
      if (!other) continue;
      note(list, other, used);
      const varied = { arrangement, navigation, type, ground, accent, [name]: other.id, of: n, change: name };
      dealt.add(key(varied));
      row.push(varied);
    }
    recipes.push(...row);
  }
} else {
  const before = {};
  for (const round of rounds) for (const r of round.recipes) before[r.arrangement] = (before[r.arrangement] || 0) + 1;
  const anchor = lib.anchor ? lib.arrangements.find((a) => a.from.includes(lib.anchor)) : null;
  if (lib.anchor && !anchor) fail(`no arrangement comes from the anchor, ${lib.anchor}`);
  const others = shuffle(lib.arrangements.filter((a) => a !== anchor)).sort((a, b) => (before[a.id] || 0) - (before[b.id] || 0));
  const order = anchor && count >= 4 ? [anchor, anchor, ...others] : anchor ? [anchor, ...others] : others;
  for (const arrangement of order) {
    if (recipes.length === count) break;
    const recipe = recipeFor(arrangement, used);
    if (recipe) recipes.push(recipe);
    else console.error(`deal: no fresh recipe for the arrangement ${arrangement.id}: its type and ground must come from two other references`);
  }
  if (recipes.length < 2) fail("the library is too thin to deal from: an arrangement, a type and a ground from three different references are needed");
  // The anchor's two screens should not sit side by side.
  const order2 = anchor ? shuffle(recipes) : recipes;
  recipes.splice(0, recipes.length, ...order2);
  if (recipes.length < count) console.error(`deal: ${recipes.length} recipes, not ${count}: the library has no more arrangements to give`);
}

recipes.forEach((r, i) => (r.n = i + 1));
const round = { round: rounds.length + 1, kind: varyArg ? "vary" : "deal", seed, recipes };
rounds.push(round);
writeFileSync(outPath, `${JSON.stringify({ rounds }, null, 2)}\n`);
writeFileSync(outPath.replace(/\.json$/, "") + ".js", `window.DEAL = ${JSON.stringify({ library: lib, rounds })};\n`);

const pad = (text, n) => String(text).padEnd(n);
console.log(`round ${round.round} · ${round.kind} · seed ${seed}`);
for (const r of recipes) {
  const lead = varyArg ? `${pad(r.n, 3)}of ${pad(r.of, 3)}${pad(r.change, 12)}` : pad(r.n, 3);
  console.log(`${lead}${pad(r.arrangement, 14)}${pad(r.navigation, 14)}${pad(r.type, 14)}${pad(r.ground, 14)}${r.accent}`);
}
