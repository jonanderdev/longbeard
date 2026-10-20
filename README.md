<div align="center">
  <img src="logo.png" alt="Long Beard" width="320">
  <h1>Long Beard</h1>
  <p><strong>Designs like an Art director. Codes like a senior.</strong></p>
</div>

You show him a ticket. He has been shipping longer than the ticket has existed. He keeps a short kit, and he drops a piece the day it stops earning its place.

Long Beard is a starting point for the agents you already use — Cursor, Claude Code, and the rest. One block in `AGENTS.md`, and a short list of skills, so the code stays small and the page is actually designed. Two commands: `init`, then later `update`.

It is not an agent runtime. It is not a marketplace. It does not replace the commands you already use, or the skills you add yourself. It is a base. You keep going from here.

## Install

In a project, from GitHub:

```bash
npm install --save-dev github:jonanderdev/longbeard
npx longbeard init
```

`init` installs the list, writes the `AGENTS.md` block, and records it in `beard-lock.json`. In a terminal it asks which agents. When it cannot ask, it installs for Cursor and Claude Code. `--yes` skips the question. `--agent cursor` sets them (repeat it to add another). `--global` installs for every project on this machine. `--all` includes the optional skill.

## Update

```bash
npm install --save-dev github:jonanderdev/longbeard
npx longbeard update
```

The first line pulls the latest Long Beard. The second brings this project up to that list: new skills, a fresh copy of the ones this command installed, and the `AGENTS.md` block. A skill you edited stays, unless you pass `--force`. Skills you installed on your own are left alone.

`npx skills update` refreshes a skill file too. It does not add a skill that is new to this list, and it does not rewrite the note. For that, install the latest Long Beard and run `longbeard update`.

## This project

The kit lives here. Growing it is a change in this repository. A project can skip a piece, or add one that belongs only to that work. Do not copy `beard.json` into the project. That would fork the kit.

Skip one:

```bash
npx longbeard remove web-design-guidelines
```

Add one:

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
```

That writes `beard.local.json`. Commit it if clones of this repo should get the extra. `npx longbeard list` shows the kit, then what this project added or skipped.

## The kit

Two of these are ours. The others are installed from the people who wrote them, and `longbeard update` pulls a fresh copy.

| Skill | What it is for | Author |
| --- | --- | --- |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | The smallest change that finishes the job | DietrichGebert |
| [Premortem](https://github.com/joetawil7/first-pass) | Before the code, where this change can break | GeorgeT |
| Reference hunt | No official look yet. He goes and finds one | Long Beard |
| [Taste](https://github.com/Leonxlnx/taste-skill) | Builds the page from that look | Leonxlnx |
| [Figma](https://github.com/figma/mcp-server-guide) | A file a designer handed over | Figma |
| [Interface guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | When you ask for a UI review | Vercel |
| `DESIGN.md` | This project's own look | Long Beard |
| [A picture](https://github.com/Leonxlnx/imagegen-skills) | Optional. You already have one | Leonxlnx |

A skill for one stack belongs in the project that uses that stack. The list `init` installs is [`beard.json`](beard.json).

Building Long Beard itself: read [`PRODUCT.md`](PRODUCT.md) first.
