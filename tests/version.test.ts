import { describe, expect, it } from 'vitest';

import { SetupError } from '../src/errors.js';
import { MINIMUM_CLI_VERSION, validateExactVersion } from '../src/version.js';

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
