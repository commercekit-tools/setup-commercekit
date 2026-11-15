# Reporting consistency validation

## Scope and provenance

- Inspected setup main: `7f650f3162ab027bfd784cf879832f44d3248584`.
- Feature branch: `feat/consistent-action-reporting`.
- Existing version input and installation/integrity behavior remain unchanged.
- Shared APIs reused: captured input context, bounded redaction, setup event
  factory/schema validation, safe GitHub context and common summary rendering.
- Normal registry baseline: notification-contract **0.0.5**, exact GitHub
  Packages dependency. Registry integrity:
  `sha512-SMcyyWaeHdtlztt99xtWlJycSAspSTGvCaWJH7M2+u+on77JHwo8boTBOc9UUC0BQHDPo/VHmOj4gpt/XIbqmw==`.
- New setup event/reporting helpers require unpublished **0.0.6** from
  action-kit source `b88ed58976af9aee532488d82ea09340b35a4d8c`.
- Exact reviewed tarball: `commercekit-tools-notification-contract-0.0.6.tgz`,
  18852 bytes; SHA256
  `645b38e7456e63b96e7630da7d63c1f6ccbf27854b5b7001ff77db435afa2393`; integrity
  `sha512-eqV2tVnjmuYtG5ExjqScPCGxxR8MW8QlbeuXMA/YjzKzujgSMf9oMQpvQDqmysGhHLN8918XtNh9gbO7UQH4Ug==`.
- Candidate consumer used an exact `file:` tarball dependency only in a private
  temporary workspace. Normal manifests and lockfile contain no local links or
  invented published version. Normal committed bundle remains unchanged.

## Executed checks

Status vocabulary: PASS, FAIL, BLOCKED, NOT RUN.

| Check                                                                    | Status  | Evidence                                                                                                                                                           |
| ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline frozen installation and coverage                                | PASS    | 143 tests/11 files; 93.75% statements, 90% branches, 93.1% functions, 93.92% lines                                                                                 |
| Reviewed candidate frozen installation and full quality                  | PASS    | 154 tests/11 files; 94.06% statements, 90.29% branches, 93.54% functions, 94.21% lines; unchanged thresholds/source inclusion                                      |
| Actual reviewed-candidate bundle integration                             | PASS    | Public CLI preview.2 installed and verified on darwin-arm64; second invocation verified cache reuse; success and invalid-input failure event/summary checks passed |
| Candidate bundle consistency, license notices, scan and production audit | PASS    | Byte consistency; public scan passed; no known vulnerabilities                                                                                                     |
| Action/workflow lint and source formatting                               | PASS    | Local actionlint, Prettier and git diff check                                                                                                                      |
| Normal registry/release readiness                                        | BLOCKED | New event/helpers unavailable in published 0.0.5; requires separately authorized 0.0.6 publication and actual registry repinning/rebuild                           |
| Six native runner integration jobs                                       | NOT RUN | Required on a final registry-backed implementation; local host cannot establish all six targets                                                                    |
| Slack/Teams live delivery                                                | NOT RUN | Notify owns this capability; no provider send performed                                                                                                            |

Commands actually executed in the isolated reviewed candidate: `pnpm install`,
`pnpm install --frozen-lockfile`, `pnpm bundle`, `pnpm quality`,
`pnpm test:integration` and local actionlint. All passed. The generated
candidate bundle SHA256 is
`f3350fba352a9e4370f50808abf0f5ae862250c4621a6511eec05645e72a4ea8`. The
candidate workspace retains a private temporary Git commit of its generated
bundle to exercise the repository's committed-dist consistency check. No
candidate bundle enters normal committed files.

New tests cover complete input/result projection, workflow reference parity,
allowlisted GitHub environment access, safe invalid settings, JWT/URL credential
redaction, bounded truncation, malicious Markdown/HTML, successful cache reuse,
known and unknown failures, and preservation when reporting fails. The bundled
integration exercises the real entry point, verifies two successful invocations
and an invalid-input failure, and checks event outputs plus GitHub summaries in
controlled temporary files. The fixture remains an existing public CLI release;
no SAP operation is involved.

## Remaining gates

Package publication and consumer adoption are separate owner decisions. After
separate authorization, verify the registry artifact/public exports, pin it
exactly, regenerate normal lockfile/bundle/license notices and rerun quality,
public-release integration and all six native runners. Ensure Notify supports
`commercekit.setup.completed` before consuming its event. No OAuth, transport,
provider delivery or replacement event schema is added. No publication, release
tag, deployment, provider send or SAP operation is part of this implementation.
