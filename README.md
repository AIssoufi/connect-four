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

`npm test` runs the Vitest tests of the engine (`app/`) and of the routes (`routes/`). They need
Node.js 22.12+, 24 or 26+ (the `engines` field of `package.json`). `.nvmrc` gives the version
used in development and in the CI: 24, an LTS release.

## Lint

`npm run lint` checks every JavaScript file with ESLint and the Airbnb base rules, and fails on
any error or warning. The page script of `public/` is linted with the browser globals.

## Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` on every pull request and every push to `master`:

- `npm ci`, `npm run lint` and `npm test` on the Node.js version of `.nvmrc`;
- `npm ci` and `npm test` on Node.js 22, the oldest major release that `engines` accepts.

Dependabot checks npm and GitHub Actions every week, for releases at least a week old
(`.github/dependabot.yml`): one pull request for the npm minor and patch updates, one per npm
major update, and one for the GitHub Actions updates.

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
