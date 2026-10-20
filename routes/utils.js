const { PLAYER_IDS, FIRST_COLUMN_NUMBER, COLUMN_COUNT } = require('../app/constants');
const { isKnownPlayer, isValidColumnNumber } = require('../app/utils');
const { BAD_REQUEST_STATUS, LAST_CLIENT_ERROR_STATUS } = require('./constants');

/**
 * Reads and validates the JSON body of `POST /game/{gameId}/play`.
 * @param {unknown} body - The parsed body, `undefined` when the request sent no JSON.
 * @returns {{ playerId: string, column: number } | { error: string }} The move, or a message
 * explaining what is wrong.
 */
const parseMove = (body) => {
  const isJsonObject = typeof body === 'object' && body !== null && !Array.isArray(body);
  if (!isJsonObject) {
    return { error: 'The body must be a JSON object with a playerId and a column.' };
  }

  const { playerId, column } = body;
  if (!isKnownPlayer(playerId)) {
    return { error: `The playerId must be one of: ${Object.values(PLAYER_IDS).join(', ')}.` };
  }

  if (!isValidColumnNumber(column)) {
    return { error: `The column must be an integer between ${FIRST_COLUMN_NUMBER} and ${COLUMN_COUNT}.` };
  }

  return { playerId, column };
};

/**
 * Tells whether an error is a client error whose message is safe to send back, such as the
 * malformed JSON or the too large body that `express.json()` refuses.
 * @param {unknown} error - The error that a route passed on.
 * @returns {boolean} `true` for an error with `expose` set and a 4xx `status`, given as an
 * integer, since Express refuses any other status.
 */
const isExposedClientError = (error) => {
  const status = error && error.status;
  const isClientErrorStatus = Number.isInteger(status)
    && status >= BAD_REQUEST_STATUS
    && status <= LAST_CLIENT_ERROR_STATUS;
  const isExposed = Boolean(error && error.expose);

  return isExposed && isClientErrorStatus;
};

module.exports = { parseMove, isExposedClientError };
