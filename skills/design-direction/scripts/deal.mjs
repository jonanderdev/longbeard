#!/usr/bin/env node
// Deal first-screen recipes from a library, so the agent never chooses a
// combination by taste. A recipe is one entry from each list: arrangement,
// navigation, type, ground, accent. No dependencies.
//
//   node deal.mjs .longbeard/design/direction/library.json
//   node deal.mjs .longbeard/design/direction/library.json --count 8 --seed 7
//   node deal.mjs .longbeard/design/direction/library.json --vary 4,7,8
//   node deal.mjs .longbeard/design/direction/library.json --more 4:type
//   node deal.mjs .longbeard/design/direction/library.json --mix 7,ground=3
//   node deal.mjs .longbeard/design/direction/library.json --identity docs/design/design-identity.md
//
// --identity reads the identity design-identity chose (the json block in
// design-identity.md) and deals type, grounds and accents from it instead of
// from the references: one type entry (its display and body faces), a ground
// for each colour that can be one, with the identity colour that reads best on
// it as ink (4.5:1 or it is left out, and said), and an accent for each accent
// colour, plus none. The references then lend only the composition:
// arrangements, zones and navigation. Identity entries are not references, so
// they never count against the three sources. The lists are written back into
// the library, so later --vary, --mix and --choose need no --identity; give it
// again only when the identity changes.
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
// --brief docs/design/design-brief.md (read by default when it is there) notes
// each screen that sits plainly against the design brief's personality, on what
// can be told from the recipe's colours and face: a cool ground for a warm brief
// and the reverse, a saturated ground for a quiet one, a neutral ground with no
// accent for a loud one, a script face for a serious one. A note, never a cut:
// the screen is dealt and shown, and they choose.
//
// --choose n records recipe n of the last round as the screen they settled on,
//   and deals nothing.
//   node deal.mjs .longbeard/design/direction/library.json --choose 3
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
// --mix n,zone.side=m: recipe n with one zone of its arrangement (a hero, a side
//   column, a footer band) taken from recipe m's arrangement, or an arrangement
//   id; zone.side=none leaves that zone out. People choose inside arrangements
//   ("the left side of 4", "the name on top of the picture"), so a zone is a
//   dealt move, not a hand edit. Zones are named in the library's arrangement
//   entries ("zones": { "hero": "…", "side": "…" }); the zone's references
//   count with the arrangement's for the three sources.
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
const colsArg = flag("cols");
const outArg = flag("out");
const identityArg = flag("identity");
const briefArg = flag("brief");
const libArg = args[0];
const usage = "usage: node deal.mjs <library.json> [--identity docs/design/design-identity.md] [--brief docs/design/design-brief.md] [--count 8] [--seed N] [--cols 2] [--vary 4,7,8 | --more 4:type | --mix 7,ground=3 | --mix 7,zone.side=4 | --mix chosen,accent=theirs-red | --choose 3] [--out deal.json]";
if (!libArg || args.length !== 1 || [varyArg, moreArg, mixArg, chooseArg].filter(Boolean).length > 1) {
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
if (identityArg) {
  // Written back into the library, so --vary, --mix and --choose read the same lists without --identity again.
  fromIdentity(identityArg);
  writeFileSync(libPath, `${JSON.stringify(lib, null, 2)}\n`);
}
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
if (!lib.family) console.error("deal: the library has no family, so nothing holds the screens together: write it in design-direction step 2");
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
const zoneKey = (r) => Object.entries(r.zones || {}).sort().map(([z, a]) => `${z}=${a}`).join(",");
const key = (r) => lists.map((list) => r[field[list]]).join("|") + (zoneKey(r) ? `|${zoneKey(r)}` : "");
const dealt = new Set(rounds.flatMap((round) => round.recipes.map(key)));
const entry = (list, id) => lib[list].find((x) => x.id === id) || fail(`${list} has no entry called ${id}`);
// "theirs", "identity" and "subject" (colours read from the product's own pictures) are not references:
// they never count as one source.
const refs = (item) => item.from.filter((ref) => ref !== "theirs" && ref !== "identity" && ref !== "subject");
const overlaps = (item, taken) => refs(item).some((ref) => taken.has(ref));

// The least used entry that passes, in a shuffled order so ties fall differently each time.
function pick(list, used, passes) {
  const pool = shuffle(lib[list]).filter(passes);
  pool.sort((a, b) => weight(list, a, used) - weight(list, b, used));
  return pool[0] || null;
}
// Spread: a round should look like several directions, not one. A ground is light, dark or mid; a
// face is a kind (serif, sans, condensed…). A tone or kind the round has seen less weighs more than
// using every entry evenly, so three light grounds and one dark one still give a round of both.
function toneOf(ground) {
  const hex = hex6(ground.panel || ground.ground);
  if (!isHex(hex)) return "mid";
  const l = luminance(hex);
  return l > 0.55 ? "light" : l < 0.08 ? "dark" : "mid";
}
const kinds = ["condensed", "mono", "script", "serif", "sans", "display"];
function kindOf(type) {
  if (type.kind) return String(type.kind).toLowerCase();
  const words = `${type.what || ""} ${type.face || ""}`.toLowerCase();
  return kinds.find((k) => words.includes(k)) || "other";
}
// The design brief's personality: "loud 2 · picture-led 4 · … · playful 1", each 1 to 5.
const briefPath = briefArg || (existsSync("docs/design/design-brief.md") ? "docs/design/design-brief.md" : "");
if (briefArg && !existsSync(briefArg)) fail(`no design brief at ${briefArg}`);
const asked = {};
if (briefPath) {
  const line = readFileSync(briefPath, "utf8").match(/^- personality:(.*)$/m)?.[1] || "";
  for (const [, word, n] of line.matchAll(/([a-z-]+)\s+([1-5])\b/gi)) asked[word.toLowerCase()] = Number(n);
}
const hueSat = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return [0, 0];
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / (1 - Math.abs(mx + mn - 1) || 1)];
};
// Only what the recipe plainly shows: a ground that is a colour (not near white or black), its
// hue and how saturated it is, whether there is an accent, and the kind of face.
function against(r) {
  if (!Object.keys(asked).length) return [];
  const ground = entry("grounds", r.ground), accent = entry("accents", r.accent), type = entry("type", r.type);
  const hex = hex6(ground.panel || ground.ground);
  const notes = [];
  if (isHex(hex)) {
    const [h, sat] = hueSat(hex), l = luminance(hex);
    const coloured = sat > 0.25 && l > 0.02 && l < 0.85;
    const warm = h < 75 || h >= 330, cool = h >= 150 && h < 270;
    if (asked.cool <= 2 && coloured && cool) notes.push(`a cool ground for a warm brief (cool ${asked.cool})`);
    if (asked.cool >= 4 && coloured && warm) notes.push(`a warm ground for a cool brief (cool ${asked.cool})`);
    if (asked.loud <= 2 && sat > 0.5 && l > 0.05 && l < 0.7) notes.push(`a saturated ground for a quiet brief (loud ${asked.loud})`);
    if (asked.loud >= 4 && sat < 0.12 && !accent.colour) notes.push(`a neutral ground and no accent for a loud brief (loud ${asked.loud})`);
  }
  if (asked.playful <= 2 && kindOf(type) === "script") notes.push(`a script face for a serious brief (playful ${asked.playful})`);
  return notes;
}
const facet = (list, item) => (list === "grounds" ? `tone:${toneOf(item)}` : list === "type" ? `kind:${kindOf(item)}` : "");
const spread = {};
const weight = (list, item, used) => (used[list][item.id] || 0) + 3 * (spread[facet(list, item)] || 0);
const note = (list, item, used) => {
  used[list][item.id] = (used[list][item.id] || 0) + 1;
  return item;
};

