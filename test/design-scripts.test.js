import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import vm from "node:vm";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sheet = join(root, "skills/design-direction/scripts/sheet.mjs");
const measure = join(root, "skills/design-families/scripts/measure.mjs");

const run = (script, dir, args) => spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });

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

test("sheet: --rough labels the quick tiles and the rest full, --note prints a line", () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-sheet-"));
  for (const name of ["1.png", "2.png", "3.png"]) writeFileSync(join(dir, name), "png");
  assert.equal(run(sheet, dir, ["out/sheet.html", "--rough", "1,3", "--note", "weaker: <one agent>", "1.png", "2.png", "3.png"]).status, 0);
  const html = readFileSync(join(dir, "out/sheet.html"), "utf8");
  assert.match(html, /<figcaption>1 · rough<\/figcaption>/);
  assert.match(html, /<figcaption>2 · full<\/figcaption>/);
  assert.match(html, /<p>weaker: &lt;one agent&gt;<\/p>/);
  assert.equal(run(sheet, dir, ["out/sheet.html", "--rough", "x", "1.png"]).status, 2);
  assert.equal(run(sheet, dir, ["out/sheet.html", "--rough", "none", "1.png"]).status, 0);
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
    assert.ok(Array.isArray(p.page.motion) && p.page.finish && p.page.unread === 0, "the profile's page carries motion, finish and unread");
    assert.deepEqual([p.tags.picture, p.note], [["lettering"], "kept"]);
  } finally {
    server.close();
  }
});

