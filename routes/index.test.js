import {
  describe, it, expect, beforeEach, afterEach, vi,
} from 'vitest';
import createApp from './createApp';
import listen from './testServer';
import createGameStore from '../worker/createGameStore';
import { createFakeGameNamespace } from '../worker/testDoubles';
import Engine from '../app/engine';
import { RED_WINS_MOVES, readMoves } from '../app/testMoves';
import {
  OK_STATUS, CREATED_STATUS, BAD_REQUEST_STATUS, NOT_FOUND_STATUS, METHOD_NOT_ALLOWED_STATUS,
  UNSUPPORTED_MEDIA_TYPE_STATUS, TOO_MANY_REQUESTS_STATUS,
} from './constants';
import { GAME_ID_LENGTH, GAME_ID_PATTERN } from '../worker/constants';

const NEW_GAME_STATUS = new Engine().getStatus();
const GAME_NOT_FOUND = { code: 'game_not_found', message: 'No game has this id.' };
const UNSUPPORTED_MEDIA_TYPE = {
  code: 'unsupported_media_type',
  message: 'The body must be sent with Content-Type: application/json.',
};
const RED_MOVE = '{"playerId":"red","column":1}';
const CLIENT_IP = '203.0.113.7';
const OTHER_CLIENT_IP = '203.0.113.8';
/** The starts that the counting stand-in of the limiter allows to each key. */
const FAKE_START_LIMIT = 3;
const TOO_MANY_STARTS_MESSAGE = 'Too many games started from this address: try again later.';

/**
 * Builds the `limit` of a stand-in for the Rate Limiting binding that counts the calls of each
 * key and allows `limit` of them. Its count never restarts, unlike the windows of the real
 * binding, so the tests of the exact limit do not depend on the clock.
 * @param {number} limit - The calls allowed to each key.
 * @returns {(options: { key: string }) => Promise<{ success: boolean }>} The `limit` method.
 */
const countCallsByKey = (limit) => {
  const callCounts = new Map();

  return async ({ key }) => {
    const callCount = (callCounts.get(key) ?? 0) + 1;
    callCounts.set(key, callCount);

    return { success: callCount <= limit };
  };
};

