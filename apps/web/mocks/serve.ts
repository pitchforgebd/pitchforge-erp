import { z } from 'zod';

import type { Endpoint, RestrictedKind } from '@pitchforge/contracts';

import { SAMPLE_USERS } from './data/sample-company.ts';
import type { SampleRole, SampleUser } from './data/sample-company.ts';
import { mock } from './define.ts';
import type { MockHandler, MockReply, MockRequest } from './define.ts';
import { SESSION_COOKIE } from './session.ts';

export interface Viewer extends SampleUser {
  readonly role: SampleRole;
}

const ROLES = new Map(Object.entries(SAMPLE_USERS)) as ReadonlyMap<SampleRole, SampleUser>;

/** The sample user behind this request's session cookie. */
export function viewerOf(request: MockRequest): Viewer | undefined {
  const role = request.cookie(SESSION_COOKIE) as SampleRole | undefined;
  const user = role === undefined ? undefined : ROLES.get(role);
  return role === undefined || user === undefined ? undefined : { ...user, role };
}

/**
 * Which restricted fields each sample role may read, from the field rules in
 * docs/04-security/access-control-matrix.md. The real API decides this; the mock copies the
 * outcome, so screens are built against what each role will really receive.
 */
const FIELD_ACCESS = new Map<SampleRole, readonly RestrictedKind[]>([
  ['partner', ['salary', 'partner-balance', 'labour-cost']],
  ['finance', ['partner-balance', 'labour-cost', 'bank']],
  ['pm', []],
  ['employee', []],
]);

/** A person reads their own salary, bank, NID and TIN. */
const OWN_FIELDS: readonly RestrictedKind[] = ['salary', 'bank', 'nid', 'tin'];

function isOwnRecord(value: Record<string, unknown>, viewer: Viewer): boolean {
  const person = value['employee'];
  return (
    value['userId'] === viewer.userId ||
    (typeof person === 'object' && person !== null && 'id' in person && person.id === viewer.userId)
  );
}

function restrictedKind(schema: z.ZodType): RestrictedKind | undefined {
  const kind = schema.meta()?.['x-restricted'];
  return typeof kind === 'string' ? (kind as RestrictedKind) : undefined;
}

function inner(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return inner(schema.unwrap() as z.ZodType);
  }
  return schema;
}

/** Drop the fields this viewer may not read, at any depth. */
export function withoutRestricted(schema: z.ZodType, value: unknown, viewer: Viewer): unknown {
  const shape = inner(schema);
  if (Array.isArray(value) && shape instanceof z.ZodArray) {
    return value.map((item: unknown) =>
      withoutRestricted(shape.element as z.ZodType, item, viewer),
    );
  }
  if (typeof value !== 'object' || value === null || !(shape instanceof z.ZodObject)) return value;

  const record = value as Record<string, unknown>;
  const allowed = new Set([
    ...(FIELD_ACCESS.get(viewer.role) ?? []),
    ...(isOwnRecord(record, viewer) ? OWN_FIELDS : []),
  ]);
  const fields = new Map<string, z.ZodType>(Object.entries(shape.shape));
  const kept: [string, unknown][] = [];
  for (const [key, field] of Object.entries(record)) {
    const fieldSchema = fields.get(key);
    if (fieldSchema === undefined) {
      kept.push([key, field]);
      continue;
    }
    const kind = restrictedKind(fieldSchema);
    if (kind !== undefined && !allowed.has(kind)) continue;
    kept.push([key, withoutRestricted(fieldSchema, field, viewer)]);
  }
  return Object.fromEntries(kept);
}

/** Rows a list can hold: any record, optionally different per viewer. */
export type Rows = readonly object[] | ((viewer: Viewer) => readonly object[]);

function rowsFor(rows: Rows, viewer: Viewer): readonly Record<string, unknown>[] {
  return (typeof rows === 'function' ? rows(viewer) : rows) as readonly Record<string, unknown>[];
}

