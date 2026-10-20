const config = require('./commitlint.config');
const { TICKET_REFERENCE_RULE, RULE_SEVERITIES } = require('./scripts/commit-message/constants');

/**
 * Commitlint configuration of pull request titles: the rules of the commits, but no ticket
 * reference, which a one-line title has no trailer for.
 */
module.exports = {
  ...config,
  rules: {
    ...config.rules,
    [TICKET_REFERENCE_RULE]: [RULE_SEVERITIES.DISABLED],
  },
};
