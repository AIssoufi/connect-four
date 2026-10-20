# 0006. Lint with ESLint 6 and the Airbnb base rules

- Date: 2019-12-28, recorded on 2026-10-20
- Status: Superseded by [0003](0003-lint-with-eslint-10-and-a-flat-configuration.md)

## Context

This record is rebuilt from the git history: the commits carry no description, so the reasons
below are only those that the code shows.

Nothing checked the style or the common mistakes of the JavaScript code.

## Decision

In `a297a41` and `db8bcc4` (2019-12-28):

- ESLint 6.8.0 lints the code, with `.eslintrc.yml` extending `airbnb-base`
  (eslint-config-airbnb-base 14 and eslint-plugin-import). eslint-config-airbnb 18, the variant
  for React, is installed too, but nothing uses it.
- `.eslintrc.yml` declares the Node.js environment only.
- `db8bcc4` fixes the problems of `engine.js` and part of those of `index.js`.
- `package.json` gets no `lint` script: ESLint runs with `npx eslint .`.

## Alternatives considered

Not recorded: the commits name no other option.

## Consequences

| Figure | Before | After |
| --- | --- | --- |
| Problems of `npx eslint .` | no linter; 74 (69 errors, 5 warnings) at `a297a41` | 43 (40 errors, 3 warnings) at `db8bcc4` |
| Development packages in `package-lock.json` | 0 (`858fa2b`) | 176 (`db8bcc4`) |
| Vulnerabilities of `npm audit` | 8 (3 low, 4 high, 1 critical) | 33 (6 low, 6 moderate, 18 high, 3 critical) |

ESLint ran with `npx eslint .` after `npm ci --ignore-scripts` on Node.js 24.22.0, in a copy of
each commit made with `git archive`. The packages are the entries of `package-lock.json` with
the `dev` flag. The vulnerabilities come from `npm audit --package-lock-only` with npm 12.2.0,
run on 2026-10-20 against the advisories known that day, not those of 2019.

- `public/main.js` is linted as Node.js code, so its browser globals count as errors: the lint
  never passes, and no script or CI runs it.
- The development tools bring 25 of the 33 vulnerabilities.
