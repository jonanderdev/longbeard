import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { shared } from "../scripts/share.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("every skill ships the same copy of a shared file", () => {
  for (const [source, targets] of shared) {
    const text = readFileSync(join(root, source), "utf8");
    const name = source.split("/").pop();
    for (const target of targets) {
      const copy = readFileSync(join(root, "skills", target, name), "utf8");
      assert.equal(copy, text, `skills/${target}/${name} drifted from ${source}. Edit the source, then run npm run share.`);
    }
  }
});

test("share.mjs does its work when run through a symlinked path or a path with a space", () => {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), "share guard ")));
  try {
    const real = join(tmp, "real dir");
    mkdirSync(join(real, "scripts"), { recursive: true });
    copyFileSync(join(root, "scripts/share.mjs"), join(real, "scripts/share.mjs"));
    for (const [source, targets] of shared) {
      mkdirSync(join(real, dirname(source)), { recursive: true });
      writeFileSync(join(real, source), `source of ${source}\n`);
      for (const target of targets) mkdirSync(join(real, "skills", target), { recursive: true });
    }
    const link = join(tmp, "linked scripts");
    symlinkSync(join(real, "scripts"), link);
    const run = spawnSync(process.execPath, [join(link, "share.mjs")], { cwd: real, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    for (const [source, targets] of shared) {
      const name = source.split("/").pop();
      for (const target of targets) {
        assert.equal(readFileSync(join(real, "skills", target, name), "utf8"), `source of ${source}\n`, `${target}/${name} was not copied`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
