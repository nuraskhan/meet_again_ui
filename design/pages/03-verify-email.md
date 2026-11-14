# 03. E-mail confirmation

Route `/verify-email?token=…`. Code: `src/views/VerifyEmailView.vue`. Opened from the letter,
signed in or not, possibly on another device.

## Purpose

Says in one glance whether the address is confirmed, and gives the next step.

## Layout, desktop (1440)

A single centred block, 440 px wide, in the middle of an otherwise empty page; the wordmark at the
top left.

- A 48 px line icon in a soft circle: `check` on success-soft, `x` on danger-soft.
- A title and one sentence.
- One button.

## Elements and states

| State | `data-tst-id` | Title | Sentence | Button |
|-------|---------------|-------|----------|--------|
| Checking | `verify-email` | none | A skeleton of the block; no text flashes | none |
| Confirmed | `verify-email-ok` | "Your e-mail is confirmed" | "You will get reminders about your plans." | Primary: "Go to my plans" (or "Log in" when not signed in) |
| Failed | `verify-email-failed` | "This link does not work" | "It may be old or already used. Ask for a new one from the banner in the application." | Neutral: "Go to my plans" (or "Log in") |

## Adaptation

The same block at every width; on a phone the button is full width.

## Prompt

Design this page in its three states, light and dark, at 1440 and 390.
