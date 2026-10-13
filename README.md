# Setup CommerceKit CLI

Install and verify a requested
[CommerceKit CLI](https://github.com/commercekit-tools/cli) version, or the
latest stable version, on a GitHub Actions runner.

The Action downloads the official standalone CLI directly from an immutable
public release. It validates the release manifest, verifies SHA-256 checksums,
checks the extracted executable version, stores the verified installation in the
runner tool cache, and adds it to `PATH`.

CommerceKit CLI is currently **Preview**. The Action can use a stable v1
interface while installing a Preview CLI because the Action version and CLI
version are independent.

## Usage

After the first v1 Action release, a workflow can install the current CLI
preview and run project checks in a separate step:

```yaml
name: CommerceKit

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Set up CommerceKit CLI
        id: setup-commercekit
        uses: commercekit-tools/setup-commercekit@v1
        with:
          version: '0.1.0-preview.2'

      - name: Check CommerceKit files
        run: |
          commercekit check \
            --changed-from origin/main \
            --format github
```

`setup-commercekit` only installs and verifies the CLI. It does not run
`commercekit check` or inspect the checked-out project. Consumers requiring
maximum Action immutability can replace `@v1` with the full commit SHA for an
audited Action release.

## Action version and CLI version

These versions serve different purposes:

```yaml
- uses: commercekit-tools/setup-commercekit@v1 # Action interface
  with:
    version: '0.1.0-preview.2' # CLI installed by the Action
```

The `version` input is optional. It accepts `latest` or an exact semantic
version. Other aliases and ranges such as `stable`, `preview`, `^0.1.0`, tags
such as `cli-v0.1.0-preview.2`, and URLs are rejected. The first supported CLI
version is `0.1.0-preview.2`.

After a stable CommerceKit CLI release is published, either form selects it:

```yaml
- uses: commercekit-tools/setup-commercekit@v1

- uses: commercekit-tools/setup-commercekit@v1
  with:
    version: latest
```

When `version` is omitted or set to `latest`, the Action resolves GitHub's
latest non-prerelease CommerceKit CLI release, verifies its discovery metadata,
and then installs from that version's immutable `cli-v<version>` tag. It never
treats a preview or release candidate as stable.

CommerceKit currently publishes Preview releases only. Until the first stable
CLI release is available, workflows must supply an exact Preview version such as
`0.1.0-preview.2`; omitting `version` or using `latest` fails with a clear
error.

For an exact valid version that has no matching public release, the Action
fails. It never falls back to another release, Homebrew, or WinGet.

## Inputs

| Input     | Required | Description                                                                      |
| --------- | -------- | -------------------------------------------------------------------------------- |
| `version` | No       | Exact CLI version, or `latest`. Omission also selects the latest stable release. |

## Outputs

| Output      | Meaning                                            | Example                                        |
| ----------- | -------------------------------------------------- | ---------------------------------------------- |
| `version`   | Exact installed CLI version.                       | `0.1.0-preview.2`                              |
| `path`      | Absolute path to the verified executable.          | Runner tool-cache path ending in `commercekit` |
| `target`    | Normalized release target selected for the runner. | `linux-x64`                                    |
| `build-id`  | Verified identity from `release-manifest.json`.    | 40-character source identity                   |
| `cache-hit` | Lowercase string for verified tool-cache reuse.    | `true`                                         |

Outputs are set only after the executable passes integrity and exact-version
verification.

```yaml
- name: Show resolved installation
  env:
    COMMERCEKIT_PATH: ${{ steps.setup-commercekit.outputs.path }}
    COMMERCEKIT_TARGET: ${{ steps.setup-commercekit.outputs.target }}
  run: |
    echo "Installed target: $COMMERCEKIT_TARGET"
    "$COMMERCEKIT_PATH" --version
```

## Supported targets

The published CommerceKit CLI provides these standalone targets:

| Runner OS | x64                       | ARM64                       |
| --------- | ------------------------- | --------------------------- |
| macOS     | Supported (`darwin-x64`)  | Supported (`darwin-arm64`)  |
| Linux     | Supported (`linux-x64`)   | Supported (`linux-arm64`)   |
| Windows   | Supported (`windows-x64`) | Supported (`windows-arm64`) |

The repository CI runs the Action natively on current GitHub-hosted x64 and
ARM64 runners for all six targets. Platform mapping and unsupported-platform
failure behavior are also covered by unit tests.

## Integrity and security model

For every installation, the Action:

1. validates an explicitly requested exact version or `latest` and the runner
   target;
2. when no version is supplied or `latest` is requested, verifies the latest
   stable release metadata and obtains its exact stable semantic version;
3. resolves the immutable `cli-v<version>` release in `commercekit-tools/cli`;
4. downloads `SHA256SUMS` and `release-manifest.json` over HTTPS;
5. verifies the manifest against its `SHA256SUMS` entry;
6. validates manifest schema 1, version, target, filename, size, build ID, and
   checksum fields;
7. cross-checks the archive checksum in the manifest and `SHA256SUMS`;
8. downloads and hashes the target archive before extraction;
9. discovers only the expected `commercekit` or `commercekit.exe` file;
10. executes that file with `--version` without a shell and requires exact
    version equality; and
11. reverifies cached installations before reuse.

SHA-256 detects corruption and mismatches against the public release metadata.
It is not code signing and does not independently prove publisher identity. The
current Preview CLI binaries are unsigned.

The Action restricts downloads to HTTPS release URLs in the public
`commercekit-tools/cli` repository. Latest-stable URLs are used only to discover
and verify a stable version; installation uses its exact immutable release tag.
Metadata cannot provide another download origin or filesystem path. Checksum
verification cannot be disabled.

## Tool cache

Verified installations are cached by exact CLI version and normalized target. A
repeated invocation in the same job normally returns `cache-hit: 'true'`.
Self-hosted runners may also reuse their persistent tool cache.

Before a cache hit is accepted, the Action validates its metadata, locates the
expected regular executable, and reruns `commercekit --version`. A missing,
corrupt, or wrong-version cache entry causes a clear failure; the Action does
not recursively delete runner cache directories.

## Privacy and dependencies

The Action has no telemetry and makes no callbacks to `commercekit.tools`. It
does not read, enumerate, modify, or upload project source. It does not require
or use SAP credentials, webhooks, GitHub API tokens, or private repositories.
The only installed-binary command it runs is `commercekit --version`.

The Action downloads the official standalone CommerceKit release directly. The
installed CLI does not require Homebrew, WinGet, Node.js, Bun, or pnpm. Node.js
is used only by the GitHub Actions runtime that executes the setup logic.

## Troubleshooting

### Unsupported version

Use `latest` or an exact semantic version at or above `0.1.0-preview.2`. Remove
unsupported aliases, prefixes, ranges, URLs, and surrounding whitespace.

### Latest stable release unavailable

Supply an exact supported CLI version. Omission and `latest` use GitHub's latest
non-prerelease release and fail while CommerceKit has only Preview releases or
when stable release metadata is unavailable.

### Release or target not found

Confirm that the exact `cli-v<version>` public release exists and includes the
runner's OS and architecture. The Action does not use emulation or substitute
another target.

### Checksum mismatch

The Action stops before extraction. Retry only after confirming the immutable
public release metadata and asset are available and consistent. Verification
cannot be bypassed.

### Corrupted tool cache

Remove the specific CommerceKit version and target entry from a self-hosted
runner's tool cache, then retry. Do not delete the entire runner tool cache.
GitHub-hosted jobs start with a fresh runner.

### Executable missing or version verification failed

Confirm that the release publishes the expected archive layout and exact
version. Upgrade the Action if the release-manifest schema or packaging contract
changed.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for local validation and public release
integration instructions. Action releases follow [RELEASING.md](RELEASING.md).
Security reports follow [SECURITY.md](SECURITY.md).

## License

This repository is available under the [MIT License](LICENSE). Bundled
dependency notices are recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `dist/licenses.txt`.
