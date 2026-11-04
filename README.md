<div align="center">
  <img src="logo.png" alt="Long Beard" width="350">
  <h1>Long Beard</h1>
  <p><strong>Designs like an Art director. Codes like a senior.</strong></p>
</div>

You show him a ticket. He has been shipping longer than the ticket has existed.  
He keeps a short kit, and he drops a piece the day it stops earning its place.

Long Beard is a pipeline for the agents you already use — Cursor, Claude Code, and the rest.  
You start with an idea in an empty folder. You end with reviewed pull requests built from a design you approved.  
One block in `AGENTS.md` tells the agent which stage it is in. Two commands: `init`, then later `update`.

It is not an agent runtime.  
It is not a marketplace.  
It does not replace the commands you already use, or the skills you add yourself.   
It is a base. You keep going from here.

## The pipeline

| Stage | What happens | You get |
|---|---|---|
| 1. Idea | The agent grills the idea in rounds, each question with its recommendation | `docs/brief.md`: one page, no tech choices |
| 2. Direction | Three questions about what you like, a small search, a moodboard you pick from | `design-exploration/<slug>/direction.md`: ideas and patterns, not colours |
| 3. Design | Two or three prototypes of the key screens; you pick and iterate | `DESIGN.md` on your yes, then the screens in Figma, checked and marked Ready |
| 4. Architecture | The stack and the words the product uses | `GLOSSARY.md`, decisions |
| 5. Plan | Each flow becomes a spec, each spec vertical-slice tickets | specs and tickets on GitHub Issues or local files |
| 6. Build | One agent per ticket, test-first, reviewed, then checked against its Figma frame | one pull request per spec; you merge |

Each stage writes a file the next one reads, so you can stop anywhere and pick up later, or join with a project that already has some of them. A CLI, API or library skips Direction and Design. A later feature runs the same loop, smaller. Figma is required for a project with a UI.

## The kit

Four skills are written here, in [`skills/`](skills/). `init` copies them from this package. The others are installed from the originals their authors publish, and `update` pulls a fresh copy of those.

| Skill | What it is for | Author |
|---|---|---|
| [idea](skills/idea/SKILL.md) | Grills an idea, or an existing repo, into `docs/brief.md` | Long Beard |
| [direction](skills/direction/SKILL.md) | Finds references from what you like and proposes a direction. Never picks colours or type | Long Beard |
| [design](skills/design/SKILL.md) | Prototypes the key screens, writes `DESIGN.md` on approval, builds the screens in Figma | Long Beard |
| [design-check](skills/design-check/SKILL.md) | Checks a Figma screen or a built one against the design rules and its Ready frame. Reports; does not redesign | Long Beard |
| [Matt Pocock's skills](https://github.com/mattpocock/skills) | Kit: every skill he publishes. Grilling, specs, tickets, test-first building, code review, pull requests, bug diagnosis, handoff | Matt Pocock |
| [figma-use](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-use), [figma-generate-library](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-library), [figma-generate-design](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-design) | How `design` writes tokens, components and screens in Figma | Figma |
| [figma-design-to-code](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-design-to-code) | Builds from a Figma file a designer handed over | Figma |

Add-ons are not installed by default. The agent offers one when it is needed; take it with `npx longbeard update --skill <name>`, or all of them with `--all`.

| Add-on | What it is for | Author |
|---|---|---|
| [animate](https://github.com/emilkowalski/skills/tree/main/skills/animate) | One control or transition you asked to animate | emilkowalski |
| [jury](https://github.com/juliobsz/skills/tree/main/jury) | Scores a live or local build when you ask. Does not redesign | juliobsz |
| [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Reviews UI and accessibility when you ask | Vercel |
| [security-audit](https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit) | Reviews a trust boundary when you ask | Cloudflare |
| [image-to-code](https://github.com/Leonxlnx/imagegen-skills/tree/main/skills/image-to-code) | Builds a page from a picture you have | Leonxlnx |

A kit is an author's whole flow, taken as they publish it: the skills in their plugin manifest, else every folder in their `skills/`. `update` installs a skill they add and removes one they retire, unless you edited it. Inside a kit's flow, its own steps win. To leave one kit skill out, `npx longbeard remove <name>`.

A skill for one stack belongs in the project that uses that stack. The list `init` installs is [`beard.json`](beard.json). A skill written here stays in this repository. Do not copy `beard.json` into your project. That would fork the kit.

`design-exploration/` holds other people's screenshots, so `direction` keeps it out of git. `DESIGN.md` is the file you publish, and it names ideas, not the references.

## Install

In a project:

```bash
npm install --save-dev @jonandev/longbeard
npx longbeard init
```

`init` installs the list, writes the `AGENTS.md` block, and records it in `beard-lock.json`. In a terminal it asks which agents. When it cannot ask, it installs for Cursor and Claude Code. `--yes` skips the question. `--agent cursor` sets them (repeat it to add another). `--global` installs for every project on this machine. `--all` includes every add-on; `--skill <name>` takes one.

## Update

```bash
npx longbeard update
```

That uses the Long Beard already installed. It adds skills that are new in that copy, rewrites the `AGENTS.md` block, and refreshes skills this command installed. Skills written by other people are refreshed from their repositories. The skills in this repository stay with the version you installed.  
A skill you edited stays, unless you pass `--force`. Skills you installed on your own are left alone.

To take a newer Long Beard, install it, then update:

```bash
npm install --save-dev @jonandev/longbeard@latest
npx longbeard update
```

`npx skills update` refreshes a skill file too. It does not add a skill that is new to this list, and it does not rewrite the note. For that, install the newer Long Beard, then run `npx longbeard update`.

## Skip or add

Skip one:

```bash
npx longbeard remove web-design-guidelines
```

Add one:

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
```

That writes `beard.local.json`. Commit it if clones of this repo should get the extra. `npx longbeard list` shows the kit, then what this project added or skipped.

## Releases

Each version has notes in [CHANGELOG.md](CHANGELOG.md). The same number is the git tag, with a `v` in front. `npx longbeard --version` prints the copy in this project. While the version is `0.x`, a new minor can change the kit.
