#!/usr/bin/env node
// The direction's screens as one page to choose from: every screen in a strip
// (each round, and a screen's parts, in a row), the one
// they open shown large, and beside it what it is made from: its base and each
// move, with the reference's picture and their own words. Actions write a
// line for the chat. No dependencies. It shows what was built; it adds no
// colour of its own.
//
//   node canvas.mjs .longbeard/design/direction/screens.json --board .longbeard/design/direction/board.md --shots .longbeard/design/direction/grid --out .longbeard/design/direction/canvas.html
//
// screens.json entries (the skill's step 3): n, base, moves [{ what, from, like }], state,
// failure, and optionally round (1 when left out), of (the screen it belongs to),
// part (a part of that screen), fault (one line), shot
// (a picture; else <shots>/<n>.png). board.md cards give each reference's shot and like.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
};
const boardArg = flag("board");
const shotsArg = flag("shots");
const outArg = flag("out");
const [screensArg] = args;
if (!screensArg || !outArg || !shotsArg || args.length !== 1 || !/\.html$/.test(outArg)) {
  console.error("usage: node canvas.mjs <screens.json> --shots <folder of n.png> [--board <board.md>] --out <canvas.html>");
  process.exit(2);
}
const outPath = resolve(outArg);
const href = (abs) => {
  const src = relative(dirname(outPath), abs).split("\\").join("/").split("/").map(encodeURIComponent).join("/");
  return src.startsWith(".") ? src : `./${src}`;
};
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

