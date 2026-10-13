import semver from 'semver';

import { SetupError } from './errors.js';

export const MINIMUM_CLI_VERSION = '0.1.0-preview.2';

const EXACT_VERSION_ERROR =
  'The version input must be an exact semantic version such as 0.1.0-preview.2. Mutable aliases, ranges, tags, URLs, and Git refs are not supported.';

function requireMinimumVersion(value: string): string {
  if (semver.lt(value, MINIMUM_CLI_VERSION)) {
    throw new SetupError(
      `CommerceKit CLI ${MINIMUM_CLI_VERSION} or newer is required by this Action.`,
    );
  }

  return value;
}

export function validateExactVersion(value: string): string {
  if (
    value.length === 0 ||
    value.trim() !== value ||
    semver.valid(value) !== value
  ) {
    throw new SetupError(EXACT_VERSION_ERROR);
  }

  return requireMinimumVersion(value);
}

export function validateStableReleaseVersion(value: string): string {
  if (semver.valid(value) !== value || semver.prerelease(value) !== null) {
    throw new SetupError(
      'The latest CommerceKit release metadata does not identify a stable semantic version.',
    );
  }

  return requireMinimumVersion(value);
}
