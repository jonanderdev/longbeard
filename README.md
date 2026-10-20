<div align="center">
  <img src="logo.png" alt="Long Beard" width="280">
  <h1>Long Beard</h1>
  <p><strong>Designs like an Art director. Codes like a senior.</strong></p>
</div>

He has been writing software longer than the ticket in front of you. He keeps a short kit of ways of working, and he drops one the day it stops earning its place.

Long Beard is that kit. Drop it into a project and the agents you already use — Cursor, Claude Code, and the rest — get a short note and a few skills that push them toward small, correct, well-designed work. Two commands: `init`, then later `update`.

It is not an agent runtime. It is not a marketplace. It does not replace Cursor or Claude commands. It writes one block in `AGENTS.md`. The skills stay in their authors' repositories.

## Install

In a project, from GitHub:

```bash
npm install --save-dev github:jonanderdev/longbeard
npx longbeard init
```

`npx` runs this project's `longbeard`. `init` installs the catalog, writes a short block in `AGENTS.md`, and records it in `beard-lock.json`. On a TTY it asks which agents. `--yes` skips that. `--agent cursor` (repeatable) sets them. `--global` installs the skills for every project on this machine. `--all` includes optional skills.

## Update

```bash
npm install --save-dev github:jonanderdev/longbeard
npx longbeard update
```

The first line pulls the latest kit. The second refreshes this project: anything new in `beard.json`, skills this command installed, and the `AGENTS.md` block. Skills you edited stay unless you pass `--force`.

## This project

You bring the kit. That list lives in this repository. Growing it is a change here, not a command in an app.

Skip one skill in a project. It stays in the kit; this repo just does not install it:

```bash
npx longbeard remove ponytail-audit
```

A skill that belongs only to this work — React, this team’s design system, not everyone — is an extra. Do not copy `beard.json` into the project. That would fork the kit.

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
```

That writes `beard.local.json`. Commit that file if clones of this repo should get the extra. `npx longbeard list` shows the kit, then what this project added or skipped.

## The catalog

What `init` installs lives in [`beard.json`](beard.json).

| Skill | Author | What it is for |
| --- | --- | --- |
| [ponytail](https://github.com/DietrichGebert/ponytail) | DietrichGebert, MIT | The smallest change that finishes the job |
| [ponytail-review](https://github.com/DietrichGebert/ponytail) | DietrichGebert, MIT | A diff, read like someone who gets paged |
| [ponytail-audit](https://github.com/DietrichGebert/ponytail) | DietrichGebert, MIT | That same pass, over the whole repo |
| [ponytail-debt](https://github.com/DietrichGebert/ponytail) | DietrichGebert, MIT | Shortcuts you meant to come back to |
| [premortem](https://github.com/joetawil7/first-pass) | GeorgeT, MIT | Before code, where this change can break |
| [design-taste-frontend](https://github.com/Leonxlnx/taste-skill) | Leonxlnx, MIT | A page that does not have a design yet |
| [figma-design-to-code](https://github.com/figma/mcp-server-guide) | Figma | A file a designer handed over. Needs the Figma connection |
| [web-design-guidelines](https://github.com/vercel-labs/agent-skills) | Vercel | Accessibility and interface rules, when you ask for a UI review |
| design-md | Long Beard, MIT | This project's own `DESIGN.md` |
| [image-to-code](https://github.com/Leonxlnx/imagegen-skills) | Leonxlnx, MIT | Optional. You already have a picture |

One job per entry. A stack-specific skill belongs in the project that uses that stack.

Building Long Beard itself: read [`PRODUCT.md`](PRODUCT.md) first.
