import pg from 'pg';

import { migrate } from './migrate.ts';
import { MODULE_SCHEMAS, requireMigrateUrl } from './safety.ts';

/**
 * CI runs this on an empty database: migrations apply, a second run does nothing, and the
 * result is what the data architecture says.
 */
const url = requireMigrateUrl(process.env);

const first = await migrate(url);
console.log(`✔ first run applied ${String(first.length)}: ${first.join(', ')}`);

const second = await migrate(url);
if (second.length > 0) throw new Error(`The second run applied ${second.join(', ')}`);
console.log('✔ second run did nothing');

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query<{ nspname: string }>('SELECT nspname FROM pg_namespace');
  const schemas = new Set(rows.map(({ nspname }) => nspname));
  const missing = MODULE_SCHEMAS.filter((schema) => !schemas.has(schema));
  if (missing.length > 0) throw new Error(`Missing schemas: ${missing.join(', ')}`);
  console.log(`✔ all ${String(MODULE_SCHEMAS.length)} module schemas exist`);

  const { rows: rights } = await client.query<{ role: string; usable: boolean }>(
    `SELECT rolname AS role,
            has_schema_privilege(rolname, 'public', 'USAGE')
              OR has_schema_privilege(rolname, 'public', 'CREATE') AS usable
       FROM pg_roles
      WHERE rolname IN ('app_rw', 'report_ro')`,
  );
  if (rights.length !== 2) throw new Error('Expected the roles app_rw and report_ro to exist');
  const open = rights.filter(({ usable }) => usable).map(({ role }) => role);
  if (open.length > 0) throw new Error(`These roles can use schema public: ${open.join(', ')}`);
  console.log('✔ app_rw and report_ro cannot use schema public');
} finally {
  await client.end();
}
