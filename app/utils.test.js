import { describe, it, expect } from 'vitest';
import { isKnownPlayer, isValidColumnNumber } from './utils';

describe('isKnownPlayer', () => {
  it.each(['red', 'yellow'])('accepts %s', (playerId) => {
    expect(isKnownPlayer(playerId)).toBe(true);
  });

  it.each([
    ['another color', 'green'],
    ['capitals', 'Red'],
    ['spaces', ' red'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['an array', ['red']],
  ])('refuses %s', (_case, playerId) => {
    expect(isKnownPlayer(playerId)).toBe(false);
  });
});

describe('isValidColumnNumber', () => {
  it.each([1, 4, 7])('accepts %s', (column) => {
    expect(isValidColumnNumber(column)).toBe(true);
  });

  it.each([
    ['0', 0],
    ['8', 8],
    ['-1', -1],
    ['2.5', 2.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['a numeric string', '3'],
    ['undefined', undefined],
    ['null', null],
  ])('refuses %s', (_case, column) => {
    expect(isValidColumnNumber(column)).toBe(false);
  });
});
