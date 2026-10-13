import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as toolCache from '@actions/tool-cache';

import { downloadLatestStableVersion, type DownloadFile } from './release.js';
import {
  LATEST_STABLE_VERSION,
  validateExactVersion,
  validateStableReleaseVersion,
} from './version.js';

export interface VersionResolutionDependencies {
  readonly runnerTemp: string;
  readonly downloadFile: DownloadFile;
  readonly resolveLatestStable: typeof downloadLatestStableVersion;
  readonly debug: (message: string) => void;
}

const defaultDependencies: VersionResolutionDependencies = {
  runnerTemp: process.env['RUNNER_TEMP'] ?? tmpdir(),
  downloadFile: toolCache.downloadTool,
  resolveLatestStable: downloadLatestStableVersion,
  debug: () => undefined,
};

export async function resolveCommerceKitVersion(
  requestedVersion: string | undefined,
  overrides: Partial<VersionResolutionDependencies> = {},
): Promise<string> {
  if (
    requestedVersion !== undefined &&
    requestedVersion !== LATEST_STABLE_VERSION
  ) {
    return validateExactVersion(requestedVersion);
  }

  const dependencies = { ...defaultDependencies, ...overrides };
  await mkdir(dependencies.runnerTemp, { recursive: true });
  const temporaryDirectory = await mkdtemp(
    join(dependencies.runnerTemp, 'setup-commercekit-version-'),
  );
  try {
    return validateStableReleaseVersion(
      await dependencies.resolveLatestStable(
        temporaryDirectory,
        dependencies.downloadFile,
      ),
    );
  } finally {
    try {
      await rm(temporaryDirectory, { recursive: true, force: true });
    } catch {
      dependencies.debug(
        'Temporary version-resolution directory cleanup did not complete.',
      );
    }
  }
}
