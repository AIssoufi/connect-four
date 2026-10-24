import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import { gzipSync } from 'node:zlib';
import createApp from './createApp';
import listen from './testServer';
import createGameStore from '../worker/createGameStore';
import { createFakeGameNamespace } from '../worker/testDoubles';
import { BAD_REQUEST_STATUS, NOT_FOUND_STATUS, SERVER_ERROR_STATUS } from './constants';
import { GAME_ID_LENGTH } from '../worker/constants';

const PAYLOAD_TOO_LARGE_STATUS = 413;
const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;
/** A valid move, which the parser reads unless its encoding or charset is refused. */
const MOVE_BODY = JSON.stringify({ playerId: 'red', column: 1 });
/** Above the 100 kB that `express.json()` accepts by default. */
const TOO_LARGE_BODY = JSON.stringify({ playerId: 'red', column: 1, padding: 'x'.repeat(200000) });
/** An id that no game has: the body is refused before the id is looked up. */
const UNKNOWN_GAME_ID = '0'.repeat(GAME_ID_LENGTH);

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
    expect(await response.json()).toEqual({ message: 'This route does not exist.' });
  });

  it('does not say that Express serves the API', async () => {
    await startServer();

    const response = await fetch(`${server.baseUrl}/`);

    expect(response.headers.get('X-Powered-By')).toBeNull();
  });

  it.each([
    ['malformed JSON', '{"playerId":'],
    // `express.json()` takes only objects and arrays.
    ['JSON null', 'null'],
  ])('refuses %s with the message of the parser', async (_case, body) => {
    await startServer();

    const response = await postMove({ gameId: UNKNOWN_GAME_ID, body });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(await response.json()).toEqual({ message: expect.stringContaining('JSON') });
  });

  it('refuses a body above the limit of the parser', async () => {
    await startServer();

    const response = await postMove({ gameId: UNKNOWN_GAME_ID, body: TOO_LARGE_BODY });

    expect(response.status).toBe(PAYLOAD_TOO_LARGE_STATUS);
    expect(await response.json()).toEqual({ message: 'request entity too large' });
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
    expect(await response.json()).toEqual({ message: 'content encoding unsupported' });
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
    expect(await response.json()).toEqual({ message: 'No game has this id.' });
  });

  it('refuses a charset other than UTF-8 with 415', async () => {
    await startServer();

    const response = await postMove({
      gameId: UNKNOWN_GAME_ID,
      body: MOVE_BODY,
      headers: { 'Content-Type': 'application/json; charset=latin1' },
    });

    expect(response.status).toBe(UNSUPPORTED_MEDIA_TYPE_STATUS);
    expect(await response.json()).toEqual({ message: 'unsupported charset "LATIN1"' });
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
