# 06. Plans (home)

Route `/plans`. Code: `src/views/PlansView.vue`. The page a person lands on after signing in.

## Purpose

First: what is waiting for my answer. Then: what I am part of. Last: what is over.

## Layout, desktop (1440)

- Title "Plans". At the right: nothing ("New plan" is in the sidebar).
- **Waiting for your answer** (only when there is something): a section title with a count, then
  invitation cards, full width of the column. An invitation card has `--c-accent-soft` background
  and no border: the inviter's avatar 40 and "**Timur** invites you", the compact plan summary,
  and at the right two buttons - primary "I'm coming", outline "I can't".
- **Upcoming**: cards in two columns. A plan card: activity icon and type, title, the date line,
  an avatar stack with "3 of 5 coming", badges ("Public", "You organise"). The whole card is a
  link to the plan.
- **Past and cancelled**: the same cards, quieter - `--c-ink-soft` text, a badge "Over" or
  "Cancelled"; collapsed behind a row "Past plans (7)" that opens them.

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `plans-invitations` | The "waiting" section |
| `invitation` | An invitation card |
| `invitation-accept`, `invitation-decline` | Its buttons |
| `plan-card` | An upcoming plan |
| `plans-closed` | The "past and cancelled" section |
| `plan-card-closed` | A plan in it |
| `plans-new` | The button of the empty state |
| `plans-empty` | The empty state |

## States

- Invitations and plans; plans only; an invitation being answered (its buttons disabled, the one
  pressed loading).
- An invitation arriving live: a new card slides in at the top of "waiting".
- Empty: "Nothing planned yet", "Send the first invitation - it takes a minute.", primary button
  "New plan".
- Loading: skeletons of one invitation and four cards.

## Adaptation

- 1024: plan cards stay in two columns.
- 390: one column; the two buttons of an invitation go under the summary, side by side.

## Prompt

Design this page as described inside the shell, light and dark, at 1440 and 390 (1024 in one
theme). Show: two invitations with four upcoming plans and the past row opened, the empty state,
and loading.
