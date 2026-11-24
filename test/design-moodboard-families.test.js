import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const skills = join(dirname(fileURLToPath(import.meta.url)), "../skills");
// Each script lives in the skill that owns it: moodboard's picker and board, families' sorting.
const owner = { "families.mjs": "design-families", "tag.mjs": "design-families", "measure.mjs": "design-families" };
const script = (name) => join(skills, owner[name] || "design-moodboard", "scripts", name);

// A project outside any git tree, so the scripts resolve paths against it.
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-direction-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function run(name, dir, args) {
  const result = spawnSync(process.execPath, [script(name), ...args], { cwd: dir, encoding: "utf8" });
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

test("moodboard: a shot given as a URL is shown from that URL", () => {
  const files = board([card("Kept")]);
  files["design-exploration/identity/board.md"] += `\n${card("Pin").replace(/shot: .*/, "shot: https://i.example.com/originals/a b.jpg?x=1&y=2")}`;
  const dir = project(files);
  const result = run("moodboard.mjs", dir, ["design-exploration/identity/board.md", "--out", "m.html"]);
  assert.doesNotMatch(result.stderr, /missing shot/);
  const html = readFileSync(join(dir, "m.html"), "utf8");
  assert.equal(html.match(/<figure class="tile"/g)?.length, 2);
  assert.match(html, /<img src="https:\/\/i\.example\.com\/originals\/a b\.jpg\?x=1&amp;y=2" alt="Pin"/);
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
  const result = spawnSync(process.execPath, [script("picker.mjs"), "x.tsv"], { cwd: dir, encoding: "utf8" });
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
  assert.match(result.stdout, /21 references, 2 families .* spread 0.52 \(0.48 → \d+, largest \d+, 0.56 → \d+, largest \d+\)/);
  const board = readFileSync(join(dir, "board.md"), "utf8");
  assert.match(board, /^Families: f1 \(/);
  assert.equal(board.match(/^### /gm).length, 21);
  assert.match(board, /- measured: light · empty 8\d% · loud 1% · busy 2/);
  assert.match(readFileSync(join(dir, "families/f1.tsv"), "utf8"), /\t\/.+\.jpg/);
  // A skeleton never overwrites a board.
  const again = spawnSync(process.execPath, [script("families.mjs"), "traits.tsv", "--board", "board.md"], { cwd: dir, encoding: "utf8" });
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

test("moodboard --overview: a few tiles per family, its ranges, and a note per family, never a Take", () => {
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
  assert.equal(html.match(/class="fam-note"/g).length, 2);
  assert.doesNotMatch(html, /Take this family|class="fam"/);
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
  const bad = spawnSync(process.execPath, [script("tag.mjs"), "profiles.json", "bad.tsv"], { cwd: dir, encoding: "utf8" });
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

test("tag: a header row names its columns, merges the about fields into about and motion into tags, and refuses a bad about word by its field", () => {
  const refs = { a: profile("a", { lum: 0.9, empty: 80, picture: "none", layout: "left" }), b: profile("b", { lum: 0.9, empty: 80, picture: "none", layout: "left" }) };
  delete refs.a.tags;
  delete refs.b.tags;
  refs.b.about = { hue: ["red"] };
  const head = "name\tformat\tscale\tpicture\tphoto\ttype\tweight\tlayout\tcolour\tsurface\tmotion\tdomain\tmood\tdensity\thue\tnote\n";
  const dir = project({
    "profiles.json": JSON.stringify({ refs }),
    "bad.tsv": `${head}a\tweb-hero\thuge\tlettering\tnone\tcondensed\tblack\tedge-type\tpastel\tflat\tkinetic\tfintech\tbold\tairy\t\t\n`,
    "good.tsv": `${head}a\tweb-hero+poster\thuge\tlettering\tnone\tcondensed+outline\tblack\tedge-type\tpastel\tflat\tkinetic\ttech-saas\tbold\tairy\t\tmoving outline type\nb\t\theading\tnone\tnone\tsans\tregular\tleft\tdark\tflat\t\t\tcalm\t\t\t\n`,
  });
  const bad = spawnSync(process.execPath, [script("tag.mjs"), "profiles.json", "bad.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /a domain "fintech": use portfolio/);
  assert.equal(JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs.a.tags, undefined);
  const good = run("tag.mjs", dir, ["profiles.json", "good.tsv"]);
  assert.match(good.stdout, /tagged 2, 0 left untagged/);
  const { a, b } = JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs;
  assert.deepEqual(a.about, { format: ["web-hero", "poster"], domain: ["tech-saas"], mood: ["bold"], density: ["airy"] });
  assert.deepEqual(a.tags.type, ["condensed", "outline"]);
  assert.deepEqual(a.tags.motion, ["kinetic"]);
  assert.equal(a.tags.format, undefined);
  assert.equal(a.note, "moving outline type");
  // Empty cells are not given: b keeps its hue, and has no motion.
  assert.deepEqual(b.about, { hue: ["red"], mood: ["calm"] });
  assert.equal(b.tags.motion, undefined);
  assert.deepEqual(b.tags.colour, ["dark"]);
  // The look fields stay required under a header.
  writeFileSync(join(dir, "short.tsv"), "name\tpicture\tformat\na\tphoto\tposter\n");
  const short = spawnSync(process.execPath, [script("tag.mjs"), "profiles.json", "short.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(short.status, 1);
  assert.match(short.stderr, /header has no photo, type, weight, layout, colour, surface, scale/);
});

test("tag: an old row of name and the eight look fields still merges, with no header", () => {
  const refs = { a: profile("a", { lum: 0.9, empty: 80, picture: "none", layout: "left" }) };
  delete refs.a.tags;
  const dir = project({ "profiles.json": JSON.stringify({ refs }), "old.tsv": "a\tphoto\tduotone\tdisplay\tbold\tsplit\tmuted\tgrain\tlarge\n" });
  const result = run("tag.mjs", dir, ["profiles.json", "old.tsv"]);
  assert.match(result.stdout, /tagged 1, 0 left untagged/);
  const { a } = JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs;
  assert.deepEqual(a.tags, { picture: ["photo"], photo: ["duotone"], type: ["display"], weight: ["bold"], layout: ["split"], colour: ["muted"], surface: ["grain"], scale: ["large"] });
  assert.equal(a.about, undefined);
});

test("tag: a header or a stored profile that still says subject is read as shows", () => {
  const refs = { a: profile("a", { lum: 0.9, empty: 80, picture: "none", layout: "left" }), b: profile("b", { lum: 0.9, empty: 80, picture: "none", layout: "left" }) };
  delete refs.a.tags;
  refs.b.about = { subject: ["cutout"], mood: ["calm"] };
  const head = "name\tpicture\tphoto\ttype\tweight\tlayout\tcolour\tsurface\tscale";
  const row = "photo\tduotone\tdisplay\tweight:bold\tsplit\tmuted\tgrain\tlarge".replace("weight:bold", "bold");
  const dir = project({ "profiles.json": JSON.stringify({ refs }), "old.tsv": `${head}\tsubject\na\t${row}\tportrait\n`, "more.tsv": `${head}\thue\nb\t${row}\tred\n` });
  assert.match(run("tag.mjs", dir, ["profiles.json", "old.tsv"]).stdout, /tagged 1/);
  assert.match(run("tag.mjs", dir, ["profiles.json", "more.tsv"]).stdout, /tagged 1/);
  const { a, b } = JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs;
  assert.deepEqual(a.about, { shows: ["portrait"] });
  assert.deepEqual(b.about, { mood: ["calm"], shows: ["cutout"], hue: ["red"] });
});

test("tag line: format then parse is the same, none left out and read back", async () => {
  const { parseTagLine, formatTagLine } = await import(pathToFileURL(script("tag.mjs")));
  const tags = { picture: ["photo", "lettering"], photo: ["mono"], type: ["serif", "mono"], weight: ["bold"], layout: ["collage"], colour: ["duotone"], surface: ["grain"], scale: ["large"], motion: ["ui"] };
  const about = { format: ["editorial"], domain: ["fashion"], mood: ["editorial", "bold"], hue: ["red"], density: ["airy"], shows: ["portrait", "close-crop"] };
  const line = formatTagLine({ tags, about });
  assert.equal(line, "photo lettering photo:mono serif type:mono weight:bold layout:collage colour:duotone grain large motion:ui · format:editorial fashion mood:editorial mood:bold red airy portrait close-crop");
  assert.deepEqual(parseTagLine(line), { tags, about, unknown: [], ambiguous: [] });
  // A none field is left out of the line, and reads back as none.
  const still = { picture: ["none"], photo: ["none"], type: ["sans"], weight: ["regular"], layout: ["left"], colour: ["neutral"], surface: ["flat"], scale: ["huge"], motion: ["none"] };
  assert.equal(formatTagLine({ tags: still, about: {} }), "sans regular left neutral flat huge");
  assert.deepEqual(parseTagLine("sans regular left neutral flat huge").tags, still);
  assert.equal(formatTagLine({ tags: {}, about: { shows: ["type-only"] } }), "type-only");
  // A profile stored under the field's first name still writes its words.
  assert.equal(formatTagLine({ tags: {}, about: { subject: ["type-only"] } }), "type-only");
  assert.throws(() => formatTagLine({ tags: { surface: ["shiny"] } }), /surface "shiny"/);
});

test("tag line: a word in two fields is refused bare and read with its field:, an unknown word is kept", async () => {
  const { parseTagLine, AMBIGUOUS } = await import(pathToFileURL(script("tag.mjs")));
  assert.deepEqual(AMBIGUOUS.toSorted(), ["bold", "collage", "duotone", "editorial", "mono", "none", "ui"]);
  const prefixed = { none: ["photo", "picture"], mono: ["type", "photo"], duotone: ["photo", "colour"], collage: ["picture", "layout"], ui: ["picture", "motion"], editorial: ["format", "mood"], bold: ["weight", "mood"] };
  for (const word of AMBIGUOUS) {
    const bare = parseTagLine(`serif ${word}`);
    assert.deepEqual(bare.ambiguous, [word], word);
    assert.deepEqual(bare.unknown, []);
    for (const field of prefixed[word]) {
      const read = parseTagLine(`${field}:${word}`);
      assert.deepEqual({ ...read.tags, ...read.about }[field], [word], `${field}:${word}`);
      assert.deepEqual([...read.ambiguous, ...read.unknown], []);
    }
  }
  // Unknown words, bare or with a field they are not in, are kept as written; · and spacing split alike.
  const odd = parseTagLine("photo  serif·fintech  scale:serif   · Calm");
  assert.deepEqual(odd.unknown, ["fintech", "scale:serif"]);
  assert.deepEqual(odd.tags.type, ["serif"]);
  assert.deepEqual(odd.about, { mood: ["calm"] });
  // The first word for a field stays first.
  assert.deepEqual(parseTagLine("render photo render").tags.picture, ["render", "photo"]);
});

test("tag: a line column fills the cells left empty, and refuses an unknown or bare ambiguous word by name", () => {
  const refs = { a: profile("a", { lum: 0.9, empty: 80, picture: "none", layout: "left" }), b: profile("b", { lum: 0.9, empty: 80, picture: "none", layout: "left" }) };
  delete refs.a.tags;
  delete refs.b.tags;
  const dir = project({
    "profiles.json": JSON.stringify({ refs }),
    "bad.tsv": "name\tline\na\tphoto serif bold split muted grain large · fintech\n",
    "good.tsv": "name\tscale\tline\tnote\na\thuge\tphoto colour serif weight:bold split muted grain kinetic · web-hero fashion calm red airy portrait\thero\nb\t\tsans regular left neutral flat quiet · type-only\t\n",
    "twice.tsv": "name\tscale\tline\na\thuge\tphoto colour serif regular split muted grain large\n",
  });
  const bad = spawnSync(process.execPath, [script("tag.mjs"), "profiles.json", "bad.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /a line: "fintech" in no field/);
  assert.match(bad.stderr, /"bold" is in weight, mood: write weight:bold or mood:bold/);
  assert.equal(JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs.a.tags, undefined);
  const twice = spawnSync(process.execPath, [script("tag.mjs"), "profiles.json", "twice.tsv"], { cwd: dir, encoding: "utf8" });
  assert.equal(twice.status, 1);
  assert.match(twice.stderr, /a scale is in its cell and in the line/);
  const good = run("tag.mjs", dir, ["profiles.json", "good.tsv"]);
  assert.match(good.stdout, /tagged 2, 0 left untagged/);
  const { a, b } = JSON.parse(readFileSync(join(dir, "profiles.json"), "utf8")).refs;
  assert.deepEqual(a.tags, { picture: ["photo"], photo: ["colour"], type: ["serif"], weight: ["bold"], layout: ["split"], colour: ["muted"], surface: ["grain"], scale: ["huge"], motion: ["kinetic"] });
  assert.deepEqual(a.about, { format: ["web-hero"], domain: ["fashion"], mood: ["calm"], hue: ["red"], density: ["airy"], shows: ["portrait"] });
  assert.equal(a.note, "hero");
  assert.deepEqual(b.tags, { picture: ["none"], photo: ["none"], type: ["sans"], weight: ["regular"], layout: ["left"], colour: ["neutral"], surface: ["flat"], scale: ["quiet"], motion: ["none"] });
  assert.deepEqual(b.about, { shows: ["type-only"] });
});

test("families: from profiles, what the picture is separates references the numbers alone would join", () => {
  const refs = {};
  // Three looks with the same tone and emptiness: photographs, 3D renders, and type alone on the ground.
  for (let i = 0; i < 5; i++) refs[`photo${i}`] = profile(`photo${i}`, { lum: 0.02, empty: 60 + i, picture: "photo", layout: "full-bleed", colours: 150, soft: 30, sharp: 35, grid: 70 });
  // The renders are on dark and on light grounds: the same look, one family, its grounds chosen later.
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
  // dense is measured from how empty a page is; playful and new are the eye's, and passed over.
  rmSync(join(dir, "families.json"));
  run("families.mjs", dir, ["profiles.json", "--sliders", "dense=1,playful=2,new=4"]);
  const dense = JSON.parse(readFileSync(join(dir, "families.json"), "utf8")).families;
  assert.equal(dense.find((f) => f.members.some((m) => m.includes("type0"))).fit, "near what they asked");
  assert.match(dense.find((f) => f.members.some((m) => m.includes("poster0"))).fit, /off on dense/);
  const bad = spawnSync(process.execPath, [script("families.mjs"), "profiles.json", "--sliders", "loud=9"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /each 1 to 5/);
});

test("families --only: sorts one family's members alone, into its own folder, leaving the pool's families as they are", () => {
  const refs = {};
  for (let i = 0; i < 4; i++) refs[`quiet${i}`] = profile(`quiet${i}`, { lum: 0.9, empty: 90 + i, loud: 0, picture: "none", layout: "centred", colours: 3 });
  for (let i = 0; i < 4; i++) refs[`loud${i}`] = profile(`loud${i}`, { lum: 0.9, empty: 10 + i, loud: 80, picture: "photo", layout: "full-bleed", colours: 400 });
  refs.other = profile("other", { lum: 0.05, empty: 50, picture: "render", layout: "left" });
  const dir = project({ "profiles.json": JSON.stringify({ refs }), "families/f9.tsv": ["quiet0", "quiet1", "quiet2", "loud0", "loud1", "loud2"].map((n) => `${n}\trefs/${n}.jpg`).join("\n") + "\n" });
  run("families.mjs", dir, ["profiles.json", "--only", "families/f9.tsv"]);
  const { families } = JSON.parse(readFileSync(join(dir, "families/f9-split/families.json"), "utf8"));
  const members = families.flatMap((f) => f.members);
  assert.equal(members.length, 6);
  assert.ok(!members.some((m) => /other|quiet3|loud3/.test(m)));
  assert.ok(families.filter((f) => !f.stray).every((f) => f.members.every((m) => /quiet/.test(m)) || f.members.every((m) => /loud/.test(m))));
  assert.ok(!existsSync(join(dir, "families.json")));
  const bad = spawnSync(process.execPath, [script("families.mjs"), "profiles.json", "--only", "quiet0,nobody"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /not in profiles.json: nobody/);
});

test("families: a bin far bigger than the other families is sorted again on its own and split, and said", () => {
  const refs = {};
  const photo = (name, empty) => profile(name, { lum: 0.9, empty, picture: "photo", layout: "full-bleed", busy: 3, soft: 30 });
  for (let i = 0; i < 40; i++) refs[`a${i}`] = photo(`a${i}`, 50 + (i % 4));
  for (let i = 0; i < 40; i++) refs[`b${i}`] = photo(`b${i}`, 88 + (i % 4));
  for (let i = 0; i < 20; i++) refs[`c${i}`] = profile(`c${i}`, { lum: 0.05, empty: 90 + (i % 3), picture: "none", layout: "centred", loud: 40, colours: 3 });
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  const result = run("families.mjs", dir, ["profiles.json"]);
  assert.match(result.stdout, /split on their own, too big for one look: a bin of 80 at [\d.]+ into 2 families/);
  assert.match(result.stdout, /0\.48 → \d+, largest \d+/);
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  const real = families.filter((f) => !f.stray);
  assert.equal(real.length, 3);
  for (const f of real) assert.equal(new Set(f.members.map((m) => m.match(/refs\/([a-c])/)[1])).size, 1, JSON.stringify(f.members.slice(0, 5)));
});

test("families --assign: new references join the families there are, the rest are seeds or strays, and families.json is left as it was", () => {
  const refs = {};
  const photo = (name, i) => profile(name, { lum: 0.02, empty: 60 + i, picture: "photo", layout: "full-bleed", colours: 150, soft: 30, sharp: 35, grid: 70 });
  const type = (name, i) => profile(name, { lum: 0.02, empty: 62 + i, picture: "none", layout: "left", colours: 6, soft: 2, sharp: 60, grid: 10 });
  for (let i = 0; i < 5; i++) refs[`photo${i}`] = photo(`photo${i}`, i);
  for (let i = 0; i < 4; i++) refs[`type${i}`] = type(`type${i}`, i);
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  run("families.mjs", dir, ["profiles.json"]);
  const before = readFileSync(join(dir, "families.json"), "utf8");
  const sorted = JSON.parse(before).families.filter((f) => !f.stray);
  assert.equal(sorted.length, 2, before);
  const familyOf = (word) => sorted.find((f) => f.members.every((m) => m.includes(word))).id;
  // The library grows: one more photo, one more type page, and three renders unlike either.
  refs.photo5 = photo("photo5", 2.5);
  refs.type4 = type("type4", 1.5);
  for (let i = 0; i < 3; i++) refs[`render${i}`] = profile(`render${i}`, { lum: 0.95, empty: 30 + i, loud: 50, picture: "render", layout: "scattered", colours: 300, soft: 50, sharp: 20, grid: 35 });
  writeFileSync(join(dir, "profiles.json"), JSON.stringify({ refs }));
  const result = run("families.mjs", dir, ["profiles.json", "--assign", "families.json"]);
  assert.match(result.stdout, /^5 new of 14 references: 2 join a family, 1 new families proposed \(3 references\), 0 strays, spread 0.52$/m);
  assert.match(result.stdout, /^assign: assign\.json$/m);
  const out = JSON.parse(readFileSync(join(dir, "assign.json"), "utf8"));
  const joined = Object.fromEntries(out.assigned.map((a) => [a.name, a]));
  assert.equal(joined.photo5.family, familyOf("photo"));
  assert.equal(joined.type4.family, familyOf("type"));
  for (const a of out.assigned) {
    assert.ok(a.confidence > 0 && a.confidence <= 1, JSON.stringify(a));
    assert.equal(a.nearest.length, 5);
    assert.ok(a.second.distance >= a.distance);
  }
  assert.deepEqual(out.seeds.map((s) => [...s.members].sort()), [["render0", "render1", "render2"]]);
  assert.equal(out.strays.length, 0);
  assert.equal(readFileSync(join(dir, "families.json"), "utf8"), before);
  // It needs profiles.json, and goes with none of --only, --board or --sliders.
  const clash = spawnSync(process.execPath, [script("families.mjs"), "profiles.json", "--assign", "families.json", "--board", "b.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /--assign does not go with --board/);
  writeFileSync(join(dir, "other.json"), JSON.stringify({ families: [{ id: "x", members: ["nobody"] }] }));
  const empty = spawnSync(process.execPath, [script("families.mjs"), "profiles.json", "--assign", "other.json"], { cwd: dir, encoding: "utf8" });
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /no family whose members are in profiles.json/);
});

test("families: a profile with no picture read is named and left out, and an off-white ground is not strongly warm", () => {
  const refs = {};
  for (let i = 0; i < 4; i++) {
    refs[`paper${i}`] = profile(`paper${i}`, { lum: 0.9, empty: 95, picture: "none", layout: "centred", colours: 3 });
    refs[`paper${i}`].image.traits.ground = "#f1ede4";
  }
  refs.noimage = { shot: "refs/noimage.jpg", link: null, page: null };
  refs.notraits = { shot: "refs/notraits.jpg", image: { figure: null } };
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  const result = run("families.mjs", dir, ["profiles.json", "--sliders", "cool=3"]);
  assert.match(result.stderr, /left out, no picture read in profiles\.json.*: noimage, notraits/);
  assert.match(result.stdout, /^4 references/);
  // Warm or cool is read from chroma: a ground a little off white leans warm, but only a little.
  const { families } = JSON.parse(readFileSync(join(dir, "families.json"), "utf8"));
  assert.ok(families[0].sliders.cool > 2.4 && families[0].sliders.cool < 3, JSON.stringify(families[0].sliders));
});

test("families: an about layer on every profile changes nothing", () => {
  const refs = {};
  for (let i = 0; i < 5; i++) refs[`photo${i}`] = profile(`photo${i}`, { lum: 0.02, empty: 60 + i, picture: "photo", layout: "full-bleed", colours: 150, soft: 30, sharp: 35, grid: 70 });
  for (let i = 0; i < 4; i++) refs[`type${i}`] = profile(`type${i}`, { lum: 0.02, empty: 62 + i, picture: "none", layout: "left", colours: 6, soft: 2, sharp: 60, grid: 10 });
  refs.pairA = profile("pairA", { lum: 0.95, empty: 30, loud: 60, picture: "collage", layout: "collage", colours: 200 });
  refs.pairB = profile("pairB", { lum: 0.95, empty: 31, loud: 61, picture: "collage", layout: "collage", colours: 200 });
  const plain = project({ "profiles.json": JSON.stringify({ refs }) });
  const moods = ["calm", "bold", "raw"];
  for (const [i, p] of Object.values(refs).entries()) p.about = { format: [i % 2 ? "poster" : "web-hero"], mood: [moods[i % 3]], hue: ["red", "blue"], density: ["dense"] };
  const about = project({ "profiles.json": JSON.stringify({ refs }) });
  const a = run("families.mjs", plain, ["profiles.json"]);
  const b = run("families.mjs", about, ["profiles.json"]);
  assert.equal(b.stdout, a.stdout);
  assert.deepEqual(JSON.parse(readFileSync(join(about, "families.json"), "utf8")), JSON.parse(readFileSync(join(plain, "families.json"), "utf8")));
});

test("families: motion counts in the distance", () => {
  const look = (name, motion) => {
    const p = profile(name, { lum: 0.5, empty: 50, picture: "lettering", layout: "edge-type" });
    p.tags.motion = [motion];
    return p;
  };
  const refs = {};
  for (let i = 0; i < 4; i++) refs[`k${i}`] = look(`k${i}`, "kinetic");
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  run("families.mjs", dir, ["profiles.json"]);
  refs.same = look("same", "kinetic");
  refs.moved = look("moved", "ui");
  writeFileSync(join(dir, "profiles.json"), JSON.stringify({ refs }));
  run("families.mjs", dir, ["profiles.json", "--assign", "families.json"]);
  const out = JSON.parse(readFileSync(join(dir, "assign.json"), "utf8"));
  const at = Object.fromEntries([...out.assigned, ...out.strays].map((x) => [x.name, x.distance]));
  assert.equal(at.same, 0);
  assert.ok(at.moved > at.same, JSON.stringify(out));
});

test("families: a shot given as a URL is written to the board as that URL", () => {
  const refs = {};
  for (let i = 0; i < 4; i++) refs[`quiet${i}`] = profile(`quiet${i}`, { lum: 0.9, empty: 90 + i, loud: 0, picture: "none", layout: "centred", colours: 3 });
  for (let i = 0; i < 4; i++) refs[`pin${i}`] = { ...profile(`pin${i}`, { lum: 0.1, empty: 10 + i, loud: 80, picture: "none", layout: "centred", colours: 400 }), shot: `https://i.example.com/originals/pin${i}.jpg` };
  const dir = project({ "profiles.json": JSON.stringify({ refs }) });
  run("families.mjs", dir, ["profiles.json", "--board", "board.md"]);
  const md = readFileSync(join(dir, "board.md"), "utf8");
  for (let i = 0; i < 4; i++) assert.match(md, new RegExp(`### pin${i}\\n[\\s\\S]*?- shot: https://i\\.example\\.com/originals/pin${i}\\.jpg\\n`));
  assert.doesNotMatch(md, /https:\/[^/]/);
});
