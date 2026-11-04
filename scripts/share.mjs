// Files more than one skill needs. Each skill folder installs on its own, so
// each gets a copy. Edit the source, then run npm run share.
import { cpSync } from "node:fs";

export const shared = [
  ["rules/design-rules.md", ["design/references", "design-check/references"]],
  ["skills/design-direction/scripts/capture.mjs", ["design/scripts", "design-check/scripts"]],
  ["skills/design/scripts/contrast.mjs", ["design-check/scripts"]],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [source, targets] of shared) {
    const name = source.split("/").pop();
    for (const target of targets) cpSync(source, `skills/${target}/${name}`);
  }
}
