// Dependencies
const express = require('express');
const Engine = require('../app/engine');
const GameError = require('../app/GameError');
const { parsePlayQuery } = require('./utils');
const { OK_STATUS, BAD_REQUEST_STATUS } = require('./constants');

/**
 * Builds the router of the `/game` routes, which reads and plays one game.
 * @param {object} [params]
 * @param {Engine} [params.engine] - The game to serve. A new game by default.
 * @returns {express.Router} The router, to mount on `/game`.
 */
const createGameRouter = ({ engine = new Engine() } = {}) => {
  const router = express.Router();

  /**
   * @swagger
   *
   * /game/status:
   *   get:
   *     tags:
   *      - game
   *     description: Get the current state of game
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: the current state of game
   *         content:
   *            application/json:
   *              example:
   *                players:
   *                  - red
   *                  - yellow
   *                tokens:
   *                  red: 21
   *                  yellow: 21
   *                lastPlayerWhoPlayed: nobody
   *                winner: no winner
   *                state: playing
   *                board:
   *                  - [ 0, 0, 0, 0, 0, 0, 0]
   *                  - [ 0, 0, 0, 0, 0, 0, 0]
   *                  - [ 0, 0, 0, 0, 0, 0, 0]
   *                  - [ 0, 0, 0, 0, 0, 0, 0]
   *                  - [ 0, 0, 0, 0, 0, 0, 0]
   *                  - [ 0, 0, 0, 0, 0, 0, 0]
   */
  router.get('/status', (req, res) => {
    res.status(OK_STATUS).json(engine.getStatus());
  });

  /**
   * @swagger
   *
   * /game/play:
   *   get:
   *     tags:
   *      - game
   *     description: Drop a token of a player in a column, then get the new state of game
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: playerid
   *         in: query
   *         description: The player ID.
   *         required: true
   *         schema:
   *           type: string
   *           enum: [red, yellow]
   *       - name: column
   *         in: query
   *         description: The column, from 1 (left) to 7 (right).
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 7
   *     responses:
   *       200:
   *         description: the new state of game, with state playing, won or draw
   *       400:
   *         description: the move is refused (invalid query, game over, not your turn,
   *           full column), and the game does not change
   *         content:
   *            application/json:
   *              example:
   *                message: The column 1 is full!
   */
  router.get('/play', (req, res, next) => {
    const move = parsePlayQuery(req.query);
    if (move.error) {
      res.status(BAD_REQUEST_STATUS).json({ message: move.error });
      return;
    }

    try {
      engine.play(move);
    } catch (error) {
      const isBrokenRule = error instanceof GameError;
      if (!isBrokenRule) {
        next(error);
        return;
      }

      res.status(BAD_REQUEST_STATUS).json({ message: error.message });
      return;
    }

    res.status(OK_STATUS).json(engine.getStatus());
  });

  return router;
};

module.exports = createGameRouter;
