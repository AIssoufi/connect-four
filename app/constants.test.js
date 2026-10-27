import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from './constants';

const OPENAPI_PATH = new URL('../public/api/v1/openapi.yaml', import.meta.url);
/** The first `enum` of a property of `ClientError`, never one of the next schema. */
const CLIENT_ERROR_CODES_PATTERN = /^ {4}ClientError:\n(?:(?! {4}\S).*\n)*? {10}enum:\n((?: {12}- .+\n)+)/m;

/**
 * Reads the codes that the OpenAPI description documents for a refused request.
 * @param {string} spec - The text of `openapi.yaml`.
 * @returns {string[]} The values of the enum, in their order, or `[]` when the enum is missing.
 */
const readDocumentedCodes = (spec) => {
  const [, enumLines = ''] = spec.match(CLIENT_ERROR_CODES_PATTERN) ?? [];

  return enumLines.split('\n').filter(Boolean).map((line) => line.trim().replace(/^- /, ''));
};

describe('ERROR_CODES', () => {
  it('gives each code once, in snake_case', () => {
    const codes = Object.values(ERROR_CODES);

    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((code) => expect(code).toMatch(/^[a-z]+(?:_[a-z]+)*$/));
  });

  it('is the list of codes that openapi.yaml documents', () => {
    const documentedCodes = readDocumentedCodes(readFileSync(OPENAPI_PATH, 'utf8'));

    expect([...documentedCodes].sort()).toEqual(Object.values(ERROR_CODES).sort());
  });

  it('cannot change at run time', () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
  });
});

describe('readDocumentedCodes', () => {
  it('reads nothing from a description without a ClientError', () => {
    expect(readDocumentedCodes('')).toEqual([]);
    expect(readDocumentedCodes('components:\n  schemas:\n    Error:\n')).toEqual([]);
  });

  it('reads no enum of the schema after ClientError', () => {
    const spec = '    ClientError:\n      type: object\n    Other:\n'
      + '      properties:\n        kind:\n          enum:\n            - a\n';

    expect(readDocumentedCodes(spec)).toEqual([]);
  });
});
