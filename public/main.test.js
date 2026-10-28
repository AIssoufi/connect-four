// @vitest-environment jsdom
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import pageHtml from './index.html?raw';
import {
  CELL_CLASS_NAME, CONNECTION_ERROR_MESSAGE, ERROR_MESSAGES_BY_CODE, GAME_ROUTE, SELECTORS,
  TAB_INDEX, WINNING_CELL_CLASS_NAME,
} from './constants.js';
import { getPlayRoute } from './api.js';
import { getColumnLabel, getMoveRefusal, getStatusText } from './texts.js';

/** A game that just started, on a board of 2 rows and 3 columns: red plays first. */
const NEW_GAME = {
  id: 'abc',
  players: ['red', 'yellow'],
  lastPlayerWhoPlayed: 'nobody',
  winner: 'no winner',
  state: 'playing',
  board: [[0, 0, 0], [0, 0, 0]],
  winningCells: [],
};

/** The same game once red played in the first column: yellow plays next. */
const GAME_AFTER_RED_MOVE = {
  ...NEW_GAME,
  lastPlayerWhoPlayed: 'red',
  board: [[0, 0, 0], ['red', 0, 0]],
};

/** A game whose second column is full: red plays next. */
const GAME_WITH_FULL_COLUMN = {
  ...NEW_GAME,
  lastPlayerWhoPlayed: 'yellow',
  board: [[0, 'yellow', 0], [0, 'red', 0]],
};

/** A game that red won with its tokens of the first column: no column can be played. */
const WON_GAME = {
  ...NEW_GAME,
  lastPlayerWhoPlayed: 'red',
  winner: 'red',
  state: 'won',
  board: [['red', 'yellow', 0], ['red', 'yellow', 0]],
  winningCells: [{ row: 0, column: 0 }, { row: 1, column: 0 }],
};

/** The class names of the cells of `WON_GAME`, top row first. */
const WON_BOARD_CLASS_NAMES = [
  `${CELL_CLASS_NAME} red-token ${WINNING_CELL_CLASS_NAME}`, `${CELL_CLASS_NAME} yellow-token`,
  CELL_CLASS_NAME,
  `${CELL_CLASS_NAME} red-token ${WINNING_CELL_CLASS_NAME}`, `${CELL_CLASS_NAME} yellow-token`,
  CELL_CLASS_NAME,
];

/** The indexes of the columns of the games of these tests. */
const COLUMN_INDEXES = NEW_GAME.board[0].map((cell, columnIndex) => columnIndex);

/** The class names of the cells of an empty board, top row first. */
const EMPTY_BOARD_CLASS_NAMES = NEW_GAME.board.flat().map(() => CELL_CLASS_NAME);

/** The index of the cell that holds the token of `GAME_AFTER_RED_MOVE`, top row first. */
const RED_TOKEN_CELL_INDEX = GAME_AFTER_RED_MOVE.board.flat().indexOf('red');

/** The `tabindex` of each column button when the Tab key reaches the column at each index. */
const TAB_INDEXES_BY_FOCUSED_COLUMN = COLUMN_INDEXES.map((focusedIndex) => COLUMN_INDEXES.map(
  (columnIndex) => String(columnIndex === focusedIndex ? TAB_INDEX.reachable : TAB_INDEX.skipped),
));

/** The fake `fetch` of the page, which answers what each test sets. */
const fetchGame = vi.fn();

/**
 * Builds the response of the API that returns a game status.
 * @param {object} game - The game status.
 * @returns {Pick<Response, 'ok' | 'json'>} The successful response.
 */
const gameResponse = (game) => ({ ok: true, json: async () => game });

/** Waits until the answers of the fake API are read and the page shows them. */
const settle = () => new Promise((resolve) => {
  setTimeout(resolve);
});

/**
 * Puts the elements of `index.html` in the document, without its script, then loads `main.js`
 * as a new module, with a new state, and runs what it does once the page is loaded. Its
 * `DOMContentLoaded` listener is called directly: an event would also run the listeners of the
 * modules loaded by the previous tests.
 */
