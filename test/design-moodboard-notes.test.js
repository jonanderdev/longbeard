import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const skills = join(dirname(fileURLToPath(import.meta.url)), "../skills");
const script = (name) => join(skills, "design-moodboard", "scripts", name);

function project(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-moodboard-notes-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function run(file, dir, args) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Just enough page to run a page script without a browser: the tiles it finds
// by their data-* attributes, and the few children and listeners it uses.
function page(html, stored) {
  const store = new Map(stored ? [["k", JSON.stringify(stored)]] : []);
  const el = (dataset = {}) => {
    const own = { dataset, value: "", hidden: false, textContent: "", attrs: {}, kids: new Map(), on: {} };
    own.addEventListener = (type, fn) => (own.on[type] = fn);
    own.setAttribute = (k, v) => (own.attrs[k] = v);
    own.getAttribute = (k) => own.attrs[k] ?? null;
    own.querySelector = (sel) => {
      if (!own.kids.has(sel)) own.kids.set(sel, el());
      return own.kids.get(sel);
    };
    own.querySelectorAll = (sel) => (sel === ".marks button" ? ["lead", "like", "no"].map((m) => el({ mark: m })) : []);
    return own;
  };
  const tiles = [...html.matchAll(/<figure class="tile" ([^>]*)>/g)].map((m) =>
    el(Object.fromEntries([...m[1].matchAll(/data-([a-z]+)="([^"]*)"/g)].map(([, k, v]) => [k, unescape(v)]))),
  );
  const byId = new Map(["note", "out", "count", "copy"].map((id) => [id, el()]));
  const document = {
    querySelectorAll: (sel) => (sel === ".tile" ? tiles : []),
    getElementById: (id) => byId.get(id),
  };
  const localStorage = {
    getItem: () => store.get("k") ?? null,
    setItem: (_, v) => store.set("k", v),
  };
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/const key = [^;]+;/, 'const key = "k";');
  new Function("document", "localStorage", "location", "navigator", "matchMedia", "setTimeout", js)(
    document,
    localStorage,
    { pathname: "/p.html" },
    {},
    () => ({ matches: true }),
    () => 0,
  );
  const out = byId.get("out");
  return {
    tiles,
    out: () => out.value,
    saved: () => JSON.parse(store.get("k")),
    click: (i, n = 1) => {
      for (let k = 0; k < n; k++) tiles[i].querySelector(".frame").on.click();
    },
    say: (i, text) => {
      const why = tiles[i].querySelector(".why");
      why.value = text;
      why.on.input();
    },
    note: (text) => {
      byId.get("note").value = text;
      byId.get("note").on.input();
    },
  };
}

const rows = [
  "Quiet serif\thttps://cdn.example.com/a.jpg\thttps://example.com/a\tdribbble",
  'Loud <b>type</b> "x"\thttps://cdn.example.com/b.jpg\thttps://example.com/b\tdribbble',
  "Third\thttps://cdn.example.com/c.jpg\t\tdribbble",
];
function picker(dir = project()) {
  writeFileSync(join(dir, "candidates.tsv"), rows.join("\n"));
  run(script("picker.mjs"), dir, ["candidates.tsv", "--out", "out/picker.html"]);
  return readFileSync(join(dir, "out/picker.html"), "utf8");
}

test("picker: every tile has an optional note, shown only on a like, and its label is escaped", () => {
  const html = picker();
  assert.equal(html.match(/<input class="why"/g)?.length, 3);
  assert.match(html, /placeholder="What you like in it, and why \(optional\)"/);
  assert.match(html, /\.tile\[data-state="like"\] \.why \{ display: block; \}/);
  assert.match(html, /\.why \{ display: none;/);
  assert.match(html, /aria-label="a2 Loud &lt;b&gt;type&lt;\/b&gt; &quot;x&quot;: what you like in it, and why"/);
  assert.doesNotMatch(html, /<b>type<\/b>/);
});

test("picker: a note on a like is copied out beside that pick, and a like with none is only listed", () => {
  const p = page(picker());
  p.click(0);
  p.say(0, "the thin serif:   it makes the page feel slow\nand expensive");
  p.click(1);
  p.click(2, 2);
  p.say(2, "a note on a no is not copied");
  assert.equal(
    p.out(),
    [
      "Picks, round 1 (a)",
      'like: a1 Quiet serif; a2 Loud <b>type</b> "x"',
      "like, in their words:",
      "- a1 Quiet serif: the thin serif: it makes the page feel slow and expensive",
      "no: a3 Third",
    ].join("\n"),
  );
  // The pick outranks the note: clearing the like drops its words from the copy-out.
  p.click(0, 2);
  assert.doesNotMatch(p.out(), /in their words/);
  assert.match(p.out(), /^like: a2 /m);
});

test("picker: with no notes the copy-out is as it was", () => {
  const p = page(picker());
  p.click(0);
  p.click(1, 2);
  p.note("one general why");
  assert.equal(
    p.out(),
    ["Picks, round 1 (a)", "like: a1 Quiet serif", 'no: a2 Loud <b>type</b> "x"', "note: one general why"].join("\n"),
  );
});

test("picker: a note is kept with the mark under the same key, and comes back on reload", () => {
  const html = picker();
  assert.match(html, /const key = "longbeard-picker:" \+ location\.pathname \+ ":a";/);
  const first = page(html);
  first.click(0);
  first.say(0, "the orange dot");
  const saved = first.saved();
  assert.deepEqual(Object.keys(saved).sort(), ["note", "states", "whys"]);
  assert.deepEqual(saved.states, { "a1|Quiet serif": "like" });
  assert.deepEqual(saved.whys, { "a1|Quiet serif": "the orange dot" });
  const again = page(html, saved);
  assert.equal(again.tiles[0].querySelector(".why").value, "the orange dot");
  assert.match(again.out(), /- a1 Quiet serif: the orange dot/);
});

test("picker: a note is text, never markup, and a page saved before notes still loads", () => {
  const html = picker();
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|document\.write/);
  const p = page(html, { states: { "a1|Quiet serif": "like" }, note: "" });
  assert.match(p.out(), /^like: a1 Quiet serif$/m);
  p.click(1);
  p.say(1, '<img src=x onerror="alert(1)">');
  assert.match(p.out(), /- a2 Loud <b>type<\/b> "x": <img src=x onerror="alert\(1\)">/);
  assert.doesNotMatch(html, /onerror="alert/);
});

function board(cards) {
  const dir = project({ "refs/a.jpg": "jpg", "refs/b.jpg": "jpg" });
  writeFileSync(join(dir, "board.md"), cards);
  run(script("moodboard.mjs"), dir, ["board.md", "--out", "board.html"]);
  return readFileSync(join(dir, "board.html"), "utf8");
}
const likeCards = `### Orange dot
- link: https://example.com/a
- shot: refs/a.jpg
- move: one accent dot on a quiet page
- why: quiet, as asked
- like: the orange dot: the only contrast on a quiet page

### Plain
- link: https://example.com/b
- shot: refs/b.jpg
- move: type fills the width
`;

test("moodboard: a card's like line shows on the card and rides on the tile, escaped", () => {
  const html = board(likeCards.replace("the orange dot:", 'the <i>orange</i> "dot":'));
  assert.equal(html.match(/<p class="liked">/g)?.length, 1);
  assert.match(html, /<p class="liked">You liked: the &lt;i&gt;orange&lt;\/i&gt; &quot;dot&quot;: the only contrast on a quiet page<\/p>/);
  assert.match(html, /data-like="the &lt;i&gt;orange&lt;\/i&gt; &quot;dot&quot;: the only contrast/);
  assert.doesNotMatch(html, /<i>orange/);
  // move stays the agent's reading, shown as before.
  assert.match(html, /<p class="line">one accent dot on a quiet page<\/p>/);
  assert.equal(html.match(/data-like=/g)?.length, 1);
});

test("moodboard: the note starts as their like, a note they wrote wins, and one they cleared stays clear", () => {
  const html = board(likeCards);
  const first = page(html);
  assert.equal(first.tiles[0].querySelector(".why").value, "the orange dot: the only contrast on a quiet page");
  assert.equal(first.tiles[1].querySelector(".why").value, "");
  assert.match(first.out(), /notes:\n- m1 Orange dot: the orange dot: the only contrast on a quiet page/);
  assert.doesNotMatch(first.out(), /Plain:/);

  const written = page(html, { marks: {}, notes: { "Orange dot": "the dot: it marks the one action" }, note: "" });
  assert.equal(written.tiles[0].querySelector(".why").value, "the dot: it marks the one action");

  const cleared = page(html, { marks: {}, notes: { "Orange dot": "" }, note: "" });
  assert.equal(cleared.tiles[0].querySelector(".why").value, "");
  cleared.tiles[0].querySelector(".why").on.input();
  assert.deepEqual(cleared.saved().notes, { "Orange dot": "" });
});

test("moodboard: a card with no like line is as before", () => {
  const html = board(likeCards.replace(/- like:.*\n/, ""));
  assert.doesNotMatch(html, /data-like=|<p class="liked">/);
});

test("moodboard: a card with a like starts liked, and one they unmarked stays unmarked", () => {
  const html = board(likeCards);
  const first = page(html);
  assert.equal(first.tiles[0].dataset.state, "like");
  assert.equal(first.tiles[1].dataset.state, undefined);
  assert.match(first.out(), /like: m1 Orange dot/);
  const unmarked = page(html, { marks: { "Orange dot": "" }, notes: {}, note: "" });
  assert.equal(unmarked.tiles[0].dataset.state, undefined);
});

test("moodboard: a leave-out per tile, filled from the card's avoid line, copied out beside its pick", () => {
  const html = board(likeCards.replace(/(- like:.*\n)/, '$1- avoid: the <b>drop</b> shadow\n'));
  assert.equal(html.match(/<input class="avoid"/g)?.length, 2);
  assert.match(html, /<p class="avoided">Leave out: the &lt;b&gt;drop&lt;\/b&gt; shadow<\/p>/);
  const p = page(html);
  assert.equal(p.tiles[0].querySelector(".avoid").value, "the <b>drop</b> shadow");
  const box = p.tiles[1].querySelector(".avoid");
  box.value = "the   tracked\ncaps";
  box.on.input();
  assert.match(p.out(), /leave out:\n- m1 Orange dot: the <b>drop<\/b> shadow\n- m2 Plain: the tracked caps/);
  assert.deepEqual(p.saved().avoids, { "Orange dot": "the <b>drop</b> shadow", Plain: "the   tracked\ncaps" });
});

test("moodboard --one-lead: one lead on the whole board, across groups", () => {
  const dir = project({ "b.md": likeCards.replace("- link: https://example.com/a", "- topic: f1\n- link: https://example.com/a").replace("- link: https://example.com/b", "- topic: f2\n- link: https://example.com/b"), "refs/a.jpg": "jpg", "refs/b.jpg": "jpg" });
  run(script("moodboard.mjs"), dir, ["b.md", "--out", "one.html", "--one-lead"]);
  run(script("moodboard.mjs"), dir, ["b.md", "--out", "each.html"]);
  assert.match(readFileSync(join(dir, "one.html"), "utf8"), /const oneLead = true;/);
  assert.match(readFileSync(join(dir, "one.html"), "utf8"), /one on the whole board/);
  assert.match(readFileSync(join(dir, "each.html"), "utf8"), /const oneLead = false;/);
});
