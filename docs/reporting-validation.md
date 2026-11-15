# Reporting consistency validation

## Published dependency and provenance

The owner-authorized
[package-only publication run 43678067818](https://github.com/commercekit-tools/action-kit/actions/runs/43678067818)
published `@commercekit-tools/notification-contract@0.0.6` from action-kit main
`3fecce40414d709884fa48e48eca278f470b20b0`. Its main CI and CodeQL passed before
publication. Registry version, integrity and required public exports were
verified before this consumer adoption.

- Inspected setup main: `7f650f3162ab027bfd784cf879832f44d3248584`.
- Feature source before registry adoption:
  `5b8f44d20ecefa8196800f9c90ee5ecf79e48a5c`.
- Exact normal dependency: **0.0.6**, installed from GitHub Packages with a
  reproducible registry lockfile and reviewed release-age exception.
- Registry integrity:
  `sha512-n6F84900sDPBeYm5dnf8HLCM9B2DUVATEeF717dqKsSXTJtq1FIj/3hZ2UcNTtXe7v8R90HYF6HIom4auM8Kyw==`.
- Registry shasum: `8030f643d1dd6d741caa2c3c0ba321ad82b30cca`.
- Published artifact SHA256:
  `e4b79576328c2992a96fed087e9ba6e63970e8b54d6fca976a6652702a7a73a9`.
- Regenerated normal bundle SHA256:
  `ccec5024b018a009fada020bb6cebe292160b45cc2ee1224f6e4d957d9c81bae`,
  byte-identical to the final reviewed source-packed candidate.

Normal installation and runtime require no candidate flag, file dependency or
shared-source checkout. Runtime consumers execute the standalone bundle without
registry credentials. Existing version input and installation/integrity behavior
remain unchanged. Shared APIs own captured input context, bounded redaction,
setup event factories/schema validation, safe GitHub context and common
summaries.

## Executed normal registry checks

Status vocabulary: PASS, FAIL, BLOCKED, NOT RUN.

| Check                                        | Status  | Evidence                                                                                                                            |
| -------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Frozen installation and public exports       | PASS    | Exact registry 0.0.6 and required public setup/reporting APIs verified                                                              |
| Formatting, lint and strict types            | PASS    | Normal source passes without candidate switches                                                                                     |
| Unit/integration coverage                    | PASS    | 154 tests/11 files; 94.06% statements, 90.29% branches, 93.54% functions, 94.21% lines; existing thresholds and inclusion unchanged |
| Actual registry-backed bundle integration    | PASS    | Public CLI preview.2 installed/verified on darwin-arm64, verified cache reuse, success and invalid-input failure events/summaries   |
| Normal bundle regeneration                   | PASS    | SHA256 above matches the reviewed candidate exactly                                                                                 |
| Public scan, production audit, workflow lint | PASS    | Scan passed; no known vulnerabilities; local actionlint and diff checks passed                                                      |
| Final committed bundle check                 | NOT RUN | Full quality must pass after the regenerated dist is committed and before push                                                      |
| Six native runner integration jobs           | NOT RUN | Final-head Linux/macOS/Windows x64/ARM64 jobs must pass before merge; earlier baseline-bundle jobs are not feature evidence         |
| Live Slack/Teams delivery                    | NOT RUN | Notify owns this separately authorized capability; no provider send performed                                                       |

Commands actually executed: `pnpm install --frozen-lockfile`, `pnpm bundle`,
public-export assertions, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
`pnpm test:coverage`, `pnpm test:integration`, `pnpm scan:public`,
`pnpm audit --prod --audit-level=high`, actionlint and `git diff --check`. Full
committed-bundle quality and final hosted checks remain required before merge.
The registry-publication compatibility gate is resolved.

Tests cover complete input/result projection, workflow reference parity,
allowlisted GitHub environment access, safe invalid settings, JWT/URL credential
redaction, bounded truncation, malicious Markdown/HTML, cache reuse, known and
unknown failures, and preservation when reporting fails. The bundled integration
executes the actual entry point, checks two successful invocations plus invalid
input failure, and validates events/summaries in controlled temporary files. No
SAP operation is involved.

## Historical candidate evidence

Before publication, source `475cc4db42f79310240496201f90d7047aa54330` was packed
and tested in private consumers. Its artifact integrity matches the published
registry package exactly. The pre-publication procedure and former compatibility
blocker are archived at immutable setup commit
[`5b8f44d20ecefa8196800f9c90ee5ecf79e48a5c`](https://github.com/commercekit-tools/setup-commercekit/tree/5b8f44d20ecefa8196800f9c90ee5ecf79e48a5c).
Those private file dependencies are not part of normal development or CI.

## Remaining release gates

All final-head quality, CodeQL and six native runner jobs must pass before
merge. Compatible Notify must consume the same published contract before
receiving `commercekit.setup.completed`. Action release review, Git
tags/Marketplace publication and live provider validation remain separate owner
decisions. No OAuth, transport, delivery or replacement schema was added. Only
the shared package publication was authorized; no Action release, Git tag,
deployment, provider send or SAP operation is part of this consumer update.
