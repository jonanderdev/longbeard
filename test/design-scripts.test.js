import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const deal = join(root, "skills/design-direction/scripts/deal.mjs");
const sheet = join(root, "skills/design-direction/scripts/sheet.mjs");
const measure = join(root, "skills/design-families/scripts/measure.mjs");

// Eight references, a to h. Each gives one arrangement; type, grounds and the rest are shared out.
const library = (extra = {}) => ({
  anchor: "a",
  family: { tone: "light", empty: "55–70%", from: ["a", "b"] },
  arrangements: "abcdefgh".split("").map((ref) => ({ id: `arr-${ref}`, what: "x", from: [ref] })),
  navigation: [
    { id: "nav-1", what: "x", from: ["a", "b"] },
    { id: "nav-2", what: "x", from: ["c", "d"] },
    { id: "nav-3", what: "x", from: ["e"] },
  ],
  type: [
    { id: "type-1", from: ["a", "b"] },
    { id: "type-2", from: ["c", "d"] },
    { id: "type-3", from: ["e", "f"] },
    { id: "type-4", from: ["g", "h"] },
  ],
  grounds: [
    { id: "light", ground: "#ffffff", ink: "#111111", from: ["a", "c"] },
    { id: "cream", ground: "#f4ecdc", ink: "#111111", from: ["b", "e"] },
    { id: "dark", ground: "#101010", ink: "#f0f0f0", from: ["d", "g"] },
    { id: "framed", ground: "#203040", panel: "#fbfbfb", ink: "#111111", from: ["f", "h"] },
  ],
  accents: [
    { id: "red", colour: "#d20401", device: "x", from: ["a", "d"] },
    { id: "pale", colour: "#fdfbe8", device: "x", from: ["b", "f"] },
    { id: "none", colour: null, device: "x", from: ["c", "e", "g", "h"] },
  ],
  ...extra,
});

function project(lib = library()) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-deal-"));
  writeFileSync(join(dir, "library.json"), JSON.stringify(lib));
  return dir;
}
const run = (script, dir, args) => spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });
const rounds = (dir) => JSON.parse(readFileSync(join(dir, "deal.json"), "utf8")).rounds;
const sources = (lib, list, id) => lib[list].find((x) => x.id === id).from;

test("deal: arrangement, type and ground of every recipe come from three different references", () => {
  const lib = library();
  for (const seed of ["1", "2", "3", "4"]) {
    const dir = project(lib);
    const result = run(deal, dir, ["library.json", "--seed", seed]);
    assert.equal(result.status, 0, result.stderr);
    const [round] = rounds(dir);
    assert.equal(round.recipes.length, 8);
    for (const r of round.recipes) {
      const a = sources(lib, "arrangements", r.arrangement);
      const t = sources(lib, "type", r.type);
      const g = sources(lib, "grounds", r.ground);
      assert.ok(!a.some((ref) => t.includes(ref)), `recipe ${r.n}: arrangement and type share a reference`);
      assert.ok(!a.some((ref) => g.includes(ref)), `recipe ${r.n}: arrangement and ground share a reference`);
      assert.ok(!t.some((ref) => g.includes(ref)), `recipe ${r.n}: type and ground share a reference`);
    }
  }
});

test("deal --brief: screens plainly against the personality are noted, never cut", () => {
  const lib = library();
  lib.grounds.push({ id: "teal", ground: "#1f8a8a", ink: "#ffffff", from: ["h"] });
  lib.type.push({ id: "type-script", kind: "script", from: ["b"] });
  const dir = project(lib);
  mkdirSync(join(dir, "docs/design"), { recursive: true });
  writeFileSync(join(dir, "docs/design/design-brief.md"), "# Design brief: x\n\n- personality: loud 1 · picture-led 3 · rich 2 · cool 1 · playful 1 · new 3 · dense 2\n");
  const result = run(deal, dir, ["library.json", "--seed", "3", "--count", "10"]);
  assert.equal(result.status, 0, result.stderr);
  const [round] = rounds(dir);
  assert.equal(round.recipes.length, 9, "every screen is still dealt: eight arrangements, the anchor's twice");
  assert.ok(round.recipes.some((r) => r.ground === "teal") && round.recipes.some((r) => r.type === "type-script"), "the noted entries are dealt, not passed over");
  for (const r of round.recipes) {
    const notes = r.against || [];
    assert.equal(notes.some((n) => /cool ground for a warm brief/.test(n)), r.ground === "teal", `recipe ${r.n}`);
    assert.equal(notes.some((n) => /saturated ground for a quiet brief/.test(n)), r.ground === "teal", `recipe ${r.n}`);
    assert.equal(notes.some((n) => /script face for a serious brief/.test(n)), r.type === "type-script", `recipe ${r.n}`);
  }
  assert.match(result.stdout, /^brief: /m);
  // No brief, no notes.
  const plain = project(lib);
  const bare = run(deal, plain, ["library.json", "--seed", "3"]);
  assert.ok(rounds(plain)[0].recipes.every((r) => !r.against));
  assert.doesNotMatch(bare.stdout, /^brief: /m);
  const missing = run(deal, plain, ["library.json", "--brief", "nope.md"]);
  assert.equal(missing.status, 1);
});

test("deal: the anchor's arrangement is dealt twice and no other repeats", () => {
  const dir = project();
  run(deal, dir, ["library.json", "--seed", "11"]);
  const seen = {};
  for (const r of rounds(dir)[0].recipes) seen[r.arrangement] = (seen[r.arrangement] || 0) + 1;
  assert.equal(seen["arr-a"], 2);
  for (const [id, n] of Object.entries(seen)) if (id !== "arr-a") assert.equal(n, 1, id);
});

