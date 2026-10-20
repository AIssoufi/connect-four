const { PLAYER_IDS } = require('./constants');

const PLAYER_BY_LETTER = { R: PLAYER_IDS.RED, Y: PLAYER_IDS.YELLOW };

/** A full board without any alignment, checked by hand, red first. */
const DRAW_MOVES = 'R6 Y5 R2 Y1 R3 Y5 R1 Y6 R1 Y2 R2 Y2 R2 Y1 R7 Y2 R3 Y4 R4 Y5 R5 '
  + 'Y3 R6 Y4 R5 Y1 R3 Y1 R4 Y6 R3 Y4 R4 Y6 R6 Y3 R5 Y7 R7 Y7 R7 Y7';

/** Four red tokens in column 1, yellow playing column 2 in between: red wins. */
const RED_WINS_MOVES = 'R1 Y2 R1 Y2 R1 Y2 R1';

/**
 * Reads moves written as `R1 Y2`: the player letter, then the column number.
 * @param {string} moves - The moves, separated by spaces.
 * @returns {Array<{ playerId: string, column: number }>} The moves, as `Engine.play()` takes
 * them.
 * @example
 * readMoves('R1 Y2'); // [{ playerId: 'red', column: 1 }, { playerId: 'yellow', column: 2 }]
 */
const readMoves = (moves) => moves.split(' ').map((move) => ({
  playerId: PLAYER_BY_LETTER[move[0]],
  column: Number(move.slice(1)),
}));

module.exports = { DRAW_MOVES, RED_WINS_MOVES, readMoves };
