import { describe, expect, it } from 'vitest';

import { checkCommitMessage, TYPES } from './commit-msg-rules.mjs';

describe('checkCommitMessage', () => {
  it.each(TYPES)('accepts every listed type: %s', (type) => {
    expect(checkCommitMessage(`${type}(core): summary`)).toEqual({ ok: true });
  });

  it.each([
    'feat(contracts): add vendor bill schemas',
    'fix(billing): record AIT on receipts',
    'chore: bump turbo',
    'feat(api)!: drop v0 routes',
    'contract(accounting): add payment run commands',
    'ci(security): pin gitleaks image by digest\n\nBody text.\n\nCo-Authored-By: Someone <x@example.com>',
    'Merge branch main into feat/FIN-12-payment-run',
    'Revert "feat(billing): record AIT on receipts"',
    'fixup! feat(contracts): add vendor bill schemas',
    '# Please enter the commit message\nfeat(ui): add Money component',
  ])('accepts %j', (msg) => {
    expect(checkCommitMessage(msg)).toEqual({ ok: true });
  });

  it.each([
    ['', 'empty'],
    ['update stuff', 'not-conventional'],
    ['feature(api): add health', 'unknown type'],
    ['feat(API): add health', 'uppercase scope'],
    ['feat:missing space', 'no space after colon'],
    [`feat(api): ${'x'.repeat(100)}`, 'too long'],
  ])('rejects %j (%s)', (msg) => {
    expect(checkCommitMessage(msg).ok).toBe(false);
  });
});
