import { z } from 'zod';

/** A NEXT_PUBLIC_* name or value that looks like a secret: these reach every browser. */
const SECRET_NAME = /SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY|ACCESS_KEY|CREDENTIAL/;
const SECRET_VALUE = /^(sk|pk|ghp|gho|xox[a-z])[-_]|^AKIA[0-9A-Z]{16}$|-----BEGIN /;

export function secretLookingPublicVariables(
  env: Readonly<Record<string, string | undefined>>,
): string[] {
  return Object.entries(env)
    .filter(([name]) => name.startsWith('NEXT_PUBLIC_'))
    .filter(([name, value]) => SECRET_NAME.test(name) || SECRET_VALUE.test(value ?? ''))
    .map(([name]) => name)
    .sort();
}

const ServerEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** `mock` serves the API from mocks/; `real` calls API_URL. Server-side only. */
  API_MODE: z.enum(['mock', 'real']).optional(),
  /** Modules that use the real API while the rest stay mocked: `accounting,partners`. */
  API_REAL_MODULES: z.string().default(''),
  API_URL: z.url().default('http://localhost:4000'),
  /** Mock mode in a production build is refused unless this is set (staging only). */
  ALLOW_MOCK_API: z.enum(['true', 'false']).default('false'),
});

export interface ServerConfig {
  readonly apiMode: 'mock' | 'real';
  readonly realModules: readonly string[];
  readonly apiUrl: string;
  readonly production: boolean;
}

/** Validate the environment. Fails at start-up, not on the first request. */
export function parseServerEnv(env: Readonly<Record<string, string | undefined>>): ServerConfig {
  const leaked = secretLookingPublicVariables(env);
  if (leaked.length > 0) {
    throw new Error(`Secret-looking public variables: ${leaked.join(', ')}`);
  }

  const parsed = ServerEnv.parse(env);
  const production = parsed.NODE_ENV === 'production';
  const apiMode = parsed.API_MODE ?? (production ? 'real' : 'mock');

  if (production && apiMode === 'mock' && parsed.ALLOW_MOCK_API !== 'true') {
    throw new Error('API_MODE=mock is refused in production');
  }

  return {
    apiMode,
    realModules: parsed.API_REAL_MODULES.split(',')
      .map((name) => name.trim())
      .filter((name) => name !== ''),
    apiUrl: parsed.API_URL,
    production,
  };
}

let cached: ServerConfig | undefined;

export function serverConfig(): ServerConfig {
  cached ??= parseServerEnv(process.env);
  return cached;
}
