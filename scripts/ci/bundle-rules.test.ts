import { describe, expect, it } from 'vitest';

import { bundleProblems } from './bundle-rules.mjs';

describe('bundleProblems', () => {
  it('passes ordinary client code', () => {
    expect(bundleProblems('function a(){return fetch("/bff/v1/core/auth:login")}')).toEqual([]);
  });

  it.each([
    ['const s=setupServer()', 'mock code (msw)'],
    ['"rafiq@pitchforge.example"', 'mock sample data'],
    ['process.env.SESSION_SECRET', 'server secret name'],
    ['process.env.DATABASE_URL', 'server environment name'],
    ['-----BEGIN RSA PRIVATE KEY-----', 'private key'],
    // Split so that this test file does not trip the secret scan itself.
    [['AKIA', 'ABCDEFGHIJKLMNOP'].join(''), 'AWS access key'],
    ['pf_test_canary_abc', 'secret-scan canary'],
  ])('flags %s', (text, problem) => {
    expect(bundleProblems(text)).toEqual([problem]);
  });
});
