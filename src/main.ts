import * as core from '@actions/core';

import { readInputs } from './inputs.js';
import {
  executableDirectory,
  installCommerceKit,
  type InstallDependencies,
} from './install.js';
import { resolveTarget } from './platform.js';

export interface ActionDependencies {
  readonly install?: typeof installCommerceKit;
  readonly installDependencies?: Partial<InstallDependencies>;
}

export async function runAction(
  dependencies: ActionDependencies = {},
): Promise<void> {
  const inputs = readInputs();
  const target = resolveTarget();
  const install = dependencies.install ?? installCommerceKit;

  core.info(`Resolving CommerceKit CLI ${inputs.version}`);
  core.info(`Runner target: ${target.target}`);
  const result = await install(inputs.version, target, {
    log: core.info,
    debug: core.debug,
    ...dependencies.installDependencies,
  });

  core.addPath(executableDirectory(result));
  core.setOutput('version', result.version);
  core.setOutput('path', result.executablePath);
  core.setOutput('target', result.target);
  core.setOutput('build-id', result.buildId);
  core.setOutput('cache-hit', result.cacheHit ? 'true' : 'false');

  core.info(`Installed CommerceKit CLI ${result.version}`);
  core.info('Added CommerceKit CLI to PATH');
}
