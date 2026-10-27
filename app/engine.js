const GameError = require('./GameError');
const { findAlignment } = require('./alignment');
const { isKnownPlayer, isValidColumnNumber } = require('./utils');
const {
  PLAYER_IDS,
  EMPTY_CELL,
  ROW_COUNT,
  COLUMN_COUNT,
  FIRST_COLUMN_NUMBER,
  TOKENS_PER_PLAYER,
  GAME_STATES,
  NO_WINNER,
  NOBODY,
  ERROR_CODES,
} = require('./constants');

/**
 * Builds an empty board: `ROW_COUNT` rows of `COLUMN_COUNT` empty cells, bottom row first.
 * @returns {Array<Array<string|number>>} The new board.
 */
const createEmptyBoard = () => Array.from(
  { length: ROW_COUNT },
  () => Array(COLUMN_COUNT).fill(EMPTY_CELL),
);

/**
 * Orders two cells as a player reads the board: top row first, then left to right.
 * @param {{ row: number, column: number }} cell - A cell, row 0 at the top.
 * @param {{ row: number, column: number }} otherCell - Another cell, row 0 at the top.
 * @returns {number} A negative number when `cell` comes first, positive when it comes last.
 */
const compareInReadingOrder = (cell, otherCell) => cell.row - otherCell.row
  || cell.column - otherCell.column;

/**
 * Runs one game of Connect Four: it keeps the board, the turn, the tokens left
 * and the result, and refuses any move that breaks a rule with a `GameError`.
 * It does not depend on Express, so any server can host one instance per game.
 */
class Engine {
  /**
   * @param {object} [params]
   * @param {string} [params.firstPlayer] - The player who plays first. Defaults to red, as for
   *   every new game; a game saved when either player could start replays with its own.
   */
  constructor({ firstPlayer } = {}) {
    this.init({ firstPlayer });
  }

  /**
   * Starts a new game: empty board, full token stocks, no last player, no winner and no winning
   * cells.
   * @param {object} [params]
   * @param {string} [params.firstPlayer] - The player who plays first. Defaults to red when it is
   *   not one of `PLAYER_IDS`.
   */
  init({ firstPlayer } = {}) {
    this.firstPlayer = isKnownPlayer(firstPlayer) ? firstPlayer : PLAYER_IDS.RED;
    this.board = createEmptyBoard();
    this.tokens = {
      [PLAYER_IDS.RED]: TOKENS_PER_PLAYER,
      [PLAYER_IDS.YELLOW]: TOKENS_PER_PLAYER,
    };
    this.lastPlayerWhoPlayed = undefined;
    this.winner = undefined;
    this.winningCells = [];
    this.state = GAME_STATES.PLAYING;
  }

  /**
   * Drops a token of a player in a column, then updates the result of the game.
   * @param {object} params
   * @param {string} params.playerId - The player who plays, one of `PLAYER_IDS`.
   * @param {number} params.column - The column number, from 1 (left) to `COLUMN_COUNT`.
   * @throws {GameError} When the player or the column is invalid, the game is
   * over, it is the other player's turn, the player has no token left or the
   * column is full, with the code of the broken rule. The game does not change then.
   */
  play({ playerId, column } = {}) {
    if (!isKnownPlayer(playerId)) {
      throw new GameError({
        code: ERROR_CODES.INVALID_PLAYER,
        message: `The player must be one of: ${Object.values(PLAYER_IDS).join(', ')}!`,
      });
    }

    if (!isValidColumnNumber(column)) {
      throw new GameError({
        code: ERROR_CODES.INVALID_COLUMN,
        message: `The column number must be an integer between ${FIRST_COLUMN_NUMBER} and ${COLUMN_COUNT}!`,
      });
    }

    const isGameOver = this.state !== GAME_STATES.PLAYING;
    if (isGameOver) {
      throw new GameError({ code: ERROR_CODES.GAME_OVER, message: 'The game is over!' });
    }

    if (!this.isYourTurn(playerId)) {
      throw new GameError({ code: ERROR_CODES.NOT_YOUR_TURN, message: `${playerId}: it's not your turn!` });
    }

    // Unreachable in normal play: alternate turns fill the board exactly when both stocks
    // run out, so the game ends first.
    if (!this.hasEnoughToken(playerId)) {
      throw new GameError({
        code: ERROR_CODES.NO_TOKEN_LEFT,
        message: 'You do not have enough token to play!',
      });
    }

    const columnIndex = column - FIRST_COLUMN_NUMBER;
    const rowIndex = this.board.findIndex((row) => row[columnIndex] === EMPTY_CELL);
    const isColumnFull = rowIndex === -1;
    if (isColumnFull) {
      throw new GameError({ code: ERROR_CODES.COLUMN_FULL, message: `The column ${column} is full!` });
    }

    this.board[rowIndex][columnIndex] = playerId;
    this.tokens[playerId] -= 1;
    this.lastPlayerWhoPlayed = playerId;

    this.updateState({ row: rowIndex, column: columnIndex });
  }

