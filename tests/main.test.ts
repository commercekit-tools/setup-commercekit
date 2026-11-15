import { join } from 'node:path';

import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseNotificationEventJson } from '@commercekit-tools/notification-contract';

import { runAction } from '../src/main.js';
import { resolveTarget } from '../src/platform.js';
import { SetupError } from '../src/errors.js';
import { reportSetup } from '../src/reporting.js';

vi.mock('@actions/core', () => ({
  addPath: vi.fn(),
  debug: vi.fn(),
  getInput: vi.fn(() => '0.1.0-preview.2'),
  info: vi.fn(),
  setOutput: vi.fn(),
  setSecret: vi.fn(),
  warning: vi.fn(),
  summary: {
    addRaw: vi.fn().mockReturnThis(),
    write: vi.fn(async () => undefined),
  },
}));

describe('runAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(core.getInput).mockReset().mockReturnValue('0.1.0-preview.2');
    vi.mocked(core.setOutput).mockReset();
    vi.mocked(core.summary.addRaw).mockReset().mockReturnValue(core.summary);
    vi.mocked(core.summary.write).mockReset().mockResolvedValue(core.summary);
  });
  afterEach(() => vi.restoreAllMocks());

  it('adds the executable directory and sets trusted outputs', async () => {
    const executablePath = join('/tool-cache', 'commercekit');
    const target = resolveTarget();
    const install = vi.fn(async () => ({
      version: '0.1.0-preview.2',
      executablePath,
      target: target.target,
      buildId: 'b'.repeat(40),
      cacheHit: true,
    }));

    await runAction({ install });

    expect(install).toHaveBeenCalledWith(
      '0.1.0-preview.2',
      target,
      expect.any(Object),
    );
    expect(core.addPath).toHaveBeenCalledWith('/tool-cache');
    expect(core.setOutput).toHaveBeenCalledWith('version', '0.1.0-preview.2');
    expect(core.setOutput).toHaveBeenCalledWith('path', executablePath);
    expect(core.setOutput).toHaveBeenCalledWith('target', target.target);
    expect(core.setOutput).toHaveBeenCalledWith('build-id', 'b'.repeat(40));
    expect(core.setOutput).toHaveBeenCalledWith('cache-hit', 'true');
    expect(core.getInput).toHaveBeenCalledTimes(1);
    const event = notification();
    expect(event.status).toBe('success');
    expect(event.data).toMatchObject({
      version: '0.1.0-preview.2',
      target: target.target,
      buildId: 'b'.repeat(40),
      cacheHit: true,
      inputs: { version: '0.1.0-preview.2' },
      inputsValidated: true,
      inputsTruncated: false,
    });
    expect(event.data).not.toHaveProperty('path');
    expect(summary()).toContain('✅');
    expect(summary()).toContain('Succeeded');
    expect(summary()).toContain('|');
    expect(summary()).toContain('Verified CLI version');
    expect(summary()).toContain('0.1.0-preview.2');
    expect(summary()).not.toContain(executablePath);
    expect(core.warning).not.toHaveBeenCalled();
  });

  it('resolves the latest stable version when the input is omitted', async () => {
    vi.mocked(core.getInput).mockReturnValueOnce('');
    const target = resolveTarget();
    const resolveVersion = vi.fn(async () => '1.0.0');
    const install = vi.fn(async () => ({
      version: '1.0.0',
      executablePath: join('/tool-cache', 'commercekit'),
      target: target.target,
      buildId: 'c'.repeat(40),
      cacheHit: false,
    }));

    await runAction({ install, resolveVersion });

    expect(resolveVersion).toHaveBeenCalledWith(undefined, undefined);
    expect(install).toHaveBeenCalledWith('1.0.0', target, expect.any(Object));
    expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.0');
    expect(notification().data).toMatchObject({
      requestedVersion: 'latest',
      inputs: { version: 'latest' },
      inputsValidated: true,
      cacheHit: false,
    });
  });

  it('resolves the latest stable version when explicitly requested', async () => {
    vi.mocked(core.getInput).mockReturnValueOnce('latest');
    const target = resolveTarget();
    const resolveVersion = vi.fn(async () => '1.0.0');
    const install = vi.fn(async () => ({
      version: '1.0.0',
      executablePath: join('/tool-cache', 'commercekit'),
      target: target.target,
      buildId: 'd'.repeat(40),
      cacheHit: false,
    }));

    await runAction({ install, resolveVersion });

    expect(resolveVersion).toHaveBeenCalledWith('latest', undefined);
    expect(install).toHaveBeenCalledWith('1.0.0', target, expect.any(Object));
    expect(core.info).toHaveBeenCalledWith(
      'Resolving latest stable CommerceKit CLI',
    );
    expect(core.info).toHaveBeenCalledWith(
      'Resolved latest stable CommerceKit CLI 1.0.0',
    );
  });

  it('shares the safe workflow reference between the event and summary without reading unrelated environment values', async () => {
    const accessed: string[] = [];
    const values: Record<string, string | undefined> = {
      GITHUB_REPOSITORY: 'synthetic/setup',
      GITHUB_RUN_ID: '42',
      GITHUB_SERVER_URL: 'https://github.example.test',
      GITHUB_WORKFLOW: 'Setup integration',
      GITHUB_ACTOR: 'synthetic-actor',
    };
    const env = new Proxy(values, {
      get: (target, name: string) => {
        accessed.push(name);
        return target[name];
      },
    });
    await reportSetup(
      {
        rawInputs: { version: 'latest' },
        inputsValidated: true,
        requestedVersion: 'latest',
        failed: false,
        occurredAt: '2026-11-14T12:00:00Z',
        durationMs: 1,
      },
      env,
    );
    expect(notification().context).toMatchObject({
      repository: 'synthetic/setup',
      runUrl: 'https://github.example.test/synthetic/setup/actions/runs/42',
    });
    expect(summary()).toContain(
      'https://github.example.test/synthetic/setup/actions/runs/42',
    );
    expect(accessed).not.toContain('GITHUB_TOKEN');
    expect(accessed).not.toContain('UNRELATED_SECRET');
    expect(accessed.every((name) => name.startsWith('GITHUB_'))).toBe(true);
  });

  it('omits unsafe workflow URLs and redacts untrusted display metadata in event and summary', async () => {
    const token = ['eyJsynthetic', 'payload', 'signature'].join('.');
    await reportSetup(
      {
        rawInputs: { version: 'latest' },
        inputsValidated: true,
        requestedVersion: 'latest',
        target: token,
        result: {
          version: token,
          target: 'darwin-arm64',
          buildId:
            'https://user:password@invalid.example.test/metadata?private=yes',
          cacheHit: false,
          executablePath: '/private/tool-cache/commercekit',
        },
        failed: false,
        occurredAt: '2026-11-14T12:00:00Z',
        durationMs: 1,
      },
      {
        GITHUB_REPOSITORY: 'synthetic/setup',
        GITHUB_RUN_ID: '42',
        GITHUB_SERVER_URL: 'https://user:password@github.example.test',
      },
    );
    const event = notification();
    expect(event.context?.runUrl).toBeUndefined();
    expect(event.data).toMatchObject({
      version: '[REDACTED]',
      target: '[REDACTED]',
      buildId: '[REDACTED URL]',
    });
    const text = JSON.stringify(event) + summary();
    for (const value of [
      token,
      'user:password',
      'private=yes',
      '/private/tool-cache/commercekit',
    ])
      expect(text).not.toContain(value);
  });

  it('reports invalid input without starting installation or exposing token-like values', async () => {
    const token = ['eyJsynthetic', 'payload', 'signature'].join('.');
    vi.mocked(core.getInput).mockReturnValueOnce(token);
    const install = vi.fn();
    await expect(runAction({ install })).rejects.toThrow(
      'version input must be',
    );
    expect(install).not.toHaveBeenCalled();
    expect(core.setOutput).not.toHaveBeenCalledWith(
      'version',
      expect.anything(),
    );
    const event = notification();
    expect(event.status).toBe('failure');
    expect(event.data.inputsValidated).toBe(false);
    expect(event.data.inputs?.['version']).toBe('[REDACTED]');
    expect(event.data.error).toMatchObject({ code: 'invalid-input' });
    expect(JSON.stringify(event)).not.toContain(token);
    expect(summary()).toContain('❌');
    expect(summary()).toContain('Failed');
    expect(summary()).not.toContain(token);
  });

  it('masks credentials, query and fragment in an invalid version URL', async () => {
    vi.mocked(core.getInput).mockReturnValueOnce(
      'https://synthetic-user:synthetic-password@invalid.example.test/asset?private-value=yes#private-fragment',
    );
    await expect(runAction({ install: vi.fn() })).rejects.toThrow(
      'version input must be',
    );
    const rendered = JSON.stringify(notification()) + summary();
    for (const secret of [
      'synthetic-user',
      'synthetic-password',
      'private-value',
      'private-fragment',
    ])
      expect(rendered).not.toContain(secret);
  });

  it('reports checked installation errors while preserving the original failure', async () => {
    const failure = new SetupError('Archive checksum mismatch.');
    const install = vi.fn(async () => {
      throw failure;
    });
    const now = vi
      .fn()
      .mockReturnValueOnce(Date.parse('2026-11-14T12:00:00Z'))
      .mockReturnValueOnce(Date.parse('2026-11-14T12:00:00.125Z'));
    await expect(runAction({ install, now })).rejects.toBe(failure);
    const event = notification();
    expect(event).toMatchObject({
      eventType: 'commercekit.setup.completed',
      status: 'failure',
      occurredAt: '2026-11-14T12:00:00.000Z',
      source: { component: 'setup-commercekit' },
      data: {
        requestedVersion: '0.1.0-preview.2',
        target: resolveTarget().target,
        inputsValidated: true,
        durationMs: 125,
        error: { code: 'setup-failed', message: 'Archive checksum mismatch.' },
      },
    });
    expect(event.data).not.toHaveProperty('version');
    expect(event.data).not.toHaveProperty('buildId');
    expect(summary()).toContain('Archive checksum mismatch.');
    expect(core.summary.write).toHaveBeenCalledOnce();
  });

  it('does not expose arbitrary download/runtime exceptions', async () => {
    const failure = new Error('private-network-payload');
    await expect(
      runAction({
        install: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    expect(JSON.stringify(notification())).not.toContain(
      'private-network-payload',
    );
    expect(summary()).not.toContain('private-network-payload');
    expect(notification().data.error?.message).toContain('failed unexpectedly');
  });

  it('reports latest-version discovery failure before installation', async () => {
    vi.mocked(core.getInput).mockReturnValueOnce('');
    const install = vi.fn();
    const failure = new SetupError(
      'No stable CommerceKit release is available.',
    );
    await expect(
      runAction({
        install,
        resolveVersion: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    expect(install).not.toHaveBeenCalled();
    expect(notification().status).toBe('failure');
    expect(notification().data.inputs).toEqual({ version: 'latest' });
    expect(summary()).toContain('No stable CommerceKit release is available.');
  });

  it('preserves a thrown undefined value as failure rather than reporting success', async () => {
    await expect(
      runAction({
        install: vi.fn().mockRejectedValueOnce(undefined),
      }),
    ).rejects.toBeUndefined();
    expect(notification().status).toBe('failure');
    expect(notification().data.error?.message).toContain('failed unexpectedly');
  });

  it('keeps notification output when writing the summary fails', async () => {
    vi.mocked(core.summary.write).mockRejectedValueOnce(
      new Error('private-summary-error'),
    );
    await expect(
      runAction({ install: verifiedInstall }),
    ).resolves.toBeUndefined();
    expect(notification().status).toBe('success');
    expect(core.warning).toHaveBeenCalledWith(
      'Setup job summary could not be written; the installation outcome is preserved.',
    );
    expect(JSON.stringify(vi.mocked(core.warning).mock.calls)).not.toContain(
      'private-summary-error',
    );
  });

  it('keeps the original installation failure if notification and summary writing both fail', async () => {
    const failure = new SetupError('Executable verification failed.');
    vi.mocked(core.setOutput).mockImplementation((name) => {
      if (name === 'notification-event')
        throw new Error('private-output-error');
    });
    vi.mocked(core.summary.write).mockRejectedValueOnce(
      new Error('private-summary-error'),
    );
    await expect(
      runAction({
        install: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    expect(core.warning).toHaveBeenCalledWith(
      'Setup notification could not be created; the installation outcome is preserved.',
    );
    expect(core.warning).toHaveBeenCalledWith(
      'Setup job summary could not be written; the installation outcome is preserved.',
    );
  });

  it('escapes malformed input in the failure summary and marks long input truncated', async () => {
    vi.mocked(core.getInput).mockReturnValueOnce(
      '<script>private</script> | injected\n' + 'a'.repeat(400),
    );
    await expect(runAction({ install: vi.fn() })).rejects.toThrow(
      'version input must be',
    );
    expect(notification().data.inputsTruncated).toBe(true);
    expect(notification().data.inputs?.['version']?.length).toBeLessThanOrEqual(
      256,
    );
    expect(summary()).not.toContain('<script>');
    expect(summary()).not.toContain('| injected\n');
  });
});

function notification() {
  const call = vi
    .mocked(core.setOutput)
    .mock.calls.find(([name]) => name === 'notification-event');
  expect(call).toBeDefined();
  const event = parseNotificationEventJson(String(call![1]));
  if (event.eventType !== 'commercekit.setup.completed')
    throw new Error('Expected setup event.');
  return event;
}
function summary(): string {
  return String(vi.mocked(core.summary.addRaw).mock.calls.at(-1)?.[0]);
}
async function verifiedInstall() {
  return {
    version: '0.1.0-preview.2',
    executablePath: join('/tool-cache', 'commercekit'),
    target: resolveTarget().target,
    buildId: 'b'.repeat(40),
    cacheHit: false,
  };
}