test("screen template: its script parses, marks what a run writes, and takes the look from the URL", () => {
  const html = readFileSync(join(root, "skills/design-direction/references/screen-template.html"), "utf8");
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const dir = mkdtempSync(join(tmpdir(), "longbeard-template-"));
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  for (const part of ["the look", "provenance", "the screen's CSS", "the screen's HTML"]) assert.match(html, new RegExp(`WRITE: ${part}`));
  for (const hook of ["const LOOK", "const PROVENANCE", 'document.title = "ready"', '["face", "body", "ground", "ink"]', 'q.get("weight")', 'q.get("accent")', 'q.get("size")']) assert.ok(html.includes(hook), hook);
  // The live controls: ranges written when the screen is chosen, a panel only with ?controls and never in a capture.
  assert.match(html, /WRITE when the screen is chosen: the board's ranges/);
  for (const hook of ["const CONTROLS", "function mountControls", 'q.has("controls") && !q.has("capture")']) assert.ok(html.includes(hook), hook);
  for (const key of ["type", "leading", "radius", "controls"]) assert.ok(!html.includes(`q.get("${key}")`), `${key} is never read from the address`);
  const C = vm.runInNewContext(`${js.match(/const Controls = \{[\s\S]*?\n\};/)[0]}; Controls`);
  // A range needs two values that differ; a screen's own value is always inside it.
  const plain = (v) => JSON.parse(JSON.stringify(v));
  assert.deepEqual(plain(C.range([5.2, 9, 7])), [5.2, 9]);
  assert.equal(C.range([6]), null);
  assert.equal(C.range([6, 6]), null);
  assert.equal(C.range(undefined), null);
  assert.deepEqual(plain(C.span([5, 9], 4.5)), [4.5, 9]);
  assert.deepEqual(plain(C.span([5, 9], 7)), [5, 9]);
  // The accent's strength is its contrast against the ground, read from each pair on the board.
  assert.deepEqual(plain(C.accentRatios([["#ffffff", "#000000"], ["#ffffff", "#777777"], [null, "#000"], ["#fff"]])), [21, 4.5]);
  assert.equal(C.range(C.accentRatios([["#ffffff", "#777777"]])), null, "one reference gives no range");
  const stronger = C.accentAt("#f4f1ea", "#e2501c", 5), weaker = C.accentAt("#f4f1ea", "#e2501c", 2);
  assert.ok(stronger.ratio > C.contrast("#e2501c", "#f4f1ea") && weaker.ratio < C.contrast("#e2501c", "#f4f1ea"));
  assert.ok(Math.abs(stronger.ratio - 5) < 0.2 && Math.abs(weaker.ratio - 2) < 0.2, JSON.stringify([stronger, weaker]));
  // The copy-out lists only what moved, and says where it goes.
  assert.match(C.copy(["line spacing: 1.1 to 0.9"]), /LOOK and CSS, not in the address:\nline spacing: 1\.1 to 0\.9$/);
  assert.match(C.copy([]), /Nothing moved/);
});

test("screen template: the controls move measures inside the board's ranges, keep every zone, and are absent from a capture", async (t) => {
  const template = readFileSync(join(root, "skills/design-direction/references/screen-template.html"), "utf8");
  const dir = mkdtempSync(join(tmpdir(), "longbeard-controls-"));
  const css = ".h{position:absolute;left:100px;top:100px;width:900px;font-size:100px;line-height:1.1}.p{position:absolute;left:100px;top:500px;font-size:20px}.card{position:absolute;left:100px;top:600px;width:300px;height:200px;border-radius:16px;background:var(--accent)}.disc{position:absolute;left:800px;top:600px;width:100px;height:100px;border-radius:50%;background:var(--ink)}";
  const body = '<h1 class="display h">Fresh bread</h1><p class="p">Baked every morning.</p><div class="card"></div><div class="disc"></div>';
  // Drives the panel the way a person does, and writes what it finds where a DOM dump can read it.
  const driver = `<script>
    const rects = () => Object.fromEntries([".h", ".p", ".card", ".disc"].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [s, [r.left, r.top]]; }));
    let tries = 0;
    const wait = setInterval(() => {
      const panel = document.getElementById("lb-controls");
      if (!panel && ++tries < 30) return;
      clearInterval(wait);
      const out = { panel: !!panel };
      if (panel) {
        const inputs = [...panel.querySelectorAll("input")];
        const cs = (s) => getComputedStyle(document.querySelector(s));
        const seen = () => ({ rects: rects(), size: cs(".h").fontSize, radius: cs(".card").borderTopLeftRadius, disc: cs(".disc").borderTopLeftRadius, accent: document.documentElement.style.getPropertyValue("--accent") });
        out.count = inputs.length;
        out.ranges = inputs.map((i) => [i.min, i.max, i.value]);
        out.before = seen();
        inputs.forEach((i) => { i.value = i.max; i.dispatchEvent(new Event("input")); });
        out.after = seen();
        out.copy = panel.querySelector("textarea").value;
      }
      document.body.insertAdjacentHTML("beforeend", "<pre id=result></pre>");
      document.getElementById("result").textContent = JSON.stringify(out);
    }, 100);
  </script>`;
  const controls = `const CONTROLS = { type: [4, 8], leading: [0.9, 1.3], accent: [["#f4f1ea", "#e2501c"], ["#f4f1ea", "#141414"]], radius: [8, 24] };`;
  const page = template
    .replace(/const CONTROLS = \{[\s\S]*?\n\};/, controls)
    .replace(/\/\* WRITE: the screen's CSS[^*]*\*\//, css)
    .replace(/<!-- WRITE: the screen's HTML[^>]*-->/, body)
    .replace("</body>", `${driver}</body>`);
  writeFileSync(join(dir, "first.html"), page);
  const url = `file://${join(dir, "first.html")}`;
  const shot = (query, name) => new Promise((done) => {
    const child = spawn(process.execPath, [join(root, "skills/design-moodboard/scripts/capture.mjs"), url + query, "--out", join(dir, name), "--clip", "0,0,1440,900"]);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stderr }));
  });
  const plain = await shot("", "plain.png");
  if (/No Chrome/.test(plain.stderr)) return t.skip("no Chrome installed");
  assert.equal(plain.status, 0, plain.stderr);
  // A capture never shows the panel: asked for with ?capture it is the plain screen, byte for byte.
  assert.equal((await shot("?controls&capture", "capture.png")).status, 0);
  assert.ok(readFileSync(join(dir, "capture.png")).equals(readFileSync(join(dir, "plain.png"))), "?capture shows the screen as it is");
  const chrome = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => p && existsSync(p));
  const dump = (query) => {
    const r = spawnSync(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${join(dir, "profile")}`, "--virtual-time-budget=20000", "--dump-dom", url + query], { encoding: "utf8", timeout: 60000 });
    return JSON.parse(r.stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
  };
  assert.equal(dump("").panel, false, "no panel without ?controls");
  assert.equal(dump("?controls&capture").panel, false, "no panel in a capture");
  const r = dump("?controls");
  assert.equal(r.panel, true);
  assert.equal(r.count, 4, "type, line spacing, accent, corner radius");
  // The screen's own value is inside each range (type 100/20 = 5 in 4 to 8; leading 1.1; radius 16).
  assert.deepEqual(r.ranges.map(([min, max]) => [Number(min), Number(max)]).slice(0, 2), [[4, 8], [0.9, 1.3]]);
  assert.deepEqual(r.ranges[3], ["8", "24", "16"]);
  // Moved to the board's most: bigger type, rounder cards, a stronger accent; discs and every zone stay.
  assert.equal(r.before.size, "100px");
  assert.equal(r.after.size, "160px");
  assert.equal(r.before.radius, "16px");
  assert.equal(r.after.radius, "24px");
  assert.equal(r.after.disc, r.before.disc, "a disc is not a rounded corner");
  assert.notEqual(r.after.accent, r.before.accent);
  assert.deepEqual(r.after.rects, r.before.rects, "no zone moved");
  assert.match(r.copy, /type scale: 5 to 8 .*x 1\.6/);
  assert.match(r.copy, /corner radius: 16px to 24px/);
  assert.match(r.copy, /accent: #e2501c to #/);
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

test("measure: motion and finish are read from the page before anything is ended, and a sheet it cannot read is counted", async (t) => {
  const noise = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><filter id="n"><feTurbulence baseFrequency=".9"/></filter><rect width="64" height="64" filter="url(#n)"/></svg>`);
  const tile = `data:image/png;base64,${png(2, 2, [200, 200, 200, 180, 180, 180, 180, 180, 180, 200, 200, 200]).toString("base64")}`;
  const page = `<!doctype html><meta charset="utf-8"><style>
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
    body { margin: 0; font-family: Georgia }
    h1 { margin: 0; font-size: 48px; transition: color 300ms ease-in 50ms; text-shadow: 0 2px 4px #000 }
    .card { display: inline-block; width: 200px; height: 120px; margin: 10px; background: #eee; box-shadow: 0 8px 24px rgba(0,0,0,.2); transition: transform .25s cubic-bezier(.4,0,.2,1) }
    .card:hover { transform: translateY(-4px) }
    .plain { width: 100px; height: 40px; background: #ccc; transition: opacity .5s linear }
    .spin { width: 40px; height: 40px; background: red; animation: spin 2s linear infinite }
    .bar { height: 6px; background: blue; animation: grow linear both; animation-timeline: scroll() }
    .glass { width: 300px; height: 100px; background: #9cf; backdrop-filter: blur(12px); filter: saturate(1.4); mix-blend-mode: multiply }
    .ink { width: 300px; height: 100px; background: url(${tile}) #fff; background-blend-mode: multiply }
    .remote { width: 50px; height: 50px; transition: background-color .4s }
  </style><link rel="stylesheet" href="CROSS/other.css">
  <h1>Hello</h1><div class="card"></div><div class="card"></div><div class="card"></div><div class="plain"></div><div class="spin"></div><div class="bar"></div><div class="glass"></div><div class="ink"></div><div class="remote"></div>
  <div style="position:fixed;inset:0;background:url('${noise}');opacity:.1;pointer-events:none"></div>
  <div style="position:fixed;left:0;top:0;width:60%;height:60%;background-image:url(${tile});background-size:8px 8px;opacity:.9;pointer-events:none"></div>`;
  const other = await new Promise((done) => {
    const s = createServer((req, res) => (res.setHeader("content-type", "text/css"), res.end(".remote:hover { background-color: red }")));
    s.listen(0, "127.0.0.1", () => done(s));
  });
  const server = await new Promise((done) => {
    const s = createServer((req, res) => res.end(page.replace("CROSS", `http://127.0.0.1:${other.address().port}`)));
    s.listen(0, () => done(s));
  });
  try {
    const result = await measured([`http://localhost:${server.address().port}/`, "--wait", "0"]);
    if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
    assert.equal(result.status, 0, result.stderr);
    const out = JSON.parse(result.stdout);
    const by = (property) => out.motion.find((m) => m.property === property);
    // A transition: its property, time, delay and easing as written, where it is, and its trigger.
    assert.deepEqual([by("color").ms, by("color").delay, by("color").easing, by("color").on, by("color").trigger], [300, 50, "ease-in", "the headline", "state"]);
    // A hover rule that changes the transitioned property, read from a stylesheet the page allows reading; the card is used three times.
    assert.deepEqual([by("transform").trigger, by("transform").easing, by("transform").uses, by("transform").on], ["hover", "cubic-bezier(0.4, 0, 0.2, 1)", 3, "a card"]);
    assert.equal(by("opacity").trigger, "state");
    // A hover rule in a sheet that cannot be read is never guessed: its transition has no trigger to name, and the sheet is counted.
    assert.deepEqual([by("background-color").trigger, out.unread], ["state", 1]);
    // A keyframe animation that loops, and one tied to scroll.
    const spin = out.motion.find((m) => m.name === "spin");
    assert.deepEqual([spin.property, spin.ms, spin.iteration, spin.trigger], ["transform", 2000, "loop", "load"]);
    assert.deepEqual([out.motion.find((m) => m.name === "grow").trigger, out.motion.find((m) => m.name === "grow").iteration], ["scroll", "once"]);
    assert.ok(out.motion.length <= 12);
    // Finish: each value with the share of the screen it covers.
    const card = out.finish.shadow.find((s) => /24px/.test(s.css));
    assert.equal(card.uses, 3);
    assert.ok(card.cover > 5 && card.cover < 20, `shadow cover ${card.cover}`);
    assert.match(out.finish.textShadow[0].css, /0px 2px 4px/);
    assert.match(out.finish.filter[0].css, /saturate\(1\.4\)/);
    assert.match(out.finish.backdrop[0].css, /blur\(12px\)/);
    assert.deepEqual(out.finish.blend.map((b) => b.css).sort(), ["background-blend-mode: multiply", "mix-blend-mode: multiply"]);
    // Texture: a noise drawn by feTurbulence over the screen, and a small tile repeated over a third of it.
    const noisy = out.finish.texture.find((x) => x.kind === "feTurbulence");
    assert.ok(noisy && noisy.cover > 90, JSON.stringify(out.finish.texture));
    const tiled = out.finish.texture.find((x) => x.kind === "tile");
    assert.ok(tiled && tiled.cover > 30 && tiled.cover < 40 && tiled.size === "8px 8px", JSON.stringify(out.finish.texture));
    // Nothing is named after the page's own words beyond a few.
    for (const m of out.motion) assert.ok(m.on.length < 40, m.on);
  } finally {
    server.close();
    other.close();
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
  assert.deepEqual(grounds.slice(0, 3).map((r) => r.label), ["as built", "lighter", "darker"]);
  assert.ok(grounds.every((r) => r.contrast >= 4.5));
  assert.equal(grounds.find((r) => r.label === "theirs").ink, "#f7f7f5");
  assert.ok(accents.filter((r) => r.colour !== "none").every((r) => r.contrast >= 3));
  assert.ok(!accents.some((r) => r.colour === "#fec704"), "a yellow under 3:1 on cream is left out");
  assert.ok(accents.some((r) => r.label === "none"));
  const pale = spawnSync(process.execPath, [colours, "--ground", "#fff", "--ink", "#000", "--accent", "#ececec"], { encoding: "utf8" });
  assert.match(pale.stderr, /left out the built accent/);
  assert.equal(spawnSync(process.execPath, [colours, "--ground", "nope", "--ink", "#000"], { encoding: "utf8" }).status, 2);
  // --level AAA: text grounds, inks and accents are left out unless they read at 7:1, 7:1 and 4.5:1.
  const aaa = spawnSync(process.execPath, [colours, "--ground", "#f1ede4", "--ink", "#111111", "--accent", "#fe2601", "--family", "#ebe4e0,#fec704", "--theirs", "#2b4c7e", "--level", "AAA", "--json"], { encoding: "utf8" });
  assert.equal(aaa.status, 0, aaa.stderr);
  const strict = JSON.parse(aaa.stdout).rows;
  assert.ok(strict.filter((r) => r.row !== "accent").every((r) => r.contrast >= 7), "ground and ink rows read at 7:1");
  assert.ok(strict.filter((r) => r.row === "accent" && r.colour !== "none").every((r) => r.contrast >= 4.5));
  assert.ok(accents.some((r) => r.colour === "#fe2601") && !strict.some((r) => r.colour === "#fe2601"), "a red that holds 3:1 on cream is left out at AAA");
  assert.equal(spawnSync(process.execPath, [colours, "--ground", "#fff", "--ink", "#000", "--level", "AAAA"], { encoding: "utf8" }).status, 2);
  // The built ink is part of the look: tan on brown stays tan wherever it reads, not white.
  const tan = JSON.parse(spawnSync(process.execPath, [colours, "--ground", "#3b2416", "--ink", "#d8b98c", "--json"], { encoding: "utf8" }).stdout);
  assert.equal(tan.rows.find((r) => r.label === "as built").ink, "#d8b98c");
  // The text colour has its own row, the built ink first, every option on the ground at 4.5:1.
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
  // --local reads the installed faces, so the test needs DejaVu Serif on the machine.
  if (/--local: it must be installed/.test(result.stderr)) return t.skip("DejaVu Serif is not installed");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.chosen.face, "DejaVu Serif");
  // Its neighbours are read from the machine too: with none of them installed there is nothing to order.
  if (out.measured === 0 && out.missed > 0) return t.skip("FreeSerif and Caladea are not installed");
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

test("links: walks a prototype and says what breaks a flow", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-links-"));
  writeFileSync(join(dir, "home.html"), `<a href="menu.html">Menu</a> <a href="#">Order</a> <a href="gone.html">Gone</a> <a href="https://example.com">out</a>
<button>Dead</button><button id="b">Wired</button><div id="p"><button>Delegated</button></div>
<script>document.getElementById("b").addEventListener("click",()=>{});document.getElementById("p").addEventListener("click",()=>{});</script>`);
  writeFileSync(join(dir, "menu.html"), `<a href="basket.html?state=empty">Basket</a><a href="home.html">Home</a><a href="cart.html?item=rye">Add</a>`);
  // State kept in the address: the cart shows its way on only when it holds something.
  writeFileSync(join(dir, "cart.html"), `<script>if (location.search.includes("item")) document.write('<a href="home.html">Pay</a>')</script>`);
  writeFileSync(join(dir, "basket.html"), "Your basket");
  writeFileSync(join(dir, "checkout.html"), `<a href="home.html">home</a>`);
  const result = spawnSync(process.execPath, [join(root, "skills/design-prototype/scripts/links.mjs"), `file://${join(dir, "home.html")}`, "--expect", "menu,basket,checkout", "--json"], { encoding: "utf8" });
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 1, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.deepEqual(out.pages, [{ page: "home", clicks: 0 }, { page: "menu", clicks: 1 }, { page: "basket", clicks: 2 }, { page: "cart", clicks: 2 }]);
  assert.deepEqual(out.broken.map((b) => b.to), ["gone.html"]);
  assert.deepEqual(out.nowhere.map((n) => n.what), ['link "Order"', 'button "Dead"']);
  assert.deepEqual(out.deadEnds, ["basket"]);
  assert.deepEqual(out.unreached, ["checkout"]);
  assert.equal(out.outside.length, 1);
});

test("links: a form that submits to another page and a button that navigates by script are ways on, not dead ends", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-links-forms-"));
  // Home has no link at all: its ways on are a form with an action, a button wired to navigate, a form whose script navigates,
  // and a button that only toggles something (not a way on, and not reported as nowhere).
  writeFileSync(join(dir, "home.html"), `<form action="order.html" method="post"><input name="loaf" required><button>Order</button></form>
<button id="go">Next</button>
<form id="f"><input name="email" required><input type="submit" value="Sign up"></form>
<button id="t">Toggle</button>
<script>
document.getElementById("go").addEventListener("click", () => { location.href = "thanks.html"; });
document.getElementById("f").addEventListener("submit", (e) => { e.preventDefault(); location.href = "signed.html"; });
document.getElementById("t").addEventListener("click", () => { document.title = "toggled"; });
</script>`);
  writeFileSync(join(dir, "order.html"), `<a href="home.html">Home</a>`);
  writeFileSync(join(dir, "thanks.html"), `<a href="home.html">Home</a>`);
  writeFileSync(join(dir, "signed.html"), `<a href="home.html">Home</a>`);
  // A page whose only way on is a form to a page that is not there still fails.
  writeFileSync(join(dir, "stuck.html"), `<form action="gone.html"><button>Go</button></form>`);
  const links = join(root, "skills/design-prototype/scripts/links.mjs");
  const result = spawnSync(process.execPath, [links, `file://${join(dir, "home.html")}`, "--expect", "order,thanks,signed", "--json"], { encoding: "utf8" });
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const out = JSON.parse(result.stdout);
  assert.deepEqual(out.pages, [{ page: "home", clicks: 0 }, { page: "order", clicks: 1 }, { page: "thanks", clicks: 1 }, { page: "signed", clicks: 1 }]);
  assert.deepEqual([out.broken, out.nowhere, out.deadEnds, out.unreached], [[], [], [], []]);
  const stuck = spawnSync(process.execPath, [links, `file://${join(dir, "stuck.html")}`, "--json"], { encoding: "utf8" });
  assert.equal(stuck.status, 1);
  const bad = JSON.parse(stuck.stdout);
  assert.deepEqual(bad.broken.map((b) => b.to), ["gone.html"]);
  assert.deepEqual(bad.deadEnds, ["stuck"]);
});

