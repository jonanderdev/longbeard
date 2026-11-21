#!/usr/bin/env node
// WCAG 2.x contrast for colour pairs.
//   node contrast.mjs "#2c2824 on #f6f1e7" "#b0563a on #f6f1e7:mark"
// Suffix :large or :mark checks against 3:1 instead of 4.5:1. --level AAA (the design brief's
// accessibility line) asks 7:1 for text and 4.5:1 for large text; a mark stays 3:1. Short hex (#abc) is read as #aabbcc.
// An argument it cannot read is an error: it exits 1 rather than pass unchecked.
const hex6 = (h) => (h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join("")}` : h).toLowerCase();
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const args = process.argv.slice(2);
const at = args.indexOf("--level");
const level = at === -1 ? "AA" : String(args.splice(at, 2)[1] || "").toUpperCase();
if (level !== "AA" && level !== "AAA") {
  console.error("contrast: --level is AA or AAA");
  process.exit(2);
}
let failed = false;
for (const arg of args) {
  const m = arg.trim().match(/^(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s+on\s+(#[0-9a-f]{3}(?:[0-9a-f]{3})?)(?::(large|mark))?$/i);
  if (!m) {
    console.error(`cannot read: ${arg} (write "#rrggbb on #rrggbb", optionally :large or :mark)`);
    failed = true;
    continue;
  }
  m[1] = hex6(m[1]);
  m[2] = hex6(m[2]);
  const [a, b] = [lum(m[1]), lum(m[2])];
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const kind = (m[3] || "").toLowerCase();
  const need = kind === "mark" ? 3 : kind === "large" ? (level === "AAA" ? 4.5 : 3) : level === "AAA" ? 7 : 4.5;
  const best = kind === "mark" ? "" : ratio >= (kind ? 4.5 : 7) ? "AAA" : "";
  const verdict = ratio < need ? "FAIL" : best || "AA";
  if (verdict === "FAIL") failed = true;
  console.log(`${m[1]} on ${m[2]}  ${ratio.toFixed(2)}:1  ${verdict}${kind || level === "AAA" ? ` (${[kind, `needs ${need}:1`].filter(Boolean).join(", ")})` : ""}`);
}
process.exit(failed ? 1 : 0);
