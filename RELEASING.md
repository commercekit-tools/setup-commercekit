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

## Reporting consistency

See the
[release compatibility and validation record](docs/reporting-validation.md) for
the released Action reference, main-only reporting features, exact shared
dependency and publication evidence. Package publication and an Action release
are separate decisions. All quality/security checks and six native runner jobs
must pass on the reviewed release commit.

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

## Next compatible v1 release (owner approval required)

The initial `v1.0.0` already exists. Keep that immutable tag and release intact.
Only after the owner separately authorizes an Action release, a reviewed pull
request is merged and the exact main commit passes all prerequisites:

1. select an unused compatible patch version, such as `v1.0.1`;
2. create its immutable annotated tag and GitHub Release at the reviewed commit;
3. verify the exact tag's committed bundle and public release notes;
4. update the compatible `v1` alias under the versioning policy;
5. verify `commercekit-tools/setup-commercekit@v1` from an independent public
   test repository; and
6. consider Marketplace publication only with separate owner authorization and
   after confirming the license, metadata, branding and security guidance.

Normal CI never creates tags, GitHub Releases or Marketplace listings. The
reporting and validation changes do not authorize any of these operations.
