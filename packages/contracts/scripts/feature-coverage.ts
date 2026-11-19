#!/usr/bin/env node
/**
 * pnpm contracts:coverage: every Must feature of a finished module group needs an endpoint or
 * a written reason in src/deferred.ts. The output is attached to the contract review (G0).
 */
import { DEFERRED_FEATURES } from '../src/deferred.ts';

import { coverageProblems, coverageReport, readFeatureList } from './feature-coverage-lib.ts';

const features = readFeatureList();
const report = coverageReport(features);

console.log('Group | Must | With endpoint | Deferred | State');
for (const row of report.rows) {
  const state = row.done ? 'done' : 'part 2';
  console.log(
    `${row.prefix.padEnd(5)} | ${String(row.must).padStart(4)} | ${String(row.mustCovered).padStart(13)} | ${String(row.mustDeferred).padStart(8)} | ${state}`,
  );
}

console.log('\nDeferred Must features:');
for (const feature of features) {
  const reason = Object.entries(DEFERRED_FEATURES).find(([id]) => id === feature.id)?.[1];
  if (reason !== undefined && feature.priority === 'M') {
    console.log(`  ${feature.id} ${feature.title}: ${reason}`);
  }
}

const problems = coverageProblems(report);
for (const problem of problems) console.error(`✖ ${problem}`);
process.exit(problems.length > 0 ? 1 : 0);
