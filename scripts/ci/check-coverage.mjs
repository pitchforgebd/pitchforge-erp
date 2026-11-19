#!/usr/bin/env node
/**
 * Runs after `vitest --coverage`. Coverage thresholds pass silently when a pattern matches no
 * file, so an empty report would look like success. This fails unless the money code is in it.
 */

import { readFileSync } from 'node:fs';

const REQUIRED = [
  'packages/shared-kernel/src/money/money.ts',
  'packages/shared-kernel/src/money/rounding.ts',
  'packages/shared-kernel/src/money/allocate.ts',
];

const report = readFileSync('coverage/lcov.info', 'utf8').replaceAll('\\', '/');
const missing = REQUIRED.filter((file) => !report.includes(file));

if (missing.length > 0) {
  console.error(`✖ Not in the coverage report: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('✔ coverage report includes the money code');
