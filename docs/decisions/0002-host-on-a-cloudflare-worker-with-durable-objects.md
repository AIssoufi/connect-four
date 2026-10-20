# 0002. Host the game on a Cloudflare Worker, with one Durable Object per game

- Date: 2026-10-20
- Status: Accepted

## Context

The game ran only on a developer's machine: `npm run start` started an Express 4 server on port
3000, and nothing deployed it. That server held one game in memory, shared by every visitor: two
browsers played on the same board, and only a restart of the server started a new game. The page
read the board again every 2 seconds with `GET /game/status`, and played with
`GET /game/play?playerid=red&column=1`, a request that changes the game.

The docs of the API at `/api/v1` came from swagger-jsdoc 3, which read OpenAPI 3.0 comments in
`routes/index.js` when the server started, and from swagger-ui-express 4. Those comments mixed
Swagger 2 keys, such as `produces`, into the document, and nothing checked them. On the base
commit, `npm audit --omit=dev` found 5 vulnerabilities (3 moderate, 2 high), all in swagger-jsdoc
and its dependencies.

[#13](https://github.com/AIssoufi/connect-four/issues/13) asks to deploy the game at
`connect-four.issoufi.fr`, with one game per visitor, valid docs of the API and up-to-date
packages. The owner chose Cloudflare, and Express if it runs there cleanly.

## Decision

For [#13](https://github.com/AIssoufi/connect-four/issues/13):

- `wrangler.jsonc` describes one Worker, `connect-four`, on the custom domain
  `connect-four.issoufi.fr`. Cloudflare serves the files of `public/` first; every other request
  reaches the Worker.
- The Worker runs the Express 5 app with the `nodejs_compat` flag and `httpServerHandler` of
  `cloudflare:node`.
- Each game lives in its own Durable Object of the `Game` class, bound as `GAMES` and stored in
  SQLite. Its id, 64 hexadecimal characters, is the id of the game. The object saves the list of
  the moves and plays them again in a new engine when it wakes up, so the engine knows nothing of
  the storage.
- The API changes its contract: `POST /game` starts a game and returns its id,
  `GET /game/{gameId}/status` reads it, and `POST /game/{gameId}/play` plays a move given as a
  JSON body, `{ "playerId": "red", "column": 1 }`. An unknown game or route returns 404, a refused
  move or a bad body 400, and an unexpected error 500, without its details.
- The page starts a game when it loads and plays it with `POST`. It no longer reads the board
  every 2 seconds, since only that page plays its game.
- `public/api/v1/openapi.yaml` is an OpenAPI 3.1 document, written by hand. Swagger UI 5.33.2
  shows it at `/api/v1/`, loaded from jsDelivr with Subresource Integrity hashes. `npm run lint`
  checks it with the recommended rules of Redocly CLI, each warning made an error, so the CI
  checks it on every pull request.
- Express goes from 4.22.3 to 5.3.0, and swagger-jsdoc and swagger-ui-express are removed.
  Wrangler and Redocly CLI are development dependencies.
- `npm run dev` runs the Worker locally with `wrangler dev`, and `npm run deploy` deploys it with
  `wrangler deploy`. The repository holds no secret: the owner deploys with their own Cloudflare
  account.

## Alternatives considered

- **Hono instead of Express**: the owner asked for Express first, and for Hono only if Express
  did not run cleanly. Express 5 runs on the Worker and passes every test, so a rewrite would
  change the code without fixing anything. The price is a larger bundle, since Express brings its
  Node.js dependencies (see below).
- **Vite**: the page is one plain script and the docs page loads Swagger UI from a CDN, so there
  is nothing to build; Wrangler bundles the Worker with esbuild. Vite would add a tool and a
  configuration without making anything simpler.
- **Swagger UI from npm**: swagger-ui-express serves its files from `node_modules`, which a Worker
  cannot read. Serving swagger-ui-dist as static files would need a build step that copies it into
  `public/`, or 1.8 MB of committed third-party code (its bundle and its style sheet). A pinned
  version on jsDelivr, checked by its hashes, needs neither.
- **swagger-jsdoc 6**: it builds the document from comments read on disk when the server starts,
  which a Worker cannot do either, and a separate file is easier to lint and to read.
- **Workers KV or D1 for the games**: KV is eventually consistent, so two quick moves could read
  an old board, and D1 needs a schema and its migrations for a list of moves. A Durable Object
  runs the moves of one game one after the other and keeps them in its own storage.
- **One game for every visitor, as before**: two visitors would still play on the same board.
- **`@cloudflare/vitest-pool-workers` for the tests**: it does not support Vitest 5, which the
  project uses. The tests of the Worker run it with `createTestHarness` of Wrangler, from the usual
  Vitest run.

## Consequences

| Figure | Before | After |
| --- | --- | --- |
| Hosting | none | Cloudflare Worker at `connect-four.issoufi.fr` |
| Games | one for every visitor, until a restart | one per visitor, in a Durable Object |
| Vulnerabilities of `npm audit --omit=dev` | 5 (3 moderate, 2 high) | 0 |
| Production dependencies | 101 | 67 |
| Tests | 105, in 5 files | 181, in 10 files |
| Startup (not comparable) | 158 ms, `node index.js` | 50.5 ms, Worker startup |
| Uploaded bundle | none | 1708.40 KiB, 495.96 KiB gzipped |
| Lint of the OpenAPI document | none | Redocly CLI, recommended rules as errors |

The figures before come from the base commit, `ae139ec`, and the figures after from this branch.
The vulnerabilities and the production dependencies come from `npm audit --omit=dev --json`, and
the tests from `npm test`. The startup before is the median of 3 runs, from the start of
`node index.js` to the first 200 of `GET /game/status`. The startup after is the profile window
of `wrangler check startup`, which runs the startup of the Worker on the local machine (33.7 ms of
it active): the two figures measure different things and are not comparable, and Cloudflare
states that its own CPUs give other times. The bundle size comes from `wrangler deploy --dry-run`.

- Each visitor plays their own game, and reloading the page starts a new one. A game survives
  the eviction of its Durable Object.
- A client of the old API breaks: the routes take a game id, and a move is a `POST`.
- The docs page needs jsDelivr, and a new version of Swagger UI needs its new hashes.
- Deploying needs the Cloudflare account of the owner, outside the repository.
- The full `npm audit` still finds 18 vulnerabilities, all in ESLint 6, its import plugin and its
  Airbnb configurations, which only run in development.
- Left to do: showing the errors and a New game button
  ([#14](https://github.com/AIssoufi/connect-four/issues/14)), the README rewrite
  ([#17](https://github.com/AIssoufi/connect-four/issues/17)), and ESLint 10
  ([#15](https://github.com/AIssoufi/connect-four/issues/15)).
