import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { delimiter, dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { assertSuccessfulSetupEvent } from '../scripts/assert-reporting.mjs';

const expected = {
  version: '0.1.0-preview.2',
  target: 'linux-x64',
  buildId: 'a'.repeat(40),
  cacheHit: false,
};

function event(cacheHit = false) {
  return {
    eventType: 'commercekit.setup.completed',
    status: 'success',
    source: { component: 'setup-commercekit' },
    data: {
      ...expected,
      cacheHit,
      inputsValidated: true,
      inputsTruncated: false,
      inputs: { version: expected.version },
      durationMs: 0,
    },
  };
}

test('native and isolated bundle checks accept both fresh and cached setup reports', () => {
  for (const cacheHit of [false, true])
    assert.doesNotThrow(() =>
      assertSuccessfulSetupEvent(event(cacheHit), { ...expected, cacheHit }),
    );
});

test('missing or inconsistent setup facts cannot pass hosted reporting verification', () => {
  for (const mutate of [
    (value) => {
      value.eventType = 'ccv2.build.completed';
    },
    (value) => {
      value.status = 'failure';
    },
    (value) => {
      value.source.component = 'another-action';
    },
    (value) => {
      delete value.data.version;
    },
    (value) => {
      value.data.target = 'darwin-arm64';
    },
    (value) => {
      value.data.buildId = 'b'.repeat(40);
    },
    (value) => {
      value.data.cacheHit = true;
    },
    (value) => {
      value.data.inputsValidated = false;
    },
    (value) => {
      value.data.inputsTruncated = true;
    },
    (value) => {
      value.data.inputs.extra = 'unexpected';
    },
    (value) => {
      value.data.durationMs = -1;
    },
    (value) => {
      value.data.durationMs = 0.5;
    },
  ]) {
    const invalid = event();
    mutate(invalid);
    assert.throws(() => assertSuccessfulSetupEvent(invalid, expected));
  }
  assert.throws(() => assertSuccessfulSetupEvent({}, expected));
});

test('private runtime paths fail without echoing the private value', () => {
  const invalid = event();
  invalid.detail = '/synthetic/private/tool-cache/commercekit';
  assert.throws(
    () =>
      assertSuccessfulSetupEvent(invalid, {
        ...expected,
        privatePaths: ['/synthetic/private'],
      }),
    (error) => {
      assert.equal(
        error.message,
        'Setup event contains a private runtime path.',
      );
      assert(!error.message.includes('/synthetic/private'));
      return true;
    },
  );
});

test('the hosted verifier rejects either missing or malformed output with a safe diagnostic', () => {
  for (const [name, raw] of [
    ['CK_FIRST_NOTIFICATION_EVENT', ''],
    ['CK_FIRST_NOTIFICATION_EVENT', 'synthetic-private-value-not-json'],
    ['CK_NOTIFICATION_EVENT', ''],
    ['CK_NOTIFICATION_EVENT', 'synthetic-private-value-not-json'],
  ]) {
    const result = spawnSync(process.execPath, ['scripts/verify-action.mjs'], {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
        CK_VERSION: expected.version,
        CK_PATH: process.execPath,
        CK_TARGET: expected.target,
        CK_EXPECTED_TARGET: expected.target,
        CK_BUILD_ID: expected.buildId,
        CK_CACHE_HIT: 'true',
        CK_EXPECTED_CACHE_HIT: 'true',
        CK_FIRST_CACHE_HIT: 'false',
        CK_FIRST_NOTIFICATION_EVENT: JSON.stringify(event()),
        CK_NOTIFICATION_EVENT: JSON.stringify(event(true)),
        [name]: raw,
      },
    });
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Setup notification output is missing or invalid JSON/,
    );
    assert(!result.stderr.includes('synthetic-private-value-not-json'));
  }
});
