import {
  describe, it, expect, beforeEach,
} from 'vitest';
import StoredGame from './StoredGame';
import Engine from '../app/engine';
import { createMapStorage } from './testDoubles';
import { DRAW_MOVES, RED_WINS_MOVES, readMoves } from '../app/testMoves';
import { MOVES_STORAGE_KEY } from './constants';

const NEW_GAME_STATUS = new Engine().getStatus();

/**
 * Plays moves written as `R1 Y2` in a game.
 * @param {object} params
 * @param {StoredGame} params.game - The game to play.
 * @param {string} params.moves - The moves, separated by spaces.
 */
const playMoves = ({ game, moves }) => {
  readMoves(moves).forEach((move) => game.play(move));
};

describe('StoredGame', () => {
  let storage;

  beforeEach(() => {
    storage = createMapStorage();
  });

  describe('before the start', () => {
    it.each([
      ['an empty storage', undefined],
      ['moves that are not a list', 'R1'],
      ['null moves', null],
    ])('has no game with %s', (_case, moves) => {
      if (moves !== undefined) storage.put(MOVES_STORAGE_KEY, moves);

      const game = new StoredGame({ storage });

      expect(game.isStarted()).toBe(false);
      expect(game.getStatus()).toBeNull();
      expect(game.play({ playerId: 'red', column: 1 })).toBeNull();
    });

    it('saves nothing when a move comes before the start', () => {
      new StoredGame({ storage }).play({ playerId: 'red', column: 1 });

      expect(storage.get(MOVES_STORAGE_KEY)).toBeUndefined();
    });
  });

  describe('once started', () => {
    let game;

    beforeEach(() => {
      game = new StoredGame({ storage });
      game.start();
    });

    it('starts an empty game and saves it without moves', () => {
      expect(game.isStarted()).toBe(true);
      expect(game.getStatus()).toEqual(NEW_GAME_STATUS);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
    });

    it('gives the status of the new game when it starts', () => {
      expect(new StoredGame({ storage: createMapStorage() }).start()).toEqual(NEW_GAME_STATUS);
    });

    it('plays a move, then saves it', () => {
      const result = game.play({ playerId: 'red', column: 4 });

      expect(result.status).toMatchObject({ lastPlayerWhoPlayed: 'red', tokens: { red: 20 } });
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([{ playerId: 'red', column: 4 }]);
    });

    it('saves only the player and the column of a move', () => {
      game.play({ playerId: 'red', column: 4, extra: 'ignored' });

      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([{ playerId: 'red', column: 4 }]);
    });

    it.each([
      ['a move out of turn', 'R1', { playerId: 'red', column: 2 }, "red: it's not your turn!"],
      ['a move in a full column', 'R1 Y1 R1 Y1 R1 Y1', { playerId: 'red', column: 1 }, 'The column 1 is full!'],
      ['a move after a win', RED_WINS_MOVES, { playerId: 'yellow', column: 3 }, 'The game is over!'],
    ])('refuses %s with its rule, without saving it', (_case, moves, move, refusal) => {
      playMoves({ game, moves });
      const savedMoves = storage.get(MOVES_STORAGE_KEY);
      const statusBefore = game.getStatus();

      expect(game.play(move)).toEqual({ refusal });
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual(savedMoves);
      expect(game.getStatus()).toEqual(statusBefore);
    });

    it('passes on an error of the engine that breaks no rule', () => {
      const unexpectedError = new TypeError('Unexpected');
      game.engine.play = () => { throw unexpectedError; };

      expect(() => game.play({ playerId: 'red', column: 1 })).toThrow(unexpectedError);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
    });

    it.each([
      ['a game going on', 'R4 Y4 R3'],
      ['a won game', RED_WINS_MOVES],
      ['a draw', DRAW_MOVES],
    ])('replays %s in a new instance over the same storage', (_case, moves) => {
      playMoves({ game, moves });

      const replayedGame = new StoredGame({ storage });

      expect(replayedGame.getStatus()).toEqual(game.getStatus());
    });

    it('starts again from an empty game', () => {
      playMoves({ game, moves: 'R4 Y4' });

      expect(game.start()).toEqual(NEW_GAME_STATUS);
      expect(storage.get(MOVES_STORAGE_KEY)).toEqual([]);
      expect(new StoredGame({ storage }).getStatus()).toEqual(NEW_GAME_STATUS);
    });
  });
});