const loadPage = async () => {
  const page = new DOMParser().parseFromString(pageHtml, 'text/html');
  page.querySelectorAll('script').forEach((scriptElem) => scriptElem.remove());
  document.body.innerHTML = page.body.innerHTML;

  const addListener = vi.spyOn(document, 'addEventListener');
  vi.resetModules();
  await import('./main.js');
  const [, onPageLoaded] = addListener.mock.calls.find(([type]) => type === 'DOMContentLoaded');
  addListener.mockRestore();
  onPageLoaded();
  await settle();
};

/**
 * Loads the page with an API that starts a game.
 * @param {object} game - The game status that the API returns to the start request.
 */
const loadPageWithGame = async (game) => {
  fetchGame.mockResolvedValueOnce(gameResponse(game));
  await loadPage();
};

/** @returns {HTMLButtonElement[]} The column buttons of the control panel. */
const getPickers = () => Array.from(document.querySelector(SELECTORS.controlPanel).children);

/**
 * Reads an attribute of every column button.
 * @param {string} attributeName - The name of the attribute.
 * @returns {Array<string|null>} Its value on each button, left column first.
 */
const getPickerAttributes = (attributeName) => getPickers().map(
  (pickerElem) => pickerElem.getAttribute(attributeName),
);

/** @returns {string[]} The texts that a screen reader reads for the cells, top row first. */
const getCellLabels = () => Array.from(
  document.querySelectorAll(`${SELECTORS.board} [role="cell"]`),
  (cellElem) => cellElem.textContent,
);

/** @returns {string[]} The class names of the cells of the board, top row first. */
const getCellClassNames = () => Array.from(
  document.querySelectorAll(`${SELECTORS.board} [role="cell"]`),
  (cellElem) => cellElem.className,
);

/**
 * Reads the text of an element of the page.
 * @param {string} selector - The selector of the element.
 * @returns {string} Its text.
 */
const getText = (selector) => document.querySelector(selector).textContent;

/**
 * Presses a key on the focused element, as a keyboard does.
 * @param {KeyboardEventInit} init - The key and its modifiers.
 * @returns {KeyboardEvent} The event, to check whether the page cancelled it.
 */
const pressKey = (init) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  document.activeElement.dispatchEvent(event);
  return event;
};

/**
 * Presses Enter on the focused button. A browser then clicks the button unless the page cancels
 * the key press, which jsdom does not do, so the click is sent here.
 */
const pressEnter = () => {
  const event = pressKey({ key: 'Enter' });
  if (!event.defaultPrevented) {
    document.activeElement.click();
  }
};

/** Clicks the New game button. */
const clickNewGame = () => document.querySelector(SELECTORS.newGameButton).click();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchGame);
});

afterEach(() => {
  fetchGame.mockReset();
  vi.unstubAllGlobals();
});

describe('loading the page', () => {
  it('starts a game and draws its board, its column buttons and whose turn it is', async () => {
    await loadPageWithGame(NEW_GAME);

    expect(fetchGame).toHaveBeenCalledExactlyOnceWith(GAME_ROUTE, { method: 'POST' });
    expect(getCellClassNames()).toEqual(EMPTY_BOARD_CLASS_NAMES);
    expect(getPickerAttributes('tabindex')).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[0]);
    expect(getPickerAttributes('aria-disabled')).toEqual(['false', 'false', 'false']);
    expect(getText(SELECTORS.status)).toBe(getStatusText(NEW_GAME));
    expect(getText(SELECTORS.message)).toBe('');
  });

  it('explains why no game started when the server cannot be reached', async () => {
    fetchGame.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await loadPage();

    expect(getText(SELECTORS.message)).toBe(CONNECTION_ERROR_MESSAGE);
    expect(getCellClassNames()).toEqual([]);
    expect(getPickers()).toEqual([]);
  });
});

