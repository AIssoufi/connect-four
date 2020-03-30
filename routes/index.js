// Dependencies
const express = require('express');

// Init
const router = express.Router();
const Engine = require('../app/engine');

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
 *                board:
 *                  - [ 0, 0, 0, 0, 0, 0, 0]
 *                  - [ 0, 0, 0, 0, 0, 0, 0]
 *                  - [ 0, 0, 0, 0, 0, 0, 0]
 *                  - [ 0, 0, 0, 0, 0, 0, 0]
 *                  - [ 0, 0, 0, 0, 0, 0, 0]
 *                  - [ 0, 0, 0, 0, 0, 0, 0]
 */
router.get('/status', (req, res) => {
  const status = Engine.getStatus();

  res.status(200).json(status);
});

/**
 * @swagger
 *
 * /game/play:
 *   get:
 *     tags:
 *      - game
 *     description: Get the current state of game
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: playerid
 *         description: The player ID.
 *         required: true
 *         type: string
 *       - name: column
 *         description: The column
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: the current state of game
 */
router.get('/play', (req, res) => {
  const {
    query: {
      playerid,
      column,
    } = {},
  } = req;

  const queryIsValid = Boolean(playerid && column);
  if (!queryIsValid) {
    res.status(400).json({
      message: 'Your query is wrong!',
    });
  }

  try {
    Engine.play(playerid, Number.parseInt(column, 10));
  } catch (error) {
    const { message = 'Unknow error' } = error;
    res.status(400).json({ message });
  }

  const status = Engine.getStatus();

  res.status(200).json(status);
});

module.exports = router;
