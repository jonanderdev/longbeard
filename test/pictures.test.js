import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pictures = join(root, "skills/design-direction/scripts/pictures.mjs");

// A 1x1 JPEG and a 1x1 PNG: real bytes, small enough to inline.
const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const page = (index, title, mime, width, height, licence, artist, base, thumb) => ({
  pageid: index, ns: 6, title, index,
  imageinfo: [{
    url: `${base}/orig/${encodeURIComponent(title)}`, width, height, mime,
    thumburl: `${base}/thumb/${thumb}`, descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    extmetadata: { ...(licence ? { LicenseShortName: { value: licence } } : {}), Artist: { value: artist } },
  }],
});

async function serve(fixture) {
  const server = await new Promise((done) => {
    const s = createServer((req, res) => {
      const base = `http://localhost:${s.address().port}`;
      if (req.url.startsWith("/w/api.php")) return res.end(JSON.stringify(fixture(base, new URL(req.url, base))));
      if (req.url.endsWith(".png")) return res.end(png);
      if (req.url.startsWith("/thumb/")) return res.end(jpeg);
      res.statusCode = 404;
      res.end();
    });
    s.listen(0, () => done(s));
  });
  return { server, api: `http://localhost:${server.address().port}/w/api.php` };
}

const run = (args, cwd) => new Promise((done) => {
  const child = spawn(process.execPath, [pictures, ...args], { cwd });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  child.on("exit", (status) => done({ status, stdout, stderr }));
});

test("pictures: keeps only clearly licensed, large bitmaps, credits each once", async () => {
  let asked;
  const { server, api } = await serve((base, url) => {
    asked = url;
    return {
      query: {
        pages: {
          // Out of index order on purpose: the script sorts by index.
          6: page(6, "File:Diagram of a loaf.svg", "image/svg+xml", 3000, 2000, "CC0", "Someone", base, "1600px-Diagram_of_a_loaf.svg.png"),
          1: page(1, "File:Sourdough loaf, crust & crumb.jpg", "image/jpeg", 4000, 3000, "CC BY-SA 4.0", '<a href="//commons.wikimedia.org/wiki/User:Baker">Jane  <b>Baker</b></a>', base, "1600px-Sourdough_loaf.jpg"),
          2: page(2, "File:Flour.png", "image/png", 2000, 2000, "CC0", "", base, "1600px-Flour.png"),
          3: page(3, "File:Bread NC.jpg", "image/jpeg", 4000, 3000, "CC BY-NC 2.0", "X", base, "1600px-Bread_NC.jpg"),
          4: page(4, "File:Tiny bread.jpg", "image/jpeg", 640, 480, "CC BY 2.0", "X", base, "640px-Tiny.jpg"),
          5: page(5, "File:Old bread.jpg", "image/jpeg", 4000, 3000, "GFDL", "X", base, "1600px-Old.jpg"),
        },
      },
    };
  });
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["sourdough bread", "--api", api, "--out", "pics"], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(asked.searchParams.get("gsrsearch"), "sourdough bread filetype:bitmap");
    assert.equal(asked.searchParams.get("gsrlimit"), "24");
    assert.equal(asked.searchParams.get("gsrnamespace"), "6");
    const loaf = "sourdough-loaf-crust-crumb.jpg", flour = "flour.png";
    assert.deepEqual(readFileSync(join(dir, "pics", loaf)), jpeg);
    assert.deepEqual(readFileSync(join(dir, "pics", flour)), png);
    assert.ok(!existsSync(join(dir, "pics", "bread-nc.jpg")));
    assert.match(result.stdout, /kept {2}pics\/sourdough-loaf-crust-crumb\.jpg {2}CC BY-SA 4\.0 {2}Jane Baker/);
    assert.match(result.stdout, /2 kept/);
    assert.match(result.stdout, /2 licence/);
    assert.match(result.stdout, /1 too small/);
    assert.match(result.stdout, /1 type/);
    const tsv = () => readFileSync(join(dir, "pics", "credits.tsv"), "utf8").trim().split("\n");
    const rows = tsv();
    assert.equal(rows[0], "# name\tfile\tsource\tauthor\tlicence");
    assert.deepEqual(rows.slice(1).map((r) => r.split("\t")), [
      ["Sourdough loaf, crust & crumb", `pics/${loaf}`, "https://commons.wikimedia.org/wiki/File%3ASourdough%20loaf%2C%20crust%20%26%20crumb.jpg", "Jane Baker", "CC BY-SA 4.0"],
      ["Flour", `pics/${flour}`, "https://commons.wikimedia.org/wiki/File%3AFlour.png", "unknown", "CC0"],
    ]);
    // Again: nothing new, nothing doubled.
    const again = await run(["sourdough bread", "--api", api, "--out", "pics"], dir);
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /0 kept.*2 already there/);
    assert.deepEqual(tsv(), rows);
  } finally {
    server.close();
  }
});

test("pictures: two titles that cut to the same name are both kept, under different names", async () => {
  const long = "Sourdough bread loaf on a wooden board in a small bakery in Paris 2019";
  const { server, api } = await serve((base) => ({
    query: {
      pages: {
        1: page(1, `File:${long} (1).jpg`, "image/jpeg", 4000, 3000, "CC0", "A", base, "1600px-a.jpg"),
        2: page(2, `File:${long} (2).jpg`, "image/jpeg", 4000, 3000, "CC0", "B", base, "1600px-b.jpg"),
      },
    },
  }));
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["sourdough", "--api", api, "--out", "pics"], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 kept/);
    const files = readFileSync(join(dir, "pics", "credits.tsv"), "utf8").trim().split("\n").slice(1).map((r) => r.split("\t")[1]);
    assert.equal(files.length, 2);
    assert.notEqual(files[0], files[1]);
    assert.ok(files.every((f) => existsSync(join(dir, f))));
    const again = await run(["sourdough", "--api", api, "--out", "pics"], dir);
    assert.match(again.stdout, /0 kept.*2 already there/);
  } finally {
    server.close();
  }
});

test("pictures: nothing that passes exits 1 and asks for another query", async () => {
  const { server, api } = await serve((base) => ({
    query: { pages: { 1: page(1, "File:Bread NC.jpg", "image/jpeg", 4000, 3000, "CC BY-NC-SA 4.0", "X", base, "1600px-Bread.jpg") } },
  }));
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["cosy", "--api", api, "--out", "pics"], dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /1 licence/);
    assert.match(result.stderr, /search the subject, not a mood/);
    assert.ok(!existsSync(join(dir, "pics")));
  } finally {
    server.close();
  }
});

test("pictures: bad flags and an unreachable endpoint fail clearly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
  assert.equal((await run(["bread", "--out", "pics", "--count", "40"], dir)).status, 2);
  assert.equal((await run(["bread"], dir)).status, 2);
  const down = await run(["bread", "--out", "pics", "--api", "http://localhost:1/w/api.php"], dir);
  assert.equal(down.status, 2);
  assert.match(down.stderr, /pictures: could not reach Commons/);
});