test("links: lists what is marked data-standin, says when nothing is, and finds a stand-in picture with no mark", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-standins-"));
  mkdirSync(join(dir, "proto"));
  mkdirSync(join(dir, "pictures"));
  for (const f of ["loaf.jpg", "bench.jpg", "own.jpg"]) writeFileSync(join(dir, "pictures", f), "x");
  writeFileSync(join(dir, "pictures", "credits.tsv"), "# name\tfile\tsource\tauthor\tlicence\nloaf\tpictures/loaf.jpg\t\ta\tCC0\nbench\tpictures/bench.jpg\t\ta\tCC0\n");
  const walk = (page, extra = []) => spawnSync(process.execPath, [join(root, "skills/design-prototype/scripts/links.mjs"), `file://${join(dir, "proto", page)}`, ...extra], { encoding: "utf8" });
  // Two stand-in pictures (one inside a marked wrapper), one assumed price, one picture of theirs: exactly three listed.
  writeFileSync(join(dir, "proto", "home.html"), `<a href="menu.html">Menu</a>
<img src="../pictures/loaf.jpg" alt="a rye loaf" data-standin="picture">
<div data-standin="picture" data-standin-note="until the bakery's own"><img src="../pictures/bench.jpg" alt="the bench"></div>
<img src="../pictures/own.jpg" alt="the baker">
<p>Rye loaf <span data-standin="fact" data-standin-note="price not in the brief">£4.20</span></p>`);
  writeFileSync(join(dir, "proto", "menu.html"), `<a href="home.html">Home</a><img src="../pictures/own.jpg" alt="the baker">`);
  const result = walk("home.html", ["--json"]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const out = JSON.parse(result.stdout);
  assert.deepEqual(out.standins.map((s) => [s.page, s.kind, s.note]), [
    ["home", "picture", ""],
    ["home", "picture", "until the bakery's own"],
    ["home", "fact", "price not in the brief"],
  ]);
  assert.deepEqual(out.standins.map((s) => s.what), ["a rye loaf (loaf.jpg)", "the bench (bench.jpg)", "£4.20"]);
  assert.deepEqual(out.unmarked, []);
  assert.match(walk("home.html").stdout, /^stand-ins: 3 \(2 picture, 1 fact\)/m);
  // Everything theirs: nothing listed, and the text says so.
  writeFileSync(join(dir, "proto", "theirs.html"), `<a href="back.html">on</a><img src="../pictures/own.jpg" alt="the baker"><p>£4.20</p>`);
  writeFileSync(join(dir, "proto", "back.html"), `<a href="theirs.html">back</a>`);
  const none = walk("theirs.html");
  assert.equal(none.status, 0, none.stdout);
  assert.match(none.stdout, /^stand-ins: none marked$/m);
  assert.doesNotMatch(none.stdout, /^stand-in /m);
  // A picture from credits.tsv with no mark is a finding; a marked one beside it is not.
  writeFileSync(join(dir, "proto", "loose.html"), `<a href="back.html">on</a><img src="../pictures/loaf.jpg" alt="a rye loaf"><div data-standin="picture"><img src="../pictures/bench.jpg" alt=""></div>`);
  const loose = walk("loose.html");
  assert.equal(loose.status, 1, loose.stdout);
  assert.match(loose.stdout, /^unmarked   loose: picture loaf\.jpg is a stand-in/m);
  assert.doesNotMatch(loose.stdout, /unmarked.*bench/);
  assert.match(loose.stdout, /^stand-ins: 1 \(1 picture\)/m);
});

