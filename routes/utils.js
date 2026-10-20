const { PLAYER_IDS, FIRST_COLUMN_NUMBER, COLUMN_COUNT } = require('../app/constants');
const { isKnownPlayer, isValidColumnNumber } = require('../app/utils');
const { DIGITS_ONLY_PATTERN } = require('./constants');

/**
 * Reads and validates the query of `/game/play`.
 * @param {object} [query] - The parsed query string, with `playerid` and `column`.
 * @returns {{ playerId: string, column: number } | { error: string }} The move,
 * with the column as a number, or a message explaining what is wrong.
 */
const parsePlayQuery = (query) => {
  const { playerid, column } = query || {};

  if (!isKnownPlayer(playerid)) {
    return { error: `The playerid must be one of: ${Object.values(PLAYER_IDS).join(', ')}.` };
  }

  const isColumnWrittenAsDigits = typeof column === 'string' && DIGITS_ONLY_PATTERN.test(column);
  const columnNumber = isColumnWrittenAsDigits ? Number(column) : Number.NaN;
  if (!isValidColumnNumber(columnNumber)) {
    return { error: `The column must be an integer between ${FIRST_COLUMN_NUMBER} and ${COLUMN_COUNT}.` };
  }

  return { playerId: playerid, column: columnNumber };
};

module.exports = { parsePlayQuery };
