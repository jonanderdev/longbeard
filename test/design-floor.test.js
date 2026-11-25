import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

// The craft floor lives in rules/design-rules.md. The skills that build read it before they
// build and link it; they never restate it.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const text = (name) => readFileSync(join(root, "skills", name, "SKILL.md"), "utf8");
const floor = "references/design-floor.md#before-you-build";
const split = "references/design-floor.md#how-to-use-this";
const builders = ["design-direction", "design-prototype"];

test("the rules file has the anchors the skills link", () => {
  const rules = readFileSync(join(root, "rules/design-rules.md"), "utf8");
  assert.match(rules, /^## Before you build$/m);
  assert.match(rules, /^## How to use this$/m);
  assert.match(rules, /^- \*\*When the floor meets a liked concept:\*\*$/m);
});

test("direction links the floor before its first screens are built", () => {
  const body = text("design-direction");
  const at = body.indexOf(floor);
  assert.ok(at > -1, "design-direction does not link Before you build");
  assert.ok(at < body.indexOf("**Every screen is a concept: one liked reference, developed as a designer would, never copied.**"), "the floor is linked after building starts");
});

test("prototype reads the floor before it builds anything", () => {
  const body = text("design-prototype");
  const at = body.indexOf(floor);
  assert.ok(at > -1, "design-prototype does not link Before you build");
  assert.ok(at < body.indexOf("### 1. Finish the first screen"), "the floor is linked after building starts");
});

test("no blanket 'the concept wins': text a person acts on passes, and the split is linked", () => {
  for (const name of builders) {
    const body = text(name);
    assert.doesNotMatch(body, /A check reports; the concept wins/, `${name} still lets the concept win over every finding`);
    assert.ok(body.includes(split), `${name} does not link the floor-and-concept split`);
    assert.match(body, /text a person acts on/i, `${name} does not say text a person acts on must pass`);
  }
});

test("direction acts on the text size finding", () => {
  assert.match(text("design-direction"), /`rules\.mjs`'s[^.\n]*text size/);
});

test("prototype builds each part in order: the chosen screen, liked references, ask, a marked stand-in", () => {
  const body = text("design-prototype");
  const steps = ["chosen screen's frame and concept", "**Leave out**", "One piece", "data-standin"];
  const at = steps.map((s) => body.indexOf(s));
  at.forEach((i, n) => assert.ok(i > -1, `the part order does not name ${steps[n]}`));
  assert.deepEqual([...at].sort((a, b) => a - b), at, "the part order is out of order");
  const block = body.slice(body.lastIndexOf("\n", at[0]), at[3]);
  assert.match(block, /^\s*1\. [\s\S]*\n\s*2\. [\s\S]*\n\s*3\. [\s\S]*\n\s*4\. /, "the parts are not a numbered order");
});

test("the skills that build read the floor: every hard check, no soft one, no tells", () => {
  const floorText = readFileSync(join(root, "skills/design-direction/references/design-floor.md"), "utf8");
  const rules = readFileSync(join(root, "rules/design-rules.md"), "utf8");
  for (const line of rules.split("\n").filter((l) => l.startsWith("- [hard]"))) assert.ok(floorText.includes(line), `the floor lost: ${line}`);
  assert.doesNotMatch(floorText, /^- \[soft\]/m);
  assert.doesNotMatch(floorText, /^## 14\. Tells/m);
  for (const name of ["design-direction", "design-identity", "design-prototype"]) {
    assert.doesNotMatch(text(name), /references\/design-rules\.md/, `${name} still reads the full rules while building`);
  }
});

test("every screen is a concept that keeps an idea and is never a copy", () => {
  const body = text("design-direction");
  assert.match(body, /Every screen is a concept/);
  assert.match(body, /The lead develops two/);
  assert.match(body, /would a designer call it the same concept \(it must be yes\), and would they call it a copy \(it must be no\)\?/);
  assert.match(body, /"kind": "concept"/);
});

test("principles are written at the pick and carried to the prototype, DESIGN.md and design-check", () => {
  assert.match(text("design-direction"), /## Principles/);
  assert.match(text("design-prototype"), /principles hold on every page/);
  assert.match(readFileSync(join(root, "skills/design-prototype/references/design-md-template.md"), "utf8"), /## Principles/);
  assert.match(text("design-check"), /every principle in `DESIGN.md`/);
});
