# apps/api

NestJS REST API with one module per domain (core, accounting, partners, crm, billing, projects, hr, payroll, procurement, reporting). The skeleton exists: configuration, logging, errors, rate limit, deny-by-default policy guard and health probes. **Feature endpoints arrive in Phase 2, implementing the frozen contracts.**

- [Module boundaries](../../docs/02-architecture/module-boundaries.md)
- [API design](../../docs/02-architecture/api-design.md)
- [Data architecture](../../docs/02-architecture/data-architecture.md)
- [Security architecture](../../docs/04-security/security-architecture.md)

Money moves only through the accounting module's posting engine.

## Run

`pnpm --filter @pitchforge/api dev` builds and starts on port 4000, using `.env`. It needs PostgreSQL and a Redis-compatible cache only for `/api/v1/ready`.

| Route            | Answer                                               |
| ---------------- | ---------------------------------------------------- |
| `/api/v1/health` | 200 while the process runs                           |
| `/api/v1/ready`  | 200 when the database and cache answer, 503 when not |

## Add a route

Every route needs `@Policy('area.action')` or `@Public('reason')`. The app refuses to start without one. Until sessions and the policy engine arrive in step B1, a route with `@Policy()` answers 401 to everyone.

Read configuration only through `loadConfig`. Throw `ApiError` with a contract error code; anything else becomes a plain 500, with no detail in the response or the log.
