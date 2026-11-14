# Design of Hangelo

Documents only: nothing here is loaded by the application. They describe how every page should
look, written to be pasted into an AI design or code tool.

## Decisions these documents rest on

| Question | Decision |
|----------|----------|
| What is delivered | A designer prompt and a written spec per page; no mockups yet |
| Who reads the prompt | An AI design/code tool |
| Screen | Desktop first; tablet and phone are adaptations |
| Look | Light and dark, following the system; calm structure, photo-led on the feed and profiles |
| Colour | Black and white, plus one accent: electric blue |
| Audience and voice | Any adult; plain, polite, no slang, no emoji |
| Type | The system font only |
| References | BeReal, Apple and similar - for principles, never copied |

## Files

| File | What it is |
|------|------------|
| `01-DESIGNER-PROMPT.md` | The master prompt: product, principles, rules, what to deliver. Paste it first, always. |
| `02-DESIGN-SYSTEM.md` | Tokens (colour, type, space, radius, depth, motion) and every shared component. Paste it second, always. |
| `pages/00-shell.md` | The frame of every signed-in page: navigation, bell, account. |
| `pages/01-…` to `pages/13-…` | One page each: purpose, data, layout, states, and a ready prompt at the end. |

| Page file | Route | View in `src/views` |
|-----------|-------|---------------------|
| `01-welcome.md` | `/` | `WelcomeView` |
| `02-auth.md` | `/login`, `/register` | `AuthView` |
| `03-verify-email.md` | `/verify-email` | `VerifyEmailView` |
| `04-invite.md` | `/i/:shareToken` | `InviteView` |
| `05-feed.md` | `/feed` | `FeedView` |
| `06-plans.md` | `/plans` | `PlansView` |
| `07-plan-new.md` | `/plans/new` | `PlanNewView` |
| `08-plan.md` | `/plans/:eventId` | `PlanView` |
| `09-friends.md` | `/friends` | `FriendsView` |
| `10-chats-and-chat.md` | `/chats`, `/chats/:chatId` | `ChatsView`, `ChatView` |
| `11-notifications.md` | `/notifications` | `NotificationsView` |
| `12-profile.md` | `/profile` | `ProfileView` |
| `13-person.md` | `/people/:userId` | `PersonView` |

## What the design asks for that the application does not do yet

The specs describe the pages as they should be. These parts need code that does not exist; a
design that shows them is right, the application has to catch up.

| Page | Not there yet |
|------|---------------|
| Shell | Sidebar and bottom tab bar (now a top bar); "New plan" in the navigation; line icons instead of emoji |
| Auth | The "show password" button; the line about coming from an invitation |
| Invite | The "already coming" and "full" forms of the action area |
| Feed | The inviter's photo as the card header; the "Full" label |
| Plans | Past plans collapsed behind a row; the "You organise" badge |
| New plan | The live preview; the search above the friends list |
| Plan | Counts by status above the people list; live change of a badge is there, the rest of the rail layout is new |
| Friends | The menu on a friend row (now a button) |
| Chats | Two panes on desktop; day dividers; the "New messages" pill; a message shown before it is confirmed, and "Try again" |
| Notifications | Grouping by day; the icon of the kind on the avatar |
| Profile | Upload progress on the tile; "Save" enabled only after a change |
| Person | The friend actions on the page (adding a friend is done on the Friends page now); arrow keys in the photo viewer |

## How to use

1. Paste `01-DESIGNER-PROMPT.md`, then `02-DESIGN-SYSTEM.md`, into the tool.
2. Paste `pages/00-shell.md` (needed for every signed-in page).
3. Paste one page file and send. The last section of each page file is the request itself.
4. One page per request. Ask for both themes and the listed states.

## Rules for whoever changes these files

- A decision is changed in the table above and in `02-DESIGN-SYSTEM.md`, never only in one page.
- A page file names its elements by the `data-tst-id` the application already uses, so a design can
  be matched to the code element by element. A new element gets a new id in the same style.
- When a page of the application changes, its file here changes in the same commit.
