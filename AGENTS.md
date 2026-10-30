# Long Beard

The project's own code, conventions, and DESIGN.md win.

Load only what the task needs. Leave the rest unread.

A marketing site is the page a person lands on to understand or choose. An application is the tool they come back to. Official look wins: DESIGN.md, then Figma, then the board. Hunt finds references and proposes an adaptation; it does not code the page. Open the moodboard before they pick, say what we take, change, and leave, then ask to write or update DESIGN.md as its own message — once more, first, if they move on without answering — only on yes. Code the page only when they asked to build. Direction-only stops after the next-step offer. A site hunts live pages; an application hunts screen shots. With a direction already, hunt only the piece.

- Building or fixing: ponytail. The smallest change that finishes the job. Leave validation, error handling, security, and accessibility in place.
- A diff: ponytail-review. Read it like someone who gets paged.
- The whole repo: ponytail-audit. That same pass, over every file.
- Shortcuts you meant to come back to: ponytail-debt. Collect the limits you marked.
- They asked to grill a plan or design, or the ask is underspecified: grill-me. Interview until every branch of the design tree is resolved. Uses grilling. A feature goes on to to-spec, then to-tickets.
- Stress-testing a plan, decision, or idea: grilling. The interview primitive behind grill-me. Relentless questions until branches are closed.
- Before to-spec or to-tickets in a repo with no tracker set up: setup-matt-pocock-skills. Once per repo. Picks where specs and tickets live: GitHub Issues when the repo is on GitHub, else local markdown. Writes its `## Agent skills` block outside the longbeard markers.
- A grilled feature to write down whole: to-spec. One spec on the tracker setup chose: problem, user stories, decisions, test seams, out of scope. No tracker set up yet: run setup-matt-pocock-skills first. A small feature can skip it and go to to-tickets.
- A spec, plan, or conversation to split into tickets: to-tickets. Vertical slices, each checkable on its own, with their blockers, on the tracker setup chose. No tracker set up yet: run setup-matt-pocock-skills first.
- Building one ticket, or a spec in one session: implement. Read the ticket from the tracker, build it with tdd at the seams the spec agreed, then code-review, then commit.
- Building every ticket of a spec: implement-spec. One integration branch. A fresh agent per ticket in its own worktree, each with tdd, started as its blockers finish. code-review at the end.
- They asked for TDD, test-first, or red-green-refactor: tdd. Red before green, one slice at a time, tests at seams you agreed. implement and implement-spec call it. Otherwise only on request; ponytail stays the default for building.
- Reviewing work built from a spec or ticket: code-review. Two axes, in parallel: this repo's standards, and the spec. A plain diff stays ponytail-review.
- Something is broken, throwing, failing, or slow — a hard bug: diagnosing-bugs. Build a tight feedback loop first, then localize, reduce, fix, and guard.
- A throwaway prototype of logic or state: prototype. A page or screen goes to design-taste-frontend.
- Deepening modules or the shape of the code: improve-codebase-architecture. Uses codebase-design and domain-modeling. Bugs, load, and bloat across the repo stay ponytail-audit.
- Designing a module's interface: codebase-design. The shared vocabulary for deep modules that improve-codebase-architecture uses.
- Naming the project's terms or recording a decision: domain-modeling. Keeps `GLOSSARY.md` and ADRs current, created only when a term or decision is settled. improve-codebase-architecture calls it.
- They asked to hand off to another agent or session: handoff. Compact the conversation into a handoff document another agent can pick up.
- They asked for a retro on a session: retro. Find what would have made the session easier: checks, navigation pointers, review rules, tool cost. Uses writing-for-agents. Suggests; you choose.
- Writing a skill, AGENTS.md, or CLAUDE.md: writing-for-agents. The style guide retro uses.
- A change that touches data, money, jobs, or what a person sees: premortem. Name where it can break before you write. A small change gets a short answer.
- No official look, or they asked to hunt / define direction / find references: design-reference-hunt. Does not code the page. Talk first, one round, then search small. Pick on `.design/moodboard.html`, say the adaptation, then ask to write or update `DESIGN.md` via design-md as its own message — once more, first, if they move on without answering — only on yes. Then offer the next step: prototype the gaps, hunt one, or stop. A later hunt for one piece writes `.design/hunts/<slug>/`. `.design/` is scratch, out of git.
- They asked to build, code, or prototype a page or screen: design-taste-frontend. With DESIGN.md it builds and checks; it does not art-direct: no draw, no dealt references, palette, or type. Else build from the `.design/board.md` cards. Run `inspect.mjs` (`--app` and its app-screen house rules for an app screen). Report a warning about something DESIGN.md decides as per DESIGN.md; contrast, focus, and tap-target failures still get fixed. Direction-only or hunt-only is not this skill. The control a card describes is the control; add no filled button it does not show.
- They asked to animate a control or a transition: animate. Read the Behaviour section of DESIGN.md first. A page design-taste-frontend is building keeps that skill’s motion. Decide this one move, then build it.
- A Figma file or link: figma-design-to-code. A designer handed it over. Needs the Figma connection. Reuse this project's components.
- A UI review you asked for: web-design-guidelines. Accessibility and interface rules.
- They asked to jury, score, judge, or roast the design (or a live URL / local build): jury. Blind evidence scorecard. Do not redesign. Fixes stay on the board, DESIGN.md, or Figma. Do not run after every build unless they asked.
- The look of this project, or they confirmed writing or updating DESIGN.md: design-md. Follow DESIGN.md when it exists. Write or update it only on confirm: from the hunt's adaptation, or from decisions approved on a rendered prototype, with reason, date, and contrast. Ideas, not sources: no reference names or `.design/` paths. Do not invent. Missing file plus design or define direction is hunt first.

A normal change can be ponytail and a short premortem. That is still a small set.

Write so a person can use the reply in one read. End with what you did not check.
