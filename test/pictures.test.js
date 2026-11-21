import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

// extra: more extmetadata fields; its "templates" (names) are the templates the page carries among
// those the search asks for, as the real API returns them.
const page = (index, title, mime, width, height, licence, artist, base, thumb, { templates, ...extra } = {}) => ({
  pageid: index, ns: 6, title, index,
  ...(templates ? { templates: templates.map((t) => ({ ns: 10, title: `Template:${t}` })) } : {}),
  imageinfo: [{
    url: `${base}/orig/${encodeURIComponent(title)}`, width, height, mime,
    thumburl: `${base}/thumb/${thumb}`, descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    extmetadata: {
      ...(licence ? { LicenseShortName: { value: licence } } : {}), Artist: { value: artist },
      ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
    },
  }],
});

async function serve(fixture, { slow = "" } = {}) {
  const server = await new Promise((done) => {
    const s = createServer((req, res) => {
      const base = `http://localhost:${s.address().port}`;
      if (slow && req.url.includes(slow)) return; // never answers
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
    // The page's templates are asked for, only the worldwide public-domain ones.
    assert.match(asked.searchParams.get("prop"), /templates/);
    assert.equal(asked.searchParams.get("tltemplates"), "Template:Cc-pd-mark-footer|Template:PD-self|Template:PD-author");
    const loaf = "sourdough-loaf-crust-crumb.jpg", flour = "flour.png";
    assert.deepEqual(readFileSync(join(dir, "pics", loaf)), jpeg);
    assert.deepEqual(readFileSync(join(dir, "pics", flour)), png);
    assert.ok(!existsSync(join(dir, "pics", "bread-nc.jpg")));
    assert.match(result.stdout, /kept {2}pics\/sourdough-loaf-crust-crumb\.jpg {2}CC BY-SA 4\.0 {2}Jane Baker/);
    assert.match(result.stdout, /2 kept/);
    assert.match(result.stdout, /share-alike: a cropped or toned version .* must carry the same licence/);
    assert.match(result.stdout, /2 licence/);
    assert.match(result.stdout, /1 too small/);
    assert.match(result.stdout, /1 type/);
    const tsv = () => readFileSync(join(dir, "pics", "credits.tsv"), "utf8").trim().split("\n");
    const rows = tsv();
    assert.equal(rows[0], "# name\tfile\tsource\tauthor\tlicence\tlicence link\tcredit line\tshare-alike");
    assert.deepEqual(rows.slice(1).map((r) => r.split("\t")), [
      ["Sourdough loaf, crust & crumb", `pics/${loaf}`, "https://commons.wikimedia.org/wiki/File%3ASourdough%20loaf%2C%20crust%20%26%20crumb.jpg", "Jane Baker", "CC BY-SA 4.0",
        "https://creativecommons.org/licenses/by-sa/4.0/", '"Sourdough loaf, crust & crumb" by Jane Baker, CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/', "yes"],
      ["Flour", `pics/${flour}`, "https://commons.wikimedia.org/wiki/File%3AFlour.png", "unknown", "CC0",
        "https://creativecommons.org/publicdomain/zero/1.0/", '"Flour", CC0, https://creativecommons.org/publicdomain/zero/1.0/', "no"],
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

const meta = (licence, extra, artist = "Someone") => (base) => ({
  query: { pages: { 1: page(1, "File:Loaf.jpg", "image/jpeg", 4000, 3000, licence, artist, base, "1600px-Loaf.jpg", extra) } },
});
const keeps = async (licence, extra, artist) => {
  const { server, api } = await serve(meta(licence, extra, artist));
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["loaf", "--api", api, "--out", "pics"], dir);
    return { ...result, dir, kept: existsSync(join(dir, "pics", "loaf.jpg")) };
  } finally {
    server.close();
  }
};

test("pictures: only licences that hold everywhere pass", async () => {
  const yes = [
    ["CC0", { License: "cc0" }],
    ["CC BY 2.0", { License: "cc-by-2.0" }],
    ["CC BY-SA 3.0", { License: "cc-by-sa-3.0" }],
    ["CC BY-SA 4.0", { LicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" }],
    ["CC BY-SA 3.0 de", { License: "cc-by-sa-3.0-de" }],
    // Public domain as the API really gives it: one name for every kind, told apart by the page's templates.
    ["Public domain", { License: "pd", UsageTerms: "Public domain", AttributionRequired: "false", templates: ["Cc-pd-mark-footer"] }],
    ["Public domain", { License: "pd", UsageTerms: "Public domain", templates: ["PD-self"] }],
    ["PD-self", { UsageTerms: "Released into the public domain by the author", templates: ["PD-self"] }],
  ];
  for (const [lic, extra] of yes) assert.ok((await keeps(lic, extra)).kept, `${lic} should be kept`);
  const no = [
    // A US government photograph or a work old enough in the US alone: the same name and terms, no worldwide template.
    ["Public domain", { License: "pd", UsageTerms: "Public domain", AttributionRequired: "false" }],
    ["Public domain", { License: "pd", UsageTerms: "Public domain", templates: [] }],
    ["PD-US", { License: "pd-us", UsageTerms: "Public domain in the United States" }],
    ["PD-Russia", { UsageTerms: "Public domain in Russia", templates: ["PD-self"] }],
    ["PD-textlogo", { UsageTerms: "Public domain: too simple to be copyrighted" }],
    ["Public domain", { UsageTerms: "Public domain in the United States only", templates: ["Cc-pd-mark-footer"] }],
    ["GFDL 1.2", {}],
    ["No restrictions", {}],
    ["CC BY-ND 4.0", {}],
  ];
  for (const [lic, extra] of no) {
    const r = await keeps(lic, extra);
    assert.ok(!r.kept, `${lic} should be dropped`);
    assert.equal(r.status, 1);
  }
});

test("pictures: a file the source flags as restricted or non-free is dropped, with the reason", async () => {
  for (const extra of [{ Restrictions: "trademarked" }, { Restrictions: "personality" }, { NonFree: "true" }]) {
    const r = await keeps("CC BY 4.0", extra);
    assert.ok(!r.kept);
    assert.match(r.stderr, /1 restricted/);
  }
  assert.ok((await keeps("CC BY 4.0", { NonFree: "false", Restrictions: "" })).kept);
});

test("pictures: a licence that asks for credit and has no usable author is dropped, with the reason", async () => {
  for (const artist of ["", "Unknown author", '<span style="display: none;">Unknown</span>', "Anonymous", "unknown"]) {
    const r = await keeps("CC BY-SA 4.0", { License: "cc-by-sa-4.0" }, artist);
    assert.ok(!r.kept, `author "${artist}" should not do`);
    assert.match(r.stdout, /Loaf: CC BY-SA 4\.0 asks for credit and no author is given/);
    assert.match(r.stderr, /1 no author/);
  }
  // No credit asked for, so no author is needed.
  assert.ok((await keeps("CC0", {}, "")).kept);
  assert.ok((await keeps("Public domain", { UsageTerms: "Public domain", templates: ["Cc-pd-mark-footer"] }, "")).kept);
  // A name that sits in a link is a name.
  assert.ok((await keeps("CC BY 4.0", {}, '<a href="//commons.wikimedia.org/wiki/User:Baker">Baker</a>')).kept);
});

test("pictures: credits.tsv carries the licence link, a ready credit line and the share-alike mark", async () => {
  const { server, api } = await serve((base) => ({
    query: {
      pages: {
        1: page(1, "File:Rye.jpg", "image/jpeg", 4000, 3000, "CC BY 2.0", "Ann", base, "1600px-Rye.jpg", { LicenseUrl: "https://creativecommons.org/licenses/by/2.0" }),
        2: page(2, "File:Spelt.jpg", "image/jpeg", 4000, 3000, "CC BY-SA 4.0", "Bo", base, "1600px-Spelt.jpg"),
      },
    },
  }));
  const plainOnly = await serve((base) => ({ query: { pages: { 1: page(1, "File:Rye.jpg", "image/jpeg", 4000, 3000, "CC BY 2.0", "Ann", base, "1600px-Rye.jpg") } } }));
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["grain", "--api", api, "--out", "pics"], dir);
    assert.equal(result.status, 0, result.stderr);
    const [rye, spelt] = readFileSync(join(dir, "pics", "credits.tsv"), "utf8").trim().split("\n").slice(1).map((r) => r.split("\t"));
    assert.deepEqual(rye.slice(4), ["CC BY 2.0", "https://creativecommons.org/licenses/by/2.0", '"Rye" by Ann, CC BY 2.0, https://creativecommons.org/licenses/by/2.0', "no"]);
    assert.deepEqual(spelt.slice(4), ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/", '"Spelt" by Bo, CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/', "yes"]);
    assert.match(result.stdout, /share-alike: a cropped or toned version/);
    // No share-alike kept, no share-alike line.
    const dir2 = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const r2 = await run(["grain", "--api", plainOnly.api, "--out", "pics"], dir2);
    assert.doesNotMatch(r2.stdout, /share-alike/);
  } finally {
    server.close();
    plainOnly.server.close();
  }
});

test("pictures: a ported licence keeps its country in the credit line", async () => {
  const r = await keeps("CC BY-SA 3.0 de", { License: "cc-by-sa-3.0-de", LicenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en" });
  const row = readFileSync(join(r.dir, "pics", "credits.tsv"), "utf8").trim().split("\n")[1].split("\t");
  assert.equal(row[4], "CC BY-SA 3.0 de");
  assert.equal(row[6], '"Loaf" by Someone, CC BY-SA 3.0 de, https://creativecommons.org/licenses/by-sa/3.0/de/deed.en');
});

test("pictures: an older credits.tsv stays readable and is added to, not duplicated", async () => {
  const { server, api } = await serve((base) => ({
    query: {
      pages: {
        1: page(1, "File:Rye.jpg", "image/jpeg", 4000, 3000, "CC BY 2.0", "Ann", base, "1600px-Rye.jpg"),
        2: page(2, "File:Spelt.jpg", "image/jpeg", 4000, 3000, "CC0", "Bo", base, "1600px-Spelt.jpg"),
      },
    },
  }));
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    mkdirSync(join(dir, "pics"));
    writeFileSync(join(dir, "pics", "rye.jpg"), jpeg);
    const old = "# name\tfile\tsource\tauthor\tlicence\nRye\tpics/rye.jpg\thttps://commons.wikimedia.org/wiki/File%3ARye.jpg\tAnn\tCC BY 2.0\n";
    writeFileSync(join(dir, "pics", "credits.tsv"), old);
    const result = await run(["grain", "--api", api, "--out", "pics"], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 kept.*1 already there/);
    const rows = readFileSync(join(dir, "pics", "credits.tsv"), "utf8").trim().split("\n");
    assert.equal(rows.length, 3);
    assert.match(rows[0], /licence link\tcredit line\tshare-alike$/);
    assert.equal(rows[1], old.split("\n")[1]);
    assert.equal(rows[2].split("\t")[0], "Spelt");
    // The first two columns are all the contact sheet reads.
    for (const row of rows.slice(1)) assert.ok(existsSync(join(dir, row.split("\t")[1])));
  } finally {
    server.close();
  }
});

test("pictures: a download that hangs is reported and skipped, never a crash", async () => {
  const { server, api } = await serve((base) => ({
    query: {
      pages: {
        1: page(1, "File:Stuck.jpg", "image/jpeg", 4000, 3000, "CC0", "A", base, "1600px-stuck.jpg"),
        2: page(2, "File:Fine.jpg", "image/jpeg", 4000, 3000, "CC0", "B", base, "1600px-fine.jpg"),
      },
    },
  }), { slow: "stuck" });
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["bread", "--api", api, "--out", "pics", "--timeout", "1"], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /could not download File:Stuck\.jpg \(no answer within 1s\); skipped/);
    assert.match(result.stdout, /1 kept.*1 failed to download/);
    assert.ok(existsSync(join(dir, "pics", "fine.jpg")));
    assert.ok(!existsSync(join(dir, "pics", "stuck.jpg")));
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test("pictures: a search that hangs times out with a clear message", async () => {
  const { server, api } = await serve(() => ({}), { slow: "/w/api.php" });
  try {
    const dir = mkdtempSync(join(tmpdir(), "longbeard-pictures-"));
    const result = await run(["bread", "--api", api, "--out", "pics", "--timeout", "1"], dir);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Commons did not answer the search within 1s/);
    assert.equal((await run(["bread", "--api", api, "--out", "pics", "--timeout", "0"], dir)).status, 2);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
