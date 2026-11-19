export const library = (extra = {}) => ({
  anchor: "a", family: { tone: "light" },
  arrangements: "abcdefgh".split("").map((ref) => ({ id: `arr-${ref}`, what: "x", from: [ref] })),
  navigation: [{ id: "nav-1", from: ["a", "b"] }, { id: "nav-2", from: ["c", "d"] }, { id: "nav-3", from: ["e"] }],
  type: [{ id: "type-1", from: ["a", "b"] }, { id: "type-2", from: ["c", "d"] }, { id: "type-3", from: ["e", "f"] }, { id: "type-4", from: ["g", "h"] }],
  grounds: [{ id: "light", ground: "#ffffff", ink: "#111111", from: ["a", "c"] }, { id: "cream", ground: "#f4ecdc", ink: "#111111", from: ["b", "e"] },
    { id: "dark", ground: "#101010", ink: "#f0f0f0", from: ["d", "g"] }, { id: "framed", ground: "#203040", panel: "#fbfbfb", ink: "#111111", from: ["f", "h"] }],
  accents: [{ id: "red", colour: "#d20401", from: ["a", "d"] }, { id: "pale", colour: "#fdfbe8", from: ["b", "f"] }, { id: "none", colour: null, from: ["c", "e", "g", "h"] }],
  ...extra });
