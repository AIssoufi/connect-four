# Tooling

[Tooling][tooling] gives the tools shared by every repository, their versions on the machine and
how they hand over to each other. This page gives what this repository adds. The versions of the
project tools come from `pnpm-lock.yaml` and `package.json`.

| Tool | In this repository |
| --- | --- |
| [Claude Code][claude-code] | Runs `MASTER-C4`, the `C4-<n>` workers and their reviewers |
| [cmux][cmux] | One workspace per agent, titled `MASTER-C4` or `C4-<n>`, and their messages |
| [Worktrunk][worktrunk] | A worktree per ticket from `origin/master`, set up by `.config/wt.toml` |
| [GitHub][github] | The `C4-` autolink, Project 12 and the `Protect master` ruleset |
| commitlint 21.2.3, Husky 9.1.7 | Conventional Commits and the `Refs: C4-<n>` trailer |
| GitHub Actions | `ci.yml` (lint, tests), `commit-messages.yml` (commitlint) and `live-check.yml` (hourly and daily checks of the live site) |
| Dependabot | Weekly pull requests for npm and GitHub Actions, of releases at least 7 days old |
| pnpm 12.14.0, Node.js 24 | Install from the frozen lockfile, Node.js from `.nvmrc` |
| Vitest 5.0.4, ESLint 10.12.0 | Tests, and lint of the code |
| Redocly CLI 2.62.2 | Lint of the OpenAPI document |
| Wrangler 4.149.0, Workers Builds | `pnpm dev` locally, and the deployment of `master` |

## Worktrunk project hooks

`.config/wt.toml` holds one hook, `pre-start`, which runs when `wt switch --create` makes a
worktree, before any later step:

- **`install`** runs `pnpm install --frozen-lockfile`. Its `prepare` script sets up the Husky
  hooks, so the first commit of the worktree already gets the `Refs: C4-<n>` trailer and the
  commitlint check. The frozen lockfile installs the versions it records, and fails rather than
  change them.

Worktrunk asks once to approve a project command, and again whenever it changes: `--yes` skips the
question, and `wt hook pre-start` runs the hook again in an existing worktree.

No port is assigned per worktree: `pnpm dev` serves on 8787, and when 8787 is taken, `wrangler dev`
serves on another free port (8788 for the second server), so several worktrees run it at once.

## Commit hooks and the ticket reference

- `.husky/prepare-commit-msg` runs `scripts/commit-message/prepare-commit-msg.js`: on a branch
  named after a ticket, it adds `Refs: C4-<n>` to a message that has none.
- `.husky/commit-msg` runs commitlint with `commitlint.config.js`, which adds a rule for that
  trailer to the conventional config. The CI checks each commit of a pull request the same way,
  and its title with `commitlint.pr-title.config.js`, since a title carries no trailer.
- Merge commits and the commits of Dependabot and release-please are not checked.

## Cloudflare

`wrangler.jsonc` describes the Worker, its files, its Durable Objects and the custom domain
`connect-four.issoufi.fr`. Workers Builds deploys each new commit of `master` and reports a
`Workers Builds: connect-four` check on it. The README gives the manual deployment.

[tooling]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/tooling.md
[claude-code]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/tooling-claude-code.md
[cmux]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/tooling-cmux.md
[worktrunk]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/tooling-worktrunk.md
[github]: https://github.com/AIssoufi/AIssoufi/blob/main/docs/agentic-architecture/tooling-github.md
