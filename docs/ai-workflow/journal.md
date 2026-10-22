# Journal

The journals of the agents, who was who and who did what, live outside the repository: see
[Traceability][traceability] and, for the lessons learned from mistakes, [Continuous
improvement][continuous-improvement]. The repository keeps its own record of the work.

## In Git and on GitHub

- **The ticket in every name**: the branch `C4-<n>`, the `Refs: C4-<n>` trailer of each commit,
  and `Closes #<n>` in the pull request. The `C4-` autolink turns `C4-<n>` in a commit message,
  an issue or a pull request into a link to the issue.
- **One merge commit per pull request** on `master`, whose body is `Closes #<n>` (`Refs #<n>` for
  a follow-up, free text for Dependabot), so `git log --merges --reverse` lists the pull requests
  in the order they shipped.
- **Project 12** keeps the status and the priority of each ticket.

## In the docs

- [docs/decisions/](../decisions/) holds one numbered record per decision: its context, the
  decision, the alternatives considered and the consequences. A decision taken before the
  agents, such as Express 4 in 2019, has a record written afterwards from the history.
- [docs/evolution.md](../evolution.md) tells how the stack changed since the first commit, one
  step per change, with figures measured before and after.
- A change of tool or of architecture adds its record and its step in the same pull request,
  as the move to pnpm did. A change of practice, such as these pages, changes no tool and has no
  record.

[traceability]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/traceability.md
[continuous-improvement]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/continuous-improvement.md
