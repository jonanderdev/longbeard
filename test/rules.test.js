import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const script = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-check/scripts/rules.mjs");
// Every run has its own working folder, so the rounds and waivers it writes stay out of the repo.
const sandbox = () => mkdtempSync(join(tmpdir(), "longbeard-rules-"));
const run = (args, cwd) =>
  new Promise((done) => {
    const child = spawn(process.execPath, [script, ...args], { cwd });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stdout, stderr }));
  });
const page = (html, cwd, name = "p.html") => {
  const file = join(cwd, name);
  // Controls take the page's type, as on any real page; a test that wants the browser's default says so.
  writeFileSync(file, `<!doctype html><meta charset=utf-8><title>t</title><style>button,input,select,textarea{font:inherit}</style><body style="margin:0;font:16px sans-serif">${html}`);
  return `file://${file}`;
};
// One run at phone width on a fresh folder.
const check = async (html, extra = []) => {
  const cwd = sandbox();
  return { cwd, ...(await run([page(html, cwd), "--widths", "390", ...extra], cwd)) };
};
const focusRing = "<style>:focus-visible{outline:3px solid #04f}</style>";

test("rules: a page with overlap, giant cropped type and wide empty space passes", async (t) => {
  const r = await check(
    `${focusRing}<style>.hero{position:relative;height:420px;background:#eee}.big{position:absolute;left:-40px;top:40px;font:900 200px/1 sans-serif;white-space:nowrap;overflow:hidden;width:300px}
    .a,.b{position:absolute;width:200px;height:200px}.a{left:60px;top:200px;background:#ccc}.b{left:140px;top:260px;background:#999}.gap{height:1800px}</style>
    <div class=hero><div class=big data-crop>Giant word</div><div class=a>One</div><div class=b>Two</div></div>
    <p>Read <a href="#x">the long guide</a> before you order.</p>
    <form><label for=n>Name</label><input id=n placeholder="Your name"><button type=button style="width:48px;height:48px">Go</button></form>
    <label><input type=checkbox> Remember me</label><div class=gap></div>`,
  );
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^passes: /m);
});

const failing = [
  ["13 Responsive", "a block wider than the phone", `${focusRing}<div style="width:700px;height:40px;background:#ccc">wide block</div>`],
  ["10 Accessibility", "targets smaller than 24px with no space around", `${focusRing}<p><button style="width:12px;height:12px;padding:0"></button><button style="width:12px;height:12px;padding:0"></button></p>`],
  ["10 Accessibility", "an input with only a placeholder", `${focusRing}<input placeholder="Email">`],
  ["10 Accessibility", "a control that shows no change on focus", `<style>button{outline:none;width:48px;height:48px}</style><button>Go</button>`],
  ["11 Copy", "lorem ipsum", `${focusRing}<h1>Lorem ipsum dolor sit amet</h1>`],
  ["11 Copy", "a heading that is only Title", `${focusRing}<h1>Title</h1>`],
  ["5 Typography", "text cut by its box", `${focusRing}<div style="width:100px;overflow:hidden;white-space:nowrap">This sentence is far too long for its box</div>`],
  ["5 Typography", "a caption under 12px", `${focusRing}<p style="font-size:11px">Shot in May</p>`],
  ["5 Typography", "a button under 14px, at the browser's default", `${focusRing}<button style="font:13px sans-serif;width:120px;height:48px">Book a session</button>`],
  ["5 Typography", "body text under 16px", `${focusRing}<p style="font-size:15px">Every session starts with a walk, so your dog knows me before the camera comes out of the bag.</p>`],
  ["5 Typography", "an ellipsis, which is also a cut", `${focusRing}<div style="width:100px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">This sentence is far too long for its box</div>`],
];
for (const [rule, what, html] of failing) {
  test(`rules: fails ${what} under rule ${rule}`, async (t) => {
    const r = await check(html);
    if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^\| Rule \| Hard\/soft \| Where \| Fix \|$/m);
    assert.ok(r.stdout.split("\n").some((l) => l.startsWith(`| ${rule} | hard |`)), r.stdout);
  });
}

test("rules: giant type cut at the edge is skipped only when marked data-crop", async (t) => {
  const word = (attr) => `${focusRing}<h1 ${attr} style="margin:0;font:900 200px/1 sans-serif;white-space:nowrap;overflow:hidden;width:300px">Giant</h1>`;
  const marked = await check(word("data-crop"));
  if (/No Chrome/.test(marked.stderr)) return t.skip("no Chrome installed");
  assert.equal(marked.status, 0, marked.stdout + marked.stderr);
  const bare = await check(word(""));
  assert.equal(bare.status, 1, bare.stdout);
  assert.match(bare.stdout, /5 Typography/);
});

