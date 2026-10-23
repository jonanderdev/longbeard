<div align="center">
  <img src="logo.png" alt="Long Beard" width="350">
  <h1>Long Beard</h1>
  <p><strong>Designs like an Art director. Codes like a senior.</strong></p>
</div>

You show him a ticket. He has been shipping longer than the ticket has existed.  
He keeps a short kit, and he drops a piece the day it stops earning its place.

Long Beard is a starting point for the agents you already use — Cursor, Claude Code, and the rest.  
One block in `AGENTS.md`, and a short list of skills, so the code stays small and the page is actually designed.  
Two commands: `init`, then later `update`.

It is not an agent runtime.  
It is not a marketplace.  
It does not replace the commands you already use, or the skills you add yourself.   
It is a base. You keep going from here.

## The kit

Two of these are written here, in [`skills/`](skills/). `init` copies them from this package. The others are installed from the people who wrote them, and `update` pulls a fresh copy of those.

Writing stays small, and a risky change is named before it is built. A page follows a `DESIGN.md` or a Figma file when one exists. With neither, hunt writes the reference board and taste designs the page, with real pictures, and checks it in a browser. Asking to hunt references still works after a direction or a design exists. That pass is its own suggestion set and does not replace the board. The board does not replace that set either. A loading search and the no-look board stay side by side. Before it looks, it asks once for a specific style and any requirements. For one piece, such as a loading state, it also offers a few search ideas and waits.

<table>
  <thead>
    <tr>
      <th>Group</th>
      <th>Skill</th>
      <th>What it is for</th>
      <th>Author</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Plan</td>
      <td><a href="https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me">grill-me</a></td>
      <td>Relentless interview until a plan or design has no open branches. Includes grilling</td>
      <td>Matt Pocock</td>
    </tr>
    <tr>
      <td><a href="https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff">handoff</a></td>
      <td>Compacts the conversation into a handoff document for another agent or session</td>
      <td>Matt Pocock</td>
    </tr>
    <tr>
      <td rowspan="7">Design</td>
      <td><a href="skills/design-md/SKILL.md">design-md</a></td>
      <td>The installed project's <code>DESIGN.md</code> wins. With no file and no Figma, a new page goes to hunt instead of an invented look. A brand file is written only when they ask</td>
      <td>Long Beard</td>
    </tr>
    <tr>
      <td><a href="https://github.com/figma/mcp-server-guide/tree/main/skills/figma-design-to-code">figma-design-to-code</a></td>
      <td>Turns a Figma file into code in the project's stack, reusing components that already exist. Needs the Figma connection</td>
      <td>Figma</td>
    </tr>
    <tr>
      <td><a href="skills/design-reference-hunt/SKILL.md">design-reference-hunt</a></td>
      <td>When there is no design direction, searches live sites and galleries — Awwwards, MaxiBestOf, Recent, Dribbble, and others — and writes a board of the same size. It opens more candidates across those galleries before it keeps. Before looking, it asks for a specific style and any requirements. A later request — a view, a loading state, new ideas, a double-check — writes a separate suggestion set; a piece also gets a few search ideas first. That set leaves the board in place</td>
      <td>Long Beard</td>
    </tr>
    <tr>
      <td><a href="https://github.com/Leonxlnx/taste-skill">design-taste-frontend</a></td>
      <td>Designs websites and app screens, with real pictures, and checks them in a browser. An existing direction wins over a look it would invent</td>
      <td>Leonxlnx</td>
    </tr>
    <tr>
      <td><a href="https://github.com/emilkowalski/skills/tree/main/skills/animate">animate</a></td>
      <td>Builds one control or transition they asked to animate. A page already being designed keeps that skill’s motion</td>
      <td>emilkowalski</td>
    </tr>
    <tr>
      <td><a href="https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines">web-design-guidelines</a></td>
      <td>Reviews the UI against interface and accessibility rules, when you ask</td>
      <td>Vercel</td>
    </tr>
    <tr>
      <td><a href="https://github.com/juliobsz/skills/tree/main/jury">jury</a></td>
      <td>Scores a site from screenshots and measurements when you ask to jury, score, judge, or roast the design. Does not redesign; fixes stay on the board, DESIGN.md, or Figma</td>
      <td>juliobsz</td>
    </tr>
    <tr>
      <td rowspan="3">Code</td>
      <td><a href="https://github.com/joetawil7/first-pass/tree/main/skills/premortem">premortem</a></td>
      <td>Before writing, finds where the change will break by checking the real code</td>
      <td>GeorgeT</td>
    </tr>
    <tr>
      <td><a href="https://github.com/DietrichGebert/ponytail">ponytail</a></td>
      <td>The smallest change that finishes the job, and a reply you can read once. Includes ponytail-review, ponytail-audit, and ponytail-debt</td>
      <td>DietrichGebert</td>
    </tr>
    <tr>
      <td><a href="https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs">diagnosing-bugs</a></td>
      <td>Hard bugs and performance regressions: build a tight feedback loop first, then localize, reduce, fix, and guard</td>
      <td>Matt Pocock</td>
    </tr>
    <tr>
      <td rowspan="2">Optional</td>
      <td><a href="https://github.com/Leonxlnx/imagegen-skills/tree/main/skills/image-to-code">image-to-code</a></td>
      <td>With <code>--all</code>. Generates design images, then builds the page to match them</td>
      <td>Leonxlnx</td>
    </tr>
    <tr>
      <td><a href="https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit">security-audit</a></td>
      <td>With <code>--all</code>. Reviews a trust boundary when you ask. The full audit runs only when you ask for an audit or a pen-test</td>
      <td>Cloudflare</td>
    </tr>
  </tbody>
</table>

A skill for one stack belongs in the project that uses that stack. The list `init` installs is [`beard.json`](beard.json). A skill written here stays in this repository. Do not copy `beard.json` into your project. That would fork the kit.

## Install

In a project:

```bash
npm install --save-dev @jonandev/longbeard
npx longbeard init
```

`init` installs the list, writes the `AGENTS.md` block, and records it in `beard-lock.json`. In a terminal it asks which agents. When it cannot ask, it installs for Cursor and Claude Code. `--yes` skips the question. `--agent cursor` sets them (repeat it to add another). `--global` installs for every project on this machine. `--all` includes the optional skills.

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
