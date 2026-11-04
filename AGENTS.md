# Long Beard

The project's own code, conventions, and DESIGN.md win. Load only what the task needs.

| Stage | Starts when | Skills | Writes |
|---|---|---|---|
| Idea | No docs/brief.md, or the product changes | idea | docs/brief.md |
| Direction | A brief with UI | direction | design-exploration/<slug>/direction.md |
| Design | A direction, no DESIGN.md | design → figma-generate-library → figma-generate-design | DESIGN.md, Ready Figma frames |
| Architecture | No GLOSSARY.md yet | grill-with-docs | GLOSSARY.md, ADRs |
| Plan | A flow or feature to build | setup-matt-pocock-skills → to-spec → to-tickets | specs, tickets |
| Build | Tickets | implement-spec → design-check → pr | one PR per spec |

Each stage offers the next; start it on yes. No UI: skip Direction and Design. A feature with a brief: grill-with-docs for new terms, else grilling, then Plan.

UI tickets link their Ready Figma frame. UI work follows DESIGN.md and that frame. A mismatch with the frame is a bug.

- A hard bug: diagnosing-bugs
- Test-first, when asked: tdd
- Handing off, when asked: handoff
- Before any use_figma call: figma-use
- A Figma link to build: figma-design-to-code

Add-ons, offered once when needed (`npx longbeard update --skill <name>`): animate (motion), jury (scored review), web-design-guidelines, security-audit, image-to-code (from a picture). At Architecture, a framework skill.

Write so a person can use the reply in one read. End with what you did not check.
