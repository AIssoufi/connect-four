/** The format of the answers of the API. */
const JSON_FORMAT = 'json';

/** The format that a browser prefers. */
const HTML_FORMAT = 'html';

/**
 * Formats that the 404 comes in, JSON first: a request that accepts any type, or that sends no
 * `Accept`, gets JSON.
 */
const NOT_FOUND_FORMATS = [JSON_FORMAT, HTML_FORMAT];

module.exports = {
  JSON_FORMAT,
  HTML_FORMAT,
  NOT_FOUND_FORMATS,
};
