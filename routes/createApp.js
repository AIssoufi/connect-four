// Dependencies
const express = require('express');
const createGameRouter = require('./index');
const { isExposedClientError } = require('./utils');
const {
  NOT_FOUND_STATUS,
  SERVER_ERROR_STATUS,
  ROUTE_NOT_FOUND_MESSAGE,
  SERVER_ERROR_MESSAGE,
} = require('./constants');

/**
 * Builds the Express app of the API: the `/game` routes, a JSON 404 for any other path, and an
 * error handler that answers JSON without the stack trace. The Worker serves the files of
 * `public/` before any request reaches this app.
 * @param {object} params
 * @param {import('../worker/createGameStore').GameStore} params.games - The games to serve.
 * @returns {express.Express} The app, ready to listen.
 */
const createApp = ({ games }) => {
  const app = express();
  app.disable('x-powered-by');

  app.use('/game', createGameRouter({ games }));

  app.use((req, res) => {
    res.status(NOT_FOUND_STATUS).json({ message: ROUTE_NOT_FOUND_MESSAGE });
  });

  app.use((error, req, res, next) => {
    // A response already sent cannot change: the default handler of Express ends it.
    if (res.headersSent) {
      next(error);
      return;
    }

    if (isExposedClientError(error)) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(error);
    res.status(SERVER_ERROR_STATUS).json({ message: SERVER_ERROR_MESSAGE });
  });

  return app;
};

module.exports = createApp;
