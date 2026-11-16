# Releases

Every deploy of Hangelo is one card here: its version, when it was applied, and the batch of
changes it carried - the web application and the server together, because people meet them as one
product. The newest card is on top. The welcome page shows the newest applied card and links here
for the rest.

The format is fixed, because the welcome page reads this file (`src/lib/releases.ts`):

- a card begins with `## v<major>.<minor>.<patch>`;
- the next line is `Applied: <YYYY-MM-DD HH:MM> UTC`, or `Applied: pending` for a batch that is
  written but not deployed yet (the welcome page skips a pending card);
- then `Web: <commit> · Server: <commit>`: the commit of each repository that was deployed, or
  `unchanged` for the one that was not;
- then the changes, under `### Added`, `### Changed`, `### Fixed`, `### Removed` - only the
  headings that have something under them, one `- ` line per change, in the words of a person who
  uses the product, not of the code.

The version: the minor number grows with a batch that adds or changes what people can do, the patch
number with a batch of fixes only. The rule for when a card is written is in `CLAUDE.md`.

## v0.4.0
Applied: 2026-11-16 08:28 UTC
Web: bfa294e · Server: d3d5678

### Changed
- The e-mail is confirmed by a six-digit code from the letter, typed right after registering or logging in. The link in the letter still works too.
- An account with an unconfirmed e-mail is not remembered: after a reload it logs in again, gets a fresh code and types it.

## v0.3.0
Applied: 2026-11-16 08:14 UTC
Web: f4807fa · Server: unchanged

### Changed
- Hangelo has an address of its own: hangelo.brainb.kz. The /hangelo/ part of the address is gone; links that still have it lead to the same place.

## v0.2.0
Applied: 2026-11-16 07:58 UTC
Web: fbf66e7 · Server: da65c91

### Added
- Reply to a message in a chat: the answer shows what it answers, and a click goes to it.
- "Check your inbox": an account is opened only after the e-mail is confirmed.
- A section for developers on the welcome page: report a bug, open issues, contribute, and the latest release.
- A tag by a person's name ("Team"), given by the team.

### Changed
- Hangelo moved to the address /hangelo/ (brainb.kz/hangelo/); old links lead to the new place.
- Calendar: a ruled month with every plan written in its day, in the colour of its activity.
- Notifications are marked as read when the page is opened; the number on the bell stays at zero.
- Reliability below 50% is shown with the 💨 emoji instead of the word "Air".
- Who is an administrator is now set in the database.

### Fixed
- On a phone a double tap no longer zooms the page, and a field no longer zooms in when tapped.

### Removed
- The demo sign-in ("Try demo") and the two demonstration accounts.

## v0.1.0
Applied: 2026-11-15 11:57 UTC
Web: e227ee8 · Server: d415b53

### Added
- Everything before this log was started: plans with friends by link or in the public feed, a chat for every plan, place suggestions and venues, the calendar of busy and free days, reliability, notifications, Hangelo Plus (a demonstration), the welcome page with pricing and the demo video.
