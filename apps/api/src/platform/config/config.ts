import { z } from 'zod';

/** Config comes only from here; nothing else reads process.env. */
export const CONFIG = Symbol('CONFIG');

const MIN_SECRET_LENGTH = 32;
const MIN_DISTINCT_CHARACTERS = 10;

const Secret = z
  .string()
  .min(MIN_SECRET_LENGTH, `Must have at least ${String(MIN_SECRET_LENGTH)} characters`)
  .refine((value) => !/change-?me|example|secret|password/i.test(value), 'Is a placeholder')
  .refine((value) => new Set(value).size >= MIN_DISTINCT_CHARACTERS, 'Is too repetitive');

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(0).max(65_535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  SESSION_SECRET: Secret,
  FIELD_ENCRYPTION_KEY: Secret,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
  /** Proxies in front of the API: the rate limit needs the caller's address, not the ALB's. */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
});

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  readonly port: number;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly sessionSecret: string;
  readonly fieldEncryptionKey: string;
  readonly logLevel: string;
  readonly trustedProxyHops: number;
}

/**
 * Reads the environment once at startup and refuses to start on a missing or weak value. An
 * error names the variable, never its value.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      ({ path, message }) => `${path.join('.')}: ${message}`,
    );
    throw new Error(`Invalid environment:\n  ${problems.join('\n  ')}`);
  }
  const { data } = parsed;
  return {
    env: data.NODE_ENV,
    port: data.PORT,
    databaseUrl: data.DATABASE_URL,
    redisUrl: data.REDIS_URL,
    sessionSecret: data.SESSION_SECRET,
    fieldEncryptionKey: data.FIELD_ENCRYPTION_KEY,
    logLevel: data.LOG_LEVEL,
    trustedProxyHops: data.TRUSTED_PROXY_HOPS,
  };
}
