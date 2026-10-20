# 0010. Split the page script into ES modules, without a build step

- Date: 2026-10-20
- Status: Accepted

## Context

The page was one classic script, `public/main.js`, which drew the board, called the API and
held its texts. It showed the winner with `alert()` and showed no error
([#14](https://github.com/AIssoufi/connect-four/issues/14)). Its logic had no test, since it
could not be imported.

## Decision

In [#41](https://github.com/AIssoufi/connect-four/pull/41):

- The page loads `public/main.js` as an ES module. It imports its rules from `public/utils.js`,
  its API calls from `public/api.js` and its texts from `public/texts.js`, whose copy sits in
  `public/constants.js`.
- Each helper module has its Vitest tests, next to it. `public/.assetsignore` keeps them out of
  the files that Cloudflare serves, and `index.test.js` checks that the modules are served and
  the tests are not.
- The browser loads the modules as they are: there is still no bundler and no build step.

## Alternatives considered

Not recorded: #41 names no bundler or other option.

## Consequences

| Figure | Before (`a516ece`) | After (`dae2ec5`) |
| --- | --- | --- |
| Files the page loads | 3 | 8 |
| Page weight | 5,369 bytes | 24,936 bytes |
| Tests | 306, in 13 files | 352, in 16 files |

The page weight is the sum of the sizes that `git ls-tree -l` gives for the files the page
loads, uncompressed. The tests before come from `pnpm vitest run` after
`pnpm install --frozen-lockfile` on Node.js 24.22.0, in a copy of the commit made with
`git archive`. The tests after are those that #41 reports at `87965cd`, whose tree is the same
as that of `dae2ec5`.

- The page says whose turn it is, who won, and why a move is refused, with a New game button.
- The browser makes 5 more requests on the first load, one per module and the favicon.
