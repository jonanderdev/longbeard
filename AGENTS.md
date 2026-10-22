# Long Beard

The project's own code, conventions, and DESIGN.md win.

Load only what the task needs. Leave the rest unread.

A marketing site is the page a person lands on to understand or choose. An application is the tool they come back to. With no DESIGN.md and no Figma, both hunt. A site hunts live pages, and those outweigh Dribbble. An application hunts screen shots, and those outweigh award sites. With a direction already, hunt only the piece.

- Building or fixing: ponytail. The smallest change that finishes the job. Leave validation, error handling, security, and accessibility in place.
- A diff: ponytail-review. Read it like someone who gets paged.
- The whole repo: ponytail-audit. That same pass, over every file.
- Shortcuts you meant to come back to: ponytail-debt. Collect the limits you marked.
- Something is broken, throwing, failing, or slow — a hard bug: diagnosing-bugs. Build a tight feedback loop first, then localize, reduce, fix, and guard.
- A change that touches data, money, jobs, or what a person sees: premortem. Name where it can break before you write. A small change gets a short answer.
- They asked to grill a plan or design, or the ask is underspecified: grill-me. Interview until every branch of the design tree is resolved. Uses grilling.
- Stress-testing a plan, decision, or idea: grilling. The interview primitive behind grill-me. Relentless questions until branches are closed.
- A page with no official look (no DESIGN.md, no Figma, no board), or they asked to hunt references: design-reference-hunt. Ask once for a Figma file. No direction: look widely, then keep, and write `.design/board.md`. Scroll and screenshot only the keeps. Another business lends a layout or a component only, not its type or its colours, and only if it still fits this topic. Ask once which of the closest cards should lead, then write the cards and a short Read this. Before looking, ask once for a specific style and any requirements. On a piece (a loading state, a control), also offer two or three search ideas, then look after they answer. A later hunt (a view, a control, new ideas, a double-check) is a suggestion set in `.design/hunts/<slug>/`. It does not replace the board, `.design/refs/`, DESIGN.md, or a Figma file, and the whole look does not replace `.design/hunts/`.
- A page with no design yet: design-taste-frontend. Do not deal this skill’s references, and do not run draw. No official look is hunt: wait for `.design/board.md`. Those cards are the references. Build from them. The control a card describes is the control. Do not add a filled button the card does not show. Inspect still.
- They asked to animate a control or a transition: animate. A page design-taste-frontend is building keeps that skill’s motion. Decide this one move, then build it.
- A Figma file or link: figma-design-to-code. A designer handed it over. Needs the Figma connection. Reuse this project's components.
- A UI review you asked for: web-design-guidelines. Accessibility and interface rules.
- They asked to jury, score, judge, or roast the design (or a live URL / local build): jury. Blind evidence scorecard. Do not redesign. Fixes stay on the board, DESIGN.md, or Figma. Do not run after every Taste build unless they asked.
- They asked to hand off to another agent or session: handoff. Compact the conversation into a handoff document another agent can pick up.
- The look of this project: design-md. Follow DESIGN.md when it exists. A missing file plus “design this page” is hunt, not a question.

A normal change can be ponytail and a short premortem. That is still a small set.

Write so a person can use the reply in one read. End with what you did not check.
