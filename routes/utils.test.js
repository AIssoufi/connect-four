import { describe, it, expect } from 'vitest';
import { parsePlayQuery } from './utils';

const PLAYER_ERROR = { error: 'The playerid must be one of: red, yellow.' };
const COLUMN_ERROR = { error: 'The column must be an integer between 1 and 7.' };

describe('parsePlayQuery', () => {
  it.each([
    [{ playerid: 'red', column: '1' }, { playerId: 'red', column: 1 }],
    [{ playerid: 'yellow', column: '7' }, { playerId: 'yellow', column: 7 }],
    [{ playerid: 'red', column: '04' }, { playerId: 'red', column: 4 }],
  ])('reads %o', (query, move) => {
    expect(parsePlayQuery(query)).toEqual(move);
  });

  it.each([
    ['no query', undefined],
    ['an empty query', {}],
    ['a missing player', { column: '1' }],
    ['an unknown player', { playerid: 'green', column: '1' }],
    ['a player with spaces', { playerid: ' red', column: '1' }],
    ['a repeated player', { playerid: ['red', 'red'], column: '1' }],
  ])('refuses %s', (_case, query) => {
    expect(parsePlayQuery(query)).toEqual(PLAYER_ERROR);
  });

  it.each([
    ['a missing column', undefined],
    ['an empty column', ''],
    ['letters', 'abc'],
    ['digits then letters', '7abc'],
    ['a decimal', '2.5'],
    ['a negative number', '-1'],
    ['spaces', ' 3'],
    ['0', '0'],
    ['8', '8'],
    ['a repeated column', ['1', '2']],
  ])('refuses %s', (_case, column) => {
    expect(parsePlayQuery({ playerid: 'red', column })).toEqual(COLUMN_ERROR);
  });
});
