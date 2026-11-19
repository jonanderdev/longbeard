// Build synthetic profiles and run families.mjs on them.
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
const F = fileURLToPath(new URL("../../../../../skills/design-direction/scripts/families.mjs", import.meta.url));
const OUT = join(tmpdir(), "pr-40-families");
function profile(name, o) {
  const { lum = 0.9, empty = 60, loud = 1, busy = 2, picture = "none", layout = "left", type = "sans", colour = "neutral", surface = "flat", photo, weight = "regular",
    colours = 20, colourful = 20, grey = 50, soft = 20, sharp = 30, grid = 30, gridArr } = o;
  return { shot: `refs/${name}.jpg`, link: null,
    image: { traits: { tone: lum > 0.6 ? "light" : lum < 0.12 ? "dark" : "mid", lum, empty, loud, busy, ground: "#000000" },
      figure: { share: 100 - empty, colours, colourful, grey, flat: 100 - soft - sharp, soft, sharp, texture: 10, palette: [], grid: gridArr || new Array(24).fill(grid) } },
    page: null,
    tags: o.untagged ? undefined : { picture: [].concat(picture), photo: [].concat(photo || (picture === "photo" ? "colour" : "none")), type: [].concat(type), weight: [].concat(weight), layout: [].concat(layout), colour: [].concat(colour), surface: [].concat(surface) } };
}
export function run(label, refs, extra = []) {
  const dir = join(OUT, `case-${label}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/profiles.json`, JSON.stringify({ refs }));
  const r = spawnSync(process.execPath, [F, "profiles.json", ...extra], { cwd: dir, encoding: "utf8" });
  const fams = r.status === 0 ? JSON.parse(readFileSync(`${dir}/families.json`, "utf8")).families : [];
  console.log(`\n== ${label} ${extra.join(" ")} (exit ${r.status}) ${r.stderr.trim()}`);
  for (const f of fams) console.log(`  ${f.id}${f.stray ? "" : ` r=${f.radius}`}: ${f.members.map((m) => m.replace(/^refs\/|\.jpg$/g, "")).join(", ")}`);
}
export { profile };
