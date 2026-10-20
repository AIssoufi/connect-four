import { DurableObject } from 'cloudflare:workers';
import StoredGame from './StoredGame';

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
    this.game = new StoredGame({ storage: ctx.storage.kv });
  }

  /** @returns {object} The status of the new game. See `StoredGame.start()`. */
  start() {
    return this.game.start();
  }

  /** @returns {object | null} The status of the game. See `StoredGame.getStatus()`. */
  getStatus() {
    return this.game.getStatus();
  }

  /**
   * @param {{ playerId: string, column: number }} move - The move to play.
   * @returns {object | null} The result of the move. See `StoredGame.play()`.
   */
  play(move) {
    return this.game.play(move);
  }
}
