# The subject's pictures and colours

Read by `design-direction`, step 0 and step 2.

## Pictures

Before the grid: three or four pictures of what the product is about (the bakery's bread and its bench, the climbing gym's wall, the app's real data on a desk). Not other designs, which is the moodboard's job: the product's own world. Every screen from here on uses them, so nothing is judged on grey boxes or on another product's pictures, and their colours join the deal (step 2).

- **Theirs first.** The design brief says whether they have pictures. If they do, ask for three or four, and save them to `.longbeard/design/pictures/`.
- **None yet:** find stand-ins, a few, never a bulk search. Search the subject, not a mood: the brief's identity nouns, one query per picture you need.

  ```
  node <skill>/scripts/pictures.mjs "sourdough loaf" --out .longbeard/design/pictures --count 2
  node <skill>/scripts/pictures.mjs "flour on a wooden bench" --out .longbeard/design/pictures --count 2 --orientation landscape
  ```

  It keeps only clearly licensed pictures (CC0, public domain, CC BY, CC BY-SA) large enough for a screen, and writes `credits.tsv` beside them. Open each (a contact sheet); drop one that is off-subject and search again with a more concrete query ("roasted coffee beans", not "coffee"). Commons leans to museum and archive photos for some subjects (crafts come back as excavated shards and old engravings): after two queries that miss, ask them for two or three photos of their own, a phone is fine, or go on with fewer.
- **Of the kind the look uses.** When the moodboard is photographs, look for photographs; when it is illustration or renders, say that those are not searched, and use the closest photographs, cropped and toned as the moodboard does, until theirs exist.

Do not stop to ask: show them on a contact sheet (`contact-sheet.mjs .longbeard/design/pictures/credits.tsv --out <scratch>/pictures`) with the message in step 1, as stand-ins theirs replace.

## Colours

One or two grounds, and an accent when the subject has a second hue of its own, proposed from the subject pictures, so some screens wear the product's own colours. Never a colour sampled raw from a photo (that gives background greys and shadow browns): `subject-colours.mjs` reads the pictures' main colours, drops noise, highlights and shadows, finds the signature colour (the crust, the wall, the leaf), and tunes each to its role: an off-white or near-black that keeps the subject's hue, an accent with enough chroma, ink at 4.5:1, the accent at 3:1. Each colour says what it came from and how it was tuned.

```
node <skill>/scripts/subject-colours.mjs .longbeard/design/pictures --json
```

**Then look, and name every colour.** Open its sheet (`--sheet <scratch>/subject.html`, captured), which shows each proposed colour beside the pictures with the places it comes from lit up. Every colour must be something a person sees as the subject and can name: "the crust", "the flour", "the oven's black". A colour that lights up the backdrop, a cloth, a wall or a prop is not the subject's, even when it fills the photo: drop it (`--exclude "#hex"`) and run it again. The script already flags colours that sit mostly at the edges as background and never makes them the signature or the accent; the look is the check it cannot do. Write the name beside each colour wherever it is shown ("crust, lightened to carry white text").

Only then its `library` entries go in, `"from": ["subject"]`.
