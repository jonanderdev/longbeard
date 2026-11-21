#!/usr/bin/env node
// Group a search's candidates into families before anyone picks, so the person
// chooses between looks first and a pool of one look shows itself. It reads
// each candidate's thumbnail from its URL, measures it with measure.mjs and
// sorts the numbers with families.mjs: the same sorter design-families uses.
//
// Nothing is kept. A thumbnail is hotlinked, never saved (sources.md, "What
// is saved"): each is fetched into a scratch folder outside the project, read
// there, and the folder is deleted when this ends, whatever the outcome. What
// is written is one small JSON of row ids, no picture.
//
// The TSV is the picker's: title, image, link, source, meta. A row's id is the
// round letter and its row number (a1, a2…), the same as the picker's, so
// the picker's marks and these groups name the same rows.
//
//   node group.mjs .longbeard/design/moodboard/candidates.tsv --out .longbeard/design/moodboard/families.json
//
// families.json: each family's id, a `name` left empty for the agent to fill
// with what is seen, its size, what its members share, and its members as row
// ids, most typical first. The strays are one entry, `stray: true`. A row whose
// picture could not be read is listed under `unread` and is in no family.
//
// The floor: a pool where too few families hold real numbers gives the person
// nothing to choose between. A family counts when it holds at least one
// candidate in twenty (never fewer than three); under four that count, the
// floor is not met and the agent searches wider before the picker opens. It is
// asked of round 1 only: round 2 is sharper on purpose.
//
//   --out file        where families.json goes (required)
//   --round n         the picker's round, for the ids (default 1)
//   --spread x        families.mjs's spread, lower for finer families (default 0.52)
//   --sheet file      also write label<TAB>image rows in group order, for
//                     contact-sheet.mjs: the label is the id and its family
//   --traits file     skip the fetching and measuring: traits from measure.mjs
//                     --tsv, one row per picture named by its id (a1.jpg)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const NEED = 4;
export const SHARE = 0.05;
const MIN = 3;

// A family counts when it holds a twentieth of what was read, and at least three.
export function floor(families, grouped) {
  const size = Math.max(MIN, Math.ceil(SHARE * grouped));
  const counted = families.filter((f) => !f.stray && f.size >= size);
  return { need: NEED, size, have: counted.length, met: counted.length >= NEED, counted: counted.map((f) => ({ id: f.id, size: f.size })) };
}

// The picker's rule for what is a row and what is its id.
export function rowsOf(text, letter = "a") {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !(l.trimStart().startsWith("#") && !l.includes("\t")))
    .map((line, i) => {
      const [title = "", image = "", link = "", source = "", meta = ""] = line.split("\t").map((c) => c.trim());
      return { id: `${letter}${i + 1}`, title, image, link, source, meta };
    });
}

// The kind of picture, from its first bytes, as the extension measure.mjs reads.
export function sniff(buf) {
  if (buf.length < 12) return "";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.toString("latin1", 1, 4) === "PNG") return ".png";
  if (buf.toString("latin1", 0, 4) === "GIF8") return ".gif";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return ".webp";
  if (buf.toString("latin1", 4, 12) === "ftypavif") return ".avif";
  return "";
}

