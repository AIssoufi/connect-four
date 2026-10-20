const {
  REFERENCE_TRAILER_KEY,
  TICKET_KEY,
  TICKET_REFERENCE_RULE,
  RULE_SEVERITIES,
} = require('./scripts/commit-message/constants');
const { hasTicketReference, isBotCommit } = require('./scripts/commit-message/utils');

/** Message of the ticket reference rule, when a commit references no ticket. */
const MISSING_TICKET_REFERENCE_MESSAGE = `the trailers must reference a ticket: ${REFERENCE_TRAILER_KEY}: ${TICKET_KEY}-<n>`;

/**
 * Commitlint configuration: Conventional Commits, and a `Refs: C4-<n>` trailer naming the ticket
 * of each commit. Merge commits, which commitlint ignores by default, and the commits of bots
 * (Dependabot, release-please) are not checked.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [isBotCommit],
  plugins: [
    {
      rules: {
        [TICKET_REFERENCE_RULE]: ({ raw }) => [
          hasTicketReference(raw),
          MISSING_TICKET_REFERENCE_MESSAGE,
        ],
      },
    },
  ],
  rules: {
    [TICKET_REFERENCE_RULE]: [RULE_SEVERITIES.ERROR, 'always'],
  },
};
