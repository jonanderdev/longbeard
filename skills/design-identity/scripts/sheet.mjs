#!/usr/bin/env node
// Lay screenshots out as one numbered sheet, so a round of first screens can
// be seen and picked from together. It writes an HTML page; capture.mjs turns
// that into the picture to show. No dependencies.
//
//   node sheet.mjs .longbeard/design/direction/grid/sheet.html .longbeard/design/direction/grid/1.png .longbeard/design/direction/grid/2.png …
//   node sheet.mjs .longbeard/design/direction/grid/vary.html --cols 5 .longbeard/design/direction/grid/v*.png
//   node capture.mjs "file://$PWD/.longbeard/design/direction/grid/sheet.html" --out .longbeard/design/direction/grid/sheet.png
//   node sheet.mjs <out.html> --rough 1,2,4 --note "built without fresh agents: weaker" <shots…>
//
// --rough 1,2,4 (or none) labels those tiles "rough" and the rest "full", so a quick screen is never
// read as a finished one. --note prints a line under the sheet.

// Tiles are numbered in the order given, left to right, top to bottom, which
// is the recipe's number when the shots are passed in order.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const at = args.indexOf("--cols");
const cols = at === -1 ? 2 : Number(args.splice(at, 2)[1]);
const take = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args.splice(i, 2)[1] ?? "");
};
const roughArg = take("--rough");
const note = take("--note");
const rough = new Set((roughArg ?? "").split(",").filter((n) => n && n !== "none").map(Number));
const [outArg, ...shots] = args;
if (!outArg || [...rough].some((n) => !Number.isInteger(n) || n < 1) || roughArg === "" || note === "" || !/\.html$/.test(outArg) || !shots.length || !Number.isInteger(cols) || cols < 1 || cols > 8) {
  console.error('usage: node sheet.mjs <out.html> [--cols 2] [--rough 1,2|none] [--note "text"] <shot.png> …');
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
  .map((shot, i) => `<figure><img src="${escape(relative(dirname(out), resolve(shot)).split("\\").join("/"))}" alt="Screen ${i + 1}"><figcaption>${i + 1}${roughArg === null ? "" : rough.has(i + 1) ? " · rough" : " · full"}</figcaption></figure>`)
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
  figure { margin: 0; display: flex; flex-direction: column-reverse; gap: 8px; }
  img { display: block; width: 720px; height: auto; }
  /* The number sits above the screen, never on it: a corner of a screen is where its name or menu is. */
  p { margin: 24px 0 0; max-width: 1200px; font-weight: 400; font-size: 20px; line-height: 1.4; color: #fff; }
  figcaption { align-self: flex-start; min-width: 44px; padding: 8px 10px; text-align: center; background: #111; color: #fff; }
</style>
<main>
${tiles}
</main>
${note ? `<p>${escape(note)}</p>\n` : ""}`,
);
console.log(`${shots.length} screens, ${cols} across: ${outArg}`);
