---
name: design-check
description: >
  Check a screen against the design rules and DESIGN.md, and report findings
  (rule, hard or soft, where, fix). Frame mode checks a Figma frame, called
  by design after each screen. Build mode checks a built UI spec against its
  Ready frames, run after implement-spec, with evidence for the PR. Hard
  findings block; soft findings are reported. It reports and never redesigns.
---

# design-check

Checks one thing: does this screen pass [design-rules.md](references/design-rules.md) and follow `DESIGN.md`? It returns findings. The caller fixes them. It does not suggest a new look, and it does not change `DESIGN.md`.

## Findings

One line per finding, hard first:

```
| Rule | Hard/soft | Where | Fix |
|---|---|---|---|
| 8 States | hard | Today, no empty frame | Add "Today — empty": what goes here, and the one action that fills it |
| 4 Spacing | soft | Today, list to heading gap 24 | Use space/lg (32) or say why in DESIGN.md |
```

- **Rule** is the number and name from design-rules.md, plus the check if the section has several.
- **Where** names the screen and the element, so someone can find it without the screenshot.
- **Fix** is the smallest change that passes, in `DESIGN.md`'s tokens. Never a new colour, face or component the file does not have. If the only fix is one, write "needs a design decision" and say what.
- A soft rule that `DESIGN.md` overrides with a reason is not a finding. Without a reason, it is.
- No findings: say "passes" and list which rules were checked.

**Hard blocks; soft is reported.** The caller gets one fresh pass to fix the hard findings, then one re-check. Hard findings that remain are listed as open. They never pass silently.

## Order

1. **Idea** (rule 0): cover the logo. Is it still this product?
2. **Hard** checks, every section, then the site or app list from the brief's surface.
3. **Soft** checks, then the tells (rule 14).

Read `DESIGN.md` first: its tokens, components and decisions are what "follows the file" means.

## Frame mode

Called by `design` after it composes or changes a Figma screen. Input: the file key, the node IDs of the screen and its state frames, and the approved prototype shot of that screen when there is one.

1. Load `figma-use` for any `use_figma` call. Screenshot each frame (`get_screenshot`, `maxDimension` 1440 so text is readable). Read structure with `get_metadata` when spacing or alignment needs numbers.
2. Find the states: the frames next to the default, whatever they are called. Decide from what each frame shows whether it is the screen's empty, loading or error state, not from its name. A reachable state with no frame is a rule 8 hard finding. So is a "not needed" under Decisions in `DESIGN.md` when a person can reach that state after all.
3. Check tokens where the screenshot cannot tell: in one read-only `use_figma` call, list fills, gaps and text styles that are not bound to a variable or style. An unbound value is a rule 7 soft finding when a token exists for it. With more than one theme, an unbound colour is a rule 6 hard finding, because it will not change with the theme.
4. Check the themes, when `DESIGN.md` lists more than one. Themes built as separate colour sets or as a frame per theme, instead of modes on one collection, are a rule 6 hard finding. For each mode, set it on a temporary copy of the frame, screenshot the copy, delete it, and run the rules on that shot. If the shot does not change with the mode, report that theme as "not checked", never as passed.
5. Compare with the prototype shot, side by side. The frame must be faithful to what they approved. Anything lost or changed without their yes is a hard finding, under rule 0. Pixels do not count. No shot: say "not compared".
6. Return the findings. `design` fixes the hard ones, runs this once more, then shows the screen. A frame with open hard findings is never marked Ready.

## Build mode

After `implement-spec` builds a UI spec. Input: the running app's URL for each screen, and the Ready frames the tickets link. A screen with no Ready frame has nothing to compare with: report it as "not checked" and send it to `design`.

1. **Render** each screen at phone and desktop:
   ```
   node <skill>/scripts/capture.mjs <url> --out <scratch>/<screen>-390.png --width 390 --strict
   node <skill>/scripts/capture.mjs <url> --out <scratch>/<screen>-1440.png --strict
   ```
   Behind a login, pass `--cookie "name=value"` from a dev session the project already uses (a seed user, a test token). Never ask for real credentials. `--strict` exits 1 when the page lands elsewhere: a shot of the login page is not a check. Report it and stop for that screen.
2. **Reach the states.** Render each state that has a frame the way the app allows: a fixture, a seed, a query flag, a test route. A state that cannot be reached is reported as "not checked", never as passed. With more than one theme, render each one too, the way the app sets it (a cookie, a query flag). The same applies to a theme that cannot be reached.
3. **Compare with the Ready frame on meaning, not pixels:**
   - structure: the same sections, in the same order, with the same hierarchy
   - tokens: colours, type and spacing are `DESIGN.md`'s values (`scripts/contrast.mjs` for any pair that looks off)
   - copy: the frame's words, not placeholders or new ones
   - states: each frame state exists and says the same thing
   A difference from the frame is a finding, hard when it breaks a hard rule or changes structure or copy. The rules' glue line holds: a mismatch with the frame is a bug.
4. **Check the rules** on the build shots, in the order above.
5. **Fix pass.** Hard findings get one fresh fix pass (a new agent or a clean context, with the findings as its brief), then one re-check.
6. **PR evidence.** Matt's `pr` writes the body. Put the shots in its Before/After: the Ready frame beside the build at each width. Then the findings table, with what remains open after the re-check.

## Do not

- Redesign, or suggest a colour, face or component `DESIGN.md` does not have.
- Pass a state you could not see, or a screen whose shot landed on another page.
- Edit `DESIGN.md` or the Figma file. Fixes are the caller's.
- Compare pixels. Two renders of the same design differ by antialiasing and fonts. Meaning is what is checked.
