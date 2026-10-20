const Engine = require('../app/engine');
const GameError = require('../app/GameError');
const { MOVES_STORAGE_KEY } = require('./constants');

/**
 * One game whose moves are saved in a key-value storage, so that it outlives the Durable Object
 * that holds it: a new instance replays the saved moves. It has no game until `start()` runs.
 */
class StoredGame {
  /**
   * @param {object} params
   * @param {{ get: (key: string) => unknown, put: (key: string, value: unknown) => void }}
   *   params.storage - A synchronous key-value storage, such as `ctx.storage.kv` of a Durable
   *   Object.
   */
  constructor({ storage }) {
    this.storage = storage;
    this.moves = storage.get(MOVES_STORAGE_KEY);
    this.engine = new Engine();
    if (this.isStarted()) {
      this.moves.forEach((move) => this.engine.play(move));
    }
  }

  /**
   * Tells whether the game was started, so that it has a status.
   * @returns {boolean} `true` once `start()` has run.
   */
  isStarted() {
    return Array.isArray(this.moves);
  }

  /**
   * Starts a new game, without any move.
   * @returns {object} The status of the new game, as `Engine.getStatus()` gives it.
   */
  start() {
    this.moves = [];
    this.storage.put(MOVES_STORAGE_KEY, this.moves);
    this.engine = new Engine();

    return this.engine.getStatus();
  }

  /**
   * Gives the status of the game.
   * @returns {object | null} The status, as `Engine.getStatus()` gives it, or `null` when the
   * game was never started.
   */
  getStatus() {
    if (!this.isStarted()) {
      return null;
    }

    return this.engine.getStatus();
  }

  /**
   * Plays a move, then saves it.
   * @param {{ playerId: string, column: number }} move - The move, as `Engine.play()` takes it.
   * @returns {{ status: object } | { refusal: string } | null} The new status, the message of
   * the rule the move breaks (the game does not change then), or `null` when the game was never
   * started.
   * @throws {Error} Any error of the engine that is not a `GameError`.
   */
  play(move) {
    if (!this.isStarted()) {
      return null;
    }

    try {
      this.engine.play(move);
    } catch (error) {
      const isBrokenRule = error instanceof GameError;
      if (!isBrokenRule) {
        throw error;
      }

      return { refusal: error.message };
    }

    this.moves = [...this.moves, { playerId: move.playerId, column: move.column }];
    this.storage.put(MOVES_STORAGE_KEY, this.moves);

    return { status: this.engine.getStatus() };
  }
}

module.exports = StoredGame;
