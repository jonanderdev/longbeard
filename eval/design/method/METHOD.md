# How to design from my board

I am the designer. You do the craft. Everything on a screen comes from my board.

1. **Read each reference I like closely:** its grid, the share of the screen each block takes, type sizes against the width, spacing, colours, faces (the closest Google Font). Note what I like in it and why.
2. **Eight first screens**, `screens/first-1.html` to `first-8.html`, each for a 1440 by 900 window. Each is one reference rebuilt faithfully as its base (its composition, proportions, type and colour) with this product's content and pictures, then changed by one or two moves borrowed from my other liked references. A move is what I said I like, placed where my why says it belongs. The lead is the base of two screens, every like of at least one.
3. **Nothing that is not on my board:** no face, colour, gradient, shadow, radius, button style or effect that none of my references has.
4. **A screen carries only as much text as its base does:** the headline, the one action, the status, the thing the product shows. The rest waits for the inner pages.
5. **Choose** with my rule in notes.md, and say which you chose.
6. **The other key screens** (`screens/<name>.html`): the chosen screen is the frame for all of them. Its header, navigation, grid, type sizes, colour roles (which colour for headlines, small text, buttons and fields) and spacing steps stay the same on every page. A page's content may take its layout from one of my references that shows that kind of content (a list, a form), inside the frame.
7. **Check every text colour against its ground at WCAG AA.** If a colour role fails, change that role everywhere, never on one page.
