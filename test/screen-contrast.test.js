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
