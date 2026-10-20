import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest';
import express from 'express';
import createGameRouter from './index';
import Engine from '../app/engine';
import { OK_STATUS, BAD_REQUEST_STATUS } from './constants';

const SERVER_ERROR_STATUS = 500;
/** Port 0 lets the system pick a free port. */
const ANY_FREE_PORT = 0;

describe('game routes', () => {
  let server;
  let baseUrl;
  let routeErrors;

  /**
   * Serves the game routes on a free port, and records the errors they pass on.
   * @param {object} [routerParams] - The params of `createGameRouter`.
   */
  const startServer = async (routerParams) => {
    const app = express();
    app.use('/game', createGameRouter(routerParams));
    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
      routeErrors.push(error);
      if (!res.headersSent) res.status(SERVER_ERROR_STATUS).json({ message: 'Server error' });
    });

    await new Promise((resolve) => {
      server = app.listen(ANY_FREE_PORT, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}/game`;
  };

  /**
   * Plays one move through the API.
   * @param {string} [query] - The query string, without `?`.
   * @returns {Promise<{ status: number, body: object }>} The response.
   */
  const play = async (query = '') => {
    const response = await fetch(`${baseUrl}/play?${query}`);

    return { status: response.status, body: await response.json() };
  };

  beforeEach(() => {
    routeErrors = [];
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    // A second response of the same request fails after the first one is sent.
    expect(routeErrors).toEqual([]);
  });

  describe('with a game', () => {
    beforeEach(() => startServer());

    it('gives the status of a new game', async () => {
      const response = await fetch(`${baseUrl}/status`);

      expect(response.status).toBe(OK_STATUS);
      expect(await response.json()).toMatchObject({ state: 'playing', winner: 'no winner' });
    });

    it('plays a move and returns the new status', async () => {
      const { status, body } = await play('playerid=red&column=1');

      expect(status).toBe(OK_STATUS);
      expect(body).toMatchObject({ lastPlayerWhoPlayed: 'red', tokens: { red: 20, yellow: 21 } });
      expect(body.board[5][0]).toBe('red');
    });

    it('sets the winner on a winning move', async () => {
      const queries = [
        'playerid=red&column=1', 'playerid=yellow&column=2',
        'playerid=red&column=1', 'playerid=yellow&column=2',
        'playerid=red&column=1', 'playerid=yellow&column=2',
      ];
      // The moves must run one after the other, in order.
      await queries.reduce(
        (previous, query) => previous.then(() => play(query)),
        Promise.resolve(),
      );

      const { status, body } = await play('playerid=red&column=1');

      expect(status).toBe(OK_STATUS);
      expect(body).toMatchObject({ winner: 'red', state: 'won' });
    });

    it.each([
      ['no query', ''],
      ['an unknown player', 'playerid=green&column=1'],
      ['a column with letters', 'playerid=red&column=abc'],
      ['digits then letters', 'playerid=red&column=7abc'],
      ['a decimal column', 'playerid=red&column=2.5'],
      ['a column out of the board', 'playerid=red&column=8'],
      ['a repeated column', 'playerid=red&column=1&column=2'],
    ])('refuses %s without playing', async (_case, query) => {
      const { status, body } = await play(query);
      const statusAfter = await (await fetch(`${baseUrl}/status`)).json();

      expect(status).toBe(BAD_REQUEST_STATUS);
      expect(body.message).toMatch(/must be/);
      expect(statusAfter).toEqual(new Engine().getStatus());
    });

    it('refuses a move that breaks a rule with its message', async () => {
      await play('playerid=red&column=1');

      const { status, body } = await play('playerid=red&column=2');

      expect(status).toBe(BAD_REQUEST_STATUS);
      expect(body).toEqual({ message: "red: it's not your turn!" });
    });
  });

  it('passes an unexpected error on instead of answering 400', async () => {
    const engine = new Engine();
    engine.play = () => { throw new TypeError('Unexpected'); };
    await startServer({ engine });

    const { status } = await play('playerid=red&column=1');

    expect(status).toBe(SERVER_ERROR_STATUS);
    expect(routeErrors).toEqual([new TypeError('Unexpected')]);
    routeErrors = [];
  });

  it('serves the game it is given', async () => {
    const engine = new Engine();
    engine.play({ playerId: 'yellow', column: 4 });
    await startServer({ engine });

    const response = await fetch(`${baseUrl}/status`);

    expect((await response.json()).lastPlayerWhoPlayed).toBe('yellow');
  });
});
