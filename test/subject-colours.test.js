import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "skills/design-direction/scripts/subject-colours.mjs");
const measure = join(root, "skills/design-moodboard/scripts/measure.mjs");

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (x, y) => {
  const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
};

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

// Two loaves: a heavy crust, a cream crumb, a shadow, a grey table, a heavy blue backdrop lying
// at the edges (edge 0.8), a specular highlight and two specks of noise. [hex, share, edge].
const highlight = "#fefefe";
const noise = ["#33aa33", "#cc2222"];
const blue = "#4a78b0";
const bread = [
  { target: "a.jpg", swatches: [["#8b5a2b", 33, 0.25], ["#efe4cf", 20, 0.3], [blue, 22, 0.8], ["#808080", 8, 0.5], ["#2a1c14", 10, 0.3], [highlight, 5, 0.2], [noise[0], 1, 0.4]] },
  { target: "b.jpg", swatches: [["#94603a", 32, 0.2], ["#ebdfc8", 22, 0.35], [blue, 20, 0.85], ["#7c7c7c", 8.5, 0.45], ["#1e140e", 10, 0.3], ["#ffffff", 6, 0.1], [noise[1], 1.5, 0.5]] },
].map((p) => ({ target: p.target, swatches: p.swatches.map(([hex, share, edge]) => ({ hex, share, edge })) }));

function run(...args) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-subject-"));
  const file = join(dir, "swatches.json");
  writeFileSync(file, JSON.stringify(args[0] === "--data" ? args.splice(0, 2)[1] : bread));
  return spawnSync(process.execPath, [script, "--from", file, ...args], { encoding: "utf8" });
}

test("subject-colours: noise and highlights go, the crust is the signature", () => {
  const result = run("--json");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  const kept = out.colours.map((c) => c.hex);
  for (const hex of [highlight, "#ffffff", ...noise]) assert.ok(!kept.includes(hex), `${hex} should be dropped`);
  assert.ok(out.colours.every((c) => c.share >= 2 && c.L <= 0.97));
  // The signature is the warm brown, merged from both crusts.
  const sig = out.colours.find((c) => c.hex === out.signature.hex);
  assert.ok(sig.C >= 0.05 && sig.h > 40 && sig.h < 80 && sig.L < 0.6, JSON.stringify(sig));
  assert.ok(out.signature.share > 30, `signature share ${out.signature.share}`);
});

test("subject-colours: grounds keep the subject's hue, inks and accents read", () => {
  const out = JSON.parse(run("--json").stdout);
  assert.deepEqual(out.proposals.map((p) => p.name).slice(0, 2), ["light", "dark"]);
  const light = out.proposals[0].colours.find((c) => c.role === "ground");
  assert.notEqual(light.hex, "#ffffff");
  assert.ok(Math.abs(light.L - 0.96) < 0.01 && light.C > 0.004 && light.C <= 0.02, JSON.stringify(light));
  assert.ok(light.h > 40 && light.h < 100, `a warm off-white, hue ${light.h}`);
  const dark = out.proposals[1].colours.find((c) => c.role === "ground");
  assert.ok(Math.abs(dark.L - 0.17) < 0.01 && dark.C <= 0.03, JSON.stringify(dark));
  for (const p of out.proposals) {
    assert.ok(contrast(p.ink, p.ground) >= 4.5, `${p.name} ink ${contrast(p.ink, p.ground)}`);
    if (p.accent) {
      const a = p.colours.find((c) => c.role === "accent");
      assert.ok(contrast(p.accent, p.ground) >= 3, `${p.name} accent ${contrast(p.accent, p.ground)}`);
      assert.ok(a.C >= 0.1, `${p.name} accent is grey: ${JSON.stringify(a)}`);
      assert.ok(a.L >= 0.55 - 1e-6 && a.L <= 0.72 + 1e-6);
      assert.ok(a.from && a.tuned);
    }
    for (const c of p.colours) assert.ok(c.tuned, `${p.name} ${c.role} says how it was made`);
  }
  assert.ok(out.proposals.filter((p) => p.accent).length >= 1);
});

