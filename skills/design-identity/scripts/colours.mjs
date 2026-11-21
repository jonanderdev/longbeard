#!/usr/bin/env node
// The colour options of design-identity, made by rule, not picked by the agent: the
// chosen screen's ground and accent, even steps around each in OKLCH (lighter,
// darker, warmer, cooler), the family's own colours, and theirs. Every ground
// keeps the built ink where it reads, or else gets near-black or near-white, and an option that fails contrast is left
// out: 4.5:1 for text on a ground, 3:1 for an accent on its ground. --level AAA
// (the design brief's accessibility) asks 7:1 for text and 4.5:1 for an accent,
// which may carry large text; a mark such as a button's fill stays 3:1. No
// dependencies.
//
//   node colours.mjs --ground "#f1ede4" --ink "#111111" --accent "#fe2601" \
//     --family "#ebe4e0,#b6bc94,#fd3b19" --theirs "#2b4c7e" [--level AAA]
//
// Three choices only: the ground, the text colour (ink) and one accent. The
// ink has its own row, the built ink first: lighter, darker, warmer and cooler
// steps of it, near-black and near-white, each checked on the built ground.
//
// Prints one row per option: row, label, colour, ink (for grounds), contrast
// (cut, not rounded, to one place, so a ratio just under its need never prints as the need).
// --json prints the same as JSON, for a page that renders the rows.
//
// --roles: once the three are picked, every other role is derived by rule and
// checked, never chosen one by one: soft text, a hairline, the button's fill
// and label, a picture tone, and status (ok, warn, error) on the ground.
//   node colours.mjs --roles --ground "#3b2416" --ink "#d8b98c" --accent "#e8643c"

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
};
const json = args.includes("--json");
const rolesMode = args.includes("--roles");
const groundArg = flag("ground");
const inkArg = flag("ink");
const accentArg = flag("accent");
const familyArg = flag("family");
const theirsArg = flag("theirs");
const levelArg = (flag("level") || "AA").toUpperCase();
if (levelArg !== "AA" && levelArg !== "AAA") {
  console.error("colours: --level is AA or AAA");
  process.exit(2);
}
// What each kind of colour has to reach: text, an accent (which may carry large text), a mark.
const textNeed = levelArg === "AAA" ? 7 : 4.5;
const accentNeed = levelArg === "AAA" ? 4.5 : 3;
const markNeed = 3;
const cut = (v) => Math.floor(v * 10) / 10;
const hex6 = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${[...s.slice(1)].map((c) => c + c).join("")}`;
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
};
const list = (v) => (v ? v.split(",").map(hex6).filter(Boolean) : []);
const ground = hex6(groundArg);
const ink = hex6(inkArg);
if (!ground || !ink) {
  console.error('usage: node colours.mjs --ground "#rrggbb" --ink "#rrggbb" [--accent "#rrggbb"] [--family "#a,#b"] [--theirs "#c"] [--level AA|AAA] [--json]');
  process.exit(2);
}
const accent = hex6(accentArg);

// sRGB and OKLCH, both ways. Out of gamut, chroma is reduced until the colour fits.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const hexOf = (rgb) => `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("")}`;
function oklch(hex) {
  const [r, g, b] = rgbOf(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function fromOklch([L, C, H]) {
  for (let c = C; c >= 0; c -= 0.005) {
    const a = c * Math.cos((H * Math.PI) / 180), b = c * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return hexOf(rgb.map(toGam));
  }
  return hexOf([L, L, L].map(toGam));
}
// WCAG contrast.
const lum = (hex) => {
  const [r, g, b] = rgbOf(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// A step: lighter or darker by 0.06 in lightness; warmer or cooler by 20 degrees of hue toward
// orange (55) or blue (250), whichever way is shorter.
const toward = (h, target, by) => {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(by, Math.abs(d)) + 360) % 360;
};
const step = (hex, kind) => {
  const [L, C, H] = oklch(hex);
  if (kind === "lighter") return fromOklch([Math.min(0.99, L + 0.06), C, H]);
  if (kind === "darker") return fromOklch([Math.max(0.02, L - 0.06), C, H]);
  if (kind === "warmer") return fromOklch([L, Math.max(C, 0.02), toward(H, 55, 20)]);
  return fromOklch([L, Math.max(C, 0.02), toward(H, 250, 20)]);
};

// A colour between two, in OKLCH: t of the way from a to b.
const mix = (a, b, t) => {
  const [L1, C1, H1] = oklch(a), [L2, C2, H2] = oklch(b);
  const dh = ((H2 - H1 + 540) % 360) - 180;
  return fromOklch([L1 + (L2 - L1) * t, C1 + (C2 - C1) * t, (H1 + dh * t + 360) % 360]);
};
if (rolesMode) {
  const r1 = cut;
  const roles = [];
  const role = (name, colour, on, need, rule) => roles.push({ role: name, colour, on, contrast: r1(contrast(colour, on)), need, rule, ok: contrast(colour, on) >= need });
  role("text", ink, ground, textNeed, "the ink they picked");
  // Soft text: the ink toward the ground, as far as it still reads at the text level.
  let soft = ink;
  for (let t = 0.05; t <= 0.6; t += 0.05) {
    const c = mix(ink, ground, t);
    if (contrast(c, ground) < textNeed) break;
    soft = c;
  }
  role("soft text", soft, ground, textNeed, `the ink toward the ground, while it reads at ${textNeed}:1`);
  role("hairline", mix(ink, ground, 0.8), ground, 1.2, "the ink, 20% over the ground: a line, not text");
  // The button: the accent when it stands off the ground at 3:1 (a mark), else the ink; its label the
  // ground or the ink, whichever reads on the fill.
  const fill = accent && contrast(accent, ground) >= markNeed ? accent : ink;
  role("button fill", fill, ground, markNeed, fill === ink ? "the ink: the accent is under 3:1 on the ground" : "the accent");
  const label = [ground, ink].find((c) => c !== fill && contrast(c, fill) >= textNeed) || ["#111111", "#f7f7f5"].sort((a, b) => contrast(b, fill) - contrast(a, fill))[0];
  role("button label", label, fill, textNeed, "the ground or the ink where it reads on the fill, else near-black or near-white");
  // A picture tone: the ground's hue at low chroma, for duotones and the overlay under text on photos.
  const [gL, , gH] = oklch(ground);
  roles.push({ role: "picture tone", colour: fromOklch([gL < 0.5 ? 0.25 : 0.75, 0.04, gH]), rule: "the ground's hue, low colour: tone photos toward it, and lay it under text on a photo" });
  // Status: green, amber and red at the lightness that reads on the ground at 3:1 (marks, not body text).
  for (const [name, hue] of [["ok", 145], ["warn", 75], ["error", 25]]) {
    const dark = oklch(ground)[0] < 0.5;
    let found = null;
    for (let L = dark ? 0.6 : 0.6; dark ? L <= 0.95 : L >= 0.2; L += dark ? 0.02 : -0.02) {
      const c = fromOklch([L, 0.15, hue]);
      if (contrast(c, ground) >= markNeed) { found = c; break; }
    }
    if (found) role(`status ${name}`, found, ground, markNeed, "its hue at the lightness that reads on the ground");
  }
  const failing = roles.filter((r) => r.ok === false);
  if (json) console.log(JSON.stringify({ roles }, null, 1));
  else {
    for (const r of roles) console.log([r.role, r.colour, r.on || "", r.contrast ?? "", r.need ? `${r.need}:1` : "", r.rule].join("\t"));
  }
  for (const r of failing) console.error(`colours: ${r.role} ${r.colour} is ${r.contrast}:1 on ${r.on}, under ${r.need}:1`);
  process.exit(failing.length ? 1 : 0);
}

const rows = [];
const seen = new Set();
const add = (row, label, colour, extra) => {
  if (!colour || seen.has(`${row}${colour}`)) return;
  seen.add(`${row}${colour}`);
  rows.push({ row, label, colour, ...extra });
};
// Grounds: each with an ink. The built ink is part of the chosen look (tan on brown), so it stays
// wherever it reads; only where it fails does the ground take near-black or near-white, whichever
// reads best.
const inks = ["#111111", "#f7f7f5"];
const groundOption = (label, colour) => {
  const own = contrast(ink, colour);
  const best = own >= textNeed ? [ink, own] : inks.map((i) => [i, contrast(i, colour)]).sort((a, b) => b[1] - a[1])[0];
  if (best[1] >= textNeed) add("ground", label, colour, { ink: best[0], contrast: cut(best[1]) });
};
groundOption("as built", ground);
groundOption("lighter", step(ground, "lighter"));
groundOption("darker", step(ground, "darker"));
groundOption("warmer", step(ground, "warmer"));
groundOption("cooler", step(ground, "cooler"));
const family = list(familyArg);
const theirs = list(theirsArg);
for (const c of family) if (oklch(c)[1] < 0.08) groundOption("the family's", c);
for (const c of theirs) groundOption("theirs", c);
// Ink: its own row, the built ink first, each on the built ground at the text level or out.
const inkOption = (label, colour) => {
  const k = contrast(colour, ground);
  if (k >= textNeed) add("ink", label, colour, { contrast: cut(k) });
};
inkOption("as built", ink);
for (const kind of ["lighter", "darker", "warmer", "cooler"]) inkOption(kind, step(ink, kind));
inkOption("near-black", "#111111");
inkOption("near-white", "#f7f7f5");
for (const c of theirs) inkOption("theirs", c);
// Accents: against the chosen ground, at the accent level or out.
const accentOption = (label, colour) => {
  const k = contrast(colour, ground);
  if (k >= accentNeed) add("accent", label, colour, { contrast: cut(k) });
};
if (accent) {
  accentOption("as built", accent);
  for (const kind of ["lighter", "darker", "warmer", "cooler"]) accentOption(kind, step(accent, kind));
}
for (const c of family) if (oklch(c)[1] >= 0.08) accentOption("the family's", c);
for (const c of theirs) accentOption("theirs", c);
add("accent", "none", "none", {});

const left = [...(accent && !rows.some((r) => r.row === "accent" && r.label === "as built") ? [`the built accent (under ${accentNeed}:1 on this ground)`] : [])];
if (json) console.log(JSON.stringify({ rows, left }, null, 1));
else {
  for (const r of rows) console.log([r.row, r.label, r.colour, r.ink || "", r.contrast ?? ""].join("\t"));
  for (const l of left) console.error(`colours: left out ${l}`);
}
