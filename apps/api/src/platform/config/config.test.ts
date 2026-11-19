import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';

const key1 = randomBytes(32).toString('base64');
const key2 = randomBytes(32).toString('base64');
const weak = key1.slice(0, 12);
const none = undefined;

const valid = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app_rw:local@localhost:5432/pitchforge_test',
  REDIS_URL: 'redis://localhost:6379',
  SESSION_SECRET: key1,
  FIELD_ENCRYPTION_KEY: key2,
} as const;

describe('loadConfig', () => {
  it('reads a valid environment, with defaults', () => {
    expect(loadConfig(valid)).toMatchObject({ env: 'production', port: 4000, logLevel: 'info' });
  });

  it.each([
    ['missing SESSION_SECRET', { SESSION_SECRET: none }, 'SESSION_SECRET'],
    ['empty SESSION_SECRET', { SESSION_SECRET: '' }, 'SESSION_SECRET'],
    ['short SESSION_SECRET', { SESSION_SECRET: weak }, 'at least 32'],
    ['placeholder', { SESSION_SECRET: 'change-me'.repeat(5) }, 'placeholder'],
    ['repetitive', { SESSION_SECRET: 'a'.repeat(44) }, 'repetitive'],
    ['weak FIELD_ENCRYPTION_KEY', { FIELD_ENCRYPTION_KEY: 'short' }, 'FIELD_ENCRYPTION_KEY'],
    ['missing DATABASE_URL', { DATABASE_URL: undefined }, 'DATABASE_URL'],
    ['another protocol', { DATABASE_URL: 'mysql://root@localhost/x' }, 'DATABASE_URL'],
    ['another REDIS protocol', { REDIS_URL: 'http://localhost:6379' }, 'REDIS_URL'],
    ['unknown NODE_ENV', { NODE_ENV: 'staging' }, 'NODE_ENV'],
    ['port out of range', { PORT: '70000' }, 'PORT'],
  ])('refuses %s', (_name, change, message) => {
    expect(() => loadConfig({ ...valid, ...change })).toThrow(message);
  });

  it('never prints a value in its error', () => {
    const value = 'tooshort-hunter2';
    let message = '';
    try {
      loadConfig({ ...valid, SESSION_SECRET: value });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('SESSION_SECRET');
    expect(message).not.toContain(value);
  });
});
