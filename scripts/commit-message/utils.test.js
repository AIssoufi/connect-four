import { describe, it, expect } from 'vitest';
import {
  isTicketReference,
  readTrailers,
  readReferences,
  hasTicketReference,
  isBotCommit,
  addReferenceTrailer,
} from './utils';

const CO_AUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>';
const DEPENDABOT_MESSAGE = [
  'build(deps): Bump express from 4.17.1 to 4.17.3',
  '',
  'Bumps express.',
  '',
  '---',
  'updated-dependencies:',
  '- dependency-name: express',
  '...',
  '',
  'Signed-off-by: dependabot[bot] <support@github.com>',
  '',
].join('\n');

describe('isTicketReference', () => {
  it.each(['C4-1', 'C4-20', 'C4-1234'])('accepts %s', (value) => {
    expect(isTicketReference(value)).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['another key', 'ISF-20'],
    ['a lower-case key', 'c4-20'],
    ['a missing number', 'C4-'],
    ['a number 0', 'C4-0'],
    ['a leading zero', 'C4-020'],
    ['a suffix', 'C4-20-fix'],
    ['an issue number alone', '#20'],
    ['the base branch', 'master'],
    ['undefined', undefined],
    ['null', null],
    ['a number', 20],
  ])('refuses %s', (_label, value) => {
    expect(isTicketReference(value)).toBe(false);
  });
});

describe('readTrailers', () => {
  it('reads Refs directly above Co-Authored-By as trailers', () => {
    const message = `feat: add a hook\n\nA body.\n\nRefs: C4-20\n${CO_AUTHOR}\n`;

    expect(readTrailers(message)).toEqual([
      { key: 'Refs', value: 'C4-20' },
      { key: 'Co-Authored-By', value: 'Claude <noreply@anthropic.com>' },
    ]);
  });

  it('reads only the last paragraph', () => {
    const message = `feat: add a hook\n\nRefs: C4-20\n\n${CO_AUTHOR}\n`;

    expect(readTrailers(message)).toEqual([
      { key: 'Co-Authored-By', value: 'Claude <noreply@anthropic.com>' },
    ]);
  });

  it('reads the trailers below a --- line', () => {
    expect(readTrailers(DEPENDABOT_MESSAGE)).toEqual([
      { key: 'Signed-off-by', value: 'dependabot[bot] <support@github.com>' },
    ]);
  });

  it('ignores the comment lines', () => {
    expect(readTrailers('feat: add a hook\n\nRefs: C4-20\n# Refs: C4-21\n')).toEqual([
      { key: 'Refs', value: 'C4-20' },
    ]);
  });

  it.each([
    ['a message without trailers', 'feat: add a hook\n\nA body.\n'],
    ['a header alone', 'Refs: C4-20'],
    ['an empty message', ''],
    ['undefined', undefined],
    ['null', null],
    ['a number', 20],
  ])('reads no trailer in %s', (_label, message) => {
    expect(readTrailers(message)).toEqual([]);
  });
});

describe('readReferences', () => {
  it('reads every Refs trailer', () => {
    expect(readReferences('feat: x\n\nRefs: C4-1\nRefs: C4-2\n')).toEqual(['C4-1', 'C4-2']);
  });

  it('reads a Refs line followed by a blank line, as older commits wrote it', () => {
    expect(readReferences(`feat: x\n\nRefs: C4-3\n\n${CO_AUTHOR}\n`)).toEqual(['C4-3']);
  });

  it('reads a Refs line with a wrong value', () => {
    expect(readReferences('feat: x\n\nRefs: #3\n')).toEqual(['#3']);
  });

  it('does not read the header as a reference', () => {
    expect(readReferences('Refs: C4-3\n')).toEqual([]);
  });

  it.each([
    ['a message without Refs', `feat: x\n\n${CO_AUTHOR}\n`],
    ['a Refs in the middle of a line', 'feat: x\n\nSee Refs: C4-3.\n'],
    ['an empty message', ''],
    ['undefined', undefined],
    ['an object', {}],
  ])('reads no reference in %s', (_label, message) => {
    expect(readReferences(message)).toEqual([]);
  });
});

