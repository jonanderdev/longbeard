<div align="center">
  <img src="logo.png" alt="Long Beard" width="350">
  <h1>Long Beard</h1>
  <p><strong>Designs like an Art director. Codes like a Senior Engineer.</strong></p>
</div>

A beard like this takes years: moving logos two pixels left, reviewing pull requests at midnight.  
Your agent gets it on day one. It asks before it draws, and it draws before it codes.

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
| 2. Design | A family of small design skills, each one job, each writing one doc. `design` reads your project and suggests the next one. Design brief: a studio's questions. Moodboard: your board, or a search you mark like or no. Direction: eight first screens dealt from your references, each taking its layout, type and colours from different ones, so you choose between real directions; a light touch-up fixes contrast and anything missing, never the composition. Identity: the chosen screen's type and colours refined on it, ending in the identity board. Screens: the rest, prototyped and approved. Then Figma. [How it flows](assets/design-flow.png) | `docs/design/`: the design brief, moodboard, direction, identity board. `DESIGN.md` on your yes. Figma screens, checked and marked Ready |
| 3. Architecture | The stack and the words the product uses | `GLOSSARY.md`, decisions |
| 4. Plan | Each flow becomes a spec, each spec vertical-slice tickets | specs and tickets on GitHub Issues or local files |
| 5. Build | One agent per ticket, test-first, reviewed, then checked against its Figma frame | one pull request per spec; you merge |

### Why it designs this way

A product's look should be chosen by the people who own it, and built with a designer's care.  
**You are the designer.** Long Beard brings no taste of its own, because an AI has none: what it calls taste is an average of what once looked good, or the taste of whoever wrote the prompt. So it works like an art director's process instead. You pick real designs you love, say what you like in each, and make the calls a designer makes: which references lead, what to take from each, which result is yours. The agent does the craft: it rebuilds your references faithfully with your real content, combines what you took from them, checks that it still works, and adds nothing that is not on your board. It takes some effort from you, on purpose. If you want one prompt and a pretty result, another skill will serve you better.  
Each design skill does one job, so you run only what you need: skip the moodboard if you have one, sort a big board into families only when it is big, plan copy and pictures only when you want to. Short steps, few questions, a doc at the end of each, so a long run never drifts.

Each stage writes a file the next one reads, so you can stop anywhere and pick up later, or join with a project that already has some of them. A CLI, API or library skips Design. A later feature runs the same loop, smaller. Figma is required for a project with a UI.

## The kit

Long Beard's own skills are written here, in [`skills/`](skills/). `init` copies them from this package. The others are installed from the originals their authors publish, and `update` pulls a fresh copy of those.