function recipeFor(arrangement, used) {
  const sources = new Set(refs(arrangement));
  // Type and ground are chosen together: the least used type that still has a ground from another
  // reference, not yet paired with it in this round; failing that, any type with any such ground.
  const types = shuffle(lib.type).filter((x) => !overlaps(x, sources));
  types.sort((x, y) => weight("type", x, used) - weight("type", y, used));
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
  for (const [list, item] of [["type", type], ["grounds", ground]]) spread[facet(list, item)] = (spread[facet(list, item)] || 0) + 1;
  note("accents", accent, used);
  pairs.add(`${type.id}|${ground.id}`);
  dealt.add(key(recipe));
  return recipe;
}

const recipes = [];
const used = { navigation: {}, type: {}, grounds: {}, accents: {} };
const noAccent = new Set();
const pairs = new Set();
const kind = varyArg ? "vary" : moreArg ? "more" : mixArg ? "mix" : "deal";
const save = () => {
  writeFileSync(outPath, `${JSON.stringify({ rounds, chosen: saved.chosen || null }, null, 2)}\n`);
  writeFileSync(outPath.replace(/\.json$/, "") + ".js", `window.DEAL = ${JSON.stringify({ library: lib, rounds, chosen: saved.chosen || null })};\n`);
};
if (chooseArg) {
  const last = rounds.at(-1);
  if (!last) fail("nothing dealt yet: deal a round before --choose");
  const r = last.recipes.find((x) => x.n === Number(chooseArg)) || fail(`round ${last.round} has no recipe ${chooseArg}`);
  for (const list of lists) entry(list, r[field[list]]);
  saved.chosen = { arrangement: r.arrangement, navigation: r.navigation, type: r.type, ground: r.ground, accent: r.accent, ...(r.zones ? { zones: r.zones } : {}), round: last.round, n: r.n };
  save();
  console.log(`chosen: ${lists.map((list) => r[field[list]]).join(" · ")} (round ${last.round}, ${r.n})`);
  process.exit(0);
}
const strip = ({ arrangement, navigation, type, ground, accent, zones }) => ({ arrangement, navigation, type, ground, accent, ...(zones && Object.keys(zones).length ? { zones: { ...zones } } : {}) });
// The references an arrangement's screen draws on: its own, and those of every zone taken from another.
const arrangementRefs = (r) => [...refs(entry("arrangements", r.arrangement)), ...Object.values(r.zones || {}).filter((id) => id !== "none").flatMap((id) => refs(entry("arrangements", id)))];
// Arrangement, type and ground from three different references.
const threeSources = (r) => {
  const [a, t, g] = [arrangementRefs(r), refs(entry("type", r.type)), refs(entry("grounds", r.ground))];
  return !a.some((ref) => t.includes(ref)) && !a.some((ref) => g.includes(ref)) && !t.some((ref) => g.includes(ref));
};
const legible = (r) => standsOff(entry("accents", r.accent), entry("grounds", r.ground));
// A list named the way a person would say it: type, ground, grounds, accent, nav.
const listOf = (word) => lists.find((list) => list === word || field[list] === word || (word === "nav" && list === "navigation")) || fail(`no list called ${word}: use ${Object.values(field).join(", ")}`);

