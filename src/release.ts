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

const RELEASE_REPOSITORY = 'commercekit-tools/cli';
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

async function downloadMetadataFile(
  version: string,
  filename: string,
  destination: string,
  downloadFile: DownloadFile,
): Promise<string> {
  try {
    return await downloadFile(releaseAssetUrl(version, filename), destination);
  } catch {
    throw new SetupError(
      `Could not download ${filename} for CommerceKit CLI ${version}. Confirm that the exact public release exists.`,
    );
  }
}

export async function downloadVerifiedReleaseMetadata(
  version: string,
  target: ReleaseTarget,
  temporaryDirectory: string,
  downloadFile: DownloadFile = toolCache.downloadTool,
): Promise<VerifiedReleaseMetadata> {
  const checksumsPath = join(temporaryDirectory, CHECKSUMS_FILENAME);
  await downloadMetadataFile(
    version,
    CHECKSUMS_FILENAME,
    checksumsPath,
    downloadFile,
  );
  const checksums = parseSha256Sums(await readFile(checksumsPath, 'utf8'));

  const manifestPath = join(temporaryDirectory, MANIFEST_FILENAME);
  await downloadMetadataFile(
    version,
    MANIFEST_FILENAME,
    manifestPath,
    downloadFile,
  );
  await verifyFileSha256(
    manifestPath,
    requireChecksum(checksums, MANIFEST_FILENAME),
    MANIFEST_FILENAME,
  );

  const manifest = parseReleaseManifest(
    await readFile(manifestPath, 'utf8'),
    version,
  );
  const artifact = findManifestArtifact(manifest, target);
  const checksum = requireChecksum(checksums, artifact.filename);
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
