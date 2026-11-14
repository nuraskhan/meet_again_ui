# 13. A person

Route `/people/:userId`. Code: `src/views/PersonView.vue`. Also how the user sees their own
profile from outside.

## Purpose

Who is this person who invites me, or who is coming. Photo-led: the second of the two bold pages.

## Layout, desktop (1440)

Two columns in a 960 px area.

**Left, sticky**: the photo viewer, ratio 4:5, 420 px wide, `--r-l`.

- The current photo; thin progress segments at the top, one per photo; clicking the right or left
  half goes to the next or previous; arrow icon buttons appear on hover; the arrow keys work.
- On the photo shade at the bottom: the name in `--t-display` and, beside it, the age; under them
  the city.
- Without photos: a `--c-surface-strong` area with large initials, the name under it in ink.

**Right**: the story, as blocks separated by 32 px.

1. A line of actions: primary "Add friend" - or a quiet label "Request sent", or the pair
   "Accept" and "Decline", or a success badge "Friends". For the own profile: an outline button
   "Edit profile". A level badge (Pro, Max) beside the name when not Standard.
2. **About**: the text.
3. **Facts**: rows with icons - occupation, education, hometown, languages, pronouns. Only the
   ones filled in.
4. **Interests**: chips.
5. **Prompts**: cards - the question in `--t-small` `--c-ink-soft`, the answer in `--t-title-2`.

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `person` | The page |
| `person-photo`, `person-photo-next` | The viewer, the "next" area |
| `person-privilege` | The level badge |
| `person-interests` | Interests |
| `person-prompt` | A prompt card |
| `person-edit` | "Edit profile" on the own profile |
| `person-missing` | Not found |

## States

- A full profile with five photos; a minimal one (name only, no photos).
- The four relations: stranger, request sent, request received, friends; and the own profile.
- Not found: "This person is not here", a button back.
- Loading: a skeleton of the photo and three blocks.

## Adaptation

- 1024: the photo 360 px wide.
- 390: the photo full width at the top with the name on it, then the blocks; the action button
  pinned to the bottom.

## Prompt

Design this page as described inside the shell, light and dark, at 1440 and 390. Show: a full
profile, a minimal one, the action line in its five forms, not found.