test("subject-colours: the library holds one or two grounds, and no accent when the subject has one hue", () => {
  const out = JSON.parse(run("--json").stdout);
  const { library } = out;
  assert.ok(library.grounds.length >= 1 && library.grounds.length <= 2);
  assert.equal(library.grounds[0].id, "subject-light");
  for (const g of library.grounds) {
    assert.deepEqual(g.from, ["subject"]);
    assert.deepEqual([g.panel, g.gradient, g.pattern], [null, null, null]);
    assert.ok(contrast(g.ink, g.ground) >= 4.5);
  }
  // Bread is one hue: its accents are the crust with more chroma, so the library takes none.
  assert.ok(out.proposals.some((p) => p.accent && p.ownHue));
  assert.equal(library.accents.length, 0);
  assert.ok(out.notes.some((n) => /no second hue/.test(n)), out.notes.join("\n"));
});

test("subject-colours: a second hue of the subject's own becomes the library's accent", () => {
  // The same loaves with a sprig of green herb on each, near the centre.
  const herb = bread.map((p) => ({ ...p, swatches: [...p.swatches, { hex: "#4f8a3a", share: 7, edge: 0.2 }] }));
  const out = JSON.parse(run("--data", herb, "--json").stdout);
  assert.equal(out.library.accents.length, 1);
  const [acc] = out.library.accents;
  assert.deepEqual(acc.from, ["subject"]);
  const p = out.proposals.find((x) => x.accent === acc.colour);
  assert.equal(p.ownHue, false);
  assert.ok(contrast(acc.colour, p.ground) >= 3);
  // Green, not the crust's brown.
  const g = parseInt(acc.colour.slice(3, 5), 16), r = parseInt(acc.colour.slice(1, 3), 16);
  assert.ok(g > r, acc.colour);
});

test("subject-colours: a colour lying at the edges is background, never the signature or accent", () => {
  const out = JSON.parse(run("--json").stdout);
  const backdrop = out.colours.find((c) => c.hex === blue);
  assert.ok(backdrop, "the blue is kept as a colour");
  assert.equal(backdrop.background, true);
  assert.equal(backdrop.pictures, 2);
  assert.ok(Math.abs(backdrop.edge - 0.82) < 0.02, `edge ${backdrop.edge}`);
  assert.notEqual(out.signature.hex, blue);
  for (const p of out.proposals) for (const c of p.colours) {
    assert.notEqual(c.from?.hex, blue, `${p.name} ${c.role} came from the backdrop`);
    if (c.role === "accent") assert.ok(c.h < 200 || c.h > 290, `${p.name} accent is blue: ${c.h}`);
  }
  assert.ok(out.notes.some((n) => n.includes(blue)), "the backdrop is named in the notes");
  // In one picture only, an edge of 0.45 is enough to be background; in two it is not.
  const one = [{ target: "a.jpg", swatches: [{ hex: "#8b5a2b", share: 60, edge: 0.2 }, { hex: "#2f8f4f", share: 40, edge: 0.45 }] }];
  const lone = JSON.parse(run("--data", one, "--json").stdout).colours.find((c) => c.hex === "#2f8f4f");
  assert.equal(lone.background, true);
  const two = [...one, { target: "b.jpg", swatches: [{ hex: "#8b5a2b", share: 60, edge: 0.2 }, { hex: "#2f8f4f", share: 40, edge: 0.45 }] }];
  const shared = JSON.parse(run("--data", two, "--json").stdout);
  assert.equal(shared.colours.find((c) => c.hex === "#2f8f4f").background, false);
});

