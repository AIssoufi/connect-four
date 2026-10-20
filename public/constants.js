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

/** What stands for a column number that is missing or invalid. */
export const UNKNOWN_COLUMN_NUMBER = '?';

/** The selectors of the elements of the page that the script updates. */
export const SELECTORS = {
  board: '#board',
  controlPanel: '#control-panel',
  status: '#game-status',
  message: '#game-message',
  newGameButton: '#new-game',
};

/** The route of the API that starts a game, and the prefix of the routes of each game. */
export const GAME_ROUTE = '/game';

/** The class name of a row of the board. */
export const ROW_CLASS_NAME = 'row';

/** The class names of a cell of the board, before the class of its token. */
export const CELL_CLASS_NAME = 'column token';

/** The class name of a column of the control panel, where a click drops a token. */
export const COLUMN_PICKER_CLASS_NAME = 'token';

/** The text shown when a game is a draw. */
export const DRAW_TEXT = 'Match nul : le plateau est plein.';

/** The message shown when a player picks a column once the game is over. */
export const GAME_OVER_MESSAGE = 'La partie est terminée : lancez une nouvelle partie.';

/** The message shown when the server refuses a move for another reason. */
export const MOVE_REFUSED_MESSAGE = 'Coup refusé par le serveur : rechargez la page.';

/** The message shown when the game no longer exists on the server. */
export const GAME_NOT_FOUND_MESSAGE = 'Cette partie n’existe plus : lancez une nouvelle partie.';

/** The message shown when this address started too many games. */
export const TOO_MANY_STARTS_MESSAGE = 'Trop de parties lancées depuis cette adresse : réessayez dans une minute.';

/** The message shown when the server fails, or answers what the page cannot read. */
export const SERVER_ERROR_MESSAGE = 'Erreur du serveur : réessayez.';

/** The message shown when the server cannot be reached. */
export const CONNECTION_ERROR_MESSAGE = 'Connexion au serveur impossible : réessayez.';

/** The HTTP statuses of the API that the page explains, from `routes/constants.js`. */
export const HTTP_STATUSES = {
  badRequest: 400,
  notFound: 404,
  tooManyRequests: 429,
};

/** The message of each HTTP status that the API answers with an error. */
export const ERROR_MESSAGES_BY_STATUS = {
  [HTTP_STATUSES.badRequest]: MOVE_REFUSED_MESSAGE,
  [HTTP_STATUSES.notFound]: GAME_NOT_FOUND_MESSAGE,
  [HTTP_STATUSES.tooManyRequests]: TOO_MANY_STARTS_MESSAGE,
};
