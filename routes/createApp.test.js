import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import createApp from './createApp';
import listen from './testServer';
import createGameStore from '../worker/createGameStore';
import { createFakeGameNamespace } from '../worker/testDoubles';
import { BAD_REQUEST_STATUS, NOT_FOUND_STATUS, SERVER_ERROR_STATUS } from './constants';
import { GAME_ID_LENGTH } from '../worker/constants';

const PAYLOAD_TOO_LARGE_STATUS = 413;
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

  const postMove = ({ gameId, body }) => fetch(`${server.baseUrl}/game/${gameId}/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
