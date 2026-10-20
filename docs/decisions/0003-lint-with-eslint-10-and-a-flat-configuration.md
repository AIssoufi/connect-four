# 0003. Lint with ESLint 10 and a flat configuration

- Date: 2026-10-20
- Status: Accepted

## Context

The project linted its JavaScript with ESLint 6.8.0, from 2020, and `.eslintrc.yml`, which
extended the Airbnb base rules (eslint-config-airbnb-base 14, with eslint-plugin-import). npm
marks ESLint 6 as deprecated: it is no longer supported. eslint-config-airbnb, the variant for
React, was installed too, but nothing used it.

ESLint 9 made the flat configuration, `eslint.config.js`, the default, and ESLint 10 no longer
reads `.eslintrc` files. The Airbnb configs only exist for `.eslintrc`, and eslint-plugin-import
does not support ESLint 10: its peer range stops at ESLint 9. On the base commit, `npm audit`
found 17 vulnerabilities (2 low, 4 moderate, 11 high), all in ESLint 6 and its dependencies,
which only run in development.

## Decision

For [#15](https://github.com/AIssoufi/connect-four/issues/15), in its first pull request:

- ESLint 10.12.0 and `eslint.config.js` replace ESLint 6 and `.eslintrc.yml`. The configuration
  starts from the recommended rules of `@eslint/js`, then adds every rule of Airbnb base that
  still exists, with the options of Airbnb:
  - the rules of ESLint itself, both the likely bugs and the suggestions;
  - the layout rules, which ESLint deprecated, from `@stylistic/eslint-plugin` 5, their
    maintained copy.
- `globals` gives the browser globals to the page scripts of `public/`, which stay classic
  scripts, and the Node.js globals to every other file.
- eslint-config-airbnb, eslint-config-airbnb-base and eslint-plugin-import are removed.
- Some rules of Airbnb base are left out:
  - the 21 rules of eslint-plugin-import, which does not run on ESLint 10;
  - `global-require`, `no-buffer-constructor`, `no-new-require` and `no-path-concat`, which
    ESLint moved to eslint-plugin-n;
  - `no-return-await`, deprecated with no replacement;
  - `lines-around-directive`, which has nothing to check, since `strict` forbids directives.
- `no-unused-vars` keeps the `caughtErrors: 'none'` of Airbnb base. ESLint 9 changed its default
  to `all`, which would report the two `catch` blocks that ignore their error on purpose.
- The 14 rules that joined the recommended set since ESLint 6, such as
  `no-constant-binary-expression` and `preserve-caught-error`, are on. The code passes them.
- The `engines` field of `package.json` now starts at Node.js 22.13, the oldest release of
  Node.js 22 that ESLint 10 supports, instead of 22.12.
- Only versions published at least 7 days earlier were installed (`npm install --before`), the
  cooldown that Dependabot applies.

## Alternatives considered

- **The recommended rules alone**, as the ticket first proposed: 64 rules instead of 207, so
  about 140 rules that the code follows today would no longer be checked, with every layout rule
  (indentation, quotes, semicolons, line length), and the style could drift without anyone
  seeing it.
- **The layout rules of ESLint itself**: ESLint 10 still ships them, but they have been
  deprecated since ESLint 8.53, and ESLint Stylistic is their successor.
- **eslint-config-airbnb-extended**, a community port of Airbnb to the flat configuration: it
  supports ESLint 9 only, and it depends on typescript-eslint and on the React and Next.js
  plugins, for a project of 38 JavaScript files without React.
- **eslint-plugin-import-x**, to keep the import rules: it needs `@typescript-eslint/utils`. The
  tests and the bundle of Wrangler already fail on an import that does not resolve.
- **Prettier** for the layout: a second tool, which would rewrite the formatting of every file.

## Consequences

| Figure | Before | After |
| --- | --- | --- |
| ESLint | 6.8.0, deprecated | 10.12.0 |
| Active rules on `index.js` | 222 (201 of ESLint, 21 of eslint-plugin-import) | 207 (150 of ESLint, 57 of ESLint Stylistic) |
| Problems found by `npm run lint` | 0 | 0 |
| Vulnerabilities of `npm audit` | 17 (2 low, 4 moderate, 11 high) | 0 |
| Packages that `npm ci` installs | 462 | 301 |
| `npm ci`, warm npm cache | 3.14 s | 2.34 s |
| `npm run lint` | 0.98 s | 0.97 s |

The figures before come from the base commit, `6579e9e`, and the figures after from this
branch, on the same machine, with Node.js 24.22.0 and npm 12.2.0. Each time is the median of 3
runs of `/usr/bin/time -p`, and each `npm ci` started without `node_modules`. The active rules
come from `npx eslint --print-config index.js`.

- The code did not change: ESLint 10 finds no problem in it.
- The lint no longer checks the imports: a path that does not resolve, a dependency missing from
  `package.json` or a cycle. The tests and the bundle of Wrangler still fail on a broken import.
- `npm audit` finds no vulnerability, so the Dependabot pull requests that updated the
  dependencies of ESLint 6 have nothing left to update.
- Linting needs Node.js 22.13 or later.
- Left to do: the move to pnpm, in the second pull request of
  [#15](https://github.com/AIssoufi/connect-four/issues/15).
