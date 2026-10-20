import { DurableObject } from 'cloudflare:workers';
import StoredGame from './StoredGame';

/**
 * Builds the game of a Durable Object from its storage, with its deletion scheduled by the alarm
 * of the instance.
 * @param {DurableObjectState} ctx - The state of the instance, with its storage.
 * @returns {StoredGame} The game, not started when the storage holds none.
 */
const loadGame = (ctx) => new StoredGame({
  storage: ctx.storage.kv,
  scheduleDeletion: (time) => ctx.storage.setAlarm(time),
});

/**
 * The Durable Object that holds one game, keyed by the game id: each visitor plays in their own
 * instance, which runs the moves of its game one at a time and keeps them in its storage.
 * The Worker calls its methods over RPC, through `createGameStore`.
 */
export default class Game extends DurableObject {
  /**
   * @param {DurableObjectState} ctx - The state of the instance, with its storage.
   * @param {object} env - The bindings of the Worker.
   */
  constructor(ctx, env) {
    super(ctx, env);
    this.game = loadGame(ctx);
  }

  /** @returns {Promise<object>} The status of the new game. See `StoredGame.start()`. */
  start() {
    return this.game.start();
  }

  /** @returns {object | null} The status of the game. See `StoredGame.getStatus()`. */
  getStatus() {
    return this.game.getStatus();
  }

  /**
   * @param {{ playerId: string, column: number }} move - The move to play.
   * @returns {Promise<object | null>} The result of the move. See `StoredGame.play()`.
   */
  play(move) {
    return this.game.play(move);
  }

  /**
   * Deletes the game, which then answers as one that was never started.
   * @returns {Promise<void>} Resolves once the storage is empty.
   */
  async deleteGame() {
    await this.ctx.storage.deleteAll();
    this.game = loadGame(this.ctx);
  }

  /**
   * Runs at the time that `StoredGame` scheduled, once the game had no move for `GAME_TTL_MS`,
   * and deletes it. The tests call `deleteGame()` instead, since `alarm` cannot be called over
   * RPC.
   * @returns {Promise<void>} Resolves once the game is deleted.
   */
  alarm() {
    return this.deleteGame();
  }
}
