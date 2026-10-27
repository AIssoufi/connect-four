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
  OK_STATUS, CREATED_STATUS, BAD_REQUEST_STATUS, NOT_FOUND_STATUS, TOO_MANY_REQUESTS_STATUS,
} from './constants';
import { GAME_ID_LENGTH, GAME_ID_PATTERN } from '../worker/constants';

const NEW_GAME_STATUS = new Engine().getStatus();
const GAME_NOT_FOUND = { message: 'No game has this id.' };
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
   * @param {string} params.body - The raw body of the request.
   * @param {string} [params.contentType] - The type of the body, JSON by default.
   * @returns {Promise<{ status: number, body: object }>} The response.
   */
  const postMove = ({ gameId, body, contentType = 'application/json' }) => call({
    route: `/game/${gameId}/play`,
    init: { method: 'POST', headers: { 'Content-Type': contentType }, body },
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
        body: { message: TOO_MANY_STARTS_MESSAGE },
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
        body: { message: TOO_MANY_STARTS_MESSAGE },
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

  it('refuses a move that breaks a rule with its message', async () => {
    const { id } = await startGame();
    await play({ gameId: id, move: { playerId: 'red', column: 1 } });

    const { status, body } = await play({ gameId: id, move: { playerId: 'red', column: 2 } });

    expect(status).toBe(BAD_REQUEST_STATUS);
    expect(body).toEqual({ message: "red: it's not your turn!" });
  });

  it('refuses a first move of yellow and keeps the board empty', async () => {
    const { id } = await startGame();

    const { status, body } = await play({ gameId: id, move: { playerId: 'yellow', column: 1 } });

    expect(status).toBe(BAD_REQUEST_STATUS);
    expect(body).toEqual({ message: "yellow: it's not your turn!" });
    expect((await getStatus(id)).body).toEqual({ id, ...NEW_GAME_STATUS });
  });

  it.each([
    ['no body', { body: '' }],
    ['a body that is not JSON', { body: 'playerId=red&column=1', contentType: 'application/x-www-form-urlencoded' }],
    ['a JSON array', { body: '[]' }],
    ['an unknown player', { body: '{"playerId":"green","column":1}' }],
    ['the old playerid field', { body: '{"playerid":"red","column":1}' }],
    ['a column written as a string', { body: '{"playerId":"red","column":"1"}' }],
    ['a decimal column', { body: '{"playerId":"red","column":2.5}' }],
    ['a column out of the board', { body: '{"playerId":"red","column":8}' }],
  ])('refuses %s without playing', async (_case, request) => {
    const { id } = await startGame();

    const { status, body } = await postMove({ gameId: id, ...request });

    expect(status).toBe(BAD_REQUEST_STATUS);
    expect(body.message).toMatch(/must be/);
    expect((await getStatus(id)).body).toEqual({ id, ...NEW_GAME_STATUS });
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
