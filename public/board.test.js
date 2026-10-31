// @vitest-environment jsdom
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  CELL_CLASS_NAME, COLUMN_PICKER_CLASS_NAME, CURRENT_PLAYER_CLASS_PREFIX, ROW_CLASS_NAME,
  SELECTORS, TAB_INDEX, WINNING_CELL_CLASS_NAME,
} from './constants.js';
import { getCellLabel, getColumnLabel } from './labels.js';

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

/** A game whose second column is full: red plays next. */
const GAME_WITH_FULL_COLUMN = {
  ...NEW_GAME,
  lastPlayerWhoPlayed: 'yellow',
  board: [[0, 'yellow', 0], [0, 'red', 0]],
};

/** A game that red won with its tokens of the first column. */
const WON_GAME = {
  ...NEW_GAME,
  lastPlayerWhoPlayed: 'red',
  winner: 'red',
  state: 'won',
  board: [['red', 'yellow', 0], ['red', 'yellow', 0]],
  winningCells: [{ row: 0, column: 0 }, { row: 1, column: 0 }],
};

/** A game on a board of 3 rows and 2 columns, where yellow plays next. */
const NARROW_GAME = {
  ...NEW_GAME,
  lastPlayerWhoPlayed: 'red',
  board: [[0, 0], [0, 0], ['red', 0]],
};

/** The number of columns of the boards of these tests, besides `NARROW_GAME`. */
const COLUMN_COUNT = NEW_GAME.board[0].length;

/** The indexes of the columns of the boards of these tests, besides `NARROW_GAME`. */
const COLUMN_INDEXES = Array.from({ length: COLUMN_COUNT }, (column, columnIndex) => columnIndex);

/** The module under test, loaded again before each test so that the board drawn last is reset. */
let boardModule;

/** The keyboard module that `board.js` reads the focused column from, loaded with it. */
let keyboardModule;

/** @returns {HTMLElement[]} The cells of the board, top row first. */
const getCells = () => Array.from(document.querySelectorAll(`${SELECTORS.board} [role="cell"]`));

/** @returns {string[]} The class names of the cells of the board, top row first. */
const getCellClassNames = () => getCells().map((cellElem) => cellElem.className);

/** @returns {string[]} The texts that a screen reader reads for the cells, top row first. */
const getCellLabels = () => getCells().map((cellElem) => cellElem.textContent);

/** @returns {HTMLElement} The control panel. */
const getPanel = () => document.querySelector(SELECTORS.controlPanel);

/** @returns {HTMLButtonElement[]} The column buttons of the control panel. */
const getPickers = () => Array.from(getPanel().children);

/**
 * Reads an attribute of every column button.
 * @param {string} attributeName - The name of the attribute.
 * @returns {Array<string|null>} Its value on each button, left column first.
 */
const getPickerAttributes = (attributeName) => getPickers().map(
  (pickerElem) => pickerElem.getAttribute(attributeName),
);

/**
 * Tells whether a cell position names a cell of the board.
 * @param {object} params
 * @param {{ row: number, column: number }} params.cell - The position, from `winningCells`.
 * @param {number} params.rowIndex - The index of the row of the cell.
 * @param {number} params.columnIndex - The index of the column of the cell.
 * @returns {boolean} `true` when the position is that cell.
 */
const isCellAt = ({ cell, rowIndex, columnIndex }) => (
  cell.row === rowIndex && cell.column === columnIndex
);

/**
 * Builds the texts that a screen reader reads for the cells of a board.
 * @param {object} game - The game status, whose winning cells are named.
 * @returns {string[]} The text of each cell, top row first.
 */
const getExpectedCellLabels = (game) => game.board.flatMap((row, rowIndex) => row.map(
  (token, columnIndex) => getCellLabel({
    rowIndex,
    columnIndex,
    token,
    isWinning: game.winningCells.some((cell) => isCellAt({ cell, rowIndex, columnIndex })),
  }),
));

beforeEach(async () => {
  document.body.innerHTML = '<div id="board"></div><div id="control-panel"></div>';
  vi.resetModules();
  keyboardModule = await import('./keyboard.js');
  boardModule = await import('./board.js');
});

