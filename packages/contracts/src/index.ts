/**
 * @pitchforge/contracts: the single source of truth for the API (ADR-0002, api-design.md).
 * Web and API import shapes from here; nobody hand-writes API types.
 */
import './zod-config.ts';

export * from './endpoint.ts';
export * from './shared/pagination.ts';
export * from './shared/primitives.ts';
export * from './shared/problem.ts';
export * from './shared/record.ts';
export * from './core/index.ts';
export * from './accounting/index.ts';
export * from './partners/index.ts';
export * from './crm/index.ts';
export * from './billing/index.ts';
export * from './projects/index.ts';
export * from './hr/index.ts';
export * from './payroll/index.ts';
export * from './procurement/index.ts';
export * from './reporting/index.ts';
export * from './registry.ts';
