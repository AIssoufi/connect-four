import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import { gzipSync } from 'node:zlib';
import createApp from './createApp';
import listen from './testServer';
import createGameStore from '../worker/createGameStore';
import { createFakeGameNamespace } from '../worker/testDoubles';
import {
  OK_STATUS,
  CREATED_STATUS,
  NO_CONTENT_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  METHOD_NOT_ALLOWED_STATUS,
  SERVER_ERROR_STATUS,
} from './constants';
import { GAME_ID_LENGTH } from '../worker/constants';

const PAYLOAD_TOO_LARGE_STATUS = 413;
const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;
/** A valid move, which the parser reads unless its encoding or charset is refused. */
const MOVE_BODY = JSON.stringify({ playerId: 'red', column: 1 });
/** Above the 100 kB that `express.json()` accepts by default. */
const TOO_LARGE_BODY = JSON.stringify({ playerId: 'red', column: 1, padding: 'x'.repeat(200000) });
/** An id that no game has: the body is refused before the id is looked up. */
const UNKNOWN_GAME_ID = '0'.repeat(GAME_ID_LENGTH);
/** The message of a 405, written out so that a change of the constant fails the tests. */
const METHOD_NOT_ALLOWED_MESSAGE = 'This route does not accept this method: see the Allow header.';
/** The `Allow` header of the paths that start a game or play a move. */
const WRITE_ALLOW = 'POST, OPTIONS';
/** The `Allow` header of the path that reads a game. */
const READ_ALLOW = 'GET, HEAD, OPTIONS';
/** The headers that every answer of the app carries, with their values. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
};

/**
 * Reads the headers of `SECURITY_HEADERS` from an answer.
 * @param {Response} response - The answer of the app.
 * @returns {Record<string, string | null>} Each header name with its value, `null` when missing.
 */
const readSecurityHeaders = (response) => Object.fromEntries(
  Object.keys(SECURITY_HEADERS).map((name) => [name, response.headers.get(name)]),
);

