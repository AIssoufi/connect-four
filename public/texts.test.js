import { describe, it, expect } from 'vitest';
import {
  fillText, getColumnLabel, getMoveRefusal, getStatusText,
} from './texts.js';
import { DRAW_TEXT, GAME_OVER_MESSAGE } from './constants.js';

/** A board of 2 rows and 3 columns, top row first, whose first column is full. */
const BOARD = [
  ['red', 0, 0],
  ['yellow', 'red', 0],
];

const GAME = {
  id: 'abc',
  players: ['red', 'yellow'],
  lastPlayerWhoPlayed: 'red',
  winner: 'no winner',
  state: 'playing',
  board: BOARD,
};

describe('fillText', () => {
  it('puts each value in its placeholder', () => {
    const values = { number: 3, color: 'rouge' };

    expect(fillText({ template: 'Colonne {number} : {color}', values })).toBe('Colonne 3 : rouge');
  });

  it('keeps a placeholder that has no value', () => {
    expect(fillText({ template: 'Au tour de {color}.', values: {} })).toBe('Au tour de {color}.');
    expect(fillText({ template: 'Au tour de {color}.', values: { color: undefined } }))
      .toBe('Au tour de {color}.');
    expect(fillText({ template: 'Au tour de {color}.', values: undefined }))
      .toBe('Au tour de {color}.');
    expect(fillText({ template: 'Au tour de {color}.', values: null })).toBe('Au tour de {color}.');
    expect(fillText({ template: '{toString}', values: {} })).toBe('{toString}');
  });

  it('writes 0, and leaves a text without placeholder as it is', () => {
    expect(fillText({ template: 'Colonne {number}', values: { number: 0 } })).toBe('Colonne 0');
    expect(fillText({ template: 'Match nul.', values: { color: 'rouge' } })).toBe('Match nul.');
    expect(fillText({ template: '', values: {} })).toBe('');
  });
});

describe('getStatusText', () => {
  it('says whose turn it is', () => {
    expect(getStatusText(GAME)).toBe('Au tour de jaune.');
    expect(getStatusText({ ...GAME, lastPlayerWhoPlayed: 'nobody' })).toBe('Au tour de rouge.');
  });

  it('says who won', () => {
    expect(getStatusText({ ...GAME, state: 'won', winner: 'red' })).toBe('Rouge a gagné.');
    expect(getStatusText({ ...GAME, state: 'won', winner: 'yellow' })).toBe('Jaune a gagné.');
  });

  it('says that the game is a draw', () => {
    expect(getStatusText({ ...GAME, state: 'draw' })).toBe(DRAW_TEXT);
  });

  it('returns an empty text for a game it cannot describe', () => {
    expect(getStatusText({ ...GAME, state: 'won', winner: 'no winner' })).toBe('');
    expect(getStatusText({ ...GAME, players: ['blue', 'green'] })).toBe('');
    expect(getStatusText({ ...GAME, players: undefined })).toBe('');
    expect(getStatusText({ ...GAME, state: 'paused' })).toBe('');
    expect(getStatusText(undefined)).toBe('');
    expect(getStatusText(null)).toBe('');
  });
});

describe('getColumnLabel', () => {
  it('names a column, and says when it is full', () => {
    expect(getColumnLabel({ columnIndex: 2, isFull: false })).toBe('Colonne 3');
    expect(getColumnLabel({ columnIndex: 2, isFull: true })).toBe('Colonne 3 pleine');
  });

  it('writes ? for an invalid column', () => {
    expect(getColumnLabel({ columnIndex: undefined, isFull: false })).toBe('Colonne ?');
  });
});

describe('getMoveRefusal', () => {
  it('accepts a move in a column with a free cell', () => {
    expect(getMoveRefusal({ game: GAME, columnIndex: 1 })).toBeNull();
  });

  it('refuses a move in a full column', () => {
    expect(getMoveRefusal({ game: GAME, columnIndex: 0 })).toBe('La colonne 1 est pleine.');
  });

  it('refuses any move once the game is over', () => {
    expect(getMoveRefusal({ game: { ...GAME, state: 'won' }, columnIndex: 1 }))
      .toBe(GAME_OVER_MESSAGE);
    expect(getMoveRefusal({ game: { ...GAME, state: 'draw' }, columnIndex: 1 }))
      .toBe(GAME_OVER_MESSAGE);
    expect(getMoveRefusal({ game: undefined, columnIndex: 1 })).toBe(GAME_OVER_MESSAGE);
  });

  it('refuses a move in a column outside the board', () => {
    expect(getMoveRefusal({ game: GAME, columnIndex: 3 })).toBe('La colonne 4 est pleine.');
    expect(getMoveRefusal({ game: GAME, columnIndex: undefined })).toBe('La colonne ? est pleine.');
  });
});
