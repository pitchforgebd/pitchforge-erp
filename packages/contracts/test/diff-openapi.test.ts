import { describe, expect, it } from 'vitest';

import { breakingChangeAllowed, latestContractTag } from '../scripts/diff-openapi-lib.ts';

describe('latestContractTag', () => {
  it('takes the first contracts tag of the sorted output', () => {
    expect(latestContractTag('contracts-v1.2.0\ncontracts-v1.1.0\n')).toBe('contracts-v1.2.0');
    expect(latestContractTag('contracts-v1.0.0\r\n')).toBe('contracts-v1.0.0');
  });

  it('is null when there is no tag', () => {
    expect(latestContractTag('')).toBeNull();
    expect(latestContractTag('v1.0.0\n')).toBeNull();
  });
});

describe('breakingChangeAllowed', () => {
  it('needs a major bump', () => {
    expect(breakingChangeAllowed('1.2.0', '2.0.0')).toBe(true);
    expect(breakingChangeAllowed('1.2.0', '1.3.0')).toBe(false);
    expect(breakingChangeAllowed('1.2.0', '1.2.0')).toBe(false);
  });

  it('refuses an unreadable version', () => {
    expect(() => breakingChangeAllowed('x', '2.0.0')).toThrow('Not a version');
  });
});
