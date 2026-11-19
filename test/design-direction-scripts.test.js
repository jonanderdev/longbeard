import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scripts = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-direction/scripts");

// A project outside any git tree, so the scripts resolve paths against it.
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-direction-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function run(script, dir, args) {
  const result = spawnSync(process.execPath, [join(scripts, script), ...args], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

const card = (name, extra = "") => `### ${name}
- link: https://example.com/${encodeURIComponent(name)}
- shot: design-exploration/identity/refs/${name.length}.jpg
- pattern: ${name}
- why: fits
${extra}`;

function board(cards) {
  const files = { "design-exploration/identity/board.md": `# Board\n\n${cards.join("\n")}` };
  for (const text of cards) files[text.match(/- shot: (.*)/)[1]] = "jpg";
  return files;
}

test("moodboard: one tile per card with a shot, its name linked to its source", () => {
  const seed = card("Seed").replace(/- link: .*/, "- link: none (shared in chat)");
  const dir = project(board([card("Ledger, ruled & plain"), seed]));
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "design-exploration/identity/moodboard.html"]);
  const html = readFileSync(join(dir, "design-exploration/identity/moodboard.html"), "utf8");
  assert.equal(html.match(/<figure class="tile"/g)?.length, 2);
  assert.match(html, /<a class="name" href="https:\/\/example\.com\/Ledger/);
  assert.match(html, /<span class="name">Seed<\/span>/);
  assert.match(html, /<img src="\.\/refs\/4\.jpg" alt="Seed"/);
  assert.match(html, /class="line">Seed</);
  assert.equal(html.match(/<button type="button" data-mark="lead"/g)?.length, 2);
  assert.equal(html.match(/class="why"/g)?.length, 2);
});

test("moodboard: a card's measured traits show small under its pattern", () => {
  const dir = project(board([card("Quiet", "- measured: light · empty 64% · loud 2%\n"), card("Loud")]));
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  const html = readFileSync(join(dir, "m.html"), "utf8");
  assert.equal(html.match(/<p class="measured">/g)?.length, 1);
  assert.match(html, /<p class="measured">light · empty 64% · loud 2%<\/p>/);
});

test("moodboard: tiles group by topic, parts of a site first, then others, then Other", () => {
  const dir = project(
    board([
      card("Aa", "- topic: Pricing"),
      card("Bbb", "- topic: nav"),
      card("Cccc"),
      card("Ddddd", "- topic: home"),
    ]),
  );
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  const html = readFileSync(join(dir, "m.html"), "utf8");
  const parts = [...html.matchAll(/<h2>([^<]+) <span>/g)].map((m) => m[1]);
  assert.deepEqual(parts, ["Home", "Navigation", "Pricing", "Other"]);
  assert.match(html, /data-id="m2" data-title="Bbb" data-topic="Navigation"/);
});

test("moodboard: a card with recorded frames plays them, and needs no shot", () => {
  const files = {
    "design-exploration/identity/board.md": `### Intro\n- link: https://example.com\n- frames: design-exploration/identity/refs/intro/\n- topic: motion\n`,
    "design-exploration/identity/refs/intro/01-00000ms.jpg": "jpg",
    "design-exploration/identity/refs/intro/02-00480ms.jpg": "jpg",
  };
  const dir = project(files);
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "design-exploration/identity/moodboard.html"]);
  const html = readFileSync(join(dir, "design-exploration/identity/moodboard.html"), "utf8");
  assert.match(html, /<img src="\.\/refs\/intro\/02-00480ms\.jpg"/);
  assert.match(html, /data-frames="\[\{&quot;src&quot;:&quot;\.\/refs\/intro\/01-00000ms\.jpg&quot;,&quot;ms&quot;:0\}/);
  assert.match(html, /&quot;ms&quot;:480/);
  assert.match(html, /class="play"/);
});

