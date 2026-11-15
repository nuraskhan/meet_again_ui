# 01. Welcome

Route `/` for a visitor. Code: `src/views/WelcomeView.vue`. No data from the server.

## Purpose

Explains in one screen what the application does and gets the visitor to register.

## Layout, desktop (1440)

- Top bar, transparent: the wordmark at the left; at the right a quiet button "Log in" and a
  primary button "Create account".
- **Hero**, centred, the height of the first screen: the mark, the headline in `--t-display`
  (the value proposition of the product research: From "We should hang out" to "See you there."),
  one sentence under it, the primary button "Create account" and a text link "I already have an
  account". At the bottom a quiet button "How it works" with an arrow down, which scrolls to the
  steps. From 1100 wide, four small pieces of the product lie around the text, slightly askew: a
  plan card, an answer "Coming", two chat bubbles, an avatar stack. Purely decorative.
- **How it works**, without a visible title (the button of the hero says it): three steps one
  under another. Each is a row of two halves: at the left a
  soft box with a piece of the product itself, built from real components, at the right a number,
  a title, one sentence. The steps and their pictures: start a plan (a plan card); everyone says
  what works for them (one guest's answer: free times, budget, likes, travel distance); get one
  plan that fits (the best match with "Works for 4 of 5" and the reason, and the chat). No stock
  photos, no illustrations.
- **Why**: a title and two large figures from the product research (61% text a close friend at
  least a few times a week, 29% see one in person that often), with the source under them.
- **What comes next**: one soft block with the badge "Coming soon": telling friends in another
  city about a visit. Nothing that is not in the product is shown without this badge.
- Closing, centred: the tagline "Less planning. More hanging out.", one line of what Hangelo is
  not, and a neutral button "Create account".
- Footer: the wordmark and the year. Nothing else.

Black and white carry the page; the accent appears only on "Create account". The pictures bring
the colour: on this page only, the avatars are coloured (yellow, coral, mint, sky), so are the
activity icons (hike, dinner, coffee) and the rating star.

## Movement

Small, and none of it for a person who asked the system for less motion (the day switch still works):

- The four pieces of the hero lean a few pixels after the pointer, each by its own depth, and
  straighten under the pointer itself.
- Each step, the figures, "what comes next" and the closing fade in and rise 24 px when first
  scrolled to.
- The two figures count up from zero when first seen.
- The third step has a switch "Friday / Saturday": the match, its reason and the chat change with
  the day ("Works for 4 of 5" on Friday, "Works for 5 of 5" on Saturday).

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `welcome-register` | "Create account" in the top bar |
| `welcome-login` | "Log in" |
| `welcome-cta` | The button in the hero |

## States

Only the default one. A signed-in person never sees this page.

## Adaptation

- 1024: the steps stay in two halves, tighter.
- 390: one column; in each step the box goes above its words.

## Prompt

Design the welcome page as described, light and dark, at 1440, 1024 and 390. Write the real
headline and sentences in the voice of the designer prompt. Build the pictures of the steps from the
components of the design system.
