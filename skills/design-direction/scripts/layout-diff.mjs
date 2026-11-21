#!/usr/bin/env node
// Put a screen beside the reference it was built from, measured the same way,
// so the critic's eye has numbers under it. Node 22+, an installed Chrome.
//
//   node layout-diff.mjs <reference picture> <screen capture> --out <folder> [--mirror]
//
// Both pictures are read by measure.mjs (a reference in a presentation frame
// is read inside it). Writes to --out:
//   diff.json    each measure on both sides and whether it is off: the
//                headline's size against the screen, its box, its lines, the
//                type scale, the margins the text keeps on each side, how
//                much is empty and how much is pictures, and every line of
//                text matched to its nearest line in the reference;
//   side.png     the reference (cropped to its screen) and the screen, side by side, at one size;
//   overlay.png  the screen with the reference faintly over it, at the same size,
//                so a box that moved, a gap that closed or a size that drifted shows.
// --mirror compares against the reference flipped, for a screen whose layout turned.
// Sizes are shares of the screen; "off" is more than 15% apart, or a box more
// than 3% of the screen away. Exit 0 whenever both pictures were read, whatever is
// off: it reports, the critic decides. Exit 1 when a picture could not be read,
// 2 when called wrong. A picture that could not be drawn is said on stderr and
// leaves the exit alone; diff.json is already written.
// A tall capture is read on its first screen only, and the pictures show that
// first screen and nothing below it. --out may be relative: it is taken from
// where this is run, and the pictures land beside diff.json.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args.splice(i, 2)[1];
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const out = flag("out");
const mirror = has("mirror");
if (args.length !== 2 || !out) {
  console.error("usage: node layout-diff.mjs <reference picture> <screen capture> --out <folder> [--mirror]");
  process.exit(2);
}
const [refFile, screenFile] = args.map((f) => resolve(f));
const outDir = resolve(out);
mkdirSync(outDir, { recursive: true });

function read(file) {
  const r = spawnSync(process.execPath, [join(here, "measure.mjs"), file, "--lines"], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) {
    console.error(`layout-diff: could not read ${file}: ${r.stderr.trim()}`);
    process.exit(1);
  }
  return JSON.parse(r.stdout);
}
const ref = read(refFile);
const screen = read(screenFile);

// Boxes as [x, y, w, h] shares of the screen read; the reference's flipped when it turned.
const flip = (b) => (mirror ? [1 - b[0] - b[2], b[1], b[2], b[3]] : b);
const lines = (m, f = (b) => b) => (m.type?.lines || []).map((l) => ({ size: l.size, px: l.px1440, box: f(l.box), case: l.case }));
const R = lines(ref, flip);
const S = lines(screen);
const round = (n, d = 3) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
const ratioOff = (a, b) => a != null && b != null && a > 0 && b > 0 && Math.max(a / b, b / a) > 1.15;
const rows = [];
const row = (what, r, s, off) => rows.push({ what, reference: r, screen: s, off: Boolean(off) });

const rd = ref.type?.display, sd = screen.type?.display;
row("headline size (share of the screen's height)", round(rd?.size), round(sd?.size), ratioOff(rd?.size, sd?.size));
if (rd?.box && sd?.box) {
  const rb = flip(rd.box);
  const far = Math.max(...rb.map((v, i) => Math.abs(v - sd.box[i]))) > 0.03;
  row("headline box [x, y, w, h]", rb.map((v) => round(v)), sd.box.map((v) => round(v)), far);
}
row("headline lines", ref.type?.headline?.lines ?? null, screen.type?.headline?.lines ?? null, (ref.type?.headline?.lines ?? 0) !== (screen.type?.headline?.lines ?? 0));
row("type scale (headline over body)", ref.type?.scale ?? null, screen.type?.scale ?? null, ratioOff(ref.type?.scale, screen.type?.scale));
const margins = (L) => (L.length ? { left: round(Math.min(...L.map((l) => l.box[0]))), right: round(1 - Math.max(...L.map((l) => l.box[0] + l.box[2]))), top: round(Math.min(...L.map((l) => l.box[1]))), bottom: round(1 - Math.max(...L.map((l) => l.box[1] + l.box[3]))) } : null);
const rm = margins(R), sm = margins(S);
for (const side of ["left", "right", "top", "bottom"]) if (rm && sm) row(`text margin, ${side}`, rm[side], sm[side], Math.abs(rm[side] - sm[side]) > 0.03 && ratioOff(rm[side] + 0.001, sm[side] + 0.001));
row("empty (%)", ref.traits?.empty ?? null, screen.traits?.empty ?? null, Math.abs((ref.traits?.empty ?? 0) - (screen.traits?.empty ?? 0)) > 15);
row("pictures (%)", ref.traits?.pictures ?? null, screen.traits?.pictures ?? null, Math.abs((ref.traits?.pictures ?? 0) - (screen.traits?.pictures ?? 0)) > 15);
row("small text blocks", ref.type?.small ?? null, screen.type?.small ?? null, (screen.type?.small ?? 0) > (ref.type?.small ?? 0) + 1);

