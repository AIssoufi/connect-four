import { describe, it, expect } from 'vitest';
import { DRAW_MOVES, RED_WINS_MOVES, readMoves } from './testMoves';

describe('readMoves', () => {
  it('reads the player and the column of each move', () => {
    expect(readMoves('R1 Y7')).toEqual([
      { playerId: 'red', column: 1 },
      { playerId: 'yellow', column: 7 },
    ]);
  });

  it('reads a full board of moves, red first', () => {
    const moves = readMoves(DRAW_MOVES);

    expect(moves).toHaveLength(42);
    expect(moves[0].playerId).toBe('red');
  });

  it('reads the winning moves of red', () => {
    expect(readMoves(RED_WINS_MOVES)).toHaveLength(7);
  });
});
