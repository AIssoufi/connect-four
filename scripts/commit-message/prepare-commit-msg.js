/**
 * Git prepare-commit-msg hook, run by Husky: on a branch named after a ticket, such as `C4-20`,
 * adds `Refs: C4-20` to the trailers of a commit message that has no `Refs:` line yet.
 * Usage: `node scripts/commit-message/prepare-commit-msg.js <message file> [<source>]`.
 */
const { execFileSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const { MERGE_COMMIT_SOURCE } = require('./constants');
const { isTicketReference, readReferences, addReferenceTrailer } = require('./utils');

/**
 * Reads the name of the current branch.
 * @returns {string} The branch name, or an empty string on a detached HEAD, as during a rebase.
 */
const readCurrentBranch = () => {
  try {
    return execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    return '';
  }
};

/**
 * Tells whether the hook should add the reference of the branch to a commit message.
 * @param {object} params
 * @param {unknown} params.message - The commit message.
 * @param {unknown} params.branch - The current branch, empty on a detached HEAD.
 * @param {string} [params.source] - The source of the message that Git gives the hook: `merge`
 *   for a merge commit.
 * @returns {boolean} `true` on a ticket branch, for a commit that is not a merge and whose message
 *   has no `Refs:` line, whatever its value.
 */
const shouldAddReference = ({ message, branch, source }) => {
  const isMergeCommit = source === MERGE_COMMIT_SOURCE;
  const isReferenceMissing = readReferences(message).length === 0;

  return isTicketReference(branch) && !isMergeCommit && isReferenceMissing;
};

/**
 * Adds the reference of the current ticket branch to the commit message file, when it needs one.
 * @param {object} params
 * @param {string} params.messageFile - The path of the commit message file, as Git gives it.
 * @param {string} [params.source] - The source of the message, as Git gives it to the hook.
 */
const prepareCommitMessage = ({ messageFile, source }) => {
  const message = readFileSync(messageFile, 'utf8');
  const branch = readCurrentBranch();

  if (!shouldAddReference({ message, branch, source })) return;

  writeFileSync(messageFile, addReferenceTrailer({ message, reference: branch }));
};

if (require.main === module) {
  const [messageFile, source] = process.argv.slice(2);

  prepareCommitMessage({ messageFile, source });
}

module.exports = { shouldAddReference, prepareCommitMessage };
