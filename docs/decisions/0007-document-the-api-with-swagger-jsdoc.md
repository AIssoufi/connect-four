# 0007. Document the API with swagger-jsdoc

- Date: 2020-03-30, recorded on 2026-10-20
- Status: Superseded by [0002](0002-host-on-a-cloudflare-worker-with-durable-objects.md)

## Context

This record is rebuilt from the git history: the commits carry no description, so the reasons
below are only those that the code shows.

The API was described only in the README, in French, which named its status route
`/api/stauts`.

## Decision

From `eda9d8b` to `624de1d` (2020-03-30):

- The routes move to `routes/index.js`, mounted on `/game`, and `engine.js` to `app/engine.js`.
- swagger-jsdoc 3 builds an OpenAPI 3.0 document, when the server starts, from comments of
  `routes/index.js`, and swagger-ui-express 4 shows it at `/api/v1`.
- The page calls the new routes, and the README points to `/api/v1` for the API.

## Alternatives considered

Not recorded: the commits name no other option.

## Consequences

| Figure | Before (`db8bcc4`) | After (`624de1d`) |
| --- | --- | --- |
| API docs | the README | Swagger UI at `/api/v1` |
| Production packages in `package-lock.json` | 50 | 84 |
| Vulnerabilities of `npm audit --omit=dev` | 8 (3 low, 4 high, 1 critical) | 18 (3 low, 6 moderate, 8 high, 1 critical) |
| Problems of `npx eslint .` | 43 (40 errors, 3 warnings) | 42 (39 errors, 3 warnings) |

The packages are the entries of `package-lock.json` without the `dev` flag. The vulnerabilities
come from `npm audit --package-lock-only --omit=dev` with npm 12.2.0, run on 2026-10-20 against
the advisories known that day, not those of 2020. ESLint ran with `npx eslint .` after
`npm ci --ignore-scripts` on Node.js 24.22.0, in a copy of each commit made with `git archive`.

- Nothing checks the document: its comments mix Swagger 2 keys, such as `produces`, into
  OpenAPI 3.0.
- The project then stays unchanged until 2026.
