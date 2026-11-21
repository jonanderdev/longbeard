# Long Beard

The project's own code, conventions, and DESIGN.md win. Load only what the task needs.

| Stage | Starts when | Skills | Writes |
|---|---|---|---|
| Idea | No docs/brief.md, or the product changes | idea | docs/brief.md |
| Design | A site, app or graphic brief, no DESIGN.md | design → figma-generate-library → figma-generate-design | docs/design/, DESIGN.md, Ready Figma frames |
| Architecture | No GLOSSARY.md, or new stack | grill-with-docs → framework-skills | GLOSSARY.md, ADRs |
| Plan | A flow or feature | setup-matt-pocock-skills → to-spec → to-tickets | specs, tickets |
| Build | Tickets | implement-spec → design-check → pr | one PR per spec |

Each stage offers the next; start it on yes. A skill you can't load: they type /<name>. No UI: skip Design. A graphic ends at Figma. A feature with a brief: grill-with-docs for new terms, else grilling, then Plan.

UI tickets link their Ready Figma frame. UI work follows DESIGN.md and that frame; a mismatch is a bug.

- A hard bug: diagnosing-bugs
- Test-first, when asked: tdd
- Handing off, when asked: handoff
- Before any use_figma call: figma-use
- A Figma link to build: figma-design-to-code

Add-ons, offered once when needed (`npx longbeard update --skill <name>`): animate (motion), jury (scored review), web-design-guidelines, security-audit.

Write so a person can use the reply in one read. End with what you did not check.
