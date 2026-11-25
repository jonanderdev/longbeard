# Design floor

Generated from `rules/design-rules.md` by `npm run share`: its opening sections and every hard check. The soft checks and the tells are `design-check`'s.

How a screen is checked. `design-check` reads all of it on every frame and build. The skills that build read only the floor (`design-floor.md`: these opening sections and every hard check), so a better model's craft is never held to a textbook while drawing.

These rules decide execution, never the look. The direction and `DESIGN.md` decide the look. A rule that seems to ask for a colour, a typeface or a style is misread. It asks only that whatever was chosen is used with intent.

## Before you build

A studio applies these while drawing each screen, not as a check after. Each is the numbered rule's, said there.

- One most prominent element and one primary action (rule 1).
- Contrast where the text sits, over pictures too (rules 6 and 12).
- One picture leads; pictures that share the screen never compete (rule 12).
- Text size at its floor (rule 5).
- One grouping device per group (rule 2).
- Every screen follows the direction's principles (before the pick, their whys), and reads as the same product as the first.

## How to use this

- Check from a screenshot. Every check below can be passed or failed by looking at a rendered screen at its real size. When a check needs a state you cannot see (focus, error, empty), it needs that state's frame, and a missing frame fails rule 8.
- Go in order: **Idea** first, then every **hard** check, then **soft**.
- **Hard** is the floor: structure, contrast, text size, targets, focus and states. A hard failure blocks the screen. `DESIGN.md` cannot waive it, except for what the person liked or asked for (below).
- **When the floor meets a liked concept:**
  - Text a person acts on (body, labels, prices, fields, navigation, buttons): the floor wins. The fix comes from inside the concept: its own ink, another crop, a device the board already has. Never by moving the text off the concept or dropping the concept.
  - Display and composition (giant type over a picture, overlaps, crops): the concept wins, and the fault is written down.
  - A colour or a small size the person liked or asked for: kept, reported as a warning with its measure, not a block. Marked `WARN liked, kept` in `DESIGN.md`; on a page, small text is marked `data-board-size`.
- **Soft** is a default. `DESIGN.md` may override a soft check on purpose, with a written reason. A soft finding with no reason in `DESIGN.md` is reported, not blocked.
- A finding is four things: the rule (number and check), hard or soft, where on the screen, and the fix.
- The shared core applies to everything, except where the Graphics list says it does not. Then add the site, app or graphics list, whichever the brief's surface says.

## 1. Hierarchy

**Principle:** the eye lands first on what matters most, then moves in the order the task needs.
- [hard] Exactly one element is the most prominent on the screen. Squint or blur the shot: one thing still stands out.
- [hard] The primary action is easier to find than any secondary action. If two actions look equally important, only one of them should be.

## 2. Grouping

**Principle:** things that belong together look together, and things that do not are kept apart.
- [hard] The space between related items is clearly smaller than the space between groups. A label sits closer to its field than to the field above.

## 3. Alignment and grid

**Principle:** every element sits on a line shared with something else.
- [hard] Left edges of text blocks in one column line up. No block is nudged a few pixels off its neighbours.

## 5. Typography

**Principle:** a few sizes, far apart, set for reading.
- [hard] At the screen's real size, nothing is under 12px, text a person acts on (links, buttons, labels, fields, prices, navigation) is at least 14px, and body is 16px at every width. Where a reference sets smaller, keep its proportions and scale the step up.
- [hard] No text is clipped, overlapped, or cut mid-word by its container, in any language the product ships.

## 6. Colour

**Principle:** colour carries meaning, and the meaning stays the same everywhere.
- [hard] Body text has a contrast ratio of at least 4.5:1 against its background. Large text (24px, or 18.66px bold, and up) and the visible parts of controls and icons have at least 3:1. When `DESIGN.md` or the design brief sets the level to AAA: 7:1 for body text and 4.5:1 for large text.
- [hard] Colour is never the only signal. An error, a selected item or a required field also changes shape, weight, an icon or text.
- [hard] A product with more than one theme has one set of colour tokens, with a value for each theme, and passes every check here in each theme. A colour that stays the same when the theme changes, and should not, fails.

## 7. Consistency

**Principle:** the same thing looks and behaves the same everywhere.
- [hard] One action has one look. Two primary buttons on different screens are the same component, same size and same label case.

## 8. States

**Principle:** every screen is shown in every state a person will meet.
- [hard] The screen has a frame for each of empty, loading and error that a person can reach, next to the default. A state nobody can reach is recorded as not needed, with the reason. A reachable state with no frame is a failure, not a later task.
- [hard] Empty says what goes here and gives the one action that fills it. Error says what went wrong in plain words and how to recover.
- [hard] Interactive components show hover (pointer surfaces), focus, pressed, disabled, and selected where they apply. Each state is visibly different from default.

## 9. Affordance and feedback

**Principle:** what can be acted on looks like it, and every action visibly answers.
- [hard] Every interactive element looks interactive without hovering. Text links are distinct from body text by more than colour alone, unless their position makes them obvious (a nav bar).
- [hard] Nothing that looks interactive is not. A card that looks clickable is clickable, or loses the look.

## 10. Accessibility

**Principle:** the screen works for people who see, move and read differently.
- [hard] The focused state of every interactive element shows a visible indicator with at least 3:1 contrast against what is around it. Check it in the focus frame.
- [hard] Targets are at least 24×24 CSS pixels, or have that much space around them (WCAG 2.2 AA). The app list raises this for touch.
- [hard] Every input has a visible label. A placeholder alone is not a label.
- [hard] Text is real text, not text in an image, except in logos.

## 11. Copy

**Principle:** words do the job of the screen in the product's own voice, made from facts it has.
- [hard] No placeholder copy: no lorem ipsum, no "Title", no "Button", no "User Name".

## 12. Imagery

**Principle:** pictures show the real thing, or there are none.
- [hard] Text over an image meets the contrast floor in rule 6 across the whole text area, not only on the darkest part.

## 13. Responsive

**Principle:** each size is designed, not squeezed.
- [hard] At mobile width (360–390px) nothing scrolls sideways, nothing is clipped, and nothing overlaps.
- [hard] The primary action is reachable at every size without hunting: visible, or one obvious step away.

## Sites

- [hard] The first screen at mobile and desktop says what this is and who it is for, without scrolling.

## Apps

- [hard] Touch targets on touch platforms are at least 44×44 pt (Apple) or 48×48 dp (Material), whichever platform it ships on. The web floor in rule 10 still applies.
- [hard] The person always knows where they are: the current place in navigation is marked, and the screen title matches the nav item.

## Graphics

- **Applies:** rules 0 to 3, 5, 6, 11, 12 and 14. Rule 4 holds for the margin and the gaps between groups. Rule 7 holds across the pieces of a set.
- **Does not apply:** rule 8 (states), rule 9 (affordance), the targets, focus and label checks of rule 10, and rule 13 (responsive). A missing state frame is not a finding.
- [hard] Readable at its distance. Scale the shot to how the piece is seen (a poster read across a street, about 400 px on its long side; a feed post at phone width). The headline and every fact the brief gives still read.
- [hard] Nothing important in the trim. On a print piece, no word, fact or logo sits in the trim or the safe margin. A picture or a crop that runs off the edge on purpose is not a finding.
