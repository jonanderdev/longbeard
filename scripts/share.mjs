// Files more than one skill needs. Each skill folder installs on its own, so
// each gets a copy. Edit the source, then run npm run share.
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The skills that build read only the floor: the rules' opening sections and every
// hard check, under the same headings, so their links hold. The soft checks and the
// tells are design-check's, a review after the build, never a constraint while drawing.
export function floor(text) {
  const out = [
    "# Design floor",
    "",
    "Generated from `rules/design-rules.md` by `npm run share`: its opening sections and every hard check. The soft checks and the tells are `design-check`'s.",
  ];
  const [head, ...sections] = text.split(/^(?=## )/m);
  out.push(...head.split("\n").slice(1));
  for (const section of sections) {
    const lines = section.trimEnd().split("\n");
    const title = lines[0];
    if (!/^## \d+\./.test(title) && !/^## (Before you build|How to use this|Sites|Apps|Graphics)$/.test(title)) continue;
    if (/^## (Before you build|How to use this)$/.test(title)) {
      out.push(...lines, "");
      continue;
    }
    const kept = lines.filter((l) => /^- \[hard\]/.test(l) || /^- \*\*/.test(l) || /^\*\*Principle:\*\*/.test(l));
    if (!kept.some((l) => !/^\*\*Principle/.test(l))) continue;
    out.push(title, "", ...kept, "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// [source, targets, optional { as: name, make: transform }]
export const shared = [
  ["rules/design-rules.md", ["design-check/references"]],
  ["rules/design-rules.md", ["design-direction/references", "design-identity/references", "design-prototype/references"], { as: "design-floor.md", make: floor }],
  ["skills/design-moodboard/scripts/capture.mjs", ["design-identity/scripts", "design-direction/scripts", "design-prototype/scripts", "design-wordmark/scripts", "design-check/scripts"]],
  ["skills/design-moodboard/scripts/contact-sheet.mjs", ["design-direction/scripts", "design-content/scripts"]],
  ["skills/design-moodboard/scripts/moodboard.mjs", ["design-direction/scripts"]],
  ["skills/design-moodboard/scripts/measure.mjs", ["design-identity/scripts", "design-direction/scripts"]],
  ["skills/design-direction/scripts/sheet.mjs", ["design-identity/scripts", "design-prototype/scripts", "design-wordmark/scripts"]],
  ["skills/design-direction/scripts/canvas.mjs", ["design-identity/scripts", "design-prototype/scripts", "design-wordmark/scripts"]],
  ["skills/design-direction/scripts/bundle.mjs", ["design-moodboard/scripts", "design-identity/scripts", "design-prototype/scripts", "design-wordmark/scripts"]],
  ["skills/design-direction/scripts/screen-contrast.mjs", ["design-prototype/scripts", "design-check/scripts"]],
  ["skills/design-prototype/scripts/contrast.mjs", ["design-identity/scripts", "design-check/scripts"]],
  ["skills/design-check/scripts/rules.mjs", ["design-direction/scripts", "design-prototype/scripts"]],
  ["skills/design-prototype/scripts/tokens.mjs", ["design-check/scripts"]],
  ["skills/design-prototype/references/variants.js", ["design-direction/references"]],
  ["skills/design-direction/scripts/pictures.mjs", ["design-content/scripts", "design-prototype/scripts", "design-moodboard/scripts"]],
  ["skills/design-direction/scripts/subject-colours.mjs", ["design-identity/scripts"]],
  ["skills/design-identity/scripts/fonts.mjs", ["design-direction/scripts"]],
  ["skills/design-identity/scripts/colours.mjs", ["design-direction/scripts"]],
];

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  for (const [source, targets, made] of shared) {
    const name = made?.as || source.split("/").pop();
    for (const target of targets) {
      const to = `skills/${target}/${name}`;
      mkdirSync(dirname(to), { recursive: true });
      if (made) writeFileSync(to, made.make(readFileSync(source, "utf8")));
      else cpSync(source, to);
    }
  }
}
