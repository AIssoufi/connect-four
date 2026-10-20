import {
  CELL_CLASS_NAME, CONNECTION_ERROR_MESSAGE, DRAW_TEXT, EMPTY_CELL, ERROR_MESSAGES_BY_STATUS,
  GAME_OVER_MESSAGE, GAME_ROUTE, GAME_STATES, PLAYER_COLOR_NAMES, SERVER_ERROR_MESSAGE,
  UNKNOWN_COLUMN_NUMBER,
} from './constants.js';

/**
 * Names the color of a player.
 * @param {string} player - The id of a player, such as `red`.
 * @returns {string|null} The name of the player's color, or `null` for any value that is no
 *   known player, including inherited keys such as `toString`.
 * @example getPlayerColorName('yellow') // 'jaune'
 */
export const getPlayerColorName = (player) => {
  const isKnownPlayer = Object.prototype.hasOwnProperty.call(PLAYER_COLOR_NAMES, player);
  return isKnownPlayer ? PLAYER_COLOR_NAMES[player] : null;
};

/**
 * Tells whether a value is a board the page can draw: a non-empty list of rows of the same
 * non-zero length.
 * @param {unknown} board - The board of a game status, top row first.
 * @returns {boolean} `true` when the page can draw the board.
 */
export const isDrawableBoard = (board) => {
  const hasRows = Array.isArray(board) && board.length > 0 && Array.isArray(board[0]);
  if (!hasRows) {
    return false;
  }

  const columnCount = board[0].length;
  const isRowOfBoard = (row) => Array.isArray(row) && row.length === columnCount;
  return columnCount > 0 && board.every(isRowOfBoard);
};

/**
 * Tells whether the board drawn on the page has the size of a board, so that its cells can be
 * updated in place rather than drawn again.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The board to draw, top row first.
 * @param {number} params.rowCount - The number of rows drawn.
 * @param {number} params.columnCount - The number of cells in the first row drawn.
 * @returns {boolean} `true` when the board has as many rows and columns as the drawn one.
 */
export const isBoardSize = ({ board, rowCount, columnCount }) => isDrawableBoard(board)
  && board.length === rowCount && board[0].length === columnCount;

/**
 * Tells whether a response of the API is a game status the page can show.
 * @param {unknown} game - The parsed body of a response.
 * @returns {boolean} `true` for an object with an id, a list of players, a state and a board
 *   the page can draw.
 */
export const isGameStatus = (game) => {
  const isObject = typeof game === 'object' && game !== null;
  if (!isObject) {
    return false;
  }

  const hasId = typeof game.id === 'string' && game.id !== '';
  const hasPlayers = Array.isArray(game.players);
  const hasState = typeof game.state === 'string';
  return hasId && hasPlayers && hasState && isDrawableBoard(game.board);
};

/**
 * Finds the player whose turn it is: the first player who did not make the last move.
 * @param {object} params
 * @param {string[]} params.players - The ids of the players, red first.
 * @param {string} params.lastPlayerWhoPlayed - The player who made the last move, or `nobody`.
 * @returns {string|null} The id of the next player, or `null` without any other player.
 * @example getNextPlayer({ players: ['red', 'yellow'], lastPlayerWhoPlayed: 'red' }) // 'yellow'
 */
export const getNextPlayer = ({ players, lastPlayerWhoPlayed } = {}) => {
  if (!Array.isArray(players)) {
    return null;
  }

  return players.find((player) => player !== lastPlayerWhoPlayed) ?? null;
};

/**
 * Tells whether a game is over, won or drawn, so that no move can be played.
 * @param {object} game - The game status.
 * @returns {boolean} `true` unless the game is being played.
 */
export const isGameOver = (game) => game?.state !== GAME_STATES.playing;

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
      return colorName ? `Au tour de ${colorName}.` : '';
    }
    case GAME_STATES.won: {
      const colorName = getPlayerColorName(game.winner);
      return colorName ? `${colorName[0].toUpperCase()}${colorName.slice(1)} a gagné.` : '';
    }
    case GAME_STATES.draw:
      return DRAW_TEXT;
    default:
      return '';
  }
};

/**
 * Tells whether a column has no free cell left.
 * @param {object} params
 * @param {Array<Array<string|number>>} params.board - The board, top row first.
 * @param {number} params.columnIndex - The index of the column, from 0 for the left one.
 * @returns {boolean} `true` when the top cell of the column holds a token, or when the board
 *   has no such column.
 */
export const isColumnFull = ({ board, columnIndex }) => {
  const topRow = Array.isArray(board) ? board[0] : undefined;
  const isInBoard = Array.isArray(topRow) && Number.isInteger(columnIndex)
    && columnIndex >= 0 && columnIndex < topRow.length;
  return !isInBoard || topRow[columnIndex] !== EMPTY_CELL;
};

/**
 * Turns the index of a column into the number a player reads.
 * @param {number} columnIndex - The index of the column, from 0 for the left one.
 * @returns {number|string} The index plus one, or `?` when the index is not a natural number.
 * @example getColumnNumber(0) // 1
 */
export const getColumnNumber = (columnIndex) => {
  const isValidIndex = Number.isInteger(columnIndex) && columnIndex >= 0;
  return isValidIndex ? columnIndex + 1 : UNKNOWN_COLUMN_NUMBER;
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
  const columnName = `Colonne ${getColumnNumber(columnIndex)}`;
  return isFull ? `${columnName} pleine` : columnName;
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
    return `La colonne ${getColumnNumber(columnIndex)} est pleine.`;
  }

  return null;
};

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
 * Builds the class names of a cell of the board.
 * @param {string|number} token - The cell value: a player id, or `0` when empty.
 * @returns {string} The cell classes, plus the class of the player's token, such as `red-token`.
 *   Any value that is no known player draws an empty cell.
 */
export const getCellClassName = (token) => {
  const hasToken = getPlayerColorName(token) !== null;
  return hasToken ? `${CELL_CLASS_NAME} ${token}-token` : CELL_CLASS_NAME;
};

/**
 * Turns a board into a key that changes only when one of its cells changes.
 * @param {Array<Array<string|number>>} board - The board, top row first.
 * @returns {string} The key, to compare with the key of the board drawn last.
 */
export const getBoardKey = (board) => JSON.stringify(board) ?? '';

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