| Skill | What it is for | Author |
|---|---|---|
| [idea](skills/idea/SKILL.md) | Grills an idea, or an existing repo, into `docs/brief.md` | Long Beard |
| [design](skills/design/SKILL.md) | The way in: reads the project and suggests the next design skill | Long Beard |
| [design-brief](skills/design-brief/SKILL.md) | A designer's questions before looking: feel, never, apart from, what is fixed | Long Beard |
| [design-moodboard](skills/design-moodboard/SKILL.md) | Reads your board and fills its gaps, or finds references you mark like or no | Long Beard |
| [design-families](skills/design-families/SKILL.md) | Optional: sorts a big board into looks, in Figma too, so choosing is easy | Long Beard |
| [design-direction](skills/design-direction/SKILL.md) | A few pictures of your subject, then eight first screens dealt from your references, type and colours included; you pick; a light touch-up | Long Beard |
| [design-identity](skills/design-identity/SKILL.md) | The chosen screen's type and colours, refined on it from rendered options; the identity board | Long Beard |
| [design-prototype](skills/design-prototype/SKILL.md) | The key screens and their states; `DESIGN.md` on approval | Long Beard |
| [design-figma](skills/design-figma/SKILL.md) | Tokens, the identity board, components and Ready screens in Figma | Long Beard |
| [design-content](skills/design-content/SKILL.md) | Optional: what each screen says and shows, and the full picture list | Long Beard |
| [design-wordmark](skills/design-wordmark/SKILL.md) | Optional, after the identity: a mark made from your type | Long Beard |
| [design-check](skills/design-check/SKILL.md) | Checks a Figma screen or a built one against the design rules and its Ready frame, and that the design docs name no reference. Reports; does not redesign | Long Beard |
| [Matt Pocock's skills](https://github.com/mattpocock/skills) | Kit: every skill he publishes. Grilling, specs, tickets, test-first building, code review, pull requests, bug diagnosis, handoff | Matt Pocock |
| [figma-use](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-use), [figma-generate-library](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-library), [figma-generate-design](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-generate-design) | How `design-figma` writes tokens, components and screens in Figma | Figma |
| [figma-design-to-code](https://github.com/figma/mcp-server-guide/tree/main/skills/figma-design-to-code) | Builds from a Figma file a designer handed over | Figma |

Add-ons are your choice. In a terminal, `init` lists them and you tick the ones you want; `modern-web-guidance` starts ticked, the rest start empty. Later the agent offers one when it is needed; take it with `npx longbeard update --skill <name>`, or all of them with `--all`.

| Add-on | What it is for | Author |
|---|---|---|
| [animate](https://github.com/emilkowalski/skills/tree/main/skills/animate) | One control or transition you asked to animate | emilkowalski |
| [jury](https://github.com/juliobsz/skills/tree/main/jury) | Scores a live or local build when you ask. Does not redesign | juliobsz |
| [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Reviews UI and accessibility when you ask | Vercel |
| [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance/tree/main/skills/modern-web-guidance) | Current browser APIs instead of legacy patterns when writing HTML, CSS or client-side JS. Ticked at `init`. It looks each guide up with `npx`, so it needs the network | Google Chrome |
| [security-audit](https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit) | Reviews a trust boundary when you ask | Cloudflare |
| [image-to-code](https://github.com/Leonxlnx/imagegen-skills/tree/main/skills/image-to-code) | Builds a page from a picture you have | Leonxlnx |

A kit is an author's whole flow, taken as they publish it: the skills in their plugin manifest, else every folder in their `skills/`. `update` installs a skill they add and removes one they retire, unless you edited it. Inside a kit's flow, its own steps win. To leave one kit skill out, `npx longbeard remove <name>`.

A skill for one stack belongs in the project that uses that stack. The list `init` installs is [`beard.json`](beard.json). A skill written here stays in this repository. Do not copy `beard.json` into your project. That would fork the kit.

`docs/design/` holds the design docs, committed and kept up to date: they describe the style, never the references it came from. `.longbeard/design/` is the agents' working folder (captures, pickers, grids, prototypes), out of git; you never need to open it. `DESIGN.md` is the official result.

## You need

- Node 22 or newer, and Chrome, for the screenshots the design skills and `design-check` take.
- The Figma connection in your agent, for a project with a UI.

## Install

In a project:

```bash
npm install --save-dev @jonandev/longbeard
npx longbeard init
```

`init` installs the list, writes the `AGENTS.md` block, and records it in `beard-lock.json`. In a terminal it asks which agents. When it cannot ask, it installs for Cursor and Claude Code. `--yes` skips the question. `--agent cursor` sets them (repeat it to add another). `--global` installs for every project on this machine. It then asks which add-ons. When it cannot ask, or with `--yes`, a first `init` takes the ticked ones. `--all` includes every add-on, `--skill <name>` takes one, and `--no-addons` takes none; each skips the list. An add-on you turn down at `init` is not offered again; take it later with `npx longbeard update --skill <name>`.

## Start

Open your agent in the project and say what you want to make:

> I want to build a shared shopping list for flatmates.

It reads `AGENTS.md`, sees there is no brief, and starts at Idea. Each stage ends by offering the next, and nothing moves on without your yes. A few steps start only when you type them, such as `/grill-with-docs` and `/to-spec`. The agent tells you when.

### A project you already have

Ask for a brief:

> Catch this project up to the pipeline. Draft the brief from what is here and skip the stages it already has.

The agent drafts `docs/brief.md` from your documents and code, asks only about the gaps, and asks what happens to any document that now says the same thing. A stage whose file exists is done: with a `DESIGN.md`, it goes past Design.

Then type `/grill-with-docs`, and say what already names things in your project and where your decisions live, if that is not `docs/adr/`. Screens you already have in Figma are marked Ready one at a time, when a feature touches them.

## Update

```bash
npx longbeard update
```

That uses the Long Beard already installed. It adds skills that are new in that copy, removes ones the kit dropped, rewrites the `AGENTS.md` block, and refreshes skills this command installed. Skills written by other people are refreshed from their repositories. The skills in this repository stay with the version you installed.  
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
npx longbeard remove wayfinder
```

Add one:

```bash
npx longbeard add https://github.com/someone/skills --skill their-skill --author TheirName --why "One sentence."
```

That writes `beard.local.json`. Commit it if clones of this repo should get the extra. `npx longbeard list` shows the kit, then what this project added or skipped.

## Releases

Each version has notes in [CHANGELOG.md](CHANGELOG.md). The same number is the git tag, with a `v` in front. `npx longbeard --version` prints the copy in this project. While the version is `0.x`, a new minor can change the kit.
