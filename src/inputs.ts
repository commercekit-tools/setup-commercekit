import * as core from '@actions/core';

import { validateExactVersion } from './version.js';

export interface ActionInputs {
  readonly version: string;
}

type GetInput = (
  name: string,
  options?: { required?: boolean; trimWhitespace?: boolean },
) => string;

export function readInputs(getInput: GetInput = core.getInput): ActionInputs {
  return {
    version: validateExactVersion(
      getInput('version', { required: true, trimWhitespace: false }),
    ),
  };
}
