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

/**
 * Stable codes of the refusals of the API, sent as `code` next to the English `message` of
 * every 4xx body, so that a client can explain a refusal without reading its message. The engine
 * gives the codes of the broken rules, the routes the others. `public/api/v1/openapi.yaml` lists
 * them: keep both in step.
 */
const ERROR_CODES = Object.freeze({
  /** The player of a move is not one of `PLAYER_IDS`. */
  INVALID_PLAYER: 'invalid_player',
  /** The column of a move is not an integer from `FIRST_COLUMN_NUMBER` to `COLUMN_COUNT`. */
  INVALID_COLUMN: 'invalid_column',
  /** The game is won or drawn: it accepts no more moves. */
  GAME_OVER: 'game_over',
  /** The player who sent the move played the last one. */
  NOT_YOUR_TURN: 'not_your_turn',
  /** The player has no token left, which normal play never reaches. */
  NO_TOKEN_LEFT: 'no_token_left',
  /** The column of the move has no free cell. */
  COLUMN_FULL: 'column_full',
  /** The body of a move is not a JSON object. */
  INVALID_MOVE: 'invalid_move',
  /** The body of the request is not valid JSON. */
  INVALID_JSON: 'invalid_json',
  /** The body of the request is larger than the parser accepts. */
  BODY_TOO_LARGE: 'body_too_large',
  /** The body of the request is compressed, which the parser refuses. */
  UNSUPPORTED_ENCODING: 'unsupported_encoding',
  /** The body of the request is in a charset other than UTF-8. */
  UNSUPPORTED_CHARSET: 'unsupported_charset',
  /** The body of a move is sent with a `Content-Type` other than JSON. */
  UNSUPPORTED_MEDIA_TYPE: 'unsupported_media_type',
  /** Any other refusal of the body by the parser. */
  INVALID_REQUEST: 'invalid_request',
  /** No game has the id of the request. */
  GAME_NOT_FOUND: 'game_not_found',
  /** The API serves no route at this path. */
  ROUTE_NOT_FOUND: 'route_not_found',
  /** The path does not serve this method. */
  METHOD_NOT_ALLOWED: 'method_not_allowed',
  /** The client network of the visitor started too many games. */
  TOO_MANY_STARTS: 'too_many_starts',
});

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
  ERROR_CODES,
};
