#!/usr/bin/env node
// Lay screenshots out as one numbered sheet, so a round of first screens can
// be seen and picked from together. It writes an HTML page; capture.mjs turns
// that into the picture to show. No dependencies.
//
//   node sheet.mjs design-exploration/<slug>/grid/sheet.html design-exploration/<slug>/grid/1.png design-exploration/<slug>/grid/2.png …
//   node sheet.mjs design-exploration/<slug>/grid/vary.html --cols 5 design-exploration/<slug>/grid/v*.png
//   node capture.mjs "file://$PWD/design-exploration/<slug>/grid/sheet.html" --out design-exploration/<slug>/grid/sheet.png
//
// Tiles are numbered in the order given, left to right, top to bottom, which
// is the recipe's number when the shots are passed in order.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const at = args.indexOf("--cols");
const cols = at === -1 ? 2 : Number(args.splice(at, 2)[1]);
const [outArg, ...shots] = args;
if (!outArg || !/\.html$/.test(outArg) || !shots.length || !Number.isInteger(cols) || cols < 1 || cols > 8) {
  console.error("usage: node sheet.mjs <out.html> [--cols 2] <shot.png> …");
  process.exit(2);
}
const out = resolve(outArg);
for (const shot of shots) {
  if (!existsSync(resolve(shot))) {
    console.error(`sheet: no file at ${shot}`);
    process.exit(1);
  }
}
const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const tiles = shots
  .map((shot, i) => `<figure><img src="${escape(relative(dirname(out), resolve(shot)).split("\\").join("/"))}" alt="Screen ${i + 1}"><figcaption>${i + 1}</figcaption></figure>`)
  .join("\n");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `<!doctype html>
<meta charset="utf-8">
<title>Sheet</title>
<style>
  body { margin: 0; padding: 24px; background: #6f6f6f; font: 600 22px/1 system-ui, sans-serif; }
  main { display: grid; grid-template-columns: repeat(${cols}, 720px); gap: 24px; width: max-content; }
  figure { margin: 0; position: relative; }
  img { display: block; width: 720px; height: auto; }
  figcaption { position: absolute; left: 0; top: 0; min-width: 44px; padding: 11px 0; text-align: center; background: #111; color: #fff; }
</style>
<main>
${tiles}
</main>
`,
);
console.log(`${shots.length} screens, ${cols} across: ${outArg}`);
