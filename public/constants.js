/** The name of each player's color, as the page writes it. */
export const PLAYER_COLOR_NAMES = {
  red: 'rouge',
  yellow: 'jaune',
};

/** The states of a game, as the API reports them: the `GAME_STATES` of `app/constants.js`. */
export const GAME_STATES = {
  playing: 'playing',
  won: 'won',
  draw: 'draw',
};

/** The value of a board cell that holds no token: the `EMPTY_CELL` of `app/constants.js`. */
export const EMPTY_CELL = 0;

/** What stands for a row or column number that is missing or invalid. */
export const UNKNOWN_POSITION_NUMBER = '?';

/** The `tabindex` of a column button: the Tab key reaches only the focused column. */
export const TAB_INDEX = {
  reachable: 0,
  skipped: -1,
};

/** The keys that move the focus between the column buttons, as `KeyboardEvent.key` names them. */
export const COLUMN_NAVIGATION_KEYS = {
  previous: 'ArrowLeft',
  next: 'ArrowRight',
  first: 'Home',
  last: 'End',
};

/** The selectors of the elements of the page that the script updates or listens to. */
export const SELECTORS = {
  board: '#board',
  controlPanel: '#control-panel',
  status: '#game-status',
  message: '#game-message',
  newGameButton: '#new-game',
  columnPicker: '[data-column]',
};

/** The route of the API that starts a game, and the prefix of the routes of each game. */
export const GAME_ROUTE = '/game';

/** The class name of a row of the board. */
export const ROW_CLASS_NAME = 'row';

/** The class names of a cell of the board, before the class of its token. */
export const CELL_CLASS_NAME = 'column token';

/** The class name of the button of a column of the control panel, which drops a token. */
export const COLUMN_PICKER_CLASS_NAME = 'column-button';

/** The class name of the placeholder token drawn in the button of a column. */
export const PICKER_TOKEN_CLASS_NAME = 'token';

/** The class name of a cell of the board whose token belongs to the line that won. */
export const WINNING_CELL_CLASS_NAME = 'winning-cell';

/** The class name of a text that screen readers read and that the page does not show. */
export const VISUALLY_HIDDEN_CLASS_NAME = 'visually-hidden';

/** The prefix of the class of the control panel that gives the color of the player to play. */
export const CURRENT_PLAYER_CLASS_PREFIX = 'current-player-is-';

/** The text that says whose turn it is: `{color}` is the name of the player's color. */
export const TURN_TEXT = 'Au tour de {color}.';

/** The text that says who won: `{color}` is the capitalized name of the winner's color. */
export const WIN_TEXT = '{color} a gagné.';

/**
 * The text that says who won and with which tokens: `{color}` is the capitalized name of the
 * winner's color, and `{cells}` the list of the cells of `WINNING_CELL_NAME`.
 */
export const WIN_WITH_CELLS_TEXT = '{color} a gagné : {cells}.';

/** The name of a winning cell in `WIN_WITH_CELLS_TEXT`: `{row}` and `{column}` count from 1. */
export const WINNING_CELL_NAME = 'ligne {row} colonne {column}';

/** The language of the page, which joins the lists of its texts, such as `a, b et c`. */
export const PAGE_LOCALE = 'fr';

/** The name of a column of the control panel: `{number}` counts the columns from 1. */
export const COLUMN_LABEL = 'Colonne {number}';

/** The name of a column of the control panel that has no free cell left. */
export const FULL_COLUMN_LABEL = 'Colonne {number} pleine';

/**
 * The text that a screen reader reads for a cell of the board: `{row}` and `{column}` count from
 * 1, from the top and from the left, and `{content}` names the color of the token or `vide`.
 */
export const CELL_LABEL = 'Ligne {row}, colonne {column} : {content}';

/** The text that a screen reader reads for a token of the line that won, as in `CELL_LABEL`. */
export const WINNING_CELL_LABEL = 'Ligne {row}, colonne {column} : {content}, jeton gagnant';

/** The name of what an empty cell holds, in `CELL_LABEL`. */
export const EMPTY_CELL_NAME = 'vide';

/** The message shown when a player picks a column that has no free cell left. */
export const FULL_COLUMN_MESSAGE = 'La colonne {number} est pleine.';

/** The text shown when a game is a draw. */
export const DRAW_TEXT = 'Match nul : le plateau est plein.';

/** The message shown when a player picks a column once the game is over. */
export const GAME_OVER_MESSAGE = 'La partie est terminée : lancez une nouvelle partie.';

/** The message shown when the server refuses a move without a code that the page knows. */
export const MOVE_REFUSED_MESSAGE = 'Coup refusé par le serveur : rechargez la page.';

