import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';
import { noopJob } from './queues.ts';

const valid = { NODE_ENV: 'production', REDIS_URL: 'redis://localhost:6379' } as const;

describe('loadConfig', () => {
  it('reads a valid environment, with defaults', () => {
    expect(loadConfig(valid)).toEqual({ redisUrl: 'redis://localhost:6379', logLevel: 'info' });
  });

  it.each([
    ['missing REDIS_URL', { REDIS_URL: undefined }, 'REDIS_URL'],
    ['another protocol', { REDIS_URL: 'http://localhost:6379' }, 'REDIS_URL'],
    ['unknown NODE_ENV', { NODE_ENV: 'staging' }, 'NODE_ENV'],
  ])('refuses %s', (_name, change, message) => {
    expect(() => loadConfig({ ...valid, ...change })).toThrow(message);
  });
});

describe('noopJob', () => {
  it('does nothing and says so', async () => {
    await expect(noopJob()).resolves.toEqual({ done: true });
  });
});
