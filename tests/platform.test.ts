import { describe, expect, it } from 'vitest';

import {
  isReleaseTarget,
  resolveTarget,
  SUPPORTED_TARGETS,
  TARGET_DEFINITIONS,
} from '../src/platform.js';

describe('resolveTarget', () => {
  it.each([
    ['darwin', 'arm64', 'darwin-arm64'],
    ['darwin', 'x64', 'darwin-x64'],
    ['linux', 'arm64', 'linux-arm64'],
    ['linux', 'x64', 'linux-x64'],
    ['win32', 'arm64', 'windows-arm64'],
    ['win32', 'x64', 'windows-x64'],
  ] as const)('maps %s/%s to %s', (platform, architecture, target) => {
    expect(resolveTarget(platform, architecture)).toBe(
      TARGET_DEFINITIONS[target],
    );
  });

  it.each([
    ['linux', 'ia32'],
    ['linux', 'ppc64'],
    ['linux', 's390x'],
    ['freebsd', 'x64'],
    ['aix', 'x64'],
    ['linux', 'unknown'],
    ['unknown', 'x64'],
  ])('rejects unsupported runner %s/%s', (platform, architecture) => {
    expect(() => resolveTarget(platform, architecture)).toThrowError(
      `Runner platform ${platform}/${architecture} is not supported`,
    );
  });
});

describe('release target registry', () => {
  it('contains the six public CommerceKit targets', () => {
    expect(SUPPORTED_TARGETS).toHaveLength(6);
    expect(Object.keys(TARGET_DEFINITIONS).sort()).toEqual(
      [...SUPPORTED_TARGETS].sort(),
    );
  });

  it.each(SUPPORTED_TARGETS)('recognizes %s', (target) => {
    expect(isReleaseTarget(target)).toBe(true);
  });

  it('rejects unknown targets', () => {
    expect(isReleaseTarget('linux-ia32')).toBe(false);
  });
});
