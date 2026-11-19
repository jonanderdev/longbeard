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

test("deal --choose then --part: layouts for another screen carry the chosen look, each from another reference", () => {
  const lib = library({
    parts: {
      navigation: [
        { id: "follows", what: "the first screen's bar, opened", from: ["first screen"] },
        { id: "overlay", what: "x", from: ["a"] },
        { id: "drawer", what: "x", from: ["b"] },
        { id: "inline", what: "x", from: ["a", "c"] },
        { id: "dock", what: "x", from: ["d"] },
        { id: "tabs", what: "x", from: ["e"] },
      ],
    },
  });
  const dir = project(lib);
  const early = run(deal, dir, ["library.json", "--part", "navigation"]);
  assert.equal(early.status, 1);
  run(deal, dir, ["library.json", "--seed", "4"]);
  assert.match(run(deal, dir, ["library.json", "--part", "navigation"]).stderr, /no screen chosen yet/);
  const chose = run(deal, dir, ["library.json", "--choose", "3"]);
  assert.equal(chose.status, 0, chose.stderr);
  const { chosen } = JSON.parse(readFileSync(join(dir, "deal.json"), "utf8"));
  const result = run(deal, dir, ["library.json", "--part", "navigation", "--seed", "5"]);
  assert.equal(result.status, 0, result.stderr);
  const part = rounds(dir).at(-1);
  assert.equal(part.kind, "part");
  assert.equal(part.recipes.length, 4);
  assert.equal(part.recipes[0].arrangement, "follows");
  for (const r of part.recipes) for (const k of ["navigation", "type", "ground", "accent"]) assert.equal(r[k], chosen[k]);
  const refs = part.recipes.flatMap((r) => lib.parts.navigation.find((x) => x.id === r.arrangement).from);
  assert.equal(new Set(refs).size, refs.length);
  // Asked again, the layouts not shown yet come first.
  run(deal, dir, ["library.json", "--part", "navigation", "--seed", "6"]);
  const again = rounds(dir).at(-1).recipes.map((r) => r.arrangement);
  const before = part.recipes.map((r) => r.arrangement);
  const unseen = lib.parts.navigation.map((x) => x.id).filter((id) => !before.includes(id));
  assert.ok(unseen.every((id) => again.includes(id) || lib.parts.navigation.find((x) => x.id === id).from.some((ref) => again.some((a) => lib.parts.navigation.find((x) => x.id === a).from.includes(ref)))), `${again}`);
  assert.equal(run(deal, dir, ["library.json", "--part", "footer"]).status, 1);
});

test("deal --part: earlier choices carry forward, and a layout that needs what was not chosen is left out", () => {
  const lib = library({
    parts: {
      navigation: [
        { id: "follows-nav", what: "x", from: ["first screen"] },
        { id: "overlay", what: "x", from: ["a"], needs: ["nav-1"] },
        { id: "sidebar", what: "x", from: ["b"], needs: ["nav-3"] },
        { id: "sheet", what: "x", from: ["c"] },
      ],
      index: [
        { id: "follows-index", what: "x", from: ["first screen"] },
        { id: "cards", what: "x", from: ["d"], needs: ["overlay"] },
        { id: "rows", what: "x", from: ["e"], needs: ["sheet"] },
      ],
    },
  });
  const dir = project(lib);
  // A first screen with nav-1, chosen by writing a round whose recipe 1 has it.
  writeFileSync(join(dir, "deal.json"), JSON.stringify({ rounds: [{ round: 1, kind: "deal", seed: 1, recipes: [{ n: 1, arrangement: "arr-b", navigation: "nav-1", type: "type-2", ground: "dark", accent: "red" }] }] }));
  run(deal, dir, ["library.json", "--choose", "1"]);
  const nav = run(deal, dir, ["library.json", "--part", "navigation", "--seed", "2"]);
  assert.match(nav.stderr, /1 layout for navigation left out: it needs what was not chosen \(nav-3\)/);
  const navRound = rounds(dir).at(-1);
  assert.deepEqual(navRound.recipes.map((r) => r.arrangement).sort(), ["follows-nav", "overlay", "sheet"]);
  assert.ok(navRound.recipes.every((r) => r.navigation === "nav-1" && r.first === "arr-b"));
  // They pick the overlay menu; the index is dealt knowing it.
  const overlay = navRound.recipes.find((r) => r.arrangement === "overlay").n;
  assert.match(run(deal, dir, ["library.json", "--choose", String(overlay)]).stdout, /chosen for navigation: overlay/);
  run(deal, dir, ["library.json", "--part", "index", "--seed", "3"]);
  const indexRound = rounds(dir).at(-1);
  assert.deepEqual(indexRound.recipes.map((r) => r.arrangement).sort(), ["cards", "follows-index"]);
  assert.ok(indexRound.recipes.every((r) => r.parts.navigation === "overlay"));
  // A new first screen clears what was chosen for the other screens.
  writeFileSync(join(dir, "deal.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(dir, "deal.json"), "utf8")), rounds: [...rounds(dir), { round: 9, kind: "deal", seed: 1, recipes: [{ n: 1, arrangement: "arr-c", navigation: "nav-3", type: "type-4", ground: "cream", accent: "none" }] }] }));
  assert.match(run(deal, dir, ["library.json", "--choose", "1"]).stderr, /layouts chosen for navigation are cleared/);
});
