const Engine = require('../app/engine');
const GameError = require('../app/GameError');
const { MOVES_STORAGE_KEY, GAME_TTL_MS } = require('./constants');

/**
 * One game whose moves are saved in a key-value storage, so that it outlives the Durable Object
 * that holds it: a new instance replays the saved moves. It has no game until `start()` runs.
 * Its start and each of its moves schedule its deletion `GAME_TTL_MS` later.
 */
class StoredGame {
  /**
   * @param {object} params
   * @param {{ get: (key: string) => unknown, put: (key: string, value: unknown) => void }}
   *   params.storage - A synchronous key-value storage, such as `ctx.storage.kv` of a Durable
   *   Object.
   * @param {(time: number) => Promise<void>} params.scheduleDeletion - Schedules the deletion of
   *   the game at a time in ms since the epoch, in place of the one scheduled before, such as
   *   `ctx.storage.setAlarm` of a Durable Object.
   * @param {() => number} [params.now] - Gives the current time in ms since the epoch. Defaults
   *   to `Date.now`.
   */
  constructor({ storage, scheduleDeletion, now = Date.now }) {
    this.storage = storage;
    this.scheduleDeletion = scheduleDeletion;
    this.now = now;
    this.moves = storage.get(MOVES_STORAGE_KEY);
    // Games saved before red had to play first may start with yellow: they replay with it.
    const isStarted = this.isStarted();
    const firstMove = isStarted ? this.moves[0] : undefined;
    this.engine = new Engine({ firstPlayer: firstMove?.playerId });
    if (isStarted) {
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
   * Moves the deletion of the game to `GAME_TTL_MS` from now.
   * @returns {Promise<void>} Resolves once the deletion is scheduled.
   */
  postponeDeletion() {
    return this.scheduleDeletion(this.now() + GAME_TTL_MS);
  }

  /**
   * Starts a new game, without any move. Its deletion is scheduled first, so that a game whose
   * deletion cannot be scheduled is never saved.
   * @returns {Promise<object>} The status of the new game, as `Engine.getStatus()` gives it.
   */
  async start() {
    await this.postponeDeletion();
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
   * @returns {Promise<{ status: object } | { refusal: string } | null>} The new status, the
   * message of the rule the move breaks (the game and its deletion do not change then), or
   * `null` when the game was never started.
   * @throws {Error} Any error of the engine that is not a `GameError`.
   */
  async play(move) {
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
    await this.postponeDeletion();

    return { status: this.engine.getStatus() };
  }
}

module.exports = StoredGame;
