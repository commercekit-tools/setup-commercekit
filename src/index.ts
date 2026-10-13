import * as core from '@actions/core';

import { safeErrorMessage } from './errors.js';
import { runAction } from './main.js';

void runAction().catch((error: unknown) => {
  core.setFailed(safeErrorMessage(error));
});
