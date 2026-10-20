# 0009. Enforce Conventional Commits with a ticket reference

- Date: 2026-10-20
- Status: Accepted

## Context

Nothing checked the commit messages, and nothing tied a commit to its ticket
([#20](https://github.com/AIssoufi/connect-four/issues/20)). The history mixed messages such as
`update docs` with Conventional Commits.

## Decision

In [#26](https://github.com/AIssoufi/connect-four/pull/26):

- commitlint checks each message with `@commitlint/config-conventional` and a `ticket-reference`
  rule that requires a `Refs: C4-<n>` trailer (`commitlint.config.js`).
- Husky runs it in the `commit-msg` hook. The `prepare-commit-msg` hook adds `Refs: <branch>` on
  a branch named after a ticket, when the message has no `Refs:` line.
- `.github/workflows/commit-messages.yml` checks the commits of each pull request, and its title
  with the same rules but no trailer, unless a bot opened it.
- Merge commits and the commits of Dependabot and release-please are not checked.

## Alternatives considered

Not recorded: #26 names no other tool.

## Consequences

| Figure | Before (`21b9efb`) | After (`7c8630d`) |
| --- | --- | --- |
| Checks of a commit message | none | commitlint, in the `commit-msg` hook and in the CI |
| Tests | 105, in 5 files | 210, in 8 files |

The tests come from `npx vitest run` after `npm ci --ignore-scripts` on Node.js 24.22.0, in a
copy of each commit made with `git archive`.

- A commit without a type, a subject or a `Refs:` trailer is refused, locally and in the CI.
- Editing the title of a pull request runs the title check again, without lint and tests.
