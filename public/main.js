import { GAME_ROUTE, SELECTORS } from './constants.js';
import { getPlayRoute, requestGame } from './api.js';
import { renderBoard, renderControlPanel } from './board.js';
import { onControlPanelFocusIn, onControlPanelKeyDown } from './keyboard.js';
import { getMoveRefusal, getStatusText } from './texts.js';
import { getNextPlayer, getPositionNumber } from './utils.js';
import { getWinningCells } from './winning-cells.js';

/** The game status shown on the page, `undefined` until a game starts. */
let currentGame;

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
