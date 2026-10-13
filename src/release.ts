import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as toolCache from '@actions/tool-cache';

import {
  assertSafeAssetFilename,
  parseSha256Sums,
  requireChecksum,
  verifyFileSha256,
} from './checksums.js';
import { SetupError } from './errors.js';
import {
  findManifestArtifact,
  parseReleaseManifest,
  type ReleaseArtifact,
  type ReleaseManifest,
} from './manifest.js';
import type { ReleaseTarget } from './platform.js';
import { validateStableReleaseVersion } from './version.js';

const RELEASE_REPOSITORY = 'commercekit-tools/cli';
const LATEST_STABLE_RELEASE_BASE_URL = `https://github.com/${RELEASE_REPOSITORY}/releases/latest/download/`;
export const CHECKSUMS_FILENAME = 'SHA256SUMS';
export const MANIFEST_FILENAME = 'release-manifest.json';

export type DownloadFile = (
  url: string,
  destination: string,
) => Promise<string>;

export interface VerifiedReleaseMetadata {
  readonly manifest: ReleaseManifest;
  readonly artifact: ReleaseArtifact;
  readonly archiveUrl: string;
}

export function releaseBaseUrl(version: string): string {
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/cli-v${version}/`;
}

export function releaseAssetUrl(version: string, filename: string): string {
  assertSafeAssetFilename(filename);
  return new URL(encodeURIComponent(filename), releaseBaseUrl(version)).href;
}

export function latestStableAssetUrl(filename: string): string {
  assertSafeAssetFilename(filename);
  return new URL(encodeURIComponent(filename), LATEST_STABLE_RELEASE_BASE_URL)
    .href;
}

interface VerifiedIntegrityMetadata {
  readonly checksums: ReadonlyMap<string, string>;
  readonly manifestContent: string;
}

async function downloadIntegrityMetadata(
  assetUrl: (filename: string) => string,
  temporaryDirectory: string,
  filenamePrefix: string,
  downloadFile: DownloadFile,
  failureMessage: (filename: string) => string,
): Promise<VerifiedIntegrityMetadata> {
  const checksumsPath = join(
    temporaryDirectory,
    `${filenamePrefix}-${CHECKSUMS_FILENAME}`,
  );
  try {
    await downloadFile(assetUrl(CHECKSUMS_FILENAME), checksumsPath);
  } catch {
    throw new SetupError(failureMessage(CHECKSUMS_FILENAME));
  }
  const checksums = parseSha256Sums(await readFile(checksumsPath, 'utf8'));

  const manifestPath = join(
    temporaryDirectory,
    `${filenamePrefix}-${MANIFEST_FILENAME}`,
  );
  try {
    await downloadFile(assetUrl(MANIFEST_FILENAME), manifestPath);
  } catch {
    throw new SetupError(failureMessage(MANIFEST_FILENAME));
  }
  await verifyFileSha256(
    manifestPath,
    requireChecksum(checksums, MANIFEST_FILENAME),
    MANIFEST_FILENAME,
  );

  return Object.freeze({
    checksums,
    manifestContent: await readFile(manifestPath, 'utf8'),
  });
}

export async function downloadLatestStableVersion(
  temporaryDirectory: string,
  downloadFile: DownloadFile,
): Promise<string> {
  const metadata = await downloadIntegrityMetadata(
    latestStableAssetUrl,
    temporaryDirectory,
    'latest-stable',
    downloadFile,
    () =>
      'Could not resolve the latest stable CommerceKit CLI release. Specify an exact version or confirm that a stable public release is available.',
  );
  const manifest = parseReleaseManifest(metadata.manifestContent);
  return validateStableReleaseVersion(manifest.cliVersion);
}

export async function downloadVerifiedReleaseMetadata(
  version: string,
  target: ReleaseTarget,
  temporaryDirectory: string,
  downloadFile: DownloadFile = toolCache.downloadTool,
): Promise<VerifiedReleaseMetadata> {
  const metadata = await downloadIntegrityMetadata(
    (filename) => releaseAssetUrl(version, filename),
    temporaryDirectory,
    'exact',
    downloadFile,
    (filename) =>
      `Could not download ${filename} for CommerceKit CLI ${version}. Confirm that the exact public release exists.`,
  );
  const manifest = parseReleaseManifest(metadata.manifestContent, version);
  const artifact = findManifestArtifact(manifest, target);
  const checksum = requireChecksum(metadata.checksums, artifact.filename);
  if (checksum !== artifact.sha256) {
    throw new SetupError(
      `Release manifest and SHA256SUMS disagree for ${artifact.filename}.`,
    );
  }

  return Object.freeze({
    manifest,
    artifact,
    archiveUrl: releaseAssetUrl(version, artifact.filename),
  });
}
