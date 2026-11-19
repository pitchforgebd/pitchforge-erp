# apps/worker

NestJS workers: outbox relay, scheduled jobs (reminders, depreciation, recurring entries), PDF rendering, virus scanning, imports, exports and payroll calculation. Shares module code with `apps/api`. **Phase 2.**

Every job is idempotent and safe to re-run.

The skeleton exists: configuration, one BullMQ connection, a no-op queue and graceful shutdown. Run it with `pnpm --filter @pitchforge/worker dev`.
