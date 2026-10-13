import { describe, expect, it } from 'vitest';

import { SetupError } from '../src/errors.js';
import {
  LATEST_STABLE_VERSION,
  MINIMUM_CLI_VERSION,
  validateExactVersion,
  validateStableReleaseVersion,
  validateVersionInput,
} from '../src/version.js';

describe('validateExactVersion', () => {
  it.each(['0.1.0-preview.2', '0.1.0-preview.10', '0.1.0', '0.2.0', '1.0.0'])(
    'accepts exact supported version %s',
    (version) => {
      expect(validateExactVersion(version)).toBe(version);
    },
  );

  it.each([
    '',
    ' ',
    ' 0.1.0-preview.2',
    '0.1.0-preview.2 ',
    'latest',
    'stable',
    'latest-preview',
    'main',
    'master',
    'v0.1.0-preview.2',
    'cli-v0.1.0-preview.2',
    '^0.1.0',
    '~0.1.0',
    '>=0.1.0',
    'https://example.com/archive.zip',
    '0.1.0/asset',
    '0.1.0\\asset',
    '../../0.1.0',
  ])('rejects non-exact input %j', (version) => {
    expect(() => validateExactVersion(version)).toThrowError(
      'The version input must be an exact semantic version',
    );
  });

  it('rejects versions below the supported minimum', () => {
    expect(() => validateExactVersion('0.1.0-preview.1')).toThrowError(
      `CommerceKit CLI ${MINIMUM_CLI_VERSION} or newer is required by this Action.`,
    );
  });

  it('returns a SetupError with deterministic text', () => {
    try {
      validateExactVersion('latest');
      expect.fail('Expected version validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SetupError);
      expect((error as Error).message).not.toContain('latest');
    }
  });
});

describe('validateVersionInput', () => {
  it('accepts the latest stable selector', () => {
    expect(validateVersionInput('latest')).toBe(LATEST_STABLE_VERSION);
  });

  it('accepts an exact supported version', () => {
    expect(validateVersionInput('0.1.0-preview.2')).toBe('0.1.0-preview.2');
  });

  it.each(['stable', 'preview', '^0.1.0', ' latest ', 'LATEST'])(
    'rejects unsupported selector %j',
    (version) => {
      expect(() => validateVersionInput(version)).toThrowError(
        'must be latest or an exact semantic version',
      );
    },
  );
});

describe('validateStableReleaseVersion', () => {
  it.each(['0.1.0', '0.2.0', '1.0.0'])(
    'accepts stable supported version %s',
    (version) => {
      expect(validateStableReleaseVersion(version)).toBe(version);
    },
  );

  it.each(['invalid', '0.1.0-preview.2', '1.0.0-rc.1'])(
    'rejects non-stable resolved version %s',
    (version) => {
      expect(() => validateStableReleaseVersion(version)).toThrowError(
        'does not identify a stable semantic version',
      );
    },
  );

  it('applies the minimum supported version to stable resolution', () => {
    expect(() => validateStableReleaseVersion('0.0.1')).toThrowError(
      `CommerceKit CLI ${MINIMUM_CLI_VERSION} or newer is required by this Action.`,
    );
  });
});
