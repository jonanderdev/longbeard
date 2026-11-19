#!/usr/bin/env node
// Where an exploration stopped, read from the files it has, so a new session
// picks up there instead of starting over or reading every file. No dependencies.
//
//   node status.mjs                                  every exploration in design-exploration/
//   node status.mjs design-exploration/<slug>        one
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const root = "design-exploration";
const [one] = process.argv.slice(2);
const read = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

function status(dir) {
  const at = (f) => existsSync(join(dir, f));
  const refs = at("refs") ? readdirSync(join(dir, "refs")).filter((f) => !f.startsWith(".")).length : 0;
  if (at("direction.md")) {
    if (at("deal.json")) {
      const deal = read(join(dir, "deal.json")) || {};
      return `in design: ${(deal.rounds || []).length} rounds dealt${deal.chosen ? ", the first screen chosen" : ", none chosen yet"}. Go on with design`;
    }
    return "direction written: show it with the library readout, or take it into design (step 7)";
  }
  if (at("library.json")) {
    const left = (JSON.stringify(read(join(dir, "library.json")) || {}).match(/"WRITE:/g) || []).length;
    return left ? `library prefilled, ${left} fields to write (step 6: library.mjs --check)` : "library read: write direction.md (step 7)";
  }
  if (at("moodboard.html")) return "moodboard built: waiting for their marks, the anchor and the donors (step 5)";
  if (at("families.html")) return "families board built: waiting for the families they take (step 5)";
  if (at("board.md")) return "board written: build the families board or the moodboard (step 5)";
  if (at("profiles.json")) {
    const profiles = Object.values(read(join(dir, "profiles.json"))?.refs || {});
    const untagged = profiles.filter((p) => !p.tags).length;
    return untagged ? `${profiles.length} measured, ${untagged} to tag (step 4: tag.mjs --sheets)` : `${profiles.length} measured and tagged: sort into families (step 4: families.mjs)`;
  }
  if (refs) return `${refs} references saved, none measured: measure them (step 4)`;
  if (at("picker-2.html")) return "round 2 picker built: waiting for their picks (step 3)";
  if (at("picker.html")) return "picker built: waiting for their picks (step 3)";
  if (at("candidates.tsv")) return "candidates found, no picker yet: check the pool, then build it (step 3)";
  return "started, nothing saved yet: the brief round (step 1)";
}

if (one) {
  if (!existsSync(one)) {
    console.error(`status: nothing at ${one}`);
    process.exit(1);
  }
  console.log(`${basename(one)}: ${status(one)}`);
} else if (!existsSync(root)) console.log("no explorations yet: design-direction starts at the brief round");
else {
  const dirs = readdirSync(root).filter((d) => !d.startsWith(".") && statSync(join(root, d)).isDirectory());
  if (!dirs.length) console.log("no explorations yet: design-direction starts at the brief round");
  for (const d of dirs) console.log(`${d}: ${status(join(root, d))}`);
}
