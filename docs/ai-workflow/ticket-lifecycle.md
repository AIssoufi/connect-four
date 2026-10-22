# Life of a ticket

[Life of a ticket][ticket-lifecycle] gives the steps shared by every repository. In this
repository, a ticket goes through these steps.

1. **Issue.** The master creates a GitHub issue in English and adds it to Project 12, with a
   *Status* (*Todo*, *In Progress*, *In Review*, *Done*) and a *Priority* from P0 to P3.
2. **Start.** The worktree is named `connect-four.C4-<n>`, on the branch `C4-<n>` taken from
   `origin/master`. The repository has no Worktrunk project hooks, so the worker installs the
   dependencies itself with `pnpm install --frozen-lockfile`, which also sets up the Git hooks.
   The ticket moves to *In Progress*.
3. **Commits.** Conventional Commits, each with a `Refs: C4-<n>` trailer in its last paragraph.
   On a branch named after a ticket, the `prepare-commit-msg` hook adds that trailer. On every
   branch, the `commit-msg` hook runs commitlint (see the README, *Commit messages*). The worker
   rebases on `origin/master` rather than merging it.
4. **Review** before the pull request: see [Reviews](reviews.md).
5. **Pull request** against `master`, with `Closes #<n>`; the ticket moves to *In Review*. Its
   title is a Conventional Commit too, which commitlint checks.
6. **Checks.** GitHub Actions runs `Lint and test`, `Test on Node.js 22`, `Test on Node.js 26` and
   `Check the commit messages and the title`. No preview is deployed for a pull request
   ([#35](https://github.com/AIssoufi/connect-four/issues/35)).
7. **Merge.** The master checks the pull request on GitHub and merges it with a merge commit
   whose body is `Closes #<n>`. The `Protect master` ruleset requires the first three checks to
   pass on a branch up to date with `master`, and refuses force pushes and the deletion of
   `master`.
8. **Deployment.** Workers Builds deploys the new `master` to <https://connect-four.issoufi.fr>
   at once: a merge is a release.

[ticket-lifecycle]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/ticket-lifecycle.md
