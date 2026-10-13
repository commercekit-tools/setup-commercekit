import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { basename } from 'node:path';

import { SetupError } from './errors.js';

const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const CHECKSUM_LINE_PATTERN = /^([0-9a-f]{64}) ([ *])(.+)$/i;

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

export function isSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

export function assertSafeAssetFilename(filename: string): void {
  if (
    filename.length === 0 ||
    filename.trim() !== filename ||
    filename !== basename(filename) ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    hasControlCharacter(filename)
  ) {
    throw new SetupError('Release metadata contains an unsafe asset filename.');
  }
}

export function parseSha256Sums(content: string): ReadonlyMap<string, string> {
  const checksums = new Map<string, string>();

  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    if (line.length === 0) continue;
    const match = CHECKSUM_LINE_PATTERN.exec(line);
    if (match === null) {
      throw new SetupError(`SHA256SUMS line ${index + 1} is malformed.`);
    }

    const hash = match[1]?.toLowerCase();
    const filename = match[3];
    if (hash === undefined || filename === undefined) {
      throw new SetupError(`SHA256SUMS line ${index + 1} is malformed.`);
    }
    assertSafeAssetFilename(filename);

    const existing = checksums.get(filename);
    if (existing !== undefined) {
      const qualifier = existing === hash ? 'duplicate' : 'conflicting';
      throw new SetupError(
        `SHA256SUMS contains a ${qualifier} entry for ${filename}.`,
      );
    }
    checksums.set(filename, hash);
  }

  return checksums;
}

export function requireChecksum(
  checksums: ReadonlyMap<string, string>,
  filename: string,
): string {
  const checksum = checksums.get(filename);
  if (checksum === undefined) {
    throw new SetupError(`SHA256SUMS does not contain ${filename}.`);
  }
  return checksum;
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

export async function verifyFileSha256(
  filePath: string,
  expectedHash: string,
  displayName: string,
): Promise<void> {
  if (!isSha256(expectedHash)) {
    throw new SetupError(
      `The expected SHA-256 for ${displayName} is malformed.`,
    );
  }
  const actualHash = await sha256File(filePath);
  if (
    !timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    )
  ) {
    throw new SetupError(`SHA-256 verification failed for ${displayName}.`);
  }
}
