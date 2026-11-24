# Long Beard

A pipeline for the coding agents you already use: it takes an idea to a design you approved, then to reviewed pull requests, for people who care how their product looks.

## Problem
An agent jumps from one prompt to code. The look is an average of what it has seen, and the decisions stay in the chat and get lost. The result is generic, and hard to keep building on.

## For
An engineer-designer who ships products with agents and wants work worth delivering. Today they prompt an agent straight to a page, or collect skills by hand. Later: anyone who designs, or cares how their product looks, and will give it some time.

## Flows
1. Start from an idea: install in an empty folder, say what to make, and have a one-page brief that was grilled and agreed.
2. Choose a look: pick references and say what is liked in each, choose from rendered screens, and leave with `DESIGN.md` and Figma frames marked Ready. A poster or social post ends at an exported frame.
3. Build a flow: turn it into a spec, then tickets, then one pull request checked against its Ready frames.
4. Catch up an existing project: the agent drafts the brief from what is there, asks only about the gaps, and skips the stages already done.
5. Update the kit: new skills arrive, dropped ones go, and edited ones stay.

## Key screens
- None.

## Surface
no UI. An installer and a set of agent skills. The pages a person clicks (the picker, the sheets) are steps inside a skill.

## V1 and later
- v1: all five flows, already shipped.
- later: a faster direction round; a taste library (the references' ideas in words, with no sources).

## Constraints
- Works with several agents, and on projects that join partway.
- Every stage waits for the person's yes. Steps are never cut to remove their choices.
- Each stage writes a file the next one reads; nothing depends on chat history.
- The installed router block stays under 200 words before add-ons.
- A UI project or a graphic needs Figma.
- Nothing committed names a reference, its author or its link.
- Other people's skills stay with their authors.

## Position
- against: prompting an agent straight to a page; a hand-collected folder of skills
- remembered for: you pick real references and say why you like each, and the agent rebuilds them with your content and adds nothing that is not on your board
- personality: wry, patient, exacting. Says: "It asks before it draws, and it draws before it codes." Never: "One prompt, a stunning page."

## Identity nouns
Beard, moodboard, reference, frame, brief, ticket, pull request.

## Out of scope
- An agent runtime.
- A marketplace of skills.
- A finished page from one prompt.
- Replacing the agent the person uses, or its commands.
- Giving an AI taste, or picking for the person.
