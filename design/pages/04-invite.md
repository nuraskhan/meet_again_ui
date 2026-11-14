# 04. Invitation opened by a link

Route `/i/:shareToken`. Code: `src/views/InviteView.vue`. Public: anyone with the link reads it;
accepting needs an account.

## Purpose

The first thing a new person ever sees of the product. It must look like a personal invitation,
be readable in five seconds, and make "I'm coming" one obvious button.

## Data shown

Who invites (name, avatar); the plan summary (activity, title, note, proposed dates, distance,
price range); how many are coming and their faces; the status of the plan.

## Layout, desktop (1440)

No shell. The wordmark at the top left; "Log in" at the top right for a visitor.

A centred card, 560 px wide, `--r-l`:

- Top: avatar 64 of the inviter and the line "**Aigerim** invites you".
- The plan title in `--t-title-1`.
- The note, if any, as text.
- The plan summary rows with icons: dates (every proposed date as its own line), distance, price.
- "Who is coming": an avatar stack and "5 people are coming".
- The action area, a full-width block at the bottom of the card:
  - Signed in: primary "I'm coming".
  - Visitor: primary "Create account to answer" and outline "Log in"; a small line under them:
    "You need an account so the others know who is coming."

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `invite` | The card |
| `invite-crowd` | Who is coming |
| `invite-accept` | "I'm coming" |
| `invite-register`, `invite-login` | The two buttons of a visitor |
| `invite-cancelled` | The note that the plan is called off or over |
| `invite-missing` | The "no such invitation" state |

## States

- Visitor; signed in; signed in and already coming (the action area says "You are coming" with a
  neutral button "Open the plan").
- The plan is cancelled or over: the card is dimmed, a badge beside the title, no action, a
  sentence instead.
- The plan is full: no action, "This plan is full."
- Not found: an empty state - "This invitation does not exist", a button to the welcome page.
- Loading: a skeleton of the card.

## Adaptation

- 390: the card becomes the page (no border, full width); the action area is pinned to the bottom
  of the screen.

## Prompt

Design this page as described, light and dark, at 1440 and 390. Show: visitor, signed in, already
coming, cancelled, not found, loading. Use a plan with three proposed dates and a two-line note.