describe('moving between the columns with the keyboard', () => {
  it.each([
    { key: 'ArrowRight', fromIndex: 0, toIndex: 1 },
    { key: 'ArrowRight', fromIndex: 2, toIndex: 0 },
    { key: 'ArrowLeft', fromIndex: 1, toIndex: 0 },
    { key: 'ArrowLeft', fromIndex: 0, toIndex: 2 },
    { key: 'Home', fromIndex: 2, toIndex: 0 },
    { key: 'End', fromIndex: 0, toIndex: 2 },
  ])('$key moves the focus and the tab stop from column $fromIndex to $toIndex', async ({
    key, fromIndex, toIndex,
  }) => {
    await loadPageWithGame(NEW_GAME);
    getPickers()[fromIndex].focus();

    const event = pressKey({ key });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(getPickers()[toIndex]);
    expect(getPickerAttributes('tabindex')).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[toIndex]);
  });

  it.each([
    { key: 'ArrowRight', altKey: true },
    { key: 'ArrowLeft', ctrlKey: true },
    { key: 'End', metaKey: true },
    { key: 'ArrowUp' },
    { key: 'Tab' },
    { key: 'a' },
    { key: '' },
  ])('leaves the key press %o to the browser', async (init) => {
    await loadPageWithGame(NEW_GAME);
    getPickers()[1].focus();

    const event = pressKey(init);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(getPickers()[1]);
    expect(getPickerAttributes('tabindex')).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[1]);
  });

  it('keeps the tab stop on the column focused last once the move is shown', async () => {
    await loadPageWithGame(NEW_GAME);
    fetchGame.mockResolvedValueOnce(gameResponse(GAME_AFTER_RED_MOVE));
    getPickers()[0].focus();
    pressKey({ key: 'End' });

    pressEnter();
    await settle();

    expect(getPickerAttributes('tabindex')).toEqual(TAB_INDEXES_BY_FOCUSED_COLUMN[2]);
  });
});

describe('playing a move', () => {
  it('plays the next player in the focused column with Enter, then shows the move', async () => {
    await loadPageWithGame(NEW_GAME);
    fetchGame.mockResolvedValueOnce(gameResponse(GAME_AFTER_RED_MOVE));
    getPickers()[1].focus();
    pressKey({ key: 'ArrowLeft' });

    pressEnter();
    await settle();

    expect(fetchGame).toHaveBeenLastCalledWith(getPlayRoute(NEW_GAME.id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: 'red', column: 1 }),
    });
    expect(getCellClassNames()[RED_TOKEN_CELL_INDEX]).toBe(`${CELL_CLASS_NAME} red-token`);
    expect(getText(SELECTORS.status)).toBe(getStatusText(GAME_AFTER_RED_MOVE));
  });

  it('sends no move for a full column and explains why', async () => {
    await loadPageWithGame(GAME_WITH_FULL_COLUMN);

    getPickers()[1].click();
    await settle();

    expect(fetchGame).toHaveBeenCalledOnce();
    expect(getText(SELECTORS.message))
      .toBe(getMoveRefusal({ game: GAME_WITH_FULL_COLUMN, columnIndex: 1 }));
  });

  it('shows the French text of the code of a move that the server refuses', async () => {
    await loadPageWithGame(NEW_GAME);
    fetchGame.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ code: 'not_your_turn', message: "red: it's not your turn!" }),
    });

    getPickers()[0].click();
    await settle();

    expect(getText(SELECTORS.message)).toBe(ERROR_MESSAGES_BY_CODE.not_your_turn);
    expect(getCellClassNames()).toEqual(EMPTY_BOARD_CLASS_NAMES);
  });
});

describe('showing the winning cells', () => {
  it('marks the cells of the line that won and names them in the status', async () => {
    await loadPageWithGame(GAME_AFTER_RED_MOVE);
    fetchGame.mockResolvedValueOnce(gameResponse(WON_GAME));

    getPickers()[1].click();
    await settle();

    expect(getCellClassNames()).toEqual(WON_BOARD_CLASS_NAMES);
    expect(getText(SELECTORS.status)).toBe(getStatusText(WON_GAME));
    expect(getText(SELECTORS.status)).toContain('ligne 1 colonne 1 et ligne 2 colonne 1');
  });

  it('tells a screen reader which tokens won, and forgets it in a new game', async () => {
    await loadPageWithGame(WON_GAME);

    expect(getCellLabels()).toEqual([
      'Ligne 1, colonne 1 : rouge, jeton gagnant', 'Ligne 1, colonne 2 : jaune',
      'Ligne 1, colonne 3 : vide',
      'Ligne 2, colonne 1 : rouge, jeton gagnant', 'Ligne 2, colonne 2 : jaune',
      'Ligne 2, colonne 3 : vide',
    ]);

    fetchGame.mockResolvedValueOnce(gameResponse(NEW_GAME));
    clickNewGame();
    await settle();

    expect(getCellLabels()).toEqual([
      'Ligne 1, colonne 1 : vide', 'Ligne 1, colonne 2 : vide', 'Ligne 1, colonne 3 : vide',
      'Ligne 2, colonne 1 : vide', 'Ligne 2, colonne 2 : vide', 'Ligne 2, colonne 3 : vide',
    ]);
  });

  it('marks no cell when the winning cells are no cells of the board', async () => {
    await loadPageWithGame({
      ...WON_GAME, winningCells: [null, { row: '0', column: 0 }, { row: 2, column: 0 }],
    });

    expect(document.querySelectorAll(`.${WINNING_CELL_CLASS_NAME}`)).toHaveLength(0);
    expect(getText(SELECTORS.status)).toBe('Rouge a gagné.');
  });

  it('marks no cell while nobody won', async () => {
    await loadPageWithGame({ ...GAME_AFTER_RED_MOVE, winningCells: undefined });

    expect(document.querySelectorAll(`.${WINNING_CELL_CLASS_NAME}`)).toHaveLength(0);
  });
});

