import { describe, it, expect } from 'vitest';
import {
  getBoardKey, getCellClassName, getColumnTabIndex, getNextColumnIndex, getNextPlayer,
  getPlayerColorName, getPositionNumber, isBoardSize, isColumnFull, isDrawableBoard, isGameOver,
  isGameStatus,
} from './utils.js';

const PLAYERS = ['red', 'yellow'];

/** A board of 2 rows and 3 columns, top row first, whose first column is full. */
const BOARD = [
  ['red', 0, 0],
  ['yellow', 'red', 0],
];

const GAME = {
  id: 'abc',
  players: PLAYERS,
  lastPlayerWhoPlayed: 'red',
  winner: 'no winner',
  state: 'playing',
  board: BOARD,
};

describe('getPlayerColorName', () => {
  it('names the color of each player', () => {
    expect(getPlayerColorName('red')).toBe('rouge');
    expect(getPlayerColorName('yellow')).toBe('jaune');
  });

  it('returns null for a value that is no known player', () => {
    expect(getPlayerColorName('blue')).toBeNull();
    expect(getPlayerColorName('')).toBeNull();
    expect(getPlayerColorName('toString')).toBeNull();
    expect(getPlayerColorName(undefined)).toBeNull();
    expect(getPlayerColorName(null)).toBeNull();
    expect(getPlayerColorName(0)).toBeNull();
  });
});

describe('isDrawableBoard', () => {
  it('accepts rows of the same length', () => {
    expect(isDrawableBoard(BOARD)).toBe(true);
    expect(isDrawableBoard([[0]])).toBe(true);
  });

  it('refuses a missing, empty or ragged board', () => {
    expect(isDrawableBoard(undefined)).toBe(false);
    expect(isDrawableBoard(null)).toBe(false);
    expect(isDrawableBoard('board')).toBe(false);
    expect(isDrawableBoard([])).toBe(false);
    expect(isDrawableBoard([[]])).toBe(false);
    expect(isDrawableBoard([[0, 0], [0]])).toBe(false);
    expect(isDrawableBoard([[0, 0], 'row'])).toBe(false);
    expect(isDrawableBoard(['row'])).toBe(false);
  });
});

describe('isBoardSize', () => {
  it('tells whether the drawn board has the size of the board', () => {
    expect(isBoardSize({ board: BOARD, rowCount: 2, columnCount: 3 })).toBe(true);
    expect(isBoardSize({ board: BOARD, rowCount: 1, columnCount: 3 })).toBe(false);
    expect(isBoardSize({ board: BOARD, rowCount: 2, columnCount: 4 })).toBe(false);
  });

  it('refuses a page with nothing drawn yet', () => {
    expect(isBoardSize({ board: BOARD, rowCount: 0, columnCount: 0 })).toBe(false);
    expect(isBoardSize({ board: BOARD, rowCount: 2, columnCount: undefined })).toBe(false);
  });

  it('refuses a board the page cannot draw', () => {
    expect(isBoardSize({ board: [], rowCount: 0, columnCount: 0 })).toBe(false);
    expect(isBoardSize({ board: undefined, rowCount: 0, columnCount: 0 })).toBe(false);
  });
});

describe('isGameStatus', () => {
  it('accepts a game status of the API', () => {
    expect(isGameStatus(GAME)).toBe(true);
  });

  it('refuses an error body, a missing field or another value', () => {
    expect(isGameStatus({ message: 'No game has this id.' })).toBe(false);
    expect(isGameStatus({ ...GAME, id: '' })).toBe(false);
    expect(isGameStatus({ ...GAME, id: 3 })).toBe(false);
    expect(isGameStatus({ ...GAME, players: undefined })).toBe(false);
    expect(isGameStatus({ ...GAME, state: null })).toBe(false);
    expect(isGameStatus({ ...GAME, board: [] })).toBe(false);
    expect(isGameStatus(undefined)).toBe(false);
    expect(isGameStatus(null)).toBe(false);
    expect(isGameStatus('game')).toBe(false);
  });
});

