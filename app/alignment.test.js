import { describe, it, expect } from 'vitest';
import { isPartOfAlignment } from './alignment';
import { ROW_COUNT, COLUMN_COUNT, EMPTY_CELL } from './constants';

const R = 'red';
const Y = 'yellow';

/**
 * Builds a `ROW_COUNT` x `COLUMN_COUNT` board from rows written top row first, as they are read.
 * @param {Array<Array<string|number>>} rowsTopFirst - The rows that hold tokens, top first;
 * the missing bottom rows are empty.
 * @returns {Array<Array<string|number>>} The board, bottom row first.
 */
const buildBoard = (rowsTopFirst) => {
  const emptyRows = Array.from(
    { length: ROW_COUNT - rowsTopFirst.length },
    () => Array(COLUMN_COUNT).fill(EMPTY_CELL),
  );

  return [...emptyRows, ...rowsTopFirst].reverse();
};

describe('isPartOfAlignment', () => {
  it('finds four tokens in a row', () => {
    const board = buildBoard([[0, R, R, R, R, 0, 0]]);

    expect(isPartOfAlignment({ board, row: 0, column: 4 })).toBe(true);
  });

  it('finds four tokens in a column', () => {
    const board = buildBoard([[Y], [Y], [Y], [Y]].map((row) => [...row, 0, 0, 0, 0, 0, 0]));

    expect(isPartOfAlignment({ board, row: 3, column: 0 })).toBe(true);
  });

  it('finds a rising diagonal', () => {
    const board = buildBoard([
      [0, 0, 0, R, 0, 0, 0],
      [0, 0, R, Y, 0, 0, 0],
      [0, R, Y, Y, 0, 0, 0],
      [R, Y, Y, R, 0, 0, 0],
    ]);

    expect(isPartOfAlignment({ board, row: 3, column: 3 })).toBe(true);
    expect(isPartOfAlignment({ board, row: 0, column: 0 })).toBe(true);
  });

  it('finds a falling diagonal', () => {
    const board = buildBoard([
      [0, 0, 0, R, 0, 0, 0],
      [0, 0, 0, Y, R, 0, 0],
      [0, 0, 0, Y, Y, R, 0],
      [0, 0, 0, R, Y, Y, R],
    ]);

    expect(isPartOfAlignment({ board, row: 3, column: 3 })).toBe(true);
    expect(isPartOfAlignment({ board, row: 0, column: 6 })).toBe(true);
  });

  it('finds a cell in the middle of a line longer than four', () => {
    const board = buildBoard([[R, R, R, R, R, 0, 0]]);

    expect(isPartOfAlignment({ board, row: 0, column: 2 })).toBe(true);
  });

  it('ignores three tokens, a gap and tokens of the other player', () => {
    const board = buildBoard([[R, R, R, 0, R, Y, R]]);

    [0, 1, 2, 4, 5, 6].forEach((column) => {
      expect(isPartOfAlignment({ board, row: 0, column })).toBe(false);
    });
  });

  it('does not wrap a line around the edges of the board', () => {
    const board = buildBoard([
      [R, R, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, R, R],
    ]);

    expect(isPartOfAlignment({ board, row: 1, column: 0 })).toBe(false);
    expect(isPartOfAlignment({ board, row: 0, column: 6 })).toBe(false);
  });

  it.each([
    ['an empty cell', { row: 0, column: 0 }],
    ['a row outside the board', { row: 6, column: 0 }],
    ['a negative column', { row: 0, column: -1 }],
    ['a missing cell', {}],
  ])('returns false for %s', (_case, cell) => {
    const board = buildBoard([]);

    expect(isPartOfAlignment({ board, ...cell })).toBe(false);
  });

  it.each([
    ['no params', undefined],
    ['a missing board', { row: 0, column: 0 }],
    ['a board that is not an array', { board: 'board', row: 0, column: 0 }],
    ['rows that are not arrays', { board: [null, 'row'], row: 1, column: 0 }],
  ])('returns false for %s', (_case, params) => {
    expect(isPartOfAlignment(params)).toBe(false);
  });
});
