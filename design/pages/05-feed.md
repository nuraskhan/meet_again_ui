# 05. Feed

Route `/feed`. Code: `src/views/FeedView.vue`.

## Purpose

Public plans anyone can join. A person looks through them, sees who invites, and joins in one
click. This is one of the two photo-led pages.

## Data per plan

The inviter (name, avatar, leads to their profile); activity type; title; note; the date line;
distance and price range; faces of up to five people coming and the total; whether the viewer
already joined.

## Layout, desktop (1440)

- Title "Feed". At the right: neutral button "New public plan".
- A row of chips under the title: "All" and one per activity type; one is selected.
- A grid of cards, two columns in the content column, 24 px gutter. The content column on this
  page may be 960 px wide.
- **Card**:
  - A header image area, ratio 16:9, `--r-l` on top: the inviter's main photo with
    `--c-photo-shade`; on it, at the bottom left, the avatar 40, the inviter's name and "invites";
    at the top left a chip with the activity icon and type. Without a photo: a `--c-surface-strong`
    area with the large activity icon.
  - Title in `--t-title-2`, up to two lines.
  - The note, up to two lines, `--c-ink-soft`.
  - Three short lines with icons: date, distance, price.
  - Footer: an avatar stack and "4 coming" at the left; at the right the button - primary "Join",
    or, when joined, a success badge "You are coming" and a quiet button "Open".
- Under the grid: a quiet button "Show older".

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `feed-type-all`, `feed-type-<TYPE>` | The chips |
| `feed-item` | A card |
| `feed-inviter` | The inviter on the card (link to the profile) |
| `feed-crowd` | Faces and the count |
| `feed-join` | "Join" |
| `feed-open` | "Open" for a plan already joined |
| `feed-more` | "Show older" |
| `feed-new` | "New public plan" |
| `feed-empty` | The empty state |

## States

- Filled; filtered by a type; joining (the button of that card loading); just joined.
- A full plan: "Join" replaced by a quiet "Full".
- Empty: "No public plans yet", one sentence, a primary button "Create the first one". With a
  filter: "Nothing of this kind right now", a quiet button "Show all".
- Loading: four skeleton cards. Loading more: the button shows a spinner.

## Adaptation

- 1024: two columns, narrower.
- 390: one column of cards edge to edge with 16 px margins; the chips scroll sideways.

## Prompt

Design the feed as described inside the shell, light and dark, at 1440, 1024 and 390. Show: six
plans of different types (two without a photo, one already joined, one full), the two empty
states, and loading.
