# 12. My profile (editing)

Route `/profile`. Code: `src/views/ProfileView.vue`. What others see of it is page 13.

## Purpose

The person says who they are: photos first, then a few facts, interests and short prompts. Also
the account: the e-mail, the plan level, and the way out.

## Layout, desktop (1440)

Two columns in a 960 px area: photos at the left (sticky, 360 px), the form at the right.

**Photos**

- A grid of photo tiles, ratio 4:5, `--r-l`: the first one large (the main photo, marked "Main"),
  the others in two columns under it. The number of tiles is the limit of the person's level (3,
  6 or 10); a free tile is a dashed outline with a `plus` icon and "Add a photo".
- On hover a tile shows two icon buttons on the photo shade: "Make main" and "Remove".
- Under the grid: "3 of 6 photos" and, in small text, what is accepted (JPEG, PNG or WebP, up to
  the size limit).
- An upload error appears as a danger line under the grid.

**Form**, in sections:

1. **About you** - Name; Pronouns; Date of birth; a text area "About" with a character counter.
2. **Facts** - City; Hometown; Occupation; Education; Languages.
3. **Interests** - chips with a remove cross, and a field that adds one on Enter; the limit shown
   as "5 of 10".
4. **Prompts** - up to three cards, each a question chosen from a list and an answer in a text
   area; a quiet button "Add a prompt".
5. A sticky bar at the bottom of the form: primary "Save" (enabled only when something changed)
   and an outline "See how others see it".

**Account**, a quiet block under the form: the e-mail with a badge "Confirmed" or "Not
confirmed"; the level as a badge (Standard, Pro, Max) with what it gives ("up to 6 photos"); an
outline button "Log out".

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `profile-photo`, `profile-photo-main`, `profile-photo-remove` | A photo tile, "Make main", "Remove" |
| `profile-photo-add`, `profile-photo-file`, `profile-photo-error` | The free tile, its file input, the upload error |
| `profile-form` | The form |
| `profile-name`, `profile-pronouns`, `profile-birth-date`, `profile-bio` | About you |
| `profile-city`, `profile-hometown`, `profile-occupation`, `profile-education`, `profile-languages` | Facts |
| `profile-interest`, `profile-interest-add` | An interest chip, the field that adds one |
| `profile-prompt`, `profile-prompt-question-<n>`, `profile-prompt-answer-<n>`, `profile-prompt-add` | Prompts |
| `profile-save`, `profile-preview` | "Save", "See how others see it" |
| `profile-email`, `profile-privilege`, `profile-logout` | Account |

## States

- A full profile; a new one with nothing but the name (the photo grid invites: "Add your first
  photo").
- Uploading a photo (progress on the tile); a refused file (wrong type, too large, not an image);
  the limit reached (no free tile, a line "Your level allows 6 photos").
- Unsaved changes (the bar highlighted); saving; saved (a toast).
- Field errors.

## Adaptation

- 1024: photos above the form, as one row that scrolls sideways.
- 390: one column - photos as a sideways row, then the sections; the save bar pinned to the bottom.

## Prompt

Design this page as described inside the shell, light and dark, at 1440 and 390 (1024 in one
theme). Show: a full profile with four of six photos, a new profile, an upload in progress and a
refused file, unsaved changes.
