/**
 * Port of the Express app inside the Worker. No socket opens on it: `httpServerHandler` hands
 * each request of the Worker to the server that listens on this port.
 */
const SERVER_PORT = 8080;

/** Number of hexadecimal digits of a Durable Object id in its string form. */
const GAME_ID_LENGTH = 64;

/** A Durable Object id in its string form: `GAME_ID_LENGTH` lowercase hexadecimal digits. */
const GAME_ID_PATTERN = new RegExp(`^[0-9a-f]{${GAME_ID_LENGTH}}$`);

/** Storage key of the moves played in a game, in the order they were played. */
const MOVES_STORAGE_KEY = 'moves';

module.exports = {
  SERVER_PORT, GAME_ID_LENGTH, GAME_ID_PATTERN, MOVES_STORAGE_KEY,
};
