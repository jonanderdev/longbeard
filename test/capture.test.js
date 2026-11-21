import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const capture = join(dirname(fileURLToPath(import.meta.url)), "../skills/design-moodboard/scripts/capture.mjs");

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

function exec(args, cwd = process.cwd()) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [capture, ...args], { cwd });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.stdout.on("data", (d) => (stdout += d));
    child.on("exit", (status) => done({ status, stderr, stdout }));
  });
}

test("capture fails on a local file that is not there, and names it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-missing-"));
  const missing = join(dir, "nothing.png");
  const result = await exec([`file://${missing}`, "--out", join(dir, "shot.png")]);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(missing), result.stderr);
});

test("capture is a usage error when a flag that needs a value has none", async () => {
  for (const extra of [["--frames"], ["--click"], ["--clip"], ["--wait"], ["--cookie"], ["--frames", "--scroll"]]) {
    const result = await exec(["https://example.com/", "--out", "/tmp/never.png", ...extra]);
    assert.equal(result.status, 2, `${extra.join(" ")}: ${result.stderr}`);
    assert.match(result.stderr, /needs a value/);
  }
});

test("capture writes a relative --out in the folder it runs from, not the git root", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "longbeard-cwd-"));
  const page = join(dir, "page.html");
  writeFileSync(page, "<!doctype html><h1>Hello</h1>");
  const result = await exec([`file://${page}`, "--out", "sub/shot.png"], dir);
  if (/No Chrome/.test(result.stderr)) return t.skip("no Chrome installed");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(join(dir, "sub")), ["shot.png"]);
});

test("capture answers a dialog the page opens, and says when a page is cut at the height limit", async (t) => {
  const server = createServer((req, res) =>
    res.end(
      req.url === "/tall"
        ? '<!doctype html><body style="margin:0"><div style="height:16000px;background:linear-gradient(red,blue)"></div>'
        : "<!doctype html><h1>Hi</h1><script>alert('hold on')</script>",
    ),
  );
  await new Promise((done) => server.listen(0, done));
  const base = `http://localhost:${server.address().port}`;
  try {
    const dialog = await run(`${base}/`);
    if (/No Chrome/.test(dialog.stderr)) return t.skip("no Chrome installed");
    assert.equal(dialog.status, 0, dialog.stderr);
    const tall = await run(`${base}/tall`);
    assert.equal(tall.status, 0, tall.stderr);
    assert.match(tall.stderr, /the page is 16000 px, over the 14000 px limit/);
  } finally {
    server.close();
  }
});

// A page on a name that is not local, so the consent step runs. Its buttons say
// where they were clicked by asking the server for /clicked-<name>.
test("capture clicks a consent button only inside a notice, and never in a --frames record", async (t) => {
  const clicked = [];
  const button = (name) => `<button onclick="fetch('/clicked-${name}')">OK</button>`;
  const server = createServer((req, res) => {
    if (req.url.startsWith("/clicked-")) {
      clicked.push(req.url.slice(9));
      return res.end("");
    }
    if (req.url === "/plain") return res.end(`<!doctype html><body><h1>Privacy</h1><p>We care about your privacy.</p>${button("plain")}`);
    res.end(`<!doctype html><body><h1>Home</h1><div style="position:fixed;bottom:0;left:0;background:#eee">We use cookies. ${button("notice")}</div>`);
  });
  await new Promise((done) => server.listen(0, done));
  const base = `http://consent.localhost:${server.address().port}`;
  try {
    const plain = await run(`${base}/plain`);
    if (/No Chrome/.test(plain.stderr)) return t.skip("no Chrome installed");
    assert.equal(plain.status, 0, plain.stderr);
    assert.deepEqual(clicked, []);
    const notice = await run(`${base}/notice`);
    assert.equal(notice.status, 0, notice.stderr);
    assert.deepEqual(clicked, ["notice"]);
    clicked.length = 0;
    const motion = await run(`${base}/notice`, ["--frames", "2", "--scroll"], "motion");
    assert.equal(motion.status, 0, motion.stderr);
    assert.deepEqual(clicked, []);
  } finally {
    server.close();
  }
});
