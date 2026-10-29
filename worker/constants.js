/**
 * Port of the Express app inside the Worker. No socket opens on it: `httpServerHandler` hands
 * each request of the Worker to the server that listens on this port.
 */
const SERVER_PORT = 8080;

/** Number of hexadecimal digits of a Durable Object id in its string form. */
const GAME_ID_LENGTH = 64;

/** A Durable Object id in its string form: `GAME_ID_LENGTH` lowercase hexadecimal digits. */
const GAME_ID_PATTERN = new RegExp(`^[0-9a-f]{${GAME_ID_LENGTH}}$`);

/**
 * Game id that the files-only live check asks the status of. It has the form of a game id, but
 * `GAME_STORE_CHECK_NAME` names its Durable Object instead, so that the request reaches a real
 * instance, whose empty storage answers that no game has this id.
 */
const GAME_STORE_CHECK_ID = '0'.repeat(GAME_ID_LENGTH);

/**
 * Name of the Durable Object that `GAME_STORE_CHECK_ID` reaches. No game ever starts in it:
 * only `getStatus`, which writes nothing, reaches it.
 */
const GAME_STORE_CHECK_NAME = 'live-check';

/** Storage key of the moves played in a game, in the order they were played. */
const MOVES_STORAGE_KEY = 'moves';

/** Milliseconds in a day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days after its start or its last move when a game is deleted. */
const GAME_TTL_DAYS = 7;

/** Time after its start or its last move when a game is deleted. */
const GAME_TTL_MS = GAME_TTL_DAYS * MS_PER_DAY;

module.exports = {
  SERVER_PORT,
  GAME_ID_LENGTH,
  GAME_ID_PATTERN,
  GAME_STORE_CHECK_ID,
  GAME_STORE_CHECK_NAME,
  MOVES_STORAGE_KEY,
  GAME_TTL_MS,
};
