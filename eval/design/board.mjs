// A fixture's board, fetched from public links instead of kept in this repo.
//
// A fixture with board.json lists its references: [{ "file": "01-name.jpg", "url": "<public picture link>", "taste": "1445" }].
// The pictures are never committed (board/ is gitignored): each is fetched once from its link into the
// fixture's board/. If a link is dead, the owner's taste library is the fallback: its card's pin picture,
// found at LB_TASTE, else beside this repo (../longbeard-taste). A fixture without board.json keeps its
// pictures in board/ as before.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export function ensureBoard(fixture, repo) {
  const list = join(fixture, "board.json");
  if (!existsSync(list)) return;
  const taste = resolve(process.env.LB_TASTE || join(repo, "../longbeard-taste"));
  const want = JSON.parse(readFileSync(list, "utf8"));
  const dir = join(fixture, "board");
  mkdirSync(dir, { recursive: true });
  const missing = want.filter(({ file }) => !existsSync(join(dir, file)) || statSync(join(dir, file)).size < 1000);
  if (!missing.length) return;
  // curl, so the fetch goes through the shell's proxy settings.
  const fetch = (url, to) => Boolean(url) && !spawnSync("curl", ["-sSfL", "-m", "60", "-o", to, url]).status && statSync(to).size >= 1000;
  const fromTaste = (id) => {
    const at = join(taste, "library/cards", `${id}.json`);
    const pin = existsSync(at) ? JSON.parse(readFileSync(at, "utf8")).source?.pins?.[0] ?? {} : {};
    return pin.image_736 || pin.image_url || "";
  };
  for (const { file, url, taste: id } of missing) {
    const to = join(dir, file);
    if (fetch(url, to) || (id && fetch(fromTaste(id), to))) continue;
    console.error(`board: could not fetch ${file}: its link failed${id ? `, and card ${id} is not in a taste library at ${taste} (set LB_TASTE)` : ""}. Put the picture in ${dir} by hand, or use your own board with --fixture.`);
    process.exit(1);
  }
  console.log(`board: fetched ${missing.length} pictures`);
}
