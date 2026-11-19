import pg from 'pg';

import { migrate } from './migrate.ts';
import { assertResettable, requireMigrateUrl } from './safety.ts';

const url = requireMigrateUrl(process.env);
assertResettable(url);

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query<{ name: string }>(
    `SELECT quote_ident(nspname) AS name
       FROM pg_namespace
      WHERE nspowner = current_user::regrole
        AND nspname <> 'public'
        AND nspname !~ '^(pg_|information_schema)'`,
  );
  for (const { name } of rows) await client.query(`DROP SCHEMA ${name} CASCADE`);
  console.log(`✔ dropped ${String(rows.length)} schemas`);
} finally {
  await client.end();
}

console.log(`✔ applied: ${(await migrate(url)).join(', ')}`);
