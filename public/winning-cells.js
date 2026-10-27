/**
 * Tells whether a value is a natural number, as the index of a row or a column.
 * @param {unknown} value - The value to check.
 * @returns {boolean} `true` for an integer of 0 or more.
 */
const isNaturalNumber = (value) => Number.isInteger(value) && value >= 0;

/**
 * Tells whether a value is the position of a cell, as `winningCells` gives it.
 * @param {unknown} cell - An item of the `winningCells` of a game status.
 * @returns {boolean} `true` for an object whose `row` and `column` are natural numbers.
 */
const isCellPosition = (cell) => {
  const isObject = typeof cell === 'object' && cell !== null;
  return isObject && isNaturalNumber(cell.row) && isNaturalNumber(cell.column);
};

/**
 * Tells whether a value is the position of a cell of a board.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The rows of the board, top row first.
 * @param {unknown} params.cell - An item of the `winningCells` of a game status.
 * @returns {boolean} `true` for a cell position whose row and column lie on the board.
 */
const isBoardCell = ({ board, cell }) => {
  if (!isCellPosition(cell)) return false;

  const row = board[cell.row];
  const isColumnOnRow = Array.isArray(row) && cell.column < row.length;
  return isColumnOnRow;
};

/**
 * Reads the cells of the line that won a game.
 * @param {object} [game] - The game status.
 * @returns {Array<{ row: number, column: number }>} The `winningCells` of the game, top row first,
 *   without the items that are no cell position or lie outside its board. The list is empty when
 *   the game has no winning cells or no board.
 */
export const getWinningCells = (game) => {
  const winningCells = game?.winningCells;
  const board = game?.board;
  const canReadCells = Array.isArray(winningCells) && Array.isArray(board);
  if (!canReadCells) return [];

  return winningCells.filter((cell) => isBoardCell({ board, cell }));
};

/**
 * Tells whether a cell of the board belongs to the line that won.
 * @param {object} params
 * @param {Array<{ row: number, column: number }>} [params.winningCells] - The cells that won,
 *   from `getWinningCells`.
 * @param {number} params.rowIndex - The index of the row, from 0 for the top one.
 * @param {number} params.columnIndex - The index of the column, from 0 for the left one.
 * @returns {boolean} `true` when the list holds the cell, `false` without a list.
 */
export const isWinningCell = ({ winningCells = [], rowIndex, columnIndex } = {}) => (
  winningCells.some((cell) => {
    const isSameCell = cell.row === rowIndex && cell.column === columnIndex;
    return isSameCell;
  })
);
