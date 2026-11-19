# ADR-0009: Migrations as plain SQL with node-pg-migrate

- **Status:** Accepted
- **Date:** 06 Nov 2026
- **Deciders:** Tech lead

## Context

The data architecture asks for forward-only reviewed SQL, and much of the ledger's safety lives in the database: triggers, constraints and role grants. An ORM's migration generator hides or cannot express these. The query layer for Phase 2 is a separate choice.

## Options considered

1. **Prisma Migrate:** good tooling, but it generates SQL from a schema file, which fits triggers and row-level security poorly, and it ties the query layer to Prisma.
2. **Drizzle Kit:** lighter, with the same generation model.
3. **node-pg-migrate in plain SQL mode:** files are the exact SQL a reviewer reads. It tracks what was applied and takes an advisory lock.

## Decision

Option 3. Each migration is `db/migrations/NNNN_name.sql`, run by `pnpm db:migrate` as `app_migrate`, in one transaction. The applied list lives in its own `migrations` schema, and `public` is closed to every role. Migrations go forward only.

The query layer stays open until Phase 1 groundwork; Kysely is the recommendation.

## Consequences

- Reviewers see exactly what will run, and triggers and grants are ordinary SQL.
- There are no generated down migrations: a mistake is fixed by a new migration, and a release must be safe to roll back without one (expand, then contract).
- Each module writes its own grants for `app_rw` and `report_ro`, so a forgotten grant fails loudly instead of exposing data.
- CI runs every migration twice on an empty PostgreSQL 16. PostgreSQL before 15 gives `public` to the bootstrap superuser, so a database on those versions must first hand it to the owner.
