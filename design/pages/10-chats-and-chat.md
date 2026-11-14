# 10. Chats and a chat

Routes `/chats` and `/chats/:chatId`. Code: `src/views/ChatsView.vue`, `src/views/ChatView.vue`.
Every chat belongs to a plan and carries its title. Messages arrive live.

## Purpose

Agreeing on the details. Reading comes first, writing is one field away.

## Layout, desktop (1440): two panes

On desktop the two routes are one screen: the list at the left (360 px), the open chat at the
right. `/chats` shows the list with an empty right pane ("Choose a chat").

**List pane**

- Title "Chats".
- Rows, 72 px: the activity icon of the plan in a soft circle, the plan title, the number of
  members and the date the chat started; the open one has an accent-soft background.

**Chat pane**

- Header: the plan title (`--t-title-3`), the members' names in one line cut with an ellipsis, an
  avatar stack, and at the right an outline button "Open the plan".
- Messages, the pane scrolls; the newest at the bottom; a short conversation sits at the bottom.
  - Others: avatar 32 at the left on the first message of a run, the name above it in
    `--t-caption`, bubbles in `--c-surface-soft`.
  - Own: at the right, `--c-accent` bubbles, white text, no avatar and no name.
  - The time under the last bubble of a run; a centred date divider between days.
  - A quiet button "Earlier messages" at the top when there are more.
- Composer: a text area that grows up to five lines, "Write a message", and a round primary icon
  button `arrow-up`. Enter sends, Shift+Enter makes a new line (say so in a hint on desktop).

## Elements

| `data-tst-id` | Element |
|---------------|---------|
| `chat-row` | A row of the list |
| `chats-empty` | The list's empty state |
| `chat-messages` | The scrolling area |
| `chat-message` | A message |
| `chat-empty` | "Nobody has written yet" |
| `chat-form`, `chat-input`, `chat-send` | The composer |
| `chat-missing` | "This chat does not exist, or you are no longer in it" |

## States

- A conversation of four people with runs, a day divider and long and one-word messages.
- A new message arriving while reading older ones: a pill "New messages" above the composer
  instead of jumping.
- Empty chat; sending (the bubble appears at once, slightly transparent until confirmed); a
  message that failed to send (a danger icon and "Try again").
- No chats at all: "No chats yet", "A chat appears with every plan you are part of."
- Chat missing; loading (skeleton bubbles).

## Adaptation

- 1024: the list narrows to 300 px.
- 390: one pane at a time. The list is the page; a chat opens full screen with a back arrow in its
  header, the composer above the keyboard, and no bottom tab bar.

## Prompt

Design both panes as described inside the shell, light and dark, at 1440 and 390 (1024 in one
theme). Show: the conversation, the "new messages" pill, the empty chat, a failed message, no
chats, chat missing.