// A picture with type in it, drawn by rule: hollow letters (an "o" a block) on a light ground, a
// headline of five tall ones, a body line of small ones, and a patch of noise standing for a photo.
function typePicture(flipped = false) {
  const W = 400, H = 300, rgb = new Array(W * H * 3).fill(244);
  const dot = (x, y, v) => { const i = (y * W + (flipped ? W - 1 - x : x)) * 3; rgb[i] = v[0]; rgb[i + 1] = v[1]; rgb[i + 2] = v[2]; };
  const letter = (x0, y0, w, h, s, ink) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x < x0 + s || x >= x0 + w - s || y < y0 + s || y >= y0 + h - s) dot(x, y, ink);
  };
  for (let i = 0; i < 5; i++) letter(30 + i * 52, 40, 40, 60, 8, [20, 20, 20]);
  for (let i = 0; i < 12; i++) letter(30 + i * 12, 200, 8, 12, 2, [20, 20, 20]);
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let y = 150; y < 260; y++) for (let x = 260; x < 380; x++) dot(x, y, [rand() * 255, rand() * 255, rand() * 255].map(Math.round));
  return png(W, H, rgb);
}

test("measure: a picture's type is read: the display's size and weight, the body, the scale, the headline and the blocks", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-measure-type-"));
  writeFileSync(join(dir, "type.png"), typePicture());
  const result = await measured([join(dir, "type.png"), "--lines"]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const { type, traits } = JSON.parse(result.stdout);
  // A 60 px letter is a cap of 60, an em of about 86: at 1440 wide, 86 × 1440 / 400.
  assert.ok(Math.abs(type.display.px1440 - 309) < 20, JSON.stringify(type.display));
  assert.equal(type.display.weight, 400, JSON.stringify(type.display));
  assert.equal(type.display.case, "uppercase");
  assert.equal(type.display.ink, "#141414");
  assert.ok(Math.abs(type.scale - 5) < 0.6, String(type.scale));
  assert.equal(type.body.weight, null, "a body line too small to weigh is given no weight");
  assert.deepEqual(type.headline, { words: 1, lines: 1 });
  assert.equal(type.blocks, 2);
  assert.equal(type.lines.length, 2, "the noise is not read as type");
  assert.equal(traits.ink, "#141414");
  assert.ok(traits.pictures > 3 && traits.pictures < 20, String(traits.pictures));
});

