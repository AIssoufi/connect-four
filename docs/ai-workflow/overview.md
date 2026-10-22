# How agents work on this repository

Since October 2026, Claude Code agents maintain this repository: a master turns its problems into
GitHub issues, and one worker per issue implements it, has it reviewed and opens the pull request.
The setup is shared with the other repositories of the owner, and the [agentic architecture
docs][agentic-architecture] of the GitHub profile describe it. These pages give only what is
specific to this repository.

## This repository at a glance

| Item | Value |
| --- | --- |
| Ticket key | `C4-`, an autolink: `C4-18` in a commit links to issue 18 |
| Base branch | `master`, with no `develop`: every pull request targets it |
| Deployment | Workers Builds deploys `master` to <https://connect-four.issoufi.fr> on each merge |
| Board | GitHub Project 12, *connect-four roadmap*, with a *Status* and a *Priority* field |
| Agents | the master `MASTER-C4`, and one worker per ticket, named after it, such as `C4-18` |
| Records | [docs/decisions/](../decisions/) and [docs/evolution.md](../evolution.md) |

## Pages

- [Roles](roles.md): who does what here.
- [Life of a ticket](ticket-lifecycle.md): from an issue to a deployed merge.
- [Reviews](reviews.md): the reviews, and the checks that the repository enforces itself.
- [Journal](journal.md): where the history of the work is recorded.
- [Tooling](tooling.md): the tools and their versions in this repository.

[agentic-architecture]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/README.md
