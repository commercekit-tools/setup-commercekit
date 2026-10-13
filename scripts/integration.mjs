import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '0.1.0-preview.2';
const root = new URL('..', import.meta.url);

function runAction(environment) {
  const result = spawnSync(process.execPath, ['dist/index.js'], {
    cwd: root,
    encoding: 'utf8',
    env: environment,
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error('Bundled Action integration invocation failed.');
  }
  return result.stdout;
}

function runBinary(executablePath, args) {
  const result = spawnSync(executablePath, args, {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error('Installed CommerceKit binary failed.');
  return result.stdout.trim();
}

function parseFileCommands(content) {
  const outputs = new Map();
  const lines = content.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^([^<]+)<<(.+)$/u.exec(line);
    if (!match) continue;
    const [, key, delimiter] = match;
    const values = [];
    index += 1;
    while (index < lines.length && lines[index] !== delimiter) {
      values.push(lines[index]);
      index += 1;
    }
    outputs.set(key, values.join('\n'));
  }
  return outputs;
}

const directory = await mkdtemp(
  join(tmpdir(), 'setup-commercekit-integration-'),
);
try {
  const runnerTemp = join(directory, 'runner-temp');
  const runnerToolCache = join(directory, 'tool-cache');
  const githubPath = join(directory, 'github-path');
  await writeFile(githubPath, '');
  const baseEnvironment = {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    GITHUB_PATH: githubPath,
    INPUT_VERSION: VERSION,
    RUNNER_TEMP: runnerTemp,
    RUNNER_TOOL_CACHE: runnerToolCache,
  };

  const firstOutput = join(directory, 'first-output');
  await writeFile(firstOutput, '');
  runAction({ ...baseEnvironment, GITHUB_OUTPUT: firstOutput });
  const first = parseFileCommands(await readFile(firstOutput, 'utf8'));
  if (first.get('cache-hit') !== 'false') {
    throw new Error('First isolated invocation was not a cache miss.');
  }

  const secondOutput = join(directory, 'second-output');
  await writeFile(secondOutput, '');
  runAction({ ...baseEnvironment, GITHUB_OUTPUT: secondOutput });
  const second = parseFileCommands(await readFile(secondOutput, 'utf8'));
  if (second.get('cache-hit') !== 'true') {
    throw new Error('Second isolated invocation was not a verified cache hit.');
  }

  const executablePath = second.get('path');
  if (!executablePath) throw new Error('Action did not set the path output.');
  if (runBinary(executablePath, ['--version']) !== VERSION) {
    throw new Error('Installed binary version does not match.');
  }
  runBinary(executablePath, ['--help']);

  process.stdout.write(
    `${JSON.stringify(
      {
        version: second.get('version'),
        target: second.get('target'),
        buildId: second.get('build-id'),
        cacheHit: second.get('cache-hit'),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