test("fonts --shape: a picture's measured shape stands in for a face; its kind must be said", () => {
  const fonts = join(root, "skills/design-identity/scripts/fonts.mjs");
  const run = (args) => spawnSync(process.execPath, [fonts, ...args], { encoding: "utf8" });
  assert.equal(run(["--shape", "width=0.5,xheight=0.5"]).status, 2, "no --kind");
  assert.equal(run(["--shape", "width=0.5,height=2", "--kind", "serif"]).status, 2, "an unknown measure");
  assert.equal(run(["--shape", "width=0.5", "--kind", "serif", "Georgia"]).status, 2, "a face and a shape at once");
  assert.match(run(["--shape", "width=-1", "--kind", "serif"]).stderr, /--shape width=/);
  // design-direction ships the same copy, for the library step.
  assert.equal(readFileSync(join(root, "skills/design-direction/scripts/fonts.mjs"), "utf8"), readFileSync(fonts, "utf8"));
});

test("picture-cast: a grey wall reads neutral, a pink-tinted one is a cast, a white-out is blown, and the subject's own colour is no cast", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-cast-"));
  // Left half a saturated red object (the subject), right half the wall.
  const picture = (wall) => {
    const px = [];
    for (let y = 0; y < 40; y++) for (let x = 0; x < 80; x++) px.push(...(x < 40 ? [180, 40, 30] : wall));
    return png(80, 40, px);
  };
  writeFileSync(join(dir, "a-neutral.png"), picture([150, 150, 150]));
  writeFileSync(join(dir, "b-pink.png"), picture([170, 140, 150]));
  writeFileSync(join(dir, "c-blown.png"), picture([255, 255, 255]));
  const result = spawnSync(process.execPath, [join(root, "skills/design-direction/scripts/picture-cast.mjs"), dir], { encoding: "utf8" });
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const [neutral, pink, blown] = JSON.parse(result.stdout);
  assert.equal(neutral.cast, "none", JSON.stringify(neutral));
  assert.equal(neutral.fault, false);
  assert.match(pink.cast, /red|magenta/, JSON.stringify(pink));
  assert.equal(pink.fault, true);
  assert.ok(blown.blown > 40 && blown.fault, JSON.stringify(blown));
  assert.equal(spawnSync(process.execPath, [join(root, "skills/design-direction/scripts/picture-cast.mjs")], { encoding: "utf8" }).status, 2);
});

