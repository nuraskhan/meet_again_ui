# 01. Welcome

Route `/` for a visitor. Code: `src/views/WelcomeView.vue`. No data from the server.

## Purpose

Explains in one screen what the application does and gets the visitor to register.

## Layout, desktop (1440)

- Top bar, transparent: the wordmark at the left; at the right a quiet button "Log in" and a
  primary button "Create account".
- **Hero**, two columns. Left: a headline in `--t-display` (up to 8 words, about meeting friends
  in real life), one sentence under it, the primary button "Create account" and a text link
  "I already have an account". Right: a composition of the product itself - a plan card, an avatar
  stack of people coming, a chat bubble, a suggested place - built from real components, slightly
  overlapping. No stock photos, no illustrations.
- **How it works**: three steps in a row, each a number, a title, one sentence: write a plan;
  invite friends or open it to everyone; agree on a time and a place.
- **What you get**: four short blocks with a line icon each: proposed dates, a group chat for
  every plan, place suggestions that suit everyone, a public feed.
- Closing band: the headline repeated shorter and the primary button.
- Footer: the wordmark and the year. Nothing else.

Black and white carry the page; blue appears only on "Create account".

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `welcome-register` | "Create account" in the top bar |
| `welcome-login` | "Log in" |
| `welcome-cta` | The button in the hero |

## States

Only the default one. A signed-in person never sees this page.

## Adaptation

- 1024: the hero stays in two columns, tighter.
- 390: one column; the composition goes under the text and is cut to the plan card and the avatar
  stack; steps and blocks stack; the primary button is full width.

## Prompt

Design the welcome page as described, light and dark, at 1440, 1024 and 390. Write the real
headline and sentences in the voice of the designer prompt. Build the hero composition from the
components of the design system.