describe('game routes', () => {
  let server;
  let games;
  let startLimiter;

  /**
   * Calls the API and reads its JSON answer.
   * @param {object} params
   * @param {string} params.route - The path, from `/game` on.
   * @param {RequestInit} [params.init] - The method, the headers and the body.
   * @returns {Promise<{ status: number, body: object, headers: Headers }>} The response.
   */
  const call = async ({ route, init }) => {
    const response = await fetch(`${server.baseUrl}${route}`, init);

    return { status: response.status, body: await response.json(), headers: response.headers };
  };

  /**
   * Starts a game through the API.
   * @param {object} [headers] - The headers of the request, none by default.
   * @returns {Promise<{ status: number, body: object, headers: Headers }>} The response.
   */
  const postGame = (headers) => call({ route: '/game', init: { method: 'POST', headers } });

  const startGame = async () => (await postGame()).body;

  /**
   * Plays one move through the API.
   * @param {object} params
   * @param {string} params.gameId - The game to play.
   * @param {string | Uint8Array} [params.body] - The raw body of the request, none by default.
   * @param {string | null} [params.contentType] - The type of the body, JSON by default, and
   *   `null` to send no `Content-Type`: fetch still gives a string body `text/plain`, so pass
   *   a `Uint8Array` then.
   * @returns {Promise<{ status: number, body: object }>} The response.
   */
  const postMove = ({ gameId, body, contentType = 'application/json' }) => call({
    route: `/game/${gameId}/play`,
    init: {
      method: 'POST',
      headers: contentType === null ? {} : { 'Content-Type': contentType },
      body,
    },
  });

  const play = ({ gameId, move }) => postMove({ gameId, body: JSON.stringify(move) });

  const getStatus = (gameId) => call({ route: `/game/${gameId}/status` });

  beforeEach(async () => {
    games = createGameStore({ namespace: createFakeGameNamespace() });
    startLimiter = { limit: vi.fn(async () => ({ success: true })) };
    server = await listen(createApp({ games, startLimiter }));
  });

  afterEach(() => server.close());

  it('starts a game and gives its id, its status and where to read it', async () => {
    const { status, body, headers } = await postGame();

    expect(status).toBe(CREATED_STATUS);
    expect(body).toEqual({ id: expect.stringMatching(GAME_ID_PATTERN), ...NEW_GAME_STATUS });
    expect(headers.get('Location')).toBe(`/game/${body.id}/status`);
  });

  describe('start limit', () => {
    it('counts each start by the CF-Connecting-IP address of the visitor', async () => {
      await postGame({ 'CF-Connecting-IP': CLIENT_IP });

      expect(startLimiter.limit).toHaveBeenCalledWith({ key: CLIENT_IP });
    });

    it('refuses a start over the limit with 429, without starting a game', async () => {
      startLimiter.limit.mockResolvedValueOnce({ success: false });
      const create = vi.spyOn(games, 'create');

      const response = await postGame({ 'CF-Connecting-IP': CLIENT_IP });

      expect(response).toMatchObject({
        status: TOO_MANY_REQUESTS_STATUS,
        body: { code: 'too_many_starts', message: TOO_MANY_STARTS_MESSAGE },
      });
      expect(create).not.toHaveBeenCalled();
    });

    it('starts the games of one address up to the limit and refuses the next, not another address', async () => {
      startLimiter.limit.mockImplementation(countCallsByKey(FAKE_START_LIMIT));
      const create = vi.spyOn(games, 'create');
      const limitedHeaders = { 'CF-Connecting-IP': CLIENT_IP };

      const allowedStarts = await Promise.all(
        Array.from({ length: FAKE_START_LIMIT }, () => postGame(limitedHeaders)),
      );
      const refusedStart = await postGame(limitedHeaders);
      const otherStart = await postGame({ 'CF-Connecting-IP': OTHER_CLIENT_IP });

      expect(allowedStarts.map(({ status }) => status))
        .toEqual(Array(FAKE_START_LIMIT).fill(CREATED_STATUS));
      expect(refusedStart).toMatchObject({
        status: TOO_MANY_REQUESTS_STATUS,
        body: { code: 'too_many_starts', message: TOO_MANY_STARTS_MESSAGE },
      });
      expect(otherStart.status).toBe(CREATED_STATUS);
      // The starts allowed to the first address, plus the one of the other address.
      expect(create).toHaveBeenCalledTimes(FAKE_START_LIMIT + 1);
    });

    it('counts the starts of two IPv6 addresses of one /64 network together', async () => {
      startLimiter.limit.mockImplementation(countCallsByKey(FAKE_START_LIMIT));
      const networkStarts = Array.from(
        { length: FAKE_START_LIMIT },
        (_start, index) => postGame({ 'CF-Connecting-IP': `2001:db8:0:1::${index + 1}` }),
      );

      const allowedStarts = await Promise.all(networkStarts);
      const refusedStart = await postGame({ 'CF-Connecting-IP': '2001:db8:0:1:ffff::1' });
      const otherNetworkStart = await postGame({ 'CF-Connecting-IP': '2001:db8:0:2::1' });

      expect(allowedStarts.map(({ status }) => status))
        .toEqual(Array(FAKE_START_LIMIT).fill(CREATED_STATUS));
      expect(refusedStart.status).toBe(TOO_MANY_REQUESTS_STATUS);
      expect(otherNetworkStart.status).toBe(CREATED_STATUS);
      expect(startLimiter.limit).toHaveBeenCalledWith({ key: '2001:db8:0:1::/64' });
    });

    it('limits neither the reads nor the moves', async () => {
      const { id } = await startGame();
      startLimiter.limit.mockResolvedValue({ success: false });

      const statusResponse = await getStatus(id);
      const playResponse = await play({ gameId: id, move: { playerId: 'red', column: 1 } });

      expect(statusResponse.status).toBe(OK_STATUS);
      expect(playResponse.status).toBe(OK_STATUS);
    });
  });

  it('gives the status of a game', async () => {
    const { id } = await startGame();

    const { status, body } = await getStatus(id);

    expect(status).toBe(OK_STATUS);
    expect(body).toEqual({ id, ...NEW_GAME_STATUS });
  });

  it('plays a move and returns the new status', async () => {
    const { id } = await startGame();

    const { status, body } = await play({ gameId: id, move: { playerId: 'red', column: 1 } });

    expect(status).toBe(OK_STATUS);
    expect(body).toMatchObject({ id, lastPlayerWhoPlayed: 'red', tokens: { red: 20, yellow: 21 } });
    expect(body.board[5][0]).toBe('red');
    expect(body.winningCells).toEqual([]);
    expect((await getStatus(id)).body).toEqual(body);
  });

  it('sets the winner and the winning cells on a winning move, and keeps them', async () => {
    const { id } = await startGame();
    const moves = readMoves(RED_WINS_MOVES);
    // The moves must run one after the other, in order.
    const lastResponse = await moves.reduce(
      (previous, move) => previous.then(() => play({ gameId: id, move })),
      Promise.resolve(),
    );

    expect(lastResponse.status).toBe(OK_STATUS);
    expect(lastResponse.body).toMatchObject({
      winner: 'red',
      state: 'won',
      winningCells: [2, 3, 4, 5].map((row) => ({ row, column: 0 })),
    });
    expect((await getStatus(id)).body).toEqual(lastResponse.body);
  });

  it('keeps two games apart', async () => {
    const first = await startGame();
    const second = await startGame();

    await play({ gameId: first.id, move: { playerId: 'red', column: 1 } });

    expect((await getStatus(second.id)).body).toEqual({ id: second.id, ...NEW_GAME_STATUS });
  });

  it.each([
    ['a move out of turn', 'R1', { playerId: 'red', column: 2 }, 'not_your_turn', "red: it's not your turn!"],
    ['a move in a full column', 'R1 Y1 R1 Y1 R1 Y1', { playerId: 'red', column: 1 }, 'column_full', 'The column 1 is full!'],
    ['a move after a win', RED_WINS_MOVES, { playerId: 'yellow', column: 3 }, 'game_over', 'The game is over!'],
  ])('refuses %s with the code and the message of its rule', async (_case, moves, move, code, message) => {
    const { id } = await startGame();
    // The moves must run one after the other, in order.
    await readMoves(moves).reduce(
      (previous, playedMove) => previous.then(() => play({ gameId: id, move: playedMove })),
      Promise.resolve(),
    );

    const { status, body } = await play({ gameId: id, move });

    expect(status).toBe(BAD_REQUEST_STATUS);
    expect(body).toEqual({ code, message });
  });

  it('refuses a first move of yellow and keeps the board empty', async () => {
    const { id } = await startGame();

    const { status, body } = await play({ gameId: id, move: { playerId: 'yellow', column: 1 } });

    expect(status).toBe(BAD_REQUEST_STATUS);
    expect(body).toEqual({ code: 'not_your_turn', message: "yellow: it's not your turn!" });
    expect((await getStatus(id)).body).toEqual({ id, ...NEW_GAME_STATUS });
  });

  it.each([
    ['an empty JSON body, which the parser reads as an empty object', { body: '' }, 'invalid_player'],
    ['a JSON array', { body: '[]' }, 'invalid_move'],
    ['JSON null', { body: 'null' }, 'invalid_move'],
    ['a JSON string', { body: '"red"' }, 'invalid_move'],
    ['a JSON number', { body: '1' }, 'invalid_move'],
    ['a JSON boolean', { body: 'true' }, 'invalid_move'],
    ['a falsy JSON value', { body: 'false' }, 'invalid_move'],
    ['a JSON zero', { body: '0' }, 'invalid_move'],
    ['an empty JSON string', { body: '""' }, 'invalid_move'],
    ['a request without a body or a Content-Type', { contentType: null }, 'invalid_move'],
    ['an empty text/plain body, with no type to fix', { body: '', contentType: 'text/plain' }, 'invalid_move'],
    ['an empty object', { body: '{}' }, 'invalid_player'],
    ['an unknown player', { body: '{"playerId":"green","column":1}' }, 'invalid_player'],
    ['the old playerid field', { body: '{"playerid":"red","column":1}' }, 'invalid_player'],
    ['a missing column', { body: '{"playerId":"red"}' }, 'invalid_column'],
    ['a column written as a string', { body: '{"playerId":"red","column":"1"}' }, 'invalid_column'],
    ['a decimal column', { body: '{"playerId":"red","column":2.5}' }, 'invalid_column'],
    ['a column out of the board', { body: '{"playerId":"red","column":8}' }, 'invalid_column'],
  ])('refuses %s without playing', async (_case, request, code) => {
    const { id } = await startGame();

    const { status, body } = await postMove({ gameId: id, ...request });

    expect(status).toBe(BAD_REQUEST_STATUS);
    expect(body).toEqual({ code, message: expect.stringMatching(/must be/) });
    expect((await getStatus(id)).body).toEqual({ id, ...NEW_GAME_STATUS });
  });

  it.each([
    ['a JSON move sent as text/plain', { body: RED_MOVE, contentType: 'text/plain' }],
    ['a JSON move sent without a Content-Type', { body: new TextEncoder().encode(RED_MOVE), contentType: null }],
    ['a form body', { body: 'playerId=red&column=1', contentType: 'application/x-www-form-urlencoded' }],
    ['a JSON move sent as another JSON type', { body: RED_MOVE, contentType: 'application/merge-patch+json' }],
  ])('refuses %s with 415 without playing', async (_case, request) => {
    const { id } = await startGame();

    const { status, body } = await postMove({ gameId: id, ...request });

    expect(status).toBe(UNSUPPORTED_MEDIA_TYPE_STATUS);
    expect(body).toEqual(UNSUPPORTED_MEDIA_TYPE);
    expect((await getStatus(id)).body).toEqual({ id, ...NEW_GAME_STATUS });
  });

  it.each([
    'application/json; charset=utf-8',
    'Application/JSON',
  ])('plays a move sent as %s', async (contentType) => {
    const { id } = await startGame();

    const { status, body } = await postMove({ gameId: id, body: RED_MOVE, contentType });

    expect(status).toBe(OK_STATUS);
    expect(body.board).not.toEqual(NEW_GAME_STATUS.board);
  });

  it('answers a GET of the move path with 405, whatever its Content-Type', async () => {
    const { id } = await startGame();

    const { status, body } = await call({
      route: `/game/${id}/play`,
      init: { headers: { 'Content-Type': 'text/plain' } },
    });

    expect(status).toBe(METHOD_NOT_ALLOWED_STATUS);
    expect(body.code).toBe('method_not_allowed');
  });

  it.each([
    ['an id that no game has', 'f'.repeat(GAME_ID_LENGTH)],
    ['a malformed id', 'not-a-game-id'],
  ])('answers 404 for %s', async (_case, gameId) => {
    const statusResponse = await getStatus(gameId);
    const playResponse = await play({ gameId, move: { playerId: 'red', column: 1 } });

    expect(statusResponse).toMatchObject({ status: NOT_FOUND_STATUS, body: GAME_NOT_FOUND });
    expect(playResponse).toMatchObject({ status: NOT_FOUND_STATUS, body: GAME_NOT_FOUND });
  });
});