test("layout-diff: a reference and a screen are both required, and --out", () => {
  const script = join(root, "skills/design-direction/scripts/layout-diff.mjs");
  const r = spawnSync(process.execPath, [script, "a.png"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: node layout-diff\.mjs <reference picture> <screen capture> --out <folder>/);
  assert.equal(spawnSync(process.execPath, [script, "a.png", "b.png"], { encoding: "utf8" }).status, 2, "no --out");
});

// A picture's width and height, read from its PNG header.
const sizeOf = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test("layout-diff: a tall reference is drawn on its first screen, and the pictures land beside diff.json from any folder", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-layout-diff-"));
  const elsewhere = join(dir, "elsewhere");
  mkdirSync(elsewhere);
  // A full page 1440 by 2700, a white first screen and red below it, against a 1440 by 900 screen.
  const W = 1440, H = 2700;
  const tall = new Uint8Array(W * H * 3);
  for (let y = 900; y < H; y++) for (let x = 0; x < W; x++) tall.set([255, 0, 0], (y * W + x) * 3);
  tall.fill(255, 0, W * 900 * 3);
  writeFileSync(join(dir, "tall.png"), png(W, H, tall));
  writeFileSync(join(dir, "screen.png"), png(W, 900, new Uint8Array(W * 900 * 3).fill(255)));
  // Run from another folder with a relative --out: the pictures must still sit with diff.json.
  const result = spawnSync(process.execPath, [join(root, "skills/design-direction/scripts/layout-diff.mjs"), join(dir, "tall.png"), join(dir, "screen.png"), "--out", "result"], { encoding: "utf8", cwd: elsewhere });
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(readFileSync(join(elsewhere, "result/diff.json"), "utf8"));
  assert.equal(report.mirror, false);
  assert.deepEqual(report.off, [], "the red below the first screen is not measured");
  // The reference is cut to the first screen, so both pictures are 900 tall, not 2700.
  assert.deepEqual(sizeOf(join(elsewhere, "result/side.png")), [W * 2 + 20, 900]);
  assert.deepEqual(sizeOf(join(elsewhere, "result/overlay.png")), [W, 900]);
});

