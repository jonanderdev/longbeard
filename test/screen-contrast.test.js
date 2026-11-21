import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const script = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-direction/scripts/screen-contrast.mjs");
const run = (args) =>
  new Promise((done) => {
    const child = spawn(process.execPath, [script, ...args]);
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stdout, stderr }));
  });
const page = (html) => {
  const file = join(mkdtempSync(join(tmpdir(), "longbeard-screen-contrast-")), "p.html");
  writeFileSync(file, `<!doctype html><meta charset=utf-8><body style="margin:0">${html}`);
  return `file://${file}`;
};

test("screen-contrast: reads text where it sits, and fails a pale name that runs off onto a light block", async (t) => {
  const good = await run([page('<p style="font:16px sans-serif;color:#111;padding:40px">Dark text on white</p>'), "--size", "800x400"]);
  if (/No Chrome/.test(good.stderr)) return t.skip("no Chrome installed");
  assert.equal(good.status, 0, good.stderr + good.stdout);
  assert.match(good.stderr, /1 texts, 0 under/);

  // On the dark ground the pale name reads; its right half runs over a light block, and fails there.
  const bad = await run([
    page('<div style="background:#222;width:800px;height:400px;position:relative"><div style="position:absolute;left:300px;top:0;width:500px;height:400px;background:#ddd"></div><h1 style="position:relative;margin:0;padding:150px 0 0 100px;font:700 64px sans-serif;color:#f0f0f0">Bohemian Lane</h1></div>'),
    "--size",
    "800x400",
  ]);
  assert.equal(bad.status, 1, bad.stderr + bad.stdout);
  assert.match(bad.stdout, /"Bohemian Lane"/);
  assert.match(bad.stdout, /needs 3:1 \(large\)/);

  const json = JSON.parse((await run([page('<p style="color:#666;background:#fff">grey</p>'), "--size", "400x200", "--json"])).stdout);
  assert.equal(json.failing, 0);
  assert.equal(json.texts[0].text, "grey");
});

