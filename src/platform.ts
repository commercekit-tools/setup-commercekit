import { SetupError } from './errors.js';

export const SUPPORTED_TARGETS = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'windows-arm64',
  'windows-x64',
] as const;

export type ReleaseTarget = (typeof SUPPORTED_TARGETS)[number];
export type ReleaseOperatingSystem = 'darwin' | 'linux' | 'windows';
export type ReleaseArchitecture = 'arm64' | 'x64';

export interface TargetDefinition {
  readonly target: ReleaseTarget;
  readonly platform: 'darwin' | 'linux' | 'win32';
  readonly os: ReleaseOperatingSystem;
  readonly architecture: ReleaseArchitecture;
  readonly archiveExtension: '.tar.gz' | '.zip';
  readonly executableName: 'commercekit' | 'commercekit.exe';
}

export const TARGET_DEFINITIONS: Readonly<
  Record<ReleaseTarget, TargetDefinition>
> = Object.freeze({
  'darwin-arm64': Object.freeze({
    target: 'darwin-arm64',
    platform: 'darwin',
    os: 'darwin',
    architecture: 'arm64',
    archiveExtension: '.tar.gz',
    executableName: 'commercekit',
  }),
  'darwin-x64': Object.freeze({
    target: 'darwin-x64',
    platform: 'darwin',
    os: 'darwin',
    architecture: 'x64',
    archiveExtension: '.tar.gz',
    executableName: 'commercekit',
  }),
  'linux-arm64': Object.freeze({
    target: 'linux-arm64',
    platform: 'linux',
    os: 'linux',
    architecture: 'arm64',
    archiveExtension: '.tar.gz',
    executableName: 'commercekit',
  }),
  'linux-x64': Object.freeze({
    target: 'linux-x64',
    platform: 'linux',
    os: 'linux',
    architecture: 'x64',
    archiveExtension: '.tar.gz',
    executableName: 'commercekit',
  }),
  'windows-arm64': Object.freeze({
    target: 'windows-arm64',
    platform: 'win32',
    os: 'windows',
    architecture: 'arm64',
    archiveExtension: '.zip',
    executableName: 'commercekit.exe',
  }),
  'windows-x64': Object.freeze({
    target: 'windows-x64',
    platform: 'win32',
    os: 'windows',
    architecture: 'x64',
    archiveExtension: '.zip',
    executableName: 'commercekit.exe',
  }),
});

const TARGET_BY_RUNNER = new Map<string, ReleaseTarget>(
  SUPPORTED_TARGETS.map((target) => {
    const definition = TARGET_DEFINITIONS[target];
    return [`${definition.platform}:${definition.architecture}`, target];
  }),
);

export function resolveTarget(
  platform: string = process.platform,
  architecture: string = process.arch,
): TargetDefinition {
  const target = TARGET_BY_RUNNER.get(`${platform}:${architecture}`);
  if (target === undefined) {
    throw new SetupError(
      `Runner platform ${platform}/${architecture} is not supported by Setup CommerceKit CLI.`,
    );
  }
  return TARGET_DEFINITIONS[target];
}

export function isReleaseTarget(value: string): value is ReleaseTarget {
  return Object.hasOwn(TARGET_DEFINITIONS, value);
}
