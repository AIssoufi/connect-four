## API docs

`GET http://localhost:3000/api/v1/`

## Game API

- `GET /game/status` returns the game: `players`, `tokens` left, `lastPlayerWhoPlayed`, `winner`
  (`no winner` until a player aligns four tokens), `state` (`playing`, `won` or `draw`) and the
  `board`, top row first.
- `GET /game/play?playerid=red&column=1` drops a token of `red` or `yellow` in a column from 1
  to 7 and returns the new status. A move that breaks a rule (invalid query, game over, not the
  player's turn, full column) returns `400 { "message": "..." }` and leaves the game unchanged.

The game engine does not depend on Express, and each instance of it is a separate game.

## Run the tests

`npm test` runs the Vitest tests of the engine (`app/`), of the routes (`routes/`) and of the
commit message checks (`commitlint.config.test.js`, `scripts/commit-message/`), which call Git.
They need Node.js 22.12+, 24 or 26+ (the `engines` field of `package.json`). `.nvmrc` gives the
version used in development and in the CI: 24, an LTS release.

## Lint

`npm run lint` checks every JavaScript file with ESLint and the Airbnb base rules, and fails on
any error or warning. The page script of `public/` is linted with the browser globals.

## Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` on every pull request and every push to `master`:

- `npm ci`, `npm run lint` and `npm test` on the Node.js version of `.nvmrc`;
- `npm ci` and `npm test` on Node.js 22 and 26: the oldest major release that `engines` accepts
  and the newest one released. Dependabot does not update this matrix: add each new major
  release of Node.js to it by hand.

Dependabot checks npm and GitHub Actions every week, for releases at least a week old
(`.github/dependabot.yml`): one pull request for the npm minor and patch updates, and one for the
GitHub Actions updates. It proposes no npm major update: each one goes through its own ticket.

## Commit messages

Every new commit follows [Conventional Commits](https://www.conventionalcommits.org/) and names
its ticket in a `Refs: C4-<n>` trailer: in the last paragraph of the message, with no blank line
before `Co-Authored-By:`. commitlint (`commitlint.config.js`) checks each commit in the `commit-msg`
Git hook. Merge commits and the commits of Dependabot and release-please are not checked.

`npm install` sets up the Git hooks with Husky (`.husky/`). On a branch named after a ticket,
such as `C4-20`, the `prepare-commit-msg` hook adds `Refs: C4-20` to a message that has no
`Refs:` line yet.

## History

[docs/evolution.md](docs/evolution.md) tells how the stack changed, with figures, and
[docs/decisions/](docs/decisions/) keeps one record per decision.

## Vidéo de démonstration

[![IMAGE ALT TEXT HERE](http://img.youtube.com/vi/T-oEjFyau7A/0.jpg)](http://www.youtube.com/watch?v=T-oEjFyau7A)

## Installer le projet
`
npm install
`

## Lancer le projet en local
`
npm run start
`

## Jouer avec l'interface graphique

1. Lancer le serveur `npm run start`

2. Saisir `http://localhost:3000` sur votre navigateur et c'est tout!

<img src="https://gitlab.com/issoufi/puissance-4/raw/master/screenshots/screenshot2.png" alt="UI">
