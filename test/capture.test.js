import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const capture = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-direction/scripts/capture.mjs");

// A dev app with a login: /app needs the session cookie, /spa sends you to
// /login from the page itself, faster than the old navigated-away check.
function app() {
  const server = createServer((req, res) => {
    const authed = /session=ok/.test(req.headers.cookie || "");
    if (req.url === "/app" && !authed) {
      res.writeHead(302, { location: "/login" });
      return res.end();
    }
    if (req.url === "/spa") return res.end("<script>location.replace('/login')</script>");
    res.end(`<!doctype html><h1>${req.url}</h1>`);
  });
  return new Promise((done) => server.listen(0, () => done(server)));
}

function run(url, extra = [], name = "shot.png") {
  const out = join(mkdtempSync(join(tmpdir(), "longbeard-capture-")), name);
  const started = Date.now();
  return new Promise((done) => {
    const child = spawn(process.execPath, [capture, url, "--out", out, ...extra]);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stderr, out, ms: Date.now() - started }));
  });
}

test("capture names a page that lands elsewhere, fails on it with --strict, and passes with the cookie", async (t) => {
  const server = await app();
  const base = `http://localhost:${server.address().port}`;
  try {
    const plain = await run(`${base}/`);
    if (/No Chrome/.test(plain.stderr)) return t.skip("no Chrome installed");
    assert.equal(plain.status, 0, plain.stderr);
    const loose = await run(`${base}/app`);
    assert.equal(loose.status, 0, loose.stderr);
    assert.match(loose.stderr, /landed on .*\/login/);
    const redirect = await run(`${base}/app`, ["--strict"]);
    assert.equal(redirect.status, 1);
    assert.match(redirect.stderr, /landed on .*\/login/);
    const fast = await run(`${base}/spa`, ["--strict"]);
    assert.equal(fast.status, 1);
    assert.match(fast.stderr, /landed on .*\/login/);
    const authed = await run(`${base}/app`, ["--strict", "--cookie", "session=ok"]);
    assert.equal(authed.status, 0, authed.stderr);
  } finally {
    server.close();
  }
});

// A page behind a full-screen loader for 1.5 s, the way intro-heavy sites open.
const loading = `<!doctype html><body style="margin:0"><h1>Ready</h1>
<div class="preloader" style="position:fixed;inset:0;background:#000;color:#fff">0%</div>
<script>setTimeout(() => document.querySelector(".preloader").remove(), 1500)</script>`;

function site() {
  const server = createServer((req, res) => res.end(loading));
  return new Promise((done) => server.listen(0, () => done(server)));
}

test("capture waits out a loader before the shot", async (t) => {
  const server = await site();
  try {
    const result = await run(`http://localhost:${server.address().port}/`, ["--wait", "6000"]);
    if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stderr, /waited/);
    assert.ok(result.ms >= 1500, `took ${result.ms} ms`);
  } finally {
    server.close();
  }
});

test("capture --frames writes timed frames to a folder, from the first paint", async (t) => {
  const server = await site();
  try {
    const result = await run(`http://localhost:${server.address().port}/`, ["--frames", "3", "--every", "200"], "intro");
    if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
    assert.equal(result.status, 0, result.stderr);
    const files = readdirSync(result.out).sort();
    assert.equal(files.length, 3);
    for (const [i, f] of files.entries()) assert.match(f, new RegExp(`^0${i + 1}-\\d{5}ms\\.jpg$`));
  } finally {
    server.close();
  }
});

test("capture refuses motion options that do not fit together", async () => {
  for (const extra of [["--every", "200"], ["--scroll"], ["--frames", "1"], ["--frames", "4", "--clip", "0,0,10,10"], ["--frames", "4", "--scroll", "--click", "a"]]) {
    const result = await run("https://example.com/", extra);
    assert.equal(result.status, 2, `${extra.join(" ")}: ${result.stderr}`);
  }
});

test("capture fails on a page it cannot reach, and keeps a long local page in parts", async (t) => {
  const gone = await run("http://127.0.0.1:1/");
  if (/No Chrome/.test(gone.stderr)) return t.skip("no Chrome installed");
  assert.equal(gone.status, 1);
  assert.match(gone.stderr, /could not reach .*ERR_/);
  const dir = mkdtempSync(join(tmpdir(), "longbeard-tall-"));
  const page = join(dir, "tall.html");
  writeFileSync(page, '<!doctype html><body style="margin:0"><div style="height:45000px;background:linear-gradient(red,blue)"></div>');
  const tall = await run(`file://${page}`, [], "tall.jpg");
  assert.equal(tall.status, 0, tall.stderr);
  assert.deepEqual(readdirSync(dirname(tall.out)).sort(), ["tall-2.jpg", "tall.jpg"]);
});
