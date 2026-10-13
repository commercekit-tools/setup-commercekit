# Releasing Setup CommerceKit CLI

Action releases and CommerceKit CLI releases are independent:

- `v1.0.0` identifies an immutable setup Action release.
- `v1` is the moving compatible major Action alias.
- `0.1.0-preview.2` is an exact CLI version that can be supplied through the
  Action input; `latest` or omission selects the latest stable CLI release.

This repository does not publish an npm package.

## Versioning policy

- Exact semantic Action tags such as `v1.0.0` and `v1.0.1` are immutable.
- The `v1` tag may move only to a reviewed, tested, backwards-compatible v1
  release.
- Breaking input, output, integrity, or runner behavior requires a new Action
  major version.
- CLI preview maturity does not change the Action's interface version.

## Release prerequisites

Before creating a release:

1. merge a reviewed pull request to `main`;
2. verify all quality, CodeQL, and six-target native integration jobs on the
   release commit;
3. run `pnpm quality` with the pinned Node and pnpm toolchain;
4. run `pnpm test:integration` against the real public CLI release;
5. confirm `dist/index.js`, `dist/package.json`, and `dist/licenses.txt` match
   source and lockfile state;
6. review the dependency audit and bundled third-party notices;
7. confirm `action.yml`, README examples, inputs, outputs, minimum CLI version,
   and supported runners remain accurate; and
8. confirm the release commit contains no secrets, local paths, archives,
   coverage reports, or private repository content.

Do not create an Action release from an unreviewed branch.

## Initial v1 release

After the implementation pull request is merged and `main` CI passes:

1. create immutable annotated tag `v1.0.0` at the reviewed release commit;
2. create or update annotated tag `v1` to the same commit;
3. push both tags without rewriting the immutable tag;
4. create a GitHub Release for `v1.0.0` with public release notes;
5. verify `commercekit-tools/setup-commercekit@v1` from an independent public
   test repository; and
6. optionally submit the Action to GitHub Marketplace after confirming the
   repository license, metadata, branding, and security guidance.

No tags or Marketplace publication should occur before the implementation is
reviewed and merged.
