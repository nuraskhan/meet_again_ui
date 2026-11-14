# 11. Notifications

Route `/notifications`. Code: `src/views/NotificationsView.vue`. New ones appear by themselves.

## Purpose

What happened that concerns the person, newest first; one click takes them to the thing.

## Kinds

A friend request; a friend request accepted; an invitation to a plan; an invitation accepted or
declined; a guest joined or left; removed from a plan; a plan cancelled. The sentence comes ready
from the server ("Aida invited you to Lagman on Friday").

## Layout, desktop (1440)

- Title "Notifications". At the right, while something is unread: a quiet button "Mark all as
  read".
- Groups by day with a small heading: "Today", "Yesterday", then dates.
- Rows, 72 px, the whole row clickable: the avatar 40 of the person who did it, with a small icon
  of the kind in its corner (`user-plus`, `calendar`, `check`, `x`, `log-in`, `log-out`,
  `ban`); the sentence with the name and the plan title in `--t-body-strong`; the time under it;
  an unread dot at the right.
- An unread row has an accent-soft background; a read one has none.
- A quiet button "Earlier" at the bottom when there are more.

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `notification` | A row |
| `notification-text` | Its sentence |
| `notifications-read-all` | "Mark all as read" |
| `notifications-more` | "Earlier" |
| `notifications-empty` | The empty state |

## States

- Mixed read and unread across three days; all read (no button at the top).
- One arriving live: slides in at the top of "Today", unread.
- Empty: "Nothing yet", "Invitations, answers and friend requests will show up here."
- Loading: skeleton rows.

## Adaptation

- 390: the same list; "Mark all as read" becomes an icon button in the top bar.

## Prompt

Design this page as described inside the shell, light and dark, at 1440 and 390. Show: ten
notifications of every kind across three days with four unread, all read, empty, loading.