describe('getNextPlayer', () => {
  it('returns the player who did not make the last move', () => {
    expect(getNextPlayer({ players: PLAYERS, lastPlayerWhoPlayed: 'red' })).toBe('yellow');
    expect(getNextPlayer({ players: PLAYERS, lastPlayerWhoPlayed: 'yellow' })).toBe('red');
  });

  it('returns the first player before the first move', () => {
    expect(getNextPlayer({ players: PLAYERS, lastPlayerWhoPlayed: 'nobody' })).toBe('red');
    expect(getNextPlayer({ players: PLAYERS })).toBe('red');
  });

  it('returns null without any other player', () => {
    expect(getNextPlayer({ players: [], lastPlayerWhoPlayed: 'red' })).toBeNull();
    expect(getNextPlayer({ players: ['red'], lastPlayerWhoPlayed: 'red' })).toBeNull();
    expect(getNextPlayer({ players: 'red', lastPlayerWhoPlayed: 'yellow' })).toBeNull();
    expect(getNextPlayer({})).toBeNull();
    expect(getNextPlayer()).toBeNull();
  });
});

describe('isGameOver', () => {
  it('tells a game being played from a won or drawn one', () => {
    expect(isGameOver(GAME)).toBe(false);
    expect(isGameOver({ ...GAME, state: 'won' })).toBe(true);
    expect(isGameOver({ ...GAME, state: 'draw' })).toBe(true);
  });

  it('treats a missing game or an unknown state as over, so that no move is sent', () => {
    expect(isGameOver({ ...GAME, state: 'paused' })).toBe(true);
    expect(isGameOver(undefined)).toBe(true);
    expect(isGameOver(null)).toBe(true);
  });
});

describe('isColumnFull', () => {
  it('tells a full column from one with a free cell', () => {
    expect(isColumnFull({ board: BOARD, columnIndex: 0 })).toBe(true);
    expect(isColumnFull({ board: BOARD, columnIndex: 1 })).toBe(false);
    expect(isColumnFull({ board: BOARD, columnIndex: 2 })).toBe(false);
  });

  it('treats a column outside the board as full, so that no move is sent', () => {
    expect(isColumnFull({ board: BOARD, columnIndex: 3 })).toBe(true);
    expect(isColumnFull({ board: BOARD, columnIndex: -1 })).toBe(true);
    expect(isColumnFull({ board: BOARD, columnIndex: 1.5 })).toBe(true);
    expect(isColumnFull({ board: BOARD, columnIndex: NaN })).toBe(true);
    expect(isColumnFull({ board: BOARD, columnIndex: undefined })).toBe(true);
    expect(isColumnFull({ board: [], columnIndex: 0 })).toBe(true);
    expect(isColumnFull({ board: undefined, columnIndex: 0 })).toBe(true);
  });
});

describe('getPositionNumber', () => {
  it('numbers the rows and the columns from 1', () => {
    expect(getPositionNumber(0)).toBe(1);
    expect(getPositionNumber(6)).toBe(7);
  });

  it('returns ? for an index that is not a natural number', () => {
    expect(getPositionNumber(-1)).toBe('?');
    expect(getPositionNumber(1.5)).toBe('?');
    expect(getPositionNumber(NaN)).toBe('?');
    expect(getPositionNumber('2')).toBe('?');
    expect(getPositionNumber(undefined)).toBe('?');
    expect(getPositionNumber(null)).toBe('?');
  });
});

describe('getCellClassName', () => {
  it('adds the class of the token of a player', () => {
    expect(getCellClassName('red')).toBe('column token red-token');
    expect(getCellClassName('yellow')).toBe('column token yellow-token');
  });

  it('draws an empty cell for an empty or unknown value', () => {
    expect(getCellClassName(0)).toBe('column token');
    expect(getCellClassName('blue')).toBe('column token');
    expect(getCellClassName('toString')).toBe('column token');
    expect(getCellClassName(undefined)).toBe('column token');
    expect(getCellClassName(null)).toBe('column token');
  });
});

