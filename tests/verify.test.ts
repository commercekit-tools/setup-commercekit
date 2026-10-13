import { chmod, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { verifyExecutableVersion } from '../src/verify.js';

async function fixtureFile(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'setup-commercekit-verify-'));
  const file = join(directory, 'commercekit');
  await writeFile(file, 'fixture');
  await chmod(file, 0o755);
  return file;
}

describe('verifyExecutableVersion', () => {
  it('accepts an exact version response', async () => {
    const file = await fixtureFile();
    const execute = vi.fn(async () => ({
      stdout: '0.1.0-preview.2\n',
      stderr: '',
    }));

    await expect(
      verifyExecutableVersion(file, '0.1.0-preview.2', execute),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith(file, ['--version']);
  });

  it('rejects substring and multiline version matches', async () => {
    const file = await fixtureFile();
    await expect(
      verifyExecutableVersion(file, '0.1.0-preview.2', async () => ({
        stdout: 'CommerceKit 0.1.0-preview.2 extra\n',
        stderr: '',
      })),
    ).rejects.toThrowError('did not report expected version');
  });

  it('rejects a missing executable', async () => {
    await expect(
      verifyExecutableVersion('/missing/commercekit', '0.1.0-preview.2'),
    ).rejects.toThrowError('executable is missing');
  });

  it('rejects a symbolic link', async () => {
    const file = await fixtureFile();
    const link = `${file}-link`;
    await symlink(file, link);
    await expect(
      verifyExecutableVersion(link, '0.1.0-preview.2'),
    ).rejects.toThrowError('not a regular file');
  });

  it('converts execution errors into a safe message', async () => {
    const file = await fixtureFile();
    await expect(
      verifyExecutableVersion(file, '0.1.0-preview.2', () =>
        Promise.reject(new Error('private runtime detail')),
      ),
    ).rejects.toThrowError('could not be started');
  });
});
