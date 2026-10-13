## Summary

<!-- Explain the concrete behavior changed by this pull request. -->

## Validation

<!-- List the exact commands and integration targets exercised. -->

## Checklist

- [ ] Exact CLI version input only
- [ ] Minimum CLI version remains `0.1.0-preview.2`
- [ ] No mutable `latest` alias or version range
- [ ] Six target mappings remain covered
- [ ] `release-manifest.json` validation remains mandatory
- [ ] `SHA256SUMS` validates the manifest and archive
- [ ] Extracted executable version is verified
- [ ] Runner tool-cache entries are reverified before reuse
- [ ] PATH and outputs are covered
- [ ] No telemetry or project-source scanning
- [ ] No SAP credentials or private repository dependency
- [ ] Public `0.1.0-preview.2` integration exercised where applicable
- [ ] Native runner coverage is reported accurately
- [ ] `dist` is committed and reproducible
- [ ] Workflow Actions are pinned to immutable commit SHAs
- [ ] Dependency audit is clean or assessed
- [ ] Documentation and security guidance are current
- [ ] No Action release or Marketplace publication is included
