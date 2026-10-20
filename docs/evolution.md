# Evolution

How the stack of the project changed, oldest step first, with the figures measured before and
after each step. Each step links its record in [decisions/](decisions/).

## 2026: lint and tests on every pull request

The project had tests but no CI, and its lint failed. GitHub Actions now lints and tests every
pull request, on the Node.js version of `.nvmrc`, on the oldest one that `engines` accepts and
on the newest one released.

| Figure | Before | After |
| --- | --- | --- |
| Checks on a pull request | none | lint, and 105 tests on Node.js 24, 22 and 26 |
| Problems of `npx eslint .` | 42 (39 errors, 3 warnings) | 0 |
| Duration of the CI on a pull request, warm npm cache | no CI | 20 s |

Decision: [0001. Check every pull request in GitHub Actions](decisions/0001-check-pull-requests-in-github-actions.md)
