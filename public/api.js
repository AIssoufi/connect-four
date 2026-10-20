import {
  CONNECTION_ERROR_MESSAGE, ERROR_MESSAGES_BY_STATUS, GAME_ROUTE, SERVER_ERROR_MESSAGE,
} from './constants.js';
import { isGameStatus } from './utils.js';

/**
 * Explains an error response of the API.
 * @param {number} status - The HTTP status of the response.
 * @returns {string} The message of the status, or the server error message for any other one.
 */
export const getErrorMessage = (status) => {
  const isExplainedStatus = Object.prototype.hasOwnProperty.call(ERROR_MESSAGES_BY_STATUS, status);
  return isExplainedStatus ? ERROR_MESSAGES_BY_STATUS[status] : SERVER_ERROR_MESSAGE;
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
    return { error: getErrorMessage(response.status) };
  }

  try {
    const game = await response.json();
    return isGameStatus(game) ? { game } : { error: SERVER_ERROR_MESSAGE };
  } catch {
    return { error: SERVER_ERROR_MESSAGE };
  }
};
