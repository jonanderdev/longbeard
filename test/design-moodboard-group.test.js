import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

// No network and no browser: group.mjs is given traits already measured, and the picker a families file.
const scripts = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-moodboard/scripts");
const { floor, rowsOf, sniff, relabel } = await import(join(scripts, "group.mjs"));

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-group-test-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
const run = (name, dir, args, env = {}) =>
  spawnSync(process.execPath, [join(scripts, name), ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } });

const head = "ref\ttone\tlum\tempty\tloud\tbusy\tground\tdisplay\tbody\tscale\tpictures\tmargin\tradius";
const trait = (id, lum, empty, loud, busy) => `${id}.jpg\t\t${lum}\t${empty}\t${loud}\t${busy}\t#000000\t\t\t\t\t\t`;
// Looks that sit far apart on how empty and how loud they are, each with n candidates, as rows a1…
function pool(looks) {
  const rows = [];
  const traits = [];
  for (const [name, n, lum, empty, loud, busy] of looks) {
    for (let i = 0; i < n; i++) {
      const id = `a${rows.length + 1}`;
      rows.push(`${name} ${i}\thttps://cdn.example.com/${id}.jpg\thttps://example.com/${id}\tdribbble`);
      traits.push(trait(id, lum, empty + (i % 3), loud, busy));
    }
  }
  return { "candidates.tsv": rows.join("\n"), "traits.tsv": [head, ...traits].join("\n") };
}
const four = [["paper", 10, 0.85, 82, 1, 2], ["poster", 10, 0.5, 15, 60, 12], ["quiet dark", 10, 0.05, 55, 8, 6], ["dense", 10, 0.5, 30, 0, 20]];

test("group: families as row ids, the floor met with four looks, and a sheet in group order", () => {
  const dir = project(pool(four));
  const result = run("group.mjs", dir, ["candidates.tsv", "--traits", "traits.tsv", "--out", "out/families.json", "--sheet", "out/sheet.tsv"]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(dir, "out/families.json"), "utf8"));
  assert.equal(doc.rows, 40);
  assert.equal(doc.grouped, 40);
  const fams = doc.families.filter((f) => !f.stray);
  assert.equal(fams.length, 4, result.stdout);
  // Every member is a row id of the picker's kind, and a look's ten sit together.
  assert.ok(fams.every((f) => f.size === 10 && f.members.every((m) => /^a\d+$/.test(m)) && f.name === ""));
  const ids = fams.map((f) => f.members.map((m) => Number(m.slice(1))).sort((a, b) => a - b));
  assert.deepEqual(ids.map((m) => Math.floor((m[0] - 1) / 10) + "" + Math.floor((m[9] - 1) / 10)).sort(), ["00", "11", "22", "33"]);
  assert.equal(doc.floor.met, true);
  assert.match(result.stdout, /floor: met, 4 families of 3 or more \(need 4\)/);
  const sheet = readFileSync(join(dir, "out/sheet.tsv"), "utf8").trim().split("\n");
  assert.equal(sheet.length, 40);
  assert.match(sheet[0], /^a\d+ f\d\thttps:\/\/cdn\.example\.com\/a\d+\.jpg$/);
});

test("group: under four families the floor is not met, and says what to do", () => {
  const dir = project(pool([four[0], four[1], ["paper too", 8, 0.86, 83, 1, 2]]));
  const result = run("group.mjs", dir, ["candidates.tsv", "--traits", "traits.tsv", "--out", "families.json"]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  assert.equal(doc.floor.met, false);
  assert.equal(doc.floor.have, 2);
  assert.match(result.stdout, /floor: not met, 2 of 4 families of 3 or more/);
  assert.match(result.stdout, /search wider before the picker/);
});

test("group: a look too small beside the pool does not count, and round 2 is not asked for a floor", () => {
  // Sixty of one look and four looks of three: each of the four is under a twentieth of the pool.
  const dir = project(pool([["paper", 60, 0.85, 82, 1, 2], ["poster", 3, 0.5, 15, 60, 12], ["quiet dark", 3, 0.05, 55, 8, 6], ["dense", 3, 0.5, 30, 0, 20]]));
  const first = run("group.mjs", dir, ["candidates.tsv", "--traits", "traits.tsv", "--out", "one.json"]);
  assert.equal(first.status, 0, first.stderr);
  const one = JSON.parse(readFileSync(join(dir, "one.json"), "utf8"));
  assert.equal(one.floor.size, 4);
  assert.equal(one.floor.met, false);
  // Round 2 ids are b1…: the same rows under the round's letter, and no floor.
  const traits2 = readFileSync(join(dir, "traits.tsv"), "utf8").replace(/^a(\d+)\.jpg/gm, "b$1.jpg");
  writeFileSync(join(dir, "traits-2.tsv"), traits2);
  const second = run("group.mjs", dir, ["candidates.tsv", "--round", "2", "--traits", "traits-2.tsv", "--out", "two.json"]);
  assert.equal(second.status, 0, second.stderr);
  const two = JSON.parse(readFileSync(join(dir, "two.json"), "utf8"));
  assert.equal(two.floor, undefined);
  assert.match(second.stdout, /floor: not asked after round 1/);
  assert.ok(two.families[0].members.every((m) => /^b\d+$/.test(m)));
});

test("group: a row with no measured picture is listed as unread and is in no family", () => {
  const files = pool(four);
  files["traits.tsv"] = files["traits.tsv"].split("\n").filter((l) => !l.startsWith("a7.jpg")).join("\n");
  const dir = project(files);
  const result = run("group.mjs", dir, ["candidates.tsv", "--traits", "traits.tsv", "--out", "families.json"]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  assert.deepEqual(doc.unread, [{ id: "a7", why: "not measured" }]);
  assert.equal(doc.grouped, 39);
  assert.ok(!doc.families.some((f) => f.members.includes("a7")));
});

test("group: with no browser it stops, says so, and leaves no scratch folder behind", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const dir = project({ "candidates.tsv": "A\tone.png\nB\ttwo.png\n" });
  writeFileSync(join(dir, "one.png"), png);
  writeFileSync(join(dir, "two.png"), png);
  const scratchRoot = join(dir, "tmp");
  mkdirSync(scratchRoot);
  const result = run("group.mjs", dir, ["candidates.tsv", "--out", "families.json"], { CHROME_PATH: "none", TMPDIR: scratchRoot });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /group: measure\.mjs read nothing/);
  assert.deepEqual(readdirSync(scratchRoot), []);
  assert.equal(existsSync(join(dir, "families.json")), false);
});

