import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('CodeQL initialization and analysis use the same immutable action version', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/codeql.yml', import.meta.url),
    'utf8',
  );
  const actions = [
    ...workflow.matchAll(
      /uses:\s*github\/codeql-action\/(init|analyze)@([a-f0-9]{40})\b/g,
    ),
  ];
  assert.deepEqual(actions.map((action) => action[1]).sort(), [
    'analyze',
    'init',
  ]);
  assert.equal(
    new Set(actions.map((action) => action[2])).size,
    1,
    'CodeQL rejects mismatched init and analyze versions',
  );
});
