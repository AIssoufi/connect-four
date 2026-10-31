import {
  describe, it, expect, vi,
} from 'vitest';
import { ERROR_CODES } from '../app/constants.js';
import {
  getErrorCode, getErrorMessage, getPlayRoute, getStatusRoute, requestGame, requestMove,
} from './api.js';
import {
  CONNECTION_ERROR_MESSAGE, ERROR_MESSAGES_BY_CODE, GAME_NOT_FOUND_MESSAGE, MOVE_REFUSED_MESSAGE,
  REQUEST_TIMEOUT_MS, SERVER_ERROR_MESSAGE, TOO_MANY_STARTS_MESSAGE,
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

/** The game once yellow played after `GAME`: the server knows a move that `GAME` lacks. */
const NEXT_GAME = { ...GAME, lastPlayerWhoPlayed: 'yellow', board: [['red', 'yellow']] };

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

/**
 * A fake `fetch` that gets no answer, and fails as `fetch` does once its signal aborts.
 * @param {string} route - The path of the request.
 * @param {RequestInit} init - The options of the request, with its signal.
 * @returns {Promise<never>} A promise that rejects with the reason of the signal.
 */
const neverAnswer = (route, { signal }) => new Promise((resolve, reject) => {
  signal.addEventListener('abort', () => reject(signal.reason));
});

describe('ERROR_MESSAGES_BY_CODE', () => {
  it('explains every error code of the API, and no other', () => {
    expect(Object.keys(ERROR_MESSAGES_BY_CODE).sort()).toEqual(Object.values(ERROR_CODES).sort());
  });

  it('gives each code its French text', () => {
    expect(ERROR_MESSAGES_BY_CODE).toEqual({
      invalid_player: 'Joueur inconnu du serveur : rechargez la page.',
      invalid_column: 'Cette colonne n’existe pas : rechargez la page.',
      game_over: 'La partie est terminée : lancez une nouvelle partie.',
      not_your_turn: 'Ce n’est pas le tour de ce joueur : le plateau est à jour.',
      no_token_left: 'Ce joueur n’a plus de jeton : lancez une nouvelle partie.',
      column_full: 'Cette colonne est pleine : le plateau est à jour.',
      invalid_move: 'Coup illisible pour le serveur : rechargez la page.',
      invalid_json: 'Coup illisible pour le serveur : rechargez la page.',
      body_too_large: 'Requête trop volumineuse pour le serveur : rechargez la page.',
      unsupported_encoding: 'Format de requête refusé par le serveur : rechargez la page.',
      unsupported_charset: 'Format de requête refusé par le serveur : rechargez la page.',
      unsupported_media_type: 'Format de requête refusé par le serveur : rechargez la page.',
      invalid_request: 'Requête illisible pour le serveur : rechargez la page.',
      game_not_found: 'Cette partie n’existe plus : lancez une nouvelle partie.',
      route_not_found: 'Adresse inconnue du serveur : rechargez la page.',
      method_not_allowed: 'Adresse inconnue du serveur : rechargez la page.',
      too_many_starts: 'Trop de parties lancées depuis cette adresse : réessayez dans une minute.',
    });
  });
});

describe('getErrorCode', () => {
  it.each(Object.values(ERROR_CODES))('reads the code %s', (code) => {
    expect(getErrorCode({ code, message: 'Any message.' })).toBe(code);
  });

  it.each([
    undefined, null, '', 'column_full', 42, [], ['column_full'], {}, { message: 'Refused.' },
    { code: 'teapot' }, { code: 'COLUMN_FULL' }, { code: '' }, { code: null },
    { code: ['column_full'] }, { code: 'toString' }, { code: '__proto__' },
  ])('reads no code from the body %o', (body) => {
    expect(getErrorCode(body)).toBeNull();
  });
});

describe('getErrorMessage', () => {
  it.each(Object.entries(ERROR_MESSAGES_BY_CODE))('explains the code %s by its text', (
    code,
    text,
  ) => {
    expect(getErrorMessage({ status: 400, body: { code, message: 'Any message.' } })).toBe(text);
  });

  it('prefers the code to the status', () => {
    const body = { code: 'column_full', message: 'The column 1 is full!' };

    expect(getErrorMessage({ status: 500, body })).toBe(ERROR_MESSAGES_BY_CODE.column_full);
  });

  it('explains each error status of the API without a body', () => {
    expect(getErrorMessage({ status: 400 })).toBe(MOVE_REFUSED_MESSAGE);
    expect(getErrorMessage({ status: 404 })).toBe(GAME_NOT_FOUND_MESSAGE);
    expect(getErrorMessage({ status: 429 })).toBe(TOO_MANY_STARTS_MESSAGE);
  });

  it.each([
    { code: 'teapot', message: 'Refused.' }, { message: 'Refused.' }, null, 'x',
  ])('falls back to the text of the status for the body %o', (body) => {
    expect(getErrorMessage({ status: 400, body })).toBe(MOVE_REFUSED_MESSAGE);
  });

  it('falls back to the server error message for any other status', () => {
    expect(getErrorMessage({ status: 500 })).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage({ status: 401, body: { code: 'teapot' } })).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage({ status: undefined })).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage({ status: 'toString' })).toBe(SERVER_ERROR_MESSAGE);
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

describe('getStatusRoute', () => {
  it('builds the status route of a game', () => {
    expect(getStatusRoute('abc')).toBe('/game/abc/status');
  });

  it('encodes an id that holds a slash or a space', () => {
    expect(getStatusRoute('a/b c')).toBe('/game/a%2Fb%20c/status');
  });
});

describe('requestGame', () => {
  const route = '/game';

  it('returns the game status of a successful response', async () => {
    const fetchGame = fakeFetch({ status: 201, json: async () => GAME });

    expect(await requestGame({ route, fetchGame })).toEqual({ game: GAME });
  });

  it('passes the route, the options and a timeout signal to fetch', async () => {
    const calls = [];
    const init = { method: 'POST' };
    const fetchGame = async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => GAME };
    };

    await requestGame({ route, init, fetchGame });

    expect(calls).toEqual([[route, { ...init, signal: expect.any(AbortSignal) }]]);
  });

  it('sends a request without options, with its timeout signal alone', async () => {
    const fetchGame = vi.fn(fakeFetch({ status: 200, json: async () => GAME }));

    await requestGame({ route, fetchGame });

    expect(fetchGame).toHaveBeenCalledExactlyOnceWith(route, {
      signal: expect.any(AbortSignal),
    });
  });

  it('waits for an answer for the time of REQUEST_TIMEOUT_MS by default', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    await requestGame({ route, fetchGame: fakeFetch({ status: 200, json: async () => GAME }) });

    expect(timeout).toHaveBeenCalledExactlyOnceWith(REQUEST_TIMEOUT_MS);
    timeout.mockRestore();
  });

  it('explains a request that gets no answer as a connection error', async () => {
    expect(await requestGame({ route, fetchGame: neverAnswer, timeoutMs: 1 }))
      .toEqual({ error: CONNECTION_ERROR_MESSAGE, isAnswerLost: true });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'explains a timeout of %s that the browser refuses as a connection error',
    async (timeoutMs) => {
      const fetchGame = fakeFetch({ status: 200, json: async () => GAME });

      expect(await requestGame({ route, fetchGame, timeoutMs }))
        .toEqual({ error: CONNECTION_ERROR_MESSAGE, isAnswerLost: true });
    },
  );

  it('explains a browser without timeouts as a connection error', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      throw new TypeError('AbortSignal.timeout is not a function');
    });

    const answer = await requestGame({
      route, fetchGame: fakeFetch({ status: 200, json: async () => GAME }),
    });

    timeout.mockRestore();
    expect(answer).toEqual({ error: CONNECTION_ERROR_MESSAGE, isAnswerLost: true });
  });

  it('explains a response whose body never ends as a connection error', async () => {
    const fetchGame = async (requestRoute, { signal }) => ({
      ok: true,
      status: 200,
      json: () => neverAnswer(requestRoute, { signal }),
    });

    expect(await requestGame({ route, fetchGame, timeoutMs: 1 }))
      .toEqual({ error: CONNECTION_ERROR_MESSAGE, isAnswerLost: true });
  });

  it('explains a refused move by the code of its body', async () => {
    const json = async () => ({ code: 'not_your_turn', message: "red: it's not your turn!" });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: ERROR_MESSAGES_BY_CODE.not_your_turn, isStaleRefusal: true });
  });

  it('calls a refused column_full a stale refusal, as not_your_turn', async () => {
    const json = async () => ({ code: 'column_full', message: 'The column 1 is full!' });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: ERROR_MESSAGES_BY_CODE.column_full, isStaleRefusal: true });
  });

  it.each(['game_over', 'no_token_left', 'invalid_move', 'game_not_found'])(
    'does not call a refused %s a stale refusal',
    async (code) => {
      const json = async () => ({ code, message: 'Refused.' });

      expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
        .toEqual({ error: ERROR_MESSAGES_BY_CODE[code], isStaleRefusal: false });
    },
  );

  it('explains a refused move with an unknown code by the generic text', async () => {
    const json = async () => ({ code: 'teapot', message: 'Refused.' });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: MOVE_REFUSED_MESSAGE, isStaleRefusal: false });
  });

  it('explains a refused move whose body is missing or not JSON by the generic text', async () => {
    const missingBody = async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    };
    const htmlBody = async () => {
      throw new SyntaxError('Unexpected token \'<\', "<!doctype "... is not valid JSON');
    };

    const results = await Promise.all([missingBody, htmlBody].map((json) => requestGame({
      route, fetchGame: fakeFetch({ status: 400, json }),
    })));

    expect(results).toEqual([
      { error: MOVE_REFUSED_MESSAGE, isStaleRefusal: false },
      { error: MOVE_REFUSED_MESSAGE, isStaleRefusal: false },
    ]);
  });

  it('explains an error response without a code by its status', async () => {
    const json = async () => ({ message: 'The column 1 is full!' });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: MOVE_REFUSED_MESSAGE, isStaleRefusal: false });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 404, json }) }))
      .toEqual({ error: GAME_NOT_FOUND_MESSAGE, isStaleRefusal: false });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 429, json }) }))
      .toEqual({ error: TOO_MANY_STARTS_MESSAGE, isStaleRefusal: false });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 500, json }) }))
      .toEqual({ error: SERVER_ERROR_MESSAGE, isStaleRefusal: false });
  });

  it('explains a request that does not reach the server', async () => {
    const fetchGame = async () => {
      throw new TypeError('Failed to fetch');
    };

    expect(await requestGame({ route, fetchGame }))
      .toEqual({ error: CONNECTION_ERROR_MESSAGE, isAnswerLost: true });
  });

  it('explains a successful response that holds no game status', async () => {
    const invalidJson = async () => {
      throw new SyntaxError('Unexpected token <');
    };

    const bodies = [invalidJson, async () => ({}), async () => null];
    const results = await Promise.all(bodies.map((json) => requestGame({
      route, fetchGame: fakeFetch({ status: 200, json }),
    })));

    expect(results).toEqual(bodies.map(() => ({
      error: SERVER_ERROR_MESSAGE,
      isAnswerLost: true,
    })));
  });
});

