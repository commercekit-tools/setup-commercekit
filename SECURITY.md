# Security Policy

## Supported versions

Security fixes are provided for the latest compatible v1 Action release once v1
is published. The first supported CommerceKit CLI version is `0.1.0-preview.2`;
older CLI previews are not supported by this Action.

## Reporting a vulnerability

Do not report suspected vulnerabilities in a public issue, pull request, or
discussion.

Email `commercekit.tools@gmail.com` with the subject
`Setup CommerceKit security report`. Include:

- the Action reference and requested or resolved CLI version;
- the runner operating system and architecture;
- whether the failure involved metadata, checksum, extraction, cache, PATH, or
  executable verification;
- a concise description of the issue and impact;
- reproducible steps or a minimal proof of concept; and
- a safe way to contact you for follow-up.

Remove credentials, customer data, proprietary project files, runner secrets,
and unrelated logs. Reports are reviewed privately before coordinated public
disclosure.

## Security properties

The Action downloads public CommerceKit releases over HTTPS, verifies the
manifest and archive with SHA-256, and verifies the extracted executable's exact
version. When no version is supplied, verified latest-stable metadata selects a
version before installation continues from its immutable exact release tag.
Checksum verification is mandatory.

The Action does not use SAP credentials or webhooks. It has no telemetry, does
not inspect or upload project source, and does not access private CommerceKit
repositories. For non-security problems, use the repository issue tracker.
