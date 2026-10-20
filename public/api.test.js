import { describe, it, expect } from 'vitest';
import { getErrorMessage, getPlayRoute, requestGame } from './api.js';
import {
  CONNECTION_ERROR_MESSAGE, GAME_NOT_FOUND_MESSAGE, MOVE_REFUSED_MESSAGE, SERVER_ERROR_MESSAGE,
  TOO_MANY_STARTS_MESSAGE,
} from './constants.js';

/** A game status of the API, being played on a board of 1 row and 2 columns. */
const GAME = {
  id: 'abc',
  players: ['red', 'yellow'],
  lastPlayerWhoPlayed: 'red',
  winner: 'no winner',
  state: 'playing',
  board: [['red', 0]],
};

/**
 * Builds a fake `fetch` that answers every request with the same response.
 * @param {object} params
 * @param {number} params.status - The HTTP status of the response.
 * @param {() => Promise<unknown>} params.json - Reads the body of the response.
 * @returns {typeof fetch} The fake.
 */
const fakeFetch = ({ status, json }) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json,
});

describe('getErrorMessage', () => {
  it('explains each error status of the API', () => {
    expect(getErrorMessage(400)).toBe(MOVE_REFUSED_MESSAGE);
    expect(getErrorMessage(404)).toBe(GAME_NOT_FOUND_MESSAGE);
    expect(getErrorMessage(429)).toBe(TOO_MANY_STARTS_MESSAGE);
  });

  it('falls back to the server error message for any other status', () => {
    expect(getErrorMessage(500)).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage(401)).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage(undefined)).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage('toString')).toBe(SERVER_ERROR_MESSAGE);
  });
});

describe('getPlayRoute', () => {
  it('builds the play route of a game', () => {
    expect(getPlayRoute('abc')).toBe('/game/abc/play');
  });

  it('encodes an id that holds a slash or a space', () => {
    expect(getPlayRoute('a/b c')).toBe('/game/a%2Fb%20c/play');
  });
});

describe('requestGame', () => {
  const route = '/game';

  it('returns the game status of a successful response', async () => {
    const fetchGame = fakeFetch({ status: 201, json: async () => GAME });

    expect(await requestGame({ route, fetchGame })).toEqual({ game: GAME });
  });

  it('passes the route and the options to fetch', async () => {
    const calls = [];
    const init = { method: 'POST' };
    const fetchGame = async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => GAME };
    };

    await requestGame({ route, init, fetchGame });

    expect(calls).toEqual([[route, init]]);
  });

  it('explains an error response without reading a game from it', async () => {
    const json = async () => ({ message: 'The column 1 is full!' });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: MOVE_REFUSED_MESSAGE });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 404, json }) }))
      .toEqual({ error: GAME_NOT_FOUND_MESSAGE });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 429, json }) }))
      .toEqual({ error: TOO_MANY_STARTS_MESSAGE });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 500, json }) }))
      .toEqual({ error: SERVER_ERROR_MESSAGE });
  });

  it('explains a request that does not reach the server', async () => {
    const fetchGame = async () => {
      throw new TypeError('Failed to fetch');
    };

    expect(await requestGame({ route, fetchGame })).toEqual({ error: CONNECTION_ERROR_MESSAGE });
  });

  it('explains a successful response that holds no game status', async () => {
    const invalidJson = async () => {
      throw new SyntaxError('Unexpected token <');
    };

    const bodies = [invalidJson, async () => ({}), async () => null];
    const results = await Promise.all(bodies.map((json) => requestGame({
      route, fetchGame: fakeFetch({ status: 200, json }),
    })));

    expect(results).toEqual(bodies.map(() => ({ error: SERVER_ERROR_MESSAGE })));
  });
});