if (kind !== "deal") {
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
      if (/^zone\./.test(word)) {
        const zone = word.slice(5);
        if (!zone) fail("name the zone: --mix 7,zone.side=4");
        if (value === "none") {
          mixed.zones = { ...(mixed.zones || {}), [zone]: "none" };
          from.push(`no ${zone}`);
          continue;
        }
        const id = /^\d+$/.test(value) ? base(Number(value)).arrangement : entry("arrangements", value).id;
        const zones = entry("arrangements", id).zones || {};
        if (!zones[zone]) fail(`the arrangement ${id} has no zone called ${zone}: its zones are ${Object.keys(zones).join(", ") || "not named in the library"}`);
        mixed.zones = { ...(mixed.zones || {}), [zone]: id };
        if (id === mixed.arrangement) delete mixed.zones[zone];
        from.push(`${zone} from ${value}`);
        continue;
      }
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
  if (repeated.length && lib.type.length > 1) console.error(`deal: the library has few types or grounds, so ${repeated.map(([pair, n]) => `${pair} comes ${n} times`).join(", ")}`);
  if (recipes.length < count) console.error(`deal: ${recipes.length} recipes, not ${count}: the library has no more arrangements to give`);
}

recipes.forEach((r, i) => {
  r.n = i + 1;
  const notes = against(r);
  if (notes.length) r.against = notes;
});
const round = { round: rounds.length + 1, kind, seed, recipes };
rounds.push(round);
save();

