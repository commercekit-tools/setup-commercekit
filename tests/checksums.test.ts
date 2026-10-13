import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertSafeAssetFilename,
  parseSha256Sums,
  requireChecksum,
  sha256File,
  verifyFileSha256,
} from '../src/checksums.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

describe('parseSha256Sums', () => {
  it('parses text and binary checksum markers and normalizes casing', () => {
    const checksums = parseSha256Sums(
      `${HASH_A.toUpperCase()}  archive.tar.gz\n${HASH_B} *binary.zip\n\n`,
    );
    expect([...checksums]).toEqual([
      ['archive.tar.gz', HASH_A],
      ['binary.zip', HASH_B],
    ]);
  });

  it.each([
    'not-a-hash  archive.tar.gz',
    `${'a'.repeat(63)}  archive.tar.gz`,
    `${HASH_A} archive.tar.gz`,
    `${HASH_A}\tarchive.tar.gz`,
  ])('rejects malformed entry %j', (entry) => {
    expect(() => parseSha256Sums(entry)).toThrowError('line 1 is malformed');
  });

  it('rejects duplicate filenames', () => {
    expect(() =>
      parseSha256Sums(`${HASH_A}  asset.zip\n${HASH_A}  asset.zip`),
    ).toThrowError('duplicate entry');
  });

  it('rejects conflicting duplicate filenames', () => {
    expect(() =>
      parseSha256Sums(`${HASH_A}  asset.zip\n${HASH_B}  asset.zip`),
    ).toThrowError('conflicting entry');
  });

  it.each([
    '../asset.zip',
    '..asset.zip',
    'nested/asset.zip',
    'nested\\asset.zip',
    ' asset.zip',
    'asset.zip ',
    'asset\u0000.zip',
  ])('rejects unsafe filename %j', (filename) => {
    expect(() => parseSha256Sums(`${HASH_A}  ${filename}`)).toThrowError(
      'unsafe asset filename',
    );
  });

  it('reports a missing required file', () => {
    expect(() =>
      requireChecksum(parseSha256Sums(`${HASH_A}  asset.zip`), 'missing.zip'),
    ).toThrowError('does not contain missing.zip');
  });
});

describe('filename safety', () => {
  it('accepts current public release filenames', () => {
    expect(() =>
      assertSafeAssetFilename('commercekit-v0.1.0-preview.2-linux-x64.tar.gz'),
    ).not.toThrow();
  });
});

describe('file SHA-256', () => {
  it('streams and verifies a matching file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'setup-commercekit-hash-'));
    const file = join(directory, 'fixture.txt');
    const content = 'CommerceKit public fixture';
    const expected = createHash('sha256').update(content).digest('hex');
    await writeFile(file, content);

    await expect(sha256File(file)).resolves.toBe(expected);
    await expect(
      verifyFileSha256(file, expected.toUpperCase(), 'fixture.txt'),
    ).resolves.toBeUndefined();
  });

  it('fails a checksum mismatch', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'setup-commercekit-hash-'));
    const file = join(directory, 'fixture.txt');
    await writeFile(file, 'content');

    await expect(
      verifyFileSha256(file, HASH_A, 'fixture.txt'),
    ).rejects.toThrowError('SHA-256 verification failed for fixture.txt');
  });

  it('rejects a malformed expected hash', async () => {
    await expect(
      verifyFileSha256('/unused', 'invalid', 'fixture.txt'),
    ).rejects.toThrowError('expected SHA-256');
  });
});
