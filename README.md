# Long Beard

A drawing belongs here. He has not sat for it yet.

He has been writing software longer than the ticket in front of you. He keeps a short kit of ways of working, and he drops one the day it stops earning its place.

Long Beard is that kit. Drop it into a project and the agents you already use — Cursor, Claude Code, and the rest — get a short note and a few skills that push them toward small, correct, well-designed work. Two commands: `init`, then later `update`.

It is not an agent runtime. It is not a marketplace. It does not replace Cursor or Claude commands. It writes one block in `AGENTS.md`. The skills stay in their authors' repositories. Long Beard writes one skill, `design-md`.

What it installs lives in [`beard.json`](beard.json). That catalog can grow when a new kind of help earns a place. Until then, every entry is a skill.

## Install

In the project:

```bash
npm install --save-dev github:jonanderdev/longbeard
npx longbeard init
```

`npm` downloads this repository. `init` reads [`beard.json`](beard.json), installs the skills in that catalog for Cursor and Claude Code, writes a short block in `AGENTS.md`, and records the install in `beard-lock.json`. It prints the files it will write. Pass `--yes` to skip the confirmation.

A skill already present for an agent is left there. A skill present for Cursor and missing for Claude is installed for Claude only. Cursor, Codex, Copilot, and Gemini share `.agents/skills` in a project, so one copy covers those four.

The product is Long Beard. The GitHub repo is `jonanderdev/longbeard`. The npm package is `@jonanderdev/longbeard`. The command is `longbeard`. Do not run `npx longbeard` until this package is in `node_modules`. After it is on the registry, `npm install --save-dev @jonanderdev/longbeard` is the same install.

Until this is published, the one-shot form is:

```bash
npx --yes --package github:jonanderdev/longbeard longbeard init
```

Add `--global` to install for every project on this machine. That writes skills into your home directory, asks first, and keeps a copy of the note in `~/.longbeard/AGENTS.md`. Add `--all` for optional skills. Add `--agent codex` (repeatable) to also install for that tool.

## Update

```bash
npm update @jonanderdev/longbeard
npx longbeard update
```

That installs anything new from `beard.json`, refreshes only skills listed in `beard-lock.json` through the Skills CLI, and rewrites the `AGENTS.md` block to match what this project actually uses. Skills you installed some other way stay as they are. Skills this command installed, then you edited, stay as they are unless you pass `--force`.

## The catalog

`beard.json` is the catalog. Each skill names who wrote it, the license, where it lives, and when to open it.

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

One job per entry. A stack-specific skill (React, Postgres, and so on) belongs in the project that uses that stack.

## Change the shared catalog

Edit `beard.json` in this repository, commit, and push. Projects pick it up on `update`.

From a clone of this repository:

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
npx longbeard remove their-skill
```

That writes `beard.json` and does not install anything.

## One project

After Long Beard is installed in a project:

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
npx longbeard remove their-skill
npx longbeard remove ponytail-audit
```

`add` writes `beard.local.json` and installs that skill there. `remove` of an extra skill deletes it from that file and, if this command installed it, uninstalls it. `remove` of a shared skill omits it in this project only, uninstalls it if this command installed it, and rewrites the `AGENTS.md` block without it.

`npx longbeard list` prints the shared catalog, then anything added or omitted in the project you are in.
