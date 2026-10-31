import { describe, it, expect } from 'vitest';
import {
  fillText, getMoveRefusal, getMoveText, getStatusText, getStatusWithMoveText,
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

/** The number of rows and of columns of the board of a real game. */
const ROW_COUNT = 6;
const COLUMN_COUNT = 7;

/** The index of the bottom row of the board of a real game. */
const BOTTOM_ROW_INDEX = ROW_COUNT - 1;

/** `BOARD` before red played its token of the second column. */
const BOARD_BEFORE_LAST_MOVE = [
  ['red', 0, 0],
  ['yellow', 0, 0],
];

/** @returns {Array<Array<number>>} An empty board of the size of a real game. */
const createEmptyBoard = () => Array.from(
  { length: ROW_COUNT },
  () => Array(COLUMN_COUNT).fill(0),
);

/** A game that red won, on a board of the size of a real game. */
const WON_GAME = {
  ...GAME,
  state: 'won',
  winner: 'red',
  board: Array.from({ length: ROW_COUNT }, () => Array(COLUMN_COUNT).fill(0)),
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

  it('says who won and names the winning cells, numbered from 1, top row first', () => {
    const winningCells = [2, 3, 4, 5].map((row) => ({ row, column: 0 }));

    expect(getStatusText({ ...WON_GAME, winningCells }))
      .toBe('Rouge a gagné : ligne 3 colonne 1, ligne 4 colonne 1, ligne 5 colonne 1 et ligne 6 colonne 1.');
  });

  it('names every cell of a line of five', () => {
    const winningCells = [0, 1, 2, 3, 4].map((column) => ({ row: 5, column }));

    expect(getStatusText({ ...WON_GAME, winner: 'yellow', winningCells }))
      .toBe('Jaune a gagné : ligne 6 colonne 1, ligne 6 colonne 2, ligne 6 colonne 3, ligne 6 colonne 4 et ligne 6 colonne 5.');
  });

  it('names only the items of the winning cells that are cells of the board', () => {
    const winningCells = [
      { row: 5, column: 6 }, { row: 6, column: 0 }, { row: 0, column: 7 }, { row: -1, column: 0 },
      { row: 1.5, column: 0 }, { row: '1', column: 0 }, { row: Number.NaN, column: 0 },
      { row: 1 }, null, 'ligne 1', [1, 2],
    ];

    expect(getStatusText({ ...WON_GAME, winningCells }))
      .toBe('Rouge a gagné : ligne 6 colonne 7.');
  });

  it.each([
    ['empty', []],
    ['missing', undefined],
    ['null', null],
    ['not a list', { row: 0, column: 0 }],
    ['a list without cell position', [null, { row: -1, column: 0 }]],
    ['outside the board', [{ row: 6, column: 0 }]],
  ])('says who won without cells when the winning cells are %s', (_case, winningCells) => {
    expect(getStatusText({ ...WON_GAME, winningCells })).toBe('Rouge a gagné.');
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

describe('getMoveText', () => {
  it('names the first move of a game, numbered from 1, top row first', () => {
    const previousBoard = createEmptyBoard();
    const board = createEmptyBoard();
    board[BOTTOM_ROW_INDEX][3] = 'red';

    expect(getMoveText({ previousBoard, board })).toBe('Rouge a joué colonne 4, ligne 6.');
  });

  it('names the color of the new token', () => {
    const previousBoard = [[0, 0, 0], ['yellow', 'red', 0]];
    const board = [['yellow', 0, 0], ['yellow', 'red', 0]];

    expect(getMoveText({ previousBoard, board })).toBe('Jaune a joué colonne 1, ligne 1.');
  });

  it('reaches the corners of the board', () => {
    expect(getMoveText({ previousBoard: [[0, 0], [0, 0]], board: [['red', 0], [0, 0]] }))
      .toBe('Rouge a joué colonne 1, ligne 1.');
    expect(getMoveText({ previousBoard: [[0, 0], [0, 0]], board: [[0, 0], [0, 'yellow']] }))
      .toBe('Jaune a joué colonne 2, ligne 2.');
  });

  it('writes nothing for an unchanged board', () => {
    expect(getMoveText({ previousBoard: BOARD, board: BOARD })).toBe('');
    expect(getMoveText({ previousBoard: createEmptyBoard(), board: createEmptyBoard() })).toBe('');
  });

  it('writes nothing for a new game, which removes the tokens', () => {
    expect(getMoveText({ previousBoard: BOARD, board: [[0, 0, 0], [0, 0, 0]] })).toBe('');
  });

  it('writes nothing when several tokens appeared, as between two games', () => {
    expect(getMoveText({ previousBoard: [[0, 0, 0], [0, 0, 0]], board: BOARD })).toBe('');
  });

  it('writes nothing for a token that took the place of another one', () => {
    const board = [['yellow', 0, 0], ['yellow', 'red', 0]];

    expect(getMoveText({ previousBoard: BOARD, board })).toBe('');
  });

  it.each([
    ['a number', 1],
    ['an unknown player', 'blue'],
    ['an inherited key', 'toString'],
    ['null', null],
    ['undefined', undefined],
  ])('writes nothing when the new value of a cell is %s', (_case, token) => {
    expect(getMoveText({ previousBoard: [[0, 0]], board: [[0, token]] })).toBe('');
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['empty', []],
    ['not a list', 'board'],
    ['a list of empty rows', [[]]],
    ['of uneven rows', [[0, 0], [0]]],
    ['another height', [[0, 0, 0]]],
    ['another width', [[0, 0], [0, 0]]],
  ])('writes nothing when the previous board is %s', (_case, previousBoard) => {
    expect(getMoveText({ previousBoard, board: BOARD })).toBe('');
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['empty', []],
    ['of uneven rows', [['red', 0, 0], [0]]],
  ])('writes nothing when the new board is %s', (_case, board) => {
    expect(getMoveText({ previousBoard: [[0, 0, 0], [0, 0, 0]], board })).toBe('');
  });
});

describe('getStatusWithMoveText', () => {
  /** The board of `GAME` before red played its last token. */
  const previousBoard = BOARD_BEFORE_LAST_MOVE;

  it('names the move, then whose turn it is', () => {
    expect(getStatusWithMoveText({ previousBoard, game: GAME }))
      .toBe('Rouge a joué colonne 2, ligne 2. Au tour de jaune.');
  });

  it('names the move, then who won and with which tokens', () => {
    const game = {
      ...GAME, state: 'won', winner: 'red', winningCells: [{ row: 1, column: 1 }],
    };

    expect(getStatusWithMoveText({ previousBoard, game }))
      .toBe('Rouge a joué colonne 2, ligne 2. Rouge a gagné : ligne 2 colonne 2.');
  });

  it('names the move, then the draw', () => {
    expect(getStatusWithMoveText({ previousBoard, game: { ...GAME, state: 'draw' } }))
      .toBe(`Rouge a joué colonne 2, ligne 2. ${DRAW_TEXT}`);
  });

  it('writes the status alone without a move', () => {
    expect(getStatusWithMoveText({ previousBoard: undefined, game: GAME }))
      .toBe('Au tour de jaune.');
    expect(getStatusWithMoveText({ previousBoard: BOARD, game: GAME })).toBe('Au tour de jaune.');
  });

  it('writes the move alone for a status it cannot describe', () => {
    expect(getStatusWithMoveText({ previousBoard, game: { ...GAME, state: 'paused' } }))
      .toBe('Rouge a joué colonne 2, ligne 2.');
  });

  it('returns an empty text without a game', () => {
    expect(getStatusWithMoveText({ previousBoard, game: undefined })).toBe('');
    expect(getStatusWithMoveText({ previousBoard, game: null })).toBe('');
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
