import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  CHECKSUMS_FILENAME,
  downloadVerifiedReleaseMetadata,
  MANIFEST_FILENAME,
  releaseAssetUrl,
  releaseBaseUrl,
  type DownloadFile,
} from '../src/release.js';
import { manifestFixture } from './fixtures/release-manifest.js';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function fixtureDownloader(options?: {
  mismatchManifestArchive?: boolean;
}): Promise<{ directory: string; download: DownloadFile }> {
  const directory = await mkdtemp(join(tmpdir(), 'setup-commercekit-release-'));
  const manifest = JSON.stringify(manifestFixture());
  const manifestHash = sha256(manifest);
  const archiveHash = options?.mismatchManifestArchive
    ? 'c'.repeat(64)
    : 'a'.repeat(64);
  const checksums = `${manifestHash}  ${MANIFEST_FILENAME}\n${archiveHash}  commercekit-v0.1.0-preview.2-linux-x64.tar.gz\n`;
  const files = new Map([
    [CHECKSUMS_FILENAME, checksums],
    [MANIFEST_FILENAME, manifest],
  ]);
  const implementation: DownloadFile = async (url, destination) => {
    const content = files.get(basename(new URL(url).pathname));
    if (content === undefined) throw new Error('not found');
    await writeFile(destination, content);
    return destination;
  };
  const download = vi.fn(implementation);
  return { directory, download };
}

describe('release URLs', () => {
  it('uses the exact immutable CommerceKit release tag', () => {
    expect(releaseBaseUrl('0.1.0-preview.2')).toBe(
      'https://github.com/commercekit-tools/cli/releases/download/cli-v0.1.0-preview.2/',
    );
    expect(releaseAssetUrl('0.1.0-preview.2', 'release-manifest.json')).toBe(
      'https://github.com/commercekit-tools/cli/releases/download/cli-v0.1.0-preview.2/release-manifest.json',
    );
  });

  it('rejects unsafe asset names', () => {
    expect(() =>
      releaseAssetUrl('0.1.0-preview.2', '../asset.zip'),
    ).toThrowError('unsafe asset filename');
  });
});

describe('downloadVerifiedReleaseMetadata', () => {
  it('verifies the manifest and selects the requested target', async () => {
    const { directory, download } = await fixtureDownloader();

    const release = await downloadVerifiedReleaseMetadata(
      '0.1.0-preview.2',
      'linux-x64',
      directory,
      download,
    );

    expect(release.artifact.target).toBe('linux-x64');
    expect(release.archiveUrl).toMatch(
      /commercekit-v0\.1\.0-preview\.2-linux-x64\.tar\.gz$/u,
    );
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('rejects disagreement between manifest and checksums', async () => {
    const { directory, download } = await fixtureDownloader({
      mismatchManifestArchive: true,
    });
    await expect(
      downloadVerifiedReleaseMetadata(
        '0.1.0-preview.2',
        'linux-x64',
        directory,
        download,
      ),
    ).rejects.toThrowError('manifest and SHA256SUMS disagree');
  });

  it('reports a source-free release metadata download failure', async () => {
    const directory = await mkdtemp(
      join(tmpdir(), 'setup-commercekit-release-'),
    );
    const download: DownloadFile = () =>
      Promise.reject(new Error('raw HTTP body'));

    await expect(
      downloadVerifiedReleaseMetadata(
        '0.1.0-preview.9',
        'linux-x64',
        directory,
        download,
      ),
    ).rejects.toThrowError(
      'Could not download SHA256SUMS for CommerceKit CLI 0.1.0-preview.9',
    );
  });
});
