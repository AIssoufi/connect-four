import StoredGame from './StoredGame';
import { GAME_ID_LENGTH } from './constants';

/**
 * Builds an in-memory key-value storage with the synchronous `get` and `put` of
 * `ctx.storage.kv`. Like the storage of a Durable Object, it keeps a copy of each value.
 * @returns {{ get: (key: string) => unknown, put: (key: string, value: unknown) => void }} The
 * storage, empty.
 */
export const createMapStorage = () => {
  const values = new Map();

  return {
    get: (key) => values.get(key),
    put: (key, value) => {
      values.set(key, JSON.parse(JSON.stringify(value)));
    },
  };
};

/**
 * Builds a stand-in for the `GAMES` Durable Object namespace, for the tests that run in
 * Node.js: each id it creates gets its own `StoredGame`, whose methods answer promises as the
 * RPC stubs do, and which is never deleted. Like the real namespace, `idFromString` refuses an
 * id it did not create, and `idFromName` gives the same instance for the same name.
 * @param {object} [params]
 * @param {() => object} [params.createStorage] - Builds the storage of each instance, such as
 *   one that records its writes. `createMapStorage` by default.
 * @returns {{ newUniqueId: Function, idFromName: Function, idFromString: Function, get: Function }}
 * The namespace.
 */
export const createFakeGameNamespace = ({ createStorage = createMapStorage } = {}) => {
  const gamesById = new Map();
  let uniqueIdCount = 0;
  const toId = (gameId) => ({ toString: () => gameId });
  const keepGame = async () => {};
  const addGame = (gameId) => {
    gamesById.set(gameId, new StoredGame({
      storage: createStorage(),
      scheduleDeletion: keepGame,
    }));
  };

  return {
    newUniqueId() {
      uniqueIdCount += 1;
      const gameId = uniqueIdCount.toString(16).padStart(GAME_ID_LENGTH, '0');
      addGame(gameId);

      return toId(gameId);
    },
    idFromName(name) {
      // A prefix that no id of `newUniqueId` has, so that a name never meets a game.
      const gameId = `name:${name}`;
      const isNew = !gamesById.has(gameId);
      if (isNew) {
        addGame(gameId);
      }

      return toId(gameId);
    },
    idFromString(gameId) {
      const isCreatedHere = gamesById.has(gameId);
      if (!isCreatedHere) {
        throw new TypeError('Invalid Durable Object ID: not created by this namespace.');
      }

      return toId(gameId);
    },
    get(id) {
      const game = gamesById.get(id.toString());

      return {
        start: async () => game.start(),
        getStatus: async () => game.getStatus(),
        play: async (move) => game.play(move),
      };
    },
  };
};
