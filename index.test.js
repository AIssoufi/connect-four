import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  describe, it, expect, beforeAll, afterAll,
} from 'vitest';
import { createTestHarness } from 'wrangler';
import Engine from './app/engine';
import { DRAW_MOVES, RED_WINS_MOVES, readMoves } from './app/testMoves';
import {
  OK_STATUS, CREATED_STATUS, BAD_REQUEST_STATUS, NOT_FOUND_STATUS, TOO_MANY_REQUESTS_STATUS,
} from './routes/constants';
import { GAME_ID_LENGTH, GAME_ID_PATTERN } from './worker/constants';

/** Building the Worker and starting its runtime take a few seconds. */
const WORKER_START_TIMEOUT_MS = 60000;
const NEW_GAME_STATUS = new Engine().getStatus();
const TEMPORARY_REDIRECT_STATUS = 307;
/** The headers that `public/_headers` sets, in the order of the values below. */
const SECURITY_HEADER_NAMES = [
  'X-Content-Type-Options', 'Strict-Transport-Security',
  'Referrer-Policy', 'Content-Security-Policy',
];
const NOSNIFF = 'nosniff';
/** HTTPS only for a year, for this host alone: neither `includeSubDomains` nor `preload`. */
const HSTS = 'max-age=31536000';
const REFERRER_POLICY = 'strict-origin-when-cross-origin';
/** The directives that `default-src` does not cover, which both policies end with. */
const NO_FALLBACK_DIRECTIVES = "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const SITE_ONLY_POLICY = `default-src 'self'; ${NO_FALLBACK_DIRECTIVES}`;
const API_DOCS_POLICY = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; "
  + `style-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; ${NO_FALLBACK_DIRECTIVES}`;
/** The npm package of Swagger UI that the API docs page loads from jsDelivr. */
const SWAGGER_UI_PACKAGE = 'swagger-ui-dist';
/** The hash algorithm of the `integrity` attributes of the API docs page. */
const SRI_HASH_ALGORITHM = 'sha384';
/** The files of `SWAGGER_UI_PACKAGE` that the API docs page loads. */
const SWAGGER_UI_FILES = ['swagger-ui.css', 'swagger-ui-bundle.js'];
/** A jsDelivr URL of `swagger-ui-dist` and its hash: the version, the file and the `integrity`. */
const SWAGGER_UI_LINK_PATTERN = /swagger-ui-dist@([^/]+)\/([\w.-]+)"\s+integrity="([^"]+)"/g;
/** The exact version of `swagger-ui-dist` that `package.json` pins, which Dependabot bumps. */
const SWAGGER_UI_VERSION = JSON.parse(
  readFileSync(new URL('package.json', import.meta.url), 'utf8'),
).devDependencies[SWAGGER_UI_PACKAGE];
/** The `href` of the SVG icon that a page links to. */
const SVG_ICON_LINK_PATTERN = /<link rel="icon" type="image\/svg\+xml" href="([^"]+)">/;
/** The icon of the game page, which the API docs page shows too. */
const GAME_ICON_ROUTE = '/favicon.svg';
/** The `Accept` header that Chrome and Firefox send when they open a page. */
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
/** The stylesheets of the 404 page, which the assets of `public/` must serve. */
const NOT_FOUND_PAGE_STYLESHEETS = ['/style.css', '/not-found.css'];
/** The API docs page, without and with its trailing slash: links resolve against either one. */
const DOCS_PAGE_URLS = ['http://localhost/api/v1', 'http://localhost/api/v1/'];
const GAME_NOT_FOUND = { status: NOT_FOUND_STATUS, body: { code: 'game_not_found', message: 'No game has this id.' } };
/**
 * The `limit` of `GAME_START_LIMITER` in `wrangler.jsonc`: the starts of one client network per
 * minute. The tests that send no address share the one of the harness: keep their starts below.
 */
const STARTS_PER_MINUTE = 20;
/**
 * The starts that the limit allows to one address in two windows. The local limiter counts in
 * windows aligned to the minutes of the clock, so starts sent together may straddle two windows,
 * never more.
 */
