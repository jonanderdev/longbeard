import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const capture = join(dirname(fileURLToPath(import.meta.url)), "../skills/direction/scripts/capture.mjs");

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

function run(url, extra = []) {
  const out = join(mkdtempSync(join(tmpdir(), "longbeard-capture-")), "shot.png");
  return new Promise((done) => {
    const child = spawn(process.execPath, [capture, url, "--out", out, ...extra]);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (status) => done({ status, stderr }));
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
