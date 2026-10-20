/** Key of the tickets of this repository, which its GitHub autolink turns into issue links. */
const TICKET_KEY = 'C4';

/** A ticket reference, such as `C4-20`: the ticket key, a dash and the issue number. */
const TICKET_REFERENCE_PATTERN = new RegExp(`^${TICKET_KEY}-[1-9]\\d*$`);

/** Key of the trailer that names the ticket of a commit: `Refs: C4-20`. */
const REFERENCE_TRAILER_KEY = 'Refs';

/** A `Refs:` line outside the trailer block, as older commits wrote it above a blank line. */
const REFERENCE_LINE_PATTERN = new RegExp(`^${REFERENCE_TRAILER_KEY}:\\s*(.*?)\\s*$`);

/** Separator between the key and the value of a trailer printed by `git interpret-trailers`. */
const TRAILER_SEPARATOR = ': ';

/** A line break of a commit message, written on Linux, macOS or Windows. */
const LINE_BREAK_PATTERN = /\r?\n/;

/** Key of the trailer that Dependabot signs its commits with. */
const SIGN_OFF_TRAILER_KEY = 'Signed-off-by';

/** Value that starts the sign-off trailer of the commits of Dependabot. */
const DEPENDABOT_SIGN_OFF = 'dependabot[bot]';

/** Header of the release commits of release-please, such as `chore(master): release 1.2.0`. */
const RELEASE_PLEASE_HEADER_PATTERN = /^chore(\([\w./-]+\))?: release \S+$/;

/** Name of the commitlint rule that requires a ticket reference in the trailers of a commit. */
const TICKET_REFERENCE_RULE = 'ticket-reference';

/** Severities of a commitlint rule. */
const RULE_SEVERITIES = Object.freeze({
  DISABLED: 0,
  ERROR: 2,
});

/** Source that Git passes to the prepare-commit-msg hook for a merge commit. */
const MERGE_COMMIT_SOURCE = 'merge';

module.exports = {
  TICKET_KEY,
  TICKET_REFERENCE_PATTERN,
  REFERENCE_TRAILER_KEY,
  REFERENCE_LINE_PATTERN,
  TRAILER_SEPARATOR,
  LINE_BREAK_PATTERN,
  SIGN_OFF_TRAILER_KEY,
  DEPENDABOT_SIGN_OFF,
  RELEASE_PLEASE_HEADER_PATTERN,
  TICKET_REFERENCE_RULE,
  RULE_SEVERITIES,
  MERGE_COMMIT_SOURCE,
};
