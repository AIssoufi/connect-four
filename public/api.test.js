import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '../app/constants.js';
import {
  getErrorCode, getErrorMessage, getPlayRoute, requestGame,
} from './api.js';
import {
  CONNECTION_ERROR_MESSAGE, ERROR_MESSAGES_BY_CODE, GAME_NOT_FOUND_MESSAGE, MOVE_REFUSED_MESSAGE,
  SERVER_ERROR_MESSAGE, TOO_MANY_STARTS_MESSAGE,
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

describe('ERROR_MESSAGES_BY_CODE', () => {
  it('explains every error code of the API, and no other', () => {
    expect(Object.keys(ERROR_MESSAGES_BY_CODE).sort()).toEqual(Object.values(ERROR_CODES).sort());
  });

  it('gives each code its French text', () => {
    expect(ERROR_MESSAGES_BY_CODE).toEqual({
      invalid_player: 'Joueur inconnu du serveur : rechargez la page.',
      invalid_column: 'Cette colonne n’existe pas : rechargez la page.',
      game_over: 'La partie est terminée : lancez une nouvelle partie.',
      not_your_turn: 'Ce n’est pas le tour de ce joueur : rechargez la page.',
      no_token_left: 'Ce joueur n’a plus de jeton : lancez une nouvelle partie.',
      column_full: 'Cette colonne est pleine : rechargez la page.',
      invalid_move: 'Coup illisible pour le serveur : rechargez la page.',
      invalid_json: 'Coup illisible pour le serveur : rechargez la page.',
      body_too_large: 'Requête trop volumineuse pour le serveur : rechargez la page.',
      unsupported_encoding: 'Format de requête refusé par le serveur : rechargez la page.',
      unsupported_charset: 'Format de requête refusé par le serveur : rechargez la page.',
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

  it('explains a refused move by the code of its body', async () => {
    const json = async () => ({ code: 'not_your_turn', message: "red: it's not your turn!" });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: ERROR_MESSAGES_BY_CODE.not_your_turn });
  });

  it('explains a refused move with an unknown code by the generic text', async () => {
    const json = async () => ({ code: 'teapot', message: 'Refused.' });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: MOVE_REFUSED_MESSAGE });
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

    expect(results).toEqual([{ error: MOVE_REFUSED_MESSAGE }, { error: MOVE_REFUSED_MESSAGE }]);
  });

  it('explains an error response without a code by its status', async () => {
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
