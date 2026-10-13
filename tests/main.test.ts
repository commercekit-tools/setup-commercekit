import { join } from 'node:path';

import * as core from '@actions/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runAction } from '../src/main.js';

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
    const install = vi.fn(async () => ({
      version: '0.1.0-preview.2',
      executablePath,
      target: 'darwin-arm64',
      buildId: 'b'.repeat(40),
      cacheHit: true,
    }));

    await runAction({ install });

    expect(core.addPath).toHaveBeenCalledWith('/tool-cache');
    expect(core.setOutput).toHaveBeenCalledWith('version', '0.1.0-preview.2');
    expect(core.setOutput).toHaveBeenCalledWith('path', executablePath);
    expect(core.setOutput).toHaveBeenCalledWith('target', 'darwin-arm64');
    expect(core.setOutput).toHaveBeenCalledWith('build-id', 'b'.repeat(40));
    expect(core.setOutput).toHaveBeenCalledWith('cache-hit', 'true');
  });
});
