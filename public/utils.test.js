import { describe, it, expect } from 'vitest';
import {
  getBoardKey, getCellClassName, getColumnLabel, getColumnNumber, getErrorMessage, getMoveRefusal,
  getNextPlayer, getPlayerColorName, getPlayRoute, getStatusText, isBoardSize, isColumnFull,
  isDrawableBoard, isGameOver, isGameStatus, requestGame,
} from './utils.js';
import {
  CONNECTION_ERROR_MESSAGE, DRAW_TEXT, GAME_NOT_FOUND_MESSAGE, GAME_OVER_MESSAGE,
  MOVE_REFUSED_MESSAGE, SERVER_ERROR_MESSAGE, TOO_MANY_STARTS_MESSAGE,
} from './constants.js';

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

/**
 * Builds a fake `fetch` that answers every request with the same response.
 * @param {object} params
 * @param {number} params.status - The HTTP status of the response.
 * @param {() => Promise<unknown>} params.json - Reads the body of the response.
 * @returns {typeof fetch} The fake.
 */
const fakeFetch = ({ status, json }) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json,
});

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

describe('getColumnNumber', () => {
  it('numbers the columns from 1', () => {
    expect(getColumnNumber(0)).toBe(1);
    expect(getColumnNumber(6)).toBe(7);
  });

  it('returns ? for an index that is not a natural number', () => {
    expect(getColumnNumber(-1)).toBe('?');
    expect(getColumnNumber(1.5)).toBe('?');
    expect(getColumnNumber(NaN)).toBe('?');
    expect(getColumnNumber('2')).toBe('?');
    expect(getColumnNumber(undefined)).toBe('?');
    expect(getColumnNumber(null)).toBe('?');
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

describe('getErrorMessage', () => {
  it('explains each error status of the API', () => {
    expect(getErrorMessage(400)).toBe(MOVE_REFUSED_MESSAGE);
    expect(getErrorMessage(404)).toBe(GAME_NOT_FOUND_MESSAGE);
    expect(getErrorMessage(429)).toBe(TOO_MANY_STARTS_MESSAGE);
  });

  it('falls back to the server error message for any other status', () => {
    expect(getErrorMessage(500)).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage(401)).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage(undefined)).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage('toString')).toBe(SERVER_ERROR_MESSAGE);
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

describe('getPlayRoute', () => {
  it('builds the play route of a game', () => {
    expect(getPlayRoute('abc')).toBe('/game/abc/play');
  });

  it('encodes an id that holds a slash or a space', () => {
    expect(getPlayRoute('a/b c')).toBe('/game/a%2Fb%20c/play');
  });
});

describe('requestGame', () => {
  const route = '/game';

  it('returns the game status of a successful response', async () => {
    const fetchGame = fakeFetch({ status: 201, json: async () => GAME });

    expect(await requestGame({ route, fetchGame })).toEqual({ game: GAME });
  });

  it('passes the route and the options to fetch', async () => {
    const calls = [];
    const init = { method: 'POST' };
    const fetchGame = async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => GAME };
    };

    await requestGame({ route, init, fetchGame });

    expect(calls).toEqual([[route, init]]);
  });

  it('explains an error response without reading a game from it', async () => {
    const json = async () => ({ message: 'The column 1 is full!' });

    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 400, json }) }))
      .toEqual({ error: MOVE_REFUSED_MESSAGE });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 404, json }) }))
      .toEqual({ error: GAME_NOT_FOUND_MESSAGE });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 429, json }) }))
      .toEqual({ error: TOO_MANY_STARTS_MESSAGE });
    expect(await requestGame({ route, fetchGame: fakeFetch({ status: 500, json }) }))
      .toEqual({ error: SERVER_ERROR_MESSAGE });
  });

  it('explains a request that does not reach the server', async () => {
    const fetchGame = async () => {
      throw new TypeError('Failed to fetch');
    };

    expect(await requestGame({ route, fetchGame })).toEqual({ error: CONNECTION_ERROR_MESSAGE });
  });

  it('explains a successful response that holds no game status', async () => {
    const invalidJson = async () => {
      throw new SyntaxError('Unexpected token <');
    };

    const bodies = [invalidJson, async () => ({}), async () => null];
    const results = await Promise.all(bodies.map((json) => requestGame({
      route, fetchGame: fakeFetch({ status: 200, json }),
    })));

    expect(results).toEqual(bodies.map(() => ({ error: SERVER_ERROR_MESSAGE })));
  });
});
