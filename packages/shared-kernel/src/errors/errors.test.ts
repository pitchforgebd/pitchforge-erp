import { describe, expect, it } from 'vitest';

import { DomainError, isDomainError } from './domain-error.ts';
import { ERROR_CODES, isErrorCode } from './error-codes.ts';
import { err, invalid, ok, unwrap } from './result.ts';

describe('error codes', () => {
  it('are UPPER_SNAKE and unique', () => {
    for (const code of ERROR_CODES) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*[A-Z0-9]$/);
      expect(code).not.toContain('__');
    }
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('recognises known codes only', () => {
    expect(isErrorCode('PERIOD_LOCKED')).toBe(true);
    expect(isErrorCode('period_locked')).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});

describe('DomainError', () => {
  it('carries a code, message and frozen details', () => {
    const e = new DomainError('SOD_VIOLATION', 'requester cannot approve', { step: 1 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DomainError');
    expect(e.code).toBe('SOD_VIOLATION');
    expect(e.message).toBe('requester cannot approve');
    expect(e.details).toEqual({ step: 1 });
    expect(Object.isFrozen(e.details)).toBe(true);
    expect(new DomainError('NOT_FOUND', 'x').details).toEqual({});
  });

  it('isDomainError checks type and optionally code', () => {
    const e = new DomainError('NOT_FOUND', 'x');
    expect(isDomainError(e)).toBe(true);
    expect(isDomainError(e, 'NOT_FOUND')).toBe(true);
    expect(isDomainError(e, 'FORBIDDEN')).toBe(false);
    expect(isDomainError(new Error('x'))).toBe(false);
  });
});

describe('Result', () => {
  it('ok / err / invalid', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('e')).toEqual({ ok: false, error: 'e' });
    const r = invalid('bad');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION');
  });

  it('unwrap returns the value or throws the error', () => {
    expect(unwrap(ok('v'))).toBe('v');
    expect(() => unwrap(invalid('bad'))).toThrow(DomainError);
  });
});
