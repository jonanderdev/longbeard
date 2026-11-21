import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const family = readdirSync(join(root, "skills")).filter((name) => name.startsWith("design-"));
const text = (name) => readFileSync(join(root, "skills", name, "SKILL.md"), "utf8");
// The skills that do a step, not design-check, which checks any of them.
const steps = family.filter((name) => name !== "design-check");
// Paths in backticks on one of the top lines: **Needs:**, **Uses if there:**, **Writes:**.
const paths = (body, label) => {
  const line = body.match(new RegExp(`^\\*\\*${label}:\\*\\* (.*)$`, "m"));
  return line ? [...line[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]) : null;
};
// What idea writes, which every design skill starts from.
const outside = new Set(["docs/brief.md"]);

test("every design skill says what it needs and writes at its top", () => {
  for (const name of steps) {
    const body = text(name);
    assert.ok(paths(body, "Needs"), `${name} has no **Needs:** line`);
    assert.ok(paths(body, "Writes") || /^\*\*Writes:\*\* /m.test(body), `${name} has no **Writes:** line`);
  }
});

test("what a design skill needs, another one writes", () => {
  const written = new Set([...outside, ...steps.flatMap((name) => paths(text(name), "Writes") || [])]);
  for (const name of steps) {
    const body = text(name);
    for (const path of [...(paths(body, "Needs") || []), ...(paths(body, "Uses if there") || [])]) {
      assert.ok(written.has(path), `${name} needs ${path}, which no design skill writes`);
    }
  }
});

test("design lists every skill in the family, and every doc it names is one a skill writes", () => {
  const hub = text("design");
  const listed = [...hub.matchAll(/^\| `(design-[a-z-]+)` \|/gm)].map((m) => m[1]).sort();
  assert.deepEqual(listed, [...family].sort());
  const written = new Set([...outside, ...steps.flatMap((name) => paths(text(name), "Writes") || [])]);
  for (const [, path] of hub.matchAll(/`(docs\/design\/design-[a-z-]+\.(?:md|html))`/g)) assert.ok(written.has(path), `design names ${path}, which no skill writes`);
});

test("the catalog installs every skill in the family, each reached through design", () => {
  const { items } = JSON.parse(readFileSync(join(root, "beard.json"), "utf8"));
  for (const name of steps) {
    const item = items.find((x) => x.name === name);
    assert.ok(item, `${name} is not in beard.json`);
    assert.equal(item.source, "local");
    assert.equal(item.via, "design", `${name} should be reached through design`);
  }
});

// A graphic (a poster, a card, a social post) goes through the same skills. What differs lives in
// references/graphic.md, and the skill's main text grows by one line: the pointer in its Gate.
const withGraphic = readdirSync(join(root, "skills")).filter((name) => existsSync(join(root, "skills", name, "references/graphic.md")));

test("the skills a graphic changes are the ones the ticket names", () => {
  assert.deepEqual([...withGraphic].sort(), ["design-brief", "design-direction", "design-figma", "design-identity", "design-moodboard", "design-prototype", "idea"]);
});

test("a skill with a graphic reference names it once, in its gate, and no skill names one that is missing", () => {
  for (const name of readdirSync(join(root, "skills"))) {
    const body = text(name);
    const mentions = body.match(/references\/graphic\.md/g) || [];
    if (!withGraphic.includes(name)) {
      assert.equal(mentions.length, 0, `${name} points to a graphic reference that does not exist`);
      continue;
    }
    assert.equal(mentions.length, 1, `${name} names references/graphic.md ${mentions.length} times, not once`);
    const gate = body.match(/^## Gate\n([\s\S]*?)(?=^## )/m);
    assert.ok(gate, `${name} has no Gate`);
    assert.match(gate[1], /references\/graphic\.md/, `${name} does not name its graphic reference in its Gate`);
  }
});

test("a graphic reference says a piece counts as a screen, and names no source", () => {
  for (const name of withGraphic) {
    const body = readFileSync(join(root, "skills", name, "references/graphic.md"), "utf8");
    assert.match(body, /^# /m);
    assert.match(body, /counts as a screen/, `${name}'s graphic reference does not say a piece counts as a screen`);
    for (const word of ["Dribbble", "Awwwards", "Behance", "Pinterest"]) assert.doesNotMatch(body, new RegExp(word), `${name}'s graphic reference names ${word}`);
  }
});

test("the rules have a Graphics list after Apps, and design-check reads it", () => {
  const rules = readFileSync(join(root, "rules/design-rules.md"), "utf8");
  const headings = [...rules.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.ok(headings.indexOf("Graphics") > headings.indexOf("Apps"), "Graphics comes after Apps");
  assert.match(text("design-check"), /site, app or graphics list/);
});
