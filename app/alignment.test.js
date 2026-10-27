import { describe, it, expect } from 'vitest';
import { findAlignment, isPartOfAlignment } from './alignment';
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

/**
 * Lists the cells of a line on a board built by `buildBoard`, from row and column numbers
 * counted as they are read: row 1 at the top, column 1 at the left.
 * @param {Array<[number, number]>} positions - The row and column number of each cell.
 * @returns {Array<{ row: number, column: number }>} The cells, row 0 at the bottom.
 */
const toCells = (positions) => positions.map(([rowNumber, columnNumber]) => ({
  row: ROW_COUNT - rowNumber,
  column: columnNumber - 1,
}));

describe('findAlignment', () => {
  it('finds the four cells of a row', () => {
    const board = buildBoard([[0, R, R, R, R, 0, 0]]);

    expect(findAlignment({ board, row: 0, column: 4 }))
      .toEqual(toCells([[6, 2], [6, 3], [6, 4], [6, 5]]));
  });

  it('finds the four cells of a column, from the bottom one', () => {
    const board = buildBoard([[Y], [Y], [Y], [Y]].map((row) => [...row, 0, 0, 0, 0, 0, 0]));

    expect(findAlignment({ board, row: 3, column: 0 }))
      .toEqual(toCells([[6, 1], [5, 1], [4, 1], [3, 1]]));
  });

  it('finds the four cells of a rising diagonal, from the bottom one', () => {
    const board = buildBoard([
      [0, 0, 0, R, 0, 0, 0],
      [0, 0, R, Y, 0, 0, 0],
      [0, R, Y, Y, 0, 0, 0],
      [R, Y, Y, R, 0, 0, 0],
    ]);
    const diagonal = toCells([[6, 1], [5, 2], [4, 3], [3, 4]]);

    expect(findAlignment({ board, row: 3, column: 3 })).toEqual(diagonal);
    expect(findAlignment({ board, row: 0, column: 0 })).toEqual(diagonal);
  });

  it('finds the four cells of a falling diagonal, from the top one', () => {
    const board = buildBoard([
      [0, 0, 0, R, 0, 0, 0],
      [0, 0, 0, Y, R, 0, 0],
      [0, 0, 0, Y, Y, R, 0],
      [0, 0, 0, R, Y, Y, R],
    ]);
    const diagonal = toCells([[3, 4], [4, 5], [5, 6], [6, 7]]);

    expect(findAlignment({ board, row: 3, column: 3 })).toEqual(diagonal);
    expect(findAlignment({ board, row: 0, column: 6 })).toEqual(diagonal);
  });

  it('finds the five cells of a line of five completed in its middle', () => {
    const board = buildBoard([[R, R, R, R, R, 0, 0]]);

    expect(findAlignment({ board, row: 0, column: 2 }))
      .toEqual(toCells([[6, 1], [6, 2], [6, 3], [6, 4], [6, 5]]));
  });

  it('finds the cells of two lines completed at once, with their shared cell once', () => {
    const board = buildBoard([
      [0, 0, 0, R, 0, 0, 0],
      [0, 0, 0, R, 0, 0, 0],
      [0, 0, 0, R, 0, 0, 0],
      [R, R, R, R, Y, Y, Y],
    ]);

    expect(findAlignment({ board, row: 0, column: 3 })).toEqual(toCells([
      [6, 1], [6, 2], [6, 3], [6, 4],
      [5, 4], [4, 4], [3, 4],
    ]));
  });

  it('finds lines along the edges and in the corners of the board', () => {
    const board = buildBoard([
      [Y, 0, 0, 0, 0, 0, R],
      [Y, 0, 0, 0, 0, R, R],
      [Y, 0, 0, 0, R, Y, R],
      [Y, 0, 0, R, Y, Y, R],
      [R, Y, Y, Y, R, R, Y],
      [Y, R, R, R, Y, Y, Y],
    ]);

    expect(findAlignment({ board, row: 5, column: 0 }))
      .toEqual(toCells([[4, 1], [3, 1], [2, 1], [1, 1]]));
    expect(findAlignment({ board, row: 5, column: 6 }))
      .toEqual(toCells([[4, 7], [3, 7], [2, 7], [1, 7], [4, 4], [3, 5], [2, 6]]));
  });

  it('finds nothing for three tokens, a gap and tokens of the other player', () => {
    const board = buildBoard([[R, R, R, 0, R, Y, R]]);

    [0, 1, 2, 4, 5, 6].forEach((column) => {
      expect(findAlignment({ board, row: 0, column })).toEqual([]);
    });
  });

  it('does not wrap a line around the edges of the board', () => {
    const board = buildBoard([
      [R, R, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, R, R],
    ]);

    expect(findAlignment({ board, row: 1, column: 0 })).toEqual([]);
    expect(findAlignment({ board, row: 0, column: 6 })).toEqual([]);
  });

  it.each([
    ['an empty cell', { row: 0, column: 0 }],
    ['a row outside the board', { row: 6, column: 0 }],
    ['a negative column', { row: 0, column: -1 }],
    ['a missing cell', {}],
  ])('finds nothing for %s', (_case, cell) => {
    const board = buildBoard([]);

    expect(findAlignment({ board, ...cell })).toEqual([]);
  });

  it.each([
    ['no params', undefined],
    ['a missing board', { row: 0, column: 0 }],
    ['a board that is not an array', { board: 'board', row: 0, column: 0 }],
    ['rows that are not arrays', { board: [null, 'row'], row: 1, column: 0 }],
  ])('finds nothing for %s', (_case, params) => {
    expect(findAlignment(params)).toEqual([]);
  });
});

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
