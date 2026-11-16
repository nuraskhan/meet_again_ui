# Hangelo UI

## Git

Before commit and push, please check that main is up to date.

## Releases: a card for every deploy

**Applies to every deploy of the web application or of the server** - whenever a re-deploy is asked
for, of either or both.

Each deploy is one card in `RELEASES.md` of this repository: the version, when it was applied, the
commits, and the batch of changes it carried. The page for developers (`/dev`) shows the newest applied card
("Latest release") and links to `RELEASES.md` on GitHub for the rest; it
reads the file itself (`src/lib/releases.ts`), so the format is fixed.

What to do when a re-deploy is asked for, in this order:

1. Write the card at the top of `RELEASES.md` (or finish the one that stands there as
   `Applied: pending`): everything that changed for people since the last card, in both
   repositories.
2. Give it the next version: the minor number grows with a batch that adds or changes what people
   can do, the patch number with a batch of fixes only.
3. Put the moment of the deploy into `Applied:`, in UTC, and the commits into `Web:` /
   `Server:` (`unchanged` for a repository that is not deployed this time).
4. Commit the card, and only then deploy. **The web application is deployed every time**, also when
   only the server changed: otherwise the page for developers keeps showing the old card.

Right:

```markdown
## v0.3.0
Applied: 2026-11-20 09:15 UTC
Web: 1a2b3c4 · Server: unchanged

### Added
- Saved crews: invite the same group again in one tap.

### Fixed
- The calendar no longer shows a plan on the wrong day near midnight.
```

Wrong:

```markdown
## Release 3 (20 Nov)            <- no version in the fixed form: the page for developers does not see the card
- refactor EventQuery, bump deps  <- the code's words, under no heading; nobody outside can read it
```

Also wrong: deploying first and writing the card "later"; a card that stays `Applied: pending`
after its deploy (the page for developers skips pending cards and shows the previous one as the latest);
a second list of releases anywhere else.

**Why.** People who use the product, and developers who want to help, ask the same thing: what
changed, and when did it reach me. Before this rule the answer was only in commit messages of two
repositories. One list, written at the moment of the deploy, is the only one that stays true: a
card written afterwards is written from memory, and a copy kept for the page for developers is forgotten
on the first busy day.
