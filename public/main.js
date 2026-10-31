import { GAME_ROUTE, SELECTORS } from './constants.js';
import { requestGame, requestMove } from './api.js';
import { renderBoard, renderControlPanel } from './board.js';
import { onControlPanelFocusIn, onControlPanelKeyDown } from './keyboard.js';
import { getMoveRefusal, getStatusText } from './texts.js';
import { getNextPlayer, getPositionNumber } from './utils.js';
import { getWinningCells } from './winning-cells.js';

/** The game status shown on the page, `undefined` until a game starts. */
let currentGame;

/**
 * The request that the page waits for, `null` when there is none. The page sends one at a time,
 * and this object tells a replaced request from the current one.
 * @type {{ isNewGame: boolean } | null}
 */
let pendingRequest = null;

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
 * Sends a request that may return a game status, then shows the game, when there is one, and the
 * message of the answer, or none. A move sent while another request waits is dropped, and so is a
 * new game sent while a new game starts. A new game replaces a move that waits: the late answer
 * of that move is ignored, so it can never overwrite the new game.
 * @param {object} params
 * @param {() => Promise<{ game?: object, error?: string }>} params.sendRequest - Sends the
 *   request, a move and the status read that may follow it being one request.
 * @param {boolean} [params.isNewGame] - Whether the request starts a new game.
 */
const sendGameRequest = async ({ sendRequest, isNewGame = false }) => {
  const isDropped = isNewGame ? pendingRequest?.isNewGame : pendingRequest !== null;
  if (isDropped) {
    return;
  }

  const request = { isNewGame };
  pendingRequest = request;
  const { game, error } = await sendRequest();

  const isReplaced = pendingRequest !== request;
  if (isReplaced) {
    return;
  }

  pendingRequest = null;
  showText({ selector: SELECTORS.message, text: error ?? '' });
  if (game) {
    updateGame(game);
  }
};

/**
 * Starts a new game for this page: each visitor plays their own game, and reloading the page or
 * the New game button starts another one. Only this page plays the game, so the board needs no
 * polling.
 */
const startGame = () => sendGameRequest({
  isNewGame: true,
  sendRequest: () => requestGame({ route: GAME_ROUTE, init: { method: 'POST' } }),
});

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
    sendRequest: () => requestMove({
      game: currentGame,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: getNextPlayer(currentGame),
          column: getPositionNumber(columnIndex),
        }),
      },
    }),
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
