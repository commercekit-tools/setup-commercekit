import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import semver from 'semver';

const require = createRequire(import.meta.url);
const eslint = createRequire(require.resolve('eslint/package.json'));
const configArray = createRequire(eslint.resolve('@eslint/config-array'));
const typescriptEslint = createRequire(
  require.resolve('typescript-eslint/package.json'),
);
const parser = createRequire(
  typescriptEslint.resolve('@typescript-eslint/parser/package.json'),
);
const estree = createRequire(
  parser.resolve('@typescript-eslint/typescript-estree/package.json'),
);

test('all three development-only minimatch paths resolve the reviewed patched line', () => {
  for (const [parent, resolveFrom] of [
    ['eslint', eslint],
    ['@eslint/config-array', configArray],
    ['@typescript-eslint/typescript-estree', estree],
  ]) {
    const { version } = resolveFrom('minimatch/package.json');
    assert(
      semver.gte(version, '11.0.1'),
      `${parent} resolved affected minimatch ${version}`,
    );
  }
});
