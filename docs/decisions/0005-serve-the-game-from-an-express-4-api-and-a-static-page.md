# 0005. Serve the game from an Express 4 API and a static page

- Date: 2019-06-27, recorded on 2026-10-20
- Status: Superseded by [0002](0002-host-on-a-cloudflare-worker-with-durable-objects.md) for the
  server; the plain page with no build step still stands

## Context

This record is rebuilt from the git history: the first commits carry no description, so the
reasons below are only those that the code shows.

The project needed a way to play the rules of Connect Four, written in `engine.js`, from a
client.

## Decision

The first commit, `f432fc3` (2019-06-27), takes these choices:

- `index.js` starts an Express 4.17 server on port 3000, with `npm run start`.
- `engine.js` exports one instance of its `Engine` class: the server holds a single game in
  memory, shared by every client until it restarts.
- `GET /status` returns the game, and `GET /play?playerid=red&column=3` plays a move.
- npm installs the dependencies from `package-lock.json`.

The next commits, up to `858fa2b` (2019-06-28), add the rest:

- `1a6e8ab` detects the winner.
- `cff149f` adds a page in `public/` (`index.html`, `main.js`, `style.css`), served by
  `express.static`, with no build step, and moves the routes under `/api/`. The page reads the
  game again every 2 seconds and shows the winner with `alert()`.

## Alternatives considered

Not recorded: the commits name no other option.

## Consequences

| Figure | Before (`f432fc3`) | After (`858fa2b`) |
| --- | --- | --- |
| Ways to play | the two API routes, `/status` and `/play` | the page, or the two API routes under `/api/` |
| Production packages in `package-lock.json` | 50 | 50 |
| Vulnerabilities of `npm audit --omit=dev` | 8 (3 low, 4 high, 1 critical) | 8 (3 low, 4 high, 1 critical) |
| Tests | 0 | 0 |
| Page weight | no page | 4,578 bytes in 3 files |

The packages are the entries of `package-lock.json` without the `dev` flag. The vulnerabilities
come from `npm audit --package-lock-only --omit=dev` with npm 12.2.0, run on 2026-10-20 against
the advisories known that day, not those of 2019. The page weight is the sum of the sizes that
`git ls-tree -l` gives for the files the page loads. No test file exists, and `npm test` only
prints an error.

- Every visitor plays the same game, and only a restart of the server starts a new one.
- A move is a `GET` request, which changes the game.
- Nothing deploys the server: it runs on a developer's machine.