describe('renderBoard', () => {
  it('draws the rows and the cells of a board, with the text of each cell', () => {
    boardModule.renderBoard({ board: GAME_WITH_FULL_COLUMN.board, winningCells: [] });

    const rowElems = Array.from(document.querySelector(SELECTORS.board).children);
    expect(rowElems.map((rowElem) => rowElem.className)).toEqual([ROW_CLASS_NAME, ROW_CLASS_NAME]);
    expect(rowElems.map((rowElem) => rowElem.getAttribute('role'))).toEqual(['row', 'row']);
    expect(getCellClassNames()).toEqual([
      CELL_CLASS_NAME, `${CELL_CLASS_NAME} yellow-token`, CELL_CLASS_NAME,
      CELL_CLASS_NAME, `${CELL_CLASS_NAME} red-token`, CELL_CLASS_NAME,
    ]);
    expect(getCellLabels()).toEqual(getExpectedCellLabels(GAME_WITH_FULL_COLUMN));
    expect(getCells().map(({ dataset }) => [dataset.row, dataset.column])).toEqual([
      ['0', '0'], ['0', '1'], ['0', '2'], ['1', '0'], ['1', '1'], ['1', '2'],
    ]);
  });

  it('marks the winning cells and names them', () => {
    boardModule.renderBoard({ board: WON_GAME.board, winningCells: WON_GAME.winningCells });

    expect(getCellClassNames()).toEqual([
      `${CELL_CLASS_NAME} red-token ${WINNING_CELL_CLASS_NAME}`, `${CELL_CLASS_NAME} yellow-token`,
      CELL_CLASS_NAME,
      `${CELL_CLASS_NAME} red-token ${WINNING_CELL_CLASS_NAME}`, `${CELL_CLASS_NAME} yellow-token`,
      CELL_CLASS_NAME,
    ]);
    expect(getCellLabels()).toEqual(getExpectedCellLabels(WON_GAME));
  });

  it('marks no cell for winning cells that are no cells of the board', () => {
    boardModule.renderBoard({ board: WON_GAME.board, winningCells: [{ row: 5, column: 9 }] });

    expect(getCellClassNames().join(' ')).not.toContain(WINNING_CELL_CLASS_NAME);
  });

  it('updates the cells in place when the board changes at the same size', () => {
    boardModule.renderBoard({ board: NEW_GAME.board, winningCells: [] });
    const cellElems = getCells();

    boardModule.renderBoard({ board: GAME_WITH_FULL_COLUMN.board, winningCells: [] });

    expect(getCells().every((cellElem, index) => cellElem === cellElems[index])).toBe(true);
    expect(getCellLabels()).toEqual(getExpectedCellLabels(GAME_WITH_FULL_COLUMN));
  });

  it('changes nothing when the board is the one drawn last', () => {
    boardModule.renderBoard({ board: WON_GAME.board, winningCells: [] });
    const classNames = getCellClassNames();

    boardModule.renderBoard({ board: WON_GAME.board, winningCells: WON_GAME.winningCells });

    expect(getCellClassNames()).toEqual(classNames);
  });

  it('draws the board again at its new size', () => {
    boardModule.renderBoard({ board: NEW_GAME.board, winningCells: [] });

    boardModule.renderBoard({ board: NARROW_GAME.board, winningCells: [] });

    expect(document.querySelector(SELECTORS.board).children).toHaveLength(3);
    expect(getCellLabels()).toEqual(getExpectedCellLabels(NARROW_GAME));
  });
});

describe('renderControlPanel', () => {
  it('draws one column button per column, the first one in the Tab order', () => {
    boardModule.renderControlPanel(NEW_GAME);

    expect(getPickerAttributes('class')).toEqual(
      COLUMN_INDEXES.map(() => COLUMN_PICKER_CLASS_NAME),
    );
    expect(getPickerAttributes('type')).toEqual(COLUMN_INDEXES.map(() => 'button'));
    expect(getPickerAttributes('data-column')).toEqual(COLUMN_INDEXES.map(String));
    expect(getPickerAttributes('tabindex')).toEqual(COLUMN_INDEXES.map(
      (columnIndex) => String(columnIndex === 0 ? TAB_INDEX.reachable : TAB_INDEX.skipped),
    ));
    expect(getPickerAttributes('aria-label')).toEqual(COLUMN_INDEXES.map(
      (columnIndex) => getColumnLabel({ columnIndex, isFull: false }),
    ));
    expect(getPickerAttributes('aria-disabled')).toEqual(COLUMN_INDEXES.map(() => 'false'));
    expect(getPanel().className).toBe(`${CURRENT_PLAYER_CLASS_PREFIX}red`);
    expect(getPanel().getAttribute('aria-disabled')).toBe('false');
  });

  it('marks a full column disabled and keeps the others playable', () => {
    boardModule.renderControlPanel(GAME_WITH_FULL_COLUMN);

    expect(getPickerAttributes('aria-disabled')).toEqual(['false', 'true', 'false']);
    expect(getPickerAttributes('aria-label')[1]).toBe(
      getColumnLabel({ columnIndex: 1, isFull: true }),
    );
  });

  it('marks every column and the control panel disabled once the game is over', () => {
    boardModule.renderControlPanel(WON_GAME);

    expect(getPickerAttributes('aria-disabled')).toEqual(COLUMN_INDEXES.map(() => 'true'));
    expect(getPanel().className).toBe('');
    expect(getPanel().getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps the column buttons and their tab stop while the column count stays', () => {
    boardModule.renderControlPanel(NEW_GAME);
    const pickerElems = getPickers();
    getPanel().addEventListener('focusin', keyboardModule.onControlPanelFocusIn);
    pickerElems[2].focus();

    boardModule.renderControlPanel(GAME_WITH_FULL_COLUMN);

    expect(getPickers().every((pickerElem, index) => pickerElem === pickerElems[index])).toBe(true);
    expect(getPickerAttributes('tabindex')).toEqual(
      [TAB_INDEX.skipped, TAB_INDEX.skipped, TAB_INDEX.reachable].map(String),
    );
  });

  it('puts the tab stop back on the first column when the focused column is gone', () => {
    boardModule.renderControlPanel(NEW_GAME);
    getPanel().addEventListener('focusin', keyboardModule.onControlPanelFocusIn);
    getPickers()[2].focus();

    boardModule.renderControlPanel(NARROW_GAME);

    expect(getPickerAttributes('tabindex')).toEqual(
      [TAB_INDEX.reachable, TAB_INDEX.skipped].map(String),
    );
    expect(getPanel().className).toBe(`${CURRENT_PLAYER_CLASS_PREFIX}yellow`);
  });
});