test("layout-diff: --mirror compares against the reference flipped", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-layout-diff-mirror-"));
  writeFileSync(join(dir, "reference.png"), typePicture());
  writeFileSync(join(dir, "turned.png"), typePicture(true));
  const run = (...extra) => spawnSync(process.execPath, [join(root, "skills/design-direction/scripts/layout-diff.mjs"), join(dir, "reference.png"), join(dir, "turned.png"), "--out", join(dir, extra.length ? "mirrored" : "plain"), ...extra], { encoding: "utf8" });
  const plain = run();
  if (/No Chrome/.test(plain.stderr)) return t.skip("no Chrome installed");
  assert.equal(plain.status, 0, plain.stderr);
  const mirrored = run("--mirror");
  assert.equal(mirrored.status, 0, mirrored.stderr);
  const read = (name) => JSON.parse(readFileSync(join(dir, name, "diff.json"), "utf8"));
  assert.equal(read("plain").mirror, false);
  assert.equal(read("mirrored").mirror, true);
  assert.ok(read("plain").off.includes("headline box [x, y, w, h]"), "turned, its headline is far from the reference's");
  assert.ok(!read("mirrored").off.includes("headline box [x, y, w, h]"), "against the flipped reference it is where it should be");
  assert.ok(read("mirrored").off.length < read("plain").off.length);
});

