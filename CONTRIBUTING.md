# Contributing to Hangelo

The code of Hangelo is public and anyone is welcome to help: report a bug, propose an idea, or send a
change. This is the web application; the server lives in
[meet_again](https://github.com/nuraskhan/meet_again).

## Report a bug

[Open an issue](https://github.com/nuraskhan/meet_again_ui/issues/new) and say:

1. what you did, step by step;
2. what you expected;
3. what happened instead (a screenshot helps);
4. where: the browser and whether it was a phone or a computer.

Not sure which repository a bug belongs to? Open it in
[meet_again_ui](https://github.com/nuraskhan/meet_again_ui/issues/new): it will be moved if needed.

**A security problem** (a way to see or change somebody else's data) is not for a public issue:
write to the maintainer privately first.

## Propose an idea

Open an issue too, and describe the situation you were in, not only the feature you want: the
situation is what tells whether the feature is the right answer.

## Send a change

1. Look through the [open issues](https://github.com/nuraskhan/meet_again_ui/issues), or open one for what you
   want to do, so nobody does the same work twice. For anything bigger than a small fix, wait for
   an answer there before writing code.
2. Fork the repository and make a branch from `main`.
3. Make the change. Keep it to one thing: a pull request that does one thing is reviewed quickly.
4. Check it:
   - `npm run build` passes (it also checks the types);
   - the page works at a phone width as well as on a wide screen;
   - new elements a test would look for carry a `data-tst-id`.
5. Open a pull request into `main` and say what it changes and why.

**Every pull request is reviewed by the maintainer before it is merged.** Nothing goes in
unreviewed, and a review can ask for changes: that is about the code, never about you.

## How the project is run

Run instructions are in [README.md](README.md). The rules the code follows, each with its reason,
are in [CLAUDE.md](CLAUDE.md) of the server repository too.