  /**
   * Sets the winner, the winning cells and the state of the game after a token lands in a cell.
   * @param {object} params
   * @param {number} params.row - The row index of the new token.
   * @param {number} params.column - The column index of the new token.
   */
  updateState({ row, column }) {
    const alignedCells = findAlignment({ board: this.board, row, column });
    if (alignedCells.length > 0) {
      this.winner = this.lastPlayerWhoPlayed;
      this.winningCells = alignedCells;
      this.state = GAME_STATES.WON;
      return;
    }

    const isBoardFull = this.board.every((boardRow) => !boardRow.includes(EMPTY_CELL));
    if (isBoardFull) this.state = GAME_STATES.DRAW;
  }

  /**
   * @param {string} currentPlayer - The player who wants to play.
   * @returns {boolean} `true` when the player has at least one token left.
   */
  hasEnoughToken(currentPlayer) {
    return this.tokens[currentPlayer] > 0;
  }

  /**
   * @param {string} currentPlayer - The player who wants to play.
   * @returns {boolean} `true` for the first player before the first move, then unless the player
   * made the last move.
   */
  isYourTurn(currentPlayer) {
    const isFirstMove = this.lastPlayerWhoPlayed === undefined;
    if (isFirstMove) return currentPlayer === this.firstPlayer;

    return this.lastPlayerWhoPlayed !== currentPlayer;
  }

  /** @returns {Array<Array<string|number>>} A copy of the board, bottom row first. */
  getBoard() {
    return this.board.map((row) => [...row]);
  }

  /** @returns {string[]} The players, red first. */
  // eslint-disable-next-line class-methods-use-this
  getPlayers() {
    return [PLAYER_IDS.RED, PLAYER_IDS.YELLOW];
  }

  /** @returns {Object<string, number>} The number of tokens left, by player. */
  getTokens() {
    return { ...this.tokens };
  }

  /** @returns {string} The player who made the last move, or `NOBODY`. */
  getLastPlayerWhoPlayed() {
    return this.lastPlayerWhoPlayed || NOBODY;
  }

  /** @returns {string} The player who won, or `NO_WINNER`. */
  getWinner() {
    return this.winner || NO_WINNER;
  }

  /**
   * @returns {Array<{ row: number, column: number }>} The cells of the tokens that won, as
   * indexes of the board of `getStatus()`, top row first, in reading order: the four cells of the
   * line, more when the last move made a longer line or two lines. Empty while nobody has won.
   */
  getWinningCells() {
    const topRowIndex = this.board.length - 1;

    return this.winningCells
      .map(({ row, column }) => ({ row: topRowIndex - row, column }))
      .sort(compareInReadingOrder);
  }

  /**
   * Describes the game for the client.
   * @returns {{
   *   players: string[],
   *   tokens: Object<string, number>,
   *   lastPlayerWhoPlayed: string,
   *   winner: string,
   *   state: string,
   *   board: Array<Array<string|number>>,
   *   winningCells: Array<{ row: number, column: number }>,
   * }} The status, with `state` one of `GAME_STATES`, the board top row first and the winning
   * cells of `getWinningCells()`.
   */
  getStatus() {
    return {
      players: this.getPlayers(),
      tokens: this.getTokens(),
      lastPlayerWhoPlayed: this.getLastPlayerWhoPlayed(),
      winner: this.getWinner(),
      state: this.state,
      board: this.getBoard().reverse(),
      winningCells: this.getWinningCells(),
    };
  }
}

module.exports = Engine;
