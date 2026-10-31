import {
  COLUMN_PICKER_CLASS_NAME, CURRENT_PLAYER_CLASS_PREFIX, PICKER_TOKEN_CLASS_NAME, ROW_CLASS_NAME,
  SELECTORS, VISUALLY_HIDDEN_CLASS_NAME, WINNING_CELL_CLASS_NAME,
} from './constants.js';
import { getFocusedColumnIndex } from './keyboard.js';
import { getCellLabel, getColumnLabel } from './labels.js';
import {
  getBoardKey, getCellClassName, getColumnTabIndex, getNextPlayer, isBoardSize, isColumnFull,
  isGameOver,
} from './utils.js';
import { isWinningCell } from './winning-cells.js';

/** The key of the board drawn last, from `getBoardKey`. */
let drawnBoardKey;

/**
 * Draws the rows and the cells of an empty board, once per board size. Each cell holds a hidden
 * text that a screen reader reads.
 * @param {object} params
 * @param {HTMLElement} params.boardElem - The element of the board.
 * @param {number} params.rowCount - The number of rows.
 * @param {number} params.columnCount - The number of cells in each row.
 */
const buildBoard = ({ boardElem, rowCount, columnCount }) => {
  const rowElems = Array.from({ length: rowCount }, (row, rowIndex) => {
    const rowElem = document.createElement('div');
    rowElem.className = ROW_CLASS_NAME;
    rowElem.setAttribute('role', 'row');

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const cellElem = document.createElement('div');
      const labelElem = document.createElement('span');
      cellElem.setAttribute('role', 'cell');
      cellElem.dataset.row = rowIndex;
      cellElem.dataset.column = columnIndex;
      labelElem.className = VISUALLY_HIDDEN_CLASS_NAME;
      cellElem.appendChild(labelElem);
      rowElem.appendChild(cellElem);
    }

    return rowElem;
  });

  boardElem.replaceChildren(...rowElems);
};

/**
 * Shows the tokens of a board, and marks the ones of the line that won. The cells are updated in
 * place, and nothing changes when the board is the one drawn last, so that a screen reader keeps
 * its place in the board: the winning cells come with the move that changes the board.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The board, top row first.
 * @param {Array<{ row: number, column: number }>} params.winningCells - The cells that won, from
 *   `getWinningCells`, empty while nobody won.
 */
export const renderBoard = ({ board, winningCells }) => {
  const boardKey = getBoardKey(board);
  if (boardKey === drawnBoardKey) {
    return;
  }

  const boardElem = document.querySelector(SELECTORS.board);
  const isDrawnAtSize = isBoardSize({
    board,
    rowCount: boardElem.children.length,
    columnCount: boardElem.firstElementChild?.children.length,
  });
  if (!isDrawnAtSize) {
    buildBoard({ boardElem, rowCount: board.length, columnCount: board[0].length });
  }

  board.forEach((row, rowIndex) => {
    row.forEach((token, columnIndex) => {
      const cellElem = boardElem.children[rowIndex].children[columnIndex];
      cellElem.className = getCellClassName(token);
      const isWinning = isWinningCell({ winningCells, rowIndex, columnIndex });
      cellElem.classList.toggle(WINNING_CELL_CLASS_NAME, isWinning);
      cellElem.firstElementChild.textContent = getCellLabel({
        rowIndex, columnIndex, token, isWinning,
      });
    });
  });

  drawnBoardKey = boardKey;
};

/**
 * Draws one button per column, with a placeholder token, where a click, Enter or Space drops a
 * token. A click on the control panel finds the column from the `data-column` attribute. Only
 * the focused column is in the Tab order: the arrow keys move between the others.
 * @param {object} params
 * @param {HTMLElement} params.panelElem - The control panel.
 * @param {number} params.columnCount - The number of columns of the board.
 */
const buildColumnPickers = ({ panelElem, columnCount }) => {
  const focusedIndex = getFocusedColumnIndex(columnCount);

  const pickerElems = Array.from({ length: columnCount }, (column, columnIndex) => {
    const pickerElem = document.createElement('button');
    const tokenElem = document.createElement('span');
    pickerElem.type = 'button';
    pickerElem.className = COLUMN_PICKER_CLASS_NAME;
    pickerElem.dataset.column = columnIndex;
    const tabIndex = getColumnTabIndex({ columnIndex, focusedIndex });
    pickerElem.setAttribute('tabindex', tabIndex);
    tokenElem.className = PICKER_TOKEN_CLASS_NAME;
    pickerElem.appendChild(tokenElem);
    return pickerElem;
  });

  panelElem.replaceChildren(...pickerElems);
};

/**
 * Updates the column pickers in place: a full column, or every column once the game is over, is
 * marked disabled, and the hover color shows the player whose turn it is.
 * @param {object} game - The game status.
 */
export const renderControlPanel = (game) => {
  const panelElem = document.querySelector(SELECTORS.controlPanel);
  const columnCount = game.board[0].length;
  if (panelElem.children.length !== columnCount) {
    buildColumnPickers({ panelElem, columnCount });
  }

  const isOver = isGameOver(game);
  const nextPlayer = getNextPlayer(game);
  const canPlay = !isOver && nextPlayer !== null;
  panelElem.className = canPlay ? `${CURRENT_PLAYER_CLASS_PREFIX}${nextPlayer}` : '';
  panelElem.setAttribute('aria-disabled', String(!canPlay));

  Array.from(panelElem.children).forEach((pickerElem, columnIndex) => {
    const isFull = isColumnFull({ board: game.board, columnIndex });
    pickerElem.setAttribute('aria-label', getColumnLabel({ columnIndex, isFull }));
    const isPickerDisabled = !canPlay || isFull;
    pickerElem.setAttribute('aria-disabled', String(isPickerDisabled));
  });
};
