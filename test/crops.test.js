import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import test from "node:test";
import assert from "node:assert/strict";

const crops = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-moodboard/scripts/crops.mjs");

// A PNG by hand: rows of RGB pixels, no dependencies.
function png(width, rows) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(rows.length, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.concat(rows.map((r) => Buffer.from([0, ...r.flat()])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const size = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const run = (dir, args) => spawnSync(process.execPath, [crops, ...args], { cwd: dir, encoding: "utf8" });

function board() {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-crops-"));
  const R = [255, 0, 0], B = [0, 0, 255];
  const sheet = png(4, [[R, R, B, B], [R, R, B, B]]);
  const hash = createHash("sha1").update(sheet).digest("hex");
  mkdirSync(join(dir, "sheets"));
  writeFileSync(join(dir, "sheets", `${hash}.png`), sheet);
  const cards = [
    { name: "Hero / Left", hash, transform: [[0.5, 0, 0], [0, 1, 0]], caption: "web-hero", tags: ["web-hero", "editorial"] },
    { name: "Hero / Right", hash, transform: [[0.5, 0, 0.5], [0, 1, 0]] },
  ];
  writeFileSync(join(dir, "cards.json"), JSON.stringify(cards));
  return { dir, hash, cards };
}

test("crops: lists each shared image once, then cuts every card from it at the sheet's own size", (t) => {
  const { dir, hash } = board();
  const listed = run(dir, ["cards.json", "--list"]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.equal(listed.stdout, `${hash}\t2\n`);
  const result = run(dir, ["cards.json", "--sheets", "sheets", "--out", "refs"]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /2 cards from 1 sheets, 0 skipped/);
  for (const f of ["hero-left.png", "hero-right.png"]) {
    const file = join(dir, "refs", f);
    assert.ok(existsSync(file), f);
    assert.deepEqual([...readFileSync(file).subarray(0, 4)], [137, 80, 78, 71]);
    assert.deepEqual(size(file), [2, 2]);
  }
  const tsv = readFileSync(join(dir, "refs", "crops.tsv"), "utf8");
  assert.match(tsv, /^name\tfile\tcaption\ttags\n/);
  assert.match(tsv, /Hero \/ Left\t.*hero-left\.png\tweb-hero\tweb-hero\+editorial\n/);
});

test("crops: a sheet that does not match its hash, or a skewed card, is named and skipped; usage is checked", (t) => {
  const { dir, hash, cards } = board();
  writeFileSync(join(dir, "sheets", `${hash}.png`), Buffer.from("not the sheet"));
  const bad = run(dir, ["cards.json", "--sheets", "sheets", "--out", "refs"]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /does not match its hash/);
  assert.match(bad.stderr, /0 cards from 0 sheets, 2 skipped/);

  const fresh = board();
  fresh.cards.push({ ...fresh.cards[0], name: "Skewed", transform: [[0.5, 0.1, 0], [0, 1, 0]] });
  fresh.cards.push({ name: "Gone", hash: "0".repeat(40), transform: [[1, 0, 0], [0, 1, 0]] });
  writeFileSync(join(fresh.dir, "cards.json"), JSON.stringify(fresh.cards));
  const mixed = run(fresh.dir, ["cards.json", "--sheets", "sheets", "--out", "refs"]);
  if (/No Chrome/.test(mixed.stderr)) return t.skip("no Chrome installed");
  assert.equal(mixed.status, 1);
  assert.match(mixed.stderr, /Skewed: transform rotates or skews/);
  assert.match(mixed.stderr, /Gone: no sheet 0{40}/);
  assert.match(mixed.stderr, /2 cards from 1 sheets, 2 skipped/);

  assert.equal(run(dir, ["cards.json"]).status, 2);
  assert.equal(run(dir, []).status, 2);
  void cards;
});
