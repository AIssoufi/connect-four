const {
  GAME_ID_PATTERN, GAME_STORE_CHECK_ID, GAME_STORE_CHECK_NAME,
} = require('./constants');

/**
 * @typedef {object} GameStore
 * @property {() => Promise<{ gameId: string, status: object }>} create - Starts a new game.
 * @property {(gameId: string) => Promise<object | null>} getStatus - Gives the status of a
 *   game, or `null` when no game has this id. `GAME_STORE_CHECK_ID` reaches the Durable Object
 *   named `GAME_STORE_CHECK_NAME`, where no game starts, so that the live check meets a real one.
 * @property {(params: { gameId: string, move: object }) => Promise<object | null>} play - Plays
 *   a move in a game. See `StoredGame.play()`; `null` when no game has this id.
 */

/**
 * Builds the store of the games, each held by its own `Game` Durable Object.
 * @param {object} params
 * @param {DurableObjectNamespace} params.namespace - The binding of the `Game` Durable Objects.
 * @returns {GameStore} The store, for `createGameRouter`.
 * @example
 * const games = createGameStore({ namespace: env.GAMES });
 * const { gameId } = await games.create();
 * await games.play({ gameId, move: { playerId: 'red', column: 4 } });
 */
const createGameStore = ({ namespace }) => {
  /**
   * Finds the Durable Object of a game id.
   * @param {unknown} gameId - The id sent by the client.
   * @returns {object | undefined} The stub of the game, or `undefined` for an id that this
   * namespace did not create.
   */
  const findGame = (gameId) => {
    const isWellFormedId = typeof gameId === 'string' && GAME_ID_PATTERN.test(gameId);
    if (!isWellFormedId) {
      return undefined;
    }

    try {
      return namespace.get(namespace.idFromString(gameId));
    } catch (error) {
      // `idFromString` refuses an id that another namespace created.
      return undefined;
    }
  };

  return {
    async create() {
      const id = namespace.newUniqueId();
      const status = await namespace.get(id).start();

      return { gameId: id.toString(), status };
    },

    async getStatus(gameId) {
      const isStoreCheck = gameId === GAME_STORE_CHECK_ID;
      const game = isStoreCheck
        ? namespace.get(namespace.idFromName(GAME_STORE_CHECK_NAME))
        : findGame(gameId);
      if (!game) {
        return null;
      }

      return game.getStatus();
    },

    async play({ gameId, move }) {
      const game = findGame(gameId);
      if (!game) {
        return null;
      }

      return game.play(move);
    },
  };
};

module.exports = createGameStore;
