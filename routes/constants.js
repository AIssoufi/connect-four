/** A column written as digits only: rejects `"7abc"`, `"2.5"`, `"-1"` and `" 3"`. */
const DIGITS_ONLY_PATTERN = /^\d+$/;

/** HTTP status of an accepted request. */
const OK_STATUS = 200;

/** HTTP status of a request refused because of its query or a rule of the game. */
const BAD_REQUEST_STATUS = 400;

module.exports = { DIGITS_ONLY_PATTERN, OK_STATUS, BAD_REQUEST_STATUS };
