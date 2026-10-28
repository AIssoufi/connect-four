import {
  describe, it, expect, vi,
} from 'vitest';
import {
  parseMove,
  hasNonJsonBody,
  isExposedClientError,
  isParamDecodingError,
  getClientErrorCode,
  isStartAllowed,
} from './utils';

const BODY_ERROR = {
  error: { code: 'invalid_move', message: 'The body must be a JSON object with a playerId and a column.' },
};
const PLAYER_ERROR = {
  error: { code: 'invalid_player', message: 'The playerId must be one of: red, yellow.' },
};
const COLUMN_ERROR = {
  error: { code: 'invalid_column', message: 'The column must be an integer between 1 and 7.' },
};

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

describe('hasNonJsonBody', () => {
  /**
   * Builds a stand-in for an Express request, as `hasNonJsonBody()` reads it.
   * @param {object} params
   * @param {string | false | null} params.typeMatch - What `req.is()` gives: the matched type,
   *   `false` for a body of another type or without one, `null` without a body.
   * @param {string} [params.contentLength] - The `Content-Length` header, none by default.
   * @returns {{ is: () => string | false | null, get: () => string | undefined }} The request.
   */
  const fakeRequest = ({ typeMatch, contentLength }) => ({
    is: (type) => (type === 'application/json' ? typeMatch : false),
    get: (name) => (name === 'Content-Length' ? contentLength : undefined),
  });

  it.each([
    ['a body of another type', { typeMatch: false, contentLength: '29' }],
    ['a chunked body of another type, without a length', { typeMatch: false }],
  ])('is true for %s', (_case, request) => {
    expect(hasNonJsonBody(fakeRequest(request))).toBe(true);
  });

  it.each([
    ['a JSON body', { typeMatch: 'application/json', contentLength: '29' }],
    ['a request without a body', { typeMatch: null }],
    ['an empty body of another type', { typeMatch: false, contentLength: '0' }],
    ['an empty JSON body', { typeMatch: 'application/json', contentLength: '0' }],
  ])('is false for %s', (_case, request) => {
    expect(hasNonJsonBody(fakeRequest(request))).toBe(false);
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

describe('isParamDecodingError', () => {
  /**
   * Gives the error that `decodeURIComponent()` throws for a value, with a status.
   * @param {object} params
   * @param {string} params.value - A value whose percent-encoding cannot be decoded.
   * @param {unknown} params.status - The status to set on the error.
   * @returns {URIError} The error, as the router passes it on when `status` is 400.
   */
  const getDecodingError = ({ value, status }) => {
    try {
      decodeURIComponent(value);
    } catch (error) {
      return Object.assign(error, { status });
    }

    throw new Error(`${value} decodes`);
  };

  it.each([
    ['a truncated UTF-8 sequence', '%E0'],
    ['a lone percent sign', '%'],
    ['a percent sign before a non-hex digit', '%G0'],
  ])('accepts the router error for %s', (_case, value) => {
    expect(isParamDecodingError(getDecodingError({ value, status: 400 }))).toBe(true);
  });

  it.each([
    ['no error', undefined],
    ['null', null],
    ['a URIError without status', new URIError('URI malformed')],
    ['a URIError with another status', getDecodingError({ value: '%E0', status: 500 })],
    ['a URIError with the status as a string', getDecodingError({ value: '%E0', status: '400' })],
    ['another error with status 400', Object.assign(new Error('Bad'), { status: 400 })],
    ['a plain object shaped like it', { name: 'URIError', status: 400 }],
  ])('refuses %s', (_case, error) => {
    expect(isParamDecodingError(error)).toBe(false);
  });
});

describe('getClientErrorCode', () => {
  it.each([
    ['malformed JSON', 'entity.parse.failed', 'invalid_json'],
    ['a too large body', 'entity.too.large', 'body_too_large'],
    ['a compressed body', 'encoding.unsupported', 'unsupported_encoding'],
    ['a charset other than UTF-8', 'charset.unsupported', 'unsupported_charset'],
  ])('gives the code of %s', (_case, type, code) => {
    expect(getClientErrorCode({ expose: true, status: 400, type })).toBe(code);
  });

  it.each([
    ['no error', undefined],
    ['null', null],
    ['an error without type', { expose: true, status: 400 }],
    ['another type of the parser', { expose: true, status: 400, type: 'request.aborted' }],
    ['a type in capitals', { expose: true, status: 400, type: 'ENTITY.PARSE.FAILED' }],
    ['an empty type', { expose: true, status: 400, type: '' }],
    ['a type that is not a string', { expose: true, status: 400, type: 413 }],
    ['a key of Object.prototype', { expose: true, status: 400, type: 'constructor' }],
  ])('gives invalid_request for %s', (_case, error) => {
    expect(getClientErrorCode(error)).toBe('invalid_request');
  });
});

describe('isStartAllowed', () => {
  const CLIENT_IP = '203.0.113.7';

  /**
   * Builds a fake Rate Limiting binding that answers the same verdict to every call.
   * @param {boolean} success - Whether the limit allows the call.
   * @returns {{ limit: Function }} The binding.
   */
  const createLimiter = (success) => ({ limit: vi.fn(async () => ({ success })) });

  it('allows a start that the limit allows, counted by the client network', async () => {
    const limiter = createLimiter(true);

    expect(await isStartAllowed({ limiter, clientIp: CLIENT_IP })).toBe(true);
    expect(limiter.limit).toHaveBeenCalledWith({ key: CLIENT_IP });
  });

  it('counts the start of an IPv6 address by its /64 network', async () => {
    const limiter = createLimiter(true);

    expect(await isStartAllowed({ limiter, clientIp: '2001:db8:0:1::7' })).toBe(true);
    expect(limiter.limit).toHaveBeenCalledWith({ key: '2001:db8:0:1::/64' });
  });

  it('counts the start of a value that is not an address by that value', async () => {
    const limiter = createLimiter(true);

    expect(await isStartAllowed({ limiter, clientIp: ' unknown ' })).toBe(true);
    expect(limiter.limit).toHaveBeenCalledWith({ key: 'unknown' });
  });

  it('refuses a start that the limit refuses', async () => {
    const limiter = createLimiter(false);

    expect(await isStartAllowed({ limiter, clientIp: CLIENT_IP })).toBe(false);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('allows every start without a binding: %s', async (_case, limiter) => {
    expect(await isStartAllowed({ limiter, clientIp: CLIENT_IP })).toBe(true);
  });

  it.each([
    ['no address', undefined],
    ['an empty address', ''],
    ['a list of addresses', [CLIENT_IP]],
  ])('allows a start with %s, without counting it', async (_case, clientIp) => {
    const limiter = createLimiter(false);

    expect(await isStartAllowed({ limiter, clientIp })).toBe(true);
    expect(limiter.limit).not.toHaveBeenCalled();
  });

  it('passes on a failure of the binding', async () => {
    const limitError = new Error('Rate limit unavailable');
    const limiter = { limit: vi.fn(async () => { throw limitError; }) };

    await expect(isStartAllowed({ limiter, clientIp: CLIENT_IP })).rejects.toThrow(limitError);
  });
});
