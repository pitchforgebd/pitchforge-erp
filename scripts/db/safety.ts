/** Guards for the database scripts. */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Only a throwaway local database may be reset. Anything else stops here. */
export function assertResettable(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to reset a database on ${url.hostname}: localhost only`);
  }
  const name = url.pathname.slice(1);
  if (!/_(dev|test)$/.test(name)) {
    throw new Error(`Refusing to reset ${name}: the name must end in _dev or _test`);
  }
}

export function requireMigrateUrl(env: NodeJS.ProcessEnv): string {
  const url = env['DATABASE_MIGRATE_URL'];
  if (url === undefined || url === '') {
    throw new Error('Set DATABASE_MIGRATE_URL (see .env.example)');
  }
  return url;
}

/** Where the applied-migrations table lives: apart from the module schemas. */
export const MIGRATIONS_SCHEMA = 'migrations';

/** One schema per module (docs/02-architecture/data-architecture.md). */
export const MODULE_SCHEMAS = [
  'accounting',
  'audit',
  'billing',
  'core',
  'crm',
  'hr',
  'outbox',
  'partners',
  'payroll',
  'procurement',
  'projects',
  'reporting',
] as const;