test("rules: text at the floor passes: 12px meta, 14px on what you act on, 16px body", async (t) => {
  const r = await check(
    `${focusRing}<p style="font-size:12px">Shot in May</p><a href="#b" style="display:inline-block;font-size:14px;padding:12px 0">Book a session</a>
    <p>Every session starts with a walk, so your dog knows me before the camera comes out of the bag.</p>`,
  );
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /floor \d+px/);
});

test("rules: small text marked as the board's size is a warning with its measure, not a block", async (t) => {
  const r = await check(`${focusRing}<nav data-board-size><a href="#w" style="display:inline-block;font-size:11px;padding:12px 0">Work</a></nav>`);
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\| 5 Typography \| warn \|.*11px/m);
  assert.match(r.stdout, /data-board-size/);
});

test("rules: an accent that floods the first screen is a soft finding, and does not block", async (t) => {
  const r = await check(`${focusRing}<div style="height:300px;background:#e5302a"></div><p>Portraits of dogs, at home and outdoors.</p>`);
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\| 6 Colour \| soft \|.*the accent \(#e5302a, read as the most saturated colour\) covers 3\d%/m);
  // A ground that does not dominate is reported too; the accent can be named from DESIGN.md.
  const split = await check(`${focusRing}<div style="height:300px;background:#1f3a5f"></div><div style="height:300px;background:#e8e2d6"></div>`, ["--accent", "#1f3a5f"]);
  assert.match(split.stdout, /the ground \(#[0-9a-f]{6}\) covers \d+%/);
  assert.match(split.stdout, /the accent \(#1f3a5f\) covers 3\d%/);
  // A quiet ground with a small accent has no proportion finding, and the measure is printed.
  const calm = await check(`${focusRing}<div style="height:40px;background:#e5302a"></div><p>Portraits of dogs, at home and outdoors.</p>`);
  assert.equal(calm.status, 0, calm.stdout + calm.stderr);
  assert.doesNotMatch(calm.stdout, /6 Colour/);
  assert.match(calm.stdout, /^colour proportion at 390: ground #ffffff 9\d%/m);
});

test("rules: a link inside a sentence and a target with space around it are not too small", async (t) => {
  const r = await check(`${focusRing}<p>Read <a href="#x" style="font-size:14px">the terms</a> first.</p><p style="margin-top:80px"><button style="width:14px;height:14px;padding:0"></button></p>`);
  if (/No Chrome/.test(r.stderr)) return t.skip("no Chrome installed");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // The app list raises the floor on touch: the same lone button now fails.
  const app = await check(`${focusRing}<button style="width:30px;height:30px;padding:0"></button>`, ["--app"]);
  assert.equal(app.status, 1, app.stdout);
  assert.match(app.stdout, /apps list/);
});

test("rules: a page that cannot be opened is not checked: it blocks once, then lets go", async (t) => {
  const cwd = sandbox();
  const args = ["file:///nonexistent/longbeard-rules.html", "--widths", "390"];
  const first = await run(args, cwd);
  if (/No Chrome/.test(first.stderr)) return t.skip("no Chrome installed");
  assert.equal(first.status, 3, first.stdout + first.stderr);
  assert.match(first.stdout, /not checked/);
  assert.match(first.stdout, /run it once more/);
  const second = await run(args, cwd);
  assert.equal(second.status, 3);
  assert.match(second.stdout, /twice/);
  assert.match(second.stdout, /go on/);
});

test("rules: a run on a changed page is a round, and the rounds end", async (t) => {
  const cwd = sandbox();
  const bad = (n) => page(`<h1>Title</h1><p>draft ${n}</p>`, cwd, "r.html");
  const args = (url) => [url, "--widths", "390", "--screen", "r", "--rounds", "2"];
  const one = await run(args(bad(1)), cwd);
  if (/No Chrome/.test(one.stderr)) return t.skip("no Chrome installed");
  assert.match(one.stdout, /round 1 of 2/);
  assert.doesNotMatch(one.stdout, /rounds used up/);
  const same = await run(args(bad(1)), cwd);
  assert.match(same.stdout, /round 1 of 2/);
  const two = await run(args(bad(2)), cwd);
  assert.match(two.stdout, /round 2 of 2/);
  assert.match(two.stdout, /rounds used up: stop fixing/);
  assert.equal(two.status, 1);
  const more = await run(args(bad(3)), cwd);
  assert.match(more.stdout, /round 2 of 2.*not counted/);
  const state = JSON.parse(readFileSync(join(cwd, ".longbeard/design/rounds.json"), "utf8"));
  assert.equal(state.r.round, 2);
});

test("rules: another state of the same screen is the same round, and a fix to it is the next", async (t) => {
  const cwd = sandbox();
  const url = page(`<h1>Title</h1><p>draft</p>`, cwd, "s.html");
  const args = (u) => [u, "--widths", "390", "--screen", "s", "--rounds", "2"];
  const one = await run(args(url), cwd);
  if (/No Chrome/.test(one.stderr)) return t.skip("no Chrome installed");
  assert.match(one.stdout, /round 1 of 2/);
  const open = await run(args(`${url}?menu=open`), cwd);
  assert.match(open.stdout, /round 1 of 2 \(another state of this screen: same round\)/);
  assert.doesNotMatch(open.stdout, /rounds used up/);
  page(`<h1>Title</h1><p>fixed</p>`, cwd, "s.html");
  const fixed = await run(args(url), cwd);
  assert.match(fixed.stdout, /round 2 of 2/);
});

test("rules: a waiver needs a reason, names an open finding, and keeps the finding listed", async (t) => {
  const cwd = sandbox();
  const url = page("<h1>Title</h1>", cwd, "w.html");
  const args = [url, "--widths", "390", "--screen", "w"];
  const first = await run(args, cwd);
  if (/No Chrome/.test(first.stderr)) return t.skip("no Chrome installed");
  const id = first.stdout.match(/\[([0-9a-f]{6})\]/)[1];
  assert.equal((await run(["--screen", "w", "--waive", id], cwd)).status, 2);
  const short = await run(["--screen", "w", "--waive", id, "--reason", "false"], cwd);
  assert.equal(short.status, 2);
  assert.match(short.stderr, /reason/);
  assert.equal((await run(["--screen", "w", "--waive", "ffffff", "--reason", "it is not a heading"], cwd)).status, 2);
  const ok = await run(["--screen", "w", "--waive", id, "--reason", "the word is the product's name"], cwd);
  assert.equal(ok.status, 0, ok.stderr);
  const again = await run(args, cwd);
  assert.equal(again.status, 0, again.stdout);
  assert.match(again.stdout, /waived \(1\)/);
  assert.match(again.stdout, /the word is the product's name/);
});

test("rules: the person can end the loop, with their words recorded", async (t) => {
  const cwd = sandbox();
  const url = page("<h1>Title</h1>", cwd, "s.html");
  const args = [url, "--widths", "390", "--screen", "s"];
  assert.equal((await run(["--screen", "s", "--ship", "ship it"], cwd)).status, 2); // nothing checked yet
  const first = await run(args, cwd);
  if (/No Chrome/.test(first.stderr)) return t.skip("no Chrome installed");
  assert.equal(first.status, 1);
  const ship = await run(["--screen", "s", "--ship", "Ship it as it is"], cwd);
  assert.equal(ship.status, 0, ship.stderr);
  assert.match(ship.stdout, /Ship it as it is/);
  const after = await run(args, cwd);
  assert.equal(after.status, 0, after.stdout);
  assert.match(after.stdout, /closed by the person/);
  assert.match(after.stdout, /Title/);
});

test("rules: waiving and shipping need no browser, and usage errors exit 2", async () => {
  const cwd = sandbox();
  mkdirSync(join(cwd, ".longbeard/design"), { recursive: true });
  writeFileSync(join(cwd, ".longbeard/design/rounds.json"), JSON.stringify({ x: { round: 1, found: [{ id: "abc123", rule: "11 Copy", where: "h1" }] } }));
  assert.equal((await run(["--screen", "x", "--waive", "abc123"], cwd)).status, 2);
  assert.equal((await run(["--screen", "x", "--waive", "abc123", "--reason", "the heading is the real name"], cwd)).status, 0);
  assert.equal(JSON.parse(readFileSync(join(cwd, ".longbeard/design/waivers.json"), "utf8"))[0].reason, "the heading is the real name");
  assert.equal((await run([], cwd)).status, 2);
  assert.equal((await run(["not-a-url"], cwd)).status, 2);
  assert.equal((await run(["file:///x.html", "--widths", "5"], cwd)).status, 2);
});
