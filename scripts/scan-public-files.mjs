import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const tracked = spawnSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
});
if (tracked.error) throw tracked.error;
if (tracked.status !== 0) process.exit(tracked.status ?? 1);

const patterns = [
  { label: 'local user path', pattern: /\/Users\/anil\//u },
  {
    label: 'GitHub personal access token',
    pattern: /(?:github_pat_|ghp_)[A-Za-z0-9_]{20,}/u,
  },
  { label: 'private key', pattern: /BEGIN [A-Z ]*PRIVATE KEY/u },
  {
    label: 'private source repository',
    pattern: /commercekit-tools\/commercekit(?:\.git|\/|\b)/u,
  },
  {
    label: 'synthetic secret marker',
    pattern: /CK_(?:PRIVATE|JSON)_[A-Z0-9_]+/u,
  },
];

const failures = [];
for (const filename of tracked.stdout.split('\0').filter(Boolean)) {
  let content;
  try {
    content = readFileSync(new URL(filename, root), 'utf8');
  } catch {
    continue;
  }
  for (const { label, pattern } of patterns) {
    if (pattern.test(content)) failures.push(`${filename}: ${label}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Public source scan failed:\n${failures.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write('Public source scan passed.\n');
