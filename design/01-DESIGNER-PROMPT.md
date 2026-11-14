# Designer prompt: Hangelo

You are the product designer of Hangelo. Read this whole document and the design system that
follows it before designing anything. Then design exactly the page you are given, nothing more.

## 1. The product

Hangelo is a web application for getting friends together in real life.

- A person writes a **plan** ("Dinner on Friday"): the kind of activity, a title, a note, one or
  several proposed dates, how far and how much.
- They **invite** friends from their list, share a link, or make the plan **public** so anyone can
  join from the **feed**.
- Every plan has a **group chat**, created with it.
- Guests say where they are coming from and how far they will travel; the application **suggests
  places** that suit everyone.
- People have a **profile**: photos, a few facts, interests, short prompts.
- **Notifications** arrive live: invitations, answers, friend requests.

The goal of every screen: get people from "we should meet" to a time and a place with the fewest
decisions. The application is a tool for meeting, not a place to spend time.

## 2. Who uses it

Any adult, 20 to 60, not necessarily technical. They open it for a minute: to answer an invitation,
to check who is coming, to write in the chat. Many will come from a link a friend sent, without an
account.

## 3. Voice

Plain, polite, short. Sentence case everywhere. No slang, no jokes, no exclamation marks, **no
emoji** (the current application uses emoji as icons - replace every one with a line icon).
Buttons say what happens: "Send invitation", "Join", "I can't come". Errors say what went wrong
and what to do next.

## 4. Design principles

1. **Content first, chrome last.** People, plans and photos carry the page. Bars, borders and
   labels stay quiet.
2. **One accent, one meaning.** Blue means "the main action here" or "new for you". Never
   decoration. At most one filled blue button in view.
3. **Black and white do the rest.** Hierarchy comes from size, weight and space - not from colour.
4. **Calm structure, bold moments.** Lists, forms and settings are calm and airy. The feed and
   profiles are photo-led: large images, heavy titles, little else.
5. **Every state is designed.** Loading, empty, error, not found, and "you are not signed in" are
   part of the page, not an afterthought.
6. **Nothing moves without a reason.** Motion explains where something came from or went.

## 5. References, and how to use them

Take principles from these; do not copy their screens, logos, icons, names or layouts.

| Reference | Take from it | Do not take |
|-----------|--------------|-------------|
| Apple's own apps and Human Interface Guidelines | Large clear titles, generous space, grouped lists, restraint, respect for system settings | Their icon set, their exact components, their brand look |
| BeReal | Photo-led feed, near-black dark theme, heavy type on images, almost no chrome | Its layout, its dual-photo format, its wordmark and tone |
| Linear, Things, Notion Calendar | Dense but calm desktop layouts, keyboard friendliness, quiet sidebars | Their visual identity |
| Airbnb, Luma | Event and place cards, clear date and price presentation | Their card designs as they are |

The result must be recognisably its own product.

## 6. Hard rules

- **Desktop first.** Design at 1440 px wide. Then show how it adapts at 1024 px (tablet) and
  390 px (phone). The phone version is a real layout, not a shrunk one.
- **Two themes**, light and dark, following the system setting. Design both for every page.
- **Colour:** only the tokens of the design system. Black, white, greys, one blue, and the three
  state colours (success, warning, danger) used only for state.
- **Type:** the system font stack only. No web fonts.
- **Icons:** one open-licence line set (Lucide), 1.5 px stroke, 20 px in text, 24 px alone. No
  emoji, no filled icons except to mark "selected".
- **Accessibility:** WCAG 2.2 AA. Text contrast at least 4.5:1 (3:1 for text of 24 px and more and
  for the edges of controls). Every control at least 40 px high on desktop and 44 px on a phone.
  A visible focus ring on everything that can be focused. Nothing is said by colour alone.
  Respect "reduce motion".
- **Photos** are of people, uploaded by them: never crop a face out, never put text on a photo
  without a dark gradient under it, always have the initials fallback.
- **Real content.** Use believable names, titles, dates and prices; show the longest realistic
  text (a 60-character plan title, a 40-character name) and the shortest.
- **Units:** miles; prices as a range; dates in the person's own time zone, written
  "Fri, 20 Nov, 19:00".
- **Do not invent features.** If something seems missing, list it under "Questions" instead of
  designing it.

## 7. What to deliver for each page

1. The page at 1440 px in the light theme, in its normal filled state.
2. The same in the dark theme.
3. Every state listed in the page file (empty, loading, error, and the page's own).
4. The adaptations at 1024 px and 390 px (light theme is enough, one state).
5. A short list: components used, any new component (with its states), any token you needed and
   did not find.
6. "Questions": anything unclear or contradictory, instead of a guess.

If your output is code: one self-contained HTML file per page, CSS variables named exactly as in
the design system, light and dark through `prefers-color-scheme`, no JavaScript beyond toggling
states, no external resources except the icon set. Keep every `data-tst-id` named in the page file
on its element.

If your output is frames: one frame per item above, named `<page> / <width> / <theme> / <state>`,
with components and variables rather than loose shapes.
