# 09. Friends

Route `/friends`. Code: `src/views/FriendsView.vue`.

## Purpose

Find people, answer requests, see who is already a friend.

## Layout, desktop (1440)

- Title "Friends" with the count.
- **Search**, at the top, full width of the column: a field with a search icon, "Find people by
  name or e-mail", and a neutral button "Search". Results appear under it as rows: avatar 40,
  name, city; at the right - primary "Add", or a quiet label "Request sent", or "Already friends",
  or the two buttons when that person has asked first.
- **Requests for you** (only when there are any): rows on an accent-soft background - avatar,
  name, "wants to be your friend", the date; primary "Accept", outline "Decline".
- **Your requests** (only when there are any): rows - avatar, name, a warning badge "Not answered".
- **Friends**: a list of rows - avatar 40, name, "Friends since Mar 2026"; the name leads to the
  profile; at the right an icon button with a menu holding "Remove" (inline confirmation).

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `friends-search-form`, `friends-search`, `friends-search-submit` | The search |
| `friends-found`, `friends-add` | A result, "Add" |
| `friends-search-empty` | "Nobody found" |
| `friends-incoming`, `friend-request`, `friend-request-accept`, `friend-request-decline` | Requests for the person |
| `friends-outgoing` | Their own requests |
| `friend`, `friend-remove`, `friend-remove-confirm` | A friend, removing, its confirmation |
| `friends-empty` | The empty state |

## States

- Friends with requests in both directions; friends only.
- Searching (results loading); results; nobody found.
- A request arriving live: a new row slides into "Requests for you".
- Empty: "No friends here yet", "Find people you know, or send them a plan by link.", focus on the
  search field.
- Loading: skeleton rows.

## Adaptation

- 390: buttons of a request go under the name; the friend menu opens as a sheet.

## Prompt

Design this page as described inside the shell, light and dark, at 1440 and 390. Show: two
incoming requests, one outgoing, eight friends, a search with three results in different
relations, "nobody found", the empty state.