test("moodboard: its page script parses", () => {
  const dir = project(board([card("Kept")]));
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  const js = readFileSync(join(dir, "m.html"), "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
});

test("moodboard: a missing shot is named and skipped", () => {
  const files = board([card("Kept")]);
  files["design-exploration/identity/board.md"] += `\n${card("Gone").replace(/shot: .*/, "shot: design-exploration/identity/refs/gone.jpg")}`;
  const dir = project(files);
  const result = run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  assert.match(result.stderr, /missing shot design-exploration\/identity\/refs\/gone\.jpg/);
  assert.equal(readFileSync(join(dir, "m.html"), "utf8").match(/<figure class="tile"/g)?.length, 1);
});

const candidates = (rows) => ({ "design-exploration/identity/candidates.tsv": rows.join("\n") });
const pick = (dir, extra = []) =>
  run("picker.mjs", dir, ["design-exploration/identity/candidates.tsv", "--out", "design-exploration/identity/picker.html", ...extra]);
const pickerHtml = (dir) => readFileSync(join(dir, "design-exploration/identity/picker.html"), "utf8");

test("picker: one tile per row from any source, ids by row number, linked to the source", () => {
  const dir = project(
    candidates([
      "# comment, not a row",
      "Ledger app\thttps://cdn.dribbble.com/a.png?resize=400x300\thttps://dribbble.com/shots/1-ledger\tdribbble\tana · 300 likes",
      "Field notes\thttps://assets.awwwards.com/b.jpg\thttps://www.awwwards.com/sites/field\tawwwards",
      "No link\thttps://cdn.recent.design/c.webp\t\trecent",
    ]),
  );
  pick(dir);
  const html = pickerHtml(dir);
  assert.equal(html.match(/<figure class="tile"/g)?.length, 3);
  assert.match(html, /data-id="a1" data-title="Ledger app"/);
  assert.match(html, /data-id="a3" data-title="No link"/);
  assert.match(html, /<a class="name" href="https:\/\/www\.awwwards\.com\/sites\/field"/);
  assert.match(html, /<span class="name" title="No link">No link<\/span>/);
  assert.match(html, /<span class="src">recent<\/span>/);
  assert.match(html, /<span class="meta">ana · 300 likes<\/span>/);
});

test("picker: scraped text is escaped, and only http links become links", () => {
  const dir = project(
    candidates(['<script>alert(1)</script>"x\thttps://cdn.example.com/a.jpg\tjavascript:alert(1)\tawwwards']),
  );
  pick(dir);
  const html = pickerHtml(dir);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;&quot;x/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test("picker: a seed starts liked and may use a project file; round 2 uses b ids", () => {
  const files = candidates([
    "Their screenshot\tdesign-exploration/identity/refs/seed.jpg\t\tseed",
    "Gone\tdesign-exploration/identity/refs/missing.jpg\t\tseed",
    "Shot\thttps://cdn.example.com/a.jpg\thttps://example.com/a\tdribbble",
  ]);
  files["design-exploration/identity/refs/seed.jpg"] = "jpg";
  const dir = project(files);
  const result = pick(dir, ["--round", "2"]);
  const html = pickerHtml(dir);
  assert.match(html, /data-id="b1" data-title="Their screenshot" data-seed="1"/);
  assert.match(html, /<img src="\.\/refs\/seed\.jpg"/);
  assert.match(result.stderr, /b2 has no image/);
  assert.match(html, /data-id="b3"/);
  assert.match(html, /Pick, round 2/);
});

test("picker: its page script parses", () => {
  const dir = project(candidates(["Shot\thttps://cdn.example.com/a.jpg\thttps://example.com/a\tdribbble"]));
  pick(dir);
  const js = pickerHtml(dir).match(/<script>([\s\S]*?)<\/script>/)[1];
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
});

test("picker: wrong usage exits 2", () => {
  const dir = project({});
  const result = spawnSync(process.execPath, [join(scripts, "picker.mjs"), "x.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 2);
});

test("families: splits on measured traits, keeps light and dark of one look together, and writes a board skeleton", () => {
  const head = "ref\ttone\tlum\tempty\tloud\tbusy\tground\tdisplay\tbody\tscale\tpictures\tmargin\tradius";
  const row = (name, lum, empty, loud, busy) => `refs/${name}.jpg\t\t${lum}\t${empty}\t${loud}\t${busy}\t#000000\t\t\t\t\t\t`;
  const rows = [];
  for (let i = 0; i < 8; i++) rows.push(row(`paper${i}`, 0.85, 80 + i, 1, 2));
  for (let i = 0; i < 7; i++) rows.push(row(`night${i}`, 0.01, 81 + i, 1, 2));
  for (let i = 0; i < 6; i++) rows.push(row(`poster${i}`, 0.5, 20 + i, 60, 12));
  const dir = project({ "traits.tsv": [head, ...rows].join("\n") });
  const result = run("families.mjs", dir, ["traits.tsv", "--board", "board.md"]);
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  const groups = families.filter((f) => !f.stray).map((f) => [...new Set(f.members.map((m) => m.replace(/^refs\/|\d*\.jpg$/g, "")))].sort().join(","));
  // The same look on a light and a dark ground is one family; the posters are another.
  assert.deepEqual(groups.sort(), ["night,paper", "poster"], result.stdout);
  assert.equal(families.find((f) => f.stray), undefined);
  assert.match(result.stdout, /21 references, 2 families .* spread 0.52 \(0.48 → \d+, 0.56 → \d+\)/);
  const board = readFileSync(join(dir, "board.md"), "utf8");
  assert.match(board, /^Families: f1 \(/);
  assert.equal(board.match(/^### /gm).length, 21);
  assert.match(board, /- measured: light · empty 8\d% · loud 1% · busy 2/);
  assert.match(readFileSync(join(dir, "families/f1.tsv"), "utf8"), /\t\/.+\.jpg/);
  // A skeleton never overwrites a board.
  const again = spawnSync(process.execPath, [join(scripts, "families.mjs"), "traits.tsv", "--board", "board.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(again.status, 1);
});

test("families: numbers far apart split even when the tags agree, an untagged reference is named, and two shots of one site are one", () => {
  const refs = {};
  const base = (name, empty, loud, colours, extra = {}) => ({ ...profile(name, { lum: 0.9, empty, loud, picture: "none", layout: "centred", colours }), ...extra });
  for (let i = 0; i < 4; i++) refs[`quiet${i}`] = base(`quiet${i}`, 90 + i, 0, 3);
  for (let i = 0; i < 4; i++) refs[`loud${i}`] = base(`loud${i}`, 10 + i, 80, 400);
  refs.site = base("site", 91, 0, 3, { link: "https://example.com/" });
  refs["site-menu"] = base("site-menu", 60, 0, 3, { link: "https://example.com/" });
  refs.bare = { ...base("bare", 92, 0, 3) };
  delete refs.bare.tags;
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  const result = run("families.mjs", dir, ["profiles.json", "--board", "board.md"]);
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  const groups = families.filter((f) => !f.stray).map((f) => [...new Set(f.members.map((m) => m.replace(/^refs\/|\d*\.jpg$/g, "")))].sort().join(","));
  assert.ok(groups.some((g) => g.startsWith("loud") && !g.includes("quiet")), result.stdout);
  assert.ok(groups.some((g) => g.includes("quiet") && !g.includes("loud")), result.stdout);
  assert.match(result.stdout, /1 more shots of the same sites folded in/);
  assert.match(readFileSync(join(dir, "board.md"), "utf8"), /### site\n[\s\S]*?- also: site-menu/);
  assert.match(result.stdout, /untagged, compared on their numbers only.*bare/);
});

test("moodboard --overview: a few tiles per family, its ranges, and one Take per family", () => {
  const cards = [];
  for (let i = 0; i < 9; i++) cards.push(card(`Paper ${i}`, "- topic: f1\n"));
  for (let i = 0; i < 3; i++) cards.push(card(`Night ${i}`, "- topic: f2\n"));
  const files = board(cards);
  files["design-exploration/identity/board.md"] = files["design-exploration/identity/board.md"].replace("# Board", "Families: f1 (light · empty 80–88%) — 9; f2 (dark) — 3");
  const dir = project(files);
  run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--overview", "6", "--out", "f.html"]);
  const html = readFileSync(join(dir, "f.html"), "utf8");
  assert.match(html, /<body data-overview>/);
  assert.equal(html.match(/<figure class="tile"/g).length, 9);
  assert.equal(html.match(/class="fam"/g).length, 2);
  assert.match(html, /<p class="ranges">light · empty 80–88%<\/p>/);
  assert.match(html, /\+3 more not shown/);
});


// Profiles for families.mjs: a picture's traits and figure, and the agent's tags.
function profile(name, { lum, empty, loud = 1, busy = 2, picture, layout, colours = 20, soft = 20, sharp = 30, grid = 30 }) {
  return {
    shot: `refs/${name}.jpg`,
    link: null,
    image: {
      traits: { tone: lum > 0.6 ? "light" : lum < 0.12 ? "dark" : "mid", lum, empty, loud, busy, ground: "#000000" },
      figure: { share: 100 - empty, colours, colourful: 20, grey: 50, flat: 100 - soft - sharp, soft, sharp, texture: 10, palette: [], grid: new Array(24).fill(grid) },
    },
    page: null,
    tags: { picture: [picture], photo: [picture === "photo" ? "colour" : "none"], type: ["sans"], weight: ["regular"], layout: [layout], colour: ["neutral"], surface: ["flat"], scale: ["heading"] },
  };
}

test("tag: checks every word against the vocabulary, then merges the rows and their notes", () => {
  const refs = { a: profile("a", { lum: 0.9, empty: 80, picture: "none", layout: "left" }), b: profile("b", { lum: 0.9, empty: 80, picture: "none", layout: "left" }) };
  delete refs.a.tags;
  delete refs.b.tags;
  const dir = project({ "profiles.json": JSON.stringify({ refs }), "bad.tsv": "a\tphoto\tcolour\tsans\tregular\tcentred\tneutral\tshiny\tquiet\n", "good.tsv": "name\tpicture\tphoto\ttype\tweight\tlayout\tcolour\tsurface\tscale\na\trender+lettering\tnone\tdisplay\tblack\tcentred\tmulti\tchrome\thuge\tchrome 3D wordmark\n" });
  const bad = spawnSync(process.execPath, [join(scripts, "tag.mjs"), "profiles.json", "bad.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /surface "shiny"/);
  assert.equal(JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs.a.tags, undefined);
  const good = run("tag.mjs", dir, ["profiles.json", "good.tsv"]);
  assert.match(good.stdout, /tagged 1, 1 left untagged/);
  const a = JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs.a;
  assert.deepEqual(a.tags.picture, ["render", "lettering"]);
  assert.deepEqual(a.tags.scale, ["huge"]);
  assert.equal(a.note, "chrome 3D wordmark");
});

test("tag: a picture tagged in one exploration is tagged in the next without a sheet", () => {
  const untagged = (shot) => ({ shot, image: { traits: {} }, page: null });
  const dir = project({
    "design-exploration/identity/refs/a.jpg": "same bytes",
    "design-exploration/identity-2/refs/z.jpg": "same bytes",
    "design-exploration/identity/profiles.json": JSON.stringify({ refs: { a: untagged("design-exploration/identity/refs/a.jpg") } }),
    "design-exploration/identity-2/profiles.json": JSON.stringify({ refs: { z: untagged("design-exploration/identity-2/refs/z.jpg") } }),
    "tags.tsv": "a\tphoto\tcolour\tserif\tregular\tleft\tneutral\tflat\theading\twarm studio light\n",
  });
  run("tag.mjs", dir, ["design-exploration/identity/profiles.json", "tags.tsv"]);
  const again = run("tag.mjs", dir, ["design-exploration/identity-2/profiles.json", "--sheets", "sheets"]);
  assert.match(again.stdout, /1 tagged before, from the cache/);
  assert.match(again.stdout, /every reference is tagged/);
  const z = JSON.parse(readFileSync(join(dir, "design-exploration/identity-2/profiles.json"), "utf8")).refs.z;
  assert.deepEqual([z.tags.picture, z.note], [["photo"], "warm studio light"]);
});

test("figma-board: lists sections and cards, then after a read only what changed is read again", () => {
  const meta = (cards) => `<canvas id="0:1" name="Moodboard"><section id="1:1" name="Type" x="0" y="0" width="2000" height="1000">${cards.type}</section><section id="1:2" name="Motion &amp; 3D" x="0" y="1200" width="2000" height="1000">${cards.motion}</section></canvas>`;
  const frame = (id, name, w = 400) => `<frame id="${id}" name="${name}" x="0" y="0" width="${w}" height="300"><rectangle id="${id}9" name="image" x="0" y="0" width="${w}" height="300"/></frame>`;
  const before = { type: frame("2:1", "kiln") + frame("2:2", "dust"), motion: frame("3:1", "orbit") };
  const dir = project({
    "meta.xml": meta(before),
    // The second read comes as the JSON the tool returned: one card resized, one added, one gone.
    "meta.json": JSON.stringify([{ type: "text", text: meta({ type: frame("2:1", "kiln") + frame("2:2", "dust", 500), motion: frame("3:2", "loop") }) }]),
    "design-exploration/identity/refs/kiln.jpg": "kiln",
    "cards.tsv": "2:1\tdesign-exploration/identity/refs/kiln.jpg\n2:2\tdrop\toff-topic\n3:1\tdrop\tbroken\n",
  });
  const first = run("figma-board.mjs", dir, ["meta.xml", "--board", "abc:0-1"]);
  assert.match(first.stdout, /2 sections, 3 cards; not read before/);
  assert.match(first.stdout, /1:2\tMotion & 3D\t2000x1000\t1\tnew/);
  assert.match(first.stdout, /to read: 3 cards in 2 sections/);
  const bad = spawnSync(process.execPath, [join(scripts, "figma-board.mjs"), "meta.xml", "--board", "abc:0-1", "--done", "meta.xml"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(run("figma-board.mjs", dir, ["meta.xml", "--board", "abc:0-1", "--done", "cards.tsv"]).stdout, /3 cards known, 1 kept, 2 dropped; 0 not read yet/);
  assert.match(run("figma-board.mjs", dir, ["meta.xml", "--board", "abc:0-1"]).stdout, /nothing to read/);
  const second = run("figma-board.mjs", dir, ["meta.json", "--board", "abc:0-1"]).stdout;
  assert.match(second, /1:1\tType\t2000x1000\t2\tchanged: 1 new or edited, 0 gone/);
  assert.match(second, /1:2\tMotion & 3D\t2000x1000\t1\tnew/);
  assert.deepEqual(second.split("card\tname")[1].trim().split("\n").slice(1).map((l) => l.split("\t")[0]), ["2:2", "3:2"]);
  const reuse = run("figma-board.mjs", dir, ["meta.json", "--board", "abc:0-1", "--reuse", "design-exploration/identity-2/refs"]).stdout;
  assert.match(reuse, /reused 1 keeps/);
  assert.equal(readFileSync(join(dir, "design-exploration/identity-2/refs/kiln.jpg"), "utf8"), "kiln");
});

test("library: the numbers come from the profiles, only words are left to write, and deal refuses it until they are", () => {
  const withPage = (name, size, colour) => ({
    shot: `refs/${name}.jpg`,
    image: { traits: { tone: "light", empty: 60, loud: 3, ground: "#f4ecdc" }, common: [{ colour: "#f4ecdc", share: 60 }, { colour: "#111111", share: 20 }], loud: [{ colour: "#d20401", share: 3 }] },
    page: { flag: "", ground: "rgb(244, 236, 220)", traits: { scale: 6, pictures: 30, margin: 3, radius: "0px", body: "16px" }, gradients: [], patterns: [{ css: "radial-gradient(#000 1px, transparent 1px)" }], texts: [{ face: "Fraunces", size, weight: "300", style: "italic", tracking: "-1.5px", case: "none", colour, leading: "normal" }, { face: "Inter", size: "16px", weight: "400", style: "normal", tracking: "normal", case: "none", colour, leading: "24px" }] },
  });
  const pictureOnly = { shot: "refs/c.jpg", image: { traits: { tone: "light", empty: 70, loud: 0, ground: "#ffffff" }, common: [{ colour: "#ffffff", share: 70 }, { colour: "#222222", share: 10 }], loud: [] }, page: null };
  const dir = project({ "profiles.json": JSON.stringify({ refs: { a: withPage("a", "96px", "rgb(17, 17, 17)"), b: withPage("b", "120px", "rgb(32, 32, 32)"), c: pictureOnly } }) });
  const made = run("library.mjs", dir, ["profiles.json", "--anchor", "a", "--donors", "b,c", "--out", "library.json"]);
  assert.match(made.stdout, /from a and 2 donors; \d+ fields to write; picture only, type by eye: c/);
  const lib = JSON.parse(readFileSync(join(dir, "library.json"), "utf8"));
  assert.deepEqual([lib.family.tone, lib.family.empty, lib.family.scale, lib.family.radius, lib.family.from], ["light", "60–70%", "6", "0px", ["a", "b", "c"]]);
  const [ta, , tc] = lib.type;
  assert.deepEqual([ta.face, ta.by, ta.weight, ta.italic, ta.tracking, ta.size, ta.body], ["Fraunces", "page", 300, true, "-1.5px", "96px", { face: "Inter", size: "16px", leading: "24px" }]);
  assert.deepEqual([tc.by, tc.size], ["eye", null]);
  assert.deepEqual(lib.grounds.map((g) => [g.ground, g.ink]), [["#f4ecdc", "#111111"], ["#f4ecdc", "#202020"], ["#ffffff", "#222222"]]);
  assert.match(lib.grounds[0].pattern, /radial-gradient/);
  assert.deepEqual(lib.accents.map((a) => a.colour), ["#d20401", "#d20401", null]);
  const again = spawnSync(process.execPath, [join(scripts, "library.mjs"), "profiles.json", "--anchor", "a", "--donors", "b", "--out", "library.json"], { cwd: dir, encoding: "utf8" });
  assert.equal(again.status, 1);
  const checked = spawnSync(process.execPath, [join(scripts, "library.mjs"), "library.json", "--check"], { cwd: dir, encoding: "utf8" });
  assert.equal(checked.status, 1);
  assert.match(checked.stdout, /arrangements\[0\]\.what: one sentence/);
  const dealt = spawnSync(process.execPath, [join(scripts, "../../design/scripts/deal.mjs"), "library.json"], { cwd: dir, encoding: "utf8" });
  assert.equal(dealt.status, 1);
  assert.match(dealt.stderr, /fields to write/);
  const written = JSON.parse(JSON.stringify(lib).replace(/"WRITE:[^"]*"/g, (_, i) => `"w${i}"`));
  writeFileSync(join(dir, "library.json"), JSON.stringify(written));
  assert.match(run("library.mjs", dir, ["library.json", "--check"]).stdout, /every field is written/);
});

test("status: says where each exploration stopped, from its files", () => {
  const dir = project({
    "design-exploration/identity/profiles.json": JSON.stringify({ refs: { a: { tags: {} }, b: {} } }),
    "design-exploration/identity-2/library.json": JSON.stringify({ arrangements: [{ what: "WRITE: one sentence" }] }),
    "design-exploration/pricing/direction.md": "# Direction",
    "design-exploration/.cache/images/x.json": "{}",
  });
  const out = run("status.mjs", dir, []).stdout;
  assert.match(out, /^identity: 2 measured, 1 to tag/m);
  assert.match(out, /^identity-2: library prefilled, 1 fields to write/m);
  assert.match(out, /^pricing: direction written/m);
  assert.doesNotMatch(out, /\.cache/);
  assert.match(run("status.mjs", project({}), []).stdout, /no explorations yet/);
});

test("families: from profiles, what the picture is separates references the numbers alone would join", () => {
  const refs = {};
  // Three looks with the same tone and emptiness: photographs, 3D renders, and type alone on the ground.
  for (let i = 0; i < 5; i++) refs[`photo${i}`] = profile(`photo${i}`, { lum: 0.02, empty: 60 + i, picture: "photo", layout: "full-bleed", colours: 150, soft: 30, sharp: 35, grid: 70 });
  // The renders are on dark and on light grounds: the same look, one family, its grounds dealt later.
  for (let i = 0; i < 4; i++) refs[`render${i}`] = profile(`render${i}`, { lum: i < 2 ? 0.02 : 0.95, empty: 61 + i, picture: "render", layout: "scattered", colours: 300, soft: 50, sharp: 20, grid: 35 });
  for (let i = 0; i < 4; i++) refs[`type${i}`] = profile(`type${i}`, { lum: 0.02, empty: 62 + i, picture: "none", layout: "left", colours: 6, soft: 2, sharp: 60, grid: 10 });
  refs.pairA = profile("pairA", { lum: 0.95, empty: 30, loud: 60, picture: "collage", layout: "collage", colours: 200 });
  refs.pairB = profile("pairB", { lum: 0.95, empty: 31, loud: 61, picture: "collage", layout: "collage", colours: 200 });
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  const result = run("families.mjs", dir, ["profiles.json", "--board", "board.md"]);
  // The pair is its own group on the board, to be taken as a seed.
  assert.equal(readFileSync(join(dir, "board.md"), "utf8").match(/- topic: Pair 1/g).length, 2);
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  const groups = families.filter((f) => !f.stray).map((f) => [...new Set(f.members.map((m) => m.replace(/^refs\/|\d*\.jpg$/g, "")))].join(","));
  assert.deepEqual(groups.sort(), ["photo", "render", "type"], result.stdout);
  const strays = families.find((f) => f.stray);
  assert.deepEqual(strays.pairs, [["refs/pairA.jpg", "refs/pairB.jpg"]]);
  assert.match(result.stdout, /pairs, each a family seed: pairA\+pairB/);
  assert.match(result.stdout, /render · scattered · heading · sans · neutral · flat \| dark and light/);
});

test("families: a page that is not the real site is named and left out; its reference is sorted on its picture", () => {
  const refs = {};
  for (let i = 0; i < 4; i++) refs[`quiet${i}`] = profile(`quiet${i}`, { lum: 0.9, empty: 90 + i, picture: "none", layout: "centred", colours: 3 });
  refs.quiet0.page = { url: "https://example.com/", flag: "HTTP 503", traits: { display: "12px", scale: 1, pictures: 0, align: "left" }, media: { canvas: 90 } };
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  const result = run("families.mjs", dir, ["profiles.json"]);
  assert.match(result.stdout, /pages that may not be the real site.*quiet0 \(HTTP 503\)/);
  assert.doesNotMatch(result.stdout, /video or canvas/);
});

test("families --sliders: each family is placed on the sliders they answered, and one far off is said", () => {
  const refs = {};
  // Quiet type-only pages, and loud picture pages.
  for (let i = 0; i < 4; i++) refs[`type${i}`] = profile(`type${i}`, { lum: 0.95, empty: 92 + i, loud: 0, picture: "none", layout: "left", colours: 3 });
  for (let i = 0; i < 4; i++) refs[`poster${i}`] = profile(`poster${i}`, { lum: 0.5, empty: 30 + i, loud: 40, picture: "photo", layout: "full-bleed", colours: 300 });
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  const result = run("families.mjs", dir, ["profiles.json", "--sliders", "loud=1,picture=1"]);
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  const typeFamily = families.find((f) => f.members.some((m) => m.includes("type0")));
  const posterFamily = families.find((f) => f.members.some((m) => m.includes("poster0")));
  assert.equal(typeFamily.fit, "near what they asked");
  assert.ok(typeFamily.sliders.loud < 1.5 && typeFamily.sliders.picture === 1, JSON.stringify(typeFamily.sliders));
  assert.match(posterFamily.fit, /off on loud .*picture-led/);
  assert.match(result.stdout, /sliders asked: quiet–loud 1, type-led–picture-led 1/);
  // Half the pool is loud photo posters: what they chose sits away from "type-led", and that is one question.
  assert.match(result.stdout, /what they chose sits at: loud [\d.]+, picture [\d.]+; away from what they said on .*picture-led \(3, asked 1\): ask which should lead/);
  const bad = spawnSync(process.execPath, [join(scripts, "families.mjs"), "profiles.json", "--sliders", "loud=9"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /each 1 to 5/);
});
