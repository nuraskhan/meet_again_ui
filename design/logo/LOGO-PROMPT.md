# Logo prompt: Hangelo

The sketch is `sketch.png` in this directory. Attach it together with the prompt: the prompt tells
the tool what to keep from the sketch and what to clean up.

## The idea

Hangelo gets people together at a place. The logo is the letter **H written as a path**: one
continuous hand-drawn line, like a trail seen from above, that starts at a **location pin**. The
path is the way there; the pin is where everyone meets.

## What the sketch fixes (keep)

- A single script capital **H** drawn in one stroke, without lifting the pen.
- The stroke begins at the top left, **under the tip of a map pin**, runs down into a rounded
  loop at the lower left, swings up and to the right to form the crossbar, crosses the left stem,
  curls into a small hook at the top right, and falls straight down as the long right stem, which
  ends lower than everything else.
- The left stem is short and crosses the crossbar; the right stem is the tallest line of the mark.
- A **map pin** (teardrop with a round hole) stands at the top left, its tip touching the start of
  the stroke, slightly tilted, about a third of the height of the mark.
- Round line ends, even stroke width, a relaxed handwritten feel.

## What to clean up (change)

- Smooth, confident curves instead of the wobble of a mouse drawing; constant stroke weight.
- Make the H read as an H at a glance: the two stems clearly vertical, the crossbar clearly
  joining them. It must not read as "4", "P", "f" or a treble clef.
- A geometric, well-proportioned pin with a clean circular hole; its tip meets the stroke exactly.
- Balanced so the mark sits in a square with even margins.

## Colour

| Part | Colour | Why |
|------|--------|-----|
| The H (the path) | Earth brown of a footpath, `#8A5A2B` on light backgrounds; sand `#C9A06A` on dark ones | A trail in nature: packed earth, not asphalt |
| The pin | Signal red, `#E5252A` | The destination; the only loud thing in the mark |
| The hole of the pin | The background showing through | Works on any background |

Flat colours only. No gradients, no shadows, no outlines, no texture.

## The prompt (copy from here)

```
Design a logo mark for "Hangelo", an app that helps friends agree on a place and meet in real
life. Use the attached sketch as the composition; redraw it cleanly, do not trace its wobble.

THE MARK
A single script capital letter H drawn as one continuous line, like a walking trail seen from
above. The line starts at the top left directly under the tip of a map location pin, runs down
into a rounded loop at the lower left, sweeps up and right to become the crossbar of the H,
crosses a short left stem, curls into a small hook at the upper right, then drops straight down
as a long right stem that ends lower than the rest of the letter. Round line caps, one constant
stroke weight (about one ninth of the mark's height), smooth confident curves.

A map location pin - a teardrop with a circular hole - stands at the top left. Its tip touches
the exact start of the line, as if the trail begins at the pin. The pin is tilted a few degrees
to the left and is about one third of the mark's height.

MUST READ AS
The letter H first, a path second, a pin third. It must not look like the digit 4, the letter P
or f, or a musical clef. Both stems are clearly vertical; the crossbar clearly connects them.

COLOUR
The H line: earth brown of a footpath in nature, #8A5A2B. The pin: signal red, #E5252A. The hole
of the pin is transparent. Flat fills only: no gradients, shadows, outlines, textures or 3D.

STYLE
Minimal, modern, friendly, hand-drawn in spirit but geometrically clean - a mark that could sit
next to system icons. Vector look, crisp edges. Centred on a plain white background with even
margins, square 1:1 canvas. Nothing else in the image: no text, no slogan, no frame, no mockup.

VARIANTS, each as a separate image
1. Full colour on white (as above).
2. Full colour on black: the H line in sand #C9A06A, the pin unchanged.
3. One colour, black on white: H and pin both black, the pin told apart only by its shape.
4. One colour, white on black.
5. App icon: the mark centred on a rounded square, white background, with safe margins of one
   sixth of the side; must stay readable at 32 pixels.
6. Horizontal lock-up: the mark, then the word "hangelo" in lower case, in a plain geometric
   sans-serif of medium weight, the same height as the crossbar-to-baseline part of the H,
   coloured #0B0B0C; spacing between mark and word equal to the width of the pin.

DELIVER
Vector (SVG) if you can; otherwise PNG at 2048 x 2048 with a transparent background. Do not copy
or resemble any existing brand's logo.
```

## How to judge the result

- At 32 px it is still an H with a pin, not a blob.
- In one colour it still works.
- Covered pin: still an H. Covered H: still a pin.
- A person who has not seen the sketch says "H" and "map" or "place" within three seconds.

## After the logo is chosen

- The final files go into this directory (`hangelo-mark.svg`, `hangelo-lockup.svg`, and the icon
  sizes) and into `public/` as the favicon.
- `02-DESIGN-SYSTEM.md`, section "Brand mark", already reserves these two colours for the logo.
