# 08. A plan

Route `/plans/:eventId`. Code: `src/views/PlanView.vue` with `EventSummary`, `ProposedTimes`,
`PreferenceForm`, `LocationMap`, `SuggestedPlaces`. The richest page of the product.

## Purpose

Everything about one plan: what and when, who answered what, where to go, and the way into the
chat. What a person can do depends on who they are: the organiser, an invited guest who has not
answered, a guest who is coming, a guest who declined.

## Layout, desktop (1440)

Content column 760 px plus a right rail of 320 px (total 1104).

**Main column**

1. **Header**: a back link "Plans"; badges ("Public", "Cancelled", "Over"); the title in
   `--t-title-1`; "Organised by **Aigerim**" with the avatar 24, leading to the profile.
2. **Answer bar** - only for a guest who has not answered: an accent-soft block, "Are you
   coming?", primary "I'm coming", outline "I can't".
3. **Summary**: the note; then rows with icons - every proposed date on its own line, distance,
   price range.
4. **Where to go**: up to three place suggestions in a row (name, category, rating, address,
   "2.4 mi from you"). Above them a quiet button "Suggest again". Before any suggestion: a line
   explaining that places appear once people say where they are, and a neutral button "Suggest
   places".
5. **Your location and distance** - for the organiser and a guest who has not declined: a place
   field with a "Use my location" button, the map with a movable pin, radius chips (1, 3, 5, 10,
   25 mi) and a number field, a neutral button "Save". Collapsed to one line with "Change" once
   saved: "Brooklyn · up to 5 mi".

**Right rail**

1. **Chat**: a neutral button "Open the chat", full width.
2. **Invite** - organiser only: the share link in a read-only field with a "Copy" button; after
   copying the button says "Copied" for two seconds.
3. **People** with the counts "4 coming · 2 not answered · 1 declined": the organiser first, then
   guests as rows - avatar 32, name, their preference in a small line, a status badge at the
   right. For the organiser each guest row has a "Remove" icon button shown on hover, with an
   inline confirmation.
4. **Leave or cancel**, at the very bottom, quiet: a guest who is coming sees "I can't come after
   all"; the organiser sees "Cancel the plan" (danger). Both with an inline confirmation.

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `plan` | The page |
| `plan-public`, `plan-closed` | The "Public" badge; the cancelled or over note |
| `plan-accept`, `plan-decline` | The answer bar buttons |
| `summary-when`, `proposed-times` | The date line; the list of dates |
| `suggestions`, `suggestion`, `suggestion-my-distance` | The block, a place, its distance for the viewer |
| `suggestions-ask`, `suggestions-not-yet`, `suggestions-none`, `suggestions-problem` | The button and its three messages |
| `plan-preference`, `plan-preference-todo` | The location block; the reminder to fill it |
| `preference-form`, `preference-place`, `preference-locate`, `preference-located`, `preference-unpin` | The form, the place field, "Use my location", its result, removing the pin |
| `location-map` | The map |
| `preference-radius`, `preference-radius-<miles>`, `preference-save`, `preference-error` | Radius field, chips, "Save", the error |
| `plan-open-chat` | "Open the chat" |
| `plan-share`, `plan-share-link`, `plan-share-copy` | The invite block, the link, "Copy" |
| `invitee`, `invitee-preference` | A guest row, the guest's preference |
| `invitee-remove`, `invitee-remove-confirm` | Removing a guest and its confirmation |
| `plan-no-guests` | "Nobody is invited yet" |
| `plan-leave`, `plan-leave-confirm` | A guest leaving |
| `plan-cancel`, `plan-cancel-confirm` | The organiser cancelling |
| `plan-missing` | Not found |

## States

- As the organiser; as a guest who has not answered; as a guest who is coming; as a guest who
  declined (no chat button, no location block).
- Location: not said yet (with a quiet reminder), being edited, saved; location permission denied.
- Suggestions: none asked yet; three places; nothing suitable found; a problem asking.
- A plan with no guests yet; a plan with 30 guests (the list scrolls inside the rail, 8 visible).
- Cancelled and over: everything read-only, a badge by the title, actions gone.
- Live: someone answers - their badge changes without a reload.
- Not found: an empty state with a button "My plans". Loading: a skeleton of both columns.

## Adaptation

- 1024: the rail goes under the main column as sections; "People" becomes a two-column list.
- 390: one column in this order - header, answer bar, summary, people (collapsed to the avatar
  stack and counts, opening a sheet), where to go (places scroll sideways), location, invite,
  leave or cancel. "Open the chat" is pinned to the bottom.

## Prompt

Design this page as described inside the shell, light and dark, at 1440, 1024 and 390. Show it
four times at 1440 for the four kinds of viewer, and the states of location and suggestions as
separate fragments. Use a plan with three dates, six guests in mixed statuses and three suggested
places.