describe('requestMove', () => {
  const init = { method: 'POST', body: '{}' };

  /** The route of the status of `GAME`. */
  const statusRoute = getStatusRoute(GAME.id);

  /** A fake `fetch` that does not reach the server. */
  const failToConnect = async () => {
    throw new TypeError('Failed to fetch');
  };

  /**
   * Builds the answers of a successful request.
   * @param {object} game - The game status of the response.
   * @returns {typeof fetch} The fake.
   */
  const answerGame = (game) => fakeFetch({ status: 200, json: async () => game });

  /**
   * Builds the answers of a move that the server refuses.
   * @param {string} code - The code of the body.
   * @returns {typeof fetch} The fake.
   */
  const refuse = (code) => fakeFetch({
    status: 400,
    json: async () => ({ code, message: 'Refused.' }),
  });

  /**
   * Builds a fake `fetch` that gives each route of a move its own answers.
   * @param {object} params
   * @param {typeof fetch} params.onMove - Answers the request of the move.
   * @param {typeof fetch} [params.onStatus] - Answers the status read.
   * @returns {import('vitest').Mock} The fake, to read the requests it got.
   */
  const fakeRoutes = ({ onMove, onStatus }) => vi.fn(
    (route, options) => (route === statusRoute ? onStatus : onMove)(route, options),
  );

  /**
   * Lists the routes that a fake `fetch` received.
   * @param {import('vitest').Mock} fetchGame - The fake.
   * @returns {string[]} The routes, in order.
   */
  const getRoutes = (fetchGame) => fetchGame.mock.calls.map(([route]) => route);

  it('returns the answer of a played move, without reading the status', async () => {
    const fetchGame = fakeRoutes({ onMove: answerGame(NEXT_GAME) });

    expect(await requestMove({ game: GAME, init, fetchGame })).toEqual({ game: NEXT_GAME });
    expect(fetchGame).toHaveBeenCalledExactlyOnceWith(getPlayRoute(GAME.id), {
      ...init,
      signal: expect.any(AbortSignal),
    });
  });

  it('reads the status with a plain request after a lost answer', async () => {
    const fetchGame = fakeRoutes({ onMove: failToConnect, onStatus: answerGame(NEXT_GAME) });

    await requestMove({ game: GAME, init, fetchGame });

    expect(fetchGame).toHaveBeenLastCalledWith(statusRoute, { signal: expect.any(AbortSignal) });
  });

  it('returns the game of the server, with no error, when the lost move was played', async () => {
    const fetchGame = fakeRoutes({ onMove: failToConnect, onStatus: answerGame(NEXT_GAME) });

    expect(await requestMove({ game: GAME, init, fetchGame })).toEqual({ game: NEXT_GAME });
  });

  it('keeps the error when the server did not get the lost move', async () => {
    const fetchGame = fakeRoutes({ onMove: failToConnect, onStatus: answerGame(GAME) });

    expect(await requestMove({ game: GAME, init, fetchGame }))
      .toEqual({ game: GAME, error: CONNECTION_ERROR_MESSAGE });
  });

  it('settles a move that timed out by the status read', async () => {
    const fetchGame = fakeRoutes({ onMove: neverAnswer, onStatus: answerGame(NEXT_GAME) });

    expect(await requestMove({
      game: GAME, init, fetchGame, timeoutMs: 1,
    })).toEqual({ game: NEXT_GAME });
  });

  it.each([
    ['not JSON', async () => { throw new SyntaxError('Unexpected end of JSON input'); }],
    ['no game status', async () => ({})],
  ])('settles a successful answer whose body is %s by the status read', async (name, json) => {
    const fetchGame = fakeRoutes({
      onMove: fakeFetch({ status: 200, json }),
      onStatus: answerGame(NEXT_GAME),
    });

    expect(await requestMove({ game: GAME, init, fetchGame })).toEqual({ game: NEXT_GAME });
  });

  it.each(['not_your_turn', 'column_full'])(
    'returns the game of the server and the refusal for a refused %s',
    async (code) => {
      const fetchGame = fakeRoutes({ onMove: refuse(code), onStatus: answerGame(NEXT_GAME) });

      expect(await requestMove({ game: GAME, init, fetchGame }))
        .toEqual({ game: NEXT_GAME, error: ERROR_MESSAGES_BY_CODE[code] });
    },
  );

  it.each(['game_over', 'no_token_left', 'invalid_move', 'game_not_found'])(
    'reads no status after a refused %s',
    async (code) => {
      const fetchGame = fakeRoutes({ onMove: refuse(code) });

      const answer = await requestMove({ game: GAME, init, fetchGame });

      expect(answer.game).toBeUndefined();
      expect(answer.error).toBe(ERROR_MESSAGES_BY_CODE[code]);
      expect(getRoutes(fetchGame)).toEqual([getPlayRoute(GAME.id)]);
    },
  );

  it('reads no status after a server failure', async () => {
    const fetchGame = fakeRoutes({ onMove: fakeFetch({ status: 500, json: async () => null }) });

    const answer = await requestMove({ game: GAME, init, fetchGame });

    expect(answer.game).toBeUndefined();
    expect(answer.error).toBe(SERVER_ERROR_MESSAGE);
    expect(getRoutes(fetchGame)).toEqual([getPlayRoute(GAME.id)]);
  });

  it.each([
    ['a lost answer', failToConnect],
    ['a stale refusal', refuse('not_your_turn')],
  ])('reads the status once after %s, and returns no game when it fails too', async (
    name,
    onMove,
  ) => {
    const fetchGame = fakeRoutes({ onMove, onStatus: failToConnect });

    const answer = await requestMove({ game: GAME, init, fetchGame });

    expect(answer.game).toBeUndefined();
    expect(answer.error).toBe(CONNECTION_ERROR_MESSAGE);
    expect(getRoutes(fetchGame)).toEqual([getPlayRoute(GAME.id), statusRoute]);
  });

  it('gives the status read the same timeout, and ends with the connection error', async () => {
    const fetchGame = fakeRoutes({ onMove: neverAnswer, onStatus: neverAnswer });

    const answer = await requestMove({
      game: GAME, init, fetchGame, timeoutMs: 1,
    });

    expect(answer.game).toBeUndefined();
    expect(answer.error).toBe(CONNECTION_ERROR_MESSAGE);
  });

  it('says that the game no longer exists when the status read answers 404', async () => {
    const onStatus = fakeFetch({
      status: 404,
      json: async () => ({ code: 'game_not_found', message: 'Not found.' }),
    });
    const fetchGame = fakeRoutes({ onMove: failToConnect, onStatus });

    const answer = await requestMove({ game: GAME, init, fetchGame });

    expect(answer.game).toBeUndefined();
    expect(answer.error).toBe(GAME_NOT_FOUND_MESSAGE);
  });

  it.each([
    ['fails', fakeFetch({ status: 500, json: async () => null })],
    ['holds no game status', answerGame({ id: GAME.id })],
    ['is empty', answerGame(null)],
  ])('returns no game when the answer of the status read %s', async (name, onStatus) => {
    const fetchGame = fakeRoutes({ onMove: failToConnect, onStatus });

    const answer = await requestMove({ game: GAME, init, fetchGame });

    expect(answer.game).toBeUndefined();
    expect(answer.error).toBe(SERVER_ERROR_MESSAGE);
  });
});
