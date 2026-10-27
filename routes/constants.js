/** HTTP status of an accepted request. */
const OK_STATUS = 200;

/** HTTP status of a request that created a game. */
const CREATED_STATUS = 201;

/** HTTP status of an answer without a body, such as the one to `OPTIONS`. */
const NO_CONTENT_STATUS = 204;

/** HTTP status of a request refused because of its body or a rule of the game. */
const BAD_REQUEST_STATUS = 400;

/** HTTP status of a request for a game or a route that does not exist. */
const NOT_FOUND_STATUS = 404;

/** HTTP status of a request for a known path with a method that the path does not serve. */
const METHOD_NOT_ALLOWED_STATUS = 405;

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

/** Message of a request for a known path with a method that the path does not serve. */
const METHOD_NOT_ALLOWED_MESSAGE = 'This route does not accept this method: see the Allow header.';

/** Message of a request that failed because of the server: the details stay in the logs. */
const SERVER_ERROR_MESSAGE = 'Server error.';

/** Header in which Cloudflare gives the IP address of the visitor. */
const CLIENT_IP_HEADER = 'CF-Connecting-IP';

/** Header that lists the methods that a path serves, sent with its 405 and `OPTIONS` answers. */
const ALLOW_HEADER = 'Allow';

/** Header that tells the browser not to guess the type of an answer from its body. */
const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';

/** Value of `CONTENT_TYPE_OPTIONS_HEADER` that keeps the declared `Content-Type`. */
const NO_SNIFF = 'nosniff';

/** Header that tells the browser to reach the site over HTTPS only, even when typed without it. */
const STRICT_TRANSPORT_SECURITY_HEADER = 'Strict-Transport-Security';

/**
 * Value of `STRICT_TRANSPORT_SECURITY_HEADER`: HTTPS only for a year (in seconds), for this host
 * alone, with neither `includeSubDomains` nor `preload`. `public/_headers` sends the same value.
 */
const HTTPS_ONLY_FOR_A_YEAR = 'max-age=31536000';

module.exports = {
  OK_STATUS,
  CREATED_STATUS,
  NO_CONTENT_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  METHOD_NOT_ALLOWED_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  SERVER_ERROR_STATUS,
  LAST_CLIENT_ERROR_STATUS,
  GAME_NOT_FOUND_MESSAGE,
  TOO_MANY_STARTS_MESSAGE,
  ROUTE_NOT_FOUND_MESSAGE,
  METHOD_NOT_ALLOWED_MESSAGE,
  SERVER_ERROR_MESSAGE,
  CLIENT_IP_HEADER,
  ALLOW_HEADER,
  CONTENT_TYPE_OPTIONS_HEADER,
  NO_SNIFF,
  STRICT_TRANSPORT_SECURITY_HEADER,
  HTTPS_ONLY_FOR_A_YEAR,
};
