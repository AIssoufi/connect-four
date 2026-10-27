/**
 * Error thrown when a move breaks a rule of the game, such as a full column or
 * a player who plays out of turn. Its message can be shown to the player, and
 * its code tells a client which rule the move broke.
 */
class GameError extends Error {
  /**
   * @param {object} params
   * @param {string} params.code - The rule that the move broke, one of `ERROR_CODES`.
   * @param {string} params.message - What the player did wrong.
   */
  constructor({ code, message }) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

module.exports = GameError;
