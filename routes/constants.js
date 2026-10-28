const { ERROR_CODES } = require('../app/constants');

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

/** HTTP status of a request refused because of the type or the encoding of its body. */
const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;

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

/** Message of a move whose body is sent with a `Content-Type` other than JSON. */
const UNSUPPORTED_MEDIA_TYPE_MESSAGE = 'The body must be sent with Content-Type: application/json.';

/** Message of a request that failed because of the server: the details stay in the logs. */
const SERVER_ERROR_MESSAGE = 'Server error.';

/**
 * Codes of the refusals of a body by `express.json()`, by the `type` that the parser gives its
 * error. Any other exposed client error gets `ERROR_CODES.INVALID_REQUEST`.
 */
const BODY_PARSER_ERROR_CODES = new Map([
  ['entity.parse.failed', ERROR_CODES.INVALID_JSON],
  ['entity.too.large', ERROR_CODES.BODY_TOO_LARGE],
  ['encoding.unsupported', ERROR_CODES.UNSUPPORTED_ENCODING],
  ['charset.unsupported', ERROR_CODES.UNSUPPORTED_CHARSET],
]);

/** The only type of body that the API reads, with or without a `charset` parameter. */
const JSON_MEDIA_TYPE = 'application/json';

/** Header that gives the length of the body of a request, in bytes. */
const CONTENT_LENGTH_HEADER = 'Content-Length';

/** Header in which Cloudflare gives the IP address of the visitor. */
const CLIENT_IP_HEADER = 'CF-Connecting-IP';

/** Header that lists the methods that a path serves, sent with its 405 and `OPTIONS` answers. */
const ALLOW_HEADER = 'Allow';

/** An IPv4 address in dotted decimal: four groups of one to three digits. */
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Separator of the bytes of an IPv4 address. */
const IPV4_BYTE_SEPARATOR = '.';

/** Largest value of one byte of an IPv4 address. */
const MAX_IPV4_BYTE = 255;

/** Values that one byte holds, to split a 16-bit group of an IPv6 address into two bytes. */
const BYTE_VALUE_COUNT = 256;

/** One 16-bit group of an IPv6 address, in one to four hexadecimal digits. */
const IPV6_GROUP_PATTERN = /^[0-9a-f]{1,4}$/;

/** Groups of 16 bits in an IPv6 address. */
const IPV6_GROUP_COUNT = 8;

/** Groups of the /64 prefix of an IPv6 address, the network of one client. */
const IPV6_NETWORK_GROUP_COUNT = 4;

/** Bits in one group of an IPv6 address. */
const IPV6_GROUP_BIT_COUNT = 16;

/** Length in bits of the prefix of `IPV6_NETWORK_GROUP_COUNT` groups: 64. */
const IPV6_NETWORK_PREFIX_LENGTH = IPV6_NETWORK_GROUP_COUNT * IPV6_GROUP_BIT_COUNT;

/** Groups of an IPv6 address that hold an IPv4 address, its last two. */
const IPV4_GROUP_COUNT = 2;

/** Groups set to 0 before the `ffff` group of an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`). */
const IPV4_MAPPED_ZERO_GROUP_COUNT = 5;

/** The group after the zeros of an IPv4-mapped IPv6 address. */
const IPV4_MAPPED_GROUP = 0xffff;

/** Separator of the groups of an IPv6 address. */
const IPV6_GROUP_SEPARATOR = ':';

/** The run of zero groups that an IPv6 address may compress, once at most. */
const IPV6_ZERO_RUN = '::';

/** Parts of an IPv6 address split at its `::`: the groups before it and the groups after it. */
const ZERO_RUN_PART_COUNT = 2;

/** Start of the zone of an IPv6 address (`fe80::1%eth0`), which names a local interface. */
const IPV6_ZONE_SEPARATOR = '%';

/** Base of the bytes of an IPv4 address. */
const DECIMAL_RADIX = 10;

/** Base of the groups of an IPv6 address. */
const HEXADECIMAL_RADIX = 16;

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

/** Header that limits what a page may load, and which sites may frame it. */
const CONTENT_SECURITY_POLICY_HEADER = 'Content-Security-Policy';

/**
 * Value of `CONTENT_SECURITY_POLICY_HEADER` for the pages of the app: the same policy as the one
 * that `public/_headers` gives the files of `public/`, which never reaches the app.
 */
const SAME_ORIGIN_ONLY_POLICY = "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

/** Header that limits what a page tells another site about the page that linked to it. */
const REFERRER_POLICY_HEADER = 'Referrer-Policy';

/** Value of `REFERRER_POLICY_HEADER`: the same as the one of `public/_headers`. */
const ORIGIN_ONLY_ACROSS_SITES = 'strict-origin-when-cross-origin';

/** Request header from which the app chooses between the JSON and the HTML 404. */
const ACCEPT_HEADER = 'Accept';

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
  OK_STATUS,
  CREATED_STATUS,
  NO_CONTENT_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  METHOD_NOT_ALLOWED_STATUS,
  UNSUPPORTED_MEDIA_TYPE_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  SERVER_ERROR_STATUS,
  LAST_CLIENT_ERROR_STATUS,
  GAME_NOT_FOUND_MESSAGE,
  TOO_MANY_STARTS_MESSAGE,
  ROUTE_NOT_FOUND_MESSAGE,
  METHOD_NOT_ALLOWED_MESSAGE,
  UNSUPPORTED_MEDIA_TYPE_MESSAGE,
  SERVER_ERROR_MESSAGE,
  BODY_PARSER_ERROR_CODES,
  JSON_MEDIA_TYPE,
  CONTENT_LENGTH_HEADER,
  CLIENT_IP_HEADER,
  ALLOW_HEADER,
  IPV4_PATTERN,
  IPV4_BYTE_SEPARATOR,
  MAX_IPV4_BYTE,
  BYTE_VALUE_COUNT,
  IPV6_GROUP_PATTERN,
  IPV6_GROUP_COUNT,
  IPV6_NETWORK_GROUP_COUNT,
  IPV6_NETWORK_PREFIX_LENGTH,
  IPV4_GROUP_COUNT,
  IPV4_MAPPED_ZERO_GROUP_COUNT,
  IPV4_MAPPED_GROUP,
  IPV6_GROUP_SEPARATOR,
  IPV6_ZERO_RUN,
  ZERO_RUN_PART_COUNT,
  IPV6_ZONE_SEPARATOR,
  DECIMAL_RADIX,
  HEXADECIMAL_RADIX,
  CONTENT_TYPE_OPTIONS_HEADER,
  NO_SNIFF,
  STRICT_TRANSPORT_SECURITY_HEADER,
  HTTPS_ONLY_FOR_A_YEAR,
  CONTENT_SECURITY_POLICY_HEADER,
  SAME_ORIGIN_ONLY_POLICY,
  REFERRER_POLICY_HEADER,
  ORIGIN_ONLY_ACROSS_SITES,
  ACCEPT_HEADER,
  JSON_FORMAT,
  HTML_FORMAT,
  NOT_FOUND_FORMATS,
};
