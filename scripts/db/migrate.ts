import path from 'node:path';

import { runner } from 'node-pg-migrate';

import { MIGRATIONS_SCHEMA, requireMigrateUrl } from './safety.ts';

const MIGRATIONS_DIR = path.join(import.meta.dirname, '../../db/migrations');

/** Applies pending migrations and returns their names. */
export async function migrate(databaseUrl: string): Promise<string[]> {
  const applied = await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: 'up',
    migrationsSchema: MIGRATIONS_SCHEMA,
    createMigrationsSchema: true,
    migrationsTable: 'applied',
    checkOrder: true,
    singleTransaction: true,
    verbose: false,
  });
  return applied.map(({ name }) => name);
}

if (process.argv[1] === import.meta.filename) {
  const names = await migrate(requireMigrateUrl(process.env));
  console.log(names.length === 0 ? '✔ nothing to apply' : `✔ applied: ${names.join(', ')}`);
}
