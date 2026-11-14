# 07. New plan

Route `/plans/new`. Code: `src/views/PlanNewView.vue`.

## Purpose

Writing an invitation in under a minute. Choosing the activity fills in the rest; the person only
changes what they want.

## Layout, desktop (1440)

Two columns inside a 960 px content area: the form (left, 560 px) and a live preview (right,
sticky).

**Form**, as sections with a small title each and 32 px between them:

1. **What** - a grid of activity tiles (icon and name), one selected. Choosing one fills the
   title, distance and price below; a quiet line says so: "Filled in for you - change anything."
2. **Title** - a field. **Note** - a text area, optional.
3. **When** - a list of date-and-time rows, each with a remove icon button; a quiet button
   "Add another date". A hint: "Offer several and let people choose."
4. **How far** - a range of two numbers in miles (from, to).
   **How much** - a range of two numbers (from, to) per person.
5. **Who** - a segmented control: "Only people I invite" / "Everyone".
   - "Only people I invite": the friends list with a checkbox, avatar and name on each row, and a
     search field above it when there are more than eight. A hint under it: "You will also get a
     link to send to anyone."
   - "Everyone": a line explaining that the plan appears in the feed and anyone can join; the
     friends list stays, to invite some directly.
6. The error block when there is one, then the primary button "Send invitation" and a quiet
   "Cancel".

**Preview**: the invitation as the guests will see it (the card of page 04, smaller), changing as
the form is filled. Title above it: "This is what they will see."

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `plan-new-form` | The form |
| `plan-new-type-<TYPE>` | An activity tile |
| `plan-new-title`, `plan-new-note` | Title, Note |
| `plan-new-when-<n>`, `plan-new-when-add` | A date row, "Add another date" |
| `plan-new-distance-min`, `plan-new-distance-max` | Distance range |
| `plan-new-price-min`, `plan-new-price-max` | Price range |
| `plan-new-private`, `plan-new-public` | The two options of "Who" |
| `plan-new-friend-<id>` | A friend's row |
| `plan-new-link-hint` | The hint about the link |
| `plan-new-error` | The error block |
| `plan-new-send` | "Send invitation" |

## States

- Fresh (nothing chosen); a type chosen and filled; three dates; "Everyone"; no friends yet (the
  list replaced by "You have no friends here yet. Send the link after creating the plan.").
- Validation: a date in the past, "to" smaller than "from", no title.
- Sending.

## Adaptation

- 1024: the preview goes under a "Preview" button that opens it in a dialog.
- 390: one column; the tiles in a grid of three; the send button pinned to the bottom.

## Prompt

Design this page as described inside the shell, light and dark, at 1440 and 390 (1024 in one
theme). Show: fresh, filled with three dates and four of six friends ticked, the "Everyone"
option, validation errors, sending.
