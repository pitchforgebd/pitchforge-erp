# ADR-0005: Audit by database trigger with a hash chain

- **Status:** Accepted
- **Date:** 03 Nov 2026
- **Deciders:** Tech lead, security owner

## Context

An audit log written by application code can be skipped by a bug, a script or a direct database change.

## Decision

Generic row-level triggers write every change to `audit.audit_log`, which is append-only for the application role and hash-chained; a nightly job verifies the chain.

## Consequences

- No code path can avoid auditing; tampering is detectable.
- Write overhead on every table; the audit table is partitioned monthly and archived after 24 months.
- Bulk migrations must set `app.user_id` and a reason so their changes are attributable.
