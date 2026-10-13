import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { InstallDependencies } from '../src/install.js';
import { installCommerceKit } from '../src/install.js';
import type { VerifiedReleaseMetadata } from '../src/release.js';
import { TARGET_DEFINITIONS } from '../src/platform.js';
import { syntheticBuildId } from './fixtures/release-manifest.js';

const VERSION = '0.1.0-preview.2';
const TARGET = TARGET_DEFINITIONS['linux-x64'];
const ARCHIVE_CONTENT = 'synthetic archive';

async function testDependencies(): Promise<{
  dependencies: InstallDependencies;
  cacheRoot: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'setup-commercekit-install-test-'));
  const runnerTemp = join(root, 'temp');
  const cacheRoot = join(root, 'cache');
  await mkdir(runnerTemp, { recursive: true });
  await mkdir(cacheRoot, { recursive: true });
  const archiveSha256 =
    '74a06ea6113b7f98d70ba2286ddaa21a9a17e25ed2bb8736a823dbc46177eb44';
  const release: VerifiedReleaseMetadata = {
    manifest: {
      schemaVersion: 1,
      product: 'commercekit-cli',
      cliVersion: VERSION,
      buildId: syntheticBuildId,
      channel: 'preview',
      unsigned: true,
      artifacts: [
        {
          target: TARGET.target,
          os: TARGET.os,
          architecture: TARGET.architecture,
          filename: `commercekit-v${VERSION}-${TARGET.target}.tar.gz`,
          sha256: archiveSha256,
          size: Buffer.byteLength(ARCHIVE_CONTENT),
        },
      ],
    },
    artifact: {
      target: TARGET.target,
      os: TARGET.os,
      architecture: TARGET.architecture,
      filename: `commercekit-v${VERSION}-${TARGET.target}.tar.gz`,
      sha256: archiveSha256,
      size: Buffer.byteLength(ARCHIVE_CONTENT),
    },
    archiveUrl:
      'https://github.com/commercekit-tools/cli/releases/download/exact/archive.tar.gz',
  };
  const dependencies: InstallDependencies = {
    runnerTemp,
    findTool: vi.fn(() => ''),
    cacheDirectory: vi.fn(async (sourceDirectory) => {
      const destination = join(cacheRoot, VERSION, TARGET.target);
      await cp(sourceDirectory, destination, { recursive: true });
      return destination;
    }),
    downloadFile: vi.fn(async (_url, destination) => {
      await writeFile(destination, ARCHIVE_CONTENT);
      return destination;
    }),
    extractTar: vi.fn(async (_archive, destination) => {
      await writeFile(join(destination, 'commercekit'), 'executable');
      return destination;
    }),
    extractZip: vi.fn(async (_archive, destination) => destination),
    resolveMetadata: vi.fn(async () => release),
    verifyExecutable: vi.fn(async () => undefined),
    log: vi.fn(),
    debug: vi.fn(),
  };
  return { dependencies, cacheRoot };
}

