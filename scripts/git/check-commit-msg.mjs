#!/usr/bin/env node
/**
 * commit-msg hook: the first line must follow Conventional Commits
 * (docs/05-engineering/git-workflow.md), e.g. `feat(contracts): add vendor bill schemas`.
 */

import { readFileSync } from 'node:fs';

import { checkCommitMessage } from './commit-msg-rules.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: check-commit-msg.mjs <commit-msg-file>');
  process.exit(2);
}

const result = checkCommitMessage(readFileSync(file, 'utf8'));
if (!result.ok) {
  console.error(`✖ ${result.reason}`);
  console.error('  Format: type(scope): summary   e.g. feat(accounting): post vendor bills');
  console.error('  Types:  feat fix docs style refactor perf test build ci chore revert contract');
  process.exit(1);
}