// Each line of the screen matched to the nearest line of the reference of a like size.
const matched = S.map((s) => {
  let best = null, cost = Infinity;
  for (const r of R) {
    const c = Math.hypot(s.box[0] - r.box[0], s.box[1] - r.box[1]) + Math.abs(Math.log(s.size / r.size));
    if (c < cost) (cost = c), (best = r);
  }
  if (!best) return { screen: s, reference: null, off: true };
  const moved = Math.hypot(s.box[0] - best.box[0], s.box[1] - best.box[1]);
  return { screen: { px: s.px, box: s.box.map((v) => round(v)) }, reference: { px: best.px, box: best.box.map((v) => round(v)) }, moved: round(moved), off: moved > 0.03 || ratioOff(s.size, best.size) };
});

const off = rows.filter((r) => r.off).map((r) => r.what);
const report = { reference: refFile, screen: screenFile, mirror, off, measures: rows, lines: matched, unread: "pictures' boxes and the gaps between them are not measured here: the critic judges them on side.png and overlay.png" };
writeFileSync(join(outDir, "diff.json"), JSON.stringify(report, null, 1));

// The pictures: the reference cropped to the screen measure.mjs read, both at 1440 wide.
// That is the frame it found, else (a tall capture, firstScreen) the top 1440 by 900 share, else the whole.
const [fx, fy, fw, fh] = ref.frame?.box || [0, 0, ref.width, ref.firstScreen ? Math.round((ref.width * 900) / 1440) : ref.height];
const W = 1440, H = Math.round((W * fh) / fw);
const refLayer = (opacity) => `<div style="position:absolute;inset:0;overflow:hidden;opacity:${opacity}"><img src="${pathToFileURL(refFile)}" style="position:absolute;left:${(-fx * W) / fw}px;top:${(-fy * W) / fw}px;width:${(ref.width * W) / fw}px;${mirror ? "transform:scaleX(-1);transform-origin:" + ((fx + fw / 2) * W) / fw + "px 0;" : ""}"></div>`;
const shot = `<img src="${pathToFileURL(screenFile)}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover;object-position:top">`;
const page = (body, w) => `<!doctype html><html><head><title>ready</title><style>*{margin:0}body{width:${w}px;background:#777}.f{position:relative;width:${W}px;height:${H}px;overflow:hidden;display:inline-block;vertical-align:top}</style></head><body>${body}</body></html>`;
writeFileSync(join(outDir, "side.html"), page(`<div class="f">${refLayer(1)}</div><div class="f" style="margin-left:20px">${shot}</div>`, W * 2 + 20));
writeFileSync(join(outDir, "overlay.html"), page(`<div class="f">${shot}${refLayer(0.4)}</div>`, W));
for (const [name, w] of [["side", W * 2 + 20], ["overlay", W]]) {
  const c = spawnSync(process.execPath, [join(here, "capture.mjs"), pathToFileURL(join(outDir, `${name}.html`)).href, "--out", join(outDir, `${name}.png`), "--width", String(w), "--clip", `0,0,${w},${H}`], { encoding: "utf8" });
  if (c.status !== 0) console.error(`layout-diff: ${name}.png not drawn: ${c.stderr.trim()}`);
}
console.log(off.length ? `off: ${off.join("; ")}` : "nothing measured is off");
console.log(`lines off: ${matched.filter((m) => m.off).length} of ${matched.length}. ${join(outDir, "diff.json")}, side.png, overlay.png`);
