import {
  describe, it, expect, beforeEach,
} from 'vitest';
import Engine from './engine';
import { DRAW_MOVES, readMoves } from './testMoves';

/**
 * Plays moves written as `R1 Y2`: the player letter, then the column number.
 * @param {object} params
 * @param {Engine} params.engine - The game to play.
 * @param {string} params.moves - The moves, separated by spaces.
 */
const playMoves = ({ engine, moves }) => {
  readMoves(moves).forEach((move) => engine.play(move));
};

describe('Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('getStatus', () => {
    it('describes a new game', () => {
      expect(engine.getStatus()).toEqual({
        players: ['red', 'yellow'],
        tokens: { red: 21, yellow: 21 },
        lastPlayerWhoPlayed: 'nobody',
        winner: 'no winner',
        state: 'playing',
        board: Array(6).fill([0, 0, 0, 0, 0, 0, 0]),
      });
    });

    it('lists the board top row first', () => {
      playMoves({ engine, moves: 'R3' });

      const { board } = engine.getStatus();

      expect(board[5]).toEqual([0, 0, 'red', 0, 0, 0, 0]);
      expect(board[0]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('returns copies that cannot change the game', () => {
      const status = engine.getStatus();
      status.board[5][0] = 'red';
      status.tokens.red = 0;

      expect(engine.getStatus().board[5][0]).toBe(0);
      expect(engine.getStatus().tokens.red).toBe(21);
    });

    it('keeps separate games apart', () => {
      playMoves({ engine, moves: 'R1' });

      expect(new Engine().getStatus().lastPlayerWhoPlayed).toBe('nobody');
    });
  });

  describe('play', () => {
    it('drops the token on the lowest empty cell of the column', () => {
      playMoves({ engine, moves: 'R4 Y4' });

      const { board } = engine.getStatus();

      expect(board[5][3]).toBe('red');
      expect(board[4][3]).toBe('yellow');
    });

    it('records the last player and counts the tokens left', () => {
      playMoves({ engine, moves: 'R1 Y2 R3' });

      expect(engine.getStatus()).toMatchObject({
        lastPlayerWhoPlayed: 'red',
        tokens: { red: 19, yellow: 20 },
        state: 'playing',
        winner: 'no winner',
      });
    });

    it.each([
      ['a row', 'R1 Y1 R2 Y2 R3 Y3 R4'],
      ['a column', 'R1 Y2 R1 Y2 R1 Y2 R1'],
      ['a rising diagonal', 'R1 Y2 R2 Y3 R4 Y3 R3 Y4 R7 Y4 R4'],
      ['a falling diagonal', 'R4 Y3 R3 Y2 R1 Y2 R2 Y1 R7 Y1 R1'],
      ['a line completed in its middle', 'R1 Y1 R2 Y2 R4 Y4 R3'],
    ])('makes the player win with %s', (_line, moves) => {
      playMoves({ engine, moves });

      expect(engine.getStatus()).toMatchObject({ winner: 'red', state: 'won' });
    });

    it('lets the second player win', () => {
      playMoves({ engine, moves: 'R1 Y2 R1 Y2 R1 Y2 R3 Y2' });

      expect(engine.getStatus()).toMatchObject({ winner: 'yellow', state: 'won' });
    });

    it('does not count three aligned tokens as a win', () => {
      playMoves({ engine, moves: 'R1 Y1 R2 Y2 R3' });

      expect(engine.getStatus()).toMatchObject({ winner: 'no winner', state: 'playing' });
    });

    it('does not count four tokens with a gap as a win', () => {
      playMoves({ engine, moves: 'R1 Y1 R2 Y2 R4 Y4 R5' });

      expect(engine.getStatus()).toMatchObject({ winner: 'no winner', state: 'playing' });
    });

    it('reports a draw when the board is full without alignment', () => {
      playMoves({ engine, moves: DRAW_MOVES });

      expect(engine.getStatus()).toMatchObject({
        winner: 'no winner',
        state: 'draw',
        tokens: { red: 0, yellow: 0 },
      });
      expect(engine.getStatus().board.flat()).not.toContain(0);
    });
  });

  describe('play refusals', () => {
    /**
     * Expects a move to be refused with a `GameError` and the game to stay unchanged.
     * @param {object} params
     * @param {object} [params.move] - The argument given to `play`.
     * @param {RegExp|string} params.message - The expected error message.
     */
    const expectRefusedMove = ({ move, message }) => {
      const statusBefore = engine.getStatus();
      const expectedMessage = typeof message === 'string' ? message : expect.stringMatching(message);

      // `toThrow(GameError)` cannot work here: the test imports through Vite while the
      // engine loads `GameError` with `require`, so each side gets its own class.
      expect(() => engine.play(move)).toThrow(
        expect.objectContaining({ name: 'GameError', message: expectedMessage }),
      );
      expect(engine.getStatus()).toEqual(statusBefore);
    };

    it.each([
      ['an unknown player', 'green'],
      ['a missing player', undefined],
      ['a player in capitals', 'RED'],
      ['a player with spaces', ' red'],
      ['an object', { id: 'red' }],
    ])('refuses %s', (_case, playerId) => {
      expectRefusedMove({ move: { playerId, column: 1 }, message: 'The player must be one of: red, yellow!' });
    });

    it.each([
      ['0', 0],
      ['8', 8],
      ['-1', -1],
      ['NaN', Number.NaN],
      ['2.5', 2.5],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a string', '3'],
      ['a missing column', undefined],
      ['null', null],
    ])('refuses the column %s', (_case, column) => {
      expectRefusedMove({
        move: { playerId: 'red', column },
        message: 'The column number must be an integer between 1 and 7!',
      });
    });

    it('refuses a call without a move', () => {
      expectRefusedMove({ move: undefined, message: 'The player must be one of: red, yellow!' });
    });

    it('refuses two moves in a row of the same player', () => {
      playMoves({ engine, moves: 'R1' });

      expectRefusedMove({ move: { playerId: 'red', column: 2 }, message: /not your turn/ });
    });

    it('refuses a first move of yellow, since red plays first', () => {
      expectRefusedMove({ move: { playerId: 'yellow', column: 1 }, message: "yellow: it's not your turn!" });

      playMoves({ engine, moves: 'R1' });
      expect(engine.getStatus().lastPlayerWhoPlayed).toBe('red');
    });

    it('lets yellow play first in a game that starts with yellow', () => {
      engine = new Engine({ firstPlayer: 'yellow' });

      expectRefusedMove({ move: { playerId: 'red', column: 1 }, message: "red: it's not your turn!" });
      playMoves({ engine, moves: 'Y1 R2' });
      expect(engine.getStatus().lastPlayerWhoPlayed).toBe('red');
    });

    it.each([
      ['an unknown player', 'green'],
      ['null', null],
      ['a number', 1],
      ['an empty string', ''],
      ['a wrong casing', 'Yellow'],
    ])('lets red play first when the first player is %s', (_case, firstPlayer) => {
      engine = new Engine({ firstPlayer });

      expectRefusedMove({ move: { playerId: 'yellow', column: 1 }, message: "yellow: it's not your turn!" });
      playMoves({ engine, moves: 'R1' });
      expect(engine.getStatus().lastPlayerWhoPlayed).toBe('red');
    });

    it('refuses a full column and keeps the turn', () => {
      playMoves({ engine, moves: 'R1 Y1 R1 Y1 R1 Y1' });

      expectRefusedMove({ move: { playerId: 'red', column: 1 }, message: 'The column 1 is full!' });

      playMoves({ engine, moves: 'R2' });
      expect(engine.getStatus().lastPlayerWhoPlayed).toBe('red');
    });

    it('refuses any move once a player has won, and keeps the winner', () => {
      playMoves({ engine, moves: 'R1 Y2 R1 Y2 R1 Y2 R1' });

      expectRefusedMove({ move: { playerId: 'yellow', column: 2 }, message: 'The game is over!' });
      expectRefusedMove({ move: { playerId: 'red', column: 5 }, message: 'The game is over!' });
      expect(engine.getStatus().winner).toBe('red');
    });

    it('refuses any move after a draw', () => {
      playMoves({ engine, moves: DRAW_MOVES });

      expectRefusedMove({ move: { playerId: 'red', column: 1 }, message: 'The game is over!' });
    });

    it('refuses a move of a player without tokens', () => {
      engine.tokens.red = 0;

      expectRefusedMove({ move: { playerId: 'red', column: 1 }, message: /enough token/ });
    });
  });

  describe('init', () => {
    it('starts a new game', () => {
      playMoves({ engine, moves: 'R1 Y2 R1 Y2 R1 Y2 R1' });

      engine.init();

      expect(engine.getStatus()).toEqual(new Engine().getStatus());
    });

    it('lets red play first again after a game that started with yellow', () => {
      engine = new Engine({ firstPlayer: 'yellow' });

      engine.init();

      expect(() => engine.play({ playerId: 'yellow', column: 1 })).toThrow("yellow: it's not your turn!");
      engine.play({ playerId: 'red', column: 1 });
      expect(engine.getStatus().lastPlayerWhoPlayed).toBe('red');
    });
  });
});
