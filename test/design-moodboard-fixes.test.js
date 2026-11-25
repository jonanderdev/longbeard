import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const skills = join(dirname(fileURLToPath(import.meta.url)), "../skills");
const script = (skill, name) => join(skills, skill, "scripts", name);

// A project outside any git tree, so the scripts resolve paths against it.
function project(files) {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-moodboard-fixes-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function run(file, dir, args) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

const picker = (dir, rows) => {
  writeFileSync(join(dir, "candidates.tsv"), rows.join("\n"));
  const result = run(script("design-moodboard", "picker.mjs"), dir, ["candidates.tsv", "--out", "out/picker.html"]);
  return { html: readFileSync(join(dir, "out/picker.html"), "utf8"), stderr: result.stderr };
};

test("picker: a title that starts with # is a row, a line with no tab is a comment", () => {
  const dir = project({});
  const { html, stderr } = picker(dir, [
    "# a comment, with no tab",
    "#1 Dashboard\thttps://cdn.example.com/a.jpg\thttps://example.com/a\tdribbble",
    "Plain\thttps://cdn.example.com/b.jpg\thttps://example.com/b\tdribbble",
  ]);
  assert.equal(html.match(/<figure class="tile"/g)?.length, 2);
  assert.match(html, /data-id="a1" data-title="#1 Dashboard"/);
  assert.match(html, /data-id="a2" data-title="Plain"/);
  assert.match(stderr, /1 comment line ignored/);
});

test("picker: says how many rows it skipped and why", () => {
  const dir = project({});
  const { html, stderr } = picker(dir, [
    "One\thttps://cdn.example.com/a.jpg\t\tdribbble",
    "Same picture\thttps://cdn.example.com/a.jpg\t\tdribbble",
    "Nothing\t\t\tdribbble",
    "Missing file\trefs/gone.jpg\t\tdribbble",
  ]);
  assert.equal(html.match(/<figure class="tile"/g)?.length, 1);
  assert.match(stderr, /3 rows skipped: 1 repeats an earlier image, 2 no image/);
});

test("picker, moodboard and sheet: a local path with # ? % or a space is encoded in src", () => {
  const name = "refs/a #1 b?c 100%.jpg";
  const encoded = "refs/a%20%231%20b%3Fc%20100%25.jpg";
  const dir = project({ [name]: "jpg" });

  const { html } = picker(dir, [`Seed\t${name}\t\tseed`]);
  assert.ok(html.includes(`<img src="../${encoded}"`), html.match(/<img src="[^"]*"/)?.[0]);

  writeFileSync(join(dir, "board.md"), `### Card\n- link: https://example.com\n- shot: ${name}\n`);
  run(script("design-moodboard", "moodboard.mjs"), dir, ["board.md", "--out", "board.html"]);
  const board = readFileSync(join(dir, "board.html"), "utf8");
  assert.ok(board.includes(`<img src="./${encoded}"`));
  assert.ok(board.includes(`<a class="big" href="./${encoded}"`));

  run(script("design-direction", "sheet.mjs"), dir, ["sheet.html", name]);
  assert.ok(readFileSync(join(dir, "sheet.html"), "utf8").includes(`<img src="${encoded}"`));
});

test("moodboard: a mark is keyed by the card's name, so adding a card moves no mark", () => {
  const card = (name) => `### ${name}\n- link: https://example.com/${name}\n- shot: refs/${name}.jpg\n`;
  const keys = (names) => {
    const dir = project(Object.fromEntries(names.map((n) => [`refs/${n}.jpg`, "jpg"])));
    writeFileSync(join(dir, "board.md"), names.map(card).join("\n"));
    run(script("design-moodboard", "moodboard.mjs"), dir, ["board.md", "--out", "board.html"]);
    const html = readFileSync(join(dir, "board.html"), "utf8");
    return Object.fromEntries([...html.matchAll(/data-id="(m\d+)"[^>]*? data-key="([^"]*)"/g)].map((m) => [m[2], m[1]]));
  };
  const before = keys(["Beta", "Gamma"]);
  const after = keys(["Alpha", "Beta", "Gamma"]);
  // The running number moves; the key a mark is saved under does not.
  assert.deepEqual(Object.keys(before), ["Beta", "Gamma"]);
  assert.deepEqual(Object.keys(after), ["Alpha", "Beta", "Gamma"]);
  assert.notEqual(before.Beta, after.Beta);
});

test("moodboard: two cards with one name get two keys, and its page script reads an older saved mark", () => {
  const dir = project({ "refs/a.jpg": "jpg", "refs/b.jpg": "jpg" });
  writeFileSync(
    join(dir, "board.md"),
    "### Same\n- shot: refs/a.jpg\n\n### Same\n- shot: refs/b.jpg\n",
  );
  run(script("design-moodboard", "moodboard.mjs"), dir, ["board.md", "--out", "board.html"]);
  const html = readFileSync(join(dir, "board.html"), "utf8");
  assert.match(html, /data-key="Same"/);
  assert.match(html, /data-key="Same #2"/);
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(js.includes('t.dataset.id + "|" + t.dataset.title'), "an older key is still read");
  writeFileSync(join(dir, "page.js"), js);
  const check = spawnSync(process.execPath, ["--check", join(dir, "page.js")], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
});

test("contact-sheet: its usage names every option", () => {
  const dir = project({});
  const result = spawnSync(process.execPath, [script("design-moodboard", "contact-sheet.mjs")], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--per 36\] \[--cols 6\] \[--contain\]/);
});

const cards = await import(pathToFileURL(script("design-moodboard", "dribbble-cards.mjs")).href);

test("dribbble-cards: importing it opens no browser, and the pure parts are exported", () => {
  for (const name of ["count", "offTopic", "cardRow", "pickerRow", "scrollsOf", "dropList", "cutOffTopic", "rankByLikes", "refused"]) {
    assert.equal(typeof cards[name], "function", name);
  }
});

test("dribbble-cards: a title cannot split a row", () => {
  const card = { idSlug: "1-x", likes: "1.2k", views: "9k", designer: "ana", imageURL: "https://cdn.example.com/a.png", title: "Line one\r\nline\ttwo three" };
  assert.equal(cards.cardRow(card).split("\n").length, 1);
  assert.equal(cards.cardRow(card).split("\t").length, 6);
  assert.equal(cards.pickerRow(card).split("\t").length, 5);
  assert.match(cards.pickerRow(card), /^Line one line two three\t/);
});

test("dribbble-cards: --scrolls 0 is zero, and only a missing or bad value is three", () => {
  assert.equal(cards.scrollsOf("0"), 0);
  assert.equal(cards.scrollsOf("4"), 4);
  assert.equal(cards.scrollsOf(undefined), 3);
  assert.equal(cards.scrollsOf("many"), 3);
  assert.equal(cards.scrollsOf("-2"), 3);
});

test("dribbble-cards: counts read, and an unreadable one is NaN, never 0", () => {
  assert.equal(cards.count("15.7k"), 15700);
  assert.equal(cards.count("1,204"), 1204);
  assert.ok(Number.isNaN(cards.count("lots")));
});

test("dribbble-cards: the default drop list holds only what is never a screen", () => {
  const dropWords = cards.dropList();
  for (const word of ["dashboard", "saas", "crm", "poster", "illustration", "logo", "branding", "packaging", "chatbot", "agent", "assistant", "copilot", "generator", "3d render", "character design", "icon set", "video editor", "habit tracker"]) {
    assert.ok(!dropWords.includes(word), `${word} is a look or a kind of product, not in the default`);
    assert.equal(cards.offTopic(`1-${word.replace(/ /g, "-")} for something`, dropWords), "", word);
  }
  for (const text of ["1-merch-drop", "2-my-resume-template", "3-christmas-card", "4-sticker-pack", "5-phone-mockup", "6-tracing-worksheet"]) {
    assert.ok(cards.offTopic(text, dropWords), text);
  }
  assert.equal(cards.offTopic("1-detail-page", dropWords), "", "whole words only");
});

test("dribbble-cards: --drop adds what the brief rules out, --keep brings a default back", () => {
  assert.ok(cards.offTopic("1-crm-dashboard", cards.dropList({ drop: "CRM, poster" })));
  assert.equal(cards.offTopic("1-phone-mockup", cards.dropList({ keep: "mockup" })), "");
});

test("dribbble-cards: what it cuts is counted by word, and the likes floor keeps unreadable counts last", () => {
  const card = (idSlug, likes, title = idSlug) => ({ idSlug, likes, views: "", designer: "", imageURL: "x", title });
  const { kept, cut } = cards.cutOffTopic([card("1-a", "500"), card("2-b", "900", "Merch tee"), card("3-c", "")], cards.dropList());
  assert.deepEqual(cut.map((c) => c.word), ["merch"]);
  const { strong, weak } = cards.rankByLikes([...kept, card("4-d", "20"), card("5-e", "2k")], 100);
  assert.deepEqual(strong.map((c) => c.idSlug), ["5-e", "1-a", "3-c"]);
  assert.equal(weak, 1);
});

test("dribbble-cards: a verification page or a limit is told from an empty listing", () => {
  assert.ok(cards.refused("Just a moment... Verify you are human"));
  assert.ok(cards.refused("Too many requests"));
  assert.ok(!cards.refused("Dribbble - Discover the world's top designers"));
});
