import semver from 'semver';

import { SetupError } from './errors.js';

export const MINIMUM_CLI_VERSION = '0.1.0-preview.2';

const EXACT_VERSION_ERROR =
  'The version input must be an exact semantic version such as 0.1.0-preview.2. Mutable aliases, ranges, tags, URLs, and Git refs are not supported.';

export function validateExactVersion(value: string): string {
  if (
    value.length === 0 ||
    value.trim() !== value ||
    semver.valid(value) !== value
  ) {
    throw new SetupError(EXACT_VERSION_ERROR);
  }

  if (semver.lt(value, MINIMUM_CLI_VERSION)) {
    throw new SetupError(
      `CommerceKit CLI ${MINIMUM_CLI_VERSION} or newer is required by this Action.`,
    );
  }

  return value;
}
