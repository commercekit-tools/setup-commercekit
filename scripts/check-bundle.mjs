import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pnpmEntry = process.env['npm_execpath'];
if (pnpmEntry?.includes('pnpm')) {
  run(process.execPath, [pnpmEntry, 'bundle']);
} else {
  run('corepack', ['pnpm', 'bundle']);
}

const status = spawnSync('git', ['status', '--porcelain=v1', '--', 'dist'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
});
if (status.error) throw status.error;
if (status.status !== 0) process.exit(status.status ?? 1);
if (status.stdout.trim().length > 0) {
  process.stderr.write('Committed dist does not match the bundled source.\n');
  process.stderr.write(status.stdout);
  process.exit(1);
}
