import {
  COLUMN_PICKER_CLASS_NAME, GAME_ROUTE, ROW_CLASS_NAME, SELECTORS,
} from './constants.js';
import { getPlayRoute, requestGame } from './api.js';
import { getColumnLabel, getMoveRefusal, getStatusText } from './texts.js';
import {
  getBoardKey, getCellClassName, getColumnNumber, getNextPlayer, isBoardSize, isColumnFull,
  isGameOver,
} from './utils.js';

/** The game status shown on the page, `undefined` until a game starts. */
let currentGame;

/** The key of the board drawn last, from `getBoardKey`. */
let drawnBoardKey;

/** Whether a request to the API waits for its answer: the page sends one at a time. */
let isRequestPending = false;

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
 * Draws the rows and the cells of an empty board, once per board size.
 * @param {object} params
 * @param {HTMLElement} params.boardElem - The element of the board.
 * @param {number} params.rowCount - The number of rows.
 * @param {number} params.columnCount - The number of cells in each row.
 */
const buildBoard = ({ boardElem, rowCount, columnCount }) => {
  const rowElems = Array.from({ length: rowCount }, (row, rowIndex) => {
    const rowElem = document.createElement('div');
    rowElem.className = ROW_CLASS_NAME;

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const cellElem = document.createElement('div');
      cellElem.dataset.row = rowIndex;
      cellElem.dataset.column = columnIndex;
      rowElem.appendChild(cellElem);
    }

    return rowElem;
  });

  boardElem.replaceChildren(...rowElems);
};

/**
 * Shows the tokens of a board. The cells are updated in place, and nothing changes when the
 * board is the one drawn last, so that a screen reader keeps its place in the board.
 * @param {Array<Array<string|number>>} board - The board, top row first.
 */
const renderBoard = (board) => {
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
      boardElem.children[rowIndex].children[columnIndex].className = getCellClassName(token);
    });
  });

  drawnBoardKey = boardKey;
};

/**
 * Draws one placeholder token per column, where a click drops a token. A click on the control
 * panel finds the column from the `data-column` attribute.
 * @param {object} params
 * @param {HTMLElement} params.panelElem - The control panel.
 * @param {number} params.columnCount - The number of columns of the board.
 */
const buildColumnPickers = ({ panelElem, columnCount }) => {
  const pickerElems = Array.from({ length: columnCount }, (column, columnIndex) => {
    const pickerElem = document.createElement('div');
    pickerElem.className = COLUMN_PICKER_CLASS_NAME;
    pickerElem.dataset.column = columnIndex;
    return pickerElem;
  });

  panelElem.replaceChildren(...pickerElems);
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
  panelElem.className = canPlay ? `current-plyer-is-${nextPlayer}` : '';
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
  renderBoard(game.board);
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
  const pickerElem = event.target.closest('[data-column]');
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
        column: getColumnNumber(columnIndex),
      }),
    },
  });
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector(SELECTORS.controlPanel).addEventListener('click', onControlPanelClick);
  document.querySelector(SELECTORS.newGameButton).addEventListener('click', startGame);
  startGame();
});
