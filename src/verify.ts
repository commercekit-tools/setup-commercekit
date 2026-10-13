import { execFile } from 'node:child_process';
import { lstat } from 'node:fs/promises';

import { SetupError } from './errors.js';

export type ExecuteFile = (
  executablePath: string,
  arguments_: readonly string[],
) => Promise<{ readonly stdout: string; readonly stderr: string }>;

const executeFile: ExecuteFile = (executablePath, arguments_) =>
  new Promise((resolve, reject) => {
    execFile(
      executablePath,
      [...arguments_],
      { timeout: 30_000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(
            error instanceof Error ? error : new Error('Execution failed.'),
          );
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });

export async function verifyExecutableVersion(
  executablePath: string,
  expectedVersion: string,
  runFile: ExecuteFile = executeFile,
): Promise<void> {
  let fileStatus;
  try {
    fileStatus = await lstat(executablePath);
  } catch {
    throw new SetupError('The CommerceKit executable is missing.');
  }
  if (!fileStatus.isFile() || fileStatus.isSymbolicLink()) {
    throw new SetupError('The CommerceKit executable is not a regular file.');
  }

  let stdout: string;
  try {
    ({ stdout } = await runFile(executablePath, ['--version']));
  } catch {
    throw new SetupError('The CommerceKit executable could not be started.');
  }

  if (stdout.trim() !== expectedVersion) {
    throw new SetupError(
      `The installed CommerceKit executable did not report expected version ${expectedVersion}.`,
    );
  }
}