const PAGING = new Set(['limit', 'cursor', 'sort']);

/** A filter the generic equality match cannot express, such as `assignedToMe`. */
export type Filter = (row: Record<string, unknown>, value: string, viewer: Viewer) => boolean;

function nestedId(value: unknown): unknown {
  return typeof value === 'object' && value !== null && 'id' in value ? value.id : value;
}

/**
 * Keep rows whose field equals each query value: `?status=pending`, `?projectId=…` (matched
 * against `projectId` or `project.id`). A lookup, not a business rule.
 */
function matches(
  row: Record<string, unknown>,
  query: URLSearchParams,
  viewer: Viewer,
  filters: Readonly<Record<string, Filter>>,
): boolean {
  const custom = new Map(Object.entries(filters));
  const fields = new Map(Object.entries(row));
  for (const [key, value] of query) {
    if (PAGING.has(key)) continue;
    const filter = custom.get(key);
    if (filter !== undefined) {
      if (!filter(row, value, viewer)) return false;
      continue;
    }
    const field = fields.has(key) ? fields.get(key) : fields.get(key.replace(/Id$/, ''));
    if (field === undefined) continue;
    if (String(nestedId(field)) !== value) return false;
  }
  return true;
}

function itemSchemaOf(endpoint: Endpoint): z.ZodType {
  const response = endpoint.response;
  if (response instanceof z.ZodObject && 'items' in response.shape) {
    return (response.shape['items'] as z.ZodArray<z.ZodType>).element;
  }
  throw new Error(`${endpoint.id} is not a list endpoint`);
}

function withViewer(request: MockRequest, reply: (viewer: Viewer) => MockReply): MockReply {
  const viewer = viewerOf(request);
  return viewer === undefined ? { problem: 'UNAUTHENTICATED' } : reply(viewer);
}

export interface ListOptions {
  readonly filters?: Readonly<Record<string, Filter>>;
}

/** A list endpoint answered from fixed rows, filtered and shaped for the viewer. One page. */
export function serveList(endpoint: Endpoint, rows: Rows, options: ListOptions = {}): MockHandler {
  const item = itemSchemaOf(endpoint);
  return mock(endpoint, (request) =>
    withViewer(request, (viewer) => {
      const query = new URL(request.request.url).searchParams;
      const items = rowsFor(rows, viewer)
        .filter((row) => matches(row, query, viewer, options.filters ?? {}))
        .map((row) => withoutRestricted(item, row, viewer));
      return { json: { items, nextCursor: null } };
    }),
  );
}

/** The `{id}` in a request path such as /api/v1/core/approvals/{id} or …/{id}:approve. */
export function idOf(request: MockRequest): string {
  const tail = request.path.split('/').at(-1) ?? '';
  return tail.split(':')[0] ?? '';
}

/** A detail endpoint answered from the same rows: 404 for an id that is not there. */
export function serveOne(endpoint: Endpoint, rows: Rows, key = 'id'): MockHandler {
  return mock(endpoint, (request) =>
    withViewer(request, (viewer) => {
      const wanted = idOf(request);
      const row = rowsFor(rows, viewer).find(
        (candidate) => String(new Map(Object.entries(candidate)).get(key)) === wanted,
      );
      if (row === undefined || endpoint.response === null) return { problem: 'NOT_FOUND' };
      return { json: withoutRestricted(endpoint.response, row, viewer) };
    }),
  );
}

/** A fixed value for the viewer, for single-object endpoints such as dashboards. */
export function serveValue(
  endpoint: Endpoint,
  value: (viewer: Viewer, request: MockRequest) => unknown,
): MockHandler {
  return mock(endpoint, (request) =>
    withViewer(request, (viewer) => {
      if (endpoint.response === null) return { empty: true };
      const result = value(viewer, request);
      return result === undefined
        ? { problem: 'NOT_FOUND' }
        : { json: withoutRestricted(endpoint.response, result, viewer) };
    }),
  );
}
