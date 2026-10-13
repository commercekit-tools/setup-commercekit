import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

import * as toolCache from '@actions/tool-cache';

import { verifyFileSha256 } from './checksums.js';
import { SetupError } from './errors.js';
import type { VerifiedReleaseMetadata } from './release.js';
import { downloadVerifiedReleaseMetadata } from './release.js';
import type { TargetDefinition } from './platform.js';
import { verifyExecutableVersion } from './verify.js';

const TOOL_NAME = 'commercekit';
const CACHE_METADATA_FILENAME = '.setup-commercekit.json';
const MAX_EXTRACTED_ENTRIES = 1_000;

interface CacheMetadata {
  readonly schemaVersion: 1;
  readonly cliVersion: string;
  readonly target: string;
  readonly buildId: string;
  readonly archiveSha256: string;
}

export interface InstallResult {
  readonly version: string;
  readonly executablePath: string;
  readonly target: string;
  readonly buildId: string;
  readonly cacheHit: boolean;
  readonly archiveFilename?: string;
  readonly archiveSha256?: string;
}

export interface InstallDependencies {
  runnerTemp: string;
  findTool: (tool: string, version: string, target: string) => string;
  cacheDirectory: (
    sourceDirectory: string,
    tool: string,
    version: string,
    target: string,
  ) => Promise<string>;
  downloadFile: (url: string, destination: string) => Promise<string>;
  extractTar: (archive: string, destination: string) => Promise<string>;
  extractZip: (archive: string, destination: string) => Promise<string>;
  resolveMetadata: typeof downloadVerifiedReleaseMetadata;
  verifyExecutable: typeof verifyExecutableVersion;
  log: (message: string) => void;
  debug: (message: string) => void;
}

const defaultDependencies: InstallDependencies = {
  runnerTemp: process.env['RUNNER_TEMP'] ?? tmpdir(),
  findTool: toolCache.find,
  cacheDirectory: toolCache.cacheDir,
  downloadFile: toolCache.downloadTool,
  extractTar: (archive, destination) =>
    toolCache.extractTar(archive, destination),
  extractZip: toolCache.extractZip,
  resolveMetadata: downloadVerifiedReleaseMetadata,
  verifyExecutable: verifyExecutableVersion,
  log: () => undefined,
  debug: () => undefined,
};

function parseCacheMetadata(
  content: string,
  version: string,
  target: string,
): CacheMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new SetupError('Cached CommerceKit metadata is invalid.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SetupError('Cached CommerceKit metadata is invalid.');
  }
  const record = parsed as Record<string, unknown>;
  if (
    record['schemaVersion'] !== 1 ||
    record['cliVersion'] !== version ||
    record['target'] !== target ||
    typeof record['buildId'] !== 'string' ||
    !/^[0-9a-f]{40}$/u.test(record['buildId']) ||
    typeof record['archiveSha256'] !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(record['archiveSha256'])
  ) {
    throw new SetupError('Cached CommerceKit metadata is invalid.');
  }
  return {
    schemaVersion: 1,
    cliVersion: version,
    target,
    buildId: record['buildId'],
    archiveSha256: record['archiveSha256'],
  };
}

async function readCacheMetadata(
  cacheDirectory: string,
  version: string,
  target: string,
): Promise<CacheMetadata> {
  try {
    return parseCacheMetadata(
      await readFile(join(cacheDirectory, CACHE_METADATA_FILENAME), 'utf8'),
      version,
      target,
    );
  } catch (error) {
    if (error instanceof SetupError) throw error;
    throw new SetupError('Cached CommerceKit metadata is missing.');
  }
}

async function findExecutable(
  rootDirectory: string,
  expectedName: string,
): Promise<string> {
  const root = resolve(rootDirectory);
  const matches: string[] = [];
  let visitedEntries = 0;

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      visitedEntries += 1;
      if (visitedEntries > MAX_EXTRACTED_ENTRIES) {
        throw new SetupError(
          'The CommerceKit archive contains too many entries.',
        );
      }
      const candidate = resolve(directory, entry.name);
      if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
        throw new SetupError(
          'The CommerceKit archive contains an unsafe path.',
        );
      }
      if (entry.isDirectory()) {
        await visit(candidate);
      } else if (entry.name === expectedName) {
        const status = await lstat(candidate);
        if (!status.isFile() || status.isSymbolicLink()) {
          throw new SetupError(
            'The extracted CommerceKit executable is not a regular file.',
          );
        }
        matches.push(candidate);
      }
    }
  }

  await visit(root);
  if (matches.length === 0) {
    throw new SetupError(
      'The CommerceKit archive does not contain the expected executable.',
    );
  }
  if (matches.length > 1) {
    throw new SetupError(
      'The CommerceKit archive contains multiple executable candidates.',
    );
  }
  return matches[0]!;
}

