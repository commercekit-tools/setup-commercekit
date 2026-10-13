import { describe, expect, it } from 'vitest';

import { findManifestArtifact, parseReleaseManifest } from '../src/manifest.js';
import {
  manifestArtifact,
  manifestFixture,
  syntheticBuildId,
  syntheticSha256,
} from './fixtures/release-manifest.js';

function parse(fixture: Record<string, unknown>) {
  return parseReleaseManifest(JSON.stringify(fixture), '0.1.0-preview.2');
}

describe('parseReleaseManifest', () => {
  it('parses a valid schema 1 manifest', () => {
    const manifest = parse(manifestFixture());
    expect(manifest.buildId).toBe(syntheticBuildId);
    expect(manifest.artifacts[0]).toMatchObject({
      target: 'linux-x64',
      sha256: syntheticSha256,
    });
  });

  it('allows unknown additive fields within schema 1', () => {
    expect(() =>
      parse(manifestFixture({ futureMetadata: true })),
    ).not.toThrow();
  });

  it('rejects invalid JSON without exposing parser text', () => {
    expect(() =>
      parseReleaseManifest('{private-token', '0.1.0-preview.2'),
    ).toThrowError('release manifest is not valid JSON');
  });

  it('rejects a non-object manifest', () => {
    expect(() => parseReleaseManifest('[]', '0.1.0-preview.2')).toThrowError(
      'must be a JSON object',
    );
  });

  it('rejects unknown schema versions safely', () => {
    expect(() => parse(manifestFixture({ schemaVersion: 2 }))).toThrowError(
      'schema 2 is not supported',
    );
  });

  it('rejects a wrong product', () => {
    expect(() => parse(manifestFixture({ product: 'other' }))).toThrowError(
      'product is not commercekit-cli',
    );
  });

  it('rejects a wrong requested version', () => {
    expect(() =>
      parse(manifestFixture({ cliVersion: '0.1.0-preview.3' })),
    ).toThrowError('does not match requested');
  });

  it.each([
    ['buildId', 'short'],
    ['channel', 'invalid channel'],
    ['unsigned', 'true'],
    ['artifacts', []],
  ])('rejects invalid %s', (field, value) => {
    expect(() => parse(manifestFixture({ [field]: value }))).toThrowError();
  });

  it('rejects duplicate targets', () => {
    expect(() =>
      parse(
        manifestFixture({
          artifacts: [manifestArtifact(), manifestArtifact()],
        }),
      ),
    ).toThrowError('duplicate target linux-x64');
  });

  it('rejects an unsupported target', () => {
    expect(() =>
      parse(
        manifestFixture({
          artifacts: [{ ...manifestArtifact(), target: 'linux-ia32' }],
        }),
      ),
    ).toThrowError('unsupported target linux-ia32');
  });

  it('rejects inconsistent OS or architecture metadata', () => {
    expect(() =>
      parse(
        manifestFixture({
          artifacts: [{ ...manifestArtifact(), architecture: 'arm64' }],
        }),
      ),
    ).toThrowError('target metadata is inconsistent');
  });

  it.each([
    '../archive.tar.gz',
    'commercekit-v0.1.0-preview.2-linux-x64.zip',
    'other-v0.1.0-preview.2-linux-x64.tar.gz',
  ])('rejects unsafe or unexpected filename %s', (filename) => {
    expect(() =>
      parse(
        manifestFixture({
          artifacts: [{ ...manifestArtifact(), filename }],
        }),
      ),
    ).toThrowError();
  });

  it('rejects a malformed artifact SHA-256', () => {
    expect(() =>
      parse(
        manifestFixture({
          artifacts: [{ ...manifestArtifact(), sha256: 'invalid' }],
        }),
      ),
    ).toThrowError('SHA-256 is invalid');
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid artifact size %s',
    (size) => {
      expect(() =>
        parse(
          manifestFixture({
            artifacts: [{ ...manifestArtifact(), size }],
          }),
        ),
      ).toThrowError('size is invalid');
    },
  );
});

describe('findManifestArtifact', () => {
  it('returns the requested artifact', () => {
    const manifest = parse(manifestFixture());
    expect(findManifestArtifact(manifest, 'linux-x64').target).toBe(
      'linux-x64',
    );
  });

  it('fails when the requested target is missing', () => {
    const manifest = parse(manifestFixture());
    expect(() => findManifestArtifact(manifest, 'darwin-arm64')).toThrowError(
      'does not publish target darwin-arm64',
    );
  });
});
