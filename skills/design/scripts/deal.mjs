#!/usr/bin/env node
// Deal first-screen recipes from a library, so the agent never chooses a
// combination by taste. A recipe is one entry from each list: arrangement,
// navigation, type, ground, accent. No dependencies.
//
//   node deal.mjs design-exploration/<slug>/library.json
//   node deal.mjs design-exploration/<slug>/library.json --count 8 --seed 7
//   node deal.mjs design-exploration/<slug>/library.json --vary 4,7,8
//   node deal.mjs design-exploration/<slug>/library.json --more 4:type
//   node deal.mjs design-exploration/<slug>/library.json --mix 7,ground=3
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
// - Navigation, type, ground and accent are used as evenly as the library allows,
//   and a type and ground already paired in this round are not paired again
//   while another ground can be had: two screens on the same pair look alike.
// - No recipe is dealt twice, in any round.
//
// --choose n records recipe n of the last round as the screen they settled on,
//   and deals nothing. On a --part round it records that screen's layout, so
//   the screens after it are dealt knowing it.
// --part <name> deals layouts for another key screen (a menu, a list, an
//   article) from the library's parts, each carrying the chosen look, so only
//   the layout differs: up to --count (4), each from a different reference,
//   ones not shown yet first. A layout from "first screen" (one that follows
//   from the chosen screen) is always dealt when the part has one. A layout's
//   optional "needs" lists the entries it only works with (the navigation it
//   grows from, a layout chosen for an earlier screen): it is dealt only when
//   every one is already chosen.
//   node deal.mjs design-exploration/<slug>/library.json --choose 3
//   node deal.mjs design-exploration/<slug>/library.json --part navigation
//
// --vary, --more and --mix take recipe numbers from the last round, whatever
// its kind, so a variation can be varied again.
// --vary: each pick gets a row: the pick, then one variation per list,
//   changing only that list's entry.
// --more n:list: the pick, then every entry of that list it can take and has
//   not had in any round.
// --mix n,list=m: recipe n with one list's entry from recipe m (or an entry
//   id), as many lists as asked. A mix that breaks the three sources is still
//   dealt, with a warning: it is their call.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
// A flag given with nothing after it is a mistake, not a request for a fresh round.
const empty = [];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return "";
  const value = args.splice(i, 2)[1];
  if (value === undefined || value === "" || value.startsWith("--")) empty.push(name);
  return value && !value.startsWith("--") ? value : "";
};
const countArg = flag("count");
const seedArg = flag("seed");
const varyArg = flag("vary");
const moreArg = flag("more");
const mixArg = flag("mix");
const chooseArg = flag("choose");
const partArg = flag("part");
const colsArg = flag("cols");
const outArg = flag("out");
const libArg = args[0];
const usage = "usage: node deal.mjs design-exploration/<slug>/library.json [--count 8] [--seed N] [--cols 2] [--vary 4,7,8 | --more 4:type | --mix 7,ground=3 | --mix chosen,accent=theirs-red | --choose 3 | --part navigation] [--out deal.json]";
if (!libArg || args.length !== 1 || [varyArg, moreArg, mixArg, chooseArg, partArg].filter(Boolean).length > 1) {
  console.error(usage);
  process.exit(2);
}
const fail = (text) => {
  console.error(`deal: ${text}`);
  process.exit(1);
};
if (empty.length) {
  console.error(`deal: --${empty.join(", --")} needs a value\n${usage}`);
  process.exit(2);
}
if (seedArg && !/^\d+$/.test(seedArg)) {
  console.error(`deal: --seed takes a whole number, not ${seedArg}`);
  process.exit(2);
}
// The sheet's columns, so the anchor's two screens are kept apart on the grid, not only in the list.
const cols = colsArg ? Number(colsArg) : 2;
if (!Number.isInteger(cols) || cols < 1 || cols > 8) fail("--cols is the sheet's columns, 1 to 8");
const libPath = resolve(libArg);
if (!existsSync(libPath)) fail(`no library at ${libArg}`);
const lib = JSON.parse(readFileSync(libPath, "utf8"));
// A library prefilled by library.mjs is not finished while a WRITE: is left in it.
const unwritten = JSON.stringify(lib).match(/"WRITE:[^"]*"/g);
if (unwritten) fail(`the library still has ${unwritten.length} fields to write (${unwritten[0]}): node library.mjs ${libPath} --check lists them`);
const outPath = outArg ? resolve(outArg) : join(dirname(libPath), "deal.json");

