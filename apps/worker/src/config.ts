import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
});

export interface WorkerConfig {
  readonly redisUrl: string;
  readonly logLevel: string;
}

/** Refuses to start on a bad environment; the error names variables, never values. */
export function loadConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      ({ path, message }) => `${path.join('.')}: ${message}`,
    );
    throw new Error(`Invalid environment:\n  ${problems.join('\n  ')}`);
  }
  return { redisUrl: parsed.data.REDIS_URL, logLevel: parsed.data.LOG_LEVEL };
}
