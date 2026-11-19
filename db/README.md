# db

- `migrations/`: forward-only SQL migrations, reviewed by the tech lead; expand-then-contract for breaking changes
- `seeds/`: synthetic sample data (matches the prototype) and the Bangladesh service-company [chart of accounts template](seeds/chart-of-accounts/README.md)

Never put real data here. See [data architecture](../docs/02-architecture/data-architecture.md) and the [ERD](../docs/02-architecture/erd.md).

## Commands

Run from the repository root. They read `DATABASE_MIGRATE_URL` from `.env` or the environment.

| Command           | What it does                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:migrate` | Applies pending migrations                                                                                                                     |
| `pnpm db:verify`  | Applies them, confirms a second run does nothing, and checks the schemas and that `public` is closed                                           |
| `pnpm db:reset`   | Drops every schema the role owns, then migrates. Refuses any host but localhost, and any database whose name does not end in `_dev` or `_test` |

## Roles

| Role          | Used by     | Rights                                                                           |
| ------------- | ----------- | -------------------------------------------------------------------------------- |
| `app_migrate` | Migrations  | Owns the database and every table                                                |
| `app_rw`      | API, worker | Only what each migration grants. No UPDATE or DELETE on `journal_*` or `audit.*` |
| `report_ro`   | Reports     | Read only, on what each migration grants                                         |

No migration grants anything yet, because there are no tables. Each module's first migration adds its own grants.

## Write a migration

Name it `NNNN_what_it_does.sql` with the next number, and put the SQL under `-- Up Migration`. Leave `-- Down Migration` empty: migrations go forward only.
