import { describe, it, expect } from 'vitest';
import { getWinningCells, isWinningCell } from './winning-cells.js';

/** A board of 2 rows and 3 columns, top row first, whose first column is full. */
const BOARD = [
  ['red', 0, 0],
  ['yellow', 'red', 0],
];

const GAME = {
  id: 'abc',
  players: ['red', 'yellow'],
  lastPlayerWhoPlayed: 'red',
  winner: 'no winner',
  state: 'playing',
  board: BOARD,
};

describe('getWinningCells', () => {
  const WINNING_CELLS = [{ row: 0, column: 0 }, { row: 1, column: 0 }];

  it('reads the winning cells of a game', () => {
    expect(getWinningCells({ ...GAME, state: 'won', winningCells: WINNING_CELLS }))
      .toEqual(WINNING_CELLS);
    expect(getWinningCells({ ...GAME, winningCells: [] })).toEqual([]);
  });

  it('keeps the cells of the edges of the board', () => {
    const winningCells = [{ row: 0, column: 0 }, { row: 1, column: 2 }];

    expect(getWinningCells({ ...GAME, winningCells })).toEqual(winningCells);
  });

  it('drops the items that are no cell position', () => {
    const winningCells = [
      { row: 0, column: 0 }, { row: -1, column: 0 }, { row: 0, column: 1.5 },
      { row: '1', column: 0 }, { row: Number.NaN, column: 0 }, { column: 0 }, null, undefined,
      'ligne 1', [0, 0],
    ];

    expect(getWinningCells({ ...GAME, winningCells })).toEqual([{ row: 0, column: 0 }]);
  });

  it('drops the cells one past the last row or the last column of the board', () => {
    const winningCells = [{ row: 2, column: 0 }, { row: 0, column: 3 }, { row: 1, column: 2 }];

    expect(getWinningCells({ ...GAME, winningCells })).toEqual([{ row: 1, column: 2 }]);
  });

  it('returns an empty list for a game without a board', () => {
    expect(getWinningCells({ winningCells: WINNING_CELLS })).toEqual([]);
    expect(getWinningCells({ ...GAME, board: null, winningCells: WINNING_CELLS })).toEqual([]);
    expect(getWinningCells({ ...GAME, board: 'board', winningCells: WINNING_CELLS })).toEqual([]);
  });

  it('returns an empty list for a game without winning cells', () => {
    expect(getWinningCells(GAME)).toEqual([]);
    expect(getWinningCells({ ...GAME, winningCells: null })).toEqual([]);
    expect(getWinningCells({ ...GAME, winningCells: { row: 0, column: 0 } })).toEqual([]);
    expect(getWinningCells({ ...GAME, winningCells: 'none' })).toEqual([]);
    expect(getWinningCells(undefined)).toEqual([]);
    expect(getWinningCells(null)).toEqual([]);
  });
});

describe('isWinningCell', () => {
  const winningCells = [{ row: 2, column: 0 }, { row: 3, column: 1 }];

  it('finds a cell of the winning cells', () => {
    expect(isWinningCell({ winningCells, rowIndex: 2, columnIndex: 0 })).toBe(true);
    expect(isWinningCell({ winningCells, rowIndex: 3, columnIndex: 1 })).toBe(true);
  });

  it('does not take a cell that shares only its row or its column', () => {
    expect(isWinningCell({ winningCells, rowIndex: 2, columnIndex: 1 })).toBe(false);
    expect(isWinningCell({ winningCells, rowIndex: 3, columnIndex: 0 })).toBe(false);
    expect(isWinningCell({ winningCells, rowIndex: '2', columnIndex: 0 })).toBe(false);
  });

  it('finds no cell in an empty list', () => {
    expect(isWinningCell({ winningCells: [], rowIndex: 0, columnIndex: 0 })).toBe(false);
  });

  it('finds no cell without a list', () => {
    expect(isWinningCell({ rowIndex: 0, columnIndex: 0 })).toBe(false);
    expect(isWinningCell()).toBe(false);
  });
});
