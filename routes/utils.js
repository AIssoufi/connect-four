const {
  PLAYER_IDS,
  FIRST_COLUMN_NUMBER,
  COLUMN_COUNT,
  ERROR_CODES,
} = require('../app/constants');
const { isKnownPlayer, isValidColumnNumber } = require('../app/utils');
const {
  BAD_REQUEST_STATUS,
  LAST_CLIENT_ERROR_STATUS,
  BODY_PARSER_ERROR_CODES,
  JSON_MEDIA_TYPE,
} = require('./constants/http');
const {
  CONTENT_LENGTH_HEADER,
} = require('./constants/headers');
const { getClientNetworkKey } = require('./clientNetwork');

/**
 * Reads and validates the JSON body of `POST /game/{gameId}/play`.
 * @param {unknown} body - The parsed body, `undefined` when the request sent no JSON.
 * @returns {{ playerId: string, column: number } | { error: { code: string, message: string } }}
 * The move, or the code and the message that explain what is wrong, ready to send as the body.
 */
const parseMove = (body) => {
  const isJsonObject = typeof body === 'object' && body !== null && !Array.isArray(body);
  if (!isJsonObject) {
    return {
      error: {
        code: ERROR_CODES.INVALID_MOVE,
        message: 'The body must be a JSON object with a playerId and a column.',
      },
    };
  }

  const { playerId, column } = body;
  if (!isKnownPlayer(playerId)) {
    return {
      error: {
        code: ERROR_CODES.INVALID_PLAYER,
        message: `The playerId must be one of: ${Object.values(PLAYER_IDS).join(', ')}.`,
      },
    };
  }

  if (!isValidColumnNumber(column)) {
    return {
      error: {
        code: ERROR_CODES.INVALID_COLUMN,
        message: `The column must be an integer between ${FIRST_COLUMN_NUMBER} and ${COLUMN_COUNT}.`,
      },
    };
  }

  return { playerId, column };
};

/**
 * Tells whether a request sends a body of a type other than JSON, which `express.json()` would
 * skip and leave `undefined`. A request without a body, or with an empty one, sends no type to
 * fix, so it is not one.
 * @param {import('express').Request} req - The request, read through its `is()` and `get()`.
 * @returns {boolean} `true` for a body with a `Content-Type` other than `application/json` (any
 * parameter such as `charset` aside), or with none.
 * @example
 * hasNonJsonBody(req); // true for `Content-Type: text/plain` and the body '{"column":1}'
 */
const hasNonJsonBody = (req) => {
  const isOtherType = req.is(JSON_MEDIA_TYPE) === false;
  const isEmptyBody = Number(req.get(CONTENT_LENGTH_HEADER)) === 0;

  return isOtherType && !isEmptyBody;
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

/**
 * Tells whether an error is the one the Express router raises for a path parameter whose
 * percent-encoding cannot be decoded, such as the game id of `/game/%E0/status`.
 * @param {unknown} error - The error that the router passed on.
 * @returns {boolean} `true` for a `URIError` with the status 400 that the router sets on it.
 * @example
 * isParamDecodingError(Object.assign(new URIError('URI malformed'), { status: 400 })); // true
 */
const isParamDecodingError = (error) => {
  const isUriError = error instanceof URIError;

  return isUriError && error.status === BAD_REQUEST_STATUS;
};

/**
 * Gives the error code of a client error that a route passed on, such as a body that
 * `express.json()` refuses. See `isExposedClientError()`.
 * @param {unknown} error - The client error.
 * @returns {string} The code of its `type` in `BODY_PARSER_ERROR_CODES`, or
 * `ERROR_CODES.INVALID_REQUEST` for any other error.
 * @example
 * getClientErrorCode({ type: 'entity.too.large', status: 413, expose: true }); // 'body_too_large'
 */
const getClientErrorCode = (error) => {
  const type = error && error.type;

  return BODY_PARSER_ERROR_CODES.get(type) ?? ERROR_CODES.INVALID_REQUEST;
};

/**
 * Tells whether a visitor may start one more game, under the Rate Limiting binding of the
 * Worker, which counts the starts of each client network. See `getClientNetworkKey()`.
 * @param {object} params
 * @param {{ limit: (options: { key: string }) => Promise<{ success: boolean }> } | undefined}
 *   params.limiter - The Rate Limiting binding, `undefined` when the app runs without it.
 * @param {string | undefined} params.clientIp - The IP address of the visitor, `undefined` when
 *   the request has none.
 * @returns {Promise<boolean>} Whether the limit allows the start. Without a binding, or without
 * an address (missing or empty), as in some local runs, every start is allowed.
 * @example
 * await isStartAllowed({ limiter: env.GAME_START_LIMITER, clientIp: '203.0.113.7' }); // true
 */
const isStartAllowed = async ({ limiter, clientIp }) => {
  const key = getClientNetworkKey(clientIp);
  const canLimit = Boolean(limiter) && key !== undefined;
  if (!canLimit) {
    return true;
  }

  const { success } = await limiter.limit({ key });

  return success;
};

module.exports = {
  parseMove,
  hasNonJsonBody,
  isExposedClientError,
  isParamDecodingError,
  getClientErrorCode,
  isStartAllowed,
};
