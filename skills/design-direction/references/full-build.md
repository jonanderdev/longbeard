# The full build

Read by `design-direction` once they settle on one screen: the jobs that take a quick screen to a full one. It runs once in the step, on that screen only. The principles, the moves and the round's checks are in [grid.md](grid.md).

One agent that builds and judges defends its own choices, so the critic is a fresh agent with only what it needs. That is two agents in all: one critic, one fixer.

**1. Critique (one fresh agent, pictures only).** It gets: the base reference (cropped to its screen), the screen, `layout-diff.mjs`'s `side.png` and `overlay.png` for it (`--mirror` when the layout turned) and the lines its `diff.json` marks off, the translation's capture, 3× crops of every small device, rule, tight gap and edge beside the same crops of the source (made for it: it runs no scripts), each move's source picture, the moves in words, what they wrote to leave out, and the contrast report. No rules, no brief, no session; only what the product is, in one line. It answers:
- **Where is this screen less finished than its reference?** Every spot, small ones included (a gap, an edge, a size, a weight, a colour, a picture, text that cannot be read), each with the place in the reference that shows how it should be. The reference is the standard: what it does on purpose is never a fault.
- **What changed from the translation that no move names?**
- **In one line, what made the reference work, and does the screen keep it?**
- **Anything on the screen that no reference has, or that they wrote to leave out?**
- **What on this screen exists only because of this product?** Not its words or pictures but a thing: its ownable, a mark, a number, a form. An empty answer is a fault, listed like any other: a screen as right for another trade has borrowed and added nothing.

It lists; it never redesigns.

**2. Fix (one fresh agent), once.** It gets the critic's list, the screen's file and the same pictures, and changes only the spots listed, each toward what the reference does, with what the screen and its references already have; an empty answer to the last question is fixed with the ownable or a thing from the subject's card. The fix is a new version (`<n>-a.html`); the quick version stays theirs to take. Then capture, `layout-diff.mjs` and contrast again, and look at the two side by side yourself: a change that breaks something they liked is undone. No second critic.

A spot left is a known fault, said beside the screen, never hidden. A stand-in picture is never a spot: it is listed under what they still supply. When every spot the critic lists is small (within the 15% principle 2 keeps, shows only in a 3× crop and never at the screen's own size, and breaks nothing the reference does on purpose), skip the fix; an empty answer to the product question is never small.

Then the round's checks ([grid.md](grid.md)) on the new version: contrast and faults.
