# Pipeline change — one session per step

Each section is a session. Start a fresh session and paste:

> Read `docs/pipeline-plan.md` and `docs/pipeline-sessions.md`, then do session **S<n>**.

Rules for every session:

- `docs/pipeline-plan.md` holds the decisions. Do not reopen them. If one turns out wrong, write it under **Findings** in the plan and stop to ask.
- Read only what the session lists. Leave the rest.
- This repo's `AGENTS.md` is still the old router until S8. Use it for coding style, not for which skill runs.
- End by ticking the plan's work list, adding what you learned under **Findings** (one or two lines, facts the next session needs), and saying what you did not check. Commit only when asked.

## Order

```
S1 risk tests ─┬─> S5 design ──┐
S3 rules ──────┼─> S6 check ───┤
               └───────────────┤
S2 catalog ────────────────────┤
S4 direction ──────────────────┼─> S8 router + docs ─> S9 smoke ─> S10 release
S7 idea ───────────────────────┘
```

S1, S2, S3, S4 and S7 can run in any order or in parallel. S5 needs S1 and S3. S6 needs S1 and S3.

## S1 — Risk tests

Work list step 1. Answers four questions; changes no skill.

- Read: plan sections "Design" and "design-check"; `skills/design-reference-hunt/scripts/capture.mjs`; `update` in `bin/long-beard.js`; Matt's `prototype` skill (`SKILL.md` and `UI.md` at github.com/mattpocock/skills, `skills/engineering/prototype`).
- Do, in scratch or `../longbeard-smoke`, never in this repo's tree:
  1. New empty Figma file. Run the generate-library discovery, create a small token set (3 colours, 2 text styles, spacing) and one component, then compose one screen with generate-design. Count the `use_figma` calls.
  2. Point Matt's `prototype` UI branch at a plain HTML folder with no app. Does it work, and what has to be said to it?
  3. `capture.mjs` against a local dev server, and against a page behind a login.
  4. Does `update` remove a skill that left the catalog? Read the code, then prove it in the smoke project.
- Done when: four answers under Findings, each with what it means for S5, S6 or S2.

## S2 — Catalog

Work list steps 2 and the `update` part of 10.

- Read: plan section "Kit"; `beard.json`; `bin/long-beard.js`; `test/`; S1's finding on `update`.
- Do: replace the 17 Matt entries with one `"kit": true` entry (his plugin manifest); add Figma's four; drop ponytail, premortem, design-taste-frontend, design-md; mark add-ons `optional`; add `idea`, `direction`, `design`, `design-check` as `"source": "local"` (folders may still be stubs). If `update` does not remove dropped skills, fix it and add a test.
- Do not touch the router text yet (S8). `npm test` may fail only on router drift; say so.
- Done when: catalog matches the plan, `update` removes dropped skills, tests pass except the router-drift check.

## S3 — design-rules.md

Work list step 3.

- Read: plan section "Design rules". The taste references only for the tells list (`skills/taste-skill/references/tells.md` at github.com/Leonxlnx/taste-skill).
- Do: decide where the one copy lives (plan's Open list) and write it there. 15 sections, each one principle line and 3–5 checks you can pass or fail from a screenshot; site and app lists; hard vs soft marked; a dated tells section; sources credited once at the bottom.
- Done when: file written, real word count in Findings, location recorded and removed from Open.

## S4 — direction

Work list step 4.

- Read: plan section "Direction"; `skills/design-reference-hunt/` (SKILL.md, references/sources.md, the scripts).
- Do: rename to `skills/direction/`, rewrite SKILL.md to the plan (three questions, `design-exploration/<slug>/`, new cards, `direction.md`, no persist ask, one-piece mode). Move `contrast.mjs` where S5 will find it, or leave a note. Update the moodboard script if the card fields changed.
- Done when: skill reads end to end with no token decisions left in it; scripts still run on a sample board.

## S5 — design

Work list step 5. Needs S1 and S3.

- Read: plan section "Design"; S1 Findings; `skills/design-md/SKILL.md` (what to keep); the three Figma skills' SKILL.md, only the parts that touch pages, tokens and components.
- Do: write `skills/design/` (prototype → approve → `DESIGN.md` → Figma layout and order → states → Ready → cleanup; feature loop; identity-change rule). Bring over `contrast.mjs`, the `DESIGN.md` template and the ideas-not-sources rule from design-md. Delete `skills/design-md/`.
- Done when: one skill covers the stage; it says nothing Figma's skills already say.

## S6 — design-check

Work list step 6. Needs S1 and S3.

- Read: plan section "design-check"; S1 Findings on `capture.mjs`; the rules file from S3.
- Do: write `skills/design-check/` with frame mode and build mode, findings format, hard blocks / soft reports.
- Done when: both modes are written and frame mode ran once on S1's test screen.

## S7 — idea

Work list step 7.

- Read: plan section "Idea"; Matt's `grilling` SKILL.md.
- Do: write `skills/idea/`: grilling until the brief's sections are settled, then `docs/brief.md`; existing-repo mode. Keep it short.
- Done when: skill written; a dry run on a one-line idea produces a brief with every section.

## S8 — Router and docs

Work list steps 8 and 9. Needs S2 and S4–S7.

- Read: plan sections "Stages" and "Router"; the generator in `bin/long-beard.js`; PRODUCT.md; README; CHANGELOG.
- Do: generator emits the stage table, the three glue lines, helpers, add-on hints; `npm run router`; under 200 words. Rewrite PRODUCT.md to the pipeline. README kit table. CHANGELOG `Unreleased` with the migration note.
- Done when: `npm test` passes, the router is under 200 words, and no doc names a dropped skill except the migration note.

## S9 — Smoke

Work list step 11.

- Read: plan "Stages"; the smoke instructions in PRODUCT.md.
- Do: in `../longbeard-smoke`, fresh: one idea → brief → direction → prototype → `DESIGN.md` → Figma key screen. Then one small spec through Build and `design-check`.
- Done when: each handoff file appeared, and every friction point is in Findings as a fix or a deliberate leave.

## S10 — Release

Work list step 12. Follow "Releases" in PRODUCT.md. One `0.x` minor.

Before the release commit, check that every decision in the plan landed in PRODUCT.md, the README, or a skill. Then delete `docs/pipeline-plan.md`, this file, and `docs/` if it is empty. They are scaffolding, not docs.
