import {
  describe, it, expect, beforeEach, vi,
} from 'vitest';
import createGameStore from './createGameStore';
import Engine from '../app/engine';
import { createFakeGameNamespace, createMapStorage } from './testDoubles';
import {
  GAME_ID_LENGTH, GAME_ID_PATTERN, GAME_STORE_CHECK_ID, GAME_STORE_CHECK_NAME,
} from './constants';

const NEW_GAME_STATUS = new Engine().getStatus();
const RED_IN_COLUMN_4 = { playerId: 'red', column: 4 };

describe('createGameStore', () => {
  let namespace;
  let games;

  beforeEach(() => {
    namespace = createFakeGameNamespace();
    games = createGameStore({ namespace });
  });

  it('starts a game in its own Durable Object, and gives its id', async () => {
    const { gameId, status } = await games.create();

    expect(gameId).toMatch(GAME_ID_PATTERN);
    expect(status).toEqual(NEW_GAME_STATUS);
    expect(await games.getStatus(gameId)).toEqual(NEW_GAME_STATUS);
  });

  it('plays a move in the game of the id', async () => {
    const { gameId } = await games.create();

    const result = await games.play({ gameId, move: RED_IN_COLUMN_4 });

    expect(result.status.lastPlayerWhoPlayed).toBe('red');
    expect(await games.getStatus(gameId)).toEqual(result.status);
  });

  it('gives the refusal of a move that breaks a rule', async () => {
    const { gameId } = await games.create();
    await games.play({ gameId, move: RED_IN_COLUMN_4 });

    expect(await games.play({ gameId, move: RED_IN_COLUMN_4 }))
      .toEqual({ refusal: { code: 'not_your_turn', message: "red: it's not your turn!" } });
  });

  it('keeps two games apart', async () => {
    const first = await games.create();
    const second = await games.create();

    await games.play({ gameId: first.gameId, move: RED_IN_COLUMN_4 });

    expect(second.gameId).not.toBe(first.gameId);
    expect(await games.getStatus(second.gameId)).toEqual(NEW_GAME_STATUS);
  });

  it('finds no game for an id that was created but never started', async () => {
    const gameId = namespace.newUniqueId().toString();

    expect(await games.getStatus(gameId)).toBeNull();
    expect(await games.play({ gameId, move: RED_IN_COLUMN_4 })).toBeNull();
  });

  describe('with the id of the live check', () => {
    let puts;

    beforeEach(() => {
      puts = vi.fn();
      namespace = createFakeGameNamespace({
        createStorage: () => ({ ...createMapStorage(), put: puts }),
      });
      vi.spyOn(namespace, 'idFromName');
      vi.spyOn(namespace, 'idFromString');
      games = createGameStore({ namespace });
    });

    it('asks the Durable Object of its name, which has no game, and writes nothing', async () => {
      expect(await games.getStatus(GAME_STORE_CHECK_ID)).toBeNull();
      expect(await games.getStatus(GAME_STORE_CHECK_ID)).toBeNull();

      expect(namespace.idFromName).toHaveBeenCalledWith(GAME_STORE_CHECK_NAME);
      expect(namespace.idFromString).not.toHaveBeenCalled();
      expect(puts).not.toHaveBeenCalled();
    });

    it('plays no move, outside of any Durable Object', async () => {
      expect(await games.play({ gameId: GAME_STORE_CHECK_ID, move: RED_IN_COLUMN_4 })).toBeNull();

      expect(namespace.idFromName).not.toHaveBeenCalled();
      expect(puts).not.toHaveBeenCalled();
    });

    it.each([
      ['an id one digit too long', `${GAME_STORE_CHECK_ID}0`],
      ['an id one digit too short', GAME_STORE_CHECK_ID.slice(1)],
      ['an id with a trailing space', `${GAME_STORE_CHECK_ID} `],
      ['the name of its Durable Object', GAME_STORE_CHECK_NAME],
    ])('does not take %s for it', async (_case, gameId) => {
      expect(await games.getStatus(gameId)).toBeNull();

      expect(namespace.idFromName).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing binding', undefined, TypeError],
      ['a binding without idFromName', {}, TypeError],
      ['a Durable Object that fails', {
        idFromName: () => ({}),
        get: () => ({ getStatus: async () => { throw new Error('Durable Object reset'); } }),
      }, 'Durable Object reset'],
    ])('fails with %s, so that the live check fails', async (_case, brokenNamespace, error) => {
      const brokenGames = createGameStore({ namespace: brokenNamespace });

      await expect(brokenGames.getStatus(GAME_STORE_CHECK_ID)).rejects.toThrow(error);
    });
  });

  it.each([
    ['an id that the namespace did not create', 'f'.repeat(GAME_ID_LENGTH)],
    ['an empty id', ''],
    ['a short id', 'abc'],
    ['an id one digit too long', '0'.repeat(GAME_ID_LENGTH + 1)],
    ['an id one digit too short', '0'.repeat(GAME_ID_LENGTH - 1)],
    ['an id in capitals', 'A'.repeat(GAME_ID_LENGTH)],
    ['an id with a letter after f', 'g'.repeat(GAME_ID_LENGTH)],
    ['an id with a path', `../${'0'.repeat(GAME_ID_LENGTH - '../'.length)}`],
    ['no id', undefined],
    ['a number', 1],
  ])('finds no game for %s', async (_case, gameId) => {
    expect(await games.getStatus(gameId)).toBeNull();
    expect(await games.play({ gameId, move: RED_IN_COLUMN_4 })).toBeNull();
  });
});
