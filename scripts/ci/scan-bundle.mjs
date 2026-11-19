#!/usr/bin/env node
/**
 * pnpm check:bundle (after pnpm build): scan everything the browser downloads for mock code,
 * sample data and secrets. Also runs gitleaks over it when gitleaks is available.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { bundleProblems } from './bundle-rules.mjs';

const BUNDLE_DIR = process.argv[2] ?? 'apps/web/.next/static';

if (!existsSync(BUNDLE_DIR)) {
  console.error(`✖ ${BUNDLE_DIR} does not exist. Run pnpm build first.`);
  process.exit(1);
}

const files = readdirSync(BUNDLE_DIR, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(js|css|map|json|html)$/.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name));

let failed = false;
for (const file of files) {
  const problems = bundleProblems(readFileSync(file, 'utf8'));
  if (problems.length > 0) {
    failed = true;
    console.error(`✖ ${file}: ${problems.join(', ')}`);
  }
}

const gitleaks = spawnSync(
  'gitleaks',
  ['dir', BUNDLE_DIR, '--config', '.gitleaks.toml', '--redact', '--no-banner', '--exit-code', '1'],
  { stdio: 'inherit' },
);
if (!gitleaks.error && gitleaks.status !== 0) failed = true;

if (failed) process.exit(1);
console.log(`✔ client bundle clean (${String(files.length)} files)`);
