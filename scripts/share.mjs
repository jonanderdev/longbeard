// Files more than one skill needs. Each skill folder installs on its own, so
// each gets a copy. Edit the source, then run npm run share.
import { cpSync, mkdirSync, realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const shared = [
  ["rules/design-rules.md", ["design-direction/references", "design-identity/references", "design-prototype/references", "design-check/references"]],
  ["skills/design-moodboard/scripts/capture.mjs", ["design-identity/scripts", "design-direction/scripts", "design-prototype/scripts", "design-wordmark/scripts", "design-check/scripts"]],
  ["skills/design-moodboard/scripts/contact-sheet.mjs", ["design-families/scripts", "design-direction/scripts", "design-content/scripts"]],
  ["skills/design-moodboard/scripts/moodboard.mjs", ["design-families/scripts", "design-direction/scripts"]],
  ["skills/design-families/scripts/measure.mjs", ["design-identity/scripts", "design-direction/scripts", "design-moodboard/scripts"]],
  ["skills/design-families/scripts/families.mjs", ["design-moodboard/scripts"]],
  ["skills/design-families/scripts/tag.mjs", ["design-moodboard/scripts"]],
  ["skills/design-direction/scripts/sheet.mjs", ["design-identity/scripts", "design-prototype/scripts", "design-wordmark/scripts"]],
  ["skills/design-direction/scripts/screen-contrast.mjs", ["design-prototype/scripts", "design-check/scripts"]],
  ["skills/design-prototype/scripts/contrast.mjs", ["design-identity/scripts", "design-check/scripts"]],
  ["skills/design-check/scripts/rules.mjs", ["design-direction/scripts", "design-prototype/scripts"]],
  ["skills/design-prototype/scripts/tokens.mjs", ["design-check/scripts"]],
  ["skills/design-direction/scripts/pictures.mjs", ["design-content/scripts", "design-prototype/scripts", "design-moodboard/scripts"]],
  ["skills/design-direction/scripts/subject-colours.mjs", ["design-identity/scripts"]],
  ["skills/design-identity/scripts/fonts.mjs", ["design-direction/scripts"]],
  ["skills/design-identity/scripts/colours.mjs", ["design-direction/scripts"]],
];

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  for (const [source, targets] of shared) {
    const name = source.split("/").pop();
    for (const target of targets) {
      const to = `skills/${target}/${name}`;
      mkdirSync(dirname(to), { recursive: true });
      cpSync(source, to);
    }
  }
}
