# Reviews

[Reviews and quality][reviews-and-quality] describes the two reviewers, the check of the
master and the auditor. In this repository:

- **Conventions reviewer**: checks every change against the shared skills and rules.
- **Visual tester**: runs the game with `pnpm dev` (`wrangler dev`) and opens the URL that its
  `Ready on` line prints: <http://localhost:8787>, or another free port when another worktree
  holds 8787. It checks the page and the API docs at four widths. It is skipped when a change
  cannot alter what a visitor sees, such as a change of docs, CI or tests alone.
- **The master** reads the checks, the diff and the verdict on GitHub before it merges.

## Guardrails in the repository

A convention that matters is also checked by the repository, so a miss fails the CI rather than
the review:

| Check | Where | Required |
| --- | --- | --- |
| ESLint 10, any warning an error (`pnpm lint:js`) | `Lint and test` | yes |
| Redocly CLI on the OpenAPI document (`pnpm lint:api`) | `Lint and test` | yes |
| Vitest: engine, routes, storage, page, the whole Worker, hooks | `Lint and test` | yes |
| `pnpm audit --audit-level moderate`, also every Monday on `master` | `Lint and test` | yes |
| The same tests on the other LTS lines that `engines` accepts | `Test on Node.js 22`, `24` | yes |
| commitlint on each commit and on the title | `Check the commit messages…` | no |
| commitlint on each new commit, before it is written | the `commit-msg` hook | |

The required checks come from the `Protect master` ruleset, which also wants the branch up to date
with `master` before the merge. The full name of the commitlint check is `Check the commit
messages and the title`.

The audit stands in for the security alerts of Dependabot: GitHub's dependency graph reads only
the first YAML document of the pnpm 12 lockfile, which lists only pnpm and its binaries, so no
alert reaches the repository.

[reviews-and-quality]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/reviews-and-quality.md