test("deal: without an anchor every arrangement is dealt once", () => {
  const dir = project(library({ anchor: undefined }));
  run(deal, dir, ["library.json", "--seed", "3"]);
  const ids = rounds(dir)[0].recipes.map((r) => r.arrangement);
  assert.equal(new Set(ids).size, 8);
});

test("deal: an accent too close to its surface is passed over", () => {
  const lib = library();
  for (const seed of ["1", "2", "3", "4", "5", "6"]) {
    const dir = project(lib);
    run(deal, dir, ["library.json", "--seed", seed]);
    for (const r of rounds(dir)[0].recipes) {
      // The pale accent cannot sit on white, on cream, or on the framed ground's white panel.
      if (r.accent === "pale") assert.equal(r.ground, "dark", `recipe ${r.n} puts pale on ${r.ground}`);
    }
  }
});

test("deal: a seed gives the same round, and a second round repeats no recipe", () => {
  const one = project();
  const two = project();
  run(deal, one, ["library.json", "--seed", "42"]);
  run(deal, two, ["library.json", "--seed", "42"]);
  assert.deepEqual(rounds(one)[0].recipes, rounds(two)[0].recipes);
  run(deal, one, ["library.json", "--seed", "43"]);
  const all = rounds(one).flatMap((round) => round.recipes.map((r) => [r.arrangement, r.navigation, r.type, r.ground, r.accent].join("|")));
  assert.equal(rounds(one).length, 2);
  assert.equal(new Set(all).size, all.length);
});

test("deal --vary: each variation changes one list and keeps the three sources", () => {
  const lib = library();
  const dir = project(lib);
  run(deal, dir, ["library.json", "--seed", "8"]);
  const result = run(deal, dir, ["library.json", "--vary", "2,5", "--seed", "9"]);
  assert.equal(result.status, 0, result.stderr);
  const [dealt, varied] = rounds(dir);
  assert.equal(varied.kind, "vary");
  for (const n of [2, 5]) {
    const base = dealt.recipes.find((r) => r.n === n);
    const row = varied.recipes.filter((r) => r.of === n);
    assert.equal(row[0].change, "the pick");
    assert.ok(row.length > 2);
    for (const r of row.slice(1)) {
      const changed = ["arrangement", "navigation", "type", "ground", "accent"].filter((name) => r[name] !== base[name]);
      assert.deepEqual(changed, [r.change]);
      const a = sources(lib, "arrangements", r.arrangement);
      const t = sources(lib, "type", r.type);
      const g = sources(lib, "grounds", r.ground);
      assert.ok(!a.some((ref) => t.includes(ref)) && !a.some((ref) => g.includes(ref)) && !t.some((ref) => g.includes(ref)));
    }
  }
});

test("deal: the anchor's two screens never touch on the sheet, beside or above each other", () => {
  for (const cols of [2, 4]) {
    for (let seed = 1; seed <= 40; seed++) {
      const dir = project();
      run(deal, dir, ["library.json", "--seed", String(seed), "--cols", String(cols)]);
      const at = rounds(dir)[0].recipes.filter((r) => r.arrangement === "arr-a").map((r) => r.n - 1);
      assert.equal(at.length, 2);
      const [p, q] = at;
      const besides = Math.floor(p / cols) === Math.floor(q / cols) && Math.abs(p - q) === 1;
      assert.ok(!besides && Math.abs(p - q) !== cols, `cols ${cols}, seed ${seed}: ${at}`);
    }
  }
});

test("deal --vary after a vary round varies that round's recipe, not the first deal's", () => {
  const dir = project();
  run(deal, dir, ["library.json", "--seed", "1"]);
  run(deal, dir, ["library.json", "--vary", "2", "--seed", "2"]);
  const picked = rounds(dir)[1].recipes.at(-1);
  const result = run(deal, dir, ["library.json", "--vary", String(picked.n), "--seed", "3"]);
  assert.equal(result.status, 0, result.stderr);
  const pick = rounds(dir)[2].recipes[0];
  for (const name of ["arrangement", "navigation", "type", "ground", "accent"]) assert.equal(pick[name], picked[name]);
});

test("deal --more gives the pick every entry of one list it has not had, keeping the three sources", () => {
  const lib = library();
  const dir = project(lib);
  run(deal, dir, ["library.json", "--seed", "8"]);
  const result = run(deal, dir, ["library.json", "--more", "2:accent", "--seed", "9"]);
  assert.equal(result.status, 0, result.stderr);
  const [dealt, more] = rounds(dir);
  const base = dealt.recipes.find((r) => r.n === 2);
  assert.equal(more.kind, "more");
  const accents = more.recipes.slice(1).map((r) => r.accent);
  assert.ok(accents.length > 0 && !accents.includes(base.accent) && new Set(accents).size === accents.length);
  for (const r of more.recipes.slice(1)) assert.deepEqual(["arrangement", "navigation", "type", "ground"].map((n) => r[n]), ["arrangement", "navigation", "type", "ground"].map((n) => base[n]));
});

test("deal --mix records a hand mix as its own round, and warns when it breaks the three sources", () => {
  const dir = project();
  writeFileSync(join(dir, "deal.json"), JSON.stringify({ rounds: [{ round: 1, kind: "deal", seed: 1, recipes: [
    { n: 1, arrangement: "arr-b", navigation: "nav-2", type: "type-2", ground: "dark", accent: "red" },
    { n: 2, arrangement: "arr-c", navigation: "nav-1", type: "type-4", ground: "cream", accent: "none" },
  ] }] }));
  const ok = run(deal, dir, ["library.json", "--mix", "1,ground=framed,accent=2"]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stderr, "");
  const mixed = rounds(dir)[1].recipes[0];
  assert.deepEqual([mixed.arrangement, mixed.type, mixed.ground, mixed.accent], ["arr-b", "type-2", "framed", "none"]);
  const broken = run(deal, dir, ["library.json", "--mix", "1,type=type-1"]);
  assert.equal(broken.status, 0, broken.stderr);
  assert.match(broken.stderr, /fewer than three references/);
});

