import { describe, it, expect } from 'vitest';
import { getCellLabel, getColumnLabel } from './labels.js';

describe('getColumnLabel', () => {
  it('names a column, and says when it is full', () => {
    expect(getColumnLabel({ columnIndex: 2, isFull: false })).toBe('Colonne 3');
    expect(getColumnLabel({ columnIndex: 2, isFull: true })).toBe('Colonne 3 pleine');
  });

  it('writes ? for an invalid column', () => {
    expect(getColumnLabel({ columnIndex: undefined, isFull: false })).toBe('Colonne ?');
  });
});

describe('getCellLabel', () => {
  it('numbers the row and the column from 1, then names the color of the token', () => {
    expect(getCellLabel({ rowIndex: 2, columnIndex: 1, token: 'red' }))
      .toBe('Ligne 3, colonne 2 : rouge');
  });

  it('labels the corners of the board', () => {
    expect(getCellLabel({ rowIndex: 0, columnIndex: 0, token: 0 }))
      .toBe('Ligne 1, colonne 1 : vide');
    expect(getCellLabel({ rowIndex: 5, columnIndex: 6, token: 'yellow' }))
      .toBe('Ligne 6, colonne 7 : jaune');
  });

  it('reads a value that is no known player as an empty cell, as the board draws it', () => {
    expect(getCellLabel({ rowIndex: 0, columnIndex: 0, token: 'blue' }))
      .toBe('Ligne 1, colonne 1 : vide');
    expect(getCellLabel({ rowIndex: 0, columnIndex: 0, token: 'toString' }))
      .toBe('Ligne 1, colonne 1 : vide');
    expect(getCellLabel({ rowIndex: 0, columnIndex: 0, token: undefined }))
      .toBe('Ligne 1, colonne 1 : vide');
    expect(getCellLabel({ rowIndex: 0, columnIndex: 0, token: null }))
      .toBe('Ligne 1, colonne 1 : vide');
  });

  it('says that a token of the line that won is a winning token', () => {
    expect(getCellLabel({
      rowIndex: 2, columnIndex: 0, token: 'red', isWinning: true,
    })).toBe('Ligne 3, colonne 1 : rouge, jeton gagnant');
    expect(getCellLabel({
      rowIndex: 5, columnIndex: 6, token: 'yellow', isWinning: true,
    })).toBe('Ligne 6, colonne 7 : jaune, jeton gagnant');
  });

  it.each([
    ['false', false],
    ['missing', undefined],
    ['the string true', 'true'],
    ['1', 1],
  ])('reads a plain token when the winning flag is %s', (_case, isWinning) => {
    expect(getCellLabel({
      rowIndex: 2, columnIndex: 0, token: 'red', isWinning,
    })).toBe('Ligne 3, colonne 1 : rouge');
  });

  it('never calls an empty or unknown cell a winning token', () => {
    expect(getCellLabel({
      rowIndex: 0, columnIndex: 0, token: 0, isWinning: true,
    })).toBe('Ligne 1, colonne 1 : vide');
    expect(getCellLabel({
      rowIndex: 0, columnIndex: 0, token: 'blue', isWinning: true,
    })).toBe('Ligne 1, colonne 1 : vide');
  });

  it('writes ? for a missing or invalid row or column', () => {
    expect(getCellLabel({ token: 'red' })).toBe('Ligne ?, colonne ? : rouge');
    expect(getCellLabel({ token: 'red', isWinning: true }))
      .toBe('Ligne ?, colonne ? : rouge, jeton gagnant');
    expect(getCellLabel({ rowIndex: -1, columnIndex: 1.5, token: 'red' }))
      .toBe('Ligne ?, colonne ? : rouge');
  });
});
