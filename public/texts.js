import {
  COLUMN_LABEL, DRAW_TEXT, FULL_COLUMN_LABEL, FULL_COLUMN_MESSAGE, GAME_OVER_MESSAGE, GAME_STATES,
  TURN_TEXT, WIN_TEXT,
} from './constants.js';
import {
  getColumnNumber, getNextPlayer, getPlayerColorName, isColumnFull, isGameOver,
} from './utils.js';

/** Matches a placeholder of a text template, such as `{color}`, and captures its name. */
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Writes a text from its template, so that the page copy stays in `constants.js`.
 * @param {object} params
 * @param {string} params.template - The text, with placeholders such as `{color}`.
 * @param {object} [params.values] - The value of each placeholder, by name.
 * @returns {string} The text. A placeholder without a value stays as it is.
 * @example fillText({ template: 'Au tour de {color}.', values: { color: 'rouge' } })
 *   // 'Au tour de rouge.'
 */
export const fillText = ({ template, values = {} }) => template.replace(
  PLACEHOLDER_PATTERN,
  (placeholder, name) => {
    const hasValue = Object.prototype.hasOwnProperty.call(values, name)
      && values[name] !== undefined;
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
 * Writes the state of a game: whose turn it is, who won, or a draw.
 * @param {object} game - The game status, with its `state`, `players`, `lastPlayerWhoPlayed`
 *   and `winner`.
 * @returns {string} The text to show, empty for a game the page cannot describe.
 * @example getStatusText({ state: 'won', winner: 'red' }) // 'Rouge a gagné.'
 */
export const getStatusText = (game) => {
  switch (game?.state) {
    case GAME_STATES.playing: {
      const colorName = getPlayerColorName(getNextPlayer(game));
      return colorName ? fillText({ template: TURN_TEXT, values: { color: colorName } }) : '';
    }
    case GAME_STATES.won: {
      const colorName = getPlayerColorName(game.winner);
      return colorName
        ? fillText({ template: WIN_TEXT, values: { color: capitalize(colorName) } })
        : '';
    }
    case GAME_STATES.draw:
      return DRAW_TEXT;
    default:
      return '';
  }
};

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
  return fillText({ template, values: { number: getColumnNumber(columnIndex) } });
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
      values: { number: getColumnNumber(columnIndex) },
    });
  }

  return null;
};