const STARTS_IN_TWO_WINDOWS = 2 * STARTS_PER_MINUTE;
/** The starts that one address sends to test the limit: at least one is refused at any second. */
const STARTS_OVER_TWO_WINDOWS = STARTS_IN_TWO_WINDOWS + 1;
const TOO_MANY_STARTS = {
  status: TOO_MANY_REQUESTS_STATUS,
  body: {
    code: 'too_many_starts',
    message: 'Too many games started from this address: try again later.',
  },
};

/**
 * Tells whether the Worker started the game that a request asked for.
 * @param {{ status: number }} response - The response to the start.
 * @returns {boolean} True for a 201 answer.
 */
const isStarted = ({ status }) => status === CREATED_STATUS;

/**
 * Tells whether the start limit refused the game that a request asked for.
 * @param {{ status: number }} response - The response to the start.
 * @returns {boolean} True for a 429 answer.
 */
const isRefused = ({ status }) => status === TOO_MANY_REQUESTS_STATUS;

/**
 * Computes the Subresource Integrity hash of a file of the installed `swagger-ui-dist`.
 * @param {string} file - The name of the file in the package.
 * @returns {string} Its `integrity` value: the algorithm, a dash and the base64 digest.
 */
const hashSwaggerUiFile = (file) => {
  const fileUrl = new URL(`node_modules/${SWAGGER_UI_PACKAGE}/${file}`, import.meta.url);
  const digest = createHash(SRI_HASH_ALGORITHM).update(readFileSync(fileUrl)).digest('base64');

  return `${SRI_HASH_ALGORITHM}-${digest}`;
};

