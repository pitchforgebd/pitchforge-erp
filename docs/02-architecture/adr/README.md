# Architecture decision records

An ADR records one significant decision, the options considered and the consequences. Accepted ADRs are never edited; a new ADR supersedes an old one.

| ADR                                                  | Title                                                | Status   | Date        |
| ---------------------------------------------------- | ---------------------------------------------------- | -------- | ----------- |
| [0001](0001-modular-monolith.md)                     | Modular monolith, not microservices                  | Accepted | 03 Nov 2026 |
| [0002](0002-frontend-first-contract-first.md)        | Frontend first, contract first                       | Accepted | 03 Nov 2026 |
| [0003](0003-double-entry-ledger.md)                  | Double-entry ledger with one posting engine          | Accepted | 03 Nov 2026 |
| [0004](0004-server-side-sessions.md)                 | Server-side sessions, not JWT in the browser         | Accepted | 03 Nov 2026 |
| [0005](0005-audit-by-database-trigger.md)            | Audit by database trigger with a hash chain          | Accepted | 03 Nov 2026 |
| [0006](0006-runtime-and-toolchain-baseline.md)       | Runtime and toolchain baseline                       | Accepted | 04 Nov 2026 |
| [0007](0007-approvals-through-core.md)               | Every approval decision goes through core            | Accepted | 04 Nov 2026 |
| [0008](0008-mock-transport-in-the-bff.md)            | Mock API inside the backend-for-frontend             | Accepted | 06 Nov 2026 |
| [0009](0009-plain-sql-migrations.md)                 | Migrations as plain SQL with node-pg-migrate         | Accepted | 06 Nov 2026 |
| [0010](0010-local-storage-and-cache-images.md)       | Valkey and Garage for local development              | Accepted | 06 Nov 2026 |
| [0011](0011-static-analysis-with-semgrep.md)         | Static analysis with Semgrep CE                      | Accepted | 06 Nov 2026 |
| [0012](0012-server-builds-of-workspace-packages.md)  | Workspace packages build to `dist` for server images | Accepted | 06 Nov 2026 |
| [0013](0013-staging-on-cpanel.md)                    | Staging on cPanel shared hosting, mock mode only     | Accepted | 19 Nov 2026 |
| [0014](0014-installable-app-without-offline-data.md) | Installable app without offline data                 | Proposed | 20 Nov 2026 |

New ADR: copy [template.md](template.md) to `NNNN-short-title.md`.
