import assert from 'node:assert/strict';

/** Shared by the isolated bundle integration and the native hosted verifier. */
export function assertSuccessfulSetupEvent(
  event,
  { version, target, buildId, cacheHit, privatePaths = [] },
) {
  assert.equal(event.eventType, 'commercekit.setup.completed');
  assert.equal(event.status, 'success');
  assert.equal(event.source.component, 'setup-commercekit');
  assert.equal(event.data.version, version);
  assert.equal(event.data.target, target);
  assert.equal(event.data.buildId, buildId);
  assert.equal(event.data.cacheHit, cacheHit);
  assert.equal(event.data.inputsValidated, true);
  assert.equal(event.data.inputsTruncated, false);
  assert.deepEqual(event.data.inputs, { version });
  assert(
    Number.isSafeInteger(event.data.durationMs) && event.data.durationMs >= 0,
  );
  const json = JSON.stringify(event);
  for (const path of privatePaths)
    assert(
      !json.includes(path),
      'Setup event contains a private runtime path.',
    );
}
