# Design system: Hangelo

The only source of colours, sizes and shared components. A page uses what is here. Something
missing is proposed as an addition to this file, not drawn once on a page.

Token names are the CSS variable names the application will use.

## 1. Colour

Black, white, greys; one blue; three state colours.

| Token | Light | Dark | Used for |
|-------|-------|------|----------|
| `--c-page` | `#FFFFFF` | `#000000` | The page |
| `--c-surface` | `#FFFFFF` | `#111113` | Cards, fields, menus |
| `--c-surface-soft` | `#F5F5F7` | `#1C1C1F` | Sidebar, quiet blocks, row hover, incoming chat bubble |
| `--c-surface-strong` | `#E8E8ED` | `#2A2A2E` | Pressed rows, skeletons, chips |
| `--c-line` | `#E3E3E8` | `#2C2C30` | Borders, dividers |
| `--c-ink` | `#0B0B0C` | `#F5F5F7` | Main text, icons, the neutral filled button |
| `--c-ink-soft` | `#5C5C63` | `#A1A1A8` | Secondary text |
| `--c-ink-faint` | `#8A8A91` | `#6E6E76` | Placeholders, timestamps (never the only carrier of meaning) |
| `--c-on-ink` | `#FFFFFF` | `#000000` | Text on `--c-ink` |
| `--c-accent` | `#0B5FFF` | `#0B5FFF` | Fill of the main button, unread dot, own chat bubble |
| `--c-accent-strong` | `#0047D6` | `#3D7DFF` | The same, hovered or pressed |
| `--c-accent-text` | `#0B5FFF` | `#4C8DFF` | Blue as text or icon: links, active navigation |
| `--c-accent-soft` | `#E8F0FF` | `#0D1F40` | Tinted background of something selected or new |
| `--c-on-accent` | `#FFFFFF` | `#FFFFFF` | Text on `--c-accent` |
| `--c-success` | `#1A7F37` | `#3FB950` | "Coming", confirmed |
| `--c-warning` | `#9A6700` | `#D29922` | "Not answered yet", e-mail not confirmed |
| `--c-danger` | `#CF222E` | `#F85149` | Destructive actions, errors |
| `--c-success-soft` | `#E6F4EA` | `#0F2A17` | Background of a success badge |
| `--c-warning-soft` | `#FFF4D6` | `#2E2408` | Background of a warning badge or banner |
| `--c-danger-soft` | `#FDE8E9` | `#3A1214` | Background of an error |
| `--c-scrim` | `rgb(0 0 0 / 40%)` | `rgb(0 0 0 / 60%)` | Behind a dialog |
| `--c-photo-shade` | gradient, transparent to `rgb(0 0 0 / 70%)` | same | Under text placed on a photo |

Contrast, calculated: white on `--c-accent` 5.1:1; `--c-accent-text` on the dark page 6.6:1;
`--c-ink-soft` on the light page 6.5:1. Check every other pair you use against the 4.5:1 rule.

### Brand mark

The logo (see `logo/LOGO-PROMPT.md`) is the letter H drawn as a path that starts at a location
pin. It brings two colours of its own, used **only inside the logo** and nowhere in the interface:

| Token | Light | Dark | Used for |
|-------|-------|------|----------|
| `--c-brand-path` | `#8A5A2B` | `#C9A06A` | The H of the logo: the earth of a footpath |
| `--c-brand-pin` | `#E5252A` | `#E5252A` | The pin of the logo |

Where the logo appears: the top of the sidebar (mark and the word "hangelo"), the welcome and
sign-in pages, the invitation page, the favicon and app icon. Clear space around it: the width of
the pin. Minimum size of the mark: 24 px. On photos and coloured backgrounds use the one-colour
version.

Rules of use:

- Blue: the one main action in view, links, the active navigation item, unread marks, the user's
  own chat bubbles. Nothing else.
- A second button in the same view is neutral (`--c-ink` fill, or outline).
- State colours appear only with a word or an icon beside them.
- Avatars without a photo: initials in `--c-ink` on `--c-surface-strong`. No coloured avatars.

## 2. Type

