const { ALIGNMENT_LENGTH, EMPTY_CELL } = require('./constants');

/**
 * Directions of a line on the board, with row 0 at the bottom. The opposite
 * direction of each one is counted too, so these four cover every line.
 */
const LINE_DIRECTIONS = Object.freeze([
  Object.freeze({ name: 'horizontal', rowStep: 0, columnStep: 1 }),
  Object.freeze({ name: 'vertical', rowStep: 1, columnStep: 0 }),
  Object.freeze({ name: 'rising diagonal', rowStep: 1, columnStep: 1 }),
  Object.freeze({ name: 'falling diagonal', rowStep: -1, columnStep: 1 }),
]);

/**
 * Reads a cell of the board.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The rows of the board, bottom row first.
 * @param {number} params.row - The row index.
 * @param {number} params.column - The column index.
 * @returns {string|number|undefined} The cell value, or `undefined` outside the board.
 */
const getCell = ({ board, row, column }) => {
  const currentRow = board[row];
  if (!Array.isArray(currentRow)) return undefined;

  return currentRow[column];
};

/**
 * Counts the tokens equal to `token` that follow a cell in one direction,
 * without counting the cell itself.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The rows of the board, bottom row first.
 * @param {number} params.row - The row index of the starting cell.
 * @param {number} params.column - The column index of the starting cell.
 * @param {number} params.rowStep - The row offset between two cells of the line.
 * @param {number} params.columnStep - The column offset between two cells of the line.
 * @param {string|number} params.token - The token to count.
 * @returns {number} The number of consecutive matching tokens.
 */
const countFollowingTokens = ({
  board, row, column, rowStep, columnStep, token,
}) => {
  let count = 0;
  let nextRow = row + rowStep;
  let nextColumn = column + columnStep;

  while (getCell({ board, row: nextRow, column: nextColumn }) === token) {
    count += 1;
    nextRow += rowStep;
    nextColumn += columnStep;
  }

  return count;
};

/**
 * Lists the cells of a line, from its first cell in one direction.
 * @param {object} params
 * @param {number} params.row - The row index of the first cell.
 * @param {number} params.column - The column index of the first cell.
 * @param {number} params.rowStep - The row offset between two cells of the line.
 * @param {number} params.columnStep - The column offset between two cells of the line.
 * @param {number} params.length - The number of cells of the line.
 * @returns {Array<{ row: number, column: number }>} The cells, from the first one.
 */
const getLineCells = ({
  row, column, rowStep, columnStep, length,
}) => Array.from({ length }, (_cell, offset) => ({
  row: row + offset * rowStep,
  column: column + offset * columnStep,
}));

/**
 * Tells whether two cells are the same.
 * @param {object} params
 * @param {{ row: number, column: number }} params.cell - A cell.
 * @param {{ row: number, column: number }} params.otherCell - Another cell.
 * @returns {boolean} `true` when both have the same row and column.
 */
const isSameCell = ({ cell, otherCell }) => cell.row === otherCell.row
  && cell.column === otherCell.column;

/**
 * Finds the cells of every line of at least `ALIGNMENT_LENGTH` identical tokens that goes through
 * a cell: horizontal, vertical or diagonal. Only the cell of the last move can complete a line,
 * so checking it is enough.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The rows of the board, bottom row first.
 * @param {number} params.row - The row index of the cell.
 * @param {number} params.column - The column index of the cell.
 * @returns {Array<{ row: number, column: number }>} The cells of these lines, the cell itself
 * included once, with row 0 at the bottom: four cells for one line of four, more for a longer
 * line or for two lines at once. Each line runs from its left end, or its bottom end for a
 * vertical one. The list is empty when the cell completes no alignment, is empty or lies outside
 * the board.
 * @example
 * // Red holds the four left cells of the bottom row.
 * findAlignment({ board, row: 0, column: 3 });
 * // [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }, { row: 0, column: 3 }]
 */
const findAlignment = ({ board, row, column } = {}) => {
  if (!Array.isArray(board)) return [];

  const token = getCell({ board, row, column });
  const cellHoldsToken = token !== undefined && token !== EMPTY_CELL;
  if (!cellHoldsToken) return [];

  const alignedCells = LINE_DIRECTIONS.flatMap(({ rowStep, columnStep }) => {
    const tokensAfter = countFollowingTokens({
      board, row, column, rowStep, columnStep, token,
    });
    const tokensBefore = countFollowingTokens({
      board, row, column, rowStep: -rowStep, columnStep: -columnStep, token,
    });
    const lineLength = tokensBefore + 1 + tokensAfter;
    if (lineLength < ALIGNMENT_LENGTH) return [];

    return getLineCells({
      row: row - tokensBefore * rowStep,
      column: column - tokensBefore * columnStep,
      rowStep,
      columnStep,
      length: lineLength,
    });
  });

  // Two lines share the cell of the move: keep its first copy only.
  return alignedCells.filter((cell, index) => {
    const firstIndex = alignedCells.findIndex((otherCell) => isSameCell({ cell, otherCell }));
    const isFirstCopy = firstIndex === index;
    return isFirstCopy;
  });
};

/**
 * Tells whether the token of a cell belongs to a line of at least
 * `ALIGNMENT_LENGTH` identical tokens: horizontal, vertical or diagonal.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The rows of the board, bottom row first.
 * @param {number} params.row - The row index of the cell.
 * @param {number} params.column - The column index of the cell.
 * @returns {boolean} `true` when the cell completes an alignment, `false`
 * when it does not, is empty or lies outside the board. See `findAlignment()`.
 */
const isPartOfAlignment = (params) => findAlignment(params).length > 0;

module.exports = { findAlignment, isPartOfAlignment };
