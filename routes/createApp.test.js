import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import { request as httpRequest } from 'node:http';
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
import { GAME_ID_LENGTH, GAME_STORE_CHECK_ID } from '../worker/constants';

const PAYLOAD_TOO_LARGE_STATUS = 413;
const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;
/** A valid move, which the parser reads unless its encoding or charset is refused. */
const MOVE_BODY = JSON.stringify({ playerId: 'red', column: 1 });
/** Above the 100 kB that `express.json()` accepts by default. */
const TOO_LARGE_BODY = JSON.stringify({ playerId: 'red', column: 1, padding: 'x'.repeat(200000) });
/** An id that no game has: the body is refused before the id is looked up. */
const UNKNOWN_GAME_ID = 'f'.repeat(GAME_ID_LENGTH);
/** The message of a 405, written out so that a change of the constant fails the tests. */
const METHOD_NOT_ALLOWED_MESSAGE = 'This route does not accept this method: see the Allow header.';
/** The `Allow` header of the paths that start a game or play a move. */
const WRITE_ALLOW = 'POST, OPTIONS';
/** The `Allow` header of the path that reads a game. */
const READ_ALLOW = 'GET, HEAD, OPTIONS';
/** The `Accept` header that Chrome and Firefox send when they open a page. */
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
/** The headers of the 404 page alone, written out so that a change of a constant fails a test. */
const PAGE_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
/** The headers of `PAGE_HEADERS`, missing from a JSON answer. */
const NO_PAGE_HEADERS = { 'Content-Security-Policy': null, 'Referrer-Policy': null };
/** The headers that every answer of the app carries, with their values. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/**
 * Reads the headers of `SECURITY_HEADERS` from an answer.
 * @param {Response} response - The answer of the app.
 * @returns {Record<string, string | null>} Each header name with its value, `null` when missing.
 */
const readSecurityHeaders = (response) => Object.fromEntries(
  Object.keys(SECURITY_HEADERS).map((name) => [name, response.headers.get(name)]),
);

/**
 * Reads the headers of `PAGE_HEADERS` from an answer.
 * @param {Response} response - The answer of the app.
 * @returns {Record<string, string | null>} Each header name with its value, `null` when missing.
 */
