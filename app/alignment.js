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
 * Tells whether the token of a cell belongs to a line of at least
 * `ALIGNMENT_LENGTH` identical tokens: horizontal, vertical or diagonal.
 * Only the cell of the last move can complete a line, so checking it is enough.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The rows of the board, bottom row first.
 * @param {number} params.row - The row index of the cell.
 * @param {number} params.column - The column index of the cell.
 * @returns {boolean} `true` when the cell completes an alignment, `false`
 * when it does not, is empty or lies outside the board.
 */
const isPartOfAlignment = ({ board, row, column } = {}) => {
  if (!Array.isArray(board)) return false;

  const token = getCell({ board, row, column });
  const cellHoldsToken = token !== undefined && token !== EMPTY_CELL;
  if (!cellHoldsToken) return false;

  return LINE_DIRECTIONS.some(({ rowStep, columnStep }) => {
    const tokensAfter = countFollowingTokens({
      board, row, column, rowStep, columnStep, token,
    });
    const tokensBefore = countFollowingTokens({
      board, row, column, rowStep: -rowStep, columnStep: -columnStep, token,
    });
    const lineLength = tokensBefore + 1 + tokensAfter;

    return lineLength >= ALIGNMENT_LENGTH;
  });
};

module.exports = { isPartOfAlignment };
