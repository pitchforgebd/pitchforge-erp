import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { REDACTED_PATHS } from './logging.ts';

function logged(line: Record<string, unknown>) {
  let output = '';
  const logger = pino(
    { redact: { paths: REDACTED_PATHS, censor: '[redacted]' } },
    {
      write: (chunk: string) => {
        output += chunk;
      },
    },
  );
  logger.info(line);
  return output;
}

describe('log redaction', () => {
  it.each([
    ['a password', { user: { password: 'hunter2hunter2' } }, 'hunter2hunter2'],
    ['a token', { session: { token: 'abc123token' } }, 'abc123token'],
    ['a national id', { employee: { nid: '19901234567890123' } }, '19901234567890123'],
    ['a bank account', { vendor: { bankAccount: '0011223344' } }, '0011223344'],
    ['a salary', { employee: { salary: '90000.00' } }, '90000.00'],
    ['an email', { user: { email: 'arif@pitchforge.example' } }, 'arif@pitchforge.example'],
    ['a cookie', { req: { headers: { cookie: 'session=abc' } } }, 'session=abc'],
    ['authorization', { req: { headers: { authorization: 'Bearer abc' } } }, 'Bearer abc'],
  ])('hides %s', (_name, line, value) => {
    const output = logged(line);
    expect(output).not.toContain(value);
    expect(output).toContain('[redacted]');
  });
});
