import semver from 'semver';

import { assertSafeAssetFilename, isSha256 } from './checksums.js';
import { SetupError } from './errors.js';
import {
  isReleaseTarget,
  TARGET_DEFINITIONS,
  type ReleaseArchitecture,
  type ReleaseOperatingSystem,
  type ReleaseTarget,
} from './platform.js';

export const SUPPORTED_MANIFEST_SCHEMA_VERSION = 1;

export interface ReleaseArtifact {
  readonly target: ReleaseTarget;
  readonly os: ReleaseOperatingSystem;
  readonly architecture: ReleaseArchitecture;
  readonly filename: string;
  readonly sha256: string;
  readonly size: number;
}

export interface ReleaseManifest {
  readonly schemaVersion: 1;
  readonly product: 'commercekit-cli';
  readonly cliVersion: string;
  readonly buildId: string;
  readonly channel: string;
  readonly unsigned: boolean;
  readonly artifacts: readonly ReleaseArtifact[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  value: unknown,
  field: string,
  pattern?: RegExp,
): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    (pattern !== undefined && !pattern.test(value))
  ) {
    throw new SetupError(`Release manifest field ${field} is invalid.`);
  }
  return value;
}

function parseArtifact(
  value: unknown,
  version: string,
  seenTargets: Set<ReleaseTarget>,
): ReleaseArtifact {
  if (!isRecord(value)) {
    throw new SetupError(
      'Release manifest contains an invalid artifact entry.',
    );
  }

  const targetValue = requireString(value['target'], 'artifacts[].target');
  if (!isReleaseTarget(targetValue)) {
    throw new SetupError(
      `Release manifest contains unsupported target ${targetValue}.`,
    );
  }
  if (seenTargets.has(targetValue)) {
    throw new SetupError(
      `Release manifest contains duplicate target ${targetValue}.`,
    );
  }
  seenTargets.add(targetValue);

  const definition = TARGET_DEFINITIONS[targetValue];
  const os = requireString(value['os'], `artifacts[${targetValue}].os`);
  const architecture = requireString(
    value['architecture'],
    `artifacts[${targetValue}].architecture`,
  );
  if (os !== definition.os || architecture !== definition.architecture) {
    throw new SetupError(
      `Release manifest target metadata is inconsistent for ${targetValue}.`,
    );
  }

  const filename = requireString(
    value['filename'],
    `artifacts[${targetValue}].filename`,
  );
  assertSafeAssetFilename(filename);
  const expectedFilename = `commercekit-v${version}-${targetValue}${definition.archiveExtension}`;
  if (filename !== expectedFilename) {
    throw new SetupError(
      `Release manifest filename is invalid for target ${targetValue}.`,
    );
  }

  const sha256 = requireString(
    value['sha256'],
    `artifacts[${targetValue}].sha256`,
  ).toLowerCase();
  if (!isSha256(sha256)) {
    throw new SetupError(
      `Release manifest SHA-256 is invalid for target ${targetValue}.`,
    );
  }

  const size = value['size'];
  if (typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0) {
    throw new SetupError(
      `Release manifest size is invalid for target ${targetValue}.`,
    );
  }

  return Object.freeze({
    target: targetValue,
    os: definition.os,
    architecture: definition.architecture,
    filename,
    sha256,
    size,
  });
}

export function parseReleaseManifest(
  content: string,
  requestedVersion?: string,
): ReleaseManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new SetupError('CommerceKit release manifest is not valid JSON.');
  }
  if (!isRecord(parsed)) {
    throw new SetupError('CommerceKit release manifest must be a JSON object.');
  }

  const schemaVersion = parsed['schemaVersion'];
  if (schemaVersion !== SUPPORTED_MANIFEST_SCHEMA_VERSION) {
    const displayed =
      typeof schemaVersion === 'number' || typeof schemaVersion === 'string'
        ? String(schemaVersion)
        : 'unknown';
    throw new SetupError(
      `CommerceKit release manifest schema ${displayed} is not supported by setup-commercekit v1. Upgrade the setup Action to a version that supports this manifest.`,
    );
  }
  if (parsed['product'] !== 'commercekit-cli') {
    throw new SetupError('Release manifest product is not commercekit-cli.');
  }
  const cliVersion = requireString(parsed['cliVersion'], 'cliVersion');
  if (semver.valid(cliVersion) !== cliVersion) {
    throw new SetupError('Release manifest field cliVersion is invalid.');
  }
  if (requestedVersion !== undefined && cliVersion !== requestedVersion) {
    throw new SetupError(
      `Release manifest version does not match requested CommerceKit CLI ${requestedVersion}.`,
    );
  }

  const buildId = requireString(
    parsed['buildId'],
    'buildId',
    /^[0-9a-f]{40}$/iu,
  ).toLowerCase();
  const channel = requireString(
    parsed['channel'],
    'channel',
    /^[a-z][a-z0-9-]{0,31}$/u,
  );
  if (typeof parsed['unsigned'] !== 'boolean') {
    throw new SetupError('Release manifest field unsigned is invalid.');
  }
  if (!Array.isArray(parsed['artifacts']) || parsed['artifacts'].length === 0) {
    throw new SetupError('Release manifest does not contain any artifacts.');
  }

  const seenTargets = new Set<ReleaseTarget>();
  const artifacts = parsed['artifacts'].map((artifact) =>
    parseArtifact(artifact, cliVersion, seenTargets),
  );

  return Object.freeze({
    schemaVersion: SUPPORTED_MANIFEST_SCHEMA_VERSION,
    product: 'commercekit-cli',
    cliVersion,
    buildId,
    channel,
    unsigned: parsed['unsigned'],
    artifacts: Object.freeze(artifacts),
  });
}

export function findManifestArtifact(
  manifest: ReleaseManifest,
  target: ReleaseTarget,
): ReleaseArtifact {
  const artifact = manifest.artifacts.find((entry) => entry.target === target);
  if (artifact === undefined) {
    throw new SetupError(
      `CommerceKit CLI ${manifest.cliVersion} does not publish target ${target}.`,
    );
  }
  return artifact;
}