test("subject-colours: --exclude drops a colour the eye says is not the subject", () => {
  const before = JSON.parse(run("--json").stdout);
  assert.ok(before.colours.some((c) => c.hex === "#808080" || c.hex === "#7e7e7e"));
  const result = run("--exclude", "#7f7f7f,#ede1cb", "--json");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  for (const c of out.colours) assert.ok(c.C > 0.03 || c.L < 0.3, `grey or cream ${c.hex} should be excluded`);
  assert.ok(out.notes.some((n) => /^excluded: #/.test(n)), out.notes.join("; "));
  const light = out.proposals[0].colours.find((c) => c.role === "ground");
  assert.notEqual(light.from.hex, before.proposals[0].colours[0].from.hex, "the light ground loses its cream source");
  assert.equal(run("--exclude", "brown").status, 2);
});

test("subject-colours: --sheet writes a page with every proposal and the pictures", () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-sheet-"));
  const sheet = join(dir, "sheet.html");
  const result = run("--sheet", sheet);
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(sheet, "utf8");
  assert.match(html, /<title>Subject colours<\/title>/);
  const data = JSON.parse(html.match(/const DATA = (.*);\n/)[1]);
  assert.deepEqual(data.pictures.map((p) => p.name), ["a.jpg", "b.jpg"]);
  assert.deepEqual(data.proposals.map((p) => p.name).slice(0, 2), ["light", "dark"]);
});

test("subject-colours: --level AAA offers inks at 7:1 and accents at 4.5:1, and a level it does not know is refused", () => {
  const result = run("--json", "--level", "AAA");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.level, "AAA");
  assert.ok(out.proposals.length > 0);
  for (const p of out.proposals) {
    assert.ok(contrast(p.ink, p.ground) >= 7, `${p.name} ink ${contrast(p.ink, p.ground)}`);
    if (p.accent) assert.ok(contrast(p.accent, p.ground) >= 4.5, `${p.name} accent ${contrast(p.accent, p.ground)}`);
  }
  assert.equal(JSON.parse(run("--json").stdout).level, "AA");
  const bad = run("--level", "AAAA");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /AA or AAA/);
});

test("subject-colours: the table names each proposal, and bad input is refused", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^signature: #/);
  assert.match(result.stdout, /light\s+ground\s+#[0-9a-f]{6}/);
  assert.match(result.stdout, /dark\s+ink\s+#[0-9a-f]{6}/);
  const none = spawnSync(process.execPath, [script, "--from", join(tmpdir(), "no-such-swatches.json")], { encoding: "utf8" });
  assert.equal(none.status, 2);
  assert.match(none.stderr, /^subject-colours: /);
});

test("measure --swatches: two colour regions come back as the two heaviest swatches", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-swatches-"));
  const [w, h] = [60, 40];
  const rgb = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgb.push(...(x < w / 2 ? [176, 96, 40] : [40, 80, 160]));
  writeFileSync(join(dir, "two.png"), png(w, h, rgb));
  const result = spawnSync(process.execPath, [measure, dir, "--swatches"], { encoding: "utf8" });
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const [one] = JSON.parse(result.stdout);
  assert.equal(one.target, join(dir, "two.png"));
  const [a, b] = one.swatches;
  assert.deepEqual([a.hex, b.hex].sort(), ["#2850a0", "#b06028"]);
  assert.ok(Math.abs(a.share + b.share - 100) < 0.5 && Math.abs(a.share - 50) < 3, `${a.share} ${b.share}`);
  for (const s of [a, b]) assert.ok(s.L > 0 && s.L < 1 && s.C > 0.05 && s.h >= 0 && s.h < 360 && s.edge >= 0 && s.edge <= 1);
  // A square in the middle on a frame of another colour: the frame is all edge, the square none.
  const framed = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) framed.push(...(x >= 12 && x < 48 && y >= 8 && y < 32 ? [176, 96, 40] : [40, 80, 160]));
  writeFileSync(join(dir, "two.png"), png(w, h, framed));
  const edges = JSON.parse(spawnSync(process.execPath, [measure, join(dir, "two.png"), "--swatches"], { encoding: "utf8" }).stdout)[0].swatches;
  assert.equal(edges.find((s) => s.hex === "#b06028").edge, 0);
  assert.equal(edges.find((s) => s.hex === "#2850a0").edge, 1);
  const refused = spawnSync(process.execPath, [measure, "https://example.com", "--swatches"], { encoding: "utf8" });
  assert.equal(refused.status, 2);
});