test("group: rows follow the picker's rule, pictures are known by their first bytes, and the floor counts only real families", () => {
  const rows = rowsOf("# note\nA\tx.jpg\n\n#B\ty.jpg\tlink\nC\tz.jpg", "b");
  assert.deepEqual(rows.map((r) => [r.id, r.title]), [["b1", "A"], ["b2", "#B"], ["b3", "C"]]);
  assert.equal(sniff(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(16)])), ".jpg");
  assert.equal(sniff(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), ".webp");
  assert.equal(sniff(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), "");
  const fams = [100, 30, 12, 9, 3].map((size, i) => ({ id: `f${i + 1}`, size }));
  // 154 grouped: a family needs 8. Four hold that, so the floor is met; a stray never counts.
  assert.equal(floor(fams, 154).met, true);
  assert.equal(floor([...fams.slice(0, 3), { id: "strays", stray: true, size: 40 }], 185).met, false);
  assert.deepEqual(relabel({ families: [{ id: "f1", size: 2, ranges: { tone: "light", empty: "80%", loud: "1%", busy: "2" }, members: ["/x/a2.jpg", "/x/a1.png"] }] }, (s) => s.split("/").pop().replace(/\.\w+$/, "")).at(0).members, ["a2", "a1"]);
});

const candidates = ["One\thttps://cdn.example.com/1.jpg\thttps://example.com/1\tdribbble", "Two\thttps://cdn.example.com/2.jpg", "Three\thttps://cdn.example.com/3.jpg", "Four\thttps://cdn.example.com/4.jpg"].join("\n");
const families = {
  families: [
    { id: "f1", name: "Quiet <pages>", size: 2, members: ["a3", "a1"] },
    { id: "f2", size: 1, members: ["a2", "a99"] },
    { id: "strays", stray: true, size: 0, members: [] },
  ],
};

test("picker --families: tiles in groups with each group's size, marks and ids unchanged, rows in no group last", () => {
  const dir = project({ "candidates.tsv": candidates, "families.json": JSON.stringify(families) });
  const plain = run("picker.mjs", dir, ["candidates.tsv", "--out", "plain.html"]);
  const result = run("picker.mjs", dir, ["candidates.tsv", "--families", "families.json", "--out", "grouped.html"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /1 rows are in no group/);
  const html = readFileSync(join(dir, "grouped.html"), "utf8");
  const heads = [...html.matchAll(/<h2>(.*?) <span class="n">(\d+)<\/span>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(heads, [["Quiet &lt;pages&gt;", "2"], ["Group 1", "1"], ["Not grouped", "1"]]);
  // Each tile once, in its group's order, with the id its row number gives it.
  assert.deepEqual([...html.matchAll(/data-id="(a\d+)"/g)].map((m) => m[1]), ["a3", "a1", "a2", "a4"]);
  assert.match(html, /data-id="a3" data-title="Three"/);
  assert.equal(html.match(/<figure class="tile"/g).length, 4);
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  writeFileSync(join(dir, "page.js"), js);
  assert.equal(spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" }).status, 0);
  // Without the flag the page is the one grid it always was.
  const flat = readFileSync(join(dir, "plain.html"), "utf8");
  assert.equal(plain.status, 0);
  assert.doesNotMatch(flat, /class="group"|\.group/);
  assert.deepEqual([...flat.matchAll(/data-id="(a\d+)"/g)].map((m) => m[1]), ["a1", "a2", "a3", "a4"]);
});

test("picker --families: a file it cannot read stops the page rather than ungrouping it quietly", () => {
  const dir = project({ "candidates.tsv": candidates, "families.json": "not json" });
  const bad = run("picker.mjs", dir, ["candidates.tsv", "--families", "families.json", "--out", "p.html"]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /cannot read families at families\.json/);
  const missing = run("picker.mjs", dir, ["candidates.tsv", "--families", "nope.json", "--out", "p.html"]);
  assert.equal(missing.status, 1);
  assert.equal(existsSync(join(dir, "p.html")), false);
});
