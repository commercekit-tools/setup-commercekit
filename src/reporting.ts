import * as core from '@actions/core';
import {
  createActionInputContext,
  createSetupEvent,
  extractSafeGitHubContext,
  sanitizeActionText,
  redactJwtLikeTokens,
  renderActionSummary,
  sanitizeErrorMessage,
  validateNotificationEvent,
} from '@commercekit-tools/notification-contract';

import { safeErrorMessage } from './errors.js';
import type { InstallResult } from './install.js';

export const setupInputDefinitions = [{ name: 'version' }] as const;

export interface SetupOutcome {
  readonly rawInputs: Readonly<Record<string, string>>;
  readonly inputsValidated: boolean;
  readonly requestedVersion?: string;
  readonly target?: string;
  readonly result?: InstallResult;
  readonly failed: boolean;
  readonly error?: unknown;
  readonly occurredAt: string;
  readonly durationMs: number;
}

/** Shared contracts own sanitization, schema validation and summary formatting. */
export async function reportSetup(
  outcome: SetupOutcome,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const context = Object.fromEntries(
    Object.entries(extractSafeGitHubContext(env)).flatMap(([name, value]) =>
      typeof value === 'string'
        ? name === 'runUrl' && sanitizeActionText(value, 2048) !== value
          ? []
          : [[name, sanitizeActionText(value, 2048)]]
        : [[name, value]],
    ),
  );
  const inputContext = createActionInputContext(
    setupInputDefinitions,
    outcome.rawInputs,
    {
      validated: outcome.inputsValidated,
      ...(outcome.inputsValidated
        ? { effective: { version: outcome.requestedVersion ?? 'latest' } }
        : {}),
    },
  );
  const status = outcome.failed ? 'failure' : 'success';
  const error = outcome.failed
    ? {
        code: outcome.inputsValidated ? 'setup-failed' : 'invalid-input',
        message: sanitizeErrorMessage(
          redactJwtLikeTokens(safeErrorMessage(outcome.error)),
        ),
      }
    : undefined;
  const description = outcome.failed
    ? 'CommerceKit CLI setup did not complete.'
    : 'CommerceKit CLI was installed and verified.';

  try {
    const event = createSetupEvent({
      status,
      occurredAt: outcome.occurredAt,
      context,
      env: {},
      data: {
        ...inputContext,
        ...(inputContext.inputs['version']
          ? { requestedVersion: inputContext.inputs['version'] }
          : {}),
        ...(outcome.target
          ? { target: sanitizeActionText(outcome.target, 128) }
          : {}),
        ...(outcome.result
          ? {
              version: sanitizeActionText(outcome.result.version, 128),
              buildId: sanitizeActionText(outcome.result.buildId, 128),
              cacheHit: outcome.result.cacheHit,
            }
          : {}),
        durationMs: outcome.durationMs,
        ...(error ? { error } : {}),
      },
    });
    core.setOutput(
      'notification-event',
      JSON.stringify(validateNotificationEvent(event)),
    );
  } catch {
    core.warning(
      'Setup notification could not be created; the installation outcome is preserved.',
    );
  }

  try {
    const summary = renderActionSummary({
      title: 'CommerceKit CLI Setup',
      status,
      description,
      inputContext,
      facts: [
        { label: 'Duration (ms)', value: outcome.durationMs },
        ...(outcome.target ? [{ label: 'Target', value: outcome.target }] : []),
        ...(outcome.result
          ? [
              {
                label: 'Verified CLI version',
                value: sanitizeActionText(outcome.result.version, 128),
              },
              {
                label: 'Build identity',
                value: sanitizeActionText(outcome.result.buildId, 128),
              },
              { label: 'Cache reused', value: outcome.result.cacheHit },
            ]
          : []),
      ],
      ...(error ? { error } : {}),
      ...(typeof context['runUrl'] === 'string'
        ? { links: [{ label: 'View workflow', url: context['runUrl'] }] }
        : {}),
    });
    await core.summary.addRaw(summary).write();
  } catch {
    core.warning(
      'Setup job summary could not be written; the installation outcome is preserved.',
    );
  }
}
