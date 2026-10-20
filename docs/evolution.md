# Evolution

How the stack of the project changed, from its first commit, oldest step first, with the figures
measured before and after each step. Each step says how its figures were measured, and links
its record in [decisions/](decisions/), which gives the details.

The figures of the steps before 2026 were measured in 2026, on a copy of the old commit made
with `git archive`. Their vulnerabilities come from the advisories known on 2026-10-20, not from
those of the time. A figure that cannot be measured on an old commit says "not measured".

## 2019: an Express 4 API and a static page

The first commit holds the rules of Connect Four and an Express 4 server, started on a
developer's machine, that keeps one game in memory, shared by every visitor, with a route to
read it and a `GET` route to play a move. npm installs the dependencies. The next day, the
engine detects the winner, the routes move under `/api/`, and a plain HTML, CSS and JavaScript
page, with no build step, plays through them.

| Figure | Before (`f432fc3`, the first commit) | After (`858fa2b`) |
| --- | --- | --- |
| Ways to play | the two API routes, `/status` and `/play` | the page, or the two API routes under `/api/` |
| Production packages in `package-lock.json` | 50 | 50 |
| Vulnerabilities of `npm audit --omit=dev` | 8 (3 low, 4 high, 1 critical) | 8 (3 low, 4 high, 1 critical) |
| Tests | 0 | 0 |
| Page weight | no page | 4,578 bytes in 3 files |
| Install, lint and startup times | not measured | not measured |

How it was measured: the packages are counted in `package-lock.json`, the vulnerabilities come
from `npm audit --package-lock-only --omit=dev`, and the page weight sums the sizes that
`git ls-tree -l` gives for the files the page loads. No test file exists.

Decision: [0005. Serve the game from an Express 4 API and a static page](decisions/0005-serve-the-game-from-an-express-4-api-and-a-static-page.md)

## 2019: ESLint 6 with the Airbnb base rules

Nothing checked the code. ESLint 6 now lints it with the Airbnb base rules, run by hand with
`npx eslint .`: no script and no CI run it, and it never passes, since the page script is linted
as Node.js code.

| Figure | Before | After (`db8bcc4`) |
| --- | --- | --- |
| Problems of `npx eslint .` | no linter; 74 (69 errors, 5 warnings) on `a297a41`, which adds it | 43 (40 errors, 3 warnings) |
| Development packages in `package-lock.json` | 0 (`858fa2b`) | 176 |
| Vulnerabilities of `npm audit` | 8 (3 low, 4 high, 1 critical) | 33 (6 low, 6 moderate, 18 high, 3 critical) |
| Lint time | not measured | not measured |

How it was measured: `npx eslint .` after `npm ci --ignore-scripts` on Node.js 24.22.0, the
packages counted in `package-lock.json`, and `npm audit --package-lock-only`.

Decision: [0006. Lint with ESLint 6 and the Airbnb base rules](decisions/0006-lint-with-eslint-6-and-the-airbnb-base-rules.md)

## 2020: API docs with swagger-jsdoc

The API was described only in the README, in French. swagger-jsdoc now builds an OpenAPI 3.0
document from comments of the routes, which move to `routes/`, and swagger-ui-express shows it
at `/api/v1`. The project then stays unchanged until 2026.

| Figure | Before (`db8bcc4`) | After (`624de1d`) |
| --- | --- | --- |
| API docs | the README | Swagger UI at `/api/v1` |
| Production packages in `package-lock.json` | 50 | 84 |
| Vulnerabilities of `npm audit --omit=dev` | 8 (3 low, 4 high, 1 critical) | 18 (3 low, 6 moderate, 8 high, 1 critical) |
| Problems of `npx eslint .` | 43 (40 errors, 3 warnings) | 42 (39 errors, 3 warnings) |
| Startup time | not measured | not measured |

How it was measured: as for the two steps above.

Decision: [0007. Document the API with swagger-jsdoc](decisions/0007-document-the-api-with-swagger-jsdoc.md)

## 2026: tests with Vitest

No test existed, and the game could not be won: every move threw an error after placing its
token. The engine is fixed, and Vitest tests the engine and the routes.

| Figure | Before (`624de1d`) | After (`4ff74d5`) |
| --- | --- | --- |
| Tests | 0 | 105, in 5 files |
| Vulnerabilities of `npm audit` | 36 (6 low, 10 moderate, 18 high, 2 critical) | 36 (6 low, 9 moderate, 19 high, 2 critical) |

How it was measured: `npx vitest run` after `npm ci --ignore-scripts`, and
`npm audit --package-lock-only`.

Decision: [0008. Test with Vitest](decisions/0008-test-with-vitest.md)

## 2026: lint and tests on every pull request

The project had tests but no CI, and its lint failed. GitHub Actions now lints and tests every
pull request, on the Node.js version of `.nvmrc`, on the oldest one that `engines` accepts and
on the newest one released.

| Figure | Before | After |
| --- | --- | --- |
| Checks on a pull request | none | lint, and 105 tests on Node.js 24, 22 and 26 |
| Problems of `npx eslint .` | 42 (39 errors, 3 warnings) | 0 |
| Duration of the CI on a pull request, warm npm cache | no CI | 20 s |

How it was measured: `npx eslint .` on the base commit and on the branch, and the duration of
one CI run, from its creation to its last update (`gh run view <id> --json createdAt,updatedAt`).

Decision: [0001. Check every pull request in GitHub Actions](decisions/0001-check-pull-requests-in-github-actions.md)

## 2026: checked commit messages