test("deal --mix zone: a zone from another arrangement is a dealt move, its references counted, none drops a zone", () => {
  const lib = library();
  lib.arrangements[1].zones = { hero: "name on the picture", side: "a caption column" };
  lib.arrangements[2].zones = { hero: "name behind the picture", side: "a thin index on the left" };
  const dir = project(lib);
  writeFileSync(join(dir, "deal.json"), JSON.stringify({ rounds: [{ round: 1, kind: "deal", seed: 1, recipes: [
    { n: 1, arrangement: "arr-b", navigation: "nav-2", type: "type-3", ground: "dark", accent: "red" },
    { n: 2, arrangement: "arr-c", navigation: "nav-1", type: "type-4", ground: "cream", accent: "none" },
  ] }] }));
  const ok = run(deal, dir, ["library.json", "--mix", "1,zone.side=2"]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(rounds(dir)[1].recipes[0].zones, { side: "arr-c" });
  assert.match(ok.stdout, /zones side=arr-c/);
  // arr-c is from c; type-3 from e and f, dark from d and g: still three sources. With a ground from c it is not.
  assert.equal(ok.stderr, "");
  const broken = run(deal, dir, ["library.json", "--mix", "1,zone.side=arr-c,ground=light"]);
  assert.match(broken.stderr, /fewer than three references/);
  // Numbers read from the last round, so a mix of a mix keeps the zone it already took.
  const none = run(deal, dir, ["library.json", "--mix", "1,zone.hero=none"]);
  assert.equal(none.status, 0, none.stderr);
  assert.deepEqual(rounds(dir).at(-1).recipes[0].zones, { side: "arr-c", hero: "none" });
  const missing = run(deal, dir, ["library.json", "--mix", "1,zone.footer=arr-c"]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no zone called footer: its zones are hero, side/);
  run(deal, dir, ["library.json", "--choose", "1"]);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "deal.json"), "utf8")).chosen.zones, { side: "arr-c", hero: "none" });
});

test("deal: a library with no family still deals, and says what is missing", () => {
  const lib = library();
  delete lib.family;
  const result = run(deal, project(lib), ["library.json", "--seed", "1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /no family/);
});

test("deal: a library with a missing list, or too thin to deal from, fails with the reason", () => {
  const { navigation, ...rest } = library();
  const missing = run(deal, project(rest), ["library.json"]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no navigation/);
  const thin = library();
  for (const list of ["arrangements", "type", "grounds"]) thin[list] = [{ ...thin[list][0], from: ["a"] }];
  const result = run(deal, project(thin), ["library.json"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /too thin/);
});

test("sheet: one numbered tile per shot, in the order given", () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-sheet-"));
  for (const name of ["1.png", "2.png", "3.png"]) writeFileSync(join(dir, name), "png");
  const result = run(sheet, dir, ["out/sheet.html", "--cols", "3", "1.png", "2.png", "3.png"]);
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(join(dir, "out/sheet.html"), "utf8");
  assert.equal(html.match(/<figure>/g).length, 3);
  assert.match(html, /<img src="\.\.\/2\.png" alt="Screen 2"><figcaption>2<\/figcaption>/);
  assert.match(html, /repeat\(3, 720px\)/);
  assert.equal(run(sheet, dir, ["out/sheet.html", "missing.png"]).status, 1);
});

// A tiny RGB PNG from raw pixel bytes, one row after another.
function png(width, height, rgb) {
  const crc = (buf) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head.set([8, 2, 0, 0, 0], 8);
  const rows = [];
  for (let y = 0; y < height; y++) rows.push(Buffer.from([0, ...rgb.slice(y * width * 3, (y + 1) * width * 3)]));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

function measured(args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [measure, ...args]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stdout, stderr }));
  });
}

test("measure: a page gives its ground, and each text's face, size and colour", async (t) => {
  const page = `<!doctype html><body style="margin:0;background:rgb(238,230,222)"><h1 style="font:700 80px Georgia;color:rgb(200,0,0);text-transform:uppercase;margin:0 0 0 32px">Quiet</h1><p style="font:16px Georgia;margin:0 0 0 32px">One</p><p style="font:16px Georgia;margin:0 0 0 32px">Two</p><div style="width:720px;height:200px;background-image:linear-gradient(red,blue)"></div><div style="width:720px;height:100px;background-image:radial-gradient(circle, rgb(0,0,0) 1px, rgba(0,0,0,0) 1px);background-size:12px 12px"></div><div style="width:720px;height:100px;background-image:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0))"></div><img style="display:block;width:720px;height:450px;border-radius:6px" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="></body>`;
  const server = await new Promise((done) => {
    const s = createServer((req, res) => res.end(page));
    s.listen(0, () => done(s));
  });
  try {
    const result = await measured([`http://localhost:${server.address().port}/`, "--wait", "0"]);
    if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
    assert.equal(result.status, 0, result.stderr);
    const out = JSON.parse(result.stdout);
    assert.equal(out.ground, "rgb(238, 230, 222)");
    const [title] = out.text;
    assert.deepEqual([title.text, title.face, title.size, title.weight, title.case, title.colour], ["Quiet", "Georgia", "80px", "700", "uppercase", "rgb(200, 0, 0)"]);
    assert.deepEqual([out.traits.display, out.traits.body, out.traits.scale, out.traits.radius], ["80px", "16px", 5, "6px"]);
    assert.ok(out.traits.pictures > 20 && out.traits.pictures < 30, `pictures ${out.traits.pictures}`);
    assert.equal(out.traits.margin, 2.2);
    // A visible gradient counts, a dot grid is a pattern, and a see-through one counts as neither.
    assert.ok(out.traits.gradient > 8 && out.traits.gradient < 14, `gradient ${out.traits.gradient}`);
    assert.ok(out.traits.pattern > 3 && out.traits.pattern < 8, `pattern ${out.traits.pattern}`);
    assert.match(out.gradients[0].css, /linear-gradient/);
    assert.match(out.patterns[0].css, /radial-gradient/);
  } finally {
    server.close();
  }
});

