import {
  COLUMN_PICKER_CLASS_NAME, CURRENT_PLAYER_CLASS_PREFIX, GAME_ROUTE, PICKER_TOKEN_CLASS_NAME,
  ROW_CLASS_NAME, SELECTORS, VISUALLY_HIDDEN_CLASS_NAME, WINNING_CELL_CLASS_NAME,
} from './constants.js';
import { getPlayRoute, requestGame } from './api.js';
import {
  getCellLabel, getColumnLabel, getMoveRefusal, getStatusText,
} from './texts.js';
import {
  getBoardKey, getCellClassName, getColumnTabIndex, getNextColumnIndex, getNextPlayer,
  getPositionNumber, isBoardSize, isColumnFull, isGameOver,
} from './utils.js';
import { getWinningCells, isWinningCell } from './winning-cells.js';

/** The game status shown on the page, `undefined` until a game starts. */
let currentGame;

/** The key of the board drawn last, from `getBoardKey`. */
let drawnBoardKey;

/** Whether a request to the API waits for its answer: the page sends one at a time. */
let isRequestPending = false;

/** The column button that the Tab key reaches, kept when the control panel is drawn again. */
let focusedColumnIndex = 0;

/**
 * Writes a text in an element of the page, unless it already shows it, so that a live region
 * does not announce the same text again.
 * @param {object} params
 * @param {string} params.selector - The selector of the element.
 * @param {string} params.text - The text to show, empty to clear it.
 */
const showText = ({ selector, text }) => {
  const elem = document.querySelector(selector);
  if (elem.textContent !== text) {
    elem.textContent = text;
  }
};

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
const renderBoard = ({ board, winningCells }) => {
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
      cellElem.firstElementChild.textContent = getCellLabel({ rowIndex, columnIndex, token });
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
  const isFocusedColumnGone = focusedColumnIndex >= columnCount;
  if (isFocusedColumnGone) {
    focusedColumnIndex = 0;
  }

  const pickerElems = Array.from({ length: columnCount }, (column, columnIndex) => {
    const pickerElem = document.createElement('button');
    const tokenElem = document.createElement('span');
    pickerElem.type = 'button';
    pickerElem.className = COLUMN_PICKER_CLASS_NAME;
    pickerElem.dataset.column = columnIndex;
    const tabIndex = getColumnTabIndex({ columnIndex, focusedIndex: focusedColumnIndex });
    pickerElem.setAttribute('tabindex', tabIndex);
    tokenElem.className = PICKER_TOKEN_CLASS_NAME;
    pickerElem.appendChild(tokenElem);
    return pickerElem;
  });

  panelElem.replaceChildren(...pickerElems);
};

/**
 * Makes the button of the focused column the only one that the Tab key reaches, and remembers
 * it, so that Tab comes back to the column focused last.
 * @param {FocusEvent} event - The focus entering the control panel or moving inside it.
 */
const onControlPanelFocusIn = (event) => {
  const pickerElem = event.target.closest(SELECTORS.columnPicker);
  if (!pickerElem) {
    return;
  }

  focusedColumnIndex = Number(pickerElem.dataset.column);
  Array.from(event.currentTarget.children).forEach((buttonElem, columnIndex) => {
    const tabIndex = getColumnTabIndex({ columnIndex, focusedIndex: focusedColumnIndex });
    buttonElem.setAttribute('tabindex', tabIndex);
  });
};

/**
 * Moves the focus between the column buttons with the arrow keys, Home and End, and leaves the
 * browser shortcuts made with Alt, Ctrl or Cmd to the browser.
 * @param {KeyboardEvent} event - The key press, listened on the control panel.
 */
const onControlPanelKeyDown = (event) => {
  const isBrowserShortcut = event.altKey || event.ctrlKey || event.metaKey;
  if (isBrowserShortcut) {
    return;
  }

  const buttonElems = event.currentTarget.children;
  const nextIndex = getNextColumnIndex({
    key: event.key, currentIndex: focusedColumnIndex, columnCount: buttonElems.length,
  });
  if (nextIndex === null) {
    return;
  }

  event.preventDefault();
  buttonElems[nextIndex].focus();
};

/**
 * Updates the column pickers in place: a full column, or every column once the game is over, is
 * marked disabled, and the hover color shows the player whose turn it is.
 * @param {object} game - The game status.
 */
const renderControlPanel = (game) => {
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

/**
 * Shows a game status: the board, the column pickers, and whose turn it is or the result.
 * @param {object} game - The game status that the API returned.
 */
const updateGame = (game) => {
  currentGame = game;
  renderBoard({ board: game.board, winningCells: getWinningCells(game) });
  renderControlPanel(game);
  showText({ selector: SELECTORS.status, text: getStatusText(game) });
};

/**
 * Sends a request that returns a game status, then shows the game, or the message that explains
 * why the request failed. A request sent while another one waits is dropped.
 * @param {object} params
 * @param {string} params.route - The path of the request.
 * @param {RequestInit} params.init - The method, the headers and the body.
 */
const sendGameRequest = async ({ route, init }) => {
  if (isRequestPending) {
    return;
  }

  isRequestPending = true;
  const { game, error } = await requestGame({ route, init });
  isRequestPending = false;

  if (error) {
    showText({ selector: SELECTORS.message, text: error });
    return;
  }

  showText({ selector: SELECTORS.message, text: '' });
  updateGame(game);
};

/**
 * Starts a new game for this page: each visitor plays their own game, and reloading the page or
 * the New game button starts another one. Only this page plays the game, so the board needs no
 * polling.
 */
const startGame = () => sendGameRequest({ route: GAME_ROUTE, init: { method: 'POST' } });

/**
 * Plays the next player in the column picked, or explains why the move cannot be played.
 * @param {MouseEvent} event - The click, listened on the control panel.
 */
const onControlPanelClick = (event) => {
  const pickerElem = event.target.closest(SELECTORS.columnPicker);
  if (!pickerElem) {
    return;
  }

  const columnIndex = Number(pickerElem.dataset.column);
  const refusal = getMoveRefusal({ game: currentGame, columnIndex });
  if (refusal) {
    showText({ selector: SELECTORS.message, text: refusal });
    return;
  }

  sendGameRequest({
    route: getPlayRoute(currentGame.id),
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: getNextPlayer(currentGame),
        column: getPositionNumber(columnIndex),
      }),
    },
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const panelElem = document.querySelector(SELECTORS.controlPanel);
  panelElem.addEventListener('click', onControlPanelClick);
  panelElem.addEventListener('focusin', onControlPanelFocusIn);
  panelElem.addEventListener('keydown', onControlPanelKeyDown);
  document.querySelector(SELECTORS.newGameButton).addEventListener('click', startGame);
  startGame();
});