Nothing checked the commit messages, and nothing tied a commit to its ticket. commitlint now
requires a Conventional Commit with a `Refs: C4-<n>` trailer, in a Git hook and in the CI, which
also checks the title of each pull request.

| Figure | Before (`21b9efb`) | After (`7c8630d`) |
| --- | --- | --- |
| Checks of a commit message | none | commitlint, in the `commit-msg` hook and in the CI |
| Tests | 105, in 5 files | 210, in 8 files |

How it was measured: `npx vitest run` after `npm ci --ignore-scripts`.

Decision: [0009. Enforce Conventional Commits with a ticket reference](decisions/0009-enforce-conventional-commits-with-a-ticket-reference.md)

## 2026: a Cloudflare Worker, one game per visitor

The game ran only on a developer's machine, as one Express 4 server whose single game every
visitor shared. It now runs on a Cloudflare Worker at `connect-four.issoufi.fr`: Express 5 serves
the API, each game lives in its own Durable Object, and an OpenAPI 3.1 document, linted in the
CI, describes the API at `/api/v1/`.

| Figure | Before | After |
| --- | --- | --- |
| Hosting | none | Cloudflare Worker at `connect-four.issoufi.fr` |
| Games | one for every visitor, until a restart | one per visitor, in a Durable Object, for 7 days after its last move |
| Vulnerabilities of `npm audit --omit=dev` | 5 (3 moderate, 2 high) | 0 |
| Production dependencies | 101 | 67 |
| Tests (without the commit message checks, see the decision) | 105, in 5 files | 201, in 10 files |
| Startup (not comparable, see the decision) | 158 ms, `node index.js` | 69.3 ms, Worker startup |
| Lint of the OpenAPI document | none | Redocly CLI, recommended rules as errors |
| Uploaded bundle | none | 1711.39 KiB, 496.77 KiB gzipped |

How it was measured: `npm audit --omit=dev --json`, `npm test`, the median of 3 startups,
`wrangler check startup` and `wrangler deploy --dry-run`, as the decision details.

Decision: [0002. Host the game on a Cloudflare Worker, with one Durable Object per game](decisions/0002-host-on-a-cloudflare-worker-with-durable-objects.md)

## 2026: ESLint 10 with a flat configuration

ESLint 6, from 2020, linted the code with the Airbnb base rules, and its dependencies caused
every vulnerability that `npm audit` found. ESLint 10 now lints it, with a flat configuration
that keeps the rules of Airbnb base, its layout rules coming from ESLint Stylistic.

| Figure | Before | After |
| --- | --- | --- |
| ESLint | 6.8.0, deprecated | 10.12.0 |
| Active rules on `index.js` | 222 | 207 |
| Vulnerabilities of `npm audit` | 17 (2 low, 4 moderate, 11 high) | 0 |
| Packages that `npm ci` installs | 462 | 301 |
| `npm ci`, warm npm cache | 3.14 s | 2.34 s |
| `npm run lint` | 0.98 s | 0.97 s |

How it was measured: each time is the median of 3 runs on the same machine, and the active rules
come from `npx eslint --print-config index.js`, as the decision details.

Decision: [0003. Lint with ESLint 10 and a flat configuration](decisions/0003-lint-with-eslint-10-and-a-flat-configuration.md)

## 2026: pnpm

npm installed the dependencies, ran their install scripts and took a release as soon as it was
published. pnpm 12 now installs them from `pnpm-lock.yaml`, runs no install script, and only
takes releases published at least 7 days earlier.

| Figure | Before | After |
| --- | --- | --- |
| Package manager | npm 12.2.0 | pnpm 12.14.0 |
| Install, warm cache, no `node_modules` | 2.33 s | 0.71 s |
| Packages installed, as each tool counts them | 301 | 293 |
| Install scripts of dependencies run | 2 | 0 |
| Lint | 1.02 s | 0.82 s |
| Vulnerabilities of the audit | 0 | 0 |

How it was measured: each install time is the median of 3 runs of `/usr/bin/time -p` and each
lint time the median of 5, alternating both tools, as the decision details.

Decision: [0004. Install the dependencies with pnpm](decisions/0004-install-the-dependencies-with-pnpm.md)

## 2026: a page that explains the game, for every player

The page was one classic script that showed the winner with `alert()` and no error. It is now
split into ES modules, still with no build step, and tells whose turn it is, who won and why a
move is refused, with a New game button
([#41](https://github.com/AIssoufi/connect-four/pull/41)). Only red may play the first move of a
game ([#42](https://github.com/AIssoufi/connect-four/pull/42)). The board fits a phone, plays
with the keyboard alone, reads its cells to a screen reader, and marks the tokens with a dot or
a ring, so they are told apart without color
([#27](https://github.com/AIssoufi/connect-four/pull/27)).

| Figure | Before (`a516ece`) | After (`2ab6a2c`) |
| --- | --- | --- |
| Files the page loads | 3 | 8 |
| Page weight | 5,369 bytes | 34,187 bytes |
| Tests | 306, in 13 files | 376, in 16 files |
| Vulnerabilities of `pnpm audit` | 0 | 0 |
| Lighthouse scores | not measured | not measured |

How it was measured: the page weight sums the sizes, uncompressed, that `git ls-tree -l` gives
for the files the page loads; the tests come from `pnpm vitest run` and the vulnerabilities from
`pnpm audit`, after `pnpm install --frozen-lockfile` on Node.js 24.22.0.

Decision: [0010. Split the page script into ES modules, without a build step](decisions/0010-split-the-page-script-into-es-modules-without-a-build-step.md)