test("screen-contrast: outlined text is read by its stroke, not its clear fill", async (t) => {
  const outline = (stroke) => page(`<div style="background:#250b04;width:800px;height:400px"><h1 style="margin:0;padding:120px 40px;font:700 96px serif;color:transparent;-webkit-text-stroke:2px ${stroke}">Outline</h1></div>`);
  const good = await run([outline("#f1e9dc"), "--size", "800x400", "--json"]);
  if (/No Chrome/.test(good.stderr)) return t.skip("no Chrome installed");
  const g = JSON.parse(good.stdout).texts[0];
  assert.match(g.colour, /#f1e9dc \(outline\)/);
  assert.ok(g.p5 > 10, JSON.stringify(g));
  // A dark stroke on the dark ground fails.
  const bad = JSON.parse((await run([outline("#3a1a10"), "--size", "800x400", "--json"])).stdout);
  assert.equal(bad.failing, 1);
});

test("screen-contrast: a missing url is a usage error", async () => {
  assert.equal((await run([])).status, 2);
  assert.equal((await run(["not-a-url"])).status, 2);
});

test("screen-contrast: any colour notation is read as the sRGB it is drawn as", async (t) => {
  const p = (colour) => page(`<p style="font:16px sans-serif;color:${colour};padding:40px">Some text</p>`);
  const read = async (colour) => {
    const r = await run([p(colour), "--size", "600x200", "--json"]);
    return { ...r, json: r.stdout ? JSON.parse(r.stdout) : null };
  };
  const dark = await read("oklch(0.2 0.02 60)");
  if (/No Chrome/.test(dark.stderr)) return t.skip("no Chrome installed");
  assert.equal(dark.status, 0, dark.stderr);
  assert.equal(dark.json.unread.length, 0);
  assert.ok(dark.json.texts[0].p5 > 10, "a dark oklch colour is not read as black or as nothing");
  for (const pale of ["oklch(0.92 0.02 60)", "lab(90% 5 5)", "color(display-p3 0.95 0.9 0.9)", "oklab(0.93 0.01 0.01)", "color-mix(in oklch, white, #eee)"]) {
    const r = await read(pale);
    assert.equal(r.status, 1, `${pale}: ${r.stderr}${r.stdout}`);
    assert.equal(r.json.failing, 1, pale);
    assert.ok(r.json.texts[0].p5 < 1.5, `${pale} read as ${r.json.texts[0].colour}`);
  }
  // Mid-grey in oklch is read as mid-grey, not as black.
  const mid = await read("oklch(0.5 0 0)");
  assert.match(mid.json.texts[0].colour, /#636363/);
  // A faded colour keeps its alpha.
  const faint = await read("oklch(0.2 0.02 60 / 0.3)");
  assert.match(faint.json.texts[0].colour, / at 30%$/);
});

test("screen-contrast: text filled by a clipped gradient is listed as not read, never as failing", async (t) => {
  const r = await run([page('<h1 style="font:700 48px sans-serif;margin:20px;background:linear-gradient(90deg,#c00,#00c);-webkit-background-clip:text;background-clip:text;color:transparent">Gradient name</h1><p style="font:16px sans-serif;color:#111;margin:20px">Plain</p>'), "--size", "600x300"]);
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /^not read: "Gradient name"/m);
  assert.match(r.stderr, /1 texts, 0 under, 1 not read/);
});

test("screen-contrast: the whole page is read, or the report says how far it looked", async (t) => {
  const tall = page('<p style="font:16px sans-serif;color:#111;padding:20px">Top</p><div style="height:2500px;background:#222"></div><p style="font:16px sans-serif;color:#333;background:#222;padding:20px">Far down</p>');
  const whole = await run([tall, "--size", "600x400"]);
  if (/No Chrome/.test(whole.stderr)) return t.skip("no Chrome installed");
  assert.equal(whole.status, 1, whole.stderr + whole.stdout);
  assert.match(whole.stdout, /"Far down"/);
  assert.match(whole.stderr, /looked at all \d+ px of the page/);
  const cut = await run([tall, "--size", "600x400", "--max-height", "1000"]);
  assert.equal(cut.status, 0, cut.stderr + cut.stdout);
  assert.doesNotMatch(cut.stdout, /Far down/);
  assert.match(cut.stderr, /looked at the top 1000 of \d+ px; the rest is not checked/);
});

test("screen-contrast: --level AAA asks 7:1, and --min wins over it", async (t) => {
  const grey = page('<p style="font:16px sans-serif;color:#666666;background:#fff;padding:20px">Mid grey</p>');
  const aa = await run([grey, "--size", "400x200"]);
  if (/No Chrome/.test(aa.stderr)) return t.skip("no Chrome installed");
  assert.equal(aa.status, 0, aa.stderr + aa.stdout);
  const aaa = await run([grey, "--size", "400x200", "--level", "AAA"]);
  assert.equal(aaa.status, 1, aaa.stderr + aaa.stdout);
  assert.match(aaa.stdout, /needs 7:1/);
  assert.equal((await run([grey, "--size", "400x200", "--level", "AAA", "--min", "4.5"])).status, 0);
  assert.equal((await run([grey, "--level", "AAAA"])).status, 2);
});

test("screen-contrast: exit 3 is a run that could not finish, a hung page included", async (t) => {
  const missing = await run(["file:///no/such/page.html", "--size", "400x200"]);
  if (/No Chrome/.test(missing.stderr)) return t.skip("no Chrome installed");
  assert.equal(missing.status, 3, missing.stderr);
  const hung = await run([page("<p>x</p><script>setTimeout(() => { for (;;); }, 200)</script>"), "--size", "400x200", "--timeout", "2"]);
  assert.equal(hung.status, 3, hung.stderr);
  assert.match(hung.stderr, /did not answer within 2 s/);
});
