# Roles

[Roles][roles] and [Overview][overview] describe the roles, their sub-agents and their messages.
In this repository:

| Role | Name | Here |
| --- | --- | --- |
| Owner | | Decides; sees the before and after screenshots of a layout change |
| Master | `MASTER-C4` | Works in the main checkout on `master`, keeps Project 12, merges |
| Worker | `C4-<n>` | Works in its own worktree on the branch `C4-<n>`, never merges |
| Dependabot | `app/dependabot` | Not an agent: weekly pull requests for npm and GitHub Actions |

- A master never implements a ticket, and a worker never merges: each pull request is checked by
  an agent that did not write it.
- A worker that finds something outside its ticket reports it to the master, which searches the
  open issues and creates one if none covers it.
- Dependabot proposes no major npm update (`.github/dependabot.yml`): each one goes through its own
  ticket, as ESLint 10 did.

[roles]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/roles.md
[overview]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/overview.md
