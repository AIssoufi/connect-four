const { PLAYER_IDS, FIRST_COLUMN_NUMBER, COLUMN_COUNT } = require('./constants');

/**
 * Tells whether a value is one of the players of `PLAYER_IDS`.
 * @param {unknown} playerId - The value to check.
 * @returns {boolean} `true` for a known player.
 */
const isKnownPlayer = (playerId) => Object.values(PLAYER_IDS).includes(playerId);

/**
 * Tells whether a value is a column number a player can choose.
 * @param {unknown} columnNumber - The value to check.
 * @returns {boolean} `true` for an integer between `FIRST_COLUMN_NUMBER` and `COLUMN_COUNT`.
 */
const isValidColumnNumber = (columnNumber) => {
  const isInBoard = columnNumber >= FIRST_COLUMN_NUMBER && columnNumber <= COLUMN_COUNT;

  return Number.isInteger(columnNumber) && isInBoard;
};

module.exports = { isKnownPlayer, isValidColumnNumber };
