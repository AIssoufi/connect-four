/** Header that gives the length of the body of a request, in bytes. */
const CONTENT_LENGTH_HEADER = 'Content-Length';

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

/** Header that turns off browser features for the page and the sites it embeds. */
const PERMISSIONS_POLICY_HEADER = 'Permissions-Policy';

/** Value of `PERMISSIONS_POLICY_HEADER`: none of the features it lists, as in `public/_headers`. */
const NO_UNUSED_FEATURES = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

/** Header that keeps a page apart from the windows of other sites that open it or that it opens. */
const CROSS_ORIGIN_OPENER_POLICY_HEADER = 'Cross-Origin-Opener-Policy';

/** Value of `CROSS_ORIGIN_OPENER_POLICY_HEADER`: the same as the one of `public/_headers`. */
const SAME_ORIGIN_OPENER = 'same-origin';

/** Request header from which the app chooses between the JSON and the HTML 404. */
const ACCEPT_HEADER = 'Accept';

module.exports = {
  CONTENT_LENGTH_HEADER,
  CLIENT_IP_HEADER,
  ALLOW_HEADER,
  CONTENT_TYPE_OPTIONS_HEADER,
  NO_SNIFF,
  STRICT_TRANSPORT_SECURITY_HEADER,
  HTTPS_ONLY_FOR_A_YEAR,
  CONTENT_SECURITY_POLICY_HEADER,
  SAME_ORIGIN_ONLY_POLICY,
  REFERRER_POLICY_HEADER,
  ORIGIN_ONLY_ACROSS_SITES,
  PERMISSIONS_POLICY_HEADER,
  NO_UNUSED_FEATURES,
  CROSS_ORIGIN_OPENER_POLICY_HEADER,
  SAME_ORIGIN_OPENER,
  ACCEPT_HEADER,
};
