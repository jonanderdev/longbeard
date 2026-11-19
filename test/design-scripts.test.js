import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const deal = join(root, "skills/design/scripts/deal.mjs");
const sheet = join(root, "skills/design/scripts/sheet.mjs");
const measure = join(root, "skills/design-direction/scripts/measure.mjs");

// Eight references, a to h. Each gives one arrangement; type, grounds and the rest are shared out.
const library = (extra = {}) => ({
  anchor: "a",
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

test("deal: the anchor's two screens never sit side by side", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const dir = project();
    run(deal, dir, ["library.json", "--seed", String(seed)]);
    const order = rounds(dir)[0].recipes.map((r) => r.arrangement);
    assert.equal(order.filter((a) => a === "arr-a").length, 2);
    assert.ok(!order.some((a, i) => i && a === "arr-a" && order[i - 1] === "arr-a"), `seed ${seed}: ${order}`);
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
  const page = `<!doctype html><body style="margin:0;background:rgb(238,230,222)"><h1 style="font:700 80px Georgia;color:rgb(200,0,0);text-transform:uppercase">Quiet</h1></body>`;
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
  assert.equal((await measured(["notes.txt"])).status, 2);
});
