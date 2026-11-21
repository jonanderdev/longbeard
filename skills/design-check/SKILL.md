---
name: design-check
description: >
  Check a screen against the design rules and DESIGN.md, and report findings
  (rule, hard or soft, where, fix). Frame mode checks a Figma frame, called
  by design-figma after each screen. Build mode checks a built UI spec against its
  Ready frames, run after implement-spec, with evidence for the PR. Docs mode
  checks the committed design docs name no reference. Hard
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

**Hard blocks; soft is reported.** The caller gets one fresh pass to fix the hard findings, then one re-check. Hard findings that remain are listed as open. They never pass silently. The rules script keeps the count (`rounds.json` in `.longbeard/design/`, per screen): when it says "rounds used up", stop fixing and report what is open. A finding that is false is waived with a reason (`--waive <id> --reason "…"`, in `waivers.json`), one at a time. It is still listed as waived, never hidden, and a hard rule is never waived, only a wrong finding. When the person says to ship it as it is, record their words (`--ship "…"`) and report what is open.

## Order

1. **Idea** (rule 0): cover the logo. Is it still this product? And, with `docs/design/design-brief.md` open: could it be mistaken for the kind of product its `apart from` names (a soft finding at distance 3, hard at 4–5, none at 1–2, where fitting in was the ask), and does it look like its `never`, or its never word (soft)?
2. **Hard** checks, every section, then the site, app or graphics list from the brief's surface.
3. **Soft** checks, then the tells (rule 14).

Read `DESIGN.md` first: its tokens, components and decisions are what "follows the file" means. Its Accessibility line (or else the design brief's `accessibility`) sets the contrast level for every contrast check: AA is 4.5:1 and 3:1 large; AAA is 7:1 and 4.5:1 large (`scripts/contrast.mjs --level AAA`). For text on a rendered page, `scripts/screen-contrast.mjs "file://$PWD/<page>.html" --level AAA` reads every text where it sits, down the whole page up to `--max-height`. Its last line says how far it looked and how many texts it "did not read" (a colour it could not resolve, or a fill that is a picture clipped to the letters): neither is a pass, so check those by eye. Exit 1 is a contrast failure, 3 is a run that did not finish. Its Motion line, and the design brief's `motion` picks behind it, are checked too: motion beyond the picks (a trigger, a feel or a moment not picked, or more than the pick for how much), a pick not built, or any motion without a reduced-motion fallback, is a soft finding.

## Frame mode

Called by `design-figma` after it composes or changes a Figma screen. Input: the file key, the node IDs of the screen and its state frames, and the approved prototype shot of that screen when there is one.

1. Load `figma-use` for any `use_figma` call. Screenshot each frame (`get_screenshot`, `maxDimension` 1440 so text is readable). Read structure with `get_metadata` when spacing or alignment needs numbers.
2. Find the states: the frames next to the default, whatever they are called. Decide from what each frame shows whether it is the screen's empty, loading or error state, not from its name. A reachable state with no frame is a rule 8 hard finding. So is a "not needed" under Decisions in `DESIGN.md` when a person can reach that state after all.
3. Check tokens where the screenshot cannot tell: in one read-only `use_figma` call, list fills, gaps and text styles that are not bound to a variable or style. An unbound value is a rule 7 soft finding when a token exists for it. With more than one theme, an unbound colour is a rule 6 hard finding, because it will not change with the theme.
4. Check the themes, when `DESIGN.md` lists more than one. Themes built as separate colour sets or as a frame per theme, instead of modes on one collection, are a rule 6 hard finding. For each mode, set it on a temporary copy of the frame, screenshot the copy, delete it, and run the rules on that shot. If the shot does not change with the mode, report that theme as "not checked", never as passed.
5. Compare with the prototype shot, side by side. The frame must be faithful to what they approved. Anything lost or changed without their yes is a hard finding, under rule 0. Pixels do not count. No shot: say "not compared".
6. Return the findings. `design-figma` fixes the hard ones, runs this once more, then shows the screen. A frame with open hard findings is never marked Ready.

## Build mode

After `implement-spec` builds a UI spec. This mode belongs to the Build stage: when the router has none (a design-only install), say that it needs the build stage and offer frame mode or docs mode. Input: the running app's URL for each screen, and the Ready frames the tickets link. A screen with no Ready frame has nothing to compare with: report it as "not checked" and send it to `design-figma`.

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
   - stand-ins: nothing under Still to supply in `DESIGN.md` reaches the build as it stands (its picture, or its assumed price, hour, number or name). One that does is a hard finding under rule 0, with the screen and the item; it clears when they supply the real one or take the item off the list.
   A difference from the frame is a finding, hard when it breaks a hard rule or changes structure or copy. The rules' glue line holds: a mismatch with the frame is a bug.
4. **Check the rules** on the build shots, in the order above. Run the rules script on each screen and state at both widths, with `--app` when the surface is an app (the list's touch sizes), and `--cookie` as in step 1:
   ```
   node <skill>/scripts/rules.mjs <url> --screen <screen>
   ```
   It measures sideways scroll, target size, visible labels, a visible focus, placeholder copy and clipped text, and its rows go into the findings as they are. Its "not checked" lines stay "not checked". What only an eye can judge (idea, hierarchy, grouping, the tells) is still yours. Frame mode cannot use it: a Figma frame is not a page.
5. **Fix pass.** Hard findings get one fresh fix pass (a new agent or a clean context, with the findings as its brief), then one re-check. The script's round count is the limit. A run that could not open the page says what to do once, and the second time the screen is reported as "not checked" and the build goes on.
6. **PR evidence.** Matt's `pr` writes the body. Put the shots in its Before/After: the Ready frame beside the build at each width. Then the findings table, with what remains open after the re-check.

## Docs mode

On request, or when a design-* skill has written a doc. The design docs are committed and kept for good, so they stay clean.

- Read `DESIGN.md` and every file in `docs/design/`.
- **Hard:** a name of a site, brand, studio, designer or person taken from the references; a link to one; the site the stand-in pictures came from (their credits stay in `.longbeard/design/pictures/credits.tsv`, except a credit a licence requires, which appears in the product itself); a path into `.longbeard/` or `design-exploration/`, comments in a copied template included. The fix is the idea in plain words ("a quiet reading page", not whose).
- **Hard:** `design-identity.md`'s colours or faces differ from its `json identity` block, or `DESIGN.md`'s tokens differ from an identity that was not changed on purpose (a change is under Decisions with its date).
- **Hard:** `DESIGN.md`'s token block (the front matter) differs from its tables, or is missing: `node <skill>/scripts/tokens.mjs DESIGN.md --check` exits 1 and lists each key. The tables are the source, so the fix is to run it again without `--check`; a table that cannot be read (exit 2) is a finding too. The published format's own linter is not run here.
- The product's own name, the faces and colours it uses, and anything the brief or design brief records as theirs are not findings.

## Do not

- Redesign, or suggest a colour, face or component `DESIGN.md` does not have.
- Pass a state you could not see, or a screen whose shot landed on another page.
- Edit `DESIGN.md` or the Figma file. Fixes are the caller's.
- Compare pixels. Two renders of the same design differ by antialiasing and fonts. Meaning is what is checked.