describe('disabling the columns', () => {
  it('marks a full column disabled and keeps the others playable', async () => {
    await loadPageWithGame(GAME_WITH_FULL_COLUMN);
    const panelElem = document.querySelector(SELECTORS.controlPanel);

    expect(getPickerAttributes('aria-disabled')).toEqual(['false', 'true', 'false']);
    const fullColumnLabel = getColumnLabel({ columnIndex: 1, isFull: true });
    expect(getPickerAttributes('aria-label')[1]).toBe(fullColumnLabel);
    expect(panelElem.getAttribute('aria-disabled')).toBe('false');
  });

  it('marks every column and the control panel disabled once the game is over', async () => {
    await loadPageWithGame(WON_GAME);
    const panelElem = document.querySelector(SELECTORS.controlPanel);

    expect(getPickerAttributes('aria-disabled')).toEqual(['true', 'true', 'true']);
    expect(panelElem.getAttribute('aria-disabled')).toBe('true');
    expect(panelElem.className).toBe('');
    expect(getText(SELECTORS.status)).toBe(getStatusText(WON_GAME));
  });
});

describe('sending one request at a time', () => {
  it('drops a click while a request waits for its answer', async () => {
    await loadPageWithGame(NEW_GAME);
    const moveAnswer = Promise.withResolvers();
    fetchGame.mockReturnValueOnce(moveAnswer.promise);

    getPickers()[0].click();
    getPickers()[1].click();
    clickNewGame();

    expect(fetchGame).toHaveBeenCalledTimes(2);
    moveAnswer.resolve(gameResponse(GAME_AFTER_RED_MOVE));
    await settle();
    fetchGame.mockResolvedValueOnce(gameResponse(NEW_GAME));
    clickNewGame();
    await settle();
    expect(fetchGame).toHaveBeenCalledTimes(3);
  });

  it('accepts a new request once a request failed', async () => {
    await loadPageWithGame(NEW_GAME);
    fetchGame.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    getPickers()[0].click();
    await settle();

    expect(getText(SELECTORS.message)).toBe(CONNECTION_ERROR_MESSAGE);
    fetchGame.mockResolvedValueOnce(gameResponse(GAME_AFTER_RED_MOVE));
    getPickers()[0].click();
    await settle();
    expect(fetchGame).toHaveBeenCalledTimes(3);
    expect(getText(SELECTORS.message)).toBe('');
  });
});

describe('starting a new game', () => {
  it('empties the board, enables the columns and clears the message', async () => {
    await loadPageWithGame(WON_GAME);
    getPickers()[2].click();
    expect(getText(SELECTORS.message)).not.toBe('');
    fetchGame.mockResolvedValueOnce(gameResponse(NEW_GAME));

    clickNewGame();
    await settle();

    expect(fetchGame).toHaveBeenLastCalledWith(GAME_ROUTE, { method: 'POST' });
    expect(getCellClassNames()).toEqual(EMPTY_BOARD_CLASS_NAMES);
    expect(getPickerAttributes('aria-disabled')).toEqual(['false', 'false', 'false']);
    expect(getText(SELECTORS.status)).toBe(getStatusText(NEW_GAME));
    expect(getText(SELECTORS.message)).toBe('');
  });
});
