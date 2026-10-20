const { execFileSync } = require('child_process');
const {
  TICKET_REFERENCE_PATTERN,
  REFERENCE_TRAILER_KEY,
  REFERENCE_LINE_PATTERN,
  TRAILER_SEPARATOR,
  LINE_BREAK_PATTERN,
  SIGN_OFF_TRAILER_KEY,
  DEPENDABOT_SIGN_OFF,
  RELEASE_PLEASE_HEADER_PATTERN,
} = require('./constants');

/**
 * Runs `git interpret-trailers` on a commit message. A `---` line, as in the body of the
 * commits of Dependabot, does not end the message there as it ends a patch e-mail.
 * @param {object} params
 * @param {string} params.message - The commit message, given on the standard input.
 * @param {string[]} params.args - The options of the command.
 * @returns {string} The output of the command.
 */
const interpretTrailers = ({ message, args }) => (
  execFileSync('git', ['interpret-trailers', '--no-divider', ...args], {
    input: message,
    encoding: 'utf8',
  })
);

/**
 * Tells whether a value is a ticket reference of this repository, such as `C4-20`.
 * @param {unknown} value - The value to check, such as a branch name.
 * @returns {boolean} `true` for a ticket reference.
 */
const isTicketReference = (value) => typeof value === 'string' && TICKET_REFERENCE_PATTERN.test(value);

/**
 * Reads the trailers of a commit message as Git does: the last paragraph, when it is made of
 * `Key: value` lines, such as `Refs: C4-20` above `Co-Authored-By: …`.
 * @param {unknown} message - The commit message.
 * @returns {{ key: string, value: string }[]} The trailers, in order; none for a message that is
 *   not a string.
 */
const readTrailers = (message) => {
  if (typeof message !== 'string') return [];

  return interpretTrailers({ message, args: ['--parse'] })
    .split('\n')
    .filter((line) => line.includes(TRAILER_SEPARATOR))
    .map((line) => {
      const separatorIndex = line.indexOf(TRAILER_SEPARATOR);

      return {
        key: line.slice(0, separatorIndex),
        value: line.slice(separatorIndex + TRAILER_SEPARATOR.length).trim(),
      };
    });
};

/**
 * Reads the values of the `Refs:` lines of a commit message. They come from its trailers, or,
 * when the trailers have none, from a `Refs:` line of the body: older commits wrote it above a
 * blank line, out of the trailer block.
 * @param {unknown} message - The commit message.
 * @returns {string[]} The referenced values, such as `['C4-20']`; none for a message that is not
 *   a string.
 */
const readReferences = (message) => {
  const trailerReferences = readTrailers(message)
    .filter(({ key }) => key === REFERENCE_TRAILER_KEY)
    .map(({ value }) => value);

  if (trailerReferences.length > 0) return trailerReferences;
  if (typeof message !== 'string') return [];

  const [, ...linesAfterHeader] = message.split(LINE_BREAK_PATTERN);

  return linesAfterHeader
    .map((line) => line.match(REFERENCE_LINE_PATTERN))
    .filter(Boolean)
    .map(([, value]) => value);
};

/**
 * Tells whether a commit message references a ticket of this repository in a `Refs:` line.
 * @param {unknown} message - The commit message.
 * @returns {boolean} `true` when a `Refs:` line names a ticket, such as `Refs: C4-20`.
 */
const hasTicketReference = (message) => readReferences(message).some(isTicketReference);

/**
 * Tells whether a commit message was written by a bot: a Dependabot commit, signed off by
 * `dependabot[bot]`, or a release commit of release-please.
 * @param {unknown} message - The commit message.
 * @returns {boolean} `true` for the commit of a bot.
 */
const isBotCommit = (message) => {
  if (typeof message !== 'string') return false;

  const [header] = message.split(LINE_BREAK_PATTERN);
  const isReleasePleaseCommit = RELEASE_PLEASE_HEADER_PATTERN.test(header);
  const isDependabotCommit = readTrailers(message).some(({ key, value }) => (
    key === SIGN_OFF_TRAILER_KEY && value.startsWith(DEPENDABOT_SIGN_OFF)
  ));

  return isReleasePleaseCommit || isDependabotCommit;
};

/**
 * Adds a `Refs:` trailer at the start of the trailer block of a commit message, above
 * `Co-Authored-By:` and the other trailers, before the comment lines Git shows in the editor.
 * @param {object} params
 * @param {unknown} params.message - The commit message.
 * @param {string} params.reference - The ticket reference to add, such as `C4-20`.
 * @returns {string} The message with the trailer. An empty message gets a blank first line, for
 *   the header to write above the blank line that separates it from the trailer: Git no longer
 *   aborts a commit left with the trailer alone, so the commit-msg hook of commitlint refuses it.
 *   A value that is not a string counts as an empty message.
 * @example
 * addReferenceTrailer({ message: 'feat: add a hook\n', reference: 'C4-20' });
 * // 'feat: add a hook\n\nRefs: C4-20\n'
 */
const addReferenceTrailer = ({ message, reference }) => {
  const messageWithTrailer = interpretTrailers({
    message: typeof message === 'string' ? message : '',
    args: ['--where', 'start', '--trailer', `${REFERENCE_TRAILER_KEY}${TRAILER_SEPARATOR}${reference}`],
  });
  const isMessageEmpty = messageWithTrailer.startsWith('\n');

  return isMessageEmpty ? `\n${messageWithTrailer}` : messageWithTrailer;
};

module.exports = {
  isTicketReference,
  readTrailers,
  readReferences,
  hasTicketReference,
  isBotCommit,
  addReferenceTrailer,
};