describe('installCommerceKit', () => {
  it('downloads, verifies, caches, and returns an installation', async () => {
    const { dependencies } = await testDependencies();
    const result = await installCommerceKit(VERSION, TARGET, dependencies);

    expect(result).toMatchObject({
      version: VERSION,
      target: TARGET.target,
      buildId: syntheticBuildId,
      cacheHit: false,
      archiveFilename: `commercekit-v${VERSION}-${TARGET.target}.tar.gz`,
    });
    expect(result.executablePath).toMatch(/commercekit$/u);
    expect(dependencies.verifyExecutable).toHaveBeenCalledTimes(2);
    expect(dependencies.cacheDirectory).toHaveBeenCalledOnce();
  });

  it('reuses and verifies a complete cached installation', async () => {
    const { dependencies, cacheRoot } = await testDependencies();
    const cacheDirectory = join(cacheRoot, VERSION, TARGET.target);
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(join(cacheDirectory, 'commercekit'), 'executable');
    await writeFile(
      join(cacheDirectory, '.setup-commercekit.json'),
      JSON.stringify({
        schemaVersion: 1,
        cliVersion: VERSION,
        target: TARGET.target,
        buildId: syntheticBuildId,
        archiveSha256: 'a'.repeat(64),
      }),
    );
    dependencies.findTool = vi.fn(() => cacheDirectory);

    const result = await installCommerceKit(VERSION, TARGET, dependencies);
    expect(result.cacheHit).toBe(true);
    expect(result.buildId).toBe(syntheticBuildId);
    expect(dependencies.downloadFile).not.toHaveBeenCalled();
    expect(dependencies.verifyExecutable).toHaveBeenCalledOnce();
  });

  it('fails rather than trusting a cache with missing metadata', async () => {
    const { dependencies, cacheRoot } = await testDependencies();
    const cacheDirectory = join(cacheRoot, VERSION, TARGET.target);
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(join(cacheDirectory, 'commercekit'), 'executable');
    dependencies.findTool = vi.fn(() => cacheDirectory);

    await expect(
      installCommerceKit(VERSION, TARGET, dependencies),
    ).rejects.toThrowError('failed verification');
  });

  it('fails rather than trusting a cached wrong executable version', async () => {
    const { dependencies, cacheRoot } = await testDependencies();
    const cacheDirectory = join(cacheRoot, VERSION, TARGET.target);
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(join(cacheDirectory, 'commercekit'), 'executable');
    await writeFile(
      join(cacheDirectory, '.setup-commercekit.json'),
      JSON.stringify({
        schemaVersion: 1,
        cliVersion: VERSION,
        target: TARGET.target,
        buildId: syntheticBuildId,
        archiveSha256: 'a'.repeat(64),
      }),
    );
    dependencies.findTool = vi.fn(() => cacheDirectory);
    dependencies.verifyExecutable = vi.fn(() =>
      Promise.reject(new Error('wrong version')),
    );

    await expect(
      installCommerceKit(VERSION, TARGET, dependencies),
    ).rejects.toThrowError('failed verification');
  });

  it('fails a downloaded size mismatch before extraction', async () => {
    const { dependencies } = await testDependencies();
    dependencies.downloadFile = vi.fn(async (_url, destination) => {
      await writeFile(destination, 'wrong size');
      return destination;
    });

    await expect(
      installCommerceKit(VERSION, TARGET, dependencies),
    ).rejects.toThrowError('Downloaded size verification failed');
    expect(dependencies.extractTar).not.toHaveBeenCalled();
  });

  it('reports archive download failures without raw details', async () => {
    const { dependencies } = await testDependencies();
    dependencies.downloadFile = vi.fn(() =>
      Promise.reject(new Error('raw response body')),
    );
    await expect(
      installCommerceKit(VERSION, TARGET, dependencies),
    ).rejects.toThrowError('Could not download commercekit-');
  });

  it('reports extraction failures without raw details', async () => {
    const { dependencies } = await testDependencies();
    dependencies.extractTar = vi.fn(() =>
      Promise.reject(new Error('private temp path')),
    );
    await expect(
      installCommerceKit(VERSION, TARGET, dependencies),
    ).rejects.toThrowError('archive could not be extracted');
  });

  it('rejects an archive with no expected executable', async () => {
    const { dependencies } = await testDependencies();
    dependencies.extractTar = vi.fn(async (_archive, destination) => {
      await writeFile(join(destination, 'other'), 'file');
      return destination;
    });
    await expect(
      installCommerceKit(VERSION, TARGET, dependencies),
    ).rejects.toThrowError('does not contain the expected executable');
  });

  it('writes verified build metadata into the cache source', async () => {
    const { dependencies } = await testDependencies();
    let metadata = '';
    dependencies.cacheDirectory = vi.fn(async (sourceDirectory) => {
      metadata = await readFile(
        join(sourceDirectory, '.setup-commercekit.json'),
        'utf8',
      );
      return sourceDirectory;
    });
    const result = await installCommerceKit(VERSION, TARGET, dependencies);
    expect(metadata).toContain(syntheticBuildId);
    expect(result.cacheHit).toBe(false);
  });
});
