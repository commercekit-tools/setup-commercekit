import { existsSync } from 'node:fs';
import { delimiter, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function run(executable, args) {
  const result = spawnSync(executable, args, {
    encoding: 'utf8',
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${executable} ${args.join(' ')} failed.`);
  }
  return result.stdout.trim();
}

const version = requireEnvironment('CK_VERSION');
const executablePath = requireEnvironment('CK_PATH');
const target = requireEnvironment('CK_TARGET');
const buildId = requireEnvironment('CK_BUILD_ID');
const cacheHit = requireEnvironment('CK_CACHE_HIT');
const expectedTarget = requireEnvironment('CK_EXPECTED_TARGET');
const expectedCacheHit = requireEnvironment('CK_EXPECTED_CACHE_HIT');

if (!existsSync(executablePath))
  throw new Error('Action output path is missing.');
if (version !== '0.1.0-preview.2')
  throw new Error('Unexpected version output.');
if (target !== expectedTarget) throw new Error('Unexpected target output.');
if (!/^[0-9a-f]{40}$/u.test(buildId))
  throw new Error('Invalid build ID output.');
if (cacheHit !== expectedCacheHit)
  throw new Error('Unexpected cache-hit output.');
if (!process.env.PATH?.split(delimiter).includes(dirname(executablePath))) {
  throw new Error('CommerceKit executable directory is missing from PATH.');
}

if (run(executablePath, ['--version']) !== version) {
  throw new Error('Exact executable version verification failed.');
}
run(executablePath, ['--help']);
run(executablePath, ['cron', 'explain', '0 0 2 * * ?']);
if (run('commercekit', ['--version']) !== version) {
  throw new Error('CommerceKit was not added to PATH.');
}

process.stdout.write(`Verified ${version} for ${target}.\n`);
