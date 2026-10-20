/**
 * Error thrown when a move breaks a rule of the game, such as a full column or
 * a player who plays out of turn. Its message can be shown to the player.
 */
class GameError extends Error {
  /**
   * @param {string} message - What the player did wrong.
   */
  constructor(message) {
    super(message);
    this.name = 'GameError';
  }
}

module.exports = GameError;