const pad = (text, n) => String(text).padEnd(n);
console.log(`round ${round.round} · ${round.kind} · seed ${seed}`);
// Say how wide the round is, and when the library cannot make it wider.
if (kind === "deal" && recipes.length && lib.type.length > 1) {
  const count = (values) => Object.entries(values.reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(" · ");
  const tones = recipes.map((r) => toneOf(entry("grounds", r.ground)));
  const faces = recipes.map((r) => kindOf(entry("type", r.type)));
  console.log(`spread: ${count(tones)} | faces: ${count(faces)}`);
  const libTones = new Set(lib.grounds.map(toneOf));
  const libKinds = new Set(lib.type.map(kindOf));
  if (libTones.size === 1 && !lib.type.every((t) => t.from.includes("identity"))) console.error(`deal: every ground in the library is ${[...libTones][0]}, so every screen will be too: like a reference on another ground for a wider spread`);
  if (libKinds.size === 1 && lib.type.length > 1) console.error(`deal: every face in the library is ${[...libKinds][0]}: like a reference with another kind of type for a wider spread`);
  if (lib.arrangements.length < 6) console.error(`deal: ${lib.arrangements.length} references give ${lib.arrangements.length} arrangements, so the screens will look alike: 6 to 10 likes give a wider spread`);
}
for (const r of recipes) {
  const lead = kind !== "deal" ? `${pad(r.n, 3)}of ${pad(r.of, 3)}${pad(r.change, 12)} ` : pad(r.n, 3);
  console.log(`${lead}${pad(r.arrangement, 14)}${pad(r.navigation, 14)}${pad(r.type, 14)}${pad(r.ground, 14)}${r.accent}${zoneKey(r) ? `  zones ${zoneKey(r)}` : ""}`);
  if (r.against?.length) console.log(`   against the brief: ${r.against.join("; ")}`);
}
if (Object.keys(asked).length) {
  const off = recipes.filter((r) => r.against?.length).length;
  console.log(`brief: ${off ? `${off} of ${recipes.length} screens sit against its personality (a note to show with them, never a cut)` : "no screen sits plainly against its personality"}`);
}

// The identity's json block, turned into the lists the deal reads. Hoisted, so it runs before the checks.
function fromIdentity(path) {
  if (!existsSync(resolve(path))) fail(`no identity at ${path}`);
  const text = readFileSync(resolve(path), "utf8");
  const block = text.match(/```json identity\n([\s\S]*?)```/) || (path.endsWith(".json") ? [null, text] : null);
  if (!block) fail(`${path} has no \`\`\`json identity block: write it with design-identity`);
  let id;
  try { id = JSON.parse(block[1]); } catch (error) { fail(`${path}: the identity block is not JSON (${error.message})`); }
  if (!id.display?.face) fail(`${path}: the identity has no display face`);
  if (!Array.isArray(id.colours) || !id.colours.length) fail(`${path}: the identity has no colours`);
  const has = (c, role) => [].concat(c.role || []).includes(role);
  const lum = (hex) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const six = (hex) => (/^#[0-9a-f]{3}$/i.test(hex) ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex);
  const colours = id.colours.map((c) => ({ ...c, hex: six(c.hex) }));
  for (const c of colours) if (!/^#[0-9a-f]{6}$/i.test(c.hex)) fail(`${path}: ${c.name} is not a hex colour (${c.hex})`);
  const inks = colours.filter((c) => has(c, "ink") || has(c, "ground"));
  const { size: _size, ...display } = id.display;
  lib.type = [{ id: "identity", what: "the identity's faces", ...display, size: null, ...(id.body ? { body: id.body } : {}), from: ["identity"] }];
  lib.grounds = [];
  for (const g of colours.filter((c) => has(c, "ground"))) {
    const ink = inks.filter((c) => c !== g).map((c) => ({ c, r: ratio(c.hex, g.hex) })).sort((a, b) => b.r - a.r)[0];
    if (!ink || ink.r < 4.5) {
      console.error(`deal: ${g.name} is left out as a ground: no identity colour reads on it at 4.5:1`);
      continue;
    }
    lib.grounds.push({ id: g.name, ground: g.hex, panel: null, ink: ink.c.hex, gradient: null, pattern: null, from: ["identity"] });
  }
  if (!lib.grounds.length) fail(`${path}: no colour can be a ground with a readable ink`);
  lib.accents = [...colours.filter((c) => has(c, "accent")).map((c) => ({ id: c.name, colour: c.hex, device: c.device || "what the arrangement gives it", from: ["identity"] })), { id: "none", colour: null, device: "no accent", from: ["identity"] }];
}
