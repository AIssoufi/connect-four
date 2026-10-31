import {
  CONNECTION_ERROR_MESSAGE, ERROR_MESSAGES_BY_CODE, ERROR_MESSAGES_BY_STATUS, GAME_ROUTE,
  REQUEST_TIMEOUT_MS, SERVER_ERROR_MESSAGE, STALE_REFUSAL_CODES,
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
 * // 'Ce n’est pas le tour de ce joueur : le plateau est à jour.'
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
 * Builds the route that reads the status of a game.
 * @param {string} gameId - The id of the game.
 * @returns {string} The route, with the id encoded.
 * @example getStatusRoute('abc') // '/game/abc/status'
 */
export const getStatusRoute = (gameId) => `${GAME_ROUTE}/${encodeURIComponent(gameId)}/status`;

/**
 * Sends a request to the API and reads the game status it returns.
 * @param {object} params
 * @param {string} params.route - The path of the request, such as `/game`.
 * @param {RequestInit} [params.init] - The method, the headers and the body.
 * @param {typeof fetch} [params.fetchGame] - The function that sends the request.
 * @param {number} [params.timeoutMs] - How long to wait for the answer, in milliseconds.
 * @returns {Promise<{ game: object }
 *   | { error: string, isAnswerLost: boolean }
 *   | { error: string, isStaleRefusal: boolean }>} The game status, or the message that explains
 *   why there is none. `isAnswerLost` says that the server may have run the request, since its
 *   answer never reached the page in full; `isStaleRefusal` says that the server refused a move
 *   that the page's board allowed. It never rejects.
 */
export const requestGame = async ({
  route, init, fetchGame = fetch, timeoutMs = REQUEST_TIMEOUT_MS,
}) => {
  let signal;
  let response;
  try {
    signal = AbortSignal.timeout(timeoutMs);
    response = await fetchGame(route, { ...init, signal });
  } catch {
    return { error: CONNECTION_ERROR_MESSAGE, isAnswerLost: true };
  }

  if (!response.ok) {
    const body = await readBody(response);
    return {
      error: getErrorMessage({ status: response.status, body }),
      isStaleRefusal: STALE_REFUSAL_CODES.includes(getErrorCode(body)),
    };
  }

  const game = await readBody(response);
  if (isGameStatus(game)) {
    return { game };
  }

  const error = signal.aborted ? CONNECTION_ERROR_MESSAGE : SERVER_ERROR_MESSAGE;
  return { error, isAnswerLost: true };
};

/**
 * Plays a move, and reads the status of the game once when the page cannot trust its board: the
 * answer of the move was lost, or the server refused a move that the board allowed.
 * @param {object} params
 * @param {object} params.game - The game status that the page shows.
 * @param {RequestInit} params.init - The method, the headers and the body of the move.
 * @param {typeof fetch} [params.fetchGame] - The function that sends the requests.
 * @param {number} [params.timeoutMs] - How long to wait for each answer, in milliseconds.
 * @returns {Promise<{ game?: object, error?: string }>} The game to show, when the server gave
 *   one, and the message to show, when the move did not play or the page learned nothing. It never
 *   rejects.
 */
export const requestMove = async ({
  game, init, fetchGame = fetch, timeoutMs = REQUEST_TIMEOUT_MS,
}) => {
  const moveAnswer = await requestGame({
    route: getPlayRoute(game.id), init, fetchGame, timeoutMs,
  });
  const { error, isAnswerLost = false, isStaleRefusal = false } = moveAnswer;
  const isBoardTrusted = !isAnswerLost && !isStaleRefusal;
  if (isBoardTrusted) {
    return moveAnswer;
  }

  const { game: serverGame, error: statusError } = await requestGame({
    route: getStatusRoute(game.id), fetchGame, timeoutMs,
  });
  if (!serverGame) {
    return { error: statusError };
  }

  const isLostMovePlayed = isAnswerLost
    && serverGame.lastPlayerWhoPlayed !== game.lastPlayerWhoPlayed;
  return isLostMovePlayed ? { game: serverGame } : { game: serverGame, error };
};