test("measure: --profiles makes its folder, keeps what it measured when an input fails, and exits non-zero", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-profiles-"));
  const shots = join(dir, "shots");
  mkdirSync(shots);
  writeFileSync(join(shots, "good.png"), png(2, 1, [255, 0, 0, 255, 255, 255]));
  writeFileSync(join(shots, "broken.png"), "not a picture");
  const profiles = join(dir, "not", "yet", "profiles.json");
  const result = await measured([shots, "--profiles", profiles]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /broken\.png/);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(profiles, "utf8")).refs), ["good"]);
});

test("picture-cast: a picture on a plain white or black ground is not blown or crushed for it, and a transparent one is an error", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-ground-"));
  // A mid-grey subject in the middle, ground all round.
  const onGround = (ground) => {
    const px = [];
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) px.push(...(x > 7 && x < 32 && y > 7 && y < 32 ? [150, 130, 120] : ground));
    return png(40, 40, px);
  };
  writeFileSync(join(dir, "a-white.png"), onGround([255, 255, 255]));
  writeFileSync(join(dir, "b-black.png"), onGround([0, 0, 0]));
  const cast = (args) => spawnSync(process.execPath, [join(root, "skills/design-direction/scripts/picture-cast.mjs"), ...args], { encoding: "utf8" });
  const result = cast([dir]);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  const [white, black] = JSON.parse(result.stdout);
  assert.deepEqual([white.blown, white.fault, white.ground], [0, false, "white"], JSON.stringify(white));
  assert.deepEqual([black.crushed, black.fault, black.ground], [0, false, "black"], JSON.stringify(black));
  // A one-pixel gif with nothing in it.
  const empty = join(mkdtempSync(join(tmpdir(), "longbeard-clear-")), "clear.gif");
  writeFileSync(empty, Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
  const clear = cast([empty]);
  assert.equal(clear.status, 1, clear.stderr);
  assert.match(JSON.parse(clear.stdout)[0].error, /nothing visible/);
});
