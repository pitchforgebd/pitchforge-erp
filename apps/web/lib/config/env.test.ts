import { describe, expect, it } from 'vitest';

import { parseServerEnv, secretLookingPublicVariables } from './env.ts';

describe('parseServerEnv', () => {
  it('defaults to mock mode outside production', () => {
    expect(parseServerEnv({ NODE_ENV: 'development' }).apiMode).toBe('mock');
  });

  it('defaults to the real API in production', () => {
    expect(parseServerEnv({ NODE_ENV: 'production' }).apiMode).toBe('real');
  });

  it('refuses mock mode in production', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'production', API_MODE: 'mock' })).toThrow('refused');
  });

  it('allows mock mode on staging only with the explicit flag', () => {
    const env = { NODE_ENV: 'production', API_MODE: 'mock', ALLOW_MOCK_API: 'true' };
    expect(parseServerEnv(env).apiMode).toBe('mock');
  });

  it('reads the modules already on the real API', () => {
    const config = parseServerEnv({ API_REAL_MODULES: 'accounting, partners,' });
    expect(config.realModules).toEqual(['accounting', 'partners']);
  });

  it('rejects an invalid API URL and mode', () => {
    expect(() => parseServerEnv({ API_URL: 'not a url' })).toThrow();
    expect(() => parseServerEnv({ API_MODE: 'other' })).toThrow();
  });

  it('refuses to start with a secret in a public variable', () => {
    expect(() => parseServerEnv({ NEXT_PUBLIC_SESSION_SECRET: 'x' })).toThrow('Secret-looking');
  });
});

describe('secretLookingPublicVariables', () => {
  it('flags secret-looking names and values, and only public variables', () => {
    expect(
      secretLookingPublicVariables({
        NEXT_PUBLIC_APP_NAME: 'Pitchforge',
        NEXT_PUBLIC_API_TOKEN: 'x',
        NEXT_PUBLIC_THING: 'sk-abc',
        SESSION_SECRET: 'server only',
      }),
    ).toEqual(['NEXT_PUBLIC_API_TOKEN', 'NEXT_PUBLIC_THING']);
  });
});
