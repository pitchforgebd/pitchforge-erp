#!/usr/bin/env node
/**
 * pnpm lint:security
 *
 * 1. Bare `eslint-disable` comments (no rule names) are rejected. They silence every rule,
 *    including pitchforge/disable-needs-reason, so ESLint itself cannot catch them.
 * 2. Semgrep: custom rules in .semgrep/rules plus registry packs. Required in CI; locally it
 *    runs if `semgrep` or Docker is available and otherwise prints a warning.
 *
 * The ESLint security plugins (eslint-plugin-security, no-unsanitized) run in `pnpm lint`.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const isCI = process.env['CI'] === 'true';
// Same digest-pinned image as .github/workflows/ci.yml (which passes it in via the environment).
const SEMGREP_IMAGE =
  process.env['SEMGREP_IMAGE'] ??
  'semgrep/semgrep:1.182.1@sha256:451b3d875c00dac7ed5db5293e584a07de11449a409c10b3c2d2652f429630b6';
let failed = false;

// 1. Bare eslint-disable comments -------------------------------------------------------------
const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const BARE_DISABLE = /(\/\/|\/\*)\s*eslint-disable(?:-next-line|-line)?\s*(\*\/|$)/;

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => SOURCE.test(f) && !f.startsWith('packages/config/test/fixtures/'));

/** @type {string[]} */
const bare = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (BARE_DISABLE.test(line)) bare.push(`${file}:${i + 1}`);
  });
}
if (bare.length > 0) {
  failed = true;
  console.error('✖ eslint-disable without rule names (name the rule and add " -- reason"):');
  for (const loc of bare) console.error(`  ${loc}`);
} else {
  console.log(`✔ no bare eslint-disable comments (${files.length} files)`);
}

// 2. Semgrep ----------------------------------------------------------------------------------
const semgrepArgs = [
  'scan',
  '--config',
  '.semgrep/rules',
  '--config',
  'p/typescript',
  '--config',
  'p/nodejs',
  '--config',
  'p/react',
  '--error',
  '--metrics=off',
  '--quiet',
];

/** @param {string} cmd @param {string[]} args */
function has(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'ignore', shell: false });
  return r.status === 0;
}

/** @type {{ cmd: string, args: string[] } | null} */
let semgrep = null;
if (has('semgrep', ['--version'])) {
  semgrep = { cmd: 'semgrep', args: semgrepArgs };
} else if (has('docker', ['version'])) {
  semgrep = {
    cmd: 'docker',
    args: [
      'run',
      '--rm',
      '-v',
      `${process.cwd()}:/src`,
      '-w',
      '/src',
      SEMGREP_IMAGE,
      'semgrep',
      ...semgrepArgs,
    ],
  };
}

if (semgrep) {
  const r = spawnSync(semgrep.cmd, semgrep.args, { stdio: 'inherit' });
  if (r.status === 0) {
    console.log('✔ semgrep');
  } else {
    failed = true;
    console.error('✖ semgrep found problems (see above)');
  }
} else if (isCI) {
  failed = true;
  console.error('✖ semgrep is required in CI but neither semgrep nor Docker is available');
} else {
  console.warn(
    '⚠ semgrep skipped locally: install Semgrep or Docker to run it. CI always runs it.',
  );
}

process.exit(failed ? 1 : 0);