test("measure: an image gives its colours with their share of the picture", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-measure-"));
  writeFileSync(join(dir, "two.png"), png(2, 1, [255, 0, 0, 255, 255, 255]));
  const result = await measured([join(dir, "two.png")]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.deepEqual([out.width, out.height], [2, 1]);
  assert.deepEqual(out.common.map((c) => c.colour).sort(), ["#ff0000", "#ffffff"]);
  assert.deepEqual(out.loud, [{ colour: "#ff0000", share: 50 }]);
  const four = join(dir, "four.png");
  writeFileSync(four, png(4, 1, [255, 255, 255, 255, 255, 255, 250, 250, 250, 255, 0, 0]));
  const traits = JSON.parse((await measured([four])).stdout).traits;
  assert.deepEqual([traits.ground, traits.tone, traits.empty, traits.loud], ["#fdfdfd", "light", 75, 25]);
  assert.equal((await measured(["notes.txt"])).status, 2);
});

test("measure: a screen on a grey surround is read inside the frame; a centred mark on an empty page is not a frame", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-frame-"));
  const pic = (w, h, at) => {
    const rgb = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgb.push(...at(x, y));
    return png(w, h, rgb);
  };
  // A cream screen with a red bar, on a mid-grey surround of 20 px.
  writeFileSync(join(dir, "framed.png"), pic(200, 140, (x, y) => (x < 20 || x >= 180 || y < 20 || y >= 120 ? [90, 90, 90] : y < 40 ? [220, 20, 20] : [244, 236, 220])));
  // An empty white page with a small dark mark in the middle.
  writeFileSync(join(dir, "mark.png"), pic(200, 140, (x, y) => (x > 90 && x < 110 && y > 60 && y < 80 ? [20, 20, 20] : [255, 255, 255])));
  const framed = await measured([join(dir, "framed.png")]);
  if (/No Chrome/.test(framed.stderr)) return t.skip("no Chrome installed");
  const out = JSON.parse(framed.stdout);
  assert.equal(out.frame?.colour, "#5a5a5a");
  assert.equal(out.traits.tone, "light");
  assert.ok(out.traits.empty > 70, JSON.stringify(out.traits));
  const mark = JSON.parse((await measured([join(dir, "mark.png")])).stdout);
  assert.equal(mark.frame, undefined);
  assert.ok(mark.traits.empty > 95);
});

test("measure: a folder in one browser, as one TSV row per image", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-measure-"));
  writeFileSync(join(dir, "a.png"), png(2, 1, [255, 255, 255, 255, 255, 255]));
  writeFileSync(join(dir, "b.png"), png(2, 1, [10, 10, 10, 10, 10, 10]));
  writeFileSync(join(dir, "notes.txt"), "skip me");
  const result = await measured([dir, "--tsv"]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const [head, ...rows] = result.stdout.trim().split("\n").map((l) => l.split("\t"));
  assert.deepEqual(head.slice(0, 6), ["ref", "tone", "lum", "empty", "loud", "busy"]);
  assert.deepEqual(rows.map((r) => [r[0].split("/").pop(), r[1]]), [["a.png", "light"], ["b.png", "dark"]]);
});

test("deal: a type and ground pair repeats at most once in a round, even in a tight library", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const dir = project();
    run(deal, dir, ["library.json", "--seed", String(seed)]);
    const recipes = rounds(dir)[0].recipes;
    const pairs = recipes.map((r) => `${r.type}|${r.ground}`);
    assert.ok(pairs.length - new Set(pairs).size <= 1, `seed ${seed}: ${pairs}`);
  }
});


test("measure --profiles: a picture and its page in one profile, and the tags already there kept", async (t) => {
  const icon = `<svg width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>`;
  const page = `<!doctype html><body style="margin:0;background:rgb(20,20,20)"><main style="background:rgb(20,20,20);min-height:900px"><h1 style="font:700 120px Georgia;color:#fff;margin:40px">Kiln</h1><video style="display:block;width:720px;height:300px"></video><div style="background:rgb(255,80,0);width:1440px;height:180px"></div>${icon.repeat(5)}</main></body>`;
  const server = await new Promise((done) => {
    const s = createServer((req, res) => res.end(page));
    s.listen(0, () => done(s));
  });
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-profiles-"));
    const refs = join(dir, "refs");
    spawnSync("mkdir", [refs]);
    writeFileSync(join(refs, "kiln.png"), png(4, 2, [20, 20, 20, 20, 20, 20, 250, 250, 250, 20, 20, 20, 20, 20, 20, 255, 0, 0, 20, 20, 20, 20, 20, 20]));
    writeFileSync(join(dir, "links.tsv"), `kiln\thttp://localhost:${server.address().port}/\n`);
    writeFileSync(join(dir, "profiles.json"), JSON.stringify({ refs: { kiln: { tags: { picture: ["lettering"] }, note: "kept" } } }));
    const result = await measured([refs, "--links", join(dir, "links.tsv"), "--profiles", join(dir, "profiles.json"), "--wait", "0"]);
    if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 references, 1 with their page, 1 tagged/);
    const p = JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs.kiln;
    assert.equal(p.image.traits.tone, "dark");
    assert.equal(p.image.figure.grid.length, 24);
    assert.ok(p.image.figure.share > 0 && p.image.figure.colours >= 1);
    assert.equal(p.page.traits.display, "120px");
    assert.ok(p.page.media.video > 15, JSON.stringify(p.page.media));
    // Five small drawings are icons; the orange band is a solid block; the full-screen main is the ground.
    assert.equal(p.page.traits.icons, 5);
    assert.ok(p.page.traits.blocks > 15 && p.page.traits.blocks < 25, `blocks ${p.page.traits.blocks}`);
    assert.equal(p.page.texts[0].text, "Kiln");
    assert.deepEqual([p.tags.picture, p.note], [["lettering"], "kept"]);
  } finally {
    server.close();
  }
});