describe('getBoardKey', () => {
  it('changes only when a cell changes', () => {
    const sameBoard = BOARD.map((row) => [...row]);
    const nextBoard = [['red', 'yellow', 0], ['yellow', 'red', 0]];

    expect(getBoardKey(sameBoard)).toBe(getBoardKey(BOARD));
    expect(getBoardKey(nextBoard)).not.toBe(getBoardKey(BOARD));
  });

  it('returns an empty key for a missing board', () => {
    expect(getBoardKey(undefined)).toBe('');
  });
});

describe('getNextColumnIndex', () => {
  const columnCount = 7;

  it('moves to the previous and the next column', () => {
    expect(getNextColumnIndex({ key: 'ArrowLeft', currentIndex: 3, columnCount })).toBe(2);
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 3, columnCount })).toBe(4);
  });

  it('wraps around at both ends', () => {
    expect(getNextColumnIndex({ key: 'ArrowLeft', currentIndex: 0, columnCount })).toBe(6);
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 6, columnCount })).toBe(0);
  });

  it('jumps to the first and the last column', () => {
    expect(getNextColumnIndex({ key: 'Home', currentIndex: 4, columnCount })).toBe(0);
    expect(getNextColumnIndex({ key: 'End', currentIndex: 1, columnCount })).toBe(6);
  });

  it('ignores the keys that do not move the focus', () => {
    expect(getNextColumnIndex({ key: 'Enter', currentIndex: 3, columnCount })).toBeNull();
    expect(getNextColumnIndex({ key: 'ArrowUp', currentIndex: 3, columnCount })).toBeNull();
    expect(getNextColumnIndex({ key: undefined, currentIndex: 3, columnCount })).toBeNull();
  });

  it('starts from the first column when the current index is out of range or missing', () => {
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 7, columnCount })).toBe(1);
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: -1, columnCount })).toBe(1);
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 1.5, columnCount })).toBe(1);
    expect(getNextColumnIndex({ key: 'ArrowLeft', currentIndex: undefined, columnCount })).toBe(6);
  });

  it('stays on a single column', () => {
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 0, columnCount: 1 })).toBe(0);
    expect(getNextColumnIndex({ key: 'ArrowLeft', currentIndex: 0, columnCount: 1 })).toBe(0);
  });

  it('returns null when there is no column', () => {
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 0, columnCount: 0 })).toBeNull();
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 0, columnCount: -2 })).toBeNull();
    expect(getNextColumnIndex({ key: 'ArrowRight', currentIndex: 0, columnCount: NaN })).toBeNull();
    expect(getNextColumnIndex({ key: 'Home', currentIndex: 0 })).toBeNull();
  });
});

describe('getColumnTabIndex', () => {
  it('lets the Tab key reach the focused column only', () => {
    expect(getColumnTabIndex({ columnIndex: 0, focusedIndex: 0 })).toBe(0);
    expect(getColumnTabIndex({ columnIndex: 2, focusedIndex: 2 })).toBe(0);
    expect(getColumnTabIndex({ columnIndex: 3, focusedIndex: 2 })).toBe(-1);
  });

  it('skips every column when an index is missing or invalid', () => {
    expect(getColumnTabIndex({ columnIndex: 0 })).toBe(-1);
    expect(getColumnTabIndex({})).toBe(-1);
    expect(getColumnTabIndex({ columnIndex: NaN, focusedIndex: NaN })).toBe(-1);
    expect(getColumnTabIndex({ columnIndex: 0, focusedIndex: NaN })).toBe(-1);
    expect(getColumnTabIndex({ columnIndex: -1, focusedIndex: -1 })).toBe(-1);
    expect(getColumnTabIndex({ columnIndex: 1.5, focusedIndex: 1.5 })).toBe(-1);
  });
});
