# 0001. Check every pull request in GitHub Actions

- Date: 2026-10-20
- Status: Accepted

## Context

The project had no continuous integration: no workflow, and `gh run list` returned no run. The
105 Vitest tests added in [#21](https://github.com/AIssoufi/connect-four/pull/21) and ESLint ran
only when a developer thought of it, so a change could be merged with a failing test.

`package.json` had no `lint` script, and `npx eslint .` failed with 42 problems (39 errors and 3
warnings), all in `public/main.js`: `.eslintrc.yml` declared only the Node.js environment, so the
browser globals of the page script were undefined, and the script broke several Airbnb rules.

## Decision

In [#22](https://github.com/AIssoufi/connect-four/pull/22):

- An ESLint override lints `public/` as a browser script, and `public/main.js` is fixed without
  changing its behavior.
- `npm run lint` runs ESLint on the whole repository, and fails on any error or warning.
- `.github/workflows/ci.yml` runs on every pull request and every push to `master`. One job runs
  `npm ci`, `npm run lint` and `npm test` on the Node.js version of `.nvmrc` (24, an LTS
  release). Two more jobs run `npm ci` and `npm test` on Node.js 22 and 26: the oldest major
  release that `engines` accepts and the newest one released.
- `.github/dependabot.yml` checks npm and GitHub Actions every week, for releases at least seven
  days old: one pull request for the npm minor and patch updates, and one for the GitHub Actions
  updates. It ignores the npm major updates, which go through tickets: Express and Swagger in
  [#13](https://github.com/AIssoufi/connect-four/issues/13), ESLint in
  [#15](https://github.com/AIssoufi/connect-four/issues/15).

## Alternatives considered

- **Git hooks only**, such as a pre-push hook: they run on the developer's machine, can be skipped
  with `--no-verify`, and do not exist for a contributor who has not installed them.
- **Another CI service**, such as Travis CI or CircleCI: it needs an outside account and secrets,
  while GitHub Actions comes with the repository host.
- **Lint on every Node.js version**: the lint result does not depend on Node.js, so the other
  versions run the tests only.

## Consequences

| Figure | Before | After |
| --- | --- | --- |
| Checks on a pull request | none | lint, and 105 tests on Node.js 24, 22 and 26 |
| Problems of `npx eslint .` | 42 (39 errors, 3 warnings) | 0 |
| Duration of the CI on a pull request | no CI | 20 s |

The problems are counted by `npx eslint .` on the base commit and on the branch. The duration of
the CI goes from the creation to the last update of one run of the three jobs, with a warm npm
cache (`gh run view <id> --json createdAt,updatedAt`). A run that fails on purpose, with a lint
error and a failing test, failed at the `Lint` step and at the `Run the tests` step.

- Every change is linted and tested before its merge, and a failing check shows on the pull
  request.
- A pull request now waits for the CI, and Dependabot opens update pull requests every week.
- Left to do: making the checks required by a branch protection rule of `master`, the move to
  pnpm and ESLint 10 ([#15](https://github.com/AIssoufi/connect-four/issues/15)), and commitlint
  in the CI ([#20](https://github.com/AIssoufi/connect-four/issues/20)).
