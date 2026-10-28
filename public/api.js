import {
  CONNECTION_ERROR_MESSAGE, ERROR_MESSAGES_BY_CODE, ERROR_MESSAGES_BY_STATUS, GAME_ROUTE,
  SERVER_ERROR_MESSAGE,
} from './constants.js';
import { hasOwnKey, isGameStatus } from './utils.js';

/**
 * Reads the error code of the body of an error response.
 * @param {unknown} body - The body, as JSON parsed it, or `undefined` when it is missing or not
 *   JSON.
 * @returns {string|null} The code, when the page has a message for it, `null` otherwise.
 * @example getErrorCode({ code: 'column_full', message: 'The column 1 is full!' }) // 'column_full'
 */
export const getErrorCode = (body) => {
  const code = body?.code;
  const isKnownCode = typeof code === 'string'
    && hasOwnKey({ table: ERROR_MESSAGES_BY_CODE, key: code });
  return isKnownCode ? code : null;
};

/**
 * Explains an error response of the API: by the code of its body, or by its status when the code
 * is missing or unknown.
 * @param {object} params
 * @param {number} params.status - The HTTP status of the response.
 * @param {unknown} [params.body] - The body, as JSON parsed it, or `undefined` when it is missing
 *   or not JSON.
 * @returns {string} The message of the code, else of the status, else the server error message.
 * @example getErrorMessage({ status: 400, body: { code: 'not_your_turn' } })
 * // 'Ce n’est pas le tour de ce joueur : rechargez la page.'
 */
export const getErrorMessage = ({ status, body }) => {
  const code = getErrorCode(body);
  if (code) {
    return ERROR_MESSAGES_BY_CODE[code];
  }

  const isExplainedStatus = hasOwnKey({ table: ERROR_MESSAGES_BY_STATUS, key: status });
  return isExplainedStatus ? ERROR_MESSAGES_BY_STATUS[status] : SERVER_ERROR_MESSAGE;
};

/**
 * Reads the JSON body of a response without failing.
 * @param {Response} response - The response of the API.
 * @returns {Promise<unknown>} The parsed body, or `undefined` when it is missing or not JSON.
 */
const readBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

/**
 * Builds the route that plays a move in a game.
 * @param {string} gameId - The id of the game.
 * @returns {string} The route, with the id encoded.
 * @example getPlayRoute('abc') // '/game/abc/play'
 */
export const getPlayRoute = (gameId) => `${GAME_ROUTE}/${encodeURIComponent(gameId)}/play`;

/**
 * Sends a request to the API and reads the game status it returns.
 * @param {object} params
 * @param {string} params.route - The path of the request, such as `/game`.
 * @param {RequestInit} [params.init] - The method, the headers and the body.
 * @param {typeof fetch} [params.fetchGame] - The function that sends the request.
 * @returns {Promise<{ game: object } | { error: string }>} The game status, or the message that
 *   explains why there is none. It never rejects.
 */
export const requestGame = async ({ route, init, fetchGame = fetch }) => {
  let response;
  try {
    response = await fetchGame(route, init);
  } catch {
    return { error: CONNECTION_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { error: getErrorMessage({ status: response.status, body: await readBody(response) }) };
  }

  const game = await readBody(response);
  return isGameStatus(game) ? { game } : { error: SERVER_ERROR_MESSAGE };
};