/** The message shown when the game no longer exists on the server. */
export const GAME_NOT_FOUND_MESSAGE = 'Cette partie n’existe plus : lancez une nouvelle partie.';

/** The message shown when this address started too many games. */
export const TOO_MANY_STARTS_MESSAGE = 'Trop de parties lancées depuis cette adresse : réessayez dans une minute.';

/** The message shown when the server fails, or answers what the page cannot read. */
export const SERVER_ERROR_MESSAGE = 'Erreur du serveur : réessayez.';

/** The message shown when the server cannot be reached. */
export const CONNECTION_ERROR_MESSAGE = 'Connexion au serveur impossible : réessayez.';

/** The message shown when the server finds a column full that the page still shows free. */
export const SERVER_FULL_COLUMN_MESSAGE = 'Cette colonne est pleine : rechargez la page.';

/** The message shown when the server says that the other player plays next. */
export const NOT_YOUR_TURN_MESSAGE = 'Ce n’est pas le tour de ce joueur : rechargez la page.';

/** The message shown when the player of the move has no token left. */
export const NO_TOKEN_LEFT_MESSAGE = 'Ce joueur n’a plus de jeton : lancez une nouvelle partie.';

/** The message shown when the server cannot read the move that the page sent. */
export const INVALID_MOVE_MESSAGE = 'Coup illisible pour le serveur : rechargez la page.';

/** The message shown when the server knows neither of the two colors of the move. */
export const INVALID_PLAYER_MESSAGE = 'Joueur inconnu du serveur : rechargez la page.';

/** The message shown when the column of the move is not on the board. */
export const INVALID_COLUMN_MESSAGE = 'Cette colonne n’existe pas : rechargez la page.';

/** The message shown when the server cannot read the request for a reason other than its move. */
export const INVALID_REQUEST_MESSAGE = 'Requête illisible pour le serveur : rechargez la page.';

/** The message shown when the request is too large for the server. */
export const BODY_TOO_LARGE_MESSAGE = 'Requête trop volumineuse pour le serveur : rechargez la page.';

/** The message shown when the server does not accept the format of the request. */
export const UNSUPPORTED_FORMAT_MESSAGE = 'Format de requête refusé par le serveur : rechargez la page.';

/** The message shown when the page calls an address or a method that the API does not serve. */
export const UNKNOWN_ROUTE_MESSAGE = 'Adresse inconnue du serveur : rechargez la page.';

/**
 * The message of each error code that the API sends in a `4xx` body: the `ERROR_CODES` of
 * `app/constants.js`, which `public/api/v1/openapi.yaml` describes.
 */
export const ERROR_MESSAGES_BY_CODE = {
  invalid_player: INVALID_PLAYER_MESSAGE,
  invalid_column: INVALID_COLUMN_MESSAGE,
  game_over: GAME_OVER_MESSAGE,
  not_your_turn: NOT_YOUR_TURN_MESSAGE,
  no_token_left: NO_TOKEN_LEFT_MESSAGE,
  column_full: SERVER_FULL_COLUMN_MESSAGE,
  invalid_move: INVALID_MOVE_MESSAGE,
  invalid_json: INVALID_MOVE_MESSAGE,
  body_too_large: BODY_TOO_LARGE_MESSAGE,
  unsupported_encoding: UNSUPPORTED_FORMAT_MESSAGE,
  unsupported_charset: UNSUPPORTED_FORMAT_MESSAGE,
  unsupported_media_type: UNSUPPORTED_FORMAT_MESSAGE,
  invalid_request: INVALID_REQUEST_MESSAGE,
  game_not_found: GAME_NOT_FOUND_MESSAGE,
  route_not_found: UNKNOWN_ROUTE_MESSAGE,
  method_not_allowed: UNKNOWN_ROUTE_MESSAGE,
  too_many_starts: TOO_MANY_STARTS_MESSAGE,
};

/** The HTTP statuses of the API that the page explains, from `routes/constants/http.js`. */
export const HTTP_STATUSES = {
  badRequest: 400,
  notFound: 404,
  tooManyRequests: 429,
};

/**
 * The message of each HTTP status that the API answers with an error, for a body without a code
 * of `ERROR_MESSAGES_BY_CODE`.
 */
export const ERROR_MESSAGES_BY_STATUS = {
  [HTTP_STATUSES.badRequest]: MOVE_REFUSED_MESSAGE,
  [HTTP_STATUSES.notFound]: GAME_NOT_FOUND_MESSAGE,
  [HTTP_STATUSES.tooManyRequests]: TOO_MANY_STARTS_MESSAGE,
};
