import {
  DRAW_TEXT, FULL_COLUMN_MESSAGE, GAME_OVER_MESSAGE, GAME_STATES, PAGE_LOCALE, TURN_TEXT,
  WIN_TEXT, WIN_WITH_CELLS_TEXT, WINNING_CELL_NAME,
} from './constants.js';
import {
  getNextPlayer, getPlayerColorName, getPositionNumber, hasOwnKey, isColumnFull, isGameOver,
} from './utils.js';
import { getWinningCells } from './winning-cells.js';

/** Matches a placeholder of a text template, such as `{color}`, and captures its name. */
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/** Joins the items of a list as the page language writes them, such as `a, b et c`. */
const LIST_FORMAT = new Intl.ListFormat(PAGE_LOCALE, { style: 'long', type: 'conjunction' });

/**
 * Writes a text from its template, so that the page copy stays in `constants.js`.
 * @param {object} params
 * @param {string} params.template - The text, with placeholders such as `{color}`.
 * @param {object|null} [params.values] - The value of each placeholder, by name.
 * @returns {string} The text. A placeholder without a value stays as it is.
 * @example fillText({ template: 'Au tour de {color}.', values: { color: 'rouge' } })
 *   // 'Au tour de rouge.'
 */
export const fillText = ({ template, values }) => template.replace(
  PLACEHOLDER_PATTERN,
  (placeholder, name) => {
    const hasValue = hasOwnKey({ table: values, key: name }) && values[name] !== undefined;
    return hasValue ? String(values[name]) : placeholder;
  },
);

/**
 * Writes the name of a color with a capital letter, to start a sentence.
 * @param {string} colorName - The name of a color, such as `rouge`.
 * @returns {string} The name, capitalized.
 */
const capitalize = (colorName) => `${colorName[0].toUpperCase()}${colorName.slice(1)}`;

/**
 * Writes who won a game, and with which tokens when the game gives them.
 * @param {object} params
 * @param {string} params.colorName - The name of the winner's color, such as `rouge`.
 * @param {Array<{ row: number, column: number }>} params.winningCells - The cells that won, top
 *   row first, from `getWinningCells`.
 * @returns {string} The text, with the rows and the columns numbered from 1, or the text without
 *   cells when the list is empty.
 * @example getWinText({ colorName: 'rouge', winningCells }) // with the first column, rows 2 to 5
 *   // 'Rouge a gagné : ligne 3 colonne 1, ligne 4 colonne 1, ligne 5 colonne 1 et ligne 6
 *   // colonne 1.'
 */
const getWinText = ({ colorName, winningCells }) => {
  const color = capitalize(colorName);
  if (winningCells.length === 0) {
    return fillText({ template: WIN_TEXT, values: { color } });
  }

  const cellNames = winningCells.map(({ row, column }) => fillText({
    template: WINNING_CELL_NAME,
    values: { row: getPositionNumber(row), column: getPositionNumber(column) },
  }));
  return fillText({
    template: WIN_WITH_CELLS_TEXT,
    values: { color, cells: LIST_FORMAT.format(cellNames) },
  });
};

/**
 * Writes the state of a game: whose turn it is, who won, or a draw.
 * @param {object} game - The game status, with its `state`, `players`, `lastPlayerWhoPlayed`,
 *   `winner` and `winningCells`.
 * @returns {string} The text to show, empty for a game the page cannot describe.
 * @example getStatusText({ state: 'won', winner: 'red', winningCells: [] }) // 'Rouge a gagné.'
 */
export const getStatusText = (game) => {
  switch (game?.state) {
    case GAME_STATES.playing: {
      const colorName = getPlayerColorName(getNextPlayer(game));
      return colorName ? fillText({ template: TURN_TEXT, values: { color: colorName } }) : '';
    }
    case GAME_STATES.won: {
      const colorName = getPlayerColorName(game.winner);
      return colorName ? getWinText({ colorName, winningCells: getWinningCells(game) }) : '';
    }
    case GAME_STATES.draw:
      return DRAW_TEXT;
    default:
      return '';
  }
};

/**
 * Finds why the page refuses a move before sending it: the game is over or the column is full.
 * @param {object} params
 * @param {object} params.game - The game status.
 * @param {number} params.columnIndex - The index of the column, from 0 for the left one.
 * @returns {string|null} The message to show, or `null` when the move can be sent.
 * @example getMoveRefusal({ game, columnIndex: 2 }) // 'La colonne 3 est pleine.'
 */
export const getMoveRefusal = ({ game, columnIndex }) => {
  if (isGameOver(game)) {
    return GAME_OVER_MESSAGE;
  }

  if (isColumnFull({ board: game.board, columnIndex })) {
    return fillText({
      template: FULL_COLUMN_MESSAGE,
      values: { number: getPositionNumber(columnIndex) },
    });
  }

  return null;
};
