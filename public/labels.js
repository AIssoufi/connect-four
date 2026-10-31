import {
  CELL_LABEL, COLUMN_LABEL, EMPTY_CELL_NAME, FULL_COLUMN_LABEL, WINNING_CELL_LABEL,
} from './constants.js';
import { fillText } from './texts.js';
import { getPlayerColorName, getPositionNumber } from './utils.js';

/**
 * Builds the name of a column of the control panel, which says when the column is full.
 * @param {object} params
 * @param {number} params.columnIndex - The index of the column, from 0 for the left one.
 * @param {boolean} params.isFull - Whether the column has no free cell left.
 * @returns {string} The name, with the column numbered from 1.
 * @example getColumnLabel({ columnIndex: 2, isFull: true }) // 'Colonne 3 pleine'
 */
export const getColumnLabel = ({ columnIndex, isFull }) => {
  const template = isFull ? FULL_COLUMN_LABEL : COLUMN_LABEL;
  return fillText({ template, values: { number: getPositionNumber(columnIndex) } });
};

/**
 * Builds the text that a screen reader reads for a cell of the board.
 * @param {object} params
 * @param {number} params.rowIndex - The index of the row, from 0 for the top one.
 * @param {number} params.columnIndex - The index of the column, from 0 for the left one.
 * @param {string|number} params.token - The cell value: a player id, or `0` when empty.
 * @param {boolean} [params.isWinning] - Whether the cell belongs to the line that won.
 * @returns {string} The row and the column, numbered from 1, then the color of the token, and
 *   that it is a winning token when `isWinning` is `true` for a token of a player. A value that
 *   is no known player reads as an empty cell, as the board draws it, and `?` stands for a
 *   missing or invalid row or column.
 * @example getCellLabel({ rowIndex: 2, columnIndex: 1, token: 'red' })
 *   // 'Ligne 3, colonne 2 : rouge'
 * @example getCellLabel({ rowIndex: 2, columnIndex: 0, token: 'red', isWinning: true })
 *   // 'Ligne 3, colonne 1 : rouge, jeton gagnant'
 */
export const getCellLabel = ({
  rowIndex, columnIndex, token, isWinning = false,
}) => {
  const colorName = getPlayerColorName(token);
  const isWinningToken = isWinning === true && colorName !== null;

  return fillText({
    template: isWinningToken ? WINNING_CELL_LABEL : CELL_LABEL,
    values: {
      row: getPositionNumber(rowIndex),
      column: getPositionNumber(columnIndex),
      content: colorName ?? EMPTY_CELL_NAME,
    },
  });
};
