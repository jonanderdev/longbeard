#!/usr/bin/env node
// Freezes a run's inputs as the short run's fixture: what `run.mjs --from` would take from it (the
// design brief, the moodboard, the pictures, the readings), into fixture/readings, and the faces its
// readings name, from Google Fonts, into fixture/fonts. Pictures that are the fixture's own (the board,
// fixture/pictures) are not copied again: restore.json says where each comes from.
//
//   node eval/design/freeze.mjs <a run that reached design-direction step 2>
//
// Needs the network, for the faces. Run it when the flow up to the readings changes enough that
// the short run's inputs no longer look like what a full run would give it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !existsSync(join(src, ".longbeard/design/direction/library.json"))) {
  console.error("usage: node eval/design/freeze.mjs <a run with .longbeard/design/direction/library.json>");
  process.exit(2);
}
const out = join(here, "fixture/readings");
const fonts = join(here, "fixture/fonts");
// What run.mjs --from leaves out, and what is the run's own business (git, the agent's settings).
const skip = /\/design\/tools(\/|$)|\/design\/direction\/(screens|grid|prototype|checks|fix-check|briefs|build)(\/|$)|\/screens\.json$|\/eval(\/|$)|\/design\/direction\/(round-\d+|messages|message-\d+|table)\.md$/;
rmSync(out, { recursive: true, force: true });
cpSync(join(src, "docs"), join(out, "docs"), { recursive: true });
cpSync(join(src, ".longbeard"), join(out, ".longbeard"), { recursive: true, filter: (p) => !skip.test(p.slice(src.length)) });

// A picture byte for byte the same as one of the fixture's is restored from there, not kept twice.
const own = new Map();
for (const d of ["fixture/board", "fixture/pictures"]) for (const f of readdirSync(join(here, d)).filter((f) => /\.jpe?g$/.test(f))) own.set(readFileSync(join(here, d, f)).toString("base64"), `${d}/${f}`);
const restore = {};
const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]));
for (const f of files(out)) {
  if (/\.jpe?g$/.test(f)) {
    const from = own.get(readFileSync(f).toString("base64"));
    if (from) (restore[relative(out, f)] = from), rmSync(f);
  } else if (/\.(md|json|tsv|html|txt)$/.test(f)) {
    // Paths into the run become relative to it.
    const text = readFileSync(f, "utf8");
    if (text.includes(src)) writeFileSync(f, text.replaceAll(`${src}/`, "").replaceAll(src, "."));
  }
}
writeFileSync(join(out, "restore.json"), JSON.stringify(restore, null, 2) + "\n");

// The faces the readings name, at their weights and the body's 400 and 700, as Google serves them.
const library = JSON.parse(readFileSync(join(src, ".longbeard/design/direction/library.json"), "utf8"));
// A display face at its weight; any other at its weight and the body's 400 and 700 (the screen template loads those).
const wanted = new Map();
for (const r of library.references ?? []) for (const [role, t] of Object.entries(r.type ?? {})) {
  if (!t || typeof t !== "object" || typeof t.face !== "string" || !t.face.trim()) continue;
  const set = wanted.get(t.face) ?? new Set();
  for (const w of role === "display" ? [t.weight || 400] : [t.weight || 400, 400, 700]) set.add(Number(w));
  wanted.set(t.face, set);
}
rmSync(fonts, { recursive: true, force: true });
mkdirSync(fonts, { recursive: true });
const missing = [];
for (const [face, weights] of wanted) for (let w of [...weights].sort()) {
  // No browser's User-Agent: Google answers with plain TTF, which fontconfig reads.
  const family = encodeURIComponent(face).replace(/%20/g, "+");
  const get = (q) => fetch(`https://fonts.googleapis.com/css2?family=${q}`).then((r) => (r.ok ? r.text() : ""), () => "");
  // A weight the face does not have: the browser falls to another of its weights, or to its default when none is here.
  const css = (await get(`${family}:wght@${w}`)) || (readdirSync(fonts).some((f) => f.startsWith(`${face.replace(/\s+/g, "")}-`)) ? "" : await get(family).then((c) => ((w = "default"), c)));
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) {
    missing.push(`${face} ${w}`);
    continue;
  }
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(join(fonts, `${face.replace(/\s+/g, "")}-${w}.ttf`), bytes);
}
writeFileSync(join(fonts, "README.md"), `# The short run's faces\n\nThe faces the readings in \`../readings\` name, as Google Fonts serves them, each under the licence Google Fonts gives it (the SIL Open Font License, or Apache 2.0). \`run.mjs --short\` installs them for its offline Chrome. Written by \`freeze.mjs\`.\n`);
console.log(`froze ${src} into ${relative(process.cwd(), out)} (${Object.keys(restore).length} pictures from the fixture), ${readdirSync(fonts).length - 1} font files${missing.length ? `; not on Google Fonts (they fall back): ${missing.join(", ")}` : ""}`);
