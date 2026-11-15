import * as core from '@actions/core';
import { captureActionInputs } from '@commercekit-tools/notification-contract';

import { readInputs } from './inputs.js';
import {
  executableDirectory,
  installCommerceKit,
  type InstallDependencies,
  type InstallResult,
} from './install.js';
import { resolveTarget } from './platform.js';
import { reportSetup, setupInputDefinitions } from './reporting.js';
import {
  resolveCommerceKitVersion,
  type VersionResolutionDependencies,
} from './resolve-version.js';
import { LATEST_STABLE_VERSION } from './version.js';

export interface ActionDependencies {
  readonly install?: typeof installCommerceKit;
  readonly installDependencies?: Partial<InstallDependencies>;
  readonly resolveVersion?: typeof resolveCommerceKitVersion;
  readonly versionResolutionDependencies?: Partial<VersionResolutionDependencies>;
  readonly now?: () => number;
}

export async function runAction(
  dependencies: ActionDependencies = {},
): Promise<void> {
  const now = dependencies.now ?? Date.now;
  const started = now();
  const occurredAt = new Date(started).toISOString();
  let rawInputs: Record<string, string> = {};
  let inputsValidated = false;
  let requestedVersion: string | undefined;
  let target: string | undefined;
  let result: InstallResult | undefined;
  let failed = false;
  let originalError: unknown;

  try {
    rawInputs = captureActionInputs(
      setupInputDefinitions,
      (name) => core.getInput(name, { required: false, trimWhitespace: false }),
      core.setSecret,
    );
    const inputs = readInputs((name) => rawInputs[name] ?? '');
    inputsValidated = true;
    requestedVersion = inputs.version;
    const definition = resolveTarget();
    target = definition.target;
    const install = dependencies.install ?? installCommerceKit;
    const resolveVersion =
      dependencies.resolveVersion ?? resolveCommerceKitVersion;
    const resolvesLatestStable =
      inputs.version === undefined || inputs.version === LATEST_STABLE_VERSION;

    core.info(
      resolvesLatestStable
        ? 'Resolving latest stable CommerceKit CLI'
        : `Resolving CommerceKit CLI ${inputs.version}`,
    );
    core.info(`Runner target: ${definition.target}`);
    const version = await resolveVersion(
      inputs.version,
      dependencies.versionResolutionDependencies,
    );
    if (resolvesLatestStable) {
      core.info(`Resolved latest stable CommerceKit CLI ${version}`);
    }
    result = await install(version, definition, {
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
  } catch (error) {
    failed = true;
    originalError = error;
    throw error;
  } finally {
    try {
      await reportSetup({
        rawInputs,
        inputsValidated,
        ...(requestedVersion ? { requestedVersion } : {}),
        ...(target ? { target } : {}),
        ...(result ? { result } : {}),
        failed,
        ...(failed ? { error: originalError } : {}),
        occurredAt,
        durationMs: Math.max(0, Math.floor(now() - started)),
      });
    } catch {
      core.warning(
        'Setup reporting could not be completed; the installation outcome is preserved.',
      );
    }
  }
}
