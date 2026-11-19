#!/usr/bin/env node
/**
 * Pre-commit secret scan of staged changes. Fails closed: if gitleaks is not installed the
 * commit is blocked with install instructions, because a skipped scan looks like a passed one.
 */

import { spawnSync } from 'node:child_process';

const probe = spawnSync('gitleaks', ['version'], { stdio: 'ignore' });
if (probe.error || probe.status !== 0) {
  console.error(
    [
      '✖ gitleaks is not installed, so staged changes cannot be scanned for secrets.',
      '  Windows: winget install Gitleaks.Gitleaks',
      '  macOS:   brew install gitleaks',
      '  Linux:   https://github.com/gitleaks/gitleaks/releases (v8.30.1)',
    ].join('\n'),
  );
  process.exit(1);
}

const scan = spawnSync(
  'gitleaks',
  [
    'git',
    '--pre-commit',
    '--staged',
    '--redact',
    '--no-banner',
    '--config',
    '.gitleaks.toml',
    '--exit-code',
    '1',
  ],
  { stdio: 'inherit' },
);
process.exit(scan.status ?? 1);