// Runs the Worker of `wrangler.jsonc` in the local Workers runtime, with its static assets and
// its Durable Objects, as `wrangler dev` does.
describe('the Worker', () => {
  const harness = createTestHarness({ workers: [{ configPath: './wrangler.jsonc' }] });

  /**
   * Calls the Worker and reads its JSON answer.
   * @param {object} params
   * @param {string} params.route - The path of the request.
   * @param {RequestInit} [params.init] - The method, the headers and the body.
   * @returns {Promise<{ status: number, body: object }>} The response.
   */
  const call = async ({ route, init }) => {
    const response = await harness.fetch(route, init);

    return { status: response.status, body: await response.json() };
  };

  /**
   * Starts a game through the Worker.
   * @param {object} [headers] - The headers of the request, none by default.
   * @returns {Promise<{ status: number, body: object }>} The response.
   */
  const postGame = (headers) => call({ route: '/game', init: { method: 'POST', headers } });

  const startGame = async () => (await postGame()).body;

  const play = ({ gameId, move }) => call({
    route: `/game/${gameId}/play`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move),
    },
  });

  /**
   * Plays moves one after the other, in order.
   * @param {object} params
   * @param {string} params.gameId - The game to play.
   * @param {string} params.moves - The moves, written as `R1 Y2`.
   * @returns {Promise<{ status: number, body: object }>} The response to the last move.
   */
  const playMoves = ({ gameId, moves }) => readMoves(moves).reduce(
    (previous, move) => previous.then(() => play({ gameId, move })),
    Promise.resolve(),
  );

  const getStatus = (gameId) => call({ route: `/game/${gameId}/status` });

  beforeAll(() => harness.listen(), WORKER_START_TIMEOUT_MS);

  afterAll(() => harness.close());

  it('serves the page of the game', async () => {
    const response = await harness.fetch('/');

    expect(response.status).toBe(OK_STATUS);
    expect(await response.text()).toContain('<title>Puissance 4</title>');
  });

  it('serves the favicon that the page links to', async () => {
    const page = await harness.fetch('/');
    const favicon = await harness.fetch('/favicon.svg');

    expect(await page.text()).toContain('<link rel="icon" type="image/svg+xml" href="favicon.svg">');
    expect(favicon.status).toBe(OK_STATUS);
    expect(favicon.headers.get('Content-Type')).toContain('image/svg+xml');
  });

  it('serves the modules of the page, but not their tests', async () => {
    const modules = [
      '/main.js', '/constants.js', '/utils.js', '/winning-cells.js', '/texts.js', '/api.js',
    ];
    const helpers = await Promise.all(modules.map((route) => harness.fetch(route)));
    const tests = await harness.fetch('/utils.test.js');

    expect(helpers.map(({ status }) => status)).toEqual(modules.map(() => OK_STATUS));
    expect(tests.status).toBe(NOT_FOUND_STATUS);
    await Promise.all([...helpers, tests].map((response) => response.body.cancel()));
  });

  it('serves the docs of the API at /api/v1', async () => {
    const redirect = await harness.fetch('/api/v1', { redirect: 'manual' });
    const docs = await harness.fetch('/api/v1/');
    const spec = await harness.fetch('/api/v1/openapi.yaml');

    expect(redirect.status).toBe(TEMPORARY_REDIRECT_STATUS);
    expect(redirect.headers.get('Location')).toBe('/api/v1/');
    expect(await docs.text()).toContain('swagger-initializer.js');
    expect(await spec.text()).toMatch(/^openapi: 3\.1\.0$/m);
  });

  it('shows the icon of the game on the API docs page, with or without the trailing slash', async () => {
    const docs = await (await harness.fetch('/api/v1/')).text();
    const [, iconHref] = docs.match(SVG_ICON_LINK_PATTERN) ?? [];
    const iconRoutes = DOCS_PAGE_URLS.map((pageUrl) => new URL(iconHref, pageUrl).pathname);
    const icon = await harness.fetch(GAME_ICON_ROUTE);

    expect(iconRoutes).toEqual(DOCS_PAGE_URLS.map(() => GAME_ICON_ROUTE));
    // "serves the favicon that the page links to" checks its status and type: here, its content.
    expect(await icon.text())
      .toEqual(readFileSync(new URL(`public${GAME_ICON_ROUTE}`, import.meta.url), 'utf8'));
  });

  it('loads in the API docs the Swagger UI of `package.json`, with the hashes of its files', async () => {
    const docs = await (await harness.fetch('/api/v1/')).text();

    const links = [...docs.matchAll(SWAGGER_UI_LINK_PATTERN)].map(
      ([, version, file, integrity]) => ({ version, file, integrity }),
    );

    expect(links).toEqual(SWAGGER_UI_FILES.map((file) => ({
      version: SWAGGER_UI_VERSION,
      file,
      integrity: hashSwaggerUiFile(file),
    })));
  });

  it('sends the security headers of `public/_headers` with the files, only nosniff and HSTS with the API', async () => {
    const [page, script, docs, game] = await Promise.all(
      ['/', '/main.js', '/api/v1/', '/game/unknown/status'].map((route) => harness.fetch(route)),
    );
    const readSecurityHeaders = (response) => SECURITY_HEADER_NAMES.map(
      (name) => response.headers.get(name),
    );

    expect(readSecurityHeaders(page)).toEqual([NOSNIFF, HSTS, REFERRER_POLICY, SITE_ONLY_POLICY]);
    expect(readSecurityHeaders(script)).toEqual([NOSNIFF, HSTS, REFERRER_POLICY, SITE_ONLY_POLICY]);
    // Its own rule replaces the policy of the whole site, instead of joining it with a comma.
    expect(readSecurityHeaders(docs)).toEqual([NOSNIFF, HSTS, REFERRER_POLICY, API_DOCS_POLICY]);
    // The Express app sends nosniff and HSTS itself, but none of the policies of the files.
    expect(readSecurityHeaders(game)).toEqual([NOSNIFF, HSTS, null, null]);
    await Promise.all([page, script, docs, game].map((response) => response.body.cancel()));
  });

  it('starts a game in a Durable Object', async () => {
    const { status, body } = await postGame();

    expect(status).toBe(CREATED_STATUS);
    expect(body).toEqual({ id: expect.stringMatching(GAME_ID_PATTERN), ...NEW_GAME_STATUS });
    expect(await getStatus(body.id)).toEqual({ status: OK_STATUS, body });
  });

  it('plays a game until a player wins', async () => {
    const { id } = await startGame();

    const lastMove = await playMoves({ gameId: id, moves: RED_WINS_MOVES });

    expect(lastMove).toMatchObject({ status: OK_STATUS, body: { winner: 'red', state: 'won' } });
    expect(await play({ gameId: id, move: { playerId: 'yellow', column: 3 } }))
      .toEqual({ status: BAD_REQUEST_STATUS, body: { code: 'game_over', message: 'The game is over!' } });
  });

  it('plays a game until a draw', async () => {
    const { id } = await startGame();

    const lastMove = await playMoves({ gameId: id, moves: DRAW_MOVES });

    expect(lastMove).toMatchObject({
      status: OK_STATUS,
      body: { winner: 'no winner', state: 'draw', tokens: { red: 0, yellow: 0 } },
    });
  });

  it('keeps the games of two visitors apart, and starts a new one at any time', async () => {
    const first = await startGame();
    await play({ gameId: first.id, move: { playerId: 'red', column: 4 } });

    const second = await startGame();

    expect(second.id).not.toBe(first.id);
    expect((await getStatus(second.id)).body).toEqual(second);
    expect((await getStatus(first.id)).body.lastPlayerWhoPlayed).toBe('red');
  });

  it('keeps the moves of a game once its Durable Object is evicted', async () => {
    const { id } = await startGame();
    const { body: statusBefore } = await playMoves({ gameId: id, moves: 'R4 Y4 R3' });

    await harness.getWorker().evictDurableObject('Game', { id });

    expect((await getStatus(id)).body).toEqual(statusBefore);
  });

  it('answers 404 for a game once its Durable Object deleted it', async () => {
    const { id } = await startGame();
    await play({ gameId: id, move: { playerId: 'red', column: 4 } });
    const env = await harness.getWorker().getEnv();

    // The alarm that `StoredGame` schedules runs `deleteGame()`, which RPC can call.
    await env.GAMES.get(env.GAMES.idFromString(id)).deleteGame();

    expect(await getStatus(id)).toEqual(GAME_NOT_FOUND);
    expect(await play({ gameId: id, move: { playerId: 'yellow', column: 4 } }))
      .toEqual(GAME_NOT_FOUND);
  });

  it('refuses with 429 the starts of one client network over the limit, and only of it', async () => {
    const limitedHeaders = { 'CF-Connecting-IP': '203.0.113.7' };

    const starts = await Promise.all(
      Array.from({ length: STARTS_OVER_TWO_WINDOWS }, () => postGame(limitedHeaders)),
    );
    const otherStart = await postGame({ 'CF-Connecting-IP': '203.0.113.8' });

    const startedCount = starts.filter(isStarted).length;
    // One of the two windows gets more starts than the limit, so it allows exactly the limit.
    expect(startedCount).toBeGreaterThanOrEqual(STARTS_PER_MINUTE);
    expect(startedCount).toBeLessThanOrEqual(STARTS_IN_TWO_WINDOWS);
    expect(starts.filter(isRefused))
      .toEqual(Array(STARTS_OVER_TWO_WINDOWS - startedCount).fill(TOO_MANY_STARTS));
    expect(otherStart.status).toBe(CREATED_STATUS);
  });

  it('refuses an invalid move without playing it', async () => {
    const { id } = await startGame();

    const response = await play({ gameId: id, move: { playerId: 'red', column: 8 } });

    expect(response).toEqual({
      status: BAD_REQUEST_STATUS,
      body: { code: 'invalid_column', message: 'The column must be an integer between 1 and 7.' },
    });
    expect((await getStatus(id)).body).toEqual({ id, ...NEW_GAME_STATUS });
  });

  it.each([
    ['an id that no game has', 'f'.repeat(GAME_ID_LENGTH)],
    ['a malformed id', 'not-a-game-id'],
  ])('answers 404 for %s', async (_case, gameId) => {
    expect(await getStatus(gameId)).toEqual(GAME_NOT_FOUND);
    expect(await play({ gameId, move: { playerId: 'red', column: 1 } })).toEqual(GAME_NOT_FOUND);
  });

  it('answers 404 in JSON for a route that does not exist', async () => {
    expect(await call({ route: '/game/status' })).toEqual({
      status: NOT_FOUND_STATUS,
      body: { code: 'route_not_found', message: 'This route does not exist.' },
    });
  });

  it('answers 404 with the page, whose stylesheets it serves, to a browser', async () => {
    const response = await harness.fetch('/about', { headers: { Accept: BROWSER_ACCEPT } });
    const page = await response.text();
    const stylesheets = await Promise.all(
      NOT_FOUND_PAGE_STYLESHEETS.map((route) => harness.fetch(route)),
    );

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(page).toContain('<a href="/">Jouer une partie</a>');
    NOT_FOUND_PAGE_STYLESHEETS.forEach((route) => expect(page).toContain(`href="${route}"`));
    stylesheets.forEach(({ status }) => expect(status).toBe(OK_STATUS));
  });
});
