# Direction for a graphic

Read when the product brief's surface is a graphic. Everything in `SKILL.md` and its references holds except what is said here. A piece counts as a screen wherever a skill says screen, and the eight screens are eight pieces.

## The size

The size is the format in `docs/brief.md`, never phone or desktop. The design brief has no `first seen on` line for a graphic.

- **On screen:** the pixels the format gives.
- **In print:** the paper's ratio, at a working width of 1200 px (A3 portrait is 1200 × 1697). Figma carries the real size later.
- **Build at it:** each screen is built at `?size=<width>x<height>`, and the page's own default size is set to the format, so every later capture is the whole piece. `grid.md`'s "px at 1440" means px at this working width, and every measure stays a share of the piece's width and height.
- **A reference of another proportion** (a wide poster for a tall brief) is a base only if its layout survives at the format's ratio, with each measure kept as a share of its own sides. Otherwise it lends moves and is never a base.

## What the pieces carry

- **Fill order:** the headline, then the facts in the order the brief lists them (what, when, where, who), then a link or a code if the brief has one, then the ownable. Each piece takes as many as its base carries, from the top, and stops. A fact the brief gives is never left off the chosen piece.
- **The headline** says the takeaway. A fact the brief marks missing is never invented: it is written in the piece as a stand-in (`data-standin="fact"` with `data-standin-note`) and listed for them.
- **The primary action is optional.** A link, a QR code or a date to save is on the piece only when the brief gives one.
- **No navigation.** The direction doc says `navigation: none`.
- **The rest** (the second language, the small print, other sizes of a set) is written down for `design-prototype`.

## Steps that do not run

- **The other width, before the yes:** skipped. A set's other sizes are `design-prototype`'s.
- **Touch-up:** the same rule, repair and never tidy. Contrast where text sits is fixed; so is a fact the brief gives that is not on the piece, added where the facts sit. Text over a picture, giant type, crops, overlaps and collisions are never faults here, and type cropped by the edge on purpose carries `data-crop`.
- **Nothing important in the trim:** on a print piece, mark where the trim and a safe margin fall at the working size (3 mm each by default, theirs if they give one). A word or a fact in the trim is a fault. A crop or a picture that runs off the edge on purpose is not.

## The five-second check

The questions are the same. The capture is shown at the size the piece reaches the eye: a poster read across a street, scaled so its long side is about 400 px; a feed post at phone size, about 390 px wide. "What would you do first" is what they would do about it: go, scan, remember the date. It is checked against the design brief's `read from` line and its takeaway.

## The doc

`docs/design/design-direction.md` as in the skill, with `navigation: none` and the format on the first line of Composition. `Primary action:` says "none" or the link, the code or the date to save.