const lists = ["arrangements", "navigation", "type", "grounds", "accents"];
const field = { arrangements: "arrangement", navigation: "navigation", type: "type", grounds: "ground", accents: "accent" };
for (const [part, entries] of Object.entries(lib.parts || {})) {
  if (!Array.isArray(entries)) fail(`parts.${part} must be a list of layouts`);
  for (const entry of entries) {
    if (!entry.id || !Array.isArray(entry.from) || !entry.from.length) fail(`every layout in parts.${part} needs an id and a from list of references`);
    if (entry.needs !== undefined && !Array.isArray(entry.needs)) fail(`parts.${part}.${entry.id}: needs is a list of entry ids`);
  }
}
for (const list of lists) {
  if (!Array.isArray(lib[list]) || !lib[list].length) fail(`the library has no ${list}`);
  const ids = new Set();
  for (const entry of lib[list]) {
    if (!entry.id || !Array.isArray(entry.from) || !entry.from.length) fail(`every entry in ${list} needs an id and a from list of references`);
    if (ids.has(entry.id)) fail(`${list} has two entries called ${entry.id}`);
    ids.add(entry.id);
  }
}
if (!lib.family) console.error("deal: the library has no family, so nothing holds the screens together: read it again from design-direction's library step");
const count = countArg ? Number(countArg) : partArg ? 4 : 8;
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
// #abc is #aabbcc: a short hex is checked like a long one.
const hex6 = (value) => (typeof value === "string" && /^#[0-9a-f]{3}$/i.test(value) ? `#${[...value.slice(1)].map((c) => c + c).join("")}` : value);
const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
// The surface an accent sits on: the panel when the design has one, else the ground. 1.4 lets a
// tint on a ground through (a highlighter on pink is 1.6) and stops a near-white on white (1.2).
const standsOff = (accent, ground) => {
  const colour = hex6(accent.colour), surface = hex6(ground.panel || ground.ground);
  return !isHex(colour) || !isHex(surface) || contrast(colour, surface) >= 1.4;
};

const saved = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : { rounds: [] };
const rounds = saved.rounds || [];
const key = (r) => lists.map((list) => r[field[list]]).join("|");
const dealt = new Set(rounds.flatMap((round) => round.recipes.map(key)));
const entry = (list, id) => lib[list].find((x) => x.id === id) || fail(`${list} has no entry called ${id}`);
// "theirs" is not a reference: a face and a ground they own are two of their choices, not one source.
const refs = (item) => item.from.filter((ref) => ref !== "theirs");
const overlaps = (item, taken) => refs(item).some((ref) => taken.has(ref));

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
  const sources = new Set(refs(arrangement));
  // Type and ground are chosen together: the least used type that still has a ground from another
  // reference, not yet paired with it in this round; failing that, any type with any such ground.
  const types = shuffle(lib.type).filter((x) => !overlaps(x, sources));
  types.sort((x, y) => (used.type[x.id] || 0) - (used.type[y.id] || 0));
  let type = null;
  let ground = null;
  for (const fresh of [true, false]) {
    for (const t of types) {
      const withType = new Set([...sources, ...refs(t)]);
      const g = pick("grounds", used, (x) => !overlaps(x, withType) && (!fresh || !pairs.has(`${t.id}|${x.id}`)));
      if (g) {
        type = t;
        ground = g;
        break;
      }
    }
    if (type) break;
  }
  if (!type) return null;
  if (!ground) return null;
  const navigation = pick("navigation", used, (x) => !overlaps(x, sources)) || pick("navigation", used, () => true);
  // Never an accent that does not stand off: one without a colour carries nothing, so it always fits.
  const accent = pick("accents", used, (x) => !overlaps(x, sources) && standsOff(x, ground)) || pick("accents", used, (x) => standsOff(x, ground));
  if (!accent) {
    noAccent.add(ground.id);
    return null;
  }
  const recipe = { arrangement: arrangement.id, navigation: navigation.id, type: type.id, ground: ground.id, accent: accent.id };
  if (dealt.has(key(recipe))) return null;
  note("navigation", navigation, used);
  note("type", type, used);
  note("grounds", ground, used);
  note("accents", accent, used);
  pairs.add(`${type.id}|${ground.id}`);
  dealt.add(key(recipe));
  return recipe;
}

