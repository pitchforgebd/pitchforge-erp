import { z } from 'zod';

import { Uuid } from './shared/primitives.ts';
import type { ErrorCode } from './shared/problem.ts';

export const MODULES = [
  'core',
  'accounting',
  'partners',
  'crm',
  'billing',
  'projects',
  'hr',
  'payroll',
  'procurement',
  'reporting',
] as const;
export type ModuleName = (typeof MODULES)[number];

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** What an endpoint declares. defineEndpoints() checks it and adds the conventions. */
export interface EndpointInput {
  readonly method: HttpMethod;
  /** `/api/v1/{module}/{resource}`, `{id}` for parameters, `:command` for state changes. */
  readonly path: string;
  readonly summary: string;
  /** Feature IDs from docs/01-requirements/feature-list.md. */
  readonly featureIds: readonly [string, ...string[]];
  readonly params?: z.ZodObject;
  readonly query?: z.ZodObject;
  /** Must be strict: unknown fields are rejected (secure coding checklist). */
  readonly body?: z.ZodObject;
  /** null for 204 No Content. */
  readonly response: z.ZodType | null;
  readonly status?: 200 | 201 | 202 | 204;
  /** Business errors; the conventional ones are added automatically. */
  readonly errors?: readonly ErrorCode[];
  /** Open to callers with no session (login, password reset). Everything else is denied. */
  readonly public?: true;
  /** Moves money: requires an Idempotency-Key header. */
  readonly movesMoney?: true;
  /** Sends email or SMS: requires an Idempotency-Key header. */
  readonly sendsMessages?: true;
  /** Re-enter password or TOTP first (security architecture §1). */
  readonly stepUp?: true;
  /** A list endpoint: must use cursor pagination. */
  readonly list?: true;
  /** Writes to one record require If-Match. Set false where versions do not apply. */
  readonly versioned?: false;
}

export const IdempotencyKeyHeader = z.uuid().meta({
  description: 'Unique per logical request; a repeat within 24 h returns the first result.',
});

export const IfMatchHeader = z.string().min(1).meta({
  description: 'The record version from its last read; a stale value returns 412.',
});

export type Endpoint<D extends EndpointInput = EndpointInput, M extends string = ModuleName> = D & {
  /** `module.operation`, used as the OpenAPI operationId. */
  readonly id: `${M}.${string}`;
  readonly module: M;
  readonly status: 200 | 201 | 202 | 204;
  /** Declared plus conventional errors, sorted. */
  readonly errors: readonly ErrorCode[];
  readonly headers: z.ZodObject | undefined;
};

/** The path's `{name}` placeholders. */
export function pathParams(path: string): string[] {
  return [...path.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1] ?? '');
}

function isStrict(schema: z.ZodObject): boolean {
  return schema.def.catchall instanceof z.ZodNever;
}

function fail(id: string, problem: string): never {
  throw new Error(`Contract ${id}: ${problem}`);
}

function conventionalErrors(d: EndpointInput, versioned: boolean, idempotent: boolean) {
  const errors = new Set<ErrorCode>(d.errors ?? []);
  if (d.public !== true) {
    errors.add('UNAUTHENTICATED');
    errors.add('FORBIDDEN');
  }
  if (d.body !== undefined || d.query !== undefined) errors.add('VALIDATION');
  if (d.params !== undefined) errors.add('NOT_FOUND');
  if (versioned) errors.add('STALE_VERSION');
  if (idempotent) errors.add('IDEMPOTENCY_CONFLICT');
  if (d.stepUp === true) errors.add('STEP_UP_REQUIRED');
  return [...errors].sort();
}

function build<D extends EndpointInput, M extends ModuleName>(
  module: M,
  key: string,
  d: D,
): Endpoint<D, M> {
  const id = `${module}.${key}` as const;
  const write = d.method !== 'GET';

  if (!d.path.startsWith(`/api/v1/${module}/`)) fail(id, `path must start with /api/v1/${module}/`);

  const declared = Object.keys(d.params?.shape ?? {}).sort();
  const inPath = pathParams(d.path).sort();
  if (declared.join() !== inPath.join()) {
    fail(id, `params {${declared.join()}} do not match the path {${inPath.join()}}`);
  }

  if (d.body !== undefined && !write) fail(id, 'GET cannot have a body');
  if (d.body !== undefined && !isStrict(d.body)) fail(id, 'body must be a z.strictObject');
  if (d.query !== undefined && write) fail(id, 'only GET takes a query');
  if (d.query !== undefined && !isStrict(d.query)) fail(id, 'query must be strict');
  if (d.list === true && d.query?.shape['cursor'] === undefined) {
    fail(id, 'a list must use cursor pagination (listQuery)');
  }
  if (d.response === null && d.status !== 204) fail(id, 'no response body means status 204');

  const idempotent = d.movesMoney === true || d.sendsMessages === true;
  if (idempotent && d.method !== 'POST') fail(id, 'money and message commands must be POST');

  const onRecord = d.params !== undefined;
  const versioned = write && onRecord && d.versioned !== false;

  const headers: Record<string, z.ZodType> = {};
  if (idempotent) headers['idempotency-key'] = IdempotencyKeyHeader;
  if (versioned) headers['if-match'] = IfMatchHeader;

  return Object.freeze({
    ...d,
    id,
    module,
    status: d.status ?? 200,
    errors: conventionalErrors(d, versioned, idempotent),
    headers: Object.keys(headers).length > 0 ? z.object(headers) : undefined,
  });
}

/**
 * Declare a module's endpoints. Fails at import time if one breaks the API conventions, so a
 * contract that does not follow api-design.md cannot be built, tested or generated.
 */
export function defineEndpoints<
  M extends ModuleName,
  const T extends Record<string, EndpointInput>,
>(module: M, endpoints: T): { readonly [K in keyof T]: Endpoint<T[K], M> } {
  const result = Object.fromEntries(
    Object.entries(endpoints).map(([key, d]) => [key, build(module, key, d)]),
  );
  return Object.freeze(result) as { readonly [K in keyof T]: Endpoint<T[K], M> };
}

/** `{id}` as a UUID, the usual record parameter. */
export const IdParams = z.strictObject({ id: Uuid });
