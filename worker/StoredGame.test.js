import {
  describe, it, expect, beforeEach, vi,
} from 'vitest';
import StoredGame from './StoredGame';
import Engine from '../app/engine';
import { createMapStorage } from './testDoubles';
import { DRAW_MOVES, RED_WINS_MOVES, readMoves } from '../app/testMoves';
import { MOVES_STORAGE_KEY, GAME_TTL_MS } from './constants';

const NEW_GAME_STATUS = new Engine().getStatus();
/** Time of the fake clock when a test starts, in ms since the epoch. */
const START_TIME_MS = Date.UTC(2026, 9, 20);
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Plays moves written as `R1 Y2` in a game, one after the other.
 * @param {object} params
 * @param {StoredGame} params.game - The game to play.
 * @param {string} params.moves - The moves, separated by spaces.
 * @returns {Promise<void>} Resolves once the last move is played.
 */
const playMoves = ({ game, moves }) => readMoves(moves).reduce(
  (previous, move) => previous.then(() => game.play(move)),
  Promise.resolve(),
);

describe('StoredGame', () => {
  let storage;
  let scheduleDeletion;
  let currentTimeMs;

  /**
   * Builds a game over the storage, the deletion schedule and the fake clock of the test.
   * @returns {StoredGame} The game.
   */
  const createGame = () => new StoredGame({ storage, scheduleDeletion, now: () => currentTimeMs });

  beforeEach(() => {
    storage = createMapStorage();
    scheduleDeletion = vi.fn(async () => {});
    currentTimeMs = START_TIME_MS;
  });

  describe('before the start', () => {
    it.each([
      ['an empty storage', undefined],
      ['moves that are not a list', 'R1'],
      ['null moves', null],
    ])('has no game with %s', async (_case, moves) => {
      if (moves !== undefined) storage.put(MOVES_STORAGE_KEY, moves);

      const game = createGame();

      expect(game.isStarted()).toBe(false);
      expect(game.getStatus()).toBeNull();
      expect(await game.play({ playerId: 'red', column: 1 })).toBeNull();
    });

    it('saves and schedules nothing when a move comes before the start', async () => {
      await createGame().play({ playerId: 'red', column: 1 });

      expect(storage.get(MOVES_STORAGE_KEY)).toBeUndefined();
      expect(scheduleDeletion).not.toHaveBeenCalled();
    });

    it('saves no game when the start cannot schedule its deletion', async () => {
      const scheduleError = new Error('Alarm not set');
      scheduleDeletion.mockRejectedValueOnce(scheduleError);
      const game = createGame();

      await expect(game.start()).rejects.toThrow(scheduleError);
      expect(storage.get(MOVES_STORAGE_KEY)).toBeUndefined();
      expect(game.isStarted()).toBe(false);
    });
  });

  describe('once started', () => {
    let game;

    beforeEach(async () => {
      game = createGame();
      await game.start();
    });

    it('starts an empty game and saves it without moves', () => {
      expect(game.isStarted()).toBe(true);
      expect(game.getStatus()).toEqual(NEW_GAME_STATUS);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
    });

    it('gives the status of the new game when it starts', async () => {
      storage = createMapStorage();

      expect(await createGame().start()).toEqual(NEW_GAME_STATUS);
    });

    it('schedules the deletion of the game GAME_TTL_MS after its start', () => {
      expect(scheduleDeletion).toHaveBeenCalledTimes(1);
      expect(scheduleDeletion).toHaveBeenCalledWith(START_TIME_MS + GAME_TTL_MS);
    });

    it('plays a move, then saves it', async () => {
      const result = await game.play({ playerId: 'red', column: 4 });

      expect(result.status).toMatchObject({ lastPlayerWhoPlayed: 'red', tokens: { red: 20 } });
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([{ playerId: 'red', column: 4 }]);
    });

    it('postpones the deletion to GAME_TTL_MS after each move', async () => {
      currentTimeMs = START_TIME_MS + ONE_HOUR_MS;
      await game.play({ playerId: 'red', column: 4 });
      currentTimeMs = START_TIME_MS + GAME_TTL_MS - 1;
      await game.play({ playerId: 'yellow', column: 4 });

      expect(scheduleDeletion.mock.calls).toEqual([
        [START_TIME_MS + GAME_TTL_MS],
        [START_TIME_MS + ONE_HOUR_MS + GAME_TTL_MS],
        [START_TIME_MS + 2 * GAME_TTL_MS - 1],
      ]);
    });

    it('saves only the player and the column of a move', async () => {
      await game.play({ playerId: 'red', column: 4, extra: 'ignored' });

      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([{ playerId: 'red', column: 4 }]);
    });

    it.each([
      ['a move out of turn', 'R1', { playerId: 'red', column: 2 }, 'not_your_turn', "red: it's not your turn!"],
      ['a move in a full column', 'R1 Y1 R1 Y1 R1 Y1', { playerId: 'red', column: 1 }, 'column_full', 'The column 1 is full!'],
      ['a move after a win', RED_WINS_MOVES, { playerId: 'yellow', column: 3 }, 'game_over', 'The game is over!'],
    ])('refuses %s with its rule, without saving it or postponing the deletion', async (_case, moves, move, code, message) => {
      await playMoves({ game, moves });
      const savedMoves = storage.get(MOVES_STORAGE_KEY);
      const statusBefore = game.getStatus();
      scheduleDeletion.mockClear();

      expect(await game.play(move)).toEqual({ refusal: { code, message } });
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual(savedMoves);
      expect(game.getStatus()).toEqual(statusBefore);
      expect(scheduleDeletion).not.toHaveBeenCalled();
    });

    it('passes on an error of the engine that breaks no rule', async () => {
      const unexpectedError = new TypeError('Unexpected');
      game.engine.play = () => { throw unexpectedError; };
      scheduleDeletion.mockClear();

      await expect(game.play({ playerId: 'red', column: 1 })).rejects.toThrow(unexpectedError);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
      expect(scheduleDeletion).not.toHaveBeenCalled();
    });

    it('passes on a failure to postpone the deletion, and keeps the move saved', async () => {
      const scheduleError = new Error('Alarm not set');
      scheduleDeletion.mockRejectedValueOnce(scheduleError);

      await expect(game.play({ playerId: 'red', column: 1 })).rejects.toThrow(scheduleError);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([{ playerId: 'red', column: 1 }]);
      expect(createGame().getStatus()).toEqual(game.getStatus());
    });

    it('keeps the game going on when a new start cannot schedule its deletion', async () => {
      await playMoves({ game, moves: 'R4 Y4' });
      const statusBefore = game.getStatus();
      scheduleDeletion.mockRejectedValueOnce(new Error('Alarm not set'));

      await expect(game.start()).rejects.toThrow('Alarm not set');
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual(readMoves('R4 Y4'));
      expect(game.getStatus()).toEqual(statusBefore);
    });

    it.each([
      ['a game going on', 'R4 Y4 R3'],
      ['a won game', RED_WINS_MOVES],
      ['a draw', DRAW_MOVES],
    ])('replays %s in a new instance over the same storage, without scheduling', async (_case, moves) => {
      await playMoves({ game, moves });
      scheduleDeletion.mockClear();

      const replayedGame = createGame();

      expect(replayedGame.getStatus()).toEqual(game.getStatus());
      expect(scheduleDeletion).not.toHaveBeenCalled();
    });

    it('refuses a first move of yellow, without saving it', async () => {
      expect(await game.play({ playerId: 'yellow', column: 1 }))
        .toEqual({ refusal: { code: 'not_your_turn', message: "yellow: it's not your turn!" } });
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
      expect(await createGame().play({ playerId: 'yellow', column: 1 }))
        .toEqual({ refusal: { code: 'not_your_turn', message: "yellow: it's not your turn!" } });
    });

    it('replays a game saved when yellow could play first, and goes on with it', async () => {
      storage.put(MOVES_STORAGE_KEY, readMoves('Y4 R4'));

      const replayedGame = createGame();

      expect(replayedGame.getStatus()).toMatchObject({ lastPlayerWhoPlayed: 'red', tokens: { red: 20, yellow: 20 } });
      expect(await replayedGame.play({ playerId: 'red', column: 3 }))
        .toEqual({ refusal: { code: 'not_your_turn', message: "red: it's not your turn!" } });
      expect((await replayedGame.play({ playerId: 'yellow', column: 3 })).status)
        .toMatchObject({ lastPlayerWhoPlayed: 'yellow' });
    });

    it('lets only red play first in a new game after one that started with yellow', async () => {
      storage.put(MOVES_STORAGE_KEY, readMoves('Y4'));
      const replayedGame = createGame();

      await replayedGame.start();

      expect(await replayedGame.play({ playerId: 'yellow', column: 1 }))
        .toEqual({ refusal: { code: 'not_your_turn', message: "yellow: it's not your turn!" } });
    });

    it('starts again from an empty game', async () => {
      await playMoves({ game, moves: 'R4 Y4' });

      expect(await game.start()).toEqual(NEW_GAME_STATUS);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
      expect(createGame().getStatus()).toEqual(NEW_GAME_STATUS);
    });
  });
});