describe('createApp', () => {
  let server;

  /**
   * Serves an app over a store of fake games.
   * @param {object} [games] - The store, one over a fake namespace by default.
   */
  const startServer = async (games = createGameStore({ namespace: createFakeGameNamespace() })) => {
    server = await listen(createApp({ games }));
  };

  const postMove = ({ gameId, body, headers }) => fetch(`${server.baseUrl}/game/${gameId}/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });

  afterEach(async () => {
    await server.close();
    vi.restoreAllMocks();
  });

  it.each([
    ['the root', '/'],
    ['the old status route', '/game/status'],
    ['the old play route', '/game/play?playerid=red&column=1'],
  ])('answers 404 in JSON for %s', async (_case, route) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}${route}`);

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(await response.json()).toEqual({ code: 'route_not_found', message: 'This route does not exist.' });
  });

  it.each([
    ['the game path without status or play', 'GET', `/game/${UNKNOWN_GAME_ID}`],
    ['a path under the play route', 'GET', `/game/${UNKNOWN_GAME_ID}/play/1`],
    ['an unknown path called with DELETE', 'DELETE', '/unknown'],
  ])('still answers 404 in JSON for %s', async (_case, method, route) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}${route}`, { method });

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.headers.get('Allow')).toBeNull();
    expect(await response.json()).toEqual({ code: 'route_not_found', message: 'This route does not exist.' });
  });

  it.each([
    ['GET', `/game/${UNKNOWN_GAME_ID}/play`, WRITE_ALLOW],
    ['DELETE', '/game', WRITE_ALLOW],
    ['GET', '/game', WRITE_ALLOW],
    ['GET', '/game/', WRITE_ALLOW],
    ['PUT', `/game/${UNKNOWN_GAME_ID}/play`, WRITE_ALLOW],
    ['POST', `/game/${UNKNOWN_GAME_ID}/status`, READ_ALLOW],
    ['DELETE', `/game/${UNKNOWN_GAME_ID}/status`, READ_ALLOW],
    ['PATCH', `/game/${UNKNOWN_GAME_ID}/status/`, READ_ALLOW],
  ])('answers %s %s with 405 and Allow: %s', async (method, route, allow) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}${route}`, { method });

    expect(response.status).toBe(METHOD_NOT_ALLOWED_STATUS);
    expect(response.headers.get('Allow')).toBe(allow);
    expect(await response.json()).toEqual({ code: 'method_not_allowed', message: METHOD_NOT_ALLOWED_MESSAGE });
  });

  it('answers HEAD on a path without GET with 405 and Allow, without a body', async () => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/game`, { method: 'HEAD' });

    expect(response.status).toBe(METHOD_NOT_ALLOWED_STATUS);
    expect(response.headers.get('Allow')).toBe(WRITE_ALLOW);
    expect(await response.text()).toBe('');
  });

  it('answers HEAD on the status path with its GET handler', async () => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/game/${UNKNOWN_GAME_ID}/status`, {
      method: 'HEAD',
    });

    // The GET handler looked the id up: HEAD is one of the methods of the path.
    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.headers.get('Allow')).toBeNull();
  });

  it.each([
    ['/game', WRITE_ALLOW],
    [`/game/${UNKNOWN_GAME_ID}/play`, WRITE_ALLOW],
    [`/game/${UNKNOWN_GAME_ID}/status`, READ_ALLOW],
  ])('answers OPTIONS %s with 204 and Allow: %s', async (route, allow) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}${route}`, { method: 'OPTIONS' });

    expect(response.status).toBe(NO_CONTENT_STATUS);
    expect(response.headers.get('Allow')).toBe(allow);
    expect(await response.text()).toBe('');
  });

  it('serves the methods that Allow lists', async () => {
    await startServer();

    const startResponse = await fetch(`${server.baseUrl}/game`, { method: 'POST' });
    const { id } = await startResponse.json();
    const statusResponse = await fetch(`${server.baseUrl}/game/${id}/status`);
    const playResponse = await postMove({ gameId: id, body: MOVE_BODY });

    expect(startResponse.status).toBe(CREATED_STATUS);
    expect(statusResponse.status).toBe(OK_STATUS);
    expect(playResponse.status).toBe(OK_STATUS);
  });

  it('does not say that Express serves the API', async () => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/`);

    expect(response.headers.get('X-Powered-By')).toBeNull();
  });

  it('sends nosniff and HSTS with a game start', async () => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/game`, { method: 'POST' });

    expect(response.status).toBe(CREATED_STATUS);
    expect(readSecurityHeaders(response)).toEqual(SECURITY_HEADERS);
  });

  it.each([
    ['the JSON 404', () => fetch(`${server.baseUrl}/`), NOT_FOUND_STATUS],
    [
      'the 405 of a method that a path does not serve',
      () => fetch(`${server.baseUrl}/game`, { method: 'DELETE' }),
      METHOD_NOT_ALLOWED_STATUS,
    ],
    [
      'the refusal of a body by the parser',
      () => postMove({ gameId: UNKNOWN_GAME_ID, body: 'null' }),
      BAD_REQUEST_STATUS,
    ],
  ])('sends nosniff and HSTS with %s', async (_case, send, status) => {
    await startServer();

    const response = await send();

    expect(response.status).toBe(status);
    expect(readSecurityHeaders(response)).toEqual(SECURITY_HEADERS);
  });

  it('sends nosniff and HSTS with the 500 of an unexpected error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await startServer({
      create: async () => { throw new TypeError('Unexpected'); },
    });

    const response = await fetch(`${server.baseUrl}/game`, { method: 'POST' });

    expect(response.status).toBe(SERVER_ERROR_STATUS);
    expect(readSecurityHeaders(response)).toEqual(SECURITY_HEADERS);
  });

  it.each([
    ['malformed JSON', '{"playerId":'],
    // `express.json()` takes only objects and arrays.
    ['JSON null', 'null'],
  ])('refuses %s with the message of the parser', async (_case, body) => {
    await startServer();

    const response = await postMove({ gameId: UNKNOWN_GAME_ID, body });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(await response.json()).toEqual({ code: 'invalid_json', message: expect.stringContaining('JSON') });
  });

  it('refuses a body above the limit of the parser', async () => {
    await startServer();

    const response = await postMove({ gameId: UNKNOWN_GAME_ID, body: TOO_LARGE_BODY });

    expect(response.status).toBe(PAYLOAD_TOO_LARGE_STATUS);
    expect(await response.json()).toEqual({ code: 'body_too_large', message: 'request entity too large' });
  });

  it.each([
    ['a gzip body', 'gzip', gzipSync(MOVE_BODY)],
    ['an encoding in capitals', 'GZIP', gzipSync(MOVE_BODY)],
    ['a deflate body', 'deflate', MOVE_BODY],
    ['a brotli body', 'br', MOVE_BODY],
    ['an unknown encoding', 'x-unknown', MOVE_BODY],
    ['an empty gzip body', 'gzip', ''],
  ])('refuses %s with 415, without inflating it', async (_case, encoding, body) => {
    await startServer();

    const response = await postMove({
      gameId: UNKNOWN_GAME_ID, body, headers: { 'Content-Encoding': encoding },
    });

    expect(response.status).toBe(UNSUPPORTED_MEDIA_TYPE_STATUS);
    expect(await response.json()).toEqual({ code: 'unsupported_encoding', message: 'content encoding unsupported' });
  });

  it.each([
    ['the identity encoding', { 'Content-Encoding': 'identity' }],
    ['the identity encoding in capitals', { 'Content-Encoding': 'IDENTITY' }],
    ['no encoding', {}],
  ])('reads a plain body with %s', async (_case, headers) => {
    await startServer();

    const response = await postMove({ gameId: UNKNOWN_GAME_ID, body: MOVE_BODY, headers });

    // The body passed the parser: only the unknown game is refused.
    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(await response.json()).toEqual({ code: 'game_not_found', message: 'No game has this id.' });
  });

  it('refuses a charset other than UTF-8 with 415', async () => {
    await startServer();

    const response = await postMove({
      gameId: UNKNOWN_GAME_ID,
      body: MOVE_BODY,
      headers: { 'Content-Type': 'application/json; charset=latin1' },
    });

    expect(response.status).toBe(UNSUPPORTED_MEDIA_TYPE_STATUS);
    expect(await response.json()).toEqual({ code: 'unsupported_charset', message: 'unsupported charset "LATIN1"' });
  });

  it.each([
    ['an unknown type', 'request.aborted'],
    ['no type', undefined],
  ])('answers an exposed client error with %s with invalid_request', async (_case, type) => {
    const abortedRequest = Object.assign(new Error('request aborted'), {
      status: BAD_REQUEST_STATUS, expose: true, type,
    });
    await startServer({
      create: async () => { throw abortedRequest; },
    });

    const response = await fetch(`${server.baseUrl}/game`, { method: 'POST' });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(await response.json()).toEqual({ code: 'invalid_request', message: 'request aborted' });
  });

  it('answers 500 without the details of an unexpected error, and logs it', async () => {
    const unexpectedError = new TypeError('Secret details');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await startServer({
      create: async () => { throw unexpectedError; },
    });

    const response = await fetch(`${server.baseUrl}/game`, { method: 'POST' });
    const text = await response.text();

    expect(response.status).toBe(SERVER_ERROR_STATUS);
    expect(JSON.parse(text)).toEqual({ message: 'Server error.' });
    expect(text).not.toContain('Secret details');
    expect(consoleError).toHaveBeenCalledWith(unexpectedError);
  });
});