async function verifyCacheHit(
  cacheDirectory: string,
  version: string,
  target: TargetDefinition,
  dependencies: InstallDependencies,
): Promise<InstallResult> {
  try {
    const metadata = await readCacheMetadata(
      cacheDirectory,
      version,
      target.target,
    );
    const executablePath = await findExecutable(
      cacheDirectory,
      target.executableName,
    );
    await dependencies.verifyExecutable(executablePath, version);
    return {
      version,
      executablePath,
      target: target.target,
      buildId: metadata.buildId,
      cacheHit: true,
    };
  } catch {
    throw new SetupError(
      `Cached CommerceKit CLI ${version} for ${target.target} failed verification. Remove the corrupted runner tool-cache entry before retrying.`,
    );
  }
}

async function extractArchive(
  archivePath: string,
  destination: string,
  target: TargetDefinition,
  dependencies: InstallDependencies,
): Promise<string> {
  try {
    return target.archiveExtension === '.zip'
      ? await dependencies.extractZip(archivePath, destination)
      : await dependencies.extractTar(archivePath, destination);
  } catch {
    throw new SetupError(
      'The CommerceKit release archive could not be extracted.',
    );
  }
}

async function downloadArchive(
  release: VerifiedReleaseMetadata,
  temporaryDirectory: string,
  dependencies: InstallDependencies,
): Promise<string> {
  const archivePath = join(temporaryDirectory, release.artifact.filename);
  try {
    await dependencies.downloadFile(release.archiveUrl, archivePath);
  } catch {
    throw new SetupError(
      `Could not download ${release.artifact.filename} from the exact CommerceKit release.`,
    );
  }
  const archiveStatus = await stat(archivePath);
  if (archiveStatus.size !== release.artifact.size) {
    throw new SetupError(
      `Downloaded size verification failed for ${release.artifact.filename}.`,
    );
  }
  dependencies.log('Verifying SHA-256');
  await verifyFileSha256(
    archivePath,
    release.artifact.sha256,
    release.artifact.filename,
  );
  return archivePath;
}

export async function installCommerceKit(
  version: string,
  target: TargetDefinition,
  overrides: Partial<InstallDependencies> = {},
): Promise<InstallResult> {
  const dependencies = { ...defaultDependencies, ...overrides };
  const cachedDirectory = dependencies.findTool(
    TOOL_NAME,
    version,
    target.target,
  );
  if (cachedDirectory.length > 0) {
    dependencies.log(`Using cached CommerceKit CLI ${version}`);
    return verifyCacheHit(cachedDirectory, version, target, dependencies);
  }

  await mkdir(dependencies.runnerTemp, { recursive: true });
  const temporaryDirectory = await mkdtemp(
    join(dependencies.runnerTemp, 'setup-commercekit-'),
  );

  try {
    dependencies.log('Verifying release metadata');
    const release = await dependencies.resolveMetadata(
      version,
      target.target,
      temporaryDirectory,
      dependencies.downloadFile,
    );

    dependencies.log(`Downloading ${release.artifact.filename}`);
    const archivePath = await downloadArchive(
      release,
      temporaryDirectory,
      dependencies,
    );

    const extractionDirectory = join(temporaryDirectory, 'extracted');
    await mkdir(extractionDirectory, { recursive: true });
    const extractedRoot = await extractArchive(
      archivePath,
      extractionDirectory,
      target,
      dependencies,
    );
    const extractedExecutable = await findExecutable(
      extractedRoot,
      target.executableName,
    );
    if (target.platform !== 'win32') {
      await chmod(extractedExecutable, 0o755);
    }
    await dependencies.verifyExecutable(extractedExecutable, version);

    const cacheMetadata: CacheMetadata = {
      schemaVersion: 1,
      cliVersion: version,
      target: target.target,
      buildId: release.manifest.buildId,
      archiveSha256: release.artifact.sha256,
    };
    await writeFile(
      join(extractedRoot, CACHE_METADATA_FILENAME),
      `${JSON.stringify(cacheMetadata)}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );

    const installedDirectory = await dependencies.cacheDirectory(
      extractedRoot,
      TOOL_NAME,
      version,
      target.target,
    );
    const installedExecutable = await findExecutable(
      installedDirectory,
      target.executableName,
    );
    await dependencies.verifyExecutable(installedExecutable, version);

    return {
      version,
      executablePath: installedExecutable,
      target: target.target,
      buildId: release.manifest.buildId,
      cacheHit: false,
      archiveFilename: release.artifact.filename,
      archiveSha256: release.artifact.sha256,
    };
  } finally {
    try {
      await rm(temporaryDirectory, { recursive: true, force: true });
    } catch {
      dependencies.debug('Temporary setup directory cleanup did not complete.');
    }
  }
}

export function executableDirectory(result: InstallResult): string {
  return dirname(result.executablePath);
}
