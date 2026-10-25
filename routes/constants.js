/** HTTP status of an accepted request. */
const OK_STATUS = 200;

/** HTTP status of a request that created a game. */
const CREATED_STATUS = 201;

/** HTTP status of a request refused because of its body or a rule of the game. */
const BAD_REQUEST_STATUS = 400;

/** HTTP status of a request for a game or a route that does not exist. */
const NOT_FOUND_STATUS = 404;

/** HTTP status of a request refused because its sender made too many of them. */
const TOO_MANY_REQUESTS_STATUS = 429;

/** HTTP status of a request that failed because of the server. */
const SERVER_ERROR_STATUS = 500;

/** Highest HTTP status of a client error, as opposed to a server error. */
const LAST_CLIENT_ERROR_STATUS = 499;

/** Message of a request for a game id that no game has. */
const GAME_NOT_FOUND_MESSAGE = 'No game has this id.';

/** Message of a game start refused because its sender started too many games. */
const TOO_MANY_STARTS_MESSAGE = 'Too many games started from this address: try again later.';

/** Message of a request for a path that the API does not serve. */
const ROUTE_NOT_FOUND_MESSAGE = 'This route does not exist.';

/** Message of a request that failed because of the server: the details stay in the logs. */
const SERVER_ERROR_MESSAGE = 'Server error.';

/** Header in which Cloudflare gives the IP address of the visitor. */
const CLIENT_IP_HEADER = 'CF-Connecting-IP';

/** Header that tells the browser not to guess the type of an answer from its body. */
const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';

/** Value of `CONTENT_TYPE_OPTIONS_HEADER` that keeps the declared `Content-Type`. */
const NO_SNIFF = 'nosniff';

module.exports = {
  OK_STATUS,
  CREATED_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  SERVER_ERROR_STATUS,
  LAST_CLIENT_ERROR_STATUS,
  GAME_NOT_FOUND_MESSAGE,
  TOO_MANY_STARTS_MESSAGE,
  ROUTE_NOT_FOUND_MESSAGE,
  SERVER_ERROR_MESSAGE,
  CLIENT_IP_HEADER,
  CONTENT_TYPE_OPTIONS_HEADER,
  NO_SNIFF,
};
