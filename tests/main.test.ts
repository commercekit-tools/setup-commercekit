import { join } from 'node:path';

import * as core from '@actions/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runAction } from '../src/main.js';
import { resolveTarget } from '../src/platform.js';

vi.mock('@actions/core', () => ({
  addPath: vi.fn(),
  debug: vi.fn(),
  getInput: vi.fn(() => '0.1.0-preview.2'),
  info: vi.fn(),
  setOutput: vi.fn(),
}));

describe('runAction', () => {
  afterEach(() => vi.clearAllMocks());

  it('adds the executable directory and sets trusted outputs', async () => {
    const executablePath = join('/tool-cache', 'commercekit');
    const target = resolveTarget();
    const install = vi.fn(async () => ({
      version: '0.1.0-preview.2',
      executablePath,
      target: target.target,
      buildId: 'b'.repeat(40),
      cacheHit: true,
    }));

    await runAction({ install });

    expect(install).toHaveBeenCalledWith(
      '0.1.0-preview.2',
      target,
      expect.any(Object),
    );
    expect(core.addPath).toHaveBeenCalledWith('/tool-cache');
    expect(core.setOutput).toHaveBeenCalledWith('version', '0.1.0-preview.2');
    expect(core.setOutput).toHaveBeenCalledWith('path', executablePath);
    expect(core.setOutput).toHaveBeenCalledWith('target', target.target);
    expect(core.setOutput).toHaveBeenCalledWith('build-id', 'b'.repeat(40));
    expect(core.setOutput).toHaveBeenCalledWith('cache-hit', 'true');
  });

  it('resolves the latest stable version when the input is omitted', async () => {
    vi.mocked(core.getInput).mockReturnValueOnce('');
    const target = resolveTarget();
    const resolveVersion = vi.fn(async () => '1.0.0');
    const install = vi.fn(async () => ({
      version: '1.0.0',
      executablePath: join('/tool-cache', 'commercekit'),
      target: target.target,
      buildId: 'c'.repeat(40),
      cacheHit: false,
    }));

    await runAction({ install, resolveVersion });

    expect(resolveVersion).toHaveBeenCalledWith(undefined, undefined);
    expect(install).toHaveBeenCalledWith('1.0.0', target, expect.any(Object));
    expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.0');
  });
});
