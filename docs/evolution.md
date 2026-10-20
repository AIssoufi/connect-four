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
| Tests | 105, in 5 files | 181, in 10 files |
| Startup (not comparable, see the decision) | 158 ms, `node index.js` | 50.5 ms, Worker startup |
| Lint of the OpenAPI document | none | Redocly CLI, recommended rules as errors |
| Uploaded bundle | none | 1708.40 KiB, 495.96 KiB gzipped |

Decision: [0002. Host the game on a Cloudflare Worker, with one Durable Object per game](decisions/0002-host-on-a-cloudflare-worker-with-durable-objects.md)