const recipes = [];
const used = { navigation: {}, type: {}, grounds: {}, accents: {} };
const noAccent = new Set();
const pairs = new Set();
const kind = varyArg ? "vary" : moreArg ? "more" : mixArg ? "mix" : partArg ? "part" : "deal";
const save = () => {
  writeFileSync(outPath, `${JSON.stringify({ rounds, chosen: saved.chosen || null }, null, 2)}\n`);
  writeFileSync(outPath.replace(/\.json$/, "") + ".js", `window.DEAL = ${JSON.stringify({ library: lib, rounds, chosen: saved.chosen || null })};\n`);
};
if (chooseArg) {
  const last = rounds.at(-1);
  if (!last) fail("nothing dealt yet: deal a round before --choose");
  const r = last.recipes.find((x) => x.n === Number(chooseArg)) || fail(`round ${last.round} has no recipe ${chooseArg}`);
  if (last.kind === "part") {
    if (!saved.chosen) fail("no first screen chosen: --choose it before a part's layout");
    saved.chosen.parts = { ...(saved.chosen.parts || {}), [last.part]: r.arrangement };
    save();
    console.log(`chosen for ${last.part}: ${r.arrangement} (round ${last.round}, ${r.n}). Screens so far: ${Object.entries(saved.chosen.parts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    process.exit(0);
  }
  for (const list of lists) entry(list, r[field[list]]);
  // A new first screen starts the other screens over: what was chosen for them was chosen next to another look.
  if (saved.chosen?.parts && Object.keys(saved.chosen.parts).length) console.error(`deal: a new first screen; the layouts chosen for ${Object.keys(saved.chosen.parts).join(", ")} are cleared`);
  saved.chosen = { arrangement: r.arrangement, navigation: r.navigation, type: r.type, ground: r.ground, accent: r.accent, round: last.round, n: r.n, parts: {} };
  save();
  console.log(`chosen: ${lists.map((list) => r[field[list]]).join(" · ")} (round ${last.round}, ${r.n})`);
  process.exit(0);
}
const strip = ({ arrangement, navigation, type, ground, accent }) => ({ arrangement, navigation, type, ground, accent });
// Arrangement, type and ground from three different references.
const threeSources = (r) => {
  const [a, t, g] = [refs(entry("arrangements", r.arrangement)), refs(entry("type", r.type)), refs(entry("grounds", r.ground))];
  return !a.some((ref) => t.includes(ref)) && !a.some((ref) => g.includes(ref)) && !t.some((ref) => g.includes(ref));
};
const legible = (r) => standsOff(entry("accents", r.accent), entry("grounds", r.ground));
// A list named the way a person would say it: type, ground, grounds, accent, nav.
const listOf = (word) => lists.find((list) => list === word || field[list] === word || (word === "nav" && list === "navigation")) || fail(`no list called ${word}: use ${Object.values(field).join(", ")}`);

if (kind === "part") {
  const layouts = (lib.parts || {})[partArg];
  if (!layouts || !layouts.length) fail(`the library has no layouts for ${partArg}: read them from direction.md's Other parts, or run design-direction's one piece for it`);
  if (!saved.chosen) fail("no screen chosen yet: --choose the one they settled on first");
  const shown = new Map();
  for (const round of rounds) for (const r of round.recipes) if (r.part === partArg) shown.set(r.arrangement, (shown.get(r.arrangement) || 0) + 1);
  // Only layouts that fit what is already chosen: the first screen's entries and the earlier screens' layouts.
  const have = new Set([...lists.map((list) => saved.chosen[field[list]]), ...Object.values(saved.chosen.parts || {})]);
  const fits = layouts.filter((x) => (x.needs || []).every((id) => have.has(id)));
  const left = layouts.length - fits.length;
  if (left) console.error(`deal: ${left} layout${left === 1 ? "" : "s"} for ${partArg} left out: ${left === 1 ? "it needs" : "they need"} what was not chosen (${[...new Set(layouts.filter((x) => !fits.includes(x)).flatMap((x) => x.needs.filter((id) => !have.has(id))))].join(", ")})`);
  const follows = fits.filter((x) => x.from.includes("first screen"));
  const others = shuffle(fits.filter((x) => !x.from.includes("first screen"))).sort((a, b) => (shown.get(a.id) || 0) - (shown.get(b.id) || 0));
  const taken = new Set();
  const picked = [];
  // Each layout from a different reference, so no one reference lays out the whole part.
  for (const x of [...follows, ...others]) {
    if (picked.length === count) break;
    if (x.from.some((ref) => taken.has(ref))) continue;
    picked.push(x);
    x.from.forEach((ref) => taken.add(ref));
  }
  // Each layout carries the chosen look and the screens chosen so far, so the page builds it among them.
  const { round: _round, n: _n, parts: chosenParts = {}, arrangement: firstScreen, ...look } = saved.chosen;
  for (const x of picked) recipes.push({ ...look, first: firstScreen, parts: chosenParts, part: partArg, arrangement: x.id });
  if (recipes.length < 2) console.error(`deal: only ${recipes.length} layout for ${partArg}: the references show little of this part, so offer a search for more (design-direction, one piece)`);
} else if (kind !== "deal") {
  const last = rounds.at(-1);
  if (!last) fail(`nothing dealt yet: deal a round before --${kind}`);
  const base = (n) => last.recipes.find((r) => r.n === n) || fail(`round ${last.round} has no recipe ${n}`);
  if (kind === "vary") {
    for (const list of ["navigation", "type", "grounds", "accents"]) for (const r of last.recipes) used[list][r[field[list]]] = 1;
    for (const n of varyArg.split(",").map((x) => Number(x.trim()))) {
      const pickRecipe = strip(base(n));
      recipes.push({ ...pickRecipe, of: n, change: "the pick" });
      for (const list of ["navigation", "type", "grounds", "accents"]) {
        const name = field[list];
        const fits = (x) => {
          const r = { ...pickRecipe, [name]: x.id };
          return x.id !== pickRecipe[name] && threeSources(r) && legible(r) && !dealt.has(key(r));
        };
        const other = pick(list, used, fits);
        if (!other) continue;
        note(list, other, used);
        const varied = { ...pickRecipe, [name]: other.id, of: n, change: name };
        dealt.add(key(varied));
        recipes.push(varied);
      }
    }
  } else if (kind === "more") {
    const [nText, word] = moreArg.split(":");
    const n = Number(nText);
    const list = listOf((word || "").trim());
    const name = field[list];
    const pickRecipe = strip(base(n));
    recipes.push({ ...pickRecipe, of: n, change: "the pick" });
    const had = new Set(rounds.flatMap((round) => round.recipes).filter((r) => lists.every((l) => l === list || r[field[l]] === pickRecipe[field[l]])).map((r) => r[name]));
    for (const x of shuffle(lib[list])) {
      if (recipes.length === count) {
        console.error(`deal: ${count} screens is a round; ask for more again to see the rest of the ${name}s`);
        break;
      }
      const r = { ...pickRecipe, [name]: x.id };
      if (had.has(x.id) || !threeSources(r) || !legible(r)) continue;
      dealt.add(key(r));
      recipes.push({ ...r, of: n, change: name });
    }
    if (recipes.length === 1) console.error(`deal: recipe ${n} has had every ${name} it can take`);
  } else {
    const [nText, ...swaps] = mixArg.split(",");
    // "chosen" is the screen they settled on (--choose), whatever round is last.
    if (nText === "chosen" && !saved.chosen) fail("nothing chosen yet: --choose the screen first");
    const n = nText === "chosen" ? "chosen" : Number(nText);
    const mixed = nText === "chosen" ? strip(saved.chosen) : strip(base(n));
    const from = [];
    for (const swap of swaps) {
      const [word, value] = swap.split("=").map((x) => (x || "").trim());
      const list = listOf(word);
      const name = field[list];
      mixed[name] = /^\d+$/.test(value) ? base(Number(value))[name] : entry(list, value).id;
      from.push(`${name} from ${value}`);
    }
    if (!swaps.length) fail("say what to mix in: --mix 7,ground=3");
    if (!threeSources(mixed)) console.error(`deal: this mix takes its arrangement, type and ground from fewer than three references: it now takes most of its look from one`);
    if (!legible(mixed)) console.error(`deal: in this mix the accent does not stand off its surface`);
    dealt.add(key(mixed));
    recipes.push({ ...mixed, of: n, change: from.join(", ") });
  }
} else {
  const before = {};
  for (const round of rounds) for (const r of round.recipes) before[r.arrangement] = (before[r.arrangement] || 0) + 1;
  const anchor = lib.anchor ? lib.arrangements.find((a) => a.from.includes(lib.anchor)) : null;
  if (lib.anchor && !anchor) fail(`no arrangement comes from the anchor, ${lib.anchor}`);
  const others = shuffle(lib.arrangements.filter((a) => a !== anchor)).sort((a, b) => (before[a.id] || 0) - (before[b.id] || 0));
  // The anchor twice in the first round; once a round after that, since every round so far showed it.
  const firstRound = !rounds.some((round) => round.kind === "deal");
  if (!firstRound && others.every((a) => before[a.id])) console.error("deal: every arrangement has been shown: this round deals them again with other type, ground and accent. New arrangements need the next family, or more references");
  const order = anchor && count >= 4 && firstRound ? [anchor, anchor, ...others] : anchor ? [anchor, ...others] : others;
  for (const arrangement of order) {
    if (recipes.length === count) break;
    const recipe = recipeFor(arrangement, used);
    if (recipe) recipes.push(recipe);
    else console.error(`deal: no fresh recipe for the arrangement ${arrangement.id}: its type and ground must come from two other references`);
  }
  if (noAccent.size) console.error(`deal: no accent stands off ${[...noAccent].join(", ")}: add one that does, or an accent with colour null`);
  if (recipes.length < 2) fail("the library is too thin to deal from: an arrangement, a type and a ground from three different references are needed");
  // The anchor is promised: a round without it is a failure, with the reason, not a quiet gap.
  if (anchor && !recipes.some((r) => r.arrangement === anchor.id)) {
    if (firstRound) fail(`the anchor's arrangement (${anchor.id}) cannot be dealt: every type or ground it could take comes from ${lib.anchor} too. Add a type and a ground from other references, or mark another anchor`);
    console.error(`deal: the anchor's arrangement (${anchor.id}) has been dealt with every type and ground it can take, so this round goes without it`);
  }
  // The anchor's two screens never touch on the sheet: not beside each other, not one above the other.
  if (anchor) {
    const touching = (p, q) => (Math.floor(p / cols) === Math.floor(q / cols) && Math.abs(p - q) === 1) || Math.abs(p - q) === cols;
    let order2 = shuffle(recipes);
    for (let tries = 0; tries < 200; tries++) {
      const at = order2.map((r, i) => (r.arrangement === anchor.id ? i : -1)).filter((i) => i >= 0);
      if (at.length < 2 || !touching(at[0], at[1])) break;
      order2 = shuffle(recipes);
    }
    recipes.splice(0, recipes.length, ...order2);
  }
  // In a library with few types or grounds, a pair can come round again: say so, never quietly.
  const pairCount = {};
  for (const r of recipes) pairCount[`${r.type} on ${r.ground}`] = (pairCount[`${r.type} on ${r.ground}`] || 0) + 1;
  const repeated = Object.entries(pairCount).filter(([, n]) => n > 1);
  if (repeated.length) console.error(`deal: the library has few types or grounds, so ${repeated.map(([pair, n]) => `${pair} comes ${n} times`).join(", ")}`);
  if (recipes.length < count) console.error(`deal: ${recipes.length} recipes, not ${count}: the library has no more arrangements to give`);
}

recipes.forEach((r, i) => (r.n = i + 1));
const round = { round: rounds.length + 1, kind, seed, ...(partArg ? { part: partArg } : {}), recipes };
rounds.push(round);
save();

const pad = (text, n) => String(text).padEnd(n);
console.log(`round ${round.round} · ${round.kind} · seed ${seed}`);
for (const r of recipes) {
  const lead = kind === "part" ? `${pad(r.n, 3)}${pad(r.part, 14)}` : kind !== "deal" ? `${pad(r.n, 3)}of ${pad(r.of, 3)}${pad(r.change, 12)} ` : pad(r.n, 3);
  console.log(`${lead}${pad(r.arrangement, 14)}${pad(r.navigation, 14)}${pad(r.type, 14)}${pad(r.ground, 14)}${r.accent}`);
}
