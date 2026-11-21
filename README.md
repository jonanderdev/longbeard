<div align="center">
  <img src="logo.png" alt="Long Beard" width="350">
  <h1>Long Beard</h1>
  <p><strong>Designs like an Art director. Codes like a Senior Engineer.</strong></p>
</div>

A beard like this takes years: moving logos two pixels left, reviewing pull requests at midnight.  
Your agent gets it on day one. It asks before it draws, and it draws before it codes.

Long Beard is a pipeline for the agents you already use: Cursor, Claude Code and the rest. Start with an idea in an empty folder; end with reviewed pull requests built from a design you approved. One block in `AGENTS.md` tells the agent which stage it is in.

It is not an agent runtime or a marketplace, and it does not turn one prompt into a finished page. It is a base you keep building on.

## The pipeline

| Stage | What happens | You get |
|---|---|---|
| 1. Idea | The agent grills the idea, each question with its recommendation | `docs/brief.md` |
| 2. Design | A short brief and your moodboard, then you pick a direction and variants of it. Type, colour and the other screens follow, each on your yes. [How it flows](assets/design-flow.png) | `DESIGN.md` and Figma screens marked Ready |
| 3. Architecture | The stack and the words the product uses, then skills for that stack, on your yes | `GLOSSARY.md`, decisions |
| 4. Plan | Each flow becomes a spec, each spec tickets | specs and tickets |
| 5. Build | One agent per ticket, test-first, reviewed, checked against its Figma frame | one pull request per spec |

Each stage writes a file the next one reads, so you can stop anywhere and come back, or join with a project that already has some of them. A CLI, API or library skips Design.

## How it designs

> A product's look should be chosen by the people who own it, and built with a designer's care.

**You are the designer.** An AI has no taste of its own, only an average of what once looked good. So Long Beard follows an art director's process:

- **You choose.** You pick references you love, say what you like in each, and choose the result.
- **The agent does the craft.** It rebuilds your references with your real content, combines what you took from them, and adds nothing that is not on your board.

**No board yet?** It searches award-winning and most-liked work, and you mark what you like. **Have a brand?** Your colours, faces and references go in first.

**Small steps.** Each design skill does one job and ends with a doc, so you run only what you need and a long run never drifts.

**You leave with** a Figma file that is yours (variables, styles, components, every key screen and its states), `DESIGN.md` with the reasons behind each choice, and code checked against those screens. A poster or social post goes through the same steps and ends at an exported Figma frame.

It takes some of your time, on purpose. If you want one prompt and a pretty result, another tool will serve you better.

## The kit

Long Beard's own skills live in [`skills/`](skills/). The others are installed from their authors' originals.

