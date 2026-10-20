import { describe, it, expect } from 'vitest';
import load from '@commitlint/load';
import lint from '@commitlint/lint';

const CO_AUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>';
const DEPENDABOT_MESSAGE = [
  'build(deps): Bump the minor-and-patch group with 7 updates',
  '',
  'Bumps the minor-and-patch group with 7 updates.',
  '',
  '---',
  'updated-dependencies:',
  '- dependency-name: express',
  '  dependency-version: 4.22.3',
  '...',
  '',
  'Signed-off-by: dependabot[bot] <support@github.com>',
  '',
].join('\n');

/**
 * Lints a commit message with a commitlint configuration file of the repository.
 * @param {object} params
 * @param {string} params.message - The commit message.
 * @param {string} [params.file] - The configuration file, at the root of the repository.
 * @returns {Promise<{ valid: boolean, errors: string[] }>} Whether the message passes, and the
 *   names of the rules it breaks.
 */
const lintMessage = async ({ message, file = 'commitlint.config.js' }) => {
  const config = await load({}, { cwd: __dirname, file });
  const { valid, errors } = await lint(message, config.rules, {
    plugins: config.plugins,
    ignores: config.ignores,
    defaultIgnores: config.defaultIgnores,
    parserOpts: (config.parserPreset || {}).parserOpts,
  });

  return { valid, errors: errors.map(({ name }) => name) };
};

describe('commitlint configuration', () => {
  it.each([
    ['a Refs trailer', 'feat: add a hook\n\nRefs: C4-20\n'],
    ['Refs directly above Co-Authored-By', `feat(ci): add a job\n\nA body.\n\nRefs: C4-20\n${CO_AUTHOR}\n`],
    ['an older Refs above a blank line', `fix: x\n\nRefs: C4-3\n\n${CO_AUTHOR}\n`],
    ['a breaking change', 'feat!: drop Node.js 20\n\nRefs: C4-20\n'],
  ])('accepts a commit with %s', async (_label, message) => {
    expect(await lintMessage({ message })).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ['no reference', `feat: add a hook\n\n${CO_AUTHOR}\n`, ['ticket-reference']],
    ['a wrong key', 'feat: add a hook\n\nRef: C4-20\n', ['ticket-reference']],
    ['an issue number', 'feat: add a hook\n\nRefs: #20\n', ['ticket-reference']],
    ['a header alone', 'feat: add a hook', ['ticket-reference']],
    ['no type', 'add a hook\n\nRefs: C4-20\n', ['subject-empty', 'type-empty']],
    ['an unknown type', 'feature: add a hook\n\nRefs: C4-20\n', ['type-enum']],
    ['a capitalized subject', 'feat: Add a hook\n\nRefs: C4-20\n', ['subject-case']],
  ])('refuses a commit with %s', async (_label, message, errors) => {
    expect(await lintMessage({ message })).toEqual({ valid: false, errors });
  });

  it.each([
    ['a Dependabot commit', DEPENDABOT_MESSAGE],
    ['a release-please commit', 'chore(master): release 1.1.0\n'],
    ['a merge commit of a pull request', 'Merge pull request #22 from AIssoufi/C4-12\n\nci: x\n'],
    ['a merge commit of a branch', 'Merge branch \'master\' into C4-20\n'],
  ])('lets %s pass', async (_label, message) => {
    expect(await lintMessage({ message })).toEqual({ valid: true, errors: [] });
  });
});

describe('commitlint configuration of pull request titles', () => {
  const file = 'commitlint.pr-title.config.js';

  it.each([
    'feat: enforce Conventional Commits with a ticket reference',
    'ci(deps): bump the github-actions group',
  ])('accepts %s', async (message) => {
    expect(await lintMessage({ message, file })).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ['no type', 'Enforce Conventional Commits', ['subject-empty', 'type-empty']],
    ['a capitalized subject', 'feat: Enforce Conventional Commits', ['subject-case']],
    ['a missing subject', 'feat:', ['subject-empty', 'type-empty']],
  ])('refuses a title with %s', async (_label, message, errors) => {
    expect(await lintMessage({ message, file })).toEqual({ valid: false, errors });
  });
});
