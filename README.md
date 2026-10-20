## Play

Once deployed (see [Deploy](#deploy)), the game runs at <https://connect-four.issoufi.fr>. Each
visitor plays their own game, and reloading the page starts a new one.

## API docs

`/api/v1/` shows the docs of the API with Swagger UI, from the OpenAPI 3.1 document
`public/api/v1/openapi.yaml`. Keep that document in step with the routes of `routes/index.js`.

## Game API

- `POST /game` starts a game. It returns `201` with the game, whose `id` the other routes take,
  and a `Location` header to read it. Each IP address may start 20 games a minute: beyond, it
  returns `429 { "message": "..." }`.
- `GET /game/{gameId}/status` returns the game: its `id`, the `players`, the `tokens` left,
  `lastPlayerWhoPlayed`, `winner` (`no winner` until a player aligns four tokens), `state`
  (`playing`, `won` or `draw`) and the `board`, top row first.
- `POST /game/{gameId}/play` plays the move of its JSON body, `{ "playerId": "red", "column": 1 }`:
  a token of `red` or `yellow` in a column from 1 to 7. It returns the new status. A bad body or
  a move that breaks a rule (game over, not the player's turn, full column) returns
  `400 { "message": "..." }` and leaves the game unchanged.

An id that no game has, or a route that does not exist, returns `404 { "message": "..." }`. A
game is deleted 7 days after its start or its last move, so its id then returns `404` too.

## Architecture

The site is a [Cloudflare Worker](https://developers.cloudflare.com/workers/), described by
`wrangler.jsonc`:

- Cloudflare serves the files of `public/` (the page, its script and the API docs) before the
  Worker runs.
- `index.js` runs the Express app of `routes/` on the Worker, with the `nodejs_compat` flag.
- Each game lives in its own [Durable Object](https://developers.cloudflare.com/durable-objects/)
  (`worker/Game.js`), which saves its moves and plays them again in the engine of `app/` when it
  wakes up. The engine does not depend on Express or on Cloudflare. An alarm of the Durable
  Object deletes the game 7 days after its start or its last move.
- The [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
  `GAME_START_LIMITER` counts the games that each IP address starts.

[docs/decisions/0002](docs/decisions/0002-host-on-a-cloudflare-worker-with-durable-objects.md)
explains these choices.

## Run locally

```sh
npm ci
npm run dev
```

`npm run dev` runs the Worker, its files and its Durable Objects with `wrangler dev`, at
<http://localhost:8787> by default, and keeps the games in `.wrangler/`.

<img src="https://gitlab.com/issoufi/puissance-4/raw/master/screenshots/screenshot2.png" alt="UI">

## Deploy

`npm run deploy` deploys the Worker with `wrangler deploy`, on the custom domain
`connect-four.issoufi.fr`. It needs a Cloudflare account that holds the `issoufi.fr` zone: log in
with `npx wrangler login`, or set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The Worker
needs no build step, no variable and no secret.

## Run the tests

`npm test` runs the Vitest tests:

- the engine (`app/`), the routes (`routes/`) and the storage of the games (`worker/`), with fake
  Durable Objects;
- the whole Worker (`index.test.js`), run in the local Workers runtime by `createTestHarness` of
  Wrangler, with its files and its Durable Objects;
- the commit message checks, which call Git.

They need Node.js 22.12+, 24 or 26+ (the `engines` field of `package.json`). `.nvmrc` gives the
version used in development and in the CI: 24, an LTS release.

## Lint

`npm run lint` runs both checks, and fails on any error or warning:

- `npm run lint:js` checks every JavaScript file with ESLint and the Airbnb base rules. The page
  scripts of `public/` are linted with the browser globals.
- `npm run lint:api` checks the OpenAPI document with the recommended rules of
  [Redocly CLI](https://redocly.com/docs/cli/), each warning made an error (`redocly.yaml`).
  `.redocly.lint-ignore.yaml` lists the problems ignored on purpose, each with its reason.

## Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` on every pull request and every push to `master`:

- `npm ci`, `npm run lint` and `npm test` on the Node.js version of `.nvmrc`;
- `npm ci` and `npm test` on Node.js 22 and 26: the oldest major release that `engines` accepts
  and the newest one released. Dependabot does not update this matrix: add each new major
  release of Node.js to it by hand.

`.github/workflows/commit-messages.yml` checks the commit messages of every pull request, and
its title unless a bot opened it, with commitlint (see [Commit messages](#commit-messages)).

Dependabot checks npm and GitHub Actions every week, for releases at least a week old
(`.github/dependabot.yml`): one pull request for the npm minor and patch updates, and one for the
GitHub Actions updates. It proposes no npm major update: each one goes through its own ticket.

## Commit messages

Every new commit follows [Conventional Commits](https://www.conventionalcommits.org/) and names
its ticket in a trailer:

```text
feat: add a New game button

Refs: C4-14
Co-Authored-By: …
```

- `Refs: C4-<n>` sits in the last paragraph, with no blank line before `Co-Authored-By:`.
- commitlint checks each commit in the `commit-msg` Git hook, and in the CI. The CI also checks
  the title of a pull request, without the trailer, unless a bot opened it.
- Merge commits and the commits of Dependabot and release-please are not checked.
- `npm install` sets up the hooks with Husky. On a branch named after a ticket, such as `C4-20`,
  the `prepare-commit-msg` hook adds `Refs: C4-20` to a message that has no `Refs:` line yet.

## History

[docs/evolution.md](docs/evolution.md) tells how the stack changed, with figures, and
[docs/decisions/](docs/decisions/) keeps one record per decision.

## Vidéo de démonstration

[![IMAGE ALT TEXT HERE](http://img.youtube.com/vi/T-oEjFyau7A/0.jpg)](http://www.youtube.com/watch?v=T-oEjFyau7A)
