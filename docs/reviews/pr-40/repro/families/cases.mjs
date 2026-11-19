import { run, profile as p } from "./gen.mjs";
const many = (prefix, n, o, vary = () => ({})) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i}`, p(`${prefix}${i}`, { ...o, ...vary(i) })]));
// 1. Same numbers, only picture differs (photo vs illustration): should split.
run("1-picture-only", { ...many("photo", 4, { picture: "photo" }), ...many("illus", 4, { picture: "illustration" }) });
// 2. Same numbers, picture AND layout differ.
run("2-picture+layout", { ...many("photo", 4, { picture: "photo", layout: "full-bleed" }), ...many("illus", 4, { picture: "illustration", layout: "centred" }) });
// 3. Every tag differs, numbers identical.
run("3-all-tags", { ...many("A", 4, { picture: "photo", layout: "full-bleed", type: "serif", colour: "muted", surface: "grain", weight: "thin" }),
  ...many("B", 4, { picture: "render", layout: "centred", type: "display", colour: "bright", surface: "glossy", weight: "black" }) });
// 4. Same look, light vs dark ground (should join per the skill).
run("4-light-dark", { ...many("L", 4, { lum: 0.95, picture: "photo", layout: "full-bleed" }), ...many("D", 4, { lum: 0.02, picture: "photo", layout: "full-bleed" }) });
// 5. Same tags, very different composition grid (left-heavy vs right-heavy) and emptiness.
const left = Array.from({ length: 24 }, (_, k) => (k % 6 < 3 ? 90 : 0)), right = Array.from({ length: 24 }, (_, k) => (k % 6 >= 3 ? 90 : 0));
run("5-grid-mirror", { ...many("Lft", 4, { gridArr: left }), ...many("Rgt", 4, { gridArr: right }) });
// 6. Empty 10% vs 90%, loud 0 vs 80 (a minimal page vs a loud poster), same tags.
run("6-numbers-only", { ...many("min", 4, { empty: 90, loud: 0, busy: 1, colours: 3, colourful: 2 }), ...many("loud", 4, { empty: 10, loud: 80, busy: 18, colours: 400, colourful: 140, grey: 5 }) });
// 7. Untagged half: tags count only when >= half tagged. 5 tagged photo, 5 tagged illus, 9 untagged.
run("7-chaining", Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`c${i}`, p(`c${i}`, { empty: 20 + i * 6, loud: i * 6, busy: i, colours: 10 + 30 * i })])));
// 8. Chain: a gradual ramp from minimal to loud; average linkage will join ends?
// 9. Duplicate profile entries / a single far stray among 3 identical
run("9-small", { ...many("x", 3, {}), odd: p("odd", { picture: "render", layout: "scattered", empty: 10, loud: 70 }) });
// 10. Untagged refs mixed with tagged.
run("10-untagged", { ...many("photo", 4, { picture: "photo", layout: "full-bleed" }), ...many("u", 4, { untagged: true }), ...many("type", 4, { picture: "none", layout: "left" }) });
// 11. Second tag: photo+lettering vs lettering+photo
run("11-tag-order", { ...many("pl", 4, { picture: ["photo", "lettering"] }), ...many("lp", 4, { picture: ["lettering", "photo"] }) });
