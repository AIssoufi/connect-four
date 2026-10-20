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

Decision: [0004. Install the dependencies with pnpm](decisions/0004-install-the-dependencies-with-pnpm.md)
