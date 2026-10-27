import {
  describe, it, expect, beforeEach,
} from 'vitest';
import createGameStore from './createGameStore';
import Engine from '../app/engine';
import { createFakeGameNamespace } from './testDoubles';
import { GAME_ID_LENGTH, GAME_ID_PATTERN } from './constants';

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
