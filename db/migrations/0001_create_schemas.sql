-- Up Migration

-- One schema per module (docs/02-architecture/data-architecture.md). No tables yet: each module
-- adds its own, with grants, when it is built in Phase 2.
CREATE SCHEMA core;
CREATE SCHEMA audit;
CREATE SCHEMA accounting;
CREATE SCHEMA partners;
CREATE SCHEMA crm;
CREATE SCHEMA billing;
CREATE SCHEMA projects;
CREATE SCHEMA hr;
CREATE SCHEMA payroll;
CREATE SCHEMA procurement;
CREATE SCHEMA reporting;
CREATE SCHEMA outbox;

-- Deny by default: nothing lives in public, and no role may use it.
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Down Migration

-- Forward-only: fix a mistake with a new migration.
