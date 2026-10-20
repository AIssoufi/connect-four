// Dependencies
const express = require('express');
const { parseMove } = require('./utils');
const {
  OK_STATUS,
  CREATED_STATUS,
  BAD_REQUEST_STATUS,
  NOT_FOUND_STATUS,
  GAME_NOT_FOUND_MESSAGE,
} = require('./constants');

/**
 * Builds the router of the `/game` routes, which start, read and play games by their id.
 * `public/api/v1/openapi.yaml` documents these routes: keep both in step.
 * @param {object} params
 * @param {import('../worker/createGameStore').GameStore} params.games - The games to serve.
 * @returns {express.Router} The router, to mount on `/game`.
 */
const createGameRouter = ({ games }) => {
  const router = express.Router();

  router.post('/', async (req, res) => {
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