Font: `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.
Numbers in tables and times: `font-variant-numeric: tabular-nums`.

| Token | Size / line | Weight | Used for |
|-------|-------------|--------|----------|
| `--t-display` | 48 / 52 | 700, tracking -0.02em | Welcome hero, a name over a profile photo |
| `--t-title-1` | 32 / 38 | 700, tracking -0.015em | Page title |
| `--t-title-2` | 22 / 28 | 600 | Section title, card title on the feed |
| `--t-title-3` | 17 / 24 | 600 | Card title, row title, dialog title |
| `--t-body` | 15 / 22 | 400 | Text |
| `--t-body-strong` | 15 / 22 | 600 | Names, emphasised text, buttons |
| `--t-small` | 13 / 18 | 400 | Secondary lines, hints |
| `--t-caption` | 12 / 16 | 500 | Timestamps, badges, labels above fields |

On a phone: display 34 / 38, title-1 28 / 34; the rest unchanged. Text never below 12 px.
Line length of running text: 60 to 75 characters.

## 3. Space, size, shape

- Spacing scale, in px: 4, 8, 12, 16, 24, 32, 48, 64. Tokens `--s-1` to `--s-8`.
- Radius: `--r-s` 8 (fields, chips), `--r-m` 12 (cards, buttons), `--r-l` 20 (photos, dialogs),
  `--r-full` (avatars, pills).
- Control heights: 40 default, 32 small, 48 large; 44 minimum on a phone.
- Borders: 1 px `--c-line`. A card has a border **or** a shadow, not both.
- Depth: `--shadow-1` for a raised card on hover (`0 1px 2px rgb(0 0 0 / 6%), 0 4px 12px rgb(0 0 0 / 6%)`),
  `--shadow-2` for menus, dialogs, toasts (`0 8px 32px rgb(0 0 0 / 16%)`). In the dark theme depth
  is shown by a lighter surface and a border, shadows are barely visible.
- Focus ring: 2 px `--c-accent-text`, 2 px offset, on every focusable element.

## 4. Layout

Desktop first.

| Width | Layout |
|-------|--------|
| 1280 and more | Sidebar 248 px (fixed, full height) + content column, maximum 760 px, centred in the rest + optional right rail 320 px |
| 1024 to 1279 | Sidebar collapsed to 72 px (icons with tooltips) + content column; the right rail moves under the content |
| below 768 | No sidebar: a bottom tab bar of 5 items, 56 px high plus the safe area; page title at the top; one column, 16 px side margins |

- Content grid inside the column: 12 columns, 24 px gutters; on a phone 4 columns, 16 px.
- Two-pane pages (chats, friends): list 360 px + detail; on a phone, one pane at a time.
- Vertical rhythm: 32 px between sections, 16 px between cards, 8 or 12 px inside a card.

## 5. Motion

- Durations: 120 ms (hover, press), 200 ms (appear, disappear), 320 ms (page-level, dialog).
- Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- New item in a list (a message, a notification): fades in and slides 8 px. Nothing bounces.
- With "reduce motion": cross-fades only.

## 6. Components

Each has the states: default, hover, focus, pressed, disabled, and loading where it acts.

| Component | Description |
|-----------|-------------|
| Button, primary | `--c-accent` fill, white text, `--r-m`, 40 high, `--t-body-strong`. One per view. |
| Button, neutral | `--c-ink` fill, `--c-on-ink` text. The main action where blue is already used, or a confirmation. |
| Button, outline | 1 px `--c-line`, `--c-ink` text. Secondary actions. |
| Button, quiet | No border, `--c-ink-soft` text, `--c-surface-soft` on hover. Tertiary: "Cancel", "Earlier". |
| Button, danger | Outline in `--c-danger`; filled only inside its confirmation. |
| Icon button | 40 square, `--r-full`, icon 20; always with an accessible name and a tooltip. |
| Field | 40 high, 1 px `--c-line`, `--r-s`, label above in `--t-caption`, hint or error below in `--t-small`. Error: `--c-danger` border and text with an icon. |
| Text area | The same; grows with its content up to a limit. |
| Segmented control | 2 to 4 options in one track (`--c-surface-soft`), the chosen one on `--c-surface` with `--shadow-1`. For "Only people I invite / Everyone". |
| Chip | 32 high, `--r-full`, `--c-surface-strong`; selected: `--c-ink` fill. For activity types, interests, radius presets. |
| Badge | 12 px caption on a soft state colour: "Coming", "Not answered", "Declined", "Public", "Cancelled", "Over". |
| Avatar | Circle, sizes 24, 32, 40, 64, 96; photo or initials; an avatar stack overlaps by a quarter and ends in "+3". |
| Card | `--c-surface`, 1 px `--c-line`, `--r-m`, 16 or 24 padding. Clickable card: `--shadow-1` and a slightly stronger border on hover. |
| Photo card | A photo with `--r-l`, optional text on `--c-photo-shade` at its bottom. For the feed and profiles. |
| List row | 56 or 72 high: avatar or icon, two lines of text, trailing action or time; a divider inset to the text. |
| Navigation item | Icon 20 + label; active: `--c-accent-text` and `--c-accent-soft` background; a count pill at the end. |
| Count pill | 18 high, `--r-full`, `--c-accent` fill, white 12 px bold; "9+" beyond nine. |
| Unread dot | 8 px circle, `--c-accent`. |
| Banner | Full width of the content, soft state colour, an icon, one sentence, one action. For "confirm your e-mail". |
| Toast | Bottom centre (bottom right on desktop), `--c-ink` fill, `--c-on-ink` text, `--shadow-2`, 4 seconds; an error toast carries the danger icon. |
| Dialog | Centred, 480 wide, `--r-l`, `--shadow-2`, on `--c-scrim`; a title, one sentence, two buttons. On a phone: a sheet from the bottom. |
| Inline confirmation | The pressed button turns into "Sure? Yes / No" in place. Used for leaving, removing, cancelling. |
| Empty state | A 48 px line icon, a title (`--t-title-3`), one sentence, at most one button. No illustrations. |
| Skeleton | Shapes of the coming content in `--c-surface-strong`, a slow shimmer; never a spinner for a whole page. |
| Chat bubble | Others: `--c-surface-soft`, `--c-ink`. Own: `--c-accent`, white. `--r-l` with the corner towards the author at `--r-s`. Time in `--t-caption` under a run of messages. |
| Map | A map with one pin, `--r-m`, 240 high; muted map tiles; in the dark theme a dark tile style. |
| Plan summary | The reusable heart of a plan: activity icon and type, title, the date line, distance, price range. Compact (in a card) and full (on the plan page). |
| Place suggestion | Name, category, rating, address, distance for the viewer; up to three in a row on desktop, stacked on a phone. |

## 7. Icons for the things of this product

Lucide names. Activity types get an icon each; choose from the set and list your choice.

| Thing | Icon |
|-------|------|
| Feed | `compass` |
| Plans | `calendar` |
| Friends | `users` |
| Chats | `message-circle` |
| Notifications | `bell` |
| Profile | the person's avatar |
| New plan | `plus` |
| Public plan | `globe` |
| Private plan | `lock` |
| Date and time | `clock` |
| Distance | `map-pin` |
| Price | `wallet` |
| Share link | `link` |
| Send message | `arrow-up` |
