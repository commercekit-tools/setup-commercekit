# Contributing

Thank you for helping improve Setup CommerceKit CLI.

## Prerequisites

- Node.js `24.21.0`, as pinned in `.node-version`
- Corepack
- Git

The repository pins pnpm in `package.json`; do not install or publish this
package through npm.

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Development workflow

Create a focused branch, keep changes scoped, and include tests with behavior
changes. Use synthetic fixtures. Never add credentials, customer data, private
project files, private repository material, or real SAP configuration.

Useful commands:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm bundle
pnpm bundle:check
pnpm audit --prod --audit-level=high
pnpm quality
```

The public release integration downloads CommerceKit CLI `0.1.0-preview.2` into
isolated temporary runner and tool-cache directories:

```bash
pnpm bundle
pnpm test:integration
```

It verifies release metadata, the selected archive, executable version, Action
outputs, and a second-invocation cache hit. It does not install into a system
directory or modify a shell profile. Latest-stable discovery is covered with
synthetic unit fixtures because the current public CLI releases are previews.

## Committed bundle

GitHub executes `dist/index.js` directly. Consumers do not run `pnpm install`,
so every source change affecting runtime behavior must include the regenerated
bundle:

```bash
pnpm bundle
git diff -- dist
```

`pnpm bundle:check` rebuilds the bundle and fails when committed `dist` differs.
Review generated changes and bundled license notices before committing.

## Pull requests

Before pushing, run `pnpm quality` and the real public release integration.
Explain the behavior, security impact, tests, native runner coverage, and any
release implications. Do not create or move Action tags from an unreviewed
branch.