const readPageHeaders = (response) => Object.fromEntries(
  Object.keys(PAGE_HEADERS).map((name) => [name, response.headers.get(name)]),
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
    ['any type', '*/*'],
    ['an empty list of types', ''],
    ['a malformed list of types', ';;,'],
    ['JSON', 'application/json'],
    ['JSON before HTML', 'application/json, text/html;q=0.9'],
    ['a type that the app does not send', 'image/png'],
  ])('answers 404 in JSON to a client that accepts %s', async (_case, accept) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/about`, { headers: { Accept: accept } });

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.headers.get('Content-Type')).toMatch(/^application\/json/);
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(await response.json()).toEqual({ code: 'route_not_found', message: 'This route does not exist.' });
  });

  it.each([
    ['a browser', BROWSER_ACCEPT],
    ['HTML alone', 'text/html'],
  ])('answers 404 with the page to a client that accepts %s', async (_case, accept) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/api`, { headers: { Accept: accept } });
    const page = await response.text();

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(readPageHeaders(response)).toEqual(PAGE_HEADERS);
    expect(readSecurityHeaders(response)).toEqual(SECURITY_HEADERS);
    expect(page).toContain('<html lang="fr">');
    expect(page).toContain('<title>Page introuvable - Puissance 4</title>');
    expect(page).toContain('<a href="/">Jouer une partie</a>');
    expect(page).toContain('<a href="/api/v1/">Lire la documentation de l\'API</a>');
    expect(page).toContain('href="/style.css"');
    expect(page).toContain('href="/favicon.svg"');
    expect(page).not.toContain('<script');
    expect(page).not.toContain('\u2014');
  });

  it('answers 404 in JSON to a client that sends no Accept', async () => {
    await startServer();

    // `fetch` adds `Accept: */*` to every request, so the request goes through `node:http`.
    const { status, headers, body } = await new Promise((resolve, reject) => {
      const request = httpRequest(`${server.baseUrl}/about`, (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => {
          resolve({ status: response.statusCode, headers: response.headers, body: text });
        });
      });
      request.on('error', reject);
      request.end();
    });

    expect(status).toBe(NOT_FOUND_STATUS);
    expect(headers['content-type']).toBe('application/json; charset=utf-8');
    expect(headers.vary).toBe('Accept');
    expect(JSON.parse(body)).toEqual({ code: 'route_not_found', message: 'This route does not exist.' });
  });

  it.each([
    ['a browser', BROWSER_ACCEPT, 'text/html; charset=utf-8', PAGE_HEADERS],
    ['an API client', 'application/json', 'application/json; charset=utf-8', NO_PAGE_HEADERS],
  ])('answers HEAD on an unknown path from %s with 404 and no body', async (_case, accept, type, pageHeaders) => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/about`, {
      method: 'HEAD',
      headers: { Accept: accept },
    });

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.headers.get('Content-Type')).toBe(type);
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(readPageHeaders(response)).toEqual(pageHeaders);
    expect(readSecurityHeaders(response)).toEqual(SECURITY_HEADERS);
    expect(await response.text()).toBe('');
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
    // A bare word is not JSON, while `null` or `"red"` is and gets `invalid_move`.
    ['a bare word', 'red'],
  ])('refuses %s with the message of the parser', async (_case, body) => {
    await startServer();

    const response = await postMove({ gameId: UNKNOWN_GAME_ID, body });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(await response.json()).toEqual({ code: 'invalid_json', message: expect.stringContaining('JSON') });
  });

  it('answers the status of the live check with 404 from its Durable Object', async () => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/game/${GAME_STORE_CHECK_ID}/status`);

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(await response.json()).toEqual({ code: 'game_not_found', message: 'No game has this id.' });
  });

  it('answers the status of the live check with 500 when the Durable Objects are not bound', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await startServer(createGameStore({ namespace: undefined }));

    const response = await fetch(`${server.baseUrl}/game/${GAME_STORE_CHECK_ID}/status`);

    expect(response.status).toBe(SERVER_ERROR_STATUS);
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

  describe('with a game id whose percent-encoding cannot be decoded', () => {
    const GAME_NOT_FOUND_BODY = { code: 'game_not_found', message: 'No game has this id.' };

    /**
     * Sends a request to a route of a game.
     * @param {object} params
     * @param {string} params.method - `GET` for the status route, `POST` for the play route.
     * @param {string} params.gameId - The game id, written as is in the path.
     * @returns {Promise<Response>} The answer of the app.
     */
    const requestGame = ({ method, gameId }) => (method === 'GET'
      ? fetch(`${server.baseUrl}/game/${gameId}/status`)
      : postMove({ gameId, body: MOVE_BODY }));

    it.each([
      ['GET', '%E0'],
      ['GET', '%'],
      ['GET', '%G0'],
      ['POST', '%E0'],
      ['POST', '%'],
      ['POST', '%G0'],
    ])('answers %s with 404 game_not_found for %s, without logging a server error', async (
      method,
      gameId,
    ) => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await startServer();

      const response = await requestGame({ method, gameId });

      expect(response.status).toBe(NOT_FOUND_STATUS);
      expect(await response.json()).toEqual(GAME_NOT_FOUND_BODY);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it.each(['GET', 'POST'])('still answers %s for a valid encoding (%20) as for an unknown id', async (
      method,
    ) => {
      await startServer();

      const response = await requestGame({ method, gameId: '%20' });

      expect(response.status).toBe(NOT_FOUND_STATUS);
      expect(await response.json()).toEqual(GAME_NOT_FOUND_BODY);
    });

    it('still answers 500 to a URIError that a route throws, and logs it', async () => {
      const routeError = new URIError('URI malformed');
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await startServer({
        create: async () => { throw routeError; },
      });

      const response = await fetch(`${server.baseUrl}/game`, { method: 'POST' });

      expect(response.status).toBe(SERVER_ERROR_STATUS);
      expect(await response.json()).toEqual({ message: 'Server error.' });
      expect(consoleError).toHaveBeenCalledWith(routeError);
    });
  });
});
