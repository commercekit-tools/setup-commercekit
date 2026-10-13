import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { VersionResolutionDependencies } from '../src/resolve-version.js';
import { resolveCommerceKitVersion } from '../src/resolve-version.js';

async function resolutionDependencies(): Promise<VersionResolutionDependencies> {
  return {
    runnerTemp: await mkdtemp(join(tmpdir(), 'setup-commercekit-resolver-')),
    downloadFile: vi.fn(async (_url, destination) => destination),
    resolveLatestStable: vi.fn(async () => '0.1.0'),
    debug: vi.fn(),
  };
}

describe('resolveCommerceKitVersion', () => {
  it('returns an explicit exact version without stable discovery', async () => {
    const dependencies = await resolutionDependencies();
    await expect(
      resolveCommerceKitVersion('0.1.0-preview.2', dependencies),
    ).resolves.toBe('0.1.0-preview.2');
    expect(dependencies.resolveLatestStable).not.toHaveBeenCalled();
  });

  it('resolves and validates the latest stable version when omitted', async () => {
    const dependencies = await resolutionDependencies();
    await expect(
      resolveCommerceKitVersion(undefined, dependencies),
    ).resolves.toBe('0.1.0');
    expect(dependencies.resolveLatestStable).toHaveBeenCalledOnce();
    expect(await readdir(dependencies.runnerTemp)).toEqual([]);
  });

  it('rejects a prerelease returned by the stable resolver', async () => {
    const dependencies = await resolutionDependencies();
    const prereleaseDependencies = {
      ...dependencies,
      resolveLatestStable: vi.fn(async () => '0.1.0-preview.2'),
    };
    await expect(
      resolveCommerceKitVersion(undefined, prereleaseDependencies),
    ).rejects.toThrowError('does not identify a stable semantic version');
  });
});
