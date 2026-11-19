import { describe, expect, it } from 'vitest';

import { isNavSection, visibleSections } from '../navigation.ts';

import { contentSecurityPolicy, securityHeaders } from './headers.ts';

describe('contentSecurityPolicy', () => {
  const production = contentSecurityPolicy({ nonce: 'abc', development: false });

  it('is strict in production', () => {
    expect(production).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(production).toContain("style-src 'self' 'nonce-abc'");
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("connect-src 'self'");
    expect(production).not.toContain('unsafe');
    expect(production).not.toMatch(/https?:/);
  });

  it('relaxes only for the development server', () => {
    const development = contentSecurityPolicy({ nonce: 'abc', development: true });
    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain('ws://localhost:*');
  });
});

describe('securityHeaders', () => {
  it('sends HSTS in production only', () => {
    const on = securityHeaders({ nonce: 'a', development: false });
    const off = securityHeaders({ nonce: 'a', development: true });
    expect(on['strict-transport-security']).toContain('max-age=');
    expect(off['strict-transport-security']).toBeUndefined();
    expect(on['x-frame-options']).toBe('DENY');
  });
});

describe('navigation', () => {
  it('shows only sections the session may read', () => {
    expect(visibleSections(['ledger.read', 'hr.read', 'other.read'])).toEqual(['ledger', 'hr']);
    expect(visibleSections([])).toEqual([]);
  });

  it('knows its sections', () => {
    expect(isNavSection('ledger')).toBe(true);
    expect(isNavSection('../etc')).toBe(false);
  });
});
