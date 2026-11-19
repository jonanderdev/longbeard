import { run, profile as p } from "./gen.mjs";
const many = (prefix, n, o) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i}`, p(`${prefix}${i}`, o)]));
const full = new Array(24).fill(100), none = new Array(24).fill(0);
// Opposite on every measured trait, identical tags.
run("12-max-numbers", { ...many("blank", 4, { lum: 1, empty: 100, loud: 0, busy: 0, colours: 1, colourful: 0, grey: 100, soft: 0, sharp: 0, gridArr: none }),
  ...many("wall", 4, { lum: 0, empty: 0, loud: 100, busy: 20, colours: 511, colourful: 150, grey: 0, soft: 100, sharp: 0, gridArr: full }) });
// Identical numbers, only picture+layout+type differ (three agent words).
run("13-three-words", { ...many("A", 4, { picture: "photo", layout: "full-bleed", type: "serif" }), ...many("B", 4, { picture: "illustration", layout: "centred", type: "sans" }) });
run("13b-type+colour+surface", { ...many("A", 4, { type: "serif", colour: "muted", surface: "grain" }), ...many("B", 4, { type: "sans", colour: "bright", surface: "glossy" }) });
// default spread on case 6 lowered
