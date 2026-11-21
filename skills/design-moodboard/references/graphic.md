# Moodboard for a graphic

Read when the product brief's surface is a graphic. Everything in `SKILL.md` holds except what is said here. A piece counts as a screen wherever the skill says screen.

## The parts

The parts are the pieces of the set. For a single piece there is one part, the piece itself, and every keep has it. What differs between keeps is its `move`: the layout, the type, the picture treatment, the colour.

## What a keep is

- **A piece of the same kind is a reference, not the exception.** A poster is a `screen: yes` card for a poster brief, and so are a card for a card and a social post for a post. A page of a site, an app screen or a type specimen is `screen: no`: it lends colour, type or picture treatment, not an arrangement.
- **Their board:** the cards that are the piece's kind count as the screens in "is it enough". Where a card carries a `format` tag (their own, or from `design-families`), that tag says its kind: a `poster` card for a poster, a `social-post` card for a post. Only a card with no such tag is judged by eye. At least six are enough to compose from. With a set, each piece's format has at least one keep.
- **Keep the size in `move` when it matters:** "tall, headline across the top third, picture below".

## Search

- **Query the form.** The piece's kind and its subject's world: "gig poster, one colour", "wedding invitation, letterpress", not the product's name. The design brief's personality, apart from and never steer the pool as they do for a screen. Apart from is skipped for a personal piece.
- **Sources.** Read [sources.md](sources.md) and take the listings that hold print and graphic work. Leave out the ones that hold only sites and apps. Their lists were checked for screens, so check a listing's cards for the piece's kind before you rely on it, and say under `Sources:` what it gave.
- **The default drop list is for screens.** It drops seasonal cards, stickers and merch. When the piece is one of those, bring the word back with `--keep` so a card brief does not lose its cards. Pass `--drop` for what this brief rules out (a screen mockup).
- **Capture.** `capture.mjs` takes a page. A piece that is a picture (a poster image) is saved at full size as the keep, as in "Their board". A listing's thumbnail is never the keep.
- **Motion is not a part.** Motion graphics are out of scope: the design brief's `motion` is `none`, and nothing is searched for it.

## A piece of a set

Called for one more piece of a set (a story beside a poster): the same references serve it. Search again only for what the board does not show at that format.
