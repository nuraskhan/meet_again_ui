# 00. Shell: the frame of every signed-in page

Code: `src/views/AppShell.vue`, `src/components/VerifyEmailBanner.vue`, toasts in `src/App.vue`.

## Purpose

Says where the person is, takes them anywhere in one click, and shows what is new for them.

## Layout, desktop (1440)

- **Sidebar**, 248 px, full height, `--c-surface-soft`, no shadow, a 1 px line on its right.
  - Top: the wordmark "hangelo" in `--t-title-3`, lower case, 24 px from the edges.
  - A primary button "New plan" (icon `plus`), full width of the sidebar. This is the one accent
    button of the shell; a page that has its own main action shows it as neutral.
  - Navigation items: Feed, Plans, Friends, Chats, Notifications. Notifications carries the count
    pill when something is unread.
  - Bottom: the account row - avatar 32, the name, a line "View profile"; leads to the profile.
- **Content**: column of at most 760 px, centred in the remaining width, 32 px top padding.
  Each page starts with its title (`--t-title-1`) and, on the same line at the right, its actions.
- **Banner** "Confirm your e-mail" sits at the top of the content column, above the title, while
  the address is not confirmed. Warning-soft background, icon, one sentence with the address, a
  quiet button "Send again"; after sending, the button is replaced by "Sent. Check your inbox."
  Not shown on the chat page.
- **Toasts**: bottom right, stacked, newest at the bottom.

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `nav-feed`, `nav-plans`, `nav-friends`, `nav-chats` | Navigation items |
| `nav-notifications` | The Notifications item |
| `nav-notifications-unread` | Its count pill; "9+" beyond nine |
| `nav-profile` | The account row |
| `verify-banner`, `verify-banner-send`, `verify-banner-note` | The banner, its button, the note after sending |
| `toast` | A toast |

## States

- Navigation item: default, hover, active, focus.
- Bell: nothing unread; 1; 9+.
- A notification arriving live: the count changes and a toast with its sentence appears.
- Connection to the server lost: no indicator (the page keeps working and catches up by itself).

## Adaptation

- 1024: the sidebar is 72 px - icons only with tooltips, "New plan" becomes an icon button, the
  account row is the avatar alone.
- 390: no sidebar. A top bar with the page title and, at the right, the bell with its pill and the
  avatar. A bottom tab bar: Feed, Plans, New plan (centre, the accent one), Friends, Chats.

## Prompt

Design the shell of the application as described: the sidebar at 1440, its collapsed form at 1024,
and the top bar plus bottom tab bar at 390; light and dark. Show the content area as an empty
placeholder with a page title. Show the bell in its three states, the e-mail banner in both of its
states, and one toast. Follow the designer prompt and the design system exactly.
