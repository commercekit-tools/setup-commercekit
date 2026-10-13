import * as core from '@actions/core';

import { validateExactVersion } from './version.js';

export interface ActionInputs {
  readonly version: string | undefined;
}

type GetInput = (
  name: string,
  options?: { required?: boolean; trimWhitespace?: boolean },
) => string;

export function readInputs(getInput: GetInput = core.getInput): ActionInputs {
  const version = getInput('version', {
    required: false,
    trimWhitespace: false,
  });
  return {
    version: version.length === 0 ? undefined : validateExactVersion(version),
  };
}
