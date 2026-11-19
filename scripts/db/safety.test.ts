import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MODULE_SCHEMAS, assertResettable, requireMigrateUrl } from './safety.ts';

describe('assertResettable', () => {
  it.each([
    'postgresql://app_migrate:x@localhost:5432/pitchforge_dev',
    'postgresql://app_migrate:x@127.0.0.1:55432/pitchforge_test',
  ])('allows %s', (url) => {
    expect(() => {
      assertResettable(url);
    }).not.toThrow();
  });

  it.each([
    ['a remote host', 'postgresql://u:x@staging.internal:5432/pitchforge_dev', 'localhost only'],
    ['an RDS host', 'postgresql://u:x@db.rds.amazonaws.com/pitchforge_test', 'localhost only'],
    [
      'a host that starts with localhost',
      'postgresql://u:x@localhost.evil.test/p_dev',
      'localhost',
    ],
    ['a production name', 'postgresql://u:x@localhost:5432/pitchforge', 'must end in'],
    ['a name that only contains dev', 'postgresql://u:x@localhost/dev_copy', 'must end in'],
  ])('refuses %s', (_name, url, message) => {
    expect(() => {
      assertResettable(url);
    }).toThrow(message);
  });
});

describe('requireMigrateUrl', () => {
  it('needs the variable', () => {
    expect(() => requireMigrateUrl({})).toThrow('DATABASE_MIGRATE_URL');
    expect(() => requireMigrateUrl({ DATABASE_MIGRATE_URL: '' })).toThrow('DATABASE_MIGRATE_URL');
  });

  it('returns it', () => {
    expect(requireMigrateUrl({ DATABASE_MIGRATE_URL: 'postgresql://x' })).toBe('postgresql://x');
  });
});

describe('MODULE_SCHEMAS', () => {
  it('matches the data architecture', () => {
    const doc = readFileSync(
      path.join(import.meta.dirname, '../../docs/02-architecture/data-architecture.md'),
      'utf8',
    );
    const documented = [...doc.matchAll(/^\| `([a-z]+)` +\|/gm)].map((m) => m[1]).sort();
    expect(documented).toEqual([...MODULE_SCHEMAS]);
  });

  it('matches the first migration', () => {
    const sql = readFileSync(
      path.join(import.meta.dirname, '../../db/migrations/0001_create_schemas.sql'),
      'utf8',
    );
    const created = [...sql.matchAll(/^CREATE SCHEMA ([a-z]+);/gm)].map((m) => m[1]).sort();
    expect(created).toEqual([...MODULE_SCHEMAS]);
  });
});
