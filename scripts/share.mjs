// Files more than one skill needs. Each skill folder installs on its own, so
// each gets a copy. Edit the source, then run npm run share.
import { cpSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const shared = [
  ["rules/design-rules.md", ["design-direction/references", "design-prototype/references", "design-check/references"]],
  ["skills/design-moodboard/scripts/capture.mjs", ["design-identity/scripts", "design-direction/scripts", "design-prototype/scripts", "design-wordmark/scripts", "design-check/scripts"]],
  ["skills/design-moodboard/scripts/contact-sheet.mjs", ["design-families/scripts", "design-direction/scripts", "design-content/scripts"]],
  ["skills/design-moodboard/scripts/moodboard.mjs", ["design-families/scripts", "design-direction/scripts"]],
  ["skills/design-families/scripts/measure.mjs", ["design-identity/scripts", "design-direction/scripts"]],
  ["skills/design-direction/scripts/sheet.mjs", ["design-identity/scripts", "design-prototype/scripts", "design-wordmark/scripts"]],
  ["skills/design-direction/scripts/screen-contrast.mjs", ["design-prototype/scripts"]],
  ["skills/design-prototype/scripts/contrast.mjs", ["design-identity/scripts", "design-check/scripts"]],
  ["skills/design-direction/scripts/pictures.mjs", ["design-content/scripts", "design-prototype/scripts"]],
  ["skills/design-direction/scripts/deal.mjs", ["design-identity/scripts"]],
  ["skills/design-direction/references/five-second.md", ["design-prototype/references"]],
  ["skills/design-direction/scripts/subject-colours.mjs", ["design-identity/scripts"]],
  ["skills/design-identity/scripts/fonts.mjs", ["design-direction/scripts"]],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [source, targets] of shared) {
    const name = source.split("/").pop();
    for (const target of targets) {
      const to = `skills/${target}/${name}`;
      mkdirSync(dirname(to), { recursive: true });
      cpSync(source, to);
    }
  }
}
