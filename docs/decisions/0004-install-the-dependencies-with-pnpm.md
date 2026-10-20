# 0004. Install the dependencies with pnpm

- Date: 2026-10-20
- Status: Accepted

## Context

npm installed the dependencies from `package-lock.json`, locally, in the CI and on Workers
Builds. It ran the install script of every dependency that had one, esbuild and workerd here,
and nothing in the repository kept a release younger than 7 days out of the lockfile: the
first pull request of [#15](https://github.com/AIssoufi/connect-four/issues/15) had to pass
`npm install --before` by hand. Its flat `node_modules` also let the code import a package
that `package.json` does not declare.

The package was still named `connector-four`, with no description, and the ticket asked to
rename it.

## Decision

For [#15](https://github.com/AIssoufi/connect-four/issues/15), in its second pull request:

- pnpm 12.14.0 installs the dependencies. The `packageManager` field of `package.json` pins it,
  and any installed pnpm switches to that version by itself.
- `pnpm import` turned `package-lock.json` into `pnpm-lock.yaml`, and `package-lock.json` is
  removed. Every locked version is kept, except three that the release age below moved down,
  since they were published on October 18 and 19, 2026: `@commitlint/ensure` and
  `@commitlint/rules` 21.2.4 to 21.2.3, and `fast-uri` 3.1.9 to 3.1.8.
- `pnpm-workspace.yaml` holds the install policy:
  - `minimumReleaseAge` only installs versions published at least 7 days earlier, the cooldown
    of Dependabot. pnpm itself is left out, since `packageManager` pins it on purpose.
  - `allowBuilds` runs no install script. The scripts of esbuild and workerd only check the
    binary of their optional package for the current platform, which pnpm installs anyway, and
    download it when that package is missing. The tests, `wrangler dev` and
    `wrangler deploy --dry-run` work without them.
- The CI sets pnpm up with `pnpm/action-setup`, which reads `packageManager`, caches the pnpm
  store with `actions/setup-node`, and runs `pnpm install --frozen-lockfile`, `pnpm lint`,
  `pnpm test` and `pnpm exec commitlint`.
- The `commit-msg` hook calls `commitlint` directly, since Husky 9 puts `node_modules/.bin` on
  the `PATH`.
- The Worker is deployed by hand with `pnpm run deploy`, since `pnpm deploy` is a command of
  pnpm itself.
- The package is named `connect-four`, with a one-line description.
- Workers Builds gets the build variable `PNPM_VERSION=12.14.0`: its build image ships pnpm
  10.11.1 by default.

## Alternatives considered

- **Staying on npm**: it can only skip every install script at once (`ignore-scripts`), which
  would also skip the `prepare` script that sets up Husky, and it keeps the flat
  `node_modules`.
- **pnpm 10**, the default of Workers Builds and the last version that Dependabot documents: no
  build variable to set, but two major releases behind, so the move would have to be done
  again.
- **Yarn 4** or **Bun**: they would work too, but the ticket asked for pnpm, which the other
  projects of the owner already use.
- **Allowing the install scripts of esbuild and workerd**: they would only check a binary that
  pnpm already installs, and code from a dependency would run at each install.

## Consequences

| Figure | Before | After |
| --- | --- | --- |
| Package manager | npm 12.2.0 | pnpm 12.14.0 |
| Install, warm cache, no `node_modules` | 2.33 s, `npm ci` | 0.71 s, `pnpm install --frozen-lockfile` |
| Packages installed, as each tool counts them | 301 | 293 |
| Install scripts of dependencies run | 2 (esbuild, workerd) | 0 |
| Lint | 1.02 s, `npm run lint` | 0.82 s, `pnpm lint` |
| Vulnerabilities of the audit | 0, `npm audit` | 0, `pnpm audit` |

The figures before come from the first pull request of #15, commit `aed8397`, and the figures
after from this branch, on the same machine, with Node.js 24.22.0. Each install time is the
median of 3 runs of `/usr/bin/time -p`, alternating both tools, each in an empty folder with
only the manifest and the lockfile. Each lint time is the median of 5 alternating runs. The lint
runs the same tools: only the script runner changes.

- The code cannot import a package that `package.json` does not declare. The tests pass, so no
  file does.
- A release reaches the lockfile 7 days after its publication at the earliest, and
  `pnpm install --frozen-lockfile` refuses a lockfile that holds a younger one. Moving to a new
  pnpm only takes a change of `packageManager`.
- Contributors need pnpm, in any version.
- `PNPM_VERSION` on Workers Builds must follow `packageManager`. The documentation of Workers
  Builds does not say how it picks the package manager that installs the dependencies: the log
  of the first build after the merge must show a pnpm install from `pnpm-lock.yaml`.
- Dependabot reads `pnpm-lock.yaml` under its `npm` ecosystem, but documents pnpm up to version
  10 only. If it puts a release younger than 7 days in the lockfile, such as a transitive
  dependency, the CI refuses its pull request: watch the first one.
- `pnpm/action-setup` is pinned to the commit of v6.1.0, which starts from pnpm 12 and switches
  to the pinned version. Its `v6` tag still points to v6.0.10, which starts from pnpm 11 and logs
  a false warning about a pnpm 10 layout.
