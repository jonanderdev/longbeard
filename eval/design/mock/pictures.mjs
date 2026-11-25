#!/usr/bin/env node
// The eval's stand-in for pictures.mjs: no search, no network. It hands out the fixture's own
// pictures of the subject (eval/design/fixture/pictures, all CC0) in order, with the same
// credits.tsv rows the real script writes, so every run designs with the same photographs.
// run.mjs puts it in place of every skill's pictures.mjs in the project it builds.
//
//   node pictures.mjs "sourdough loaf" --out .longbeard/design/pictures [--count 2]
//
// The query is read and ignored; --min, --orientation, --timeout and --api are accepted and ignored.
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args.splice(i, 2)[1] ?? "");
};
const out = flag("out");
const count = Number(flag("count", "4"));
for (const n of ["min", "orientation", "timeout", "api"]) flag(n);
if (!args.join(" ").trim() || !out || !(count >= 1 && count <= 12)) {
  console.error(`usage: node pictures.mjs "subject" --out <dir> [--count 4]`);
  process.exit(2);
}
// Beside this file in the project (pictures-fixture/), else the repo's fixture.
const here = dirname(fileURLToPath(import.meta.url));
const src = [process.env.LB_EVAL_PICTURES, join(here, "../../fixture/pictures")].find((d) => d && existsSync(join(d, "credits.tsv")));
if (!src) {
  console.error("pictures: the eval's fixture pictures are not here (set LB_EVAL_PICTURES)");
  process.exit(2);
}
const HEADER = "# name\tfile\tsource\tauthor\tlicence\tlicence link\tcredit line\tshare-alike\n";
const rows = (file) => readFileSync(file, "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));
mkdirSync(out, { recursive: true });
const credits = join(out, "credits.tsv");
if (!existsSync(credits)) writeFileSync(credits, HEADER);
const known = new Set(rows(credits).map((r) => r[2]));
let kept = 0;
for (const r of rows(join(src, "credits.tsv"))) {
  if (kept >= count) break;
  if (known.has(r[2])) continue;
  const path = join(out, r[1]);
  copyFileSync(join(src, r[1]), path);
  appendFileSync(credits, [r[0], path, ...r.slice(2)].join("\t") + "\n");
  console.log(`kept  ${path}  ${r[4]}  ${r[3]}`);
  kept++;
}
console.log(`${kept} kept in ${out}${kept < count ? `; the eval has no more pictures (${rows(join(src, "credits.tsv")).length} in all)` : ""}. Credits in ${credits}.`);
