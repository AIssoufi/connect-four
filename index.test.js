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
const GAME_NOT_FOUND = { status: NOT_FOUND_STATUS, body: { message: 'No game has this id.' } };
/**
 * The `limit` of `GAME_START_LIMITER` in `wrangler.jsonc`: the starts of one IP address per
 * minute. The tests that send no address share the one of the harness: keep their starts below.
 */
const STARTS_PER_MINUTE = 20;

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

  it('serves the helpers of the page, but not their tests', async () => {
    const helpers = await harness.fetch('/utils.js');
    const tests = await harness.fetch('/utils.test.js');

    expect(helpers.status).toBe(OK_STATUS);
    expect(tests.status).toBe(NOT_FOUND_STATUS);
    await tests.body.cancel();
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
      .toEqual({ status: BAD_REQUEST_STATUS, body: { message: 'The game is over!' } });
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

  it('refuses with 429 the starts of one IP address over the limit, and only of it', async () => {
    const limitedHeaders = { 'CF-Connecting-IP': '203.0.113.7' };

    const allowedStarts = await Promise.all(
      Array.from({ length: STARTS_PER_MINUTE }, () => postGame(limitedHeaders)),
    );
    const refusedStart = await postGame(limitedHeaders);
    const otherStart = await postGame({ 'CF-Connecting-IP': '203.0.113.8' });

    expect(allowedStarts.map(({ status }) => status))
      .toEqual(Array(STARTS_PER_MINUTE).fill(CREATED_STATUS));
    expect(refusedStart).toEqual({
      status: TOO_MANY_REQUESTS_STATUS,
      body: { message: 'Too many games started from this address: try again later.' },
    });
    expect(otherStart.status).toBe(CREATED_STATUS);
  });

  it('refuses an invalid move without playing it', async () => {
    const { id } = await startGame();

    const response = await play({ gameId: id, move: { playerId: 'red', column: 8 } });

    expect(response).toEqual({
      status: BAD_REQUEST_STATUS,
      body: { message: 'The column must be an integer between 1 and 7.' },
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
      body: { message: 'This route does not exist.' },
    });
  });
});