describe('hasTicketReference', () => {
  it.each([
    ['a trailer', 'feat: x\n\nRefs: C4-20\n'],
    ['a trailer above Co-Authored-By', `feat: x\n\nRefs: C4-20\n${CO_AUTHOR}\n`],
    ['a line above a blank line', `feat: x\n\nRefs: C4-20\n\n${CO_AUTHOR}\n`],
    ['Windows line endings', 'feat: x\r\n\r\nRefs: C4-20\r\n\r\nA trailing paragraph.\r\n'],
  ])('accepts %s', (_label, message) => {
    expect(hasTicketReference(message)).toBe(true);
  });

  it.each([
    ['no reference', `feat: x\n\n${CO_AUTHOR}\n`],
    ['a wrong key', 'feat: x\n\nRef: C4-20\n'],
    ['another trailer key', 'feat: x\n\nCloses: C4-20\n'],
    ['a lower-case key', 'feat: x\n\nrefs: C4-20\n'],
    ['an issue number', 'feat: x\n\nRefs: #20\n'],
    ['another ticket key', 'feat: x\n\nRefs: ISF-20\n'],
    ['an empty value', 'feat: x\n\nRefs:\n'],
    ['an empty message', ''],
    ['undefined', undefined],
  ])('refuses %s', (_label, message) => {
    expect(hasTicketReference(message)).toBe(false);
  });
});

describe('isBotCommit', () => {
  it.each([
    ['a Dependabot commit', DEPENDABOT_MESSAGE],
    ['a release-please commit', 'chore(master): release 1.2.0\n'],
    ['a release-please commit without scope', 'chore: release 1.2.0'],
  ])('recognizes %s', (_label, message) => {
    expect(isBotCommit(message)).toBe(true);
  });

  it.each([
    ['a commit of a person', 'feat: x\n\nRefs: C4-20\n'],
    ['a sign-off of a person', 'feat: x\n\nSigned-off-by: Someone <someone@example.com>\n'],
    ['a Dependabot sign-off out of the trailers', 'feat: x\n\nSigned-off-by: dependabot[bot]\n\nEnd.\n'],
    ['a release in the body only', 'feat: x\n\nchore(master): release 1.2.0\n'],
    ['a release header with more words', 'chore: release the lock of the board'],
    ['an empty message', ''],
    ['undefined', undefined],
    ['a number', 1],
  ])('does not recognize %s', (_label, message) => {
    expect(isBotCommit(message)).toBe(false);
  });
});

describe('addReferenceTrailer', () => {
  it('adds the trailer below the header', () => {
    expect(addReferenceTrailer({ message: 'feat: x\n', reference: 'C4-20' }))
      .toBe('feat: x\n\nRefs: C4-20\n');
  });

  it('adds the trailer above Co-Authored-By, in the same paragraph', () => {
    expect(addReferenceTrailer({ message: `feat: x\n\nA body.\n\n${CO_AUTHOR}\n`, reference: 'C4-20' }))
      .toBe(`feat: x\n\nA body.\n\nRefs: C4-20\n${CO_AUTHOR}\n`);
  });

  it('adds the trailer above the comment lines', () => {
    expect(addReferenceTrailer({ message: 'feat: x\n# On branch C4-20\n', reference: 'C4-20' }))
      .toBe('feat: x\n\nRefs: C4-20\n# On branch C4-20\n');
  });

  it('leaves a blank line for the header of an empty message', () => {
    expect(addReferenceTrailer({ message: '\n# Please enter the commit message\n', reference: 'C4-20' }))
      .toBe('\n\nRefs: C4-20\n# Please enter the commit message\n');
  });

  it.each([
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
  ])('treats %s as an empty message', (_label, message) => {
    expect(addReferenceTrailer({ message, reference: 'C4-20' })).toBe('\n\nRefs: C4-20\n');
  });
});