| Skill | What it is for | Author |
|---|---|---|
| [idea](skills/idea/SKILL.md) | Grills an idea, or an existing repo, into `docs/brief.md` | Long Beard |
| [design](skills/design/SKILL.md) | The way in: suggests which design skill to run next | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-brief](skills/design-brief/SKILL.md) | A studio's questions, in one message | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-moodboard](skills/design-moodboard/SKILL.md) | Your board, or a search you mark like or no | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-families](skills/design-families/SKILL.md) | Optional: sorts a big board into looks | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-direction](skills/design-direction/SKILL.md) | First screens from your references; you pick a direction and variants of it | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-identity](skills/design-identity/SKILL.md) | Type and colour, refined on the chosen screen | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-prototype](skills/design-prototype/SKILL.md) | The key screens and their states, then `DESIGN.md` | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-figma](skills/design-figma/SKILL.md) | Tokens, components and Ready screens in Figma | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-content](skills/design-content/SKILL.md) | Optional: copy and the picture list | Long Beard |
| &nbsp;&nbsp;&nbsp;↳ [design-wordmark](skills/design-wordmark/SKILL.md) | Optional: a mark made from your type | Long Beard |
| [design-check](skills/design-check/SKILL.md) | Checks a Figma or built screen against the rules and its Ready frame. Reports; never redesigns | Long Beard |
| [framework-skills](skills/framework-skills/SKILL.md) | Finds skills for your stack (the framework's own first, else the most installed), reads them, and installs the ones you say yes to | Long Beard |
| [Matt Pocock's skills](https://github.com/mattpocock/skills) | Grilling, specs, tickets, test-first building, review, pull requests, debugging, handoff | Matt Pocock |
| [figma-use](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-use), [figma-generate-library](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-library), [figma-generate-design](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-design) | How `design-figma` writes tokens, components and screens in Figma | Figma |
| [figma-design-to-code](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-design-to-code) | Builds from a Figma file a designer handed over | Figma |

Add-ons are your choice: `init` lets you tick them, and the agent offers one when it is needed. Take one later with `npx longbeard update --skill <name>`, or all with `--all`.

| Add-on | What it is for | Author |
|---|---|---|
| [animate](https://github.com/emilkowalski/skills/tree/main/skills/animate) | One control or transition you asked to animate | emilkowalski |
| [jury](https://github.com/juliobsz/skills/tree/main/jury) | Scores a live or local build when you ask. Does not redesign | juliobsz |
| [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Reviews UI and accessibility when you ask | Vercel |
| [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance/tree/main/skills/modern-web-guidance) | Current browser APIs instead of legacy patterns. Ticked at `init`; needs the network | Google Chrome |
| [security-audit](https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit) | Reviews a trust boundary when you ask | Cloudflare |

- **A kit** is an author's whole flow, as they publish it. `update` follows what they add and retire, unless you edited a skill.
- **The list** `init` installs is [`beard.json`](beard.json). Don't copy it into your project: that forks the kit. A skill for one stack belongs in the project that uses it.
- **Design files:** `docs/design/` and `DESIGN.md` are committed and describe the style, never its references. `.longbeard/design/` is the agents' scratch folder, out of git.

## You need

- Node 18+ for the installer; Node 22+ and Chrome for the design skills' screenshots.
- The Figma connection in your agent, for a project with a UI.

## Install

In a project:

```bash
npm install --save-dev @jonandev/longbeard
npx longbeard init
```

`init` installs the skills, writes the `AGENTS.md` block and records it all in `beard-lock.json`. It asks which agents and which add-ons; without a terminal, or with `--yes`, it takes Cursor, Claude Code and the ticked add-ons.

- `--agent cursor` picks an agent (repeat to add more); `--global` installs for every project on this machine.
- `--all` takes every add-on, `--skill <name>` one, `--no-addons` none.

### Design only

```bash
npx longbeard init --design
```

Only the Idea and Design stages: `idea`, the design skills, `design-check` and the Figma skills. It ends in Figma and `DESIGN.md`. Take the rest later with `npx longbeard update --full`; your design files stay as they are.

## Start

Open your agent in the project and say what you want to make:

> I want to build a shared shopping list for flatmates.

It sees there is no brief and starts at Idea. Each stage offers the next; nothing moves on without your yes. A few steps start only when you type them (`/grill-with-docs`, `/to-spec`), and the agent tells you when.

### A project you already have

> Catch this project up to the pipeline. Draft the brief from what is here and skip the stages it already has.

The agent drafts `docs/brief.md` from your docs and code and asks only about the gaps. A stage whose file exists is done. Then type `/grill-with-docs`. Existing Figma screens are marked Ready one at a time, as features touch them.

## Update

```bash
npx longbeard update
```

It adds new skills, removes dropped ones, rewrites the `AGENTS.md` block and refreshes the rest. A skill you edited stays unless you pass `--force`; skills you installed yourself are left alone.

For a newer Long Beard, install it first:

```bash
npm install --save-dev @jonandev/longbeard@latest
npx longbeard update
```

## Skip or add

Skip one:

```bash
npx longbeard remove wayfinder
```

Add one:

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
```

That writes `beard.local.json`; commit it so clones get it too. `npx longbeard list` shows the kit and your changes.

## Releases

Notes for each version are in [CHANGELOG.md](CHANGELOG.md), tagged `v<version>`. While it is `0.x`, a new minor can change the kit.
