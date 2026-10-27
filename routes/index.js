// Dependencies
const express = require('express');
const { ERROR_CODES } = require('../app/constants');
const { parseMove, isStartAllowed } = require('./utils');
const {
  OK_STATUS,
  CREATED_STATUS,
  NO_CONTENT_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  METHOD_NOT_ALLOWED_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  GAME_NOT_FOUND_MESSAGE,
  TOO_MANY_STARTS_MESSAGE,
  METHOD_NOT_ALLOWED_MESSAGE,
  CLIENT_IP_HEADER,
  ALLOW_HEADER,
} = require('./constants');

/**
 * Parses the JSON body of a move. A move is a few bytes, so the parser reads plain bodies only:
 * a compressed one (a `Content-Encoding` other than `identity`) gets 415 and is never inflated.
 */
const parseJsonBody = express.json({ inflate: false });

/** The method that asks a path which methods it serves. */
const OPTIONS_METHOD = 'OPTIONS';

/** Methods of the paths that start a game or play a move. */
const WRITE_METHODS = ['POST'];

/** Methods of the path that reads a game: Express answers `HEAD` with the `GET` handler. */
const READ_METHODS = ['GET', 'HEAD'];

/**
 * Builds the handler that ends a path with the methods its other handlers do not serve. Both of
 * its answers list in `Allow` the methods of the path, `OPTIONS` included: `OPTIONS` gets 204,
 * any other method 405 with the JSON error. It replaces the automatic `OPTIONS` answer of
 * Express, which `.all()` turns off.
 * @param {string[]} methods - The methods that the other handlers of the path serve.
 * @returns {express.RequestHandler} The handler, to pass to `router.route(...).all()`.
 */
const answerOtherMethods = (methods) => {
  const allowedMethods = [...methods, OPTIONS_METHOD].join(', ');

  return (req, res) => {
    res.set(ALLOW_HEADER, allowedMethods);
    const isOptionsRequest = req.method === OPTIONS_METHOD;
    if (isOptionsRequest) {
      res.status(NO_CONTENT_STATUS).end();
      return;
    }

    res.status(METHOD_NOT_ALLOWED_STATUS).json({
      code: ERROR_CODES.METHOD_NOT_ALLOWED,
      message: METHOD_NOT_ALLOWED_MESSAGE,
    });
  };
};

/**
 * Builds the router of the `/game` routes, which start, read and play games by their id. Each
 * path answers a method it does not serve with 405 and its methods in `Allow`.
 * `public/api/v1/openapi.yaml` documents these routes: keep both in step.
 * @param {object} params
 * @param {import('../worker/createGameStore').GameStore} params.games - The games to serve.
 * @param {object} [params.startLimiter] - The Rate Limiting binding that limits the games each
 *   visitor starts. See `isStartAllowed()`.
 * @returns {express.Router} The router, to mount on `/game`.
 */
const createGameRouter = ({ games, startLimiter }) => {
  const router = express.Router();

  router.route('/').post(async (req, res) => {
    const isAllowed = await isStartAllowed({
      limiter: startLimiter,
      clientIp: req.get(CLIENT_IP_HEADER),
    });
    if (!isAllowed) {
      res.status(TOO_MANY_REQUESTS_STATUS).json({
        code: ERROR_CODES.TOO_MANY_STARTS,
        message: TOO_MANY_STARTS_MESSAGE,
      });
      return;
    }

    const { gameId, status } = await games.create();

    res.status(CREATED_STATUS)
      .location(`${req.baseUrl}/${gameId}/status`)
      .json({ id: gameId, ...status });
  }).all(answerOtherMethods(WRITE_METHODS));

  router.route('/:gameId/status').get(async (req, res) => {
    const { gameId } = req.params;
    const status = await games.getStatus(gameId);
    if (!status) {
      res.status(NOT_FOUND_STATUS).json({
        code: ERROR_CODES.GAME_NOT_FOUND,
        message: GAME_NOT_FOUND_MESSAGE,
      });
      return;
    }

    res.status(OK_STATUS).json({ id: gameId, ...status });
  }).all(answerOtherMethods(READ_METHODS));

  router.route('/:gameId/play').post(parseJsonBody, async (req, res) => {
    const move = parseMove(req.body);
    if (move.error) {
      res.status(BAD_REQUEST_STATUS).json(move.error);
      return;
    }

    const { gameId } = req.params;
    const result = await games.play({ gameId, move });
    if (!result) {
      res.status(NOT_FOUND_STATUS).json({
        code: ERROR_CODES.GAME_NOT_FOUND,
        message: GAME_NOT_FOUND_MESSAGE,
      });
      return;
    }

    if (result.refusal) {
      res.status(BAD_REQUEST_STATUS).json(result.refusal);
      return;
    }

    res.status(OK_STATUS).json({ id: gameId, ...result.status });
  }).all(answerOtherMethods(WRITE_METHODS));

  return router;
};

module.exports = createGameRouter;
