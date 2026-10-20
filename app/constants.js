/** Identifiers of the two players, as sent by the client and stored on the board. */
const PLAYER_IDS = Object.freeze({
  RED: 'red',
  YELLOW: 'yellow',
});

/** Value of a board cell that holds no token. */
const EMPTY_CELL = 0;

/** Number of rows of the board. Row 0 is the bottom row, where tokens land first. */
const ROW_COUNT = 6;

/** Number of columns of the board. */
const COLUMN_COUNT = 7;

/** Number of the leftmost column, as players count them. */
const FIRST_COLUMN_NUMBER = 1;

/** Number of aligned tokens a player needs to win. */
const ALIGNMENT_LENGTH = 4;

/** Number of tokens each player starts with: together they fill the board exactly. */
const TOKENS_PER_PLAYER = (ROW_COUNT * COLUMN_COUNT) / 2;

/** States of a game, as reported by the status. */
const GAME_STATES = Object.freeze({
  PLAYING: 'playing',
  WON: 'won',
  DRAW: 'draw',
});

/** Winner reported while nobody has won. */
const NO_WINNER = 'no winner';

/** Last player reported before the first move. */
const NOBODY = 'nobody';

module.exports = {
  PLAYER_IDS,
  EMPTY_CELL,
  ROW_COUNT,
  COLUMN_COUNT,
  FIRST_COLUMN_NUMBER,
  ALIGNMENT_LENGTH,
  TOKENS_PER_PLAYER,
  GAME_STATES,
  NO_WINNER,
  NOBODY,
};