// Families as the picker wants them: members are row ids, in the file's own order.
export function relabel(raw, idOf) {
  return raw.families.map((f) => ({
    id: f.id,
    ...(f.stray ? { stray: true } : { name: "" }),
    size: f.size,
    ...(f.small ? { small: true } : {}),
    shares: f.stray ? "far from every family" : [f.ranges.tone, `empty ${f.ranges.empty}`, `loud ${f.ranges.loud}`, `busy ${f.ranges.busy}`].join(" · "),
    members: f.members.map(idOf).filter(Boolean),
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? "" : (args.splice(i, 2)[1] ?? "");
  };
  const outArg = flag("out");
  const roundArg = flag("round") || "1";
  const spreadArg = flag("spread");
  const sheetArg = flag("sheet");
  const traitsArg = flag("traits");
  const round = Number(roundArg);
  const [tsvArg] = args;
  if (!tsvArg || !outArg || args.length !== 1 || !Number.isInteger(round) || round < 1 || round > 26 || (spreadArg && !(Number(spreadArg) > 0 && Number(spreadArg) < 1))) {
    console.error("usage: node group.mjs .longbeard/design/moodboard/candidates.tsv --out .longbeard/design/moodboard/families.json [--round 1] [--spread 0.52] [--sheet sheet.tsv] [--traits traits.tsv]");
    process.exit(2);
  }
  const letter = String.fromCharCode(96 + round);
  const here = dirname(fileURLToPath(import.meta.url));
  const root = (() => {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : process.cwd();
  })();
  const at = (p) => (isAbsolute(p) ? p : resolve(root, p));
  const fail = (text) => {
    console.error(`group: ${text}`);
    process.exit(1);
  };
  if (!existsSync(at(tsvArg))) fail(`no candidates at ${tsvArg}`);
  const rows = rowsOf(readFileSync(at(tsvArg), "utf8"), letter);
  if (rows.length < 2) fail("fewer than two rows to group");

  // The scratch folder is outside the project and goes whatever happens.
  const scratch = mkdtempSync(join(tmpdir(), "longbeard-group-"));
  const clean = () => {
    try {
      rmSync(scratch, { recursive: true, force: true });
    } catch {}
  };
  process.once("exit", clean);
  for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
    process.once(sig, () => {
      clean();
      process.exit(code);
    });
  }
  const images = join(scratch, "images");
  const work = join(scratch, "work");
  mkdirSync(images);
  mkdirSync(work);

  const unread = new Map();
  let traitsPath = traitsArg ? at(traitsArg) : join(work, "traits.tsv");
  if (traitsArg && !existsSync(traitsPath)) fail(`no traits at ${traitsArg}`);

  if (!traitsArg) {
    // Fetch each thumbnail from its URL, a few at a time, into the scratch folder.
    const queue = rows.filter((r) => r.image);
    for (const r of rows) if (!r.image) unread.set(r.id, "no image");
    const get = async (r) => {
      try {
        let buf;
        if (/^https?:\/\//i.test(r.image)) {
          const res = await fetch(r.image, { signal: AbortSignal.timeout(20000), redirect: "follow" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          buf = Buffer.from(await res.arrayBuffer());
        } else {
          const path = at(r.image);
          if (!existsSync(path)) throw new Error("no file");
          buf = readFileSync(path);
        }
        const ext = sniff(buf);
        if (!ext) throw new Error("not a jpg, png, webp, gif or avif");
        writeFileSync(join(images, `${r.id}${ext}`), buf);
      } catch (error) {
        unread.set(r.id, error.cause?.code || error.message);
      }
    };
    await Promise.all(Array.from({ length: 8 }, async () => {
      for (let r = queue.shift(); r; r = queue.shift()) await get(r);
    }));
    if (unread.size >= rows.length - 1) fail(`fewer than two thumbnails could be read (${[...unread].slice(0, 3).map(([id, why]) => `${id} ${why}`).join(", ")})`);

    const measured = spawnSync(process.execPath, [join(here, "measure.mjs"), images, "--tsv"], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 600000 });
    // A non-zero exit says some picture was not read; the rest are still printed.
    if (!measured.stdout.startsWith("ref\t")) fail(`measure.mjs read nothing: ${(measured.stderr || "no output").trim().split("\n").slice(-3).join(" ")}`);
    if (measured.stderr.trim()) console.error(measured.stderr.trim());
    writeFileSync(traitsPath, measured.stdout);
  }

  const traits = readFileSync(traitsPath, "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split("\t"));
  const idOf = (shot) => basename(shot, extname(shot));
  const read = new Set(traits.map((t) => idOf(t[0])));
  for (const r of rows) if (!read.has(r.id) && !unread.has(r.id)) unread.set(r.id, "not measured");

  const rawPath = join(work, "families.json");
  const sorted = spawnSync(process.execPath, [join(here, "families.mjs"), traitsPath, "--out", rawPath, ...(spreadArg ? ["--spread", spreadArg] : [])], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (sorted.status !== 0 || !existsSync(rawPath)) fail(`families.mjs did not sort: ${(sorted.stderr || sorted.stdout).trim().split("\n").slice(-2).join(" ")}`);
  const raw = JSON.parse(readFileSync(rawPath, "utf8"));

  const families = relabel(raw, idOf);
  const grouped = families.reduce((t, f) => t + f.members.length, 0);
  const verdict = round === 1 ? floor(families, grouped) : null;
  const doc = {
    round,
    spread: raw.spread,
    rows: rows.length,
    grouped,
    ...(verdict ? { floor: verdict } : {}),
    unread: [...unread].map(([id, why]) => ({ id, why })),
    families,
  };
  mkdirSync(dirname(at(outArg)), { recursive: true });
  writeFileSync(at(outArg), `${JSON.stringify(doc, null, 2)}\n`);

  if (sheetArg) {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const lines = families.flatMap((f) => f.members.map((id) => `${id} ${f.id}\t${byId.get(id).image}`));
    mkdirSync(dirname(at(sheetArg)), { recursive: true });
    writeFileSync(at(sheetArg), `${lines.join("\n")}\n`);
  }

  console.log(`group: ${grouped} of ${rows.length} rows grouped${unread.size ? `, ${unread.size} not read (${[...unread].slice(0, 4).map(([id, why]) => `${id} ${why}`).join(", ")}${unread.size > 4 ? " …" : ""})` : ""}, ${families.filter((f) => !f.stray).length} families, spread ${raw.spread}`);
  for (const f of families) console.log(`${f.id.padEnd(7)} ${String(f.size).padStart(4)}  ${f.shares}${f.small ? "  [small]" : ""}`);
  if (verdict) {
    console.log(
      verdict.met
        ? `floor: met, ${verdict.have} families of ${verdict.size} or more (need ${NEED})`
        : `floor: not met, ${verdict.have} of ${NEED} families of ${verdict.size} or more${verdict.counted.length ? ` (${verdict.counted.map((f) => `${f.id} ${f.size}`).join(", ")})` : ""}. Say which looks the pool has and which it lacks, then search wider before the picker`,
    );
  } else console.log("floor: not asked after round 1");
  console.log(outArg);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) await main();
