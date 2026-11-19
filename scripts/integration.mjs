import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parseNotificationEventJson } from '@commercekit-tools/notification-contract';
import { assertSuccessfulSetupEvent } from './assert-reporting.mjs';

const VERSION = '0.1.0-preview.2';
const root = new URL('..', import.meta.url);

function runAction(environment, expectedExitCode = 0) {
  const result = spawnSync(process.execPath, ['dist/index.js'], {
    cwd: root,
    encoding: 'utf8',
    env: environment,
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== expectedExitCode) {
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
  const firstSummary = join(directory, 'first-summary');
  await writeFile(firstOutput, '');
  await writeFile(firstSummary, '');
  runAction({
    ...baseEnvironment,
    GITHUB_OUTPUT: firstOutput,
    GITHUB_STEP_SUMMARY: firstSummary,
  });
  const first = parseFileCommands(await readFile(firstOutput, 'utf8'));
  if (first.get('cache-hit') !== 'false') {
    throw new Error('First isolated invocation was not a cache miss.');
  }

  const secondOutput = join(directory, 'second-output');
  const secondSummary = join(directory, 'second-summary');
  await writeFile(secondOutput, '');
  await writeFile(secondSummary, '');
  runAction({
    ...baseEnvironment,
    GITHUB_OUTPUT: secondOutput,
    GITHUB_STEP_SUMMARY: secondSummary,
  });
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

  for (const [output, summaryFile, expectedCacheHit] of [
    [first, firstSummary, false],
    [second, secondSummary, true],
  ]) {
    const event = parseNotificationEventJson(output.get('notification-event'));
    assertSuccessfulSetupEvent(event, {
      version: VERSION,
      target: output.get('target'),
      buildId: output.get('build-id'),
      cacheHit: expectedCacheHit,
      privatePaths: [directory],
    });
    const summary = await readFile(summaryFile, 'utf8');
    for (const detail of [
      '✅',
      'Succeeded',
      'Inputs',
      VERSION,
      output.get('target'),
      output.get('build-id'),
    ])
      assert(summary.includes(detail));
    assert(!summary.includes(directory));
  }

  const failedOutput = join(directory, 'failed-output');
  const failedSummary = join(directory, 'failed-summary');
  await writeFile(failedOutput, '');
  await writeFile(failedSummary, '');
  const invalidToken = ['eyJsynthetic', 'payload', 'signature'].join('.');
  const failedLogs = runAction(
    {
      ...baseEnvironment,
      INPUT_VERSION: invalidToken,
      GITHUB_OUTPUT: failedOutput,
      GITHUB_STEP_SUMMARY: failedSummary,
    },
    1,
  );
  const failed = parseFileCommands(await readFile(failedOutput, 'utf8'));
  const failureEvent = parseNotificationEventJson(
    failed.get('notification-event'),
  );
  assert.equal(failureEvent.eventType, 'commercekit.setup.completed');
  assert.equal(failureEvent.status, 'failure');
  assert.equal(failureEvent.data.inputsValidated, false);
  assert.deepEqual(failureEvent.data.inputs, { version: '[REDACTED]' });
  assert.equal(failureEvent.data.error.code, 'invalid-input');
  assert.equal(failed.get('version'), undefined);
  const failureSummary = await readFile(failedSummary, 'utf8');
  assert(failureSummary.includes('❌') && failureSummary.includes('Failed'));
  assert(!JSON.stringify(failureEvent).includes(invalidToken));
  assert(!failureSummary.includes(invalidToken));
  assert(!failedLogs.includes(invalidToken));

  process.stdout.write(
    `${JSON.stringify(
      {
        version: second.get('version'),
        target: second.get('target'),
        buildId: second.get('build-id'),
        cacheHit: second.get('cache-hit'),
        notificationContextsVerified: true,
        summariesVerified: true,
        handledFailureVerified: true,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
