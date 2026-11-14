# 02. Log in and create account

Routes `/login`, `/register`. Code: `src/views/AuthView.vue`. One screen, two modes.

## Purpose

Lets a person in with the fewest fields. Many arrive here from an invitation link and must get
back to it afterwards.

## Layout, desktop (1440)

Two halves.

- **Left half**: the form, 400 px wide, vertically centred.
  - The wordmark, small, at the top; it leads to the welcome page.
  - Title: "Log in" or "Create your account".
  - Fields. Register: Name, E-mail, Password (hint: at least 8 characters; a "show" icon button).
    Log in: E-mail, Password.
  - The error, when there is one, in a danger-soft block above the button.
  - Primary button, full width: "Log in" or "Create account".
  - Under it one line: "New here? Create an account" or "Have an account? Log in".
  - When the person came from an invitation: a line above the title, "Sign in to answer the
    invitation".
- **Right half**: `--c-surface-soft`, with one quiet composition of product components (the same
  family as on the welcome page), no text.

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `auth-form` | The form |
| `auth-name` | Name (register only) |
| `auth-email`, `auth-password` | E-mail, Password |
| `auth-error` | The error block |
| `auth-submit` | The button |

## States

- Empty; filled; a field with a validation error; the button while sending (label replaced by a
  spinner, the form disabled).
- Errors from the server: wrong e-mail or password; this e-mail is already registered; the server
  cannot be reached.

## Adaptation

- 1024: the right half narrows to a third.
- 390: the form alone, full width with 16 px margins, the title at the top, the button above the
  keyboard.

## Prompt

Design both modes of this screen as described, light and dark, at 1440 and 390 (1024 in one
theme). Show: empty, a validation error on a field, a server error, sending.