test("grid template: its script parses, and it marks what a run writes", () => {
  const html = readFileSync(join(root, "skills/design-direction/references/grid-template.html"), "utf8");
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const dir = mkdtempSync(join(tmpdir(), "longbeard-template-"));
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  for (const part of ["content", "navigation", "arrangements"]) assert.match(html, new RegExp(`WRITE: ${part}`));
  assert.doesNotMatch(html, /CONCEPTS|PARTS|\?concept=|--part/);
  for (const hook of ["../deal.js", "document.title = \"ready\"", "function fit(", "function clearOf(", "createRange"]) assert.ok(html.includes(hook), hook);
});

test("grid template: must-carry and zones are wired", () => {
  const grid = readFileSync(join(root, "skills/design-direction/references/grid-template.html"), "utf8");
  for (const hook of ["function mustCarry(", "const zone = "]) assert.ok(grid.includes(hook), hook);
});

test("deal: their own entries are not one shared reference", () => {
  const lib = library();
  lib.type = [{ id: "their-face", from: ["theirs"] }];
  lib.grounds = [{ id: "their-ground", ground: "#ffffff", ink: "#000000", from: ["theirs"] }];
  const dir = project(lib);
  const result = run(deal, dir, ["library.json", "--seed", "1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(rounds(dir)[0].recipes.every((r) => r.type === "their-face" && r.ground === "their-ground"));
  const mix = run(deal, dir, ["library.json", "--mix", "1,accent=red"]);
  assert.doesNotMatch(mix.stderr, /fewer than three references/);
});

test("deal: an empty flag or a seed that is not a number is a usage error, not a fresh round", () => {
  const dir = project();
  run(deal, dir, ["library.json", "--seed", "1"]);
  assert.equal(run(deal, dir, ["library.json", "--vary"]).status, 2);
  assert.equal(run(deal, dir, ["library.json", "--seed", "abc"]).status, 2);
  assert.equal(rounds(dir).length, 1);
});

test("deal: an anchor that cannot be dealt fails with the reason; a later round deals it once", () => {
  const lib = library();
  lib.type = lib.type.map((t) => ({ ...t, from: [...t.from, "a"] }));
  const result = run(deal, project(lib), ["library.json", "--seed", "1"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /the anchor's arrangement \(arr-a\) cannot be dealt/);
  const dir = project();
  run(deal, dir, ["library.json", "--seed", "1"]);
  run(deal, dir, ["library.json", "--seed", "2"]);
  assert.ok(rounds(dir)[1].recipes.filter((r) => r.arrangement === "arr-a").length <= 1);
});

test("deal: a tight library says when a type and ground pair comes round again", () => {
  const lib = library();
  lib.type = [{ id: "t1", from: ["x"] }, { id: "t2", from: ["y"] }];
  lib.grounds = [{ id: "g1", ground: "#ffffff", ink: "#000000", from: ["z"] }, { id: "g2", ground: "#000000", ink: "#ffffff", from: ["w"] }];
  const result = run(deal, project(lib), ["library.json", "--seed", "3"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /the library has few types or grounds, so .* comes \d times/);
});

test("deal: an accent that does not stand off is never dealt, short hex included", () => {
  const lib = library();
  lib.grounds = [{ id: "white", ground: "#ffffff", ink: "#000000", from: ["z"] }];
  lib.type = [{ id: "t", from: ["y"] }];
  lib.accents = [{ id: "ghost", colour: "#ececec", from: ["q"] }, { id: "short", colour: "#fff", from: ["r"] }, { id: "none", colour: null, from: ["s"] }];
  const dir = project(lib);
  run(deal, dir, ["library.json", "--seed", "1"]);
  assert.deepEqual([...new Set(rounds(dir)[0].recipes.map((r) => r.accent))], ["none"]);
});

test("deal --more stops at one round, and --mix chosen works after any round", () => {
  const lib = library();
  for (let i = 0; i < 30; i++) lib.type.push({ id: `extra${i}`, from: [`z${i}`] });
  const dir = project(lib);
  run(deal, dir, ["library.json", "--seed", "1"]);
  const more = run(deal, dir, ["library.json", "--more", "1:type"]);
  assert.equal(rounds(dir).at(-1).recipes.length, 8);
  assert.match(more.stderr, /8 screens is a round/);
  run(deal, dir, ["library.json", "--choose", "2"]);
  const { chosen } = JSON.parse(readFileSync(join(dir, "deal.json"), "utf8"));
  run(deal, dir, ["library.json", "--vary", "1"]);
  const mix = run(deal, dir, ["library.json", "--mix", "chosen,accent=none"]);
  assert.equal(mix.status, 0, mix.stderr);
  const mixed = rounds(dir).at(-1).recipes[0];
  assert.deepEqual([mixed.arrangement, mixed.type, mixed.accent], [chosen.arrangement, chosen.type, "none"]);
});


test("measure: ordinary pages read right (alignment, ground, gradients, patterns, lettering, icons, scale)", async (t) => {
  const svgIcon = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%224%22/%3E%3C/svg%3E";
  const pages = {
    "/header": `<!doctype html><meta charset="utf-8"><body style="margin:0;font-family:Georgia"><header style="background:#fff;height:80px"></header><section style="background:#fff;height:400px"><h1 style="font-size:64px;margin:40px">Left heading</h1><p style="margin:40px">Body text body text.</p></section></body>`,
    "/oklch": `<!doctype html><meta charset="utf-8"><body style="margin:0;min-height:900px;background-image:linear-gradient(oklch(0.7 0.2 30), oklch(0.5 0.2 260))"><h1 style="font-size:96px;text-align:center">Only a headline</h1></body>`,
    "/fade": `<!doctype html><meta charset="utf-8"><body style="margin:0"><div style="height:900px;background-image:linear-gradient(rgb(255,0,0) 0px, rgb(0,0,255) 900px)"></div><p>Body text body text.</p></body>`,
    "/dots": `<!doctype html><meta charset="utf-8"><body style="margin:0"><div style="height:900px;background-image:radial-gradient(circle, rgb(0,0,0) 1px, rgba(0,0,0,0) 1px);background-size:12px 12px"></div><p>Body</p></body>`,
    "/banner": `<!doctype html><meta charset="utf-8"><body style="margin:0"><img src="/photo.png" style="display:block;width:1440px;height:420px"><h1 style="font-size:48px">Fresh bread</h1><p>Body text body text.</p></body>`,
    // A headline split into boxless word spans that fade in: read whole, at its size, as it ends.
    "/animated": `<!doctype html><meta charset="utf-8"><style>@keyframes in { from { opacity: 0 } to { opacity: 1 } } h1 span { display: contents } h1 { animation: in 4s both }</style><body style="margin:0"><h1 style="font-size:72px;margin:40px"><span>Ship</span> <span>faster</span></h1><p>Body text body text.</p></body>`,
    "/maintenance": `<!doctype html><meta charset="utf-8"><body style="margin:0"><h1 style="font-size:40px">We're down for maintenance</h1><p>Back soon.</p></body>`,
    "/soon": `<!doctype html><meta charset="utf-8"><body style="margin:0"><h1 style="font-size:64px">Txt, a quiet text editor</h1><p>Coming soon. Write notes, drafts and lists in one window, with nothing else on the screen, and keep them as plain files you own on your own disk forever.</p></body>`,
    "/icons": `<!doctype html><meta charset="utf-8"><body style="margin:0;font-family:system-ui"><h1 style="font-size:64px">Features</h1><div style="display:flex;gap:40px;font-size:40px"><span style="display:inline-block;width:48px;height:48px;background:url('${svgIcon}') no-repeat"></span><span style="display:inline-block;width:48px;height:48px;-webkit-mask:url('${svgIcon}');background:#333"></span><span>★</span><span>☂</span></div></body>`,
  };
  const photo = png(4, 2, [200, 120, 60, 90, 60, 30, 220, 200, 160, 40, 30, 20, 200, 120, 60, 90, 60, 30, 220, 200, 160, 40, 30, 20]);
  const server = await new Promise((done) => {
    const s = createServer((req, res) => (req.url === "/photo.png" ? res.end(photo) : req.url === "/gone" ? ((res.statusCode = 404), res.end("<h1>Gone</h1><p>Nothing here at all.</p>")) : res.end(pages[req.url] || "")));
    s.listen(0, () => done(s));
  });
  try {
    const base = `http://localhost:${server.address().port}`;
    const result = await measured([...[...Object.keys(pages), "/gone"].map((p) => base + p), "--tsv", "--wait", "200"]);
    if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
    assert.equal(result.status, 0, result.stderr);
    const [head, ...rows] = result.stdout.trim().split("\n").map((l) => l.split("\t"));
    const at = Object.fromEntries(rows.map((r) => [r[0].replace(base, ""), Object.fromEntries(head.map((h, i) => [h, r[i]]))]));
    assert.deepEqual([at["/header"].align, at["/header"].blocks], ["left", "0"]);
    assert.equal(at["/oklch"].gradient, "100");
    assert.deepEqual([at["/oklch"].body, at["/oklch"].scale], ["", ""]);
    assert.deepEqual([at["/fade"].gradient, at["/fade"].pattern], ["100", "0"]);
    assert.ok(Number(at["/dots"].pattern) > 90 && at["/dots"].gradient === "0", JSON.stringify(at["/dots"]));
    assert.deepEqual([at["/banner"].lettering, at["/banner"].display], ["text", "48px"]);
    assert.equal(at["/icons"].icons, "4");
    assert.deepEqual([at["/animated"].display, at["/animated"].flag], ["72px", ""]);
    // Not the real site: flagged with the reason, never dropped. An ordinary page has no flag.
    assert.equal(at["/maintenance"].flag, 'says "down for maintenance"');
    assert.equal(at["/gone"].flag, "HTTP 404");
    assert.equal(at["/oklch"].flag, "");
    assert.equal(at["/soon"].flag, "", "a real page may say coming soon");
  } finally {
    server.close();
  }
});

test("measure: a tall capture is read on its first screen, a folder of frames by its middle frame, and a file page opens", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-measure-"));
  const refs = join(dir, "refs");
  spawnSync("mkdir", ["-p", join(refs, "intro-frames")]);
  // 1440 wide, 3 screens tall, scaled down: a quiet white first screen, loud red below it.
  const W = 16, H = 30, rows = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rows.push(...(y < 10 ? [255, 255, 255] : [255, 0, 0]));
  const tall = png(W, H, rows);
  writeFileSync(join(refs, "tall.png"), tall);
  // The real width matters for the crop rule, so the tall one is checked through its share, not its size.
  for (const n of ["01", "02", "03"]) writeFileSync(join(refs, "intro-frames", `${n}-00000ms.png`), png(2, 1, n === "02" ? [0, 0, 0, 0, 0, 0] : [255, 255, 255, 255, 255, 255]));
  writeFileSync(join(dir, "page.html"), `<!doctype html><body style="margin:0"><h1 style="font-size:80px">File page</h1><p>Body text.</p></body>`);
  const result = await measured([refs, `file://${join(dir, "page.html")}`, "--tsv", "--wait", "0"]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const rows2 = result.stdout.trim().split("\n").slice(1).map((l) => l.split("\t"));
  const frame = rows2.find((r) => r[0].includes("intro-frames"));
  assert.ok(frame && frame[0].endsWith("02-00000ms.png"), "the middle frame stands for the motion keep");
  assert.equal(frame[1], "dark");
  assert.ok(rows2.some((r) => r[0].startsWith("file://") && r[7] === "80px"));
  // A tall capture 1440 wide is cut to its first screen: the red below it does not count.
  const wide = join(dir, "wide.png");
  const WW = 1440, HH = 2700, data = [];
  const row = (rgb) => Buffer.from([0, ...new Array(WW).fill(rgb).flat()]);
  const { deflateSync: deflate } = await import("node:zlib");
  const rowsBuf = [];
  for (let y = 0; y < HH; y++) rowsBuf.push(row(y < 900 ? [255, 255, 255] : [255, 0, 0]));
  const crc = (buf) => { let c = ~0; for (const byte of buf) { c ^= byte; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, body) => { const b = Buffer.concat([Buffer.from(type), body]); const out = Buffer.alloc(b.length + 8); out.writeUInt32BE(body.length, 0); b.copy(out, 4); out.writeUInt32BE(crc(b), b.length + 4); return out; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(WW, 0); ihdr.writeUInt32BE(HH, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  writeFileSync(wide, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflate(Buffer.concat(rowsBuf))), chunk("IEND", Buffer.alloc(0))]));
  const wideOut = JSON.parse((await measured([wide])).stdout);
  assert.equal(wideOut.firstScreen, true);
  assert.deepEqual([wideOut.traits.tone, wideOut.traits.loud], ["light", 0]);
});

test("colours: design-identity's colour options are made by rule, every option passes contrast, and a failing one is left out", () => {
  const colours = join(root, "skills/design-identity/scripts/colours.mjs");
  const out = spawnSync(process.execPath, [colours, "--ground", "#f1ede4", "--ink", "#111111", "--accent", "#fe2601", "--family", "#ebe4e0,#fec704", "--theirs", "#2b4c7e", "--json"], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  const { rows } = JSON.parse(out.stdout);
  const grounds = rows.filter((r) => r.row === "ground");
  const accents = rows.filter((r) => r.row === "accent");
  assert.deepEqual(grounds.slice(0, 3).map((r) => r.label), ["as dealt", "lighter", "darker"]);
  assert.ok(grounds.every((r) => r.contrast >= 4.5));
  assert.equal(grounds.find((r) => r.label === "theirs").ink, "#f7f7f5");
  assert.ok(accents.filter((r) => r.colour !== "none").every((r) => r.contrast >= 3));
  assert.ok(!accents.some((r) => r.colour === "#fec704"), "a yellow under 3:1 on cream is left out");
  assert.ok(accents.some((r) => r.label === "none"));
  const pale = spawnSync(process.execPath, [colours, "--ground", "#fff", "--ink", "#000", "--accent", "#ececec"], { encoding: "utf8" });
  assert.match(pale.stderr, /left out the dealt accent/);
  assert.equal(spawnSync(process.execPath, [colours, "--ground", "nope", "--ink", "#000"], { encoding: "utf8" }).status, 2);
  // The dealt ink is part of the look: tan on brown stays tan wherever it reads, not white.
  const tan = JSON.parse(spawnSync(process.execPath, [colours, "--ground", "#3b2416", "--ink", "#d8b98c", "--json"], { encoding: "utf8" }).stdout);
  assert.equal(tan.rows.find((r) => r.label === "as dealt").ink, "#d8b98c");
  // The text colour has its own row, the dealt ink first, every option on the ground at 4.5:1.
  const inks = tan.rows.filter((r) => r.row === "ink");
  assert.equal(inks[0].colour, "#d8b98c");
  assert.ok(inks.length >= 3 && inks.every((r) => r.contrast >= 4.5));
  // --roles derives every other role from the three picks, each checked.
  const roles = spawnSync(process.execPath, [colours, "--roles", "--ground", "#f4ecdc", "--ink", "#2a1a10", "--accent", "#f2c94c", "--json"], { encoding: "utf8" });
  assert.equal(roles.status, 0, roles.stderr);
  const by = Object.fromEntries(JSON.parse(roles.stdout).roles.map((r) => [r.role, r]));
  assert.equal(by["button fill"].colour, "#2a1a10", "a yellow under 3:1 on cream does not fill the button");
  assert.equal(by["button label"].colour, "#f4ecdc", "the ground reads on an ink button");
  assert.ok(by["soft text"].contrast >= 4.5 && by["soft text"].colour !== "#2a1a10");
  for (const name of ["hairline", "picture tone", "status ok", "status warn", "status error"]) assert.ok(by[name], name);
});

test("fonts: faces of the same kind only, nearest in shape first, the chosen one on top", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-fonts-"));
  const face = (family, category, stroke, extra = {}) => ({ family, category, stroke, classifications: [], subsets: ["latin"], fonts: { 400: {}, 700: {} }, axes: [], popularity: 1, isNoto: false, ...extra });
  const list = {
    familyMetadataList: [
      face("DejaVu Serif", "Serif", "Serif"),
      face("FreeSerif", "Serif", "Serif", { popularity: 2 }),
      face("Caladea", "Serif", "Serif", { popularity: 3 }),
      face("DejaVu Sans", "Sans Serif", "Sans Serif"),
      face("FreeSans", "Sans Serif", "Sans Serif"),
      face("Bitstream Charter", "Serif", "Serif", { fonts: { 700: {} } }),
      face("DejaVu Serif SC", "Serif", "Serif"),
    ],
  };
  writeFileSync(join(dir, "fonts.json"), JSON.stringify(list));
  const fonts = join(root, "skills/design-identity/scripts/fonts.mjs");
  const run = (args) => new Promise((done) => {
    const child = spawn(process.execPath, [fonts, ...args, "--metadata", join(dir, "fonts.json"), "--local"]);
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stdout, stderr }));
  });
  const result = await run(["DejaVu Serif", "--json"]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.chosen.face, "DejaVu Serif");
  // Serifs only; not the sans, not a small-caps twin, not one without the weight in use.
  const names = out.rows.map((r) => r.face);
  assert.ok(names.length >= 1 && names.every((n) => ["Caladea", "FreeSerif"].includes(n)), JSON.stringify(names));
  for (const r of out.rows) assert.ok(r.width > 0.3 && r.width < 0.8 && r.contrast > 0.5, JSON.stringify(r));
  assert.ok(out.rows.every((r, i) => i === 0 || out.rows[i - 1].far <= r.far));
  assert.equal((await run(["Their Face"])).status, 1);
  assert.match((await run(["Their Face"])).stderr, /not in Google Fonts' list: say its kind with --kind/);
  assert.equal((await run(["DejaVu Serif", "--weight", "50"])).status, 2);
  // --kind wins over the list's kind: a face Google files wrongly gets a row of what it is.
  const sans = JSON.parse((await run(["DejaVu Serif", "--kind", "sans", "--json"])).stdout);
  assert.ok(sans.rows.length && sans.rows.every((r) => ["DejaVu Sans", "FreeSans"].includes(r.face)), JSON.stringify(sans.rows.map((r) => r.face)));
});

test("deal --identity: type, grounds and accents come from the identity, composition from the references", () => {
  const { type: _t, grounds: _g, accents: _a, ...composition } = library();
  const dir = project(composition);
  writeFileSync(join(dir, "identity.md"), `# Identity\n\n\`\`\`json identity\n${JSON.stringify({
    display: { face: "Unbounded", weight: 500, case: "uppercase" },
    body: { face: "Inter", size: "16px", leading: "1.5" },
    colours: [
      { name: "lime", hex: "#C0FF00", role: ["accent", "ground"] },
      { name: "paper", hex: "#EEE", role: "ground" },
      { name: "mid", hex: "#737373", role: "ground" },
      { name: "ink", hex: "#000000", role: ["ink", "ground"] },
    ],
  })}\n\`\`\`\n`);
  const result = run(deal, dir, ["library.json", "--identity", "identity.md", "--seed", "1"]);
  assert.equal(result.status, 0, result.stderr);
  // Grey #737373 has no identity colour at 4.5:1 on it, so it is not a ground, and it is said.
  assert.match(result.stderr, /mid is left out as a ground/);
  const lib = JSON.parse(readFileSync(join(dir, "library.json"), "utf8"));
  assert.deepEqual(lib.grounds.map((g) => g.id), ["lime", "paper", "ink"]);
  // Each ground takes the identity colour that reads best on it: dark ink on the light ones, a light one on black.
  assert.equal(lib.grounds.find((g) => g.id === "paper").ink, "#000000");
  assert.notEqual(lib.grounds.find((g) => g.id === "ink").ink, "#000000");
  assert.deepEqual(lib.accents.map((a) => a.id), ["lime", "none"]);
  const { rounds } = JSON.parse(readFileSync(join(dir, "deal.json"), "utf8"));
  assert.equal(rounds[0].recipes.length, 8);
  for (const r of rounds[0].recipes) assert.equal(r.type, "identity");
  // Later rounds read the lists written back, with no --identity.
  const again = run(deal, dir, ["library.json", "--vary", "1"]);
  assert.equal(again.status, 0, again.stderr);
});

test("deal: a round spreads across light, dark and mid grounds and kinds of face, and says how wide it is", () => {
  const lib = library();
  lib.type = lib.type.map((t, i) => ({ ...t, kind: ["serif", "sans", "condensed", "serif"][i] }));
  const dir = project(lib);
  const result = run(deal, dir, ["library.json", "--seed", "2"]);
  assert.equal(result.status, 0, result.stderr);
  const line = result.stdout.split("\n").find((l) => l.startsWith("spread:"));
  assert.ok(line, result.stdout);
  for (const word of ["light", "dark", "serif", "sans", "condensed"]) assert.match(line, new RegExp(word));
  // Three of the four grounds are light; dealt by evenness alone, dark would get 2 of 8. Spread gives it more.
  const dark = Number((line.match(/dark (\d+)/) || [0, 0])[1]);
  assert.ok(dark >= 3, line);
});

test("deal: a library too narrow for a spread says so", () => {
  const lib = library();
  lib.arrangements = lib.arrangements.slice(0, 4);
  lib.grounds = lib.grounds.map((g) => ({ ...g, ground: "#ffffff", panel: null, ink: "#111111" }));
  const dir = project(lib);
  const result = run(deal, dir, ["library.json", "--seed", "1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /every ground in the library is light/);
  assert.match(result.stderr, /4 references give 4 arrangements/);
});
