# 0008. Test with Vitest

- Date: 2026-10-20
- Status: Accepted

## Context

The project had no test: `npm test` only printed an error. The game could not be won, since
every move threw `this.checkAlignment is not a function` after placing its token
([#11](https://github.com/AIssoufi/connect-four/issues/11)), and nothing had caught it.

## Decision

In [#21](https://github.com/AIssoufi/connect-four/pull/21):

- Vitest 5 runs the tests, with `npm test` as `vitest run`. `engines.node` takes the range of
  Node.js versions that Vitest supports.
- The engine, its helpers and the `/game/play` route get tests. The route tests run Express on a
  free port and fail if an error reaches its error middleware.
- `app/engine.js` exports the `Engine` class, so that each test builds its own game, with no
  Express dependency.

## Alternatives considered

Not recorded: #21 names no other test runner.

## Consequences

| Figure | Before (`624de1d`) | After (`4ff74d5`) |
| --- | --- | --- |
| Tests | 0 | 105, in 5 files |
| Vulnerabilities of `npm audit` | 36 (6 low, 10 moderate, 18 high, 2 critical) | 36 (6 low, 9 moderate, 19 high, 2 critical) |

The tests come from `npx vitest run` after `npm ci --ignore-scripts` on Node.js 24.22.0, in a
copy of `21b9efb` made with `git archive`, which has the same tests as `4ff74d5`. The
vulnerabilities come from `npm audit --package-lock-only` with npm 12.2.0, run on 2026-10-20.

- A game can be played to a win or a draw, and a broken rule answers `400` without changing it.
- npm 12 rewrote `package-lock.json` from version 1 to version 3.
- The tests ran only by hand until the CI of
  [0001](0001-check-pull-requests-in-github-actions.md).
