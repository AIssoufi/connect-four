// Dependencies
const express = require('express');
const { parseMove, isStartAllowed } = require('./utils');
const {
  OK_STATUS,
  CREATED_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  GAME_NOT_FOUND_MESSAGE,
  TOO_MANY_STARTS_MESSAGE,
  CLIENT_IP_HEADER,
} = require('./constants');

/**
 * Builds the router of the `/game` routes, which start, read and play games by their id.
 * `public/api/v1/openapi.yaml` documents these routes: keep both in step.
 * @param {object} params
 * @param {import('../worker/createGameStore').GameStore} params.games - The games to serve.
 * @param {object} [params.startLimiter] - The Rate Limiting binding that limits the games each
 *   visitor starts. See `isStartAllowed()`.
 * @returns {express.Router} The router, to mount on `/game`.
 */
const createGameRouter = ({ games, startLimiter }) => {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const isAllowed = await isStartAllowed({
      limiter: startLimiter,
      clientIp: req.get(CLIENT_IP_HEADER),
    });
    if (!isAllowed) {
      res.status(TOO_MANY_REQUESTS_STATUS).json({ message: TOO_MANY_STARTS_MESSAGE });
      return;
    }

    const { gameId, status } = await games.create();

    res.status(CREATED_STATUS)
      .location(`${req.baseUrl}/${gameId}/status`)
      .json({ id: gameId, ...status });
  });

  router.get('/:gameId/status', async (req, res) => {
    const { gameId } = req.params;
    const status = await games.getStatus(gameId);
    if (!status) {
      res.status(NOT_FOUND_STATUS).json({ message: GAME_NOT_FOUND_MESSAGE });
      return;
    }

    res.status(OK_STATUS).json({ id: gameId, ...status });
  });

  router.post('/:gameId/play', express.json(), async (req, res) => {
    const move = parseMove(req.body);
    if (move.error) {
      res.status(BAD_REQUEST_STATUS).json({ message: move.error });
      return;
    }

    const { gameId } = req.params;
    const result = await games.play({ gameId, move });
    if (!result) {
      res.status(NOT_FOUND_STATUS).json({ message: GAME_NOT_FOUND_MESSAGE });
      return;
    }

    if (result.refusal) {
      res.status(BAD_REQUEST_STATUS).json({ message: result.refusal });
      return;
    }

    res.status(OK_STATUS).json({ id: gameId, ...result.status });
  });

  return router;
};

module.exports = createGameRouter;