if (!existsSync(screensArg)) {
  console.error(`canvas: no screens at ${screensArg}`);
  process.exit(1);
}
let screens;
try {
  screens = JSON.parse(readFileSync(screensArg, "utf8"));
} catch (e) {
  console.error(`canvas: ${screensArg} could not be read: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(screens) || !screens.length) {
  console.error(`canvas: ${screensArg} lists no screens`);
  process.exit(1);
}
const open = screens.filter((s) => !s.state);
if (open.length) {
  console.error(`canvas: screen ${open.map((s) => s.n).join(", ")} has no state yet; draw the canvas when every screen has ended`);
  process.exit(1);
}

// The board's cards, by name: their shot and their words.
const cards = new Map();
if (boardArg) {
  if (!existsSync(boardArg)) {
    console.error(`canvas: no board at ${boardArg}`);
    process.exit(1);
  }
  for (const chunk of readFileSync(boardArg, "utf8").split(/^### /m).slice(1)) {
    const nl = chunk.indexOf("\n");
    const name = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const fields = {};
    for (const line of (nl === -1 ? "" : chunk.slice(nl + 1)).split(/\r?\n/)) {
      const m = line.match(/^- ([a-z][a-z /-]*):\s*(.*)$/i);
      if (m && !(m[1].toLowerCase() in fields)) fields[m[1].toLowerCase()] = m[2].trim();
    }
    const shot = fields.shot || "";
    const src = /^https?:\/\//i.test(shot) ? shot : shot && existsSync(resolve(shot)) ? href(resolve(shot)) : "";
    cards.set(name, { name, src, like: fields.like || "", avoid: fields.avoid || "" });
  }
}
const cardOf = (name) => cards.get(name) || { name: name || "", src: "", like: "", avoid: "" };

let missing = 0;
const shotOf = (s) => {
  const path = s.shot ? (isAbsolute(s.shot) ? s.shot : resolve(s.shot)) : resolve(shotsArg, `${s.n}.png`);
  if (existsSync(path)) return href(path);
  missing++;
  console.error(`canvas: no picture for screen ${s.n} at ${relative(process.cwd(), path)}`);
  return "";
};

// Rows: each round, then each screen's parts.
const rows = new Map();
for (const s of screens) {
  const key = s.of != null ? `${s.of} · ${s.part || "parts"}` : `Round ${s.round || 1}`;
  if (!rows.has(key)) rows.set(key, []);
  rows.get(key).push(s);
}
const label = (s) => (s.state === "failed" ? "failed" : "built");
const data = screens.map((s) => {
  const base = cardOf(s.base);
  return {
    n: String(s.n),
    src: shotOf(s),
    label: label(s),
    of: s.of != null ? String(s.of) : "",
    part: s.part || "",
    fault: s.state === "failed" ? `failed: ${s.failure || "no reason given"}` : s.fault || "",
    base: { name: base.name, src: base.src, like: base.like, avoid: base.avoid },
    moves: (s.moves || []).map((m) => {
      const c = cardOf(m.from);
      return { what: m.what || "", from: c.name, src: c.src, like: m.like || c.like || "", proposed: Boolean(s.proposed) };
    }),
  };
});

const strip = [...rows.entries()]
  .map(
    ([name, list]) => `<div class="row"><span class="rl">${esc(name)}</span>${list
      .map((s) => {
        const d = data.find((x) => x.n === String(s.n));
        return `<button type="button" class="th" data-n="${esc(d.n)}"${d.label === "failed" ? " data-failed" : ""}>${d.src ? `<img src="${esc(d.src)}" alt="">` : `<span class="none">no picture</span>`}<span class="tl">${esc(d.n)} · ${esc(d.label)}</span></button>`;
      })
      .join("")}</div>`,
  )
  .join("");

// The Long Beard beard, small and one ink: it marks the page as the tool's and adds no colour.
const LOGO = "iVBORw0KGgoAAAANSUhEUgAAACoAAABYBAMAAABxB3iiAAAAMFBMVEWfn59ubm7Z2dn+/v7+/v7////+/v4AAAACAgIXFxcnJyfp6enX19c3NzdXV1dGRkbPaZsJAAAAEHRSTlP///AgWZ/+AP////7/////SdcINAAABTtJREFUeNpdlWtUVFUUx3/3zB1AZhhu4AO1hVOCj8yYKLKHyaiEq5eOS9DoQ2IFPj6UtSyVamm1AC2ttFUIZo6GikU6mrrMVTFoargsxzFTU2kkKN/OyENgHrcPd5jBzrfzW/+77/7vc/Y+0kLCK1Cf2jfgSwNAjkB35vPjEzeWWgFED90/fFfDtktd5tu0P415O+uDxwZ7tZ1ubPj7uhGHUp8/uUITh+nxiv5/UNCQ/9clcyTuD8FBv26GDUXfb7iTHhpsbap5JnftXse4u5fNdPZQdyB+cckqtcm0ZMh6773hHAKDdo9eesRUDHvGLRhjfsOq/W3ajfsfeGoaoDv4Ys399SmgG4uzPKBL0hINfv/gAedlMzIoV84fbg6biUlvnhDSvA1OapzfY/zLiSfr+1llwP+6swfiLzndMRVBcFBthyNCeWStoiCz/8TWa/Oj1NBefAsRGFauKlFI90yxHyElT/dFA8RUMXCizynqq1o2Odi7CQD9tpXsmOJUhNRS0aTf9/YxO+ipOxCsnGo4qYj0jSHa5yUOOA15RYesZZdlQ7pLbjcA04ZeGCrtmrJT4XKFMyU+oOt88nxSZanx95yJY7aNGJtzzGANxJyRx9v2heo2Fbda/l1+rGqhKv3pi/UiwCgNCS1yGd6Mrbz1UtJsz1ZLBgIPsXaJOR+1SqXMaLArSsnmNlG3b5u0yIsv9Io0S3rVZc5+vTPXqHs6eVJocJ/WB4suX2gZuMA2uWlv17m/xK3OE+/J9zDLOMVMKOtgYHZheuo62TQst92+sfGPornzJ/VfYunz68qOoCxL5LW7PqwuP2yqJFixTO813jQEdN6RCbNaLq5+y/vV1h9S+pU5qUzJdki5a5Z1391McRXfVV9yAqOOZ7jJHHH1xaXDYopTj8ZdNBoMhcZ34/6ZIS24+nDS3wvaT6Wb6lz32pKq6+LiTrp1j5/1VWYdqE1f935trX/UECXO23g9UzD65mTdqZwsvg7s2anf/I5VBNPQjRWJvuSjqyosB48MzHk0w53S5otHgBSvCneD3VPyAfHPTvDGTQUB0gs205ZHEIvzXi0cdbDPxxr90TrBp3rMvLzL6TE36b1BJwJk5R8T+63Jc5f6vPZrenNfrQM8h9bTwuoLw3Z9vmE7n3hABmVHwgMmNeBuwd8unZ38aaqCAL3PgR9VBTV2PVbJBQLuaEVVpS2DIca2RHLgBQFtAuj65C3AQqxd67eA6yZGBa8CFOgfQo1Mgm4rMVZAP86OTQEB49VushatBGBtPokWkCGBbwsKeq719PzC63chQMIVbYAuPFdBIIWk+ihVbcoBKwKCRm+UpjlW3QABU/ytUZqtb9sOAlR6N5Z0U8tXzOL/S6DuXNhbrYYAgXzmdl2CFuE+J1ATafreEzExok3UTpPxAo5HaEYvrS5CzQ6NJsRDMEK9No1KQHKEWqRohHmaMzugRKkfAFPEW3RVfxboTTu0QfJV6czwCJOj0lsnpk6eBOH7EC3lmdcAVzjf1tAmAHlkYxngUzXqxKe56rQBP4f/pkrVMB2yy4CYsFbONAH5/FJeiN7RFj4huuKvQx0l5dA+TxLhHK5kB2x6J2k2wPRcWptGA5aQzb+CKkDqzi4MayfuQOEpAIxJq7eH34Dg0Zr3WzQfdd8c98drjmXPE2GI87fa5r7h12nAud2HLfuGQvf5BtejPTWTMzaWcNEONfk3cqL1Dc1JKXEt/2Jr6bnmXpWU+w6v6VxTxvKEvN71fbziSEzeYkOB+7aqy42Z7jNFaqNV2/4HUzT8HOE538sAAAAASUVORK5CYII=";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction</title>
<style>
  /* Quiet chrome: the screens and references are the only colour on the page. */
  :root { --canvas: #f3f2ef; --paper: #ffffff; --ink: #1c1c1a; --muted: #6f6c65; --line: #dedbd4; --soft: #e9e7e2; }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 14px; -webkit-font-smoothing: antialiased; }
  main { max-width: 1680px; margin: 0 auto; padding: 22px 28px 150px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .brand img { height: 44px; width: auto; display: block; }
  .brand span { font-size: 16px; font-weight: 600; }
  .brand h1 { margin: 0; font-size: 16px; font-weight: 400; color: var(--muted); }
  .brand h1::before { content: "/"; margin-right: 10px; color: var(--line); }
  .brand .keys { margin-left: auto; font-size: 12px; color: var(--muted); }
  kbd { font: 11px ui-monospace, Menlo, monospace; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; background: var(--paper); color: var(--ink); }
  .strip { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
  .row { display: flex; gap: 10px; align-items: flex-end; overflow-x: auto; padding: 4px 2px 6px; }
  .rl { flex: none; width: 110px; font-size: 12px; color: var(--muted); padding-bottom: 20px; }
  .th { flex: none; width: 150px; padding: 0; border: 0; background: none; cursor: pointer; text-align: left; font: inherit; color: var(--muted); }
  .th img, .th .none { width: 150px; aspect-ratio: 16 / 10; object-fit: cover; object-position: top; display: block; border-radius: 4px; background: var(--soft); outline: 2px solid transparent; outline-offset: 2px; }
  .th .none { display: grid; place-items: center; font-size: 11px; }
  .tl { display: block; font: 11px ui-monospace, Menlo, monospace; margin-top: 5px; }
  .th[aria-current="true"] img, .th[aria-current="true"] .none { outline-color: var(--ink); }
  .th[aria-current="true"] .tl { color: var(--ink); }
  .th[data-failed] .tl { text-decoration: line-through; }
  .main { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; align-items: start; }
  .stage { display: grid; gap: 14px; grid-template-columns: 1fr; }
  .stage[data-compare] { grid-template-columns: 1fr 1fr; }
  .shot { display: block; background: var(--paper); border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 1px var(--line); text-decoration: none; }
  .shot img { width: 100%; max-height: 72vh; object-fit: contain; object-position: top; background: var(--soft); display: block; }
  .shot .cap { display: block; padding: 6px 10px; font-size: 12px; color: var(--muted); }
  .basebox[hidden] { display: none; }
  h2 { margin: 14px 0 2px; font-size: 16px; font-weight: 600; }
  .fault { margin: 4px 0 0; color: var(--ink); }
  .fault:empty { display: none; }
  .fault::before { content: "Fault: "; font-weight: 600; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .acts button, .acts input { font: inherit; font-size: 13px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); }
  .acts button { cursor: pointer; }
  .acts .primary { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
  .acts input { min-width: 220px; flex: 1 1 220px; }
  aside h3 { margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .ing { display: grid; grid-template-columns: 96px 1fr; gap: 12px; margin-bottom: 16px; }
  .ing img, .ing .none { width: 96px; aspect-ratio: 4 / 3; object-fit: cover; object-position: top; border-radius: 4px; display: block; background: var(--soft); }
  .ing b { display: block; font-weight: 600; font-size: 13px; overflow-wrap: anywhere; }
  .ing i { display: block; font-style: normal; color: var(--muted); font-size: 13px; line-height: 1.4; }
  .ing q { display: block; font-size: 13px; line-height: 1.4; margin-top: 3px; quotes: "\\201C" "\\201D"; }
  .ing q:empty { display: none; }
  .ing .out { display: block; font-size: 13px; margin-top: 3px; color: var(--muted); }
  .ing .out:empty { display: none; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--paper); border-top: 1px solid var(--line); }
  .bar-in { max-width: 1680px; margin: 0 auto; padding: 10px 28px; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: end; }
  .bar label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
  .bar textarea { width: 100%; font: 12px/1.4 ui-monospace, Menlo, monospace; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; height: 46px; resize: vertical; background: var(--canvas); }
  #copy { font: inherit; font-size: 13px; font-weight: 600; padding: 9px 16px; border-radius: 6px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; }
  button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid #2f6fdb; outline-offset: 2px; }
  @media (max-width: 900px) {
    main { padding: 16px 16px 200px; }
    .main, .stage[data-compare] { grid-template-columns: 1fr; }
    .brand .keys { display: none; }
    .rl { width: 64px; }
    .bar-in { grid-template-columns: 1fr; padding: 10px 16px; }
  }
</style>
</head>
<body>
<main>
  <div class="brand"><img src="data:image/png;base64,${LOGO}" alt="" width="21" height="44"><span>Long Beard</span><h1>Direction</h1><span class="keys"><kbd>←</kbd><kbd>→</kbd> move between screens</span></div>
  <div class="strip">${strip}</div>
  <div class="main">
    <section>
      <div class="stage" id="stage">
        <a class="shot" id="shot" target="_blank" rel="noopener"><img id="big" alt=""><span class="cap" id="cap"></span></a>
        <a class="shot basebox" id="basebox" target="_blank" rel="noopener" hidden><img id="baseimg" alt=""><span class="cap" id="basecap"></span></a>
      </div>
      <h2 id="title"></h2>
      <p class="fault" id="fault"></p>
      <div class="acts">
        <button type="button" class="primary" data-act="take">Take this one</button>
        <button type="button" data-act="more">More of this</button>
        <button type="button" data-act="compare" aria-pressed="false">Beside its base</button>
        <input type="text" id="ask" placeholder="Or say it: with 6's colours, open the menu…" aria-label="What to do with this screen">
      </div>
    </section>
    <aside><h3>Made from</h3><div id="made"></div></aside>
  </div>
</main>
<div class="bar"><div class="bar-in">
  <div><label for="out">Copy this into the chat</label><textarea id="out" readonly></textarea></div>
  <button type="button" id="copy">Copy</button>
</div></div>
<script>
(() => {
  const screens = ${JSON.stringify(data).replace(/</g, "\\u003c")};
  const key = "longbeard-canvas:" + location.pathname;
  const $ = (id) => document.getElementById(id);
  const thumbs = [...document.querySelectorAll(".th")];
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const said = [];
  let at = 0;
  try { at = Math.max(0, screens.findIndex((s) => s.n === localStorage.getItem(key))); } catch (e) {}
  const ing = (src, title, what, like, avoid) =>
    '<div class="ing">' + (src ? '<img src="' + esc(src) + '" alt="">' : '<span class="none"></span>') +
    '<div><b>' + esc(title) + '</b><i>' + esc(what) + '</i><q>' + esc(like) + '</q><span class="out">' + (avoid ? "left out: " + esc(avoid) : "") + '</span></div></div>';
  function show(i) {
    at = (i + screens.length) % screens.length;
    const s = screens[at];
    for (const t of thumbs) t.setAttribute("aria-current", t.dataset.n === s.n ? "true" : "false");
    $("big").src = s.src || "";
    $("shot").href = s.src || "#";
    $("cap").textContent = s.n + " · " + s.label;
    $("baseimg").src = s.base.src || "";
    $("basebox").href = s.base.src || "#";
    $("basecap").textContent = "Base: " + s.base.name;
    const kind = s.part ? s.part + " of " + s.of : "on " + s.base.name;
    $("title").textContent = s.n + " · " + kind;
    $("fault").textContent = s.fault;
    $("made").innerHTML =
      ing(s.base.src, "Base · " + s.base.name, "the layout, spacing and everything no move names", s.base.like, s.base.avoid) +
      s.moves.map((m) => ing(m.src, "+ " + m.from, m.what + (m.proposed ? " (proposed)" : ""), m.like, "")).join("");
    try { localStorage.setItem(key, s.n); } catch (e) {}
  }
  function write() {
    $("out").value = said.length ? said.join("\\n") : "";
  }
  for (const t of thumbs) t.addEventListener("click", () => show(screens.findIndex((s) => s.n === t.dataset.n)));
  for (const b of document.querySelectorAll("[data-act]")) {
    b.addEventListener("click", () => {
      const s = screens[at];
      if (b.dataset.act === "compare") {
        const on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        $("basebox").hidden = !on;
        if (on) $("stage").dataset.compare = ""; else delete $("stage").dataset.compare;
        return;
      }
      said.push(b.dataset.act === "take" ? "take " + s.n : "more of " + s.n);
      write();
    });
  }
  $("ask").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    said.push(screens[at].n + " " + e.target.value.trim().replace(/\\s+/g, " "));
    e.target.value = "";
    write();
  });
  document.addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
  });
  // The text box is the real path: the clipboard API can be refused on a file:// page.
  $("copy").addEventListener("click", async (e) => {
    const out = $("out");
    out.focus();
    out.select();
    let ok = false;
    try { await navigator.clipboard.writeText(out.value); ok = true; } catch (err) {}
    if (!ok) { try { ok = document.execCommand("copy"); } catch (err) {} }
    e.target.textContent = ok ? "Copied" : "Selected, press Cmd/Ctrl+C";
    setTimeout(() => { e.target.textContent = "Copy"; }, 1800);
  });
  show(at);
  write();
})();
</script>
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.error(`canvas: ${screens.length} screens in ${rows.size} row${rows.size === 1 ? "" : "s"}${missing ? `, ${missing} without a picture` : ""}`);
console.log(outArg);
