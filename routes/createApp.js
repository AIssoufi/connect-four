// Dependencies
const express = require('express');
const { ERROR_CODES } = require('../app/constants');
const createGameRouter = require('./index');
const { isExposedClientError, getClientErrorCode } = require('./utils');
const {
  NOT_FOUND_STATUS,
  SERVER_ERROR_STATUS,
  ROUTE_NOT_FOUND_MESSAGE,
  SERVER_ERROR_MESSAGE,
  CONTENT_TYPE_OPTIONS_HEADER,
  NO_SNIFF,
  STRICT_TRANSPORT_SECURITY_HEADER,
  HTTPS_ONLY_FOR_A_YEAR,
  CONTENT_SECURITY_POLICY_HEADER,
  SAME_ORIGIN_ONLY_POLICY,
  ACCEPT_HEADER,
  NOT_FOUND_FORMATS,
  HTML_FORMAT,
  REFERRER_POLICY_HEADER,
  ORIGIN_ONLY_ACROSS_SITES,
} = require('./constants');
const NOT_FOUND_PAGE = require('./notFoundPage');

/**
 * Builds the Express app of the API: the `/game` routes, a 404 for any other path (an HTML page
 * when `Accept` prefers it, as a browser does, JSON otherwise), and an error handler that answers
 * JSON without the stack trace. Every answer sends
 * `X-Content-Type-Options: nosniff` and `Strict-Transport-Security: max-age=31536000`. The Worker
 * serves the files of `public/` before any request reaches this app.
 * @param {object} params
 * @param {import('../worker/createGameStore').GameStore} params.games - The games to serve.
 * @param {object} [params.startLimiter] - The Rate Limiting binding that limits the games each
 *   visitor starts. Without it, starts are not limited.
 * @returns {express.Express} The app, ready to listen.
 */
const createApp = ({ games, startLimiter }) => {
  const app = express();
  app.disable('x-powered-by');

  // Set before any route, so that the 404 and the error answers carry it too.
  app.use((req, res, next) => {
    res.set(CONTENT_TYPE_OPTIONS_HEADER, NO_SNIFF);
    res.set(STRICT_TRANSPORT_SECURITY_HEADER, HTTPS_ONLY_FOR_A_YEAR);
    next();
  });

  app.use('/game', createGameRouter({ games, startLimiter }));

  app.use((req, res) => {
    res.vary(ACCEPT_HEADER);
    res.status(NOT_FOUND_STATUS);

    const prefersPage = req.accepts(NOT_FOUND_FORMATS) === HTML_FORMAT;
    if (prefersPage) {
      res.set(CONTENT_SECURITY_POLICY_HEADER, SAME_ORIGIN_ONLY_POLICY);
      res.set(REFERRER_POLICY_HEADER, ORIGIN_ONLY_ACROSS_SITES);
      res.type(HTML_FORMAT).send(NOT_FOUND_PAGE);
      return;
    }

    res.json({
      code: ERROR_CODES.ROUTE_NOT_FOUND,
      message: ROUTE_NOT_FOUND_MESSAGE,
    });
  });

  app.use((error, req, res, next) => {
    // A response already sent cannot change: the default handler of Express ends it.
    if (res.headersSent) {
      next(error);
      return;
    }

    if (isExposedClientError(error)) {
      res.status(error.status).json({ code: getClientErrorCode(error), message: error.message });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(error);
    res.status(SERVER_ERROR_STATUS).json({ message: SERVER_ERROR_MESSAGE });
  });

  return app;
};

module.exports = createApp;
