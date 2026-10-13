import type { ReleaseTarget } from '../../src/platform.js';

const SYNTHETIC_SHA256 = 'a'.repeat(64);
const SYNTHETIC_BUILD_ID = 'b'.repeat(40);

export function manifestArtifact(
  target: ReleaseTarget = 'linux-x64',
  version = '0.1.0-preview.2',
): Record<string, unknown> {
  const [os, architecture] = target.split('-') as [string, string];
  const extension = os === 'windows' ? '.zip' : '.tar.gz';
  return {
    target,
    os,
    architecture,
    filename: `commercekit-v${version}-${target}${extension}`,
    sha256: SYNTHETIC_SHA256,
    size: 1234,
  };
}

export function manifestFixture(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    product: 'commercekit-cli',
    cliVersion: '0.1.0-preview.2',
    buildId: SYNTHETIC_BUILD_ID,
    channel: 'preview',
    unsigned: true,
    artifacts: [manifestArtifact()],
    ...overrides,
  };
}

export const syntheticBuildId = SYNTHETIC_BUILD_ID;
export const syntheticSha256 = SYNTHETIC_SHA256;
