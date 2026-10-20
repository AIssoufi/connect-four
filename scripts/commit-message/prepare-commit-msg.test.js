import {
  describe, it, expect, beforeEach, afterEach,
} from 'vitest';
import { execFileSync } from 'child_process';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { shouldAddReference } from './prepare-commit-msg';

const HOOK_SCRIPT = join(__dirname, 'prepare-commit-msg.js');
const CO_AUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>';

// Git runs in the temporary repository alone: no GIT_DIR inherited from a hook, no global config.
const GIT_ENV = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

describe('shouldAddReference', () => {
  it.each([
    ['a message without trailers', 'feat: x\n', undefined],
    ['a message with Co-Authored-By', `feat: x\n\n${CO_AUTHOR}\n`, 'message'],
    ['an empty message from the editor', '\n# Please enter the commit message\n', undefined],
    ['a squash message', 'feat: x\n', 'squash'],
  ])('adds the reference to %s on a ticket branch', (_label, message, source) => {
    expect(shouldAddReference({ message, branch: 'C4-20', source })).toBe(true);
  });

  it.each([
    ['a Refs trailer', 'feat: x\n\nRefs: C4-20\n', 'C4-20'],
    ['a Refs trailer above Co-Authored-By', `feat: x\n\nRefs: C4-20\n${CO_AUTHOR}\n`, 'C4-20'],
    ['an older Refs line above a blank line', `feat: x\n\nRefs: C4-3\n\n${CO_AUTHOR}\n`, 'C4-20'],
    ['the Refs of another ticket', 'feat: x\n\nRefs: C4-3\n', 'C4-20'],
    ['a Refs with a wrong value', 'feat: x\n\nRefs: #20\n', 'C4-20'],
    ['the base branch', 'feat: x\n', 'master'],
    ['a branch that is not a ticket', 'feat: x\n', 'C4-20-fix'],
    ['a detached HEAD', 'feat: x\n', ''],
    ['an unknown branch', 'feat: x\n', undefined],
  ])('adds nothing to a message with %s', (_label, message, branch) => {
    expect(shouldAddReference({ message, branch })).toBe(false);
  });

  it('adds nothing to a merge commit', () => {
    expect(shouldAddReference({ message: 'Merge branch x\n', branch: 'C4-20', source: 'merge' }))
      .toBe(false);
  });
});

describe('prepare-commit-msg hook', () => {
  let repository;
  let messageFile;

  const git = (...args) => execFileSync('git', args, {
    cwd: repository,
    env: GIT_ENV,
    encoding: 'utf8',
  });
  const runHook = (...args) => execFileSync('node', [HOOK_SCRIPT, messageFile, ...args], {
    cwd: repository,
    env: GIT_ENV,
  });

  beforeEach(() => {
    repository = mkdtempSync(join(tmpdir(), 'prepare-commit-msg-'));
    messageFile = join(repository, 'COMMIT_EDITMSG');
    git('init', '--quiet', '--initial-branch', 'C4-7');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.com');
  });

  afterEach(() => {
    rmSync(repository, { recursive: true, force: true });
  });

  it('adds the reference of the branch above Co-Authored-By', () => {
    writeFileSync(messageFile, `feat: x\n\n${CO_AUTHOR}\n`);
    runHook('message');

    expect(readFileSync(messageFile, 'utf8')).toBe(`feat: x\n\nRefs: C4-7\n${CO_AUTHOR}\n`);
  });

  it('leaves an existing reference alone', () => {
    const message = `feat: x\n\nRefs: C4-3\n${CO_AUTHOR}\n`;
    writeFileSync(messageFile, message);
    runHook('message');

    expect(readFileSync(messageFile, 'utf8')).toBe(message);
  });

  it('leaves a merge commit alone', () => {
    writeFileSync(messageFile, 'Merge branch \'master\' into C4-7\n');
    runHook('merge');

    expect(readFileSync(messageFile, 'utf8')).toBe('Merge branch \'master\' into C4-7\n');
  });

  it('leaves the message alone on a branch that is not a ticket', () => {
    git('checkout', '--quiet', '-b', 'master');
    writeFileSync(messageFile, 'feat: x\n');
    runHook();

    expect(readFileSync(messageFile, 'utf8')).toBe('feat: x\n');
  });

  it('leaves the message alone on a detached HEAD, as during a rebase', () => {
    git('commit', '--quiet', '--allow-empty', '--message', 'x');
    git('checkout', '--quiet', '--detach');
    writeFileSync(messageFile, 'feat: x\n');
    runHook('message');

    expect(readFileSync(messageFile, 'utf8')).toBe('feat: x\n');
  });

  it('runs on a commit, through the hook Git calls', () => {
    const hooks = join(repository, 'hooks');
    const hook = join(hooks, 'prepare-commit-msg');
    mkdirSync(hooks);
    writeFileSync(hook, `#!/bin/sh\nnode "${HOOK_SCRIPT}" "$@"\n`, { mode: 0o755 });
    git('config', 'core.hooksPath', hooks);
    git('commit', '--quiet', '--allow-empty', '--message', 'feat: x', '--message', CO_AUTHOR);
    git('commit', '--quiet', '--amend', '--allow-empty', '--no-edit');

    expect(git('log', '-1', '--format=%B')).toBe(`feat: x\n\nRefs: C4-7\n${CO_AUTHOR}\n\n`);
  });
});
