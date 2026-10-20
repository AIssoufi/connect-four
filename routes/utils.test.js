import { describe, it, expect } from 'vitest';
import { parseMove, isExposedClientError } from './utils';

const BODY_ERROR = { error: 'The body must be a JSON object with a playerId and a column.' };
const PLAYER_ERROR = { error: 'The playerId must be one of: red, yellow.' };
const COLUMN_ERROR = { error: 'The column must be an integer between 1 and 7.' };

describe('parseMove', () => {
  it.each([
    [{ playerId: 'red', column: 1 }, { playerId: 'red', column: 1 }],
    [{ playerId: 'yellow', column: 7 }, { playerId: 'yellow', column: 7 }],
    [{ playerId: 'red', column: 4, extra: true }, { playerId: 'red', column: 4 }],
  ])('reads %o', (body, move) => {
    expect(parseMove(body)).toEqual(move);
  });

  it.each([
    ['no body', undefined],
    ['null', null],
    ['an array', [{ playerId: 'red', column: 1 }]],
    ['a string', 'red 1'],
    ['a number', 1],
  ])('refuses %s', (_case, body) => {
    expect(parseMove(body)).toEqual(BODY_ERROR);
  });

  it.each([
    ['an empty object', {}],
    ['a missing player', { column: 1 }],
    ['the old playerid field', { playerid: 'red', column: 1 }],
    ['an unknown player', { playerId: 'green', column: 1 }],
    ['a player in capitals', { playerId: 'RED', column: 1 }],
    ['a player with spaces', { playerId: ' red', column: 1 }],
    ['a list of players', { playerId: ['red'], column: 1 }],
    ['a null player', { playerId: null, column: 1 }],
  ])('refuses %s', (_case, body) => {
    expect(parseMove(body)).toEqual(PLAYER_ERROR);
  });

  it.each([
    ['a missing column', undefined],
    ['a null column', null],
    ['a column written as a string', '1'],
    ['a decimal', 2.5],
    ['a negative number', -1],
    ['0, one below the board', 0],
    ['8, one above the board', 8],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['a list of columns', [1]],
    ['a boolean', true],
  ])('refuses %s', (_case, column) => {
    expect(parseMove({ playerId: 'red', column })).toEqual(COLUMN_ERROR);
  });
});

describe('isExposedClientError', () => {
  it.each([
    ['400, the lowest client error', 400],
    ['413, a too large body', 413],
    ['499, the highest client error', 499],
  ])('accepts an exposed error with status %s', (_case, status) => {
    expect(isExposedClientError({ expose: true, status })).toBe(true);
  });

  it.each([
    ['no error', undefined],
    ['null', null],
    ['an error without status', new Error('Unexpected')],
    ['an error that is not exposed', { expose: false, status: 400 }],
    ['an error without expose', { status: 400 }],
    ['399, one below the client errors', { expose: true, status: 399 }],
    ['500, a server error', { expose: true, status: 500 }],
    ['a status written as a string', { expose: true, status: '400x' }],
    ['a client error status written as a string', { expose: true, status: '400' }],
    ['a decimal status', { expose: true, status: 400.5 }],
    ['a NaN status', { expose: true, status: Number.NaN }],
  ])('refuses %s', (_case, error) => {
    expect(isExposedClientError(error)).toBe(false);
  });
});
